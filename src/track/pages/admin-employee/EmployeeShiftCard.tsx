import { useState } from "react";
import type { Employee } from "@/track/api-types";
import { ConfirmDialog } from "@/track/components/ConfirmDialog";
import { FormField } from "@/track/components/FormField";
import { problemMessage } from "@/track/lib/problems";
import { formatDateKey, fullName } from "@/track/lib/time/format";
import { formatShiftLabel, formatShiftWindow } from "@/track/lib/time/shift";
import { useTrack } from "@/track/TrackContext";
import { useShifts } from "../admin-shifts/useShifts";
import { setEmployeeShift } from "./actions";

/**
 * The employee's shift: the current one, and a select to give them another from an optional date. Days already recorded keep their
 * shift (history is not rewritten); the change asks for a confirmation that says so.
 */
export function EmployeeShiftCard({ employee }: { employee: Employee }) {
  const { t, toast } = useTrack();
  const activeShifts = useShifts({ isActive: true });
  const [shiftId, setShiftId] = useState(employee.shift.id);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // the current shift stays selectable even when it was deactivated since
  const choices = activeShifts.some((shift) => shift.id === employee.shift.id) ? activeShifts : [{ ...employee.shift }, ...activeShifts];
  const chosen = choices.find((shift) => shift.id === shiftId) ?? employee.shift;
  const isChanged = shiftId !== employee.shift.id;

  const confirm = async () => {
    setIsSaving(true);
    const result = await setEmployeeShift(employee.id, { shiftId, ...(effectiveFrom ? { effectiveFrom } : {}) });
    setIsSaving(false);
    if (!result.ok) { setError(problemMessage(result, t)); return; }
    toast(result.message ?? t("Shift changed."));
    setIsAsking(false);
    setEffectiveFrom("");
  };

  return (
    <section className="card" style={{ padding: 20 }} aria-labelledby="shift-heading">
      <div className="card-h"><h3 id="shift-heading">{t("Shift")}</h3></div>
      <div className="kv"><span className="muted">{t("Current shift")}</span><b data-testid="employee-shift">{formatShiftLabel(employee.shift)}</b></div>
      <form className="col" style={{ gap: 14, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (isChanged) { setError(null); setIsAsking(true); } }} noValidate>
        <FormField label={t("Change to")}>
          <select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
            {choices.map((shift) => <option key={shift.id} value={shift.id}>{`${shift.name} · ${formatShiftWindow(shift)}`}</option>)}
          </select>
        </FormField>
        <FormField label={t("From")} hint={t("optional")}>
          <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </FormField>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t("Leave the date empty to change the shift from now. Days already recorded keep the shift they were counted against.")}</p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-gold" disabled={!isChanged}>{t("Change shift")}</button>
        </div>
      </form>
      {isAsking && (
        <ConfirmDialog
          title={t("Change shift")}
          body={t("Move {name} to {shift} {from}? Days already recorded are not rewritten: they keep the shift they were counted against.", {
            name: fullName(employee),
            shift: formatShiftLabel(chosen),
            from: effectiveFrom ? t("from {date}", { date: formatDateKey(effectiveFrom) }) : t("from now"),
          })}
          confirmLabel={t("Change shift")}
          isBusy={isSaving}
          error={error}
          onConfirm={() => { void confirm(); }}
          onClose={() => setIsAsking(false)}
        />
      )}
    </section>
  );
}

import { useState } from "react";
import type { Shift } from "@/track/api-types";
import { useTrack } from "@/track/TrackContext";

/** What the owner can do with the selected days: give them a shift, a week off, clear them, or apply a pattern to the people. */
export function RosterActionBar({ count, shifts, isBusy, onSetShift, onClear, onOpenPattern, onDeselect }: {
  count: number;
  shifts: Shift[];
  isBusy: boolean;
  /** `shiftId` null = week off. */
  onSetShift: (shiftId: string | null) => void;
  onClear: () => void;
  onOpenPattern: () => void;
  onDeselect: () => void;
}) {
  const { t } = useTrack();
  const [shiftId, setShiftId] = useState("");
  const chosenShiftId = shiftId || shifts.find((shift) => shift.isDefault)?.id || shifts[0]?.id || "";
  return (
    <div className="roster-actions card enter" role="region" aria-label={t("Selected days")} data-testid="roster-actions">
      <b>{count === 1 ? t("{count} day selected", { count }) : t("{count} days selected", { count })}</b>
      <select aria-label={t("Shift")} value={chosenShiftId} onChange={(e) => setShiftId(e.target.value)}>
        {shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
      </select>
      <button type="button" className="btn btn-sm btn-gold" disabled={isBusy || !chosenShiftId} onClick={() => onSetShift(chosenShiftId)}>{t("Set shift")}</button>
      <button type="button" className="btn btn-sm" disabled={isBusy} onClick={() => onSetShift(null)}>{t("Week off")}</button>
      <button type="button" className="btn btn-sm" disabled={isBusy} onClick={onClear}>{t("Clear entry")}</button>
      <button type="button" className="btn btn-sm" disabled={isBusy} onClick={onOpenPattern}>{t("Apply pattern…")}</button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={onDeselect}>{t("Deselect")}</button>
    </div>
  );
}

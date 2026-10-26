import { useMemo, useState } from "react";
import type { ScheduleRow, Shift } from "@/track/api-types";
import { FormField } from "@/track/components/FormField";
import { Modal } from "@/track/components/Modal";
import { problemMessage } from "@/track/lib/problems";
import {
  changingEntries, chunkEntries, patternEntries, patternProblem, WEEKDAY_LABELS, WEEKDAYS, type RosterDayState, type RosterPattern,
} from "@/track/lib/roster";
import { formatDateKey } from "@/track/lib/time/format";
import { useTrack } from "@/track/TrackContext";
import { setScheduleEntries } from "./actions";

/**
 * "Apply pattern": for the selected people and a date range, either weekly days off (for example Saturday and Sunday) or a rotation
 * of N days on and M days off from a start date, on the chosen shift. It says how many dates would change before saving, then saves
 * them person by person in batches of 62 (the bulk endpoint's limit).
 */
export function RosterPatternDialog({ rows, shifts, defaultFrom, defaultTo, onClose }: {
  rows: ScheduleRow[];
  shifts: Shift[];
  defaultFrom: string;
  defaultTo: string;
  onClose: () => void;
}) {
  const { t, toast } = useTrack();
  const [kind, setKind] = useState<RosterPattern["kind"]>("weekly");
  const [offWeekdays, setOffWeekdays] = useState<number[]>([6, 7]);
  const [daysOn, setDaysOn] = useState("5");
  const [daysOff, setDaysOff] = useState("2");
  const [startDate, setStartDate] = useState(defaultFrom);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [shiftId, setShiftId] = useState(() => shifts.find((shift) => shift.isDefault)?.id ?? shifts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const pattern = useMemo<RosterPattern>(
    () => (kind === "weekly" ? { kind, offWeekdays } : { kind, daysOn: Number(daysOn), daysOff: Number(daysOff), startDate }),
    [kind, offWeekdays, daysOn, daysOff, startDate],
  );
  const problem = patternProblem(pattern, from, to) ?? (shiftId ? null : "Choose the shift for the working days.");
  // per person: the entries that would change something (a date the grid does not show counts as a change)
  const plan = useMemo(() => {
    if (problem) return [];
    return rows.map((row) => ({
      row,
      entries: changingEntries(patternEntries(pattern, from, to, shiftId), new Map<string, RosterDayState>(row.days.map((day) => [day.date, day]))),
    }));
  }, [rows, problem, pattern, from, to, shiftId]);
  const changeCount = plan.reduce((sum, person) => sum + person.entries.length, 0);

  const toggleWeekday = (weekday: number) =>
    setOffWeekdays((current) => (current.includes(weekday) ? current.filter((day) => day !== weekday) : [...current, weekday].sort()));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (problem || changeCount === 0) return;
    setIsSaving(true);
    setError(null);
    for (const person of plan) {
      for (const entries of chunkEntries(person.entries)) {
        const result = await setScheduleEntries(person.row.employeeId, { entries });
        if (!result.ok) {
          setIsSaving(false);
          setError(t("{name}: {reason}", { name: person.row.name, reason: problemMessage(result, t) }));
          return;
        }
      }
    }
    setIsSaving(false);
    toast(t("Pattern applied to {count} dates.", { count: changeCount }));
    onClose();
  };

  return (
    <Modal title={t("Apply pattern")} eyebrow={t("Roster")} onClose={onClose}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
        <button type="submit" form="roster-pattern-form" className="btn btn-gold" disabled={isSaving || Boolean(problem) || changeCount === 0}>{isSaving ? t("Saving…") : t("Apply pattern")}</button>
      </>}>
      <form id="roster-pattern-form" className="col" style={{ gap: 14 }} onSubmit={save} noValidate>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
          {rows.length === 1 ? t("For {name}.", { name: rows[0].name }) : t("For {count} people.", { count: rows.length })}
        </p>
        <div className="seg" role="group" aria-label={t("Pattern")}>
          <button type="button" className={kind === "weekly" ? "on" : undefined} aria-pressed={kind === "weekly"} onClick={() => setKind("weekly")}>{t("Weekly days off")}</button>
          <button type="button" className={kind === "rotation" ? "on" : undefined} aria-pressed={kind === "rotation"} onClick={() => setKind("rotation")}>{t("Rotation")}</button>
        </div>
        {kind === "weekly" ? (
          <fieldset className="roster-weekdays">
            <legend>{t("Days off every week")}</legend>
            {WEEKDAYS.map((weekday) => (
              <label key={weekday} className="chip nodot neutral" style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={offWeekdays.includes(weekday)} onChange={() => toggleWeekday(weekday)} />{t(WEEKDAY_LABELS[weekday])}
              </label>
            ))}
          </fieldset>
        ) : (
          <>
            <div className="grid2">
              <FormField label={t("Days on")} hint={t("working days in a row")}>
                <input type="number" inputMode="numeric" min={1} step={1} value={daysOn} onChange={(e) => setDaysOn(e.target.value)} />
              </FormField>
              <FormField label={t("Days off")} hint={t("week-off days in a row")}>
                <input type="number" inputMode="numeric" min={1} step={1} value={daysOff} onChange={(e) => setDaysOff(e.target.value)} />
              </FormField>
            </div>
            <FormField label={t("Rotation starts on")} hint={t("the first working day of a cycle")}>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
          </>
        )}
        <div className="grid2">
          <FormField label={t("From")}><input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></FormField>
          <FormField label={t("To")}><input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></FormField>
        </div>
        {from && to && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t("From {from} to {to}", { from: formatDateKey(from), to: formatDateKey(to) })}</p>}
        <FormField label={t("Shift on working days")}>
          <select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
            {shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
          </select>
        </FormField>
        <p className={problem ? "err" : "notice info"} style={{ margin: 0 }} role="status" data-testid="pattern-preview">
          {problem ? t(problem) : changeCount === 1 ? t("{count} date will change.", { count: changeCount }) : t("{count} dates will change.", { count: changeCount })}
        </p>
        {error && <div className="err" role="alert">{error}</div>}
      </form>
    </Modal>
  );
}

import type { ScheduleRow } from "@/track/api-types";
import { shiftColorSlot, shiftShortName } from "@/track/lib/roster";
import { useTrack } from "@/track/TrackContext";

/** What the short names in the grid stand for: each shift that appears on the page ("GD" for General day) and the week off. */
export function RosterLegend({ rows, shiftIds }: { rows: ScheduleRow[]; shiftIds: readonly string[] }) {
  const { t } = useTrack();
  const shifts = new Map<string, string>();
  let hasOffDay = false;
  for (const row of rows) {
    for (const day of row.days) {
      if (day.isOff) hasOffDay = true;
      else if (day.shiftId && day.shiftName) shifts.set(day.shiftId, day.shiftName);
    }
  }
  if (!shifts.size && !hasOffDay) return null;
  return (
    <ul className="roster-legend hide-sm" aria-label={t("Legend")}>
      {[...shifts].map(([shiftId, shiftName]) => (
        <li key={shiftId}><span className={`roster-cell slot-${shiftColorSlot(shiftId, shiftIds)}`}>{shiftShortName(shiftName)}</span>{shiftName}</li>
      ))}
      {hasOffDay && <li><span className="roster-cell off">{t("Off")}</span>{t("Week off")}</li>}
    </ul>
  );
}

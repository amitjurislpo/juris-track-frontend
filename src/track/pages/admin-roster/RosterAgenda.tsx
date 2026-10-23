import type { ScheduleRow } from "@/track/api-types";
import type { RosterCell } from "@/track/lib/roster";
import { cellKey } from "@/track/lib/roster";
import { formatDateKey } from "@/track/lib/time/format";
import { useTrack } from "@/track/TrackContext";
import { RosterCellButton } from "./RosterCellButton";

/** The month as a list per person (shown on phones, where a wide grid does not fit): one line per date with its shift or "Off". */
export function RosterAgenda({ rows, today, shiftIds, selectedKeys, canEdit, onSelect }: {
  rows: ScheduleRow[];
  today: string;
  shiftIds: readonly string[];
  selectedKeys: ReadonlySet<string>;
  canEdit: boolean;
  onSelect: (cell: RosterCell, event: React.MouseEvent | React.KeyboardEvent) => void;
}) {
  const { t } = useTrack();
  return (
    <div className="roster-agenda" aria-label={t("Roster")}>
      {rows.map((row) => (
        <details key={row.employeeId} className="roster-person" open={rows.length === 1}>
          <summary><b>{row.name}</b><small className="muted"> · {row.shift.name}</small></summary>
          <ul>
            {row.days.map((day) => (
              <li key={day.date} className={day.date === today ? "today" : undefined}>
                <span>{formatDateKey(day.date, { year: false })}</span>
                <RosterCellButton day={day} employeeName={row.name} shiftIds={shiftIds} canEdit={canEdit} isFull
                  isSelected={selectedKeys.has(cellKey({ employeeId: row.employeeId, date: day.date }))}
                  onSelect={(event) => onSelect({ employeeId: row.employeeId, date: day.date }, event)} />
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

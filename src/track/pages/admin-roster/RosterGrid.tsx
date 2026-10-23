import type { ScheduleRow } from "@/track/api-types";
import type { RosterCell } from "@/track/lib/roster";
import { cellKey } from "@/track/lib/roster";
import { formatWeekdayShort } from "@/track/lib/time/format";
import { useTrack } from "@/track/TrackContext";
import { RosterCellButton } from "./RosterCellButton";

/**
 * The month as a grid: one row per person, one column per date, the person's name fixed on the left while the dates scroll inside
 * their own container (the page itself never scrolls sideways). Shown on wide screens; phones get the agenda instead.
 */
export function RosterGrid({ rows, dates, today, shiftIds, selectedKeys, canEdit, onSelect }: {
  rows: ScheduleRow[];
  dates: string[];
  today: string;
  shiftIds: readonly string[];
  selectedKeys: ReadonlySet<string>;
  canEdit: boolean;
  onSelect: (cell: RosterCell, event: React.MouseEvent | React.KeyboardEvent) => void;
}) {
  const { t } = useTrack();
  return (
    <div className="table-wrap roster-grid">
      <table className="t roster" aria-label={t("Roster")}>
        <thead>
          <tr>
            <th>{t("Name")}</th>
            {dates.map((date) => (
              <th key={date} className={`roster-day${date === today ? " today" : ""}`}>
                <span className="num">{Number(date.slice(8))}</span>
                <small>{formatWeekdayShort(date)}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.employeeId} data-employee-id={row.employeeId}>
              <td>
                <div className="person"><div><b>{row.name}</b><small>{row.shift.name}</small></div></div>
              </td>
              {row.days.map((day) => (
                <td key={day.date} className={`roster-day${day.date === today ? " today" : ""}`}>
                  <RosterCellButton day={day} employeeName={row.name} shiftIds={shiftIds} canEdit={canEdit}
                    isSelected={selectedKeys.has(cellKey({ employeeId: row.employeeId, date: day.date }))}
                    onSelect={(event) => onSelect({ employeeId: row.employeeId, date: day.date }, event)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

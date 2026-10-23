import { TrackLink } from "@/track/components/TrackLink";
import type { ReportWorkdayRow } from "@/track/api-types";
import { SortableHeader } from "@/track/components/list/SortableHeader";
import { WorkdayStatusChip } from "@/track/components/time/WorkdayStatusChip";
import { defaultSortOf } from "@/track/lib/report-query";
import { formatDateKey, formatDuration, formatTime } from "@/track/lib/time/format";
import { zoneAbbreviation } from "@/track/lib/time/zone-names";
import { useTrack } from "@/track/TrackContext";

const { sort: DEFAULT_SORT, direction: DEFAULT_DIRECTION } = defaultSortOf("workdays");

/**
 * The report's workdays: date, employee (with code), manager of the day, status ("Not ended" for a day left open too long), start
 * and end in the display time zone, productive, break, span and breaks. Sortable by the API's keys (manager, status and end are
 * not sortable there). The table scrolls sideways inside its own container on narrow screens. `employeePath` links a name.
 */
export function ReportWorkdayTable({ rows, timeZone, employeePath }: { rows: ReportWorkdayRow[]; timeZone: string; employeePath: (employeeId: string) => string }) {
  const { t } = useTrack();
  const zone = zoneAbbreviation(timeZone);
  const header = (sortKey: string, label: string, className?: string) => (
    <SortableHeader sortKey={sortKey} defaultSort={DEFAULT_SORT} defaultDirection={DEFAULT_DIRECTION} className={className}>{label}</SortableHeader>
  );
  return (
    <div className="table-wrap">
      <table className="t report-table">
        <thead>
          <tr>
            {header("date", t("Date"))}
            {header("employee", t("Employee"))}
            <th>{t("Manager")}</th>
            <th>{t("Status")}</th>
            {header("startedAt", t("Start ({zone})", { zone }))}
            <th>{t("End ({zone})", { zone })}</th>
            {header("productiveSeconds", t("Productive"), "r")}
            {header("breakSeconds", t("Break"), "r")}
            {header("spanSeconds", t("Span"), "r")}
            {header("breakCount", t("Breaks"), "r")}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={{ whiteSpace: "nowrap" }}>{formatDateKey(row.date)}</td>
              <td>
                <div className="person"><div>
                  <b><TrackLink to={employeePath(row.employee.id)} style={{ color: "inherit" }}>{row.employee.name}</TrackLink></b>
                  {row.employee.employeeCode && <small className="muted num">{row.employee.employeeCode}</small>}
                </div></div>
              </td>
              <td className="muted">{row.manager?.name ?? t("No manager")}</td>
              <td><WorkdayStatusChip status={row.status} isStale={row.isStale} /></td>
              <td className="num">{formatTime(row.startedAt, timeZone)}</td>
              <td className="num">{row.endedAt ? formatTime(row.endedAt, timeZone) : "—"}</td>
              <td className="r num" style={{ fontWeight: 600 }}>{formatDuration(row.productiveSeconds)}</td>
              <td className="r num">{formatDuration(row.breakSeconds)}</td>
              <td className="r num">{formatDuration(row.spanSeconds)}</td>
              <td className="r num">{row.breakCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

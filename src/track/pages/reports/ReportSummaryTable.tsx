import { Link } from "react-router";
import type { ReportSummaryRow } from "@/track/api-types";
import { SortableHeader } from "@/track/components/list/SortableHeader";
import { defaultSortOf, summaryRowLabel, type SummaryGroup } from "@/track/lib/report-query";
import { formatDuration, formatTime } from "@/track/lib/time/format";
import { zoneAbbreviation } from "@/track/lib/time/zone-names";
import { useTrack } from "@/track/TrackContext";

const FIRST_COLUMN_LABELS: Record<SummaryGroup, string> = { employee: "Employee", manager: "Manager", date: "Date" };

/**
 * The report's workdays added up per employee, per manager of the day or per date (`GET /reports/summaries`): workdays, people,
 * productive, average productive per workday, break, span and breaks; per date (or for a single day) also the first start and the
 * last end in the display time zone. Every figure column sorts through the URL with the API's keys. The workdays without a manager
 * form the "No manager" group.
 */
export function ReportSummaryTable({ rows, groupBy, timeZone, isSingleDay, employeePath }: {
  rows: ReportSummaryRow[];
  groupBy: SummaryGroup;
  timeZone: string;
  isSingleDay: boolean;
  employeePath: (employeeId: string) => string;
}) {
  const { t } = useTrack();
  const { sort: defaultSort, direction: defaultDirection } = defaultSortOf(groupBy);
  const hasTimes = groupBy === "date" || isSingleDay;
  const zone = zoneAbbreviation(timeZone);
  const header = (sortKey: string, label: string, className?: string) => (
    <SortableHeader sortKey={sortKey} defaultSort={defaultSort} defaultDirection={defaultDirection} className={className}>{label}</SortableHeader>
  );
  return (
    <div className="table-wrap">
      <table className="t report-table">
        <thead>
          <tr>
            {header("label", t(FIRST_COLUMN_LABELS[groupBy]))}
            {header("workdays", t("Workdays"), "r")}
            {groupBy !== "employee" && header("employees", t("People"), "r")}
            {header("productiveSeconds", t("Productive"), "r")}
            {header("averageProductiveSeconds", t("Average per workday"), "r")}
            {header("breakSeconds", t("Break"), "r")}
            {header("spanSeconds", t("Span"), "r")}
            {header("breakCount", t("Breaks"), "r")}
            {hasTimes && <th>{t("First start ({zone})", { zone })}</th>}
            {hasTimes && <th>{t("Last end ({zone})", { zone })}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const label = summaryRowLabel(row, groupBy, t);
            return (
              <tr key={row.key}>
                <td style={{ whiteSpace: "nowrap" }}>
                  {groupBy === "employee" ? (
                    <div className="person"><div>
                      <b><Link to={employeePath(row.key)} style={{ color: "inherit" }}>{label}</Link></b>
                      {row.employeeCode && <small className="muted num">{row.employeeCode}</small>}
                    </div></div>
                  ) : <b className={row.key === "none" ? "muted" : undefined}>{label}</b>}
                </td>
                <td className="r num">{row.workdays}</td>
                {groupBy !== "employee" && <td className="r num">{row.employees}</td>}
                <td className="r num" style={{ fontWeight: 600 }}>{formatDuration(row.productiveSeconds)}</td>
                <td className="r num">{formatDuration(row.averageProductiveSeconds)}</td>
                <td className="r num">{formatDuration(row.breakSeconds)}</td>
                <td className="r num">{formatDuration(row.spanSeconds)}</td>
                <td className="r num">{row.breakCount}</td>
                {hasTimes && <td className="num">{formatTime(row.firstStartedAt, timeZone)}</td>}
                {hasTimes && <td className="num">{row.lastEndedAt ? formatTime(row.lastEndedAt, timeZone) : "—"}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

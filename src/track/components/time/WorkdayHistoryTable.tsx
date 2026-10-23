import type { ReactNode } from "react";
import type { WorkdayHistoryRow } from "@/track/api-types";
import { SortableHeader } from "@/track/components/list/SortableHeader";
import { DEFAULT_HISTORY_SORT, DEFAULT_HISTORY_SORT_DIRECTION } from "@/track/lib/workday-history-query";
import { formatDateKey, formatDuration, formatTime } from "@/track/lib/time/format";
import { zoneAbbreviation } from "@/track/lib/time/zone-names";
import { useTrack } from "@/track/TrackContext";
import { ShiftCell } from "./ShiftCell";
import { WorkdayStatusChip } from "./WorkdayStatusChip";

/**
 * Workdays as a table (ported from the old history-table.tsx): date, start and end (in the display time zone), productive, break,
 * span, breaks and the state ("Not ended" for a day left open too long). With `isSortable` the headers sort through the URL
 * (`sort`, `sortDirection`, the API's keys). A row opens the workday (`onOpen`).
 */
export function WorkdayHistoryTable({ rows, timeZone, isSortable = false, onOpen }: {
  rows: WorkdayHistoryRow[];
  timeZone: string;
  isSortable?: boolean;
  onOpen: (workdayId: string) => void;
}) {
  const { t } = useTrack();
  const header = (sortKey: string, label: ReactNode, className?: string) =>
    isSortable
      ? <SortableHeader key={sortKey} sortKey={sortKey} defaultSort={DEFAULT_HISTORY_SORT} defaultDirection={DEFAULT_HISTORY_SORT_DIRECTION} className={className}>{label}</SortableHeader>
      : <th key={sortKey} className={className}>{label}</th>;
  return (
    <div className="table-wrap">
      <table className="t">
        <thead>
          <tr>
            {header("date", t("Date"))}
            <th className="hide-sm">{t("Shift")}</th>
            {header("startedAt", t("Start ({zone})", { zone: zoneAbbreviation(timeZone) }))}
            {header("endedAt", t("End"))}
            {header("productiveSeconds", t("Productive"), "r")}
            <th className="r hide-sm">{t("Extra")}</th>
            {header("breakSeconds", t("Break"), "r")}
            {header("spanSeconds", t("Span"), "r hide-sm")}
            {header("breakCount", t("Breaks"), "r hide-sm")}
            <th>{t("Status")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} tabIndex={0} style={{ cursor: "pointer" }} title={t("Open the workday of {date}", { date: formatDateKey(row.date) })}
              onClick={() => onOpen(row.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(row.id); } }}>
              <td style={{ whiteSpace: "nowrap" }}>{formatDateKey(row.date)}</td>
              <td className="hide-sm"><ShiftCell shift={row.shift} isOutsideShift={row.isOutsideShift} /></td>
              <td className="num">{formatTime(row.startedAt, timeZone)}</td>
              <td className="num">{row.endedAt ? formatTime(row.endedAt, timeZone) : "—"}</td>
              <td className="r num" style={{ fontWeight: 600 }}>{formatDuration(row.productiveSeconds)}{row.extraSeconds > 0 && <small className="sub-sm" style={{ fontWeight: 400 }}>{t("Extra {duration}", { duration: formatDuration(row.extraSeconds) })}</small>}</td>
              <td className="r num hide-sm">{row.extraSeconds > 0 ? formatDuration(row.extraSeconds) : "—"}</td>
              <td className="r num">{formatDuration(row.breakSeconds)}</td>
              <td className="r num hide-sm">{formatDuration(row.spanSeconds)}</td>
              <td className="r num hide-sm">{row.breakCount}</td>
              <td><WorkdayStatusChip status={row.status} isStale={row.isStale} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

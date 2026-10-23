import type { ReactNode } from "react";
import type { WorkdayHistoryRow } from "@/track/api-types";
import { SortableHeader } from "@/track/components/list/SortableHeader";
import { DEFAULT_HISTORY_SORT, DEFAULT_HISTORY_SORT_DIRECTION } from "@/track/lib/workday-history-query";
import { formatDateKey, formatDuration, formatTimeOnDay } from "@/track/lib/time/format";
import { zoneAbbreviation } from "@/track/lib/time/zone-names";
import { useTrack } from "@/track/TrackContext";
import { LastBreakNote } from "./LastBreakNote";
import { WorkdayStatusChip } from "./WorkdayStatusChip";

/**
 * Workdays as a table (ported from the old history-table.tsx): date, when work started and ended (in the display time zone; an end after midnight shows its date), the last break, productive, break,
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
            {header("startedAt", t("Work started ({zone})", { zone: zoneAbbreviation(timeZone) }))}
            {header("endedAt", t("Work ended"))}
            {header("productiveSeconds", t("Productive"), "r")}
            {header("breakSeconds", t("Break"), "r")}
            {header("spanSeconds", t("Span"), "r hide-sm")}
            {header("breakCount", t("Breaks"), "r hide-sm")}
            <th>{t("Last break")}</th>
            <th>{t("Status")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} tabIndex={0} style={{ cursor: "pointer" }} title={t("Open the workday of {date}", { date: formatDateKey(row.date) })}
              onClick={() => onOpen(row.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(row.id); } }}>
              <td style={{ whiteSpace: "nowrap" }}>{formatDateKey(row.date)}</td>
              <td className="num">{formatTimeOnDay(row.startedAt, timeZone, new Date())}</td>
              <td className="num">{row.endedAt ? formatTimeOnDay(row.endedAt, timeZone, row.startedAt) : "—"}</td>
              <td className="r num" style={{ fontWeight: 600 }}>{formatDuration(row.productiveSeconds)}</td>
              <td className="r num">{formatDuration(row.breakSeconds)}</td>
              <td className="r num hide-sm">{formatDuration(row.spanSeconds)}</td>
              <td className="r num hide-sm">{row.breakCount}</td>
              <td className="num">{row.lastBreak ? <LastBreakNote lastBreak={row.lastBreak} timeZone={timeZone} isLabelled={false} /> : "—"}</td>
              <td><WorkdayStatusChip status={row.status} isStale={row.isStale} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

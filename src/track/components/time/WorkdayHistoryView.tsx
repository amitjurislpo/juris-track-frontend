import type { WorkdayHistory } from "@/track/api-types";
import { EmptyState } from "@/track/components/EmptyState";
import { Pagination } from "@/track/components/list/Pagination";
import { formatDuration } from "@/track/lib/time/format";
import type { RangePreset } from "@/track/lib/time/date-ranges";
import { historyRangeText } from "@/track/lib/workday-history-query";
import { useTrack } from "@/track/TrackContext";
import { DailyChart } from "./DailyChart";
import { RangeFilter } from "./RangeFilter";
import { WorkdayHistoryTable } from "./WorkdayHistoryTable";

/**
 * A history of workdays (`GET /workdays/mine`, or one person's `GET /team/members/{employeeId}/workdays`): the date range
 * (in the URL), the range's totals and average per day, productive and break time per day, and the workdays (sortable, paged);
 * a row opens the workday (`onOpen`).
 */
export function WorkdayHistoryView({ history, range, timeZone, onOpen }: {
  history: WorkdayHistory;
  range: RangePreset;
  timeZone: string;
  onOpen: (workdayId: string) => void;
}) {
  const { t } = useTrack();
  const { totals } = history;
  const averageProductiveSeconds = totals.workdays ? Math.floor(totals.productiveSeconds / totals.workdays) : 0;
  const rangeText = historyRangeText(history);
  const kpis: [string, string, string?][] = [
    [t("Productive"), formatDuration(totals.productiveSeconds)],
    ...(totals.extraSeconds === undefined ? [] : [[t("Extra time"), formatDuration(totals.extraSeconds), t("outside the shift or on a week off")] as [string, string, string]]),
    [t("Break"), formatDuration(totals.breakSeconds), t(totals.breakCount === 1 ? "{count} break" : "{count} breaks", { count: totals.breakCount })],
    [t("Span"), formatDuration(totals.spanSeconds)],
    [t("Workdays"), String(totals.workdays)],
    [t("Average per day"), formatDuration(averageProductiveSeconds), t("productive time per workday")],
  ];

  return (
    <>
      <RangeFilter range={range} from={history.from} to={history.to} />
      <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>{t("Workdays are counted on the date their shift started.")}</p>
      <div className="kpis enter" style={{ ["--i" as string]: 2 }} role="list" aria-label={t("Totals of the range")}>
        {kpis.map(([label, value, note]) => (
          <div key={label} className="card kpi" role="listitem">
            <span className="l">{label}</span>
            <span className="v num">{value}</span>
            {note && <span className="s">{note}</span>}
          </div>
        ))}
      </div>
      {history.from !== history.to && (
        <section className="card pad enter" style={{ ["--i" as string]: 3 }} aria-labelledby="daily-heading">
          <div className="card-h"><h3 id="daily-heading">{t("Productive and break time per day")}</h3></div>
          <DailyChart points={history.dailySeries} label={t("Productive and break time per day, {range}", { range: rangeText })} />
        </section>
      )}
      <section className="card enter" style={{ ["--i" as string]: 4, padding: 0, overflow: "hidden" }} aria-labelledby="workdays-heading">
        <div className="card-h" style={{ padding: "16px 16px 0" }}><h3 id="workdays-heading">{t("Workdays")}</h3><span className="tcount">{t("{total} found", { total: history.total })}</span></div>
        {history.rows.length > 0 && <WorkdayHistoryTable rows={history.rows} timeZone={timeZone} isSortable onOpen={onOpen} />}
        {!history.rows.length && <EmptyState title={t("No workdays in this period")} text={t("Workdays appear here once time is recorded.")} />}
        <Pagination page={history.page} pageSize={history.pageSize} total={history.total} />
      </section>
    </>
  );
}

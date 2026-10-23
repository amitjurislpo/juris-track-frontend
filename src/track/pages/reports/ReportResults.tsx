import type { SummaryReport, WorkdayReport } from "@/track/api-types";
import { EmptyState } from "@/track/components/EmptyState";
import { Pagination } from "@/track/components/list/Pagination";
import { DailyChart } from "@/track/components/time/DailyChart";
import type { ReportView } from "@/track/lib/report-query";
import { formatDateKey } from "@/track/lib/time/format";
import { useTrack } from "@/track/TrackContext";
import { useData } from "@/track/usePage";
import { REPORT_PANEL_ID, reportTabId, ReportTabs } from "./ReportTabs";
import { ReportSummaryTable } from "./ReportSummaryTable";
import { ReportTotalsCards } from "./ReportTotalsCards";
import { ReportWorkdayTable } from "./ReportWorkdayTable";

/**
 * What the report shows for the URL's filters (one request: `path`): the range's totals, productive and break time per day
 * (stacked chart), then the view tabs and the table of the chosen view (workdays, or the summaries by employee / manager / day),
 * sortable and paged. Figures, totals and the chart always cover the whole range (all pages).
 */
export function ReportResults({ path, view, timeZone, hasFilters, employeePath }: {
  path: string;
  view: ReportView;
  timeZone: string;
  hasFilters: boolean;
  employeePath: (employeeId: string) => string;
}) {
  const { t } = useTrack();
  const data = useData<WorkdayReport | SummaryReport>(path);
  if (!data) return null;
  const rangeText = data.from === data.to ? formatDateKey(data.from) : `${formatDateKey(data.from)} – ${formatDateKey(data.to)}`;
  const isSummary = "groupBy" in data;
  const countText = isSummary
    ? t(data.total === 1 ? "{total} group" : "{total} groups", { total: data.total })
    : t(data.total === 1 ? "{total} workday" : "{total} workdays", { total: data.total });

  return (
    <>
      <p className="report-range muted" data-testid="report-range">{rangeText}</p>
      <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>{t("Workdays are counted on the date their shift started.")}</p>
      <ReportTotalsCards totals={data.totals} rangeText={rangeText} />
      {data.from !== data.to && (
        <section className="card pad enter" style={{ ["--i" as string]: 3 }} aria-labelledby="report-chart-heading">
          <div className="card-h"><h3 id="report-chart-heading">{t("Productive and break time per day")}</h3></div>
          <DailyChart points={data.dailySeries} label={t("Productive and break time per day, {range}", { range: rangeText })} />
        </section>
      )}
      <section className="card enter report-card" style={{ ["--i" as string]: 4 }} aria-label={t("Report")}>
        <div className="card-h report-card-h">
          <ReportTabs view={view} />
          <span className="tcount" role="status">{countText}</span>
        </div>
        <div id={REPORT_PANEL_ID} role="tabpanel" aria-labelledby={reportTabId(view)}>
          {data.rows.length > 0 && (isSummary
            ? <ReportSummaryTable rows={data.rows} groupBy={data.groupBy} timeZone={timeZone} isSingleDay={data.from === data.to} employeePath={employeePath} />
            : <ReportWorkdayTable rows={data.rows} timeZone={timeZone} employeePath={employeePath} />)}
          {!data.rows.length && (
            <EmptyState title={t("No workdays for these filters")}
              text={hasFilters ? t("Try a longer date range or fewer filters.") : t("Workdays appear here once the people in this report record time.")} />
          )}
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
        </div>
      </section>
    </>
  );
}

import { useState } from "react";
import { Link } from "react-router";
import type { WorkdayHistory, WorkdayHistoryRow } from "@/track/api-types";
import { EmptyState } from "@/track/components/EmptyState";
import { Icon } from "@/track/components/Icon";
import { Pagination } from "@/track/components/list/Pagination";
import { PageHeader } from "@/track/components/PageHeader";
import { DailyChart } from "@/track/components/time/DailyChart";
import { RangeFilter } from "@/track/components/time/RangeFilter";
import { WorkdayDetailModal } from "@/track/components/time/WorkdayDetailModal";
import { WorkdayHistoryTable } from "@/track/components/time/WorkdayHistoryTable";
import { PageLoading } from "@/track/PageLoading";
import { formatDateKey, formatDuration } from "@/track/lib/time/format";
import { selectedRange, workdayHistoryPath } from "@/track/lib/workday-history-query";
import { useDisplayTimeZone } from "@/track/time/useDisplayTimeZone";
import { useData, usePage } from "@/track/usePage";

/**
 * My history (`GET /workdays/mine`): a date range kept in the URL, the range's totals, productive and break time per day, and the
 * workdays (sortable, paged); a row opens the workday with its intervals (`GET /workdays/{workdayId}`).
 */
export default function MyHistoryPage() {
  const { t, searchParams } = usePage();
  const data = useData<WorkdayHistory>(workdayHistoryPath(searchParams));
  const { timeZone } = useDisplayTimeZone();
  const [openWorkday, setOpenWorkday] = useState<WorkdayHistoryRow | null>(null);
  if (!data) return <PageLoading />;
  const { totals } = data;
  const averageProductiveSeconds = totals.workdays ? Math.floor(totals.productiveSeconds / totals.workdays) : 0;
  const rangeText = data.from === data.to ? formatDateKey(data.from) : `${formatDateKey(data.from)} – ${formatDateKey(data.to)}`;
  const openRow = (workdayId: string) => setOpenWorkday(data.rows.find((row) => row.id === workdayId) ?? null);
  const kpis: [string, string, string?][] = [
    [t("Productive"), formatDuration(totals.productiveSeconds)],
    [t("Break"), formatDuration(totals.breakSeconds), t(totals.breakCount === 1 ? "{count} break" : "{count} breaks", { count: totals.breakCount })],
    [t("Span"), formatDuration(totals.spanSeconds)],
    [t("Workdays"), String(totals.workdays)],
    [t("Average per day"), formatDuration(averageProductiveSeconds), t("productive time per workday")],
  ];

  return (
    <div className="col">
      <PageHeader eyebrow={t("My workspace")} title={t("My History")} sub={rangeText}>
        <Link className="btn" to="/my-time"><Icon name="clock" size={15} />{t("My Time")}</Link>
      </PageHeader>
      <RangeFilter range={selectedRange(searchParams)} from={data.from} to={data.to} />
      <div className="kpis enter" style={{ ["--i" as string]: 2 }} role="list" aria-label={t("Totals of the range")}>
        {kpis.map(([label, value, note]) => (
          <div key={label} className="card kpi" role="listitem">
            <span className="l">{label}</span>
            <span className="v num">{value}</span>
            {note && <span className="s">{note}</span>}
          </div>
        ))}
      </div>
      {data.from !== data.to && (
        <section className="card pad enter" style={{ ["--i" as string]: 3 }} aria-labelledby="daily-heading">
          <div className="card-h"><h3 id="daily-heading">{t("Productive and break time per day")}</h3></div>
          <DailyChart points={data.dailySeries} label={t("Productive and break time per day, {range}", { range: rangeText })} />
        </section>
      )}
      <section className="card enter" style={{ ["--i" as string]: 4, padding: 0, overflow: "hidden" }} aria-labelledby="workdays-heading">
        <div className="card-h" style={{ padding: "16px 16px 0" }}><h3 id="workdays-heading">{t("Workdays")}</h3><span className="tcount">{t("{total} found", { total: data.total })}</span></div>
        {data.rows.length > 0 && <WorkdayHistoryTable rows={data.rows} timeZone={timeZone} isSortable onOpen={openRow} />}
        {!data.rows.length && <EmptyState title={t("No workdays in this period")} text={t("Workdays appear here once time is recorded.")} />}
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </section>
      {openWorkday && <WorkdayDetailModal workdayId={openWorkday.id} dateKey={openWorkday.date} timeZone={timeZone} onClose={() => setOpenWorkday(null)} />}
    </div>
  );
}

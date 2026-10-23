import { useState } from "react";
import { TrackLink } from "@/track/components/TrackLink";
import type { WorkdayHistory, WorkdayHistoryRow } from "@/track/api-types";
import { EmptyState } from "@/track/components/EmptyState";
import { PageHeader } from "@/track/components/PageHeader";
import { DailyChart } from "@/track/components/time/DailyChart";
import { WorkdayDetailModal } from "@/track/components/time/WorkdayDetailModal";
import { WorkdayHistoryTable } from "@/track/components/time/WorkdayHistoryTable";
import { PageLoading } from "@/track/PageLoading";
import { addDays, toDateKey } from "@/track/lib/time/business-calendar";
import { formatDateKey, formatDuration } from "@/track/lib/time/format";
import { viewerTimeZone } from "@/track/lib/viewer-time-zone";
import { useDisplayTimeZone } from "@/track/time/useDisplayTimeZone";
import { useTimeEvent } from "@/track/time/useTimeEvent";
import { useTimeState } from "@/track/time/useTimeState";
import { useData, usePage } from "@/track/usePage";
import { TodayCard } from "./TodayCard";

/** "Good morning" by the hour in the display time zone (translation keys). */
function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning, {name}";
  if (hour < 17) return "Good afternoon, {name}";
  return "Good evening, {name}";
}

/** How many recent workdays the dashboard lists. */
const RECENT_WORKDAYS = 5;

/**
 * The dashboard of every user of a business: today at a glance with the time buttons, this week's productive and break time
 * per day, and the last five workdays; links to My time and My history.
 */
export default function DashboardPage() {
  const { user, t } = usePage();
  const timeState = useTimeState({ isLive: true });
  const runner = useTimeEvent();
  const { timeZone } = useDisplayTimeZone();
  // the last year is enough to find the last five workdays (the API caps a range at 366 days)
  const businessToday = toDateKey(new Date(), viewerTimeZone(user));
  const week = useData<WorkdayHistory>("/workdays/mine?range=week");
  const recent = useData<WorkdayHistory>(`/workdays/mine?range=custom&from=${addDays(businessToday, -365)}&pageSize=${RECENT_WORKDAYS}`);
  const [openWorkday, setOpenWorkday] = useState<WorkdayHistoryRow | null>(null);
  const reading = timeState.data;
  if (!reading || !week || !recent) {
    if (timeState.isError && !reading) throw timeState.error;
    return <PageLoading />;
  }
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));

  return (
    <div className="col">
      <PageHeader eyebrow={t("My workspace")} title={t(greetingFor(hour), { name: user.firstName })} sub={formatDateKey(reading.state.today)} />
      <div className="bento">
        <TodayCard reading={reading} runner={runner} timeZone={timeZone} />
        <section className="card pad span-5 enter" style={{ ["--i" as string]: 2 }} aria-labelledby="week-heading">
          <div className="card-h">
            <h3 id="week-heading">{t("This week")}</h3>
            <span className="faint num" style={{ fontSize: 12.5 }}>{t("{duration} productive", { duration: formatDuration(week.totals.productiveSeconds) })}</span>
          </div>
          <DailyChart points={week.dailySeries} height={120} label={t("Productive and break time per day, this week")} />
        </section>
        <section className="card span-12 enter" style={{ ["--i" as string]: 3, padding: 0, overflow: "hidden" }} aria-labelledby="recent-heading">
          <div className="card-h" style={{ padding: "16px 16px 0" }}>
            <h3 id="recent-heading">{t("Last workdays")}</h3>
            <TrackLink className="btn btn-sm btn-ghost" to="/my-history">{t("View history")}</TrackLink>
          </div>
          {recent.rows.length > 0
            ? <WorkdayHistoryTable rows={recent.rows} timeZone={timeZone} onOpen={(workdayId) => setOpenWorkday(recent.rows.find((row) => row.id === workdayId) ?? null)} />
            : <EmptyState title={t("No workdays yet")} text={t("Workdays appear here once time is recorded.")} />}
        </section>
      </div>
      {openWorkday && <WorkdayDetailModal workdayId={openWorkday.id} dateKey={openWorkday.date} timeZone={timeZone} onClose={() => setOpenWorkday(null)} />}
    </div>
  );
}

import { WorkdaySummary } from "@/track/components/time/WorkdaySummary";
import { formatDateKey } from "@/track/lib/time/format";
import type { WorkdaySnapshot } from "@/track/lib/time/types";
import { useTrack } from "@/track/TrackContext";
import { useData } from "@/track/usePage";

/**
 * After a night shift was ended past midnight, today has no workday yet (the timer shows "Not started"); the day that was just
 * ended is read with `GET /workdays/{workdayId}` and its summary is shown here.
 */
export function EndedWorkdayNotice({ workdayId, timeZone }: { workdayId: string; timeZone: string }) {
  const { t } = useTrack();
  const workday = useData<WorkdaySnapshot>(`/workdays/${encodeURIComponent(workdayId)}`);
  if (!workday) return null;
  return (
    <section className="notice info enter" aria-label={t("The workday you ended")}>
      <b>{t("Your workday of {date} ended after midnight. Here is its summary.", { date: formatDateKey(workday.date) })}</b>
      <span>{t("Today has not started yet: select Start work when you begin again.")}</span>
      <div style={{ marginTop: 8 }}>
        <WorkdaySummary figures={{ ...workday, scheduledSeconds: workday.shift?.scheduledSeconds, varianceSeconds: workday.varianceSeconds, extraSeconds: workday.extraSeconds }} timeZone={timeZone} label={t("Summary of {date}", { date: formatDateKey(workday.date) })} />
      </div>
    </section>
  );
}

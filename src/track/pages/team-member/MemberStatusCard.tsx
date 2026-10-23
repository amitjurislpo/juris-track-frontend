import type { TeamMemberDetail } from "@/track/api-types";
import { WorkdayStatusChip } from "@/track/components/time/WorkdayStatusChip";
import { WorkdaySummary } from "@/track/components/time/WorkdaySummary";
import { formatClock, formatDateKey, formatDuration, formatTime, formatTimeOnDay } from "@/track/lib/time/format";
import { workdayFigures } from "@/track/lib/time/live-totals";
import { ACTIVITY_LABELS } from "@/track/lib/time/types";
import { zoneAbbreviation } from "@/track/lib/time/zone-names";
import { useTrack } from "@/track/TrackContext";

/**
 * One person's state right now (`GET /team/members/{employeeId}`): the state chip, the productive timer (live from the server's
 * timestamps, never a counter), the running break, the start and the last activity in the display time zone, the day's totals.
 */
export function MemberStatusCard({ member, nowMilliseconds, timeZone, onOpenWorkday }: {
  member: TeamMemberDetail;
  nowMilliseconds: number;
  timeZone: string;
  /** Opens the current workday with its intervals (and the corrections). */
  onOpenWorkday: () => void;
}) {
  const { t } = useTrack();
  const { workday, status } = member;
  const live = workday ? workdayFigures(workday, nowMilliseconds) : null;
  const zone = zoneAbbreviation(timeZone, new Date(workday?.startedAt ?? nowMilliseconds));
  return (
    <section className="card pad enter" style={{ ["--i" as string]: 1 }} aria-labelledby="now-heading">
      <div className="card-h">
        <h3 id="now-heading">{workday && workday.date !== member.today ? t("Workday of {date}", { date: formatDateKey(workday.date) }) : t("Today")}</h3>
        <span data-testid="member-status"><WorkdayStatusChip status={status} isStale={workday?.isStale} /></span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: workday ? 16 : 0 }}>
        <div>
          <div className="eyebrow">{t("Productive time")}</div>
          <div className="bigtime" role="timer" aria-label={t("Productive time")} aria-live="off" data-status={status} data-seconds={live?.productiveSeconds ?? 0} style={{ fontSize: 44 }}>
            {formatClock(live?.productiveSeconds ?? 0)}
          </div>
        </div>
        <div className="faint" style={{ fontSize: 13, paddingBottom: 6 }}>
          {status === "NOT_STARTED" && t("Has not started today.")}
          {status === "WORKING" && live && t("Current session {duration}", { duration: formatDuration(live.currentWorkSeconds) })}
          {status === "ON_BREAK" && live && <b className="num" style={{ color: "var(--text)" }}>{t("Current break {duration}", { duration: formatClock(live.currentBreakSeconds) })}</b>}
          {status === "DAY_ENDED" && workday?.endedAt && t("Ended at {time}", { time: `${formatTimeOnDay(workday.endedAt, timeZone, workday.startedAt)} ${zone}` })}
          {workday && <span style={{ display: "block" }}>{t(ACTIVITY_LABELS[workday.lastActivity.type])} · {formatTime(workday.lastActivity.at, timeZone)} {zone}</span>}
        </div>
      </div>
      {workday && live && (
        <>
          <WorkdaySummary figures={{ ...live, startedAt: workday.startedAt, endedAt: workday.endedAt }} timeZone={timeZone} label={t("Today's totals")} />
          <div style={{ marginTop: 14 }}><button type="button" className="btn btn-sm" onClick={onOpenWorkday}>{t("Open this workday")}</button></div>
        </>
      )}
    </section>
  );
}

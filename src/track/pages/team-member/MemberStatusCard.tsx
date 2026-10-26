import type { TeamMemberDetail } from "@/track/api-types";
import { ShiftLine } from "@/track/components/time/ShiftLine";
import { WorkdayStatusChip } from "@/track/components/time/WorkdayStatusChip";
import { WorkdaySummary } from "@/track/components/time/WorkdaySummary";
import { formatClock, formatDuration, formatTime, formatTimeOnDay } from "@/track/lib/time/format";
import { workdayFigures } from "@/track/lib/time/live-totals";
import { dayHeading, shiftOf } from "@/track/lib/time/shift";
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
        <h3 id="now-heading">{dayHeading(workday?.date, member.today, t)}</h3>
        <span data-testid="member-status"><WorkdayStatusChip status={status} isStale={workday?.isStale} isOffDay={workday ? workday.isOffDay : Boolean(member.isOffDay)} /></span>
      </div>
      <div style={{ marginBottom: 10 }}><ShiftLine shift={shiftOf(workday, member.shift ?? null)} isOutsideShift={workday?.isOutsideShift} /></div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: workday ? 16 : 0 }}>
        <div>
          <div className="eyebrow">{t("Productive time")}</div>
          <div className="bigtime" role="timer" aria-label={t("Productive time")} aria-live="off" data-status={status} data-seconds={live?.productiveSeconds ?? 0} style={{ fontSize: 44 }}>
            {formatClock(live?.productiveSeconds ?? 0)}
          </div>
        </div>
        <div className="faint" style={{ fontSize: 13, paddingBottom: 6 }}>
          {status === "NOT_STARTED" && <span style={{ display: "block" }}>{member.isOffDay ? t("Week off today. Any time worked counts as extra time.") : t("Has not started today.")}</span>}
          {status === "WORKING" && live && <span style={{ display: "block" }}>{t("Working now · current session {duration}", { duration: formatDuration(live.currentWorkSeconds) })}</span>}
          {status === "ON_BREAK" && live && <b className="num" style={{ display: "block", color: "var(--text)" }}>{t("Current break {duration}", { duration: formatClock(live.currentBreakSeconds) })}</b>}
          {status === "DAY_ENDED" && workday?.endedAt && <span style={{ display: "block" }}>{t("Ended at {time}", { time: `${formatTimeOnDay(workday.endedAt, timeZone, workday.startedAt)} ${zone}` })}</span>}
          {workday && <span style={{ display: "block" }}>{t(ACTIVITY_LABELS[workday.lastActivity.type])} · {formatTime(workday.lastActivity.at, timeZone)} {zone}</span>}
        </div>
      </div>
      {workday && live && (
        <>
          <WorkdaySummary figures={{ ...live, startedAt: workday.startedAt, endedAt: workday.endedAt, scheduledSeconds: workday.shift?.scheduledSeconds, varianceSeconds: workday.varianceSeconds, extraSeconds: workday.extraSeconds }} timeZone={timeZone} label={t("Today's totals")} />
          <div style={{ marginTop: 14 }}><button type="button" className="btn btn-sm" onClick={onOpenWorkday}>{t("Open this workday")}</button></div>
        </>
      )}
    </section>
  );
}

import { Suspense } from "react";
import { ShiftLine } from "@/track/components/time/ShiftLine";
import { TimeActionButtons } from "@/track/components/time/TimeActionButtons";
import { Timeline } from "@/track/components/time/Timeline";
import { WorkdayStatusChip } from "@/track/components/time/WorkdayStatusChip";
import { WorkdaySummary } from "@/track/components/time/WorkdaySummary";
import { formatClock, formatDateKey, formatDuration, formatTime, formatTimeOnDay } from "@/track/lib/time/format";
import { workdayFigures } from "@/track/lib/time/live-totals";
import { dayHeading, shiftOf } from "@/track/lib/time/shift";
import { ACTIVITY_LABELS } from "@/track/lib/time/types";
import { zoneAbbreviation } from "@/track/lib/time/zone-names";
import type { TimeEventRunner } from "@/track/time/useTimeEvent";
import type { TimeStateReading } from "@/track/time/useTimeState";
import { useServerClock } from "@/track/time/useServerClock";
import { useTrack } from "@/track/TrackContext";
import { EndedWorkdayNotice } from "./EndedWorkdayNotice";

/** 02:37:14 with faint colons (design `.bigtime`). */
function ClockDigits({ seconds }: { seconds: number }) {
  const [hours, minutes, remainingSeconds] = formatClock(seconds).split(":");
  return <>{hours}<span>:</span>{minutes}<span>:</span>{remainingSeconds}</>;
}

/**
 * The timer (ported from the old timer-panel.tsx): the state, the big productive timer, the time buttons, today's totals and the
 * timeline. Every figure is computed from the last server snapshot and the server-corrected clock (closed seconds + now - start of
 * the running interval); nothing counts up on its own. Clock times are in the display time zone.
 */
export function TimerPanel({ reading, runner, timeZone, isOffline }: {
  reading: TimeStateReading;
  runner: TimeEventRunner;
  timeZone: string;
  isOffline: boolean;
}) {
  const { t } = useTrack();
  const { state, clockOffsetMilliseconds } = reading;
  const { status, workday } = state;
  const isRunning = status === "WORKING" || status === "ON_BREAK";
  const now = useServerClock(clockOffsetMilliseconds, isRunning);
  const live = workday ? workdayFigures(workday, now) : null;
  const productiveSeconds = live?.productiveSeconds ?? 0;
  const isOtherDay = Boolean(workday && workday.date !== state.shiftDate);
  const shift = shiftOf(workday, state.shift);
  const zone = zoneAbbreviation(timeZone, new Date(workday?.startedAt ?? now));

  return (
    <div className="col">
      {runner.inconsistencyMessage && (
        <section className="notice bad" role="alert">
          <b>{t("Your time record needs attention")}</b>
          <span>{runner.inconsistencyMessage}</span>
          <span style={{ marginTop: 6 }}><button type="button" className="btn btn-sm" onClick={runner.retry}>{t("Check again")}</button></span>
        </section>
      )}
      {workday?.isStale && live && (
        <section className="notice warn" role="status">
          <b>{t("Not ended: your workday has been open for {duration}", { duration: formatDuration(live.spanSeconds) })}</b>
          <span>{t("It started on {date} at {time}. If you have finished, end it now; if the recorded time is wrong, ask your business owner to correct it.", {
            date: formatDateKey(workday.date),
            time: `${formatTime(workday.startedAt, timeZone)} ${zone}`,
          })}</span>
        </section>
      )}
      {isOffline && (
        <section className="notice info" role="status">
          <b>{t("Connection lost. Reconnecting…")}</b>
          <span>{t("Your time is recorded on the server. The timer keeps counting from your last known state.")}</span>
        </section>
      )}
      {state.isOffDay && !workday && status === "NOT_STARTED" && (
        <section className="notice info" role="status" data-testid="week-off-notice">
          <b>{t("Today is your week off.")}</b>
          <span>{t("You can still work: the time counts as extra time.")}</span>
        </section>
      )}
      {runner.endedWorkdayId && !workday && (
        <Suspense fallback={null}><EndedWorkdayNotice workdayId={runner.endedWorkdayId} timeZone={timeZone} /></Suspense>
      )}

      <section className="card timecard enter" style={{ ["--i" as string]: 1 }} aria-label={t("Timer")}>
        <div className="aur" aria-hidden="true"></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", position: "relative" }}>
          <div>
            <span className="eyebrow">{dayHeading(workday?.date, state.shiftDate, t)}</span>
            <div style={{ fontWeight: 600, marginTop: 2 }}>
              {workday
                ? <>{t("Work started {time}", { time: formatTimeOnDay(workday.startedAt, timeZone, new Date()) })}{workday.endedAt && <> · {t("Work ended {time}", { time: formatTimeOnDay(workday.endedAt, timeZone, workday.startedAt) })}</>} <span className="faint">{zone}</span></>
                : formatDateKey(state.today)}
            </div>
            <div style={{ marginTop: 4 }}><ShiftLine shift={shift} isOutsideShift={workday?.isOutsideShift} /></div>
          </div>
          <span data-testid="time-status"><WorkdayStatusChip status={status} isStale={workday?.isStale} isOffDay={workday ? workday.isOffDay : state.isOffDay} /></span>
        </div>
        <div style={{ position: "relative" }}>
          <div className="eyebrow">{isOtherDay ? t("Productive time of this workday") : status === "DAY_ENDED" ? t("Today's productive time") : t("Productive time today")}</div>
          <div className="bigtime" role="timer" aria-label={t("Productive time")} aria-live="off" data-status={status} data-seconds={productiveSeconds}>
            <ClockDigits seconds={productiveSeconds} />
          </div>
          <div className="faint" style={{ marginTop: 8, fontSize: 13 }}>
            {status === "NOT_STARTED" && t("Select Start work when you begin your day.")}
            {status === "WORKING" && live && t("Current session {duration}", { duration: formatDuration(live.currentWorkSeconds) })}
            {status === "ON_BREAK" && live && <>{t("Your productive timer is paused.")} <b className="num" style={{ color: "var(--text)" }}>{t("Current break {duration}", { duration: formatClock(live.currentBreakSeconds) })}</b></>}
            {status === "DAY_ENDED" && t("Your workday is complete.")}
          </div>
        </div>
        <TimeActionButtons status={status} runner={runner}
          endSummary={live ? t("Productive so far: {productive} · Break: {break}", { productive: formatDuration(live.productiveSeconds), break: formatDuration(live.breakSeconds) }) : undefined} />
      </section>

      {workday && live && (
        <section className="card pad enter" style={{ ["--i" as string]: 2 }} aria-labelledby="totals-heading">
          <div className="card-h"><h3 id="totals-heading">{status === "DAY_ENDED" ? t("Today's summary") : t("Today's totals")}</h3>
            <span className="faint" style={{ fontSize: 12.5 }}>{t(ACTIVITY_LABELS[workday.lastActivity.type])} · {formatTime(workday.lastActivity.at, timeZone)}</span>
          </div>
          <WorkdaySummary figures={{ ...live, startedAt: workday.startedAt, endedAt: workday.endedAt, scheduledSeconds: workday.shift?.scheduledSeconds, varianceSeconds: workday.varianceSeconds, extraSeconds: workday.extraSeconds }} timeZone={timeZone} label={t("Today's totals")} />
        </section>
      )}

      {workday && (
        <section className="card pad enter" style={{ ["--i" as string]: 3 }} aria-labelledby="timeline-heading">
          <div className="card-h"><h3 id="timeline-heading">{t("Timeline")}</h3><span className="faint" style={{ fontSize: 12.5 }}>{t("Every work and break interval, as recorded.")}</span></div>
          <Timeline segments={workday.segments} nowMilliseconds={now} timeZone={timeZone} />
        </section>
      )}
    </div>
  );
}

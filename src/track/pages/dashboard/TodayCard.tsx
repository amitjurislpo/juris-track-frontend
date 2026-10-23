import { TrackLink } from "@/track/components/TrackLink";
import { Icon } from "@/track/components/Icon";
import { TimeActionButtons } from "@/track/components/time/TimeActionButtons";
import { WorkdayStatusChip } from "@/track/components/time/WorkdayStatusChip";
import { formatClock, formatDuration, formatTime } from "@/track/lib/time/format";
import { workdayFigures } from "@/track/lib/time/live-totals";
import type { TimeEventRunner } from "@/track/time/useTimeEvent";
import type { TimeStateReading } from "@/track/time/useTimeState";
import { useServerClock } from "@/track/time/useServerClock";
import { useTrack } from "@/track/TrackContext";

/** Today at a glance: the state, productive and break time (live), and the same time buttons as My time. */
export function TodayCard({ reading, runner, timeZone }: { reading: TimeStateReading; runner: TimeEventRunner; timeZone: string }) {
  const { t } = useTrack();
  const { status, workday } = reading.state;
  const now = useServerClock(reading.clockOffsetMilliseconds, status === "WORKING" || status === "ON_BREAK");
  const live = workday ? workdayFigures(workday, now) : null;
  return (
    <section className="card timecard span-7 enter" style={{ ["--i" as string]: 1 }} aria-label={t("Today")}>
      <div className="aur" aria-hidden="true"></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", position: "relative" }}>
        <div>
          <span className="eyebrow">{t("Today")}</span>
          <div style={{ fontWeight: 600, marginTop: 2 }}>{workday ? t("Started {time}", { time: formatTime(workday.startedAt, timeZone) }) : t("Not started yet")}</div>
        </div>
        <span data-testid="time-status"><WorkdayStatusChip status={status} isStale={workday?.isStale} /></span>
      </div>
      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", position: "relative" }}>
        <div>
          <div className="eyebrow">{t("Productive")}</div>
          <div className="bigtime" style={{ fontSize: "clamp(36px,4vw,48px)" }} role="timer" aria-label={t("Productive time")} aria-live="off" data-status={status}>
            {formatClock(live?.productiveSeconds ?? 0)}
          </div>
        </div>
        <div>
          <div className="eyebrow">{t("Break")}</div>
          <div className="num" style={{ fontSize: 22, marginTop: 10 }}>{formatDuration(live?.breakSeconds ?? 0)}</div>
          <div className="faint" style={{ fontSize: 12.5 }}>{t((live?.breakCount ?? 0) === 1 ? "{count} break" : "{count} breaks", { count: live?.breakCount ?? 0 })}</div>
        </div>
      </div>
      <TimeActionButtons status={status} runner={runner} isLarge={false}
        endSummary={live ? t("Productive so far: {productive} · Break: {break}", { productive: formatDuration(live.productiveSeconds), break: formatDuration(live.breakSeconds) }) : undefined} />
      {runner.inconsistencyMessage && (
        <div className="notice bad" role="alert" style={{ position: "relative" }}>
          <span>{runner.inconsistencyMessage}</span>
          <span><button type="button" className="btn btn-sm" onClick={runner.retry}>{t("Check again")}</button></span>
        </div>
      )}
      <TrackLink className="linklike" to="/my-time" style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4 }}>
        {t("Open My time")}<Icon name="arrow" size={14} />
      </TrackLink>
    </section>
  );
}

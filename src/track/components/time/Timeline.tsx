import { timeZoneOffsetMilliseconds } from "@/track/lib/time/business-calendar";
import { formatDuration, formatTime } from "@/track/lib/time/format";
import { intervalSeconds } from "@/track/lib/time/interval-math";
import type { TimelineSegment } from "@/track/lib/time/types";
import { useTrack } from "@/track/TrackContext";

const HOUR_MILLISECONDS = 3_600_000;

/** The whole hours (in the display time zone) between `start` and `end`, kept clear of both ends' labels. */
function hourTicks(start: number, end: number, timeZone: string): number[] {
  const total = end - start;
  const step = total / HOUR_MILLISECONDS > 10 ? 2 : 1;
  const offset = timeZoneOffsetMilliseconds(new Date(start), timeZone);
  const ticks: number[] = [];
  for (let tick = Math.ceil((start + offset) / HOUR_MILLISECONDS) * HOUR_MILLISECONDS - offset; tick < end; tick += step * HOUR_MILLISECONDS) {
    const share = (tick - start) / total;
    if (share > 0.12 && share < 0.88) ticks.push(tick);
  }
  return ticks;
}

/**
 * A workday's work and break intervals (ported from the old timeline.tsx): a proportional bar with a label per interval, a
 * legend, and the same intervals as a list, so nothing depends on colour alone. Clock times are in `timeZone` (the display time
 * zone); a running interval runs to `nowMilliseconds`.
 */
export function Timeline({ segments, nowMilliseconds, timeZone, hasList = true }: {
  segments: TimelineSegment[];
  nowMilliseconds: number;
  timeZone: string;
  hasList?: boolean;
}) {
  const { t } = useTrack();
  if (!segments.length) return <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{t("No activity recorded yet.")}</p>;

  const endOf = (segment: TimelineSegment) => (segment.endedAt ? Date.parse(segment.endedAt) : nowMilliseconds);
  const start = Date.parse(segments[0].startedAt);
  const end = Math.max(start + 1000, ...segments.map(endOf));
  const total = end - start;
  const isRunning = segments.some((segment) => !segment.endedAt);
  const typeLabel = (segment: TimelineSegment) => (segment.type === "WORK" ? t("Work") : t("Break"));
  const rangeOf = (segment: TimelineSegment) =>
    `${formatTime(segment.startedAt, timeZone)} – ${segment.endedAt ? formatTime(segment.endedAt, timeZone) : t("now")}`;

  return (
    <div className="col" style={{ gap: 12 }}>
      <div>
        <div className="daybar" role="group" aria-label={t("Work and break timeline")}>
          {segments.map((segment) => {
            const left = ((Date.parse(segment.startedAt) - start) / total) * 100;
            const width = Math.max(0.6, ((endOf(segment) - Date.parse(segment.startedAt)) / total) * 100);
            const label = `${typeLabel(segment)} ${rangeOf(segment)} (${formatDuration(intervalSeconds(segment, nowMilliseconds))})`;
            return (
              <i key={segment.id} role="img" tabIndex={0} aria-label={label} title={label}
                className={`${segment.type === "WORK" ? "work" : "break"}${segment.endedAt ? "" : " running"}`}
                style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} />
            );
          })}
        </div>
        <div className="daybar-ticks" aria-hidden="true">
          <span style={{ left: 0 }}>{formatTime(new Date(start), timeZone)}</span>
          {hourTicks(start, end, timeZone).map((tick) => (
            <span key={tick} style={{ left: `${((tick - start) / total) * 100}%`, transform: "translateX(-50%)" }}>{formatTime(new Date(tick), timeZone)}</span>
          ))}
          <span style={{ right: 0 }}>{isRunning ? t("Now") : formatTime(new Date(end), timeZone)}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <span className="legend"><i className="work" aria-hidden="true"></i>{t("Work")}</span>
        <span className="legend"><i className="break" aria-hidden="true"></i>{t("Break")}</span>
      </div>
      {hasList && (
        <ol className="timeline" style={{ margin: 0, paddingLeft: 0, listStyle: "none" }} aria-label={t("Intervals")}>
          {segments.map((segment) => (
            <li key={segment.id} className="t">
              <i className={segment.type === "WORK" ? "work" : "break"} aria-hidden="true"></i>
              <b style={{ width: "auto", minWidth: 116 }}>{rangeOf(segment)}</b>
              <span>{typeLabel(segment)}</span>
              <span className="faint num" style={{ marginLeft: "auto", fontSize: 12.5 }}>{formatDuration(intervalSeconds(segment, nowMilliseconds))}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

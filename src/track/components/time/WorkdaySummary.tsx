import type { ReactNode } from "react";
import { formatDuration, formatTimeOnDay } from "@/track/lib/time/format";
import { formatScheduledSeconds, formatVariance, isAllDaySeconds } from "@/track/lib/time/shift";
import type { LastBreak } from "@/track/lib/time/types";
import { useTrack } from "@/track/TrackContext";
import { LastBreakNote } from "./LastBreakNote";

/**
 * The figures of one workday (design `.summary`): when work started (with the date when it is not today), when it ended (with its date
 * after midnight), the span, productive and break time, breaks and the start of the last break, all in `timeZone`; with a shift also the
 * scheduled length and, once the day has ended, how far the productive time is over or short of it.
 */
export function WorkdaySummary({ figures, timeZone, label }: {
  figures: { startedAt: string; endedAt: string | null; productiveSeconds: number; breakSeconds: number; spanSeconds: number; breakCount: number; lastBreak: LastBreak | null;
    scheduledSeconds?: number | null; varianceSeconds?: number | null; extraSeconds?: number };
  timeZone: string;
  label: string;
}) {
  const { t } = useTrack();
  const items: [string, ReactNode][] = [
    [t("Work started"), formatTimeOnDay(figures.startedAt, timeZone, new Date())],
    [t("Work ended"), figures.endedAt ? formatTimeOnDay(figures.endedAt, timeZone, figures.startedAt) : t("Not ended yet")],
    [t("Productive"), formatDuration(figures.productiveSeconds)],
    [t("Break"), formatDuration(figures.breakSeconds)],
    [t("Span"), formatDuration(figures.spanSeconds)],
    [t("Breaks"), String(figures.breakCount)],
    [t("Last break"), figures.lastBreak ? <LastBreakNote lastBreak={figures.lastBreak} timeZone={timeZone} isLabelled={false} /> : "—"],
  ];
  if (figures.scheduledSeconds != null) items.push([t("Scheduled"), formatScheduledSeconds(figures.scheduledSeconds)]);
  // the default all-day shift has no fixed hours: every short day would read about 24h short, so no variance is shown
  if (figures.varianceSeconds != null && !isAllDaySeconds(figures.scheduledSeconds)) items.push([t("Against shift"), formatVariance(figures.varianceSeconds)]);
  if (figures.extraSeconds) items.push([t("Extra time"), formatDuration(figures.extraSeconds)]);
  return (
    <dl className="summary" aria-label={label} style={{ margin: 0 }}>
      {items.map(([name, value]) => (
        <div key={name}><dt><small>{name}</small></dt><dd style={{ margin: 0 }}><b className="num">{value}</b></dd></div>
      ))}
    </dl>
  );
}

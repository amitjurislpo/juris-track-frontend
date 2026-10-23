import { formatDuration, formatTime } from "@/track/lib/time/format";
import { formatScheduledSeconds, formatVariance } from "@/track/lib/time/shift";
import { useTrack } from "@/track/TrackContext";

/**
 * The figures of one workday (design `.summary`): start and end in `timeZone`, the span, productive and break time, breaks; with a
 * shift also the scheduled length and, once the day has ended, how far the productive time is over or short of it.
 */
export function WorkdaySummary({ figures, timeZone, label }: {
  figures: { startedAt: string; endedAt: string | null; productiveSeconds: number; breakSeconds: number; spanSeconds: number; breakCount: number;
    scheduledSeconds?: number | null; varianceSeconds?: number | null; extraSeconds?: number };
  timeZone: string;
  label: string;
}) {
  const { t } = useTrack();
  const items: [string, string][] = [
    [t("Workday start"), formatTime(figures.startedAt, timeZone)],
    [t("Workday end"), figures.endedAt ? formatTime(figures.endedAt, timeZone) : t("Not ended yet")],
    [t("Productive"), formatDuration(figures.productiveSeconds)],
    [t("Break"), formatDuration(figures.breakSeconds)],
    [t("Span"), formatDuration(figures.spanSeconds)],
    [t("Breaks"), String(figures.breakCount)],
  ];
  if (figures.scheduledSeconds != null) items.push([t("Scheduled"), formatScheduledSeconds(figures.scheduledSeconds)]);
  if (figures.varianceSeconds != null) items.push([t("Against shift"), formatVariance(figures.varianceSeconds)]);
  if (figures.extraSeconds) items.push([t("Extra time"), formatDuration(figures.extraSeconds)]);
  return (
    <dl className="summary" aria-label={label} style={{ margin: 0 }}>
      {items.map(([name, value]) => (
        <div key={name}><dt><small>{name}</small></dt><dd style={{ margin: 0 }}><b className="num">{value}</b></dd></div>
      ))}
    </dl>
  );
}

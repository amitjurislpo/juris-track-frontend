import { formatDuration, formatTime } from "@/track/lib/time/format";
import { useTrack } from "@/track/TrackContext";

/** The figures of one workday (design `.summary`): start and end in `timeZone`, the span, productive and break time, breaks. */
export function WorkdaySummary({ figures, timeZone, label }: {
  figures: { startedAt: string; endedAt: string | null; productiveSeconds: number; breakSeconds: number; spanSeconds: number; breakCount: number };
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
  return (
    <dl className="summary" aria-label={label} style={{ margin: 0 }}>
      {items.map(([name, value]) => (
        <div key={name}><dt><small>{name}</small></dt><dd style={{ margin: 0 }}><b className="num">{value}</b></dd></div>
      ))}
    </dl>
  );
}

import type { TeamMetrics } from "@/track/api-types";
import { formatDuration } from "@/track/lib/time/format";
import { liveTeamTotals } from "@/track/lib/time/team-live-figures";
import { useTrack } from "@/track/TrackContext";

/**
 * The board's tiles over everybody of the scope (filters and search do not change them): people, working, on break, not started,
 * day ended, not ended, and the productive time so far (total and average per person who started), running live.
 */
export function TeamMetricsTiles({ metrics, serverTime, nowMilliseconds }: { metrics: TeamMetrics; serverTime: string; nowMilliseconds: number }) {
  const { t } = useTrack();
  const { totalProductiveSeconds, averageProductiveSeconds } = liveTeamTotals(metrics, serverTime, nowMilliseconds);
  const tiles: [string, string, string?][] = [
    [t("People"), String(metrics.total)],
    [t("Working"), String(metrics.working)],
    [t("On break"), String(metrics.onBreak)],
    [t("Not started"), String(metrics.notStarted)],
    [t("Day ended"), String(metrics.dayEnded)],
    [t("Not ended"), String(metrics.stale), t("open too long")],
    [t("Productive today"), formatDuration(totalProductiveSeconds), t("everybody together")],
    [t("Average productive"), formatDuration(averageProductiveSeconds), t("per person who started")],
  ];
  return (
    <div className="kpis kpis-compact enter" style={{ ["--i" as string]: 1 }} role="list" aria-label={t("Team totals")}>
      {tiles.map(([label, value, note]) => (
        <div key={label} className="card kpi" role="listitem" aria-label={`${label}: ${value}`}>
          <span className="l">{label}</span>
          <span className="v num">{value}</span>
          {note && <span className="s">{note}</span>}
        </div>
      ))}
    </div>
  );
}

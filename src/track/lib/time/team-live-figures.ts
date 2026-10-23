/**
 * The live figures of the Team board: each row and the tiles are advanced from the board's last answer to the server's "now"
 * (`closedProductiveSeconds + (now - activeWorkStartedAt)`, as the personal timer does). Nothing counts up on its own.
 */
import type { TeamMemberRow, TeamMetrics } from "@/track/api-types";
import { liveTotals, type LiveTotals } from "./live-totals";

/**
 * A row's figures at `nowMilliseconds`: none before the person started today; an ended day's own totals as the API computed them;
 * an open day's advanced from its timestamps.
 */
export function teamRowFigures(row: TeamMemberRow, nowMilliseconds: number): LiveTotals | null {
  if (row.status === "NOT_STARTED" || !row.startedAt) return null;
  if (row.endedAt) {
    return {
      productiveSeconds: row.productiveSeconds,
      breakSeconds: row.breakSeconds,
      currentWorkSeconds: 0,
      currentBreakSeconds: 0,
      spanSeconds: row.spanSeconds,
      breakCount: row.breakCount,
    };
  }
  return liveTotals({ ...row, startedAt: row.startedAt }, nowMilliseconds);
}

/**
 * The tiles' productive time at `nowMilliseconds`: the totals of the answer (live up to `serverTime`) plus the time each working
 * person has worked since; the average divides by the people who started today (working, on break, day ended), rounded down.
 */
export function liveTeamTotals(metrics: TeamMetrics, serverTime: string, nowMilliseconds: number): { totalProductiveSeconds: number; averageProductiveSeconds: number } {
  const elapsedSeconds = Math.max(0, Math.floor((nowMilliseconds - Date.parse(serverTime)) / 1000));
  const totalProductiveSeconds = metrics.totalProductiveSeconds + metrics.working * elapsedSeconds;
  const startedCount = metrics.working + metrics.onBreak + metrics.dayEnded;
  return { totalProductiveSeconds, averageProductiveSeconds: startedCount ? Math.floor(totalProductiveSeconds / startedCount) : 0 };
}

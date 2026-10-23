/** Live timers (ported from the old app's lib/time/live.ts; checked against tests/fixtures/time-engine.json). */
import type { LastBreak, WorkdaySnapshot } from "./types";

export type LiveTotalsSnapshot = Pick<
  WorkdaySnapshot,
  "closedProductiveSeconds" | "closedBreakSeconds" | "activeWorkStartedAt" | "activeBreakStartedAt" | "startedAt" | "endedAt" | "breakCount" | "lastBreak"
>;

export interface LiveTotals {
  productiveSeconds: number;
  breakSeconds: number;
  currentWorkSeconds: number;
  currentBreakSeconds: number;
  spanSeconds: number;
  breakCount: number;
  lastBreak: LastBreak | null;
}

/**
 * Advances a server snapshot to `nowMilliseconds` using only its timestamps. This is what the live timers display; the database
 * remains the source of truth.
 */
export function liveTotals(workday: LiveTotalsSnapshot, nowMilliseconds: number): LiveTotals {
  const secondsSince = (startedAt: string | null) =>
    startedAt ? Math.max(0, Math.floor((nowMilliseconds - Date.parse(startedAt)) / 1000)) : 0;
  const currentWorkSeconds = secondsSince(workday.activeWorkStartedAt);
  const currentBreakSeconds = secondsSince(workday.activeBreakStartedAt);
  const end = workday.endedAt ? Date.parse(workday.endedAt) : nowMilliseconds;
  return {
    productiveSeconds: workday.closedProductiveSeconds + currentWorkSeconds,
    breakSeconds: workday.closedBreakSeconds + currentBreakSeconds,
    currentWorkSeconds,
    currentBreakSeconds,
    spanSeconds: Math.max(0, Math.floor((end - Date.parse(workday.startedAt)) / 1000)),
    breakCount: workday.breakCount,
    lastBreak: workday.lastBreak,
  };
}

/**
 * The figures to show for a workday: an ended day's own totals, exactly as the API computed them (so the timer, the summary and
 * the history always agree to the second); an open day's advanced to `nowMilliseconds` from its timestamps.
 */
export function workdayFigures(workday: WorkdaySnapshot, nowMilliseconds: number): LiveTotals {
  if (!workday.endedAt) return liveTotals(workday, nowMilliseconds);
  return {
    productiveSeconds: workday.productiveSeconds,
    breakSeconds: workday.breakSeconds,
    currentWorkSeconds: 0,
    currentBreakSeconds: 0,
    spanSeconds: workday.spanSeconds,
    breakCount: workday.breakCount,
    lastBreak: workday.lastBreak,
  };
}

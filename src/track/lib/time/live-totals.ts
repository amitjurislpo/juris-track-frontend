/** Live timers (ported from the old app's lib/time/live.ts; checked against tests/fixtures/time-engine.json). */
import type { WorkdaySnapshot } from "./types";

export type LiveTotalsSnapshot = Pick<
  WorkdaySnapshot,
  "closedProductiveSeconds" | "closedBreakSeconds" | "activeWorkStartedAt" | "activeBreakStartedAt" | "startedAt" | "endedAt" | "breakCount"
>;

export interface LiveTotals {
  productiveSeconds: number;
  breakSeconds: number;
  currentWorkSeconds: number;
  currentBreakSeconds: number;
  spanSeconds: number;
  breakCount: number;
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
  };
}

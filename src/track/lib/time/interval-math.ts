/**
 * Pure time calculations (ported from the old app's lib/time/calc.ts; the backend has the same rules in IntervalMath.java, both
 * checked against tests/fixtures/time-engine.json).
 *
 * Durations are always derived from interval timestamps:
 *   closed interval  -> endedAt - startedAt
 *   open interval    -> now - startedAt
 * floored to whole seconds, never below 0, and then summed. Nothing here increments a counter.
 */

export interface IntervalLike {
  startedAt: Date | string;
  endedAt: Date | string | null;
}

const toMilliseconds = (value: Date | string) => (typeof value === "string" ? Date.parse(value) : value.getTime());

export function intervalSeconds(interval: IntervalLike, now: Date | number): number {
  const start = toMilliseconds(interval.startedAt);
  const end = interval.endedAt ? toMilliseconds(interval.endedAt) : typeof now === "number" ? now : now.getTime();
  return Math.max(0, Math.floor((end - start) / 1000));
}

export function sumSeconds(intervals: readonly IntervalLike[], now: Date | number): number {
  return intervals.reduce((total, interval) => total + intervalSeconds(interval, now), 0);
}

/** Sum of closed intervals only (open intervals contribute 0). */
export function closedSeconds(intervals: readonly IntervalLike[]): number {
  return intervals.reduce((total, interval) => (interval.endedAt ? total + intervalSeconds(interval, 0) : total), 0);
}

/** The first interval that is still running, if any. */
export function findOpenInterval<Interval extends IntervalLike>(intervals: readonly Interval[]): Interval | undefined {
  return intervals.find((interval) => !interval.endedAt);
}

export interface WorkdayTotals {
  productiveSeconds: number;
  breakSeconds: number;
  spanSeconds: number;
  breakCount: number;
}

export function computeTotals(
  workday: IntervalLike,
  workSessions: readonly IntervalLike[],
  breakSessions: readonly IntervalLike[],
  now: Date | number,
): WorkdayTotals {
  return {
    productiveSeconds: sumSeconds(workSessions, now),
    breakSeconds: sumSeconds(breakSessions, now),
    spanSeconds: intervalSeconds(workday, now),
    breakCount: breakSessions.length,
  };
}

/**
 * The numbers behind the daily chart (productive and break time stacked per day, ported from the old daily-chart.tsx): the
 * scale, its hour ticks and each bar's share of the height. Drawing is the component's job.
 */

export interface DailyChartPoint {
  date: string;
  productiveSeconds: number;
  breakSeconds: number;
}

interface DailyChartBar extends DailyChartPoint {
  /** Height of the productive part as a share (0 to 1) of the chart's height. */
  productiveFraction: number;
  /** Height of the break part (stacked on top) as a share of the chart's height. */
  breakFraction: number;
  /** Whether the date is written under this bar (at most about seven labels). */
  hasLabel: boolean;
}

export interface DailyChart {
  /** Hours at the top of the scale. */
  topHours: number;
  /** Hour values of the horizontal grid lines, from 0 to `topHours`. */
  tickHours: number[];
  bars: DailyChartBar[];
}

/** "Nice" steps between grid lines; the first that gives at most five intervals is used. */
const TICK_STEPS = [1, 2, 4, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
const MAXIMUM_LABELS = 7;

export function buildDailyChart(points: readonly DailyChartPoint[]): DailyChart {
  const maximumHours = Math.max(1, ...points.map((point) => (point.productiveSeconds + point.breakSeconds) / 3600));
  const tickStep = TICK_STEPS.find((step) => maximumHours / step <= 5) ?? Math.ceil(maximumHours / 5);
  const topHours = Math.ceil(maximumHours / tickStep) * tickStep;
  const tickHours = Array.from({ length: topHours / tickStep + 1 }, (_, i) => i * tickStep);
  const labelEvery = Math.max(1, Math.ceil(points.length / MAXIMUM_LABELS));
  const topSeconds = topHours * 3600;
  return {
    topHours,
    tickHours,
    bars: points.map((point, i) => ({
      date: point.date,
      productiveSeconds: point.productiveSeconds,
      breakSeconds: point.breakSeconds,
      productiveFraction: Math.max(0, point.productiveSeconds) / topSeconds,
      breakFraction: Math.max(0, point.breakSeconds) / topSeconds,
      hasLabel: i % labelEvery === 0,
    })),
  };
}

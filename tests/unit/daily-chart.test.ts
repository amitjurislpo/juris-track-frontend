import { describe, expect, it } from "vitest";
import { buildDailyChart } from "@/track/lib/time/daily-chart";

const day = (date: string, productiveHours: number, breakHours = 0) => ({ date, productiveSeconds: productiveHours * 3600, breakSeconds: breakHours * 3600 });
const october = (dayOfMonth: number) => `2026-10-${String(dayOfMonth).padStart(2, "0")}`;

describe("daily chart data", () => {
  it("scales to a nice number of hours with at most five steps and stacks break on productive", () => {
    const chart = buildDailyChart([day("2026-10-19", 7, 1), day("2026-10-20", 3), day("2026-10-21", 0)]);
    expect(chart.topHours).toBe(8);
    expect(chart.tickHours).toEqual([0, 2, 4, 6, 8]);
    expect(chart.bars.map((bar) => [bar.productiveFraction, bar.breakFraction])).toEqual([[7 / 8, 1 / 8], [3 / 8, 0], [0, 0]]);
  });

  it("keeps a one-hour scale for an empty range", () => {
    const chart = buildDailyChart([day("2026-10-19", 0), day("2026-10-20", 0)]);
    expect(chart.topHours).toBe(1);
    expect(chart.tickHours).toEqual([0, 1]);
    expect(chart.bars.every((bar) => bar.productiveFraction === 0 && bar.breakFraction === 0)).toBe(true);
  });

  it("rounds the top up to the step (11 hours with the break gives 12 in steps of 4)", () => {
    expect(buildDailyChart([day("2026-10-19", 10, 1)]).tickHours).toEqual([0, 4, 8, 12]);
  });

  it("labels every day of a week and about seven days of a month", () => {
    const week = buildDailyChart(Array.from({ length: 7 }, (_, i) => day(october(19 + i), 1)));
    expect(week.bars.every((bar) => bar.hasLabel)).toBe(true);
    const month = buildDailyChart(Array.from({ length: 31 }, (_, i) => day(october(1 + i), 1)));
    expect(month.bars.filter((bar) => bar.hasLabel).map((bar) => bar.date)).toEqual([1, 6, 11, 16, 21, 26, 31].map(october));
  });

  it("never gives a negative height", () => {
    const [bar] = buildDailyChart([{ date: "2026-10-19", productiveSeconds: -5, breakSeconds: -1 }]).bars;
    expect(bar.productiveFraction).toBe(0);
    expect(bar.breakFraction).toBe(0);
  });
});

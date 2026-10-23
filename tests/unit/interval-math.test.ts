import { describe, expect, it } from "vitest";
import { closedSeconds, computeTotals, findOpenInterval, intervalSeconds, sumSeconds, type IntervalLike, type WorkdayTotals } from "@/track/lib/time/interval-math";
import { goldenCases } from "./golden-fixture";

type Interval = { startedAt: string; endedAt: string | null };
type TotalsInput = { name: string; workday: Interval; workSessions: Interval[]; breakSessions: Interval[]; now: string };

const at = (time: string) => new Date(`2026-10-01T${time}:00Z`);
const between = (start: string, end: string): IntervalLike => ({ startedAt: at(start), endedAt: at(end) });

describe("interval math: the worked examples", () => {
  it("9h span, 1h break, 8h productive from intervals", () => {
    const totals = computeTotals(
      between("09:00", "18:00"),
      [between("09:00", "11:15"), between("11:30", "13:00"), between("13:45", "18:00")],
      [between("11:15", "11:30"), between("13:00", "13:45")],
      at("18:00"),
    );
    expect(totals).toEqual({ productiveSeconds: 8 * 3600, breakSeconds: 3600, spanSeconds: 9 * 3600, breakCount: 2 });
  });

  it("8.5h productive, 30m break", () => {
    const totals = computeTotals(
      between("09:00", "18:00"),
      [between("09:00", "11:00"), between("11:30", "18:00")],
      [between("11:00", "11:30")],
      at("18:00"),
    );
    expect(totals.productiveSeconds).toBe(8.5 * 3600);
    expect(totals.breakSeconds).toBe(1800);
  });
});

describe("interval math: golden cases from the old calc.ts", () => {
  it.each(goldenCases<{ interval: Interval; now: string }, number>("calc", "intervalSeconds"))("intervalSeconds #%#", ({ input, output }) => {
    expect(intervalSeconds(input.interval, new Date(input.now))).toBe(output);
  });

  it.each(goldenCases<{ intervals: Interval[]; now: string }, number>("calc", "sumSeconds"))("sumSeconds #%#", ({ input, output }) => {
    expect(sumSeconds(input.intervals, new Date(input.now))).toBe(output);
  });

  it.each(goldenCases<{ intervals: Interval[] }, number>("calc", "closedSeconds"))("closedSeconds #%#", ({ input, output }) => {
    expect(closedSeconds(input.intervals)).toBe(output);
  });

  it.each(goldenCases<{ intervals: Interval[] }, number>("calc", "openInterval"))("findOpenInterval #%#", ({ input, output }) => {
    expect(findOpenInterval(input.intervals)).toBe(output < 0 ? undefined : input.intervals[output]);
  });

  it.each(goldenCases<TotalsInput, WorkdayTotals>("calc", "computeTotals"))("computeTotals #%#", ({ input, output }) => {
    expect(computeTotals(input.workday, input.workSessions, input.breakSessions, new Date(input.now)), input.name).toEqual(output);
  });
});

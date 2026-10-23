import { describe, expect, it } from "vitest";
import { customRangeProblem, MAX_RANGE_DAYS, RANGE_LABELS, RANGE_PRESETS, resolveRange, type DateRange, type RangePreset } from "@/track/lib/time/date-ranges";
import { HINDI_MESSAGES } from "@/standalone/i18n/translate";
import { goldenCases, goldenValue } from "./golden-fixture";

type SearchParameter = string | string[];
type RangeInput = { params: { range?: SearchParameter; from?: SearchParameter; to?: SearchParameter }; today: string; fallback: RangePreset | null };

describe("date ranges: golden cases from the old ranges.ts", () => {
  it("keeps the old maximum span", () => {
    expect(MAX_RANGE_DAYS).toBe(goldenValue("ranges", "maxRangeDays"));
  });

  it.each(goldenCases<RangeInput, DateRange>("ranges", "resolveRange"))("resolveRange #%#", ({ input, output }) => {
    const resolved = input.fallback ? resolveRange(input.params, input.today, input.fallback) : resolveRange(input.params, input.today);
    expect(resolved).toEqual(output);
  });

  it("has a Hindi label for every preset", () => {
    for (const preset of RANGE_PRESETS) expect(HINDI_MESSAGES[RANGE_LABELS[preset]], preset).toBeTruthy();
  });
});

describe("date ranges: checking a custom range before it is applied", () => {
  it("accepts a range of one day up to 366 days", () => {
    expect(customRangeProblem("2026-10-23", "2026-10-23")).toBeNull();
    expect(customRangeProblem("2025-10-23", "2026-10-23")).toBeNull(); // 366 days, both ends included
  });

  it("refuses a range longer than 366 days", () => {
    expect(customRangeProblem("2025-10-22", "2026-10-23")).toBe("Choose at most {days} days.");
  });

  it("refuses a start after the end", () => {
    expect(customRangeProblem("2026-10-24", "2026-10-23")).toBe("The start date must be on or before the end date.");
  });

  it("refuses missing or impossible dates", () => {
    expect(customRangeProblem("", "2026-10-23")).toBe("Choose a start date and an end date.");
    expect(customRangeProblem("2026-02-30", "2026-03-02")).toBe("Choose a start date and an end date.");
  });

  it("has Hindi for every message", () => {
    for (const [from, to] of [["", ""], ["2026-10-24", "2026-10-23"], ["2020-01-01", "2026-10-23"]]) {
      const message = customRangeProblem(from, to);
      expect(message && HINDI_MESSAGES[message], message ?? "").toBeTruthy();
    }
  });
});

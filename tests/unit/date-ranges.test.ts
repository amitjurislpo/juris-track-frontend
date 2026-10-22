import { describe, expect, it } from "vitest";
import { MAX_RANGE_DAYS, RANGE_LABELS, RANGE_PRESETS, resolveRange, type DateRange, type RangePreset } from "@/track/lib/time/date-ranges";
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

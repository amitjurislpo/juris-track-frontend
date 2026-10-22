import { describe, expect, it } from "vitest";
import { formatClock, formatDateKey, formatDateTime, formatDuration, formatTime, fullName, initials, toDecimalHours } from "@/track/lib/time/format";
import { goldenCases } from "./golden-fixture";

type ZonedInstant = { instant: string | null; timeZone: string };
type PersonName = { firstName: string; lastName: string };

describe("time format: golden cases from the old format.ts", () => {
  it.each(goldenCases<number, string>("format", "formatClock"))("formatClock #%# ($input)", ({ input, output }) => {
    expect(formatClock(input)).toBe(output);
  });

  it.each(goldenCases<number | null, string>("format", "formatDuration"))("formatDuration #%# ($input)", ({ input, output }) => {
    expect(formatDuration(input)).toBe(output);
  });

  it("shows a dash for a missing duration", () => {
    expect(formatDuration(undefined)).toBe("—");
  });

  it.each(goldenCases<number, string>("format", "toDecimalHours"))("toDecimalHours #%# ($input)", ({ input, output }) => {
    expect(toDecimalHours(input)).toBe(output);
  });

  it.each(goldenCases<ZonedInstant, string>("format", "formatTime"))("formatTime #%#", ({ input, output }) => {
    expect(formatTime(input.instant, input.timeZone)).toBe(output);
    if (input.instant) expect(formatTime(new Date(input.instant), input.timeZone)).toBe(output);
  });

  it.each(goldenCases<ZonedInstant, string>("format", "formatDateTime"))("formatDateTime #%#", ({ input, output }) => {
    expect(formatDateTime(input.instant, input.timeZone)).toBe(output);
  });

  type DateKeyInput = { key: string; options: { weekday?: boolean; year?: boolean } | null };
  it.each(goldenCases<DateKeyInput, string>("format", "formatDateKey"))("formatDateKey #%#", ({ input, output }) => {
    expect(input.options ? formatDateKey(input.key, input.options) : formatDateKey(input.key)).toBe(output);
  });

  it.each(goldenCases<PersonName, string>("format", "fullName"))("fullName #%#", ({ input, output }) => {
    expect(fullName(input)).toBe(output);
  });

  it.each(goldenCases<PersonName, string>("format", "initials"))("initials #%#", ({ input, output }) => {
    expect(initials(input)).toBe(output);
  });
});

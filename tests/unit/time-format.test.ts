import { describe, expect, it } from "vitest";
import { formatClock, formatDateKey, formatDateTime, formatDuration, formatTime, formatTimeOnDay, fullName, initials, toDecimalHours } from "@/track/lib/time/format";
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

  describe("formatTimeOnDay", () => {
    const KOLKATA = "Asia/Kolkata";

    it("shows only the time on the reference's calendar day", () => {
      expect(formatTimeOnDay("2026-10-24T09:00:00Z", KOLKATA, "2026-10-24T03:30:00Z")).toBe("14:30");
    });

    it("adds the date when the moment is on another day (a night shift's end after midnight)", () => {
      // 22:00 IST on the 24th to 06:30 IST on the 25th
      expect(formatTimeOnDay("2026-10-25T01:00:00Z", KOLKATA, "2026-10-24T16:30:00Z")).toBe("25 Oct, 06:30");
    });

    it("compares the days in the given time zone, not in UTC", () => {
      // 20:00 UTC on the 24th is already the 25th in India; 18:00 UTC is still the 24th
      expect(formatTimeOnDay("2026-10-24T20:00:00Z", KOLKATA, "2026-10-24T18:00:00Z")).toBe("25 Oct, 01:30");
      expect(formatTimeOnDay("2026-10-24T20:00:00Z", "UTC", "2026-10-24T18:00:00Z")).toBe("20:00");
    });

    it("has no value for nothing", () => {
      expect(formatTimeOnDay(null, KOLKATA, "2026-10-24T18:00:00Z")).toBe("—");
    });
  });
});

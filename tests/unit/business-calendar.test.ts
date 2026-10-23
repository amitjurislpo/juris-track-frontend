import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  eachDay,
  isDateKey,
  isValidTimeZone,
  parseZonedDateTime,
  resolveZonedDateTime,
  startOfDayUtc,
  startOfMonth,
  startOfWeek,
  timeZoneOffsetMilliseconds,
  toDateKey,
  toZonedInputValue,
  zonedTimeToUtc,
} from "@/track/lib/time/business-calendar";
import { goldenCases } from "./golden-fixture";

type ZonedInstant = { instant: string; timeZone: string };
const isoOf = (date: Date | null) => (date ? date.toISOString() : null);

// dateKeyToDb / dbToDateKey are in the fixture too, but were Prisma adapters: they are not ported (the backend maps dates itself).
describe("business calendar: golden cases from the old tz.ts", () => {
  it.each(goldenCases<string, boolean>("tz", "isValidTimeZone"))("isValidTimeZone #%# ($input)", ({ input, output }) => {
    expect(isValidTimeZone(input)).toBe(output);
  });

  it.each(goldenCases<unknown, boolean>("tz", "isDateKey"))("isDateKey #%# ($input)", ({ input, output }) => {
    expect(isDateKey(input)).toBe(output);
  });

  it.each(goldenCases<ZonedInstant, string>("tz", "toDateKey"))("toDateKey #%#", ({ input, output }) => {
    expect(toDateKey(new Date(input.instant), input.timeZone)).toBe(output);
  });

  it.each(goldenCases<ZonedInstant, number>("tz", "tzOffsetMs"))("timeZoneOffsetMilliseconds #%#", ({ input, output }) => {
    expect(timeZoneOffsetMilliseconds(new Date(input.instant), input.timeZone)).toBe(output);
  });

  type WallClock = { key: string; timeZone: string; hour?: number; minute?: number; second?: number };
  it.each(goldenCases<WallClock, string>("tz", "zonedTimeToUtc"))("zonedTimeToUtc #%#", ({ input, output }) => {
    expect(isoOf(zonedTimeToUtc(input.key, input.timeZone, input.hour, input.minute, input.second))).toBe(output);
  });

  it.each(goldenCases<{ key: string; timeZone: string }, string>("tz", "startOfDayUtc"))("startOfDayUtc #%#", ({ input, output }) => {
    expect(isoOf(startOfDayUtc(input.key, input.timeZone))).toBe(output);
  });

  it.each(goldenCases<{ key: string; days: number }, string>("tz", "addDays"))("addDays #%#", ({ input, output }) => {
    expect(addDays(input.key, input.days)).toBe(output);
  });

  it.each(goldenCases<string, string>("tz", "startOfWeek"))("startOfWeek #%# ($input)", ({ input, output }) => {
    expect(startOfWeek(input)).toBe(output);
  });

  it.each(goldenCases<string, string>("tz", "startOfMonth"))("startOfMonth #%# ($input)", ({ input, output }) => {
    expect(startOfMonth(input)).toBe(output);
  });

  it.each(goldenCases<{ from: string; to: string }, number>("tz", "diffDays"))("daysBetween #%#", ({ input, output }) => {
    expect(daysBetween(input.from, input.to)).toBe(output);
  });

  it.each(goldenCases<{ from: string; to: string }, string[]>("tz", "eachDay"))("eachDay #%#", ({ input, output }) => {
    expect(eachDay(input.from, input.to)).toEqual(output);
  });

  it.each(goldenCases<{ value: string; timeZone: string }, string | null>("tz", "parseZonedDateTime"))("parseZonedDateTime #%#", ({ input, output }) => {
    expect(isoOf(parseZonedDateTime(input.value, input.timeZone))).toBe(output);
  });

  it.each(goldenCases<ZonedInstant, string>("tz", "toZonedInputValue"))("toZonedInputValue #%#", ({ input, output }) => {
    expect(toZonedInputValue(input.instant, input.timeZone)).toBe(output);
    expect(toZonedInputValue(new Date(input.instant), input.timeZone)).toBe(output);
  });
});

describe("wall-clock times across daylight-saving changes (resolveZonedDateTime)", () => {
  const NEW_YORK = "America/New_York";

  it("a spring-forward gap (2026-03-08 02:30 does not exist) is flagged and read as 01:30 EST, as before", () => {
    const resolved = resolveZonedDateTime("2026-03-08T02:30", NEW_YORK);
    expect(resolved?.kind).toBe("gap");
    expect(resolved?.instant.toISOString()).toBe("2026-03-08T06:30:00.000Z");
    expect(parseZonedDateTime("2026-03-08T02:30", NEW_YORK)?.toISOString()).toBe("2026-03-08T06:30:00.000Z");
  });

  it("times next to the gap are normal", () => {
    expect(resolveZonedDateTime("2026-03-08T01:59", NEW_YORK)).toMatchObject({ kind: "normal" });
    expect(resolveZonedDateTime("2026-03-08T03:00", NEW_YORK)).toMatchObject({ kind: "normal" });
    expect(resolveZonedDateTime("2026-03-08T03:00", NEW_YORK)?.instant.toISOString()).toBe("2026-03-08T07:00:00.000Z");
  });

  it("a fall-back overlap (2026-11-01 01:30 happens twice) is flagged; without a reference the first (EDT) is used", () => {
    const resolved = resolveZonedDateTime("2026-11-01T01:30", NEW_YORK);
    expect(resolved?.kind).toBe("ambiguous");
    expect(resolved?.instant.toISOString()).toBe("2026-11-01T05:30:00.000Z");
  });

  it("round trip: the second 01:30 (EST) read back with its own instant as reference stays the second 01:30", () => {
    const secondOccurrence = "2026-11-01T06:30:00.000Z";
    const inputValue = toZonedInputValue(secondOccurrence, NEW_YORK);
    expect(inputValue).toBe("2026-11-01T01:30");
    expect(parseZonedDateTime(inputValue, NEW_YORK)?.toISOString()).toBe("2026-11-01T05:30:00.000Z"); // the old bug: one hour early
    expect(parseZonedDateTime(inputValue, NEW_YORK, secondOccurrence)?.toISOString()).toBe(secondOccurrence);
    expect(parseZonedDateTime(inputValue, NEW_YORK, new Date(secondOccurrence))?.toISOString()).toBe(secondOccurrence);
  });

  it("round trip: the first 01:30 (EDT) stays the first, and a reference far away picks the nearer occurrence", () => {
    const firstOccurrence = "2026-11-01T05:30:00.000Z";
    expect(parseZonedDateTime("2026-11-01T01:30", NEW_YORK, firstOccurrence)?.toISOString()).toBe(firstOccurrence);
    // an end time edited into the repeated hour of a day whose stored end is 02:10 EST (07:10Z): the later 01:30 is closer
    expect(parseZonedDateTime("2026-11-01T01:30", NEW_YORK, "2026-11-01T07:10:00.000Z")?.toISOString()).toBe("2026-11-01T06:30:00.000Z");
  });

  it("every minute of the repeated hour survives toZonedInputValue and back with its own instant as reference", () => {
    for (let minute = 0; minute < 120; minute += 5) {
      const instant = new Date(Date.parse("2026-11-01T05:00:00.000Z") + minute * 60_000);
      const back = parseZonedDateTime(toZonedInputValue(instant, NEW_YORK), NEW_YORK, instant);
      expect(back?.toISOString(), instant.toISOString()).toBe(instant.toISOString());
    }
  });

  it("zones without clock changes are always normal", () => {
    expect(resolveZonedDateTime("2026-11-01T01:30", "Asia/Kolkata")).toMatchObject({ kind: "normal" });
    expect(resolveZonedDateTime("2026-03-08T02:30", "UTC")).toMatchObject({ kind: "normal" });
  });

  it("a half-hour clock change (Australia/Lord_Howe) has a gap and an overlap too", () => {
    expect(resolveZonedDateTime("2026-10-04T02:15", "Australia/Lord_Howe")?.kind).toBe("gap");
    expect(resolveZonedDateTime("2026-04-05T01:45", "Australia/Lord_Howe")?.kind).toBe("ambiguous");
  });

  it("returns null for malformed input", () => {
    expect(resolveZonedDateTime("2026-11-01 01:30", NEW_YORK)).toBeNull();
    expect(resolveZonedDateTime("2026-02-30T01:30", NEW_YORK)).toBeNull();
  });
});

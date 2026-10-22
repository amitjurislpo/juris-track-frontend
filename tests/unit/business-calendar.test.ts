import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  eachDay,
  isDateKey,
  isValidTimeZone,
  parseZonedDateTime,
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

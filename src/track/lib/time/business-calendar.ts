/**
 * The calendar of a business in its time zone, built on the platform Intl API (ported from the old app's lib/time/tz.ts; the backend
 * has the same rules in BusinessCalendar.java, both checked against tests/fixtures/time-engine.json).
 *
 * All calendar logic uses the business time zone, never the browser's. A "date key" is an ISO calendar date string (YYYY-MM-DD)
 * in that time zone.
 */

export type DateKey = string;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string) {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string" || !DATE_KEY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return parts as unknown as ZonedParts;
}

/** Offset (milliseconds) of the time zone from UTC at the given instant. */
export function timeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  const wallClockAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return wallClockAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Calendar date (YYYY-MM-DD) of an instant in the given time zone. */
export function toDateKey(date: Date, timeZone: string): DateKey {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/**
 * UTC instant for a wall-clock time on a date in the given time zone. A time inside a spring-forward gap resolves one hour earlier
 * (New York 2026-03-08 02:30 is 01:30 EST); an ambiguous autumn time resolves to its first (daylight) occurrence.
 */
export function zonedTimeToUtc(key: DateKey, timeZone: string, hour = 0, minute = 0, second = 0): Date {
  const [year, month, day] = key.split("-").map(Number) as [number, number, number];
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = timeZoneOffsetMilliseconds(new Date(guess), timeZone);
  let instant = guess - offset;
  // Re-evaluate once in case the guess straddled a DST transition.
  const offsetAtInstant = timeZoneOffsetMilliseconds(new Date(instant), timeZone);
  if (offsetAtInstant !== offset) instant = guess - offsetAtInstant;
  return new Date(instant);
}

/** Start-of-day instant for a date key in the given time zone. */
export function startOfDayUtc(key: DateKey, timeZone: string): Date {
  return zonedTimeToUtc(key, timeZone);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday-based start of week. */
export function startOfWeek(key: DateKey): DateKey {
  const date = new Date(`${key}T00:00:00.000Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return addDays(key, -daysSinceMonday);
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

/** Calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Every date key from `from` to `to`, both included; empty when `from` is after `to`. */
export function eachDay(from: DateKey, to: DateKey): DateKey[] {
  const days: DateKey[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

/**
 * Parses an <input type="datetime-local"> value ("2026-10-01T09:30") as a wall-clock time in the given time zone.
 * Returns null when malformed.
 */
export function parseZonedDateTime(value: string, timeZone: string): Date | null {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match || !isDateKey(match[1])) return null;
  const [hour, minute, second] = [Number(match[2]), Number(match[3]), Number(match[4] ?? 0)];
  if (hour > 23 || minute > 59 || second > 59) return null;
  return zonedTimeToUtc(match[1], timeZone, hour, minute, second);
}

/** Formats an instant as a datetime-local input value in the given time zone. */
export function toZonedInputValue(date: Date | string, timeZone: string): string {
  const instant = typeof date === "string" ? new Date(date) : date;
  const parts = zonedParts(instant, timeZone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

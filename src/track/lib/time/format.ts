/**
 * Display formatting of durations, times and names (ported from the old app's lib/time/format.ts; display only, so it stays in the
 * frontend: the API returns raw seconds and ISO instants). Checked against tests/fixtures/time-engine.json.
 */
import type { DateKey } from "./business-calendar";
import { displayLocale, displayText } from "./display-language";

const NO_VALUE = "—";

/** 02:37:14 — used for live timers. Hours may exceed 24. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

/** 7h 48m 05s · 3m 09s · 42s — used for totals in tables and cards (second precision); the unit letters follow the display language. */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) return NO_VALUE;
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  if (hours === 0 && minutes === 0) return displayText("{seconds}s", { seconds });
  if (hours === 0) return displayText("{minutes}m {seconds}s", { minutes, seconds: remainingSeconds });
  return displayText("{hours}h {minutes}m {seconds}s", { hours, minutes: String(minutes).padStart(2, "0"), seconds: remainingSeconds });
}

/** Decimal hours (e.g. 8.50) for reports and exports. */
export function toDecimalHours(totalSeconds: number): string {
  return (totalSeconds / 3600).toFixed(2);
}

const toDate = (value: Date | string) => (typeof value === "string" ? new Date(value) : value);

/** 09:05 AM · 07:30 PM — the 12-hour clock with AM/PM in capitals, in every display language (digits as the language writes them). */
export function formatTime(value: Date | string | null | undefined, timeZone: string): string {
  if (!value) return NO_VALUE;
  const date = toDate(value);
  const hourOfDay = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(date));
  return new Intl.DateTimeFormat(displayLocale(), { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h12" })
    .formatToParts(date)
    .map((part) => (part.type === "dayPeriod" ? (hourOfDay < 12 ? "AM" : "PM") : part.type === "literal" ? part.value.replace(/\s/g, " ") : part.value))
    .join("");
}

/** 07:30 PM for a time of day written "19:30" (a shift's start or end, already in the business time zone). */
export function formatTimeOfDay(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const hoursOnClock = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(hoursOnClock).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

const dateKeyIn = (value: Date | string, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(toDate(value));

/**
 * 06:30 AM when `value` falls on the same calendar day (in `timeZone`) as `reference`, else with its date: "25 Oct, 06:30 AM". Used for an
 * end after midnight of a night shift (reference = the start) and for a start or last break that is not today (reference = now).
 */
export function formatTimeOnDay(value: Date | string | null | undefined, timeZone: string, reference: Date | string): string {
  if (!value) return NO_VALUE;
  if (dateKeyIn(value, timeZone) === dateKeyIn(reference, timeZone)) return formatTime(value, timeZone);
  const day = new Intl.DateTimeFormat(displayLocale(), { timeZone, day: "numeric", month: "short" }).format(toDate(value));
  return `${day}, ${formatTime(value, timeZone)}`;
}

/** 1 Oct 2026, 09:05 AM in the given time zone (month names in the display language). */
export function formatDateTime(value: Date | string | null | undefined, timeZone: string): string {
  if (!value) return NO_VALUE;
  const day = new Intl.DateTimeFormat(displayLocale(), { timeZone, day: "numeric", month: "short", year: "numeric" }).format(toDate(value));
  return `${day}, ${formatTime(value, timeZone)}`;
}

/** Wed, 1 Oct 2026 — for a calendar date key (time-zone free); weekday and month names in the display language. */
export function formatDateKey(key: DateKey, options: { weekday?: boolean; year?: boolean } = {}): string {
  const { weekday = true, year = true } = options;
  return new Intl.DateTimeFormat(displayLocale(), {
    timeZone: "UTC",
    weekday: weekday ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: year ? "numeric" : undefined,
  }).format(new Date(`${key}T00:00:00Z`));
}

/** Mon — the short weekday name of a calendar date key, in the display language. */
export function formatWeekdayShort(key: DateKey): string {
  return new Intl.DateTimeFormat(displayLocale(), { timeZone: "UTC", weekday: "short" }).format(new Date(`${key}T00:00:00Z`));
}

interface PersonName {
  firstName: string;
  lastName: string;
}

export function fullName(person: PersonName): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function initials(person: PersonName): string {
  return `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase();
}

/**
 * Display formatting of durations, times and names (ported from the old app's lib/time/format.ts; display only, so it stays in the
 * frontend: the API returns raw seconds and ISO instants). Checked against tests/fixtures/time-engine.json.
 */
import type { DateKey } from "./business-calendar";

const NO_VALUE = "—";

/** 02:37:14 — used for live timers. Hours may exceed 24. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

/** 7h 48m 05s · 3m 09s · 42s — used for totals in tables and cards (second precision). */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) return NO_VALUE;
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  if (hours === 0 && minutes === 0) return `${seconds}s`;
  if (hours === 0) return `${minutes}m ${remainingSeconds}s`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${remainingSeconds}s`;
}

/** Decimal hours (e.g. 8.50) for reports and exports. */
export function toDecimalHours(totalSeconds: number): string {
  return (totalSeconds / 3600).toFixed(2);
}

const toDate = (value: Date | string) => (typeof value === "string" ? new Date(value) : value);

/** 09:05 in the given time zone. */
export function formatTime(value: Date | string | null | undefined, timeZone: string): string {
  if (!value) return NO_VALUE;
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(toDate(value));
}

/** 1 Oct 2026, 09:05 in the given time zone. */
export function formatDateTime(value: Date | string | null | undefined, timeZone: string): string {
  if (!value) return NO_VALUE;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(toDate(value));
}

/** Wed, 1 Oct 2026 — for a calendar date key (time-zone free). */
export function formatDateKey(key: DateKey, options: { weekday?: boolean; year?: boolean } = {}): string {
  const { weekday = true, year = true } = options;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: weekday ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: year ? "numeric" : undefined,
  }).format(new Date(`${key}T00:00:00Z`));
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

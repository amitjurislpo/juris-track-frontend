/**
 * The audit log's filters, kept in the URL under the API's own query parameter names (`GET /audit-logs`, backend API.md
 * "Audit log"), so a filtered log can be bookmarked and the values go to the API unchanged.
 */
import { addDays, isDateKey, toDateKey, type DateKey } from "@/track/lib/time/business-calendar";
import { listPath, toQueryString } from "@/track/lib/list-query";

/** The filters of `GET /audit-logs` besides the list parameters (`search`, `sort`, `sortDirection`, `page`, `pageSize`). */
const BUSINESS_FILTERS = ["from", "to", "actorId", "subjectId", "action", "category", "entityType", "entityId", "outcome", "source"] as const;

/** The super admin may also filter by business: an id, or `none` for the platform events outside any business. */
export const NO_BUSINESS = "none";

/** The filter names a viewer may use (the owner's `businessId` would be ignored by the API, so it is never sent). */
export function auditFilterNames(isPlatform: boolean): string[] {
  return isPlatform ? [...BUSINESS_FILTERS, "businessId"] : [...BUSINESS_FILTERS];
}

/** The API path of one page of the log for the URL's filters, sorting and paging. */
export function auditListPath(path: string, searchParams: Record<string, string>, isPlatform: boolean): string {
  return listPath(path, searchParams, auditFilterNames(isPlatform));
}

/**
 * The API path of the CSV export of the same filter and sort (`format=csv`): paging is left out because the export holds every
 * row of the filter (at most `MAXIMUM_EXPORT_ROWS`).
 */
export function auditExportPath(path: string, searchParams: Record<string, string>, isPlatform: boolean): string {
  const names = ["search", "sort", "sortDirection", ...auditFilterNames(isPlatform)];
  return `${path}${toQueryString({ ...Object.fromEntries(names.map((name) => [name, searchParams[name]])), format: "csv" })}`;
}

/** The most rows one export may hold (the API answers 422 `EXPORT_TOO_LARGE` beyond). */
export const MAXIMUM_EXPORT_ROWS = 10_000;

/** Whether the export of a filter with `total` entries would be refused for its size. */
export const isExportTooLarge = (total: number) => total > MAXIMUM_EXPORT_ROWS;

// ---- dates ---------------------------------------------------------------------------------------------------------

export const DATE_PRESETS = ["all", "today", "last7Days", "last30Days", "custom"] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

/** Translation keys of the date presets. */
export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  all: "All time",
  today: "Today",
  last7Days: "Last 7 days",
  last30Days: "Last 30 days",
  custom: "Custom",
};

/**
 * The time zone the API reads `from` / `to` in: the business time zone for the owner, UTC for the super admin (who has no
 * business). "Today" of the presets is the date in that zone.
 */
export function filterTimeZone(user: { businessTimeZone: string | null }): string {
  return user.businessTimeZone ?? "UTC";
}

/** Today's date key in the filter time zone. */
export const todayIn = (timeZone: string, now: Date = new Date()): DateKey => toDateKey(now, timeZone);

/** The `from` / `to` of a preset (inclusive dates; the last 7 days are today and the six days before). */
export function presetDates(preset: Exclude<DatePreset, "custom">, today: DateKey): { from: string | null; to: string | null } {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "last7Days":
      return { from: addDays(today, -6), to: today };
    case "last30Days":
      return { from: addDays(today, -29), to: today };
    default:
      return { from: null, to: null };
  }
}

/** Which preset the URL's `from` / `to` amount to (anything else is a custom range). */
export function selectedDatePreset(searchParams: Record<string, string>, today: DateKey): DatePreset {
  const from = searchParams.from ?? "";
  const to = searchParams.to ?? "";
  if (!from && !to) return "all";
  for (const preset of ["today", "last7Days", "last30Days"] as const) {
    const dates = presetDates(preset, today);
    if (dates.from === from && dates.to === to) return preset;
  }
  return "custom";
}

/** The URL changes of a custom range; an empty or malformed end is left open. */
export function customRangeChanges(from: string, to: string): Record<string, string | null> {
  return { from: isDateKey(from) ? from : null, to: isDateKey(to) ? to : null };
}

// ---- the active-filters bar -----------------------------------------------------------------------------------------

/** One active filter as the bar shows it: `key` names it (`date` stands for `from` and `to`), `clears` are the URL parameters its × removes. */
export interface ActiveFilter {
  key: string;
  clears: string[];
}

/** The filters in effect, in the order of the toolbar; the date range is one entry. */
export function activeFilters(searchParams: Record<string, string>, isPlatform: boolean): ActiveFilter[] {
  const active: ActiveFilter[] = [];
  if (searchParams.from || searchParams.to) active.push({ key: "date", clears: ["from", "to"] });
  for (const name of ["search", ...auditFilterNames(isPlatform)]) {
    if (name === "from" || name === "to") continue;
    if (searchParams[name]) active.push({ key: name, clears: [name] });
  }
  return active;
}

/** The URL changes that remove every filter (and the search); the sort stays. */
export function clearAllChanges(isPlatform: boolean): Record<string, string | null> {
  return Object.fromEntries(["search", ...auditFilterNames(isPlatform)].map((name) => [name, null]));
}

// ---- request ids ----------------------------------------------------------------------------------------------------

/** A request id as the API keeps it (`X-Request-Id`: 1 to 64 letters, digits, `.`, `_`, `:`, `-`). */
export const isRequestId = (value: string | null | undefined): value is string => !!value && /^[A-Za-z0-9._:-]{1,64}$/.test(value);

/**
 * The URL changes that show every entry of one request: the API has no request id filter, but `search` also matches request ids
 * (a part of the id matches; a whole UUID only matches itself), so every other filter is cleared and the id becomes the search.
 * Null for something that is no request id.
 */
export function requestIdFilterChanges(requestId: string, isPlatform: boolean): Record<string, string | null> | null {
  if (!isRequestId(requestId)) return null;
  return { ...clearAllChanges(isPlatform), search: requestId };
}

/** The first characters of a long id for a narrow column (`3f2a9c1e…`); the full id stays in the title and the detail panel. */
export function shortId(value: string | null | undefined, length = 8): string {
  if (!value) return "—";
  return value.length > length + 2 ? `${value.slice(0, length)}…` : value;
}

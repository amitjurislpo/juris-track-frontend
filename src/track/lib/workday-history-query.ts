/**
 * "My history" keeps its date range, sorting and paging in the URL under the API's own parameter names (`range`, `from`, `to`,
 * `sort`, `sortDirection`, `page`, `pageSize`; API.md, `GET /workdays/mine`), so a range can be bookmarked and the values go to
 * the API unchanged.
 */
import { isDateKey } from "./time/business-calendar";
import { RANGE_PRESETS, type RangePreset } from "./time/date-ranges";
import { formatDateKey } from "./time/format";
import { listPath } from "./list-query";

/** "Thu, 1 Oct 2026 – Sat, 31 Oct 2026" (or one date) of a history range the API resolved. */
export function historyRangeText(range: { from: string; to: string }): string {
  return range.from === range.to ? formatDateKey(range.from) : `${formatDateKey(range.from)} – ${formatDateKey(range.to)}`;
}

/** The API's default range when `range` is left out. */
const DEFAULT_HISTORY_RANGE: RangePreset = "month";
/** The API's default sort of the history (newest first). */
export const DEFAULT_HISTORY_SORT = "date";
export const DEFAULT_HISTORY_SORT_DIRECTION = "desc";

const isRangePreset = (value: string | undefined): value is RangePreset => (RANGE_PRESETS as readonly string[]).includes(value ?? "");

/** The range preset the URL asks for (the API's default when it names none or an unknown one). */
export function selectedRange(searchParams: Record<string, string>): RangePreset {
  return isRangePreset(searchParams.range) ? searchParams.range : DEFAULT_HISTORY_RANGE;
}

/**
 * The API path of the history the URL shows. `from` / `to` are sent only with the custom range (the API ignores them otherwise)
 * and only when they are dates; an unknown range is left out (the API would answer 400), so the default applies. `basePath` is
 * the signed-in user's history (`/workdays/mine`) or one person's of the Team tab (`/team/members/{employeeId}/workdays`), which
 * take the same parameters.
 */
export function workdayHistoryPath(searchParams: Record<string, string>, basePath = "/workdays/mine"): string {
  const range = selectedRange(searchParams);
  const isCustom = range === "custom";
  const rangeParameters: Record<string, string> = {
    range: range === DEFAULT_HISTORY_RANGE ? "" : range,
    from: isCustom && isDateKey(searchParams.from) ? searchParams.from : "",
    to: isCustom && isDateKey(searchParams.to) ? searchParams.to : "",
  };
  return listPath(basePath, { ...searchParams, ...rangeParameters }, ["range", "from", "to"]);
}

/**
 * The URL changes for choosing a range: the default preset removes `range`; `from` / `to` are kept only for the custom range.
 * (The list query resets `page` on any change but a page change.)
 */
export function rangeSearchChanges(range: RangePreset, from?: string, to?: string): Record<string, string | null> {
  if (range !== "custom") return { range: range === DEFAULT_HISTORY_RANGE ? null : range, from: null, to: null };
  return { range, from: from && isDateKey(from) ? from : null, to: to && isDateKey(to) ? to : null };
}

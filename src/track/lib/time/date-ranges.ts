/**
 * Date ranges of the history and report screens (ported from the old app's lib/time/ranges.ts; the backend has the same rules in
 * DateRanges.java, both checked against tests/fixtures/time-engine.json). The labels are English text = translation keys.
 */
import { addDays, isDateKey, startOfMonth, startOfWeek, type DateKey } from "./business-calendar";

export const RANGE_PRESETS = ["today", "yesterday", "week", "month", "custom"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const RANGE_LABELS: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This week",
  month: "This month",
  custom: "Custom range",
};

export interface DateRange {
  preset: RangePreset;
  from: DateKey;
  to: DateKey;
}

/** Maximum span of a single query in days, to keep reports bounded. */
export const MAX_RANGE_DAYS = 366;

type SearchParameter = string | string[] | undefined;
const firstValue = (parameter: SearchParameter) => (Array.isArray(parameter) ? parameter[0] : parameter);

/**
 * Resolves a date range from URL search parameters relative to "today" in the business time zone. Invalid input falls back to
 * the default preset; a custom range gets its ends swapped when reversed and is cut to MAX_RANGE_DAYS at the start.
 */
export function resolveRange(
  parameters: { range?: SearchParameter; from?: SearchParameter; to?: SearchParameter },
  today: DateKey,
  fallback: RangePreset = "today",
): DateRange {
  const requested = firstValue(parameters.range);
  const preset: RangePreset = (RANGE_PRESETS as readonly string[]).includes(requested ?? "") ? (requested as RangePreset) : fallback;

  switch (preset) {
    case "today":
      return { preset, from: today, to: today };
    case "yesterday": {
      const yesterday = addDays(today, -1);
      return { preset, from: yesterday, to: yesterday };
    }
    case "week":
      return { preset, from: startOfWeek(today), to: today };
    case "month":
      return { preset, from: startOfMonth(today), to: today };
    case "custom": {
      let from = firstValue(parameters.from);
      let to = firstValue(parameters.to);
      if (!isDateKey(from)) from = startOfWeek(today);
      if (!isDateKey(to)) to = today;
      if (from > to) [from, to] = [to, from];
      const earliestFrom = addDays(to, -(MAX_RANGE_DAYS - 1));
      if (from < earliestFrom) from = earliestFrom;
      return { preset, from, to };
    }
  }
}

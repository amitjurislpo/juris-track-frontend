import { todayIn } from "../lib/audit/audit-query";
import type { DateKey } from "../lib/time/business-calendar";
import { useTimeState } from "./useTimeState";

/**
 * Today's date as the server counts it (the current shift occurrence of `GET /me/time`), for the preset chips and filters; for a
 * night shift it can differ from the browser's calendar date. Until the state is read, and for a user without time tracking
 * (`isEnabled` false), it is the browser clock's date in `fallbackTimeZone`.
 */
export function useServerToday(fallbackTimeZone: string, isEnabled = true): DateKey {
  const { data: reading } = useTimeState({ isEnabled });
  return reading?.state.today ?? todayIn(fallbackTimeZone);
}

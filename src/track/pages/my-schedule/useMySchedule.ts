import type { ListPage, ScheduleDay, ScheduleRow } from "@/track/api-types";
import { addDays, type DateKey } from "@/track/lib/time/business-calendar";
import { useData } from "@/track/usePage";

/** How many days ahead the personal schedule shows. */
export const SCHEDULE_DAYS_AHEAD = 14;

/**
 * The signed-in user's own days from `today` for the next two weeks (`GET /me/schedule`). The answer has the shape of a roster row
 * (the API may also wrap it as a page with one row); an empty list until it is read.
 */
export function useMySchedule(today: DateKey): ScheduleDay[] {
  const data = useData<ScheduleRow | ListPage<ScheduleRow>>(`/me/schedule?from=${today}&to=${addDays(today, SCHEDULE_DAYS_AHEAD - 1)}`);
  if (!data) return [];
  const row = "days" in data ? data : data.rows[0];
  return row?.days ?? [];
}

import { apiAction } from "@/track/api";
import type { ScheduleEntryInput } from "@/track/lib/roster";

// The roster (API.md, "Schedule"). Paths are relative to the TrackContext's API base path.

const entriesPath = (employeeId: string) => `/employees/${encodeURIComponent(employeeId)}/schedule-entries`;

/** Gives one date a shift, or a week off with `shiftId` null (`PUT /employees/{employeeId}/schedule-entries/{date}`). */
export function setScheduleEntry(employeeId: string, date: string, entry: { shiftId: string | null; reason?: string }) {
  return apiAction("PUT", `${entriesPath(employeeId)}/${encodeURIComponent(date)}`, entry);
}

/** Clears the entry of a date, so the date follows the person's shift again (`DELETE /employees/{employeeId}/schedule-entries/{date}`). */
export function removeScheduleEntry(employeeId: string, date: string) {
  return apiAction("DELETE", `${entriesPath(employeeId)}/${encodeURIComponent(date)}`);
}

/** Sets up to 62 dates in one call (`PUT /employees/{employeeId}/schedule-entries`). */
export function setScheduleEntries(employeeId: string, body: { entries: ScheduleEntryInput[] }) {
  return apiAction("PUT", entriesPath(employeeId), body);
}

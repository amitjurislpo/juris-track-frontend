import { apiAction } from "@/track/api";
import type { CloseWorkdayBody, IntervalCorrectionBody } from "@/track/lib/time-correction";
import type { WorkdaySnapshot } from "@/track/lib/time/types";

const workdayPath = (workdayId: string) => `/workdays/${encodeURIComponent(workdayId)}`;

/** Corrects a work interval of somebody in the caller's scope (manager or owner; never one's own). */
export function correctWorkSession(workdayId: string, sessionId: string, body: IntervalCorrectionBody) {
  return apiAction<WorkdaySnapshot>("PATCH", `${workdayPath(workdayId)}/work-sessions/${encodeURIComponent(sessionId)}`, body);
}

/** Corrects a break interval of somebody in the caller's scope (manager or owner; never one's own). */
export function correctBreakSession(workdayId: string, sessionId: string, body: IntervalCorrectionBody) {
  return apiAction<WorkdaySnapshot>("PATCH", `${workdayPath(workdayId)}/break-sessions/${encodeURIComponent(sessionId)}`, body);
}

/** Ends an open (typically forgotten) workday of somebody in the caller's scope. */
export function closeWorkday(workdayId: string, body: CloseWorkdayBody) {
  return apiAction<WorkdaySnapshot>("PUT", `${workdayPath(workdayId)}/status`, body);
}

import { apiAction } from "@/track/api";
import type { Shift } from "@/track/api-types";

// The shifts of the owner's business (API.md, "Shifts"). Paths are relative to the TrackContext's API base path.

const shiftPath = (shiftId: string) => `/shifts/${encodeURIComponent(shiftId)}`;

/** Adds a shift (`POST /shifts`); `data.id` is the new shift's id. */
export function createShift(body: Record<string, string | number>) {
  return apiAction<{ id: string }>("POST", "/shifts", body);
}

/** Changes a shift (`PATCH /shifts/{shiftId}`): only the sent fields change. */
export function updateShift(shiftId: string, changes: Record<string, unknown>) {
  return apiAction<Shift>("PATCH", shiftPath(shiftId), changes);
}

/** Activates or deactivates a shift (`PUT /shifts/{shiftId}/status`); 422 SHIFT_IN_USE / DEFAULT_SHIFT_REQUIRED when it cannot be deactivated. */
export function setShiftStatus(shiftId: string, status: { isActive: boolean }) {
  return apiAction<Shift>("PUT", `${shiftPath(shiftId)}/status`, status);
}

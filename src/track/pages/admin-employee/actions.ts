import { apiAction } from "@/track/api";
import type { Employee } from "@/track/api-types";

// One employee of the owner's business (API.md, "Employees"). Paths are relative to the TrackContext's API base path.

const employeePath = (employeeId: string) => `/employees/${encodeURIComponent(employeeId)}`;

/** Changes an employee (`PATCH /employees/{employeeId}`): only the sent fields change; null clears the code or the manager. */
export function updateEmployee(employeeId: string, changes: Record<string, unknown>) {
  return apiAction<Employee>("PATCH", employeePath(employeeId), changes);
}

/**
 * Switches an employee's sign-in off or on (`PUT /employees/{employeeId}/login-access`), with an optional reason for the audit log.
 * Not Deactivate: the person stays in the business, the list and the reports.
 */
export function setEmployeeLoginAccess(employeeId: string, loginAccess: { isEnabled: boolean; reason?: string }) {
  return apiAction<Employee>("PUT", `${employeePath(employeeId)}/login-access`, loginAccess);
}

/** Deactivates or reactivates an employee (`PUT /employees/{employeeId}/status`), with an optional reason for the audit log. */
export function setEmployeeStatus(employeeId: string, status: { isActive: boolean; reason?: string }) {
  return apiAction<Employee>("PUT", `${employeePath(employeeId)}/status`, status);
}

/**
 * Gives an employee a shift (`PUT /employees/{employeeId}/shift`) from `effectiveFrom` (a "yyyy-MM-dd" date, today or later; without it
 * from now). Days already recorded keep the shift they were counted against. 422 SHIFT_EFFECTIVE_DATE_IN_PAST for a past date.
 */
export function setEmployeeShift(employeeId: string, shift: { shiftId: string; effectiveFrom?: string }) {
  return apiAction<Employee>("PUT", `${employeePath(employeeId)}/shift`, shift);
}

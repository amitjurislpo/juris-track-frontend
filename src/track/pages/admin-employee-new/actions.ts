import { apiAction } from "@/track/api";

// Adding an employee (API.md, "Employees"). Paths are relative to the TrackContext's API base path.

/** Adds an employee to the owner's business (`POST /employees`); `data.id` is the new employee's id. */
export function createEmployee(body: Record<string, string>) {
  return apiAction<{ id: string }>("POST", "/employees", body);
}

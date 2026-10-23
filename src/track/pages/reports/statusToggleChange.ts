import { selectedStatuses, toggleStatusChange, type ReportStatus } from "@/track/lib/report-query";

/** The statuses of the browser's current URL: while a change is still being applied the rendered ones lag behind (as in useListQuery). */
function currentStatuses(): ReportStatus[] {
  return selectedStatuses(Object.fromEntries(new URLSearchParams(window.location.search).entries()));
}

/** The URL change for switching one status on or off; two quick clicks must not undo each other. */
export function statusToggleChange(status: ReportStatus): Record<string, string | null> {
  return toggleStatusChange(currentStatuses(), status);
}

/** The URL change for removing one status (nothing changes when it is already gone). */
export function statusRemovalChange(status: ReportStatus): Record<string, string | null> {
  const statuses = currentStatuses();
  return statuses.includes(status) ? toggleStatusChange(statuses, status) : {};
}

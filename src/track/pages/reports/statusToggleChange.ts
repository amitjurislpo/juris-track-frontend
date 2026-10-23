import { selectedStatuses, toggleStatusChange, type ReportStatus } from "@/track/lib/report-query";

/** The statuses of the address bar's current query string (`readCurrentSearch` of the TrackContext): while a change is still being applied the rendered ones lag behind (as in useListQuery). */
function currentStatuses(currentSearch: string): ReportStatus[] {
  return selectedStatuses(Object.fromEntries(new URLSearchParams(currentSearch).entries()));
}

/** The URL change for switching one status on or off; two quick clicks must not undo each other. */
export function statusToggleChange(status: ReportStatus, currentSearch: string): Record<string, string | null> {
  return toggleStatusChange(currentStatuses(currentSearch), status);
}

/** The URL change for removing one status (nothing changes when it is already gone). */
export function statusRemovalChange(status: ReportStatus, currentSearch: string): Record<string, string | null> {
  const statuses = currentStatuses(currentSearch);
  return statuses.includes(status) ? toggleStatusChange(statuses, status) : {};
}

import { auditExportPath, auditListPath } from "@/track/lib/audit/audit-query";
import { toQueryString } from "@/track/lib/list-query";

// The audit log is append-only: these are its read endpoints (paths relative to the API base path, exactly as in the backend's
// API.md). There are no writes; nobody edits or deletes an entry.

/** `GET /audit-logs` with the URL's filters, sorting and paging. */
export const auditLogsPath = (searchParams: Record<string, string>, isPlatform: boolean) => auditListPath("/audit-logs", searchParams, isPlatform);

/** `GET /audit-logs?format=csv`: the CSV export of the same filter (opened as a plain link so the session cookie goes along). */
export const auditLogExportPath = (searchParams: Record<string, string>, isPlatform: boolean) => auditExportPath("/audit-logs", searchParams, isPlatform);

/** `GET /audit-logs/{auditLogId}`: one entry in full. */
export const auditLogPath = (auditLogId: string) => `/audit-logs/${encodeURIComponent(auditLogId)}`;

/** How many people or businesses a picker offers at once. */
const PICKER_PAGE_SIZE = 20;

/** `GET /employees`: the owner's people matching a name (active and inactive), for the actor and subject pickers. */
export const employeeSearchPath = (search: string) =>
  `/employees${toQueryString({ search: search.trim(), status: "all", sort: "name", pageSize: PICKER_PAGE_SIZE })}`;

/** `GET /businesses`: the businesses matching a name (super admin), for the business filter. */
export const businessSearchPath = (search: string) =>
  `/businesses${toQueryString({ search: search.trim(), sort: "name", pageSize: PICKER_PAGE_SIZE })}`;

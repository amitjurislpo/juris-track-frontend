/**
 * The reports pages keep their filters, view, sorting and paging in the URL under the API's own parameter names (backend
 * references/API-reports.md: `range`, `from`, `to`, `scope`, `employeeId`, `managerId`, `status`, `search`, `groupBy`, `sort`,
 * `sortDirection`, `page`, `pageSize`), so a report can be bookmarked and the values go to the API unchanged. `groupBy` in the URL
 * also picks the view: none = the workdays, `employee` / `manager` / `date` = the summaries grouped that way.
 */
import type { ReportSummaryRow } from "../api-types";
import type { Role } from "../roles";
import { isDateKey } from "./time/business-calendar";
import { RANGE_PRESETS, resolveRange, type DateRange, type RangePreset } from "./time/date-ranges";
import { formatDateKey } from "./time/format";
import { toQueryString, type SortDirection } from "./list-query";

/** The API's default range of the reports when `range` is left out. */
export const DEFAULT_REPORT_RANGE: RangePreset = "week";

export const REPORT_VIEWS = ["workdays", "employee", "manager", "date"] as const;
export type ReportView = (typeof REPORT_VIEWS)[number];
export type SummaryGroup = Exclude<ReportView, "workdays">;
export const REPORT_VIEW_LABELS: Record<ReportView, string> = {
  workdays: "Workdays",
  employee: "By employee",
  manager: "By manager",
  date: "By day",
};

/** The `status` filter values (one or more, comma-separated): NOT_ENDED = an open day left open longer than the business allows. */
export const REPORT_STATUSES = ["WORKING", "ON_BREAK", "DAY_ENDED", "NOT_ENDED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  WORKING: "Working",
  ON_BREAK: "On break",
  DAY_ENDED: "Day ended",
  NOT_ENDED: "Not ended",
};

export type ReportScope = "direct" | "indirect" | "all";

/** The scopes each role can choose, the default (the API's when `scope` is left out) first. */
const SCOPES_BY_ROLE: Partial<Record<Role, readonly ReportScope[]>> = {
  MANAGER: ["direct", "indirect"],
  ADMIN: ["all", "direct", "indirect"],
};

export const SCOPE_LABELS: Record<"MANAGER" | "ADMIN", Record<ReportScope, string>> = {
  MANAGER: { direct: "Direct reports", indirect: "Include indirect reports", all: "Everybody" },
  ADMIN: { all: "Everybody", direct: "My direct reports", indirect: "My direct and indirect reports" },
};

/** The sort keys of each view (the API answers 400 to any other). */
const SORT_KEYS: Record<ReportView, readonly string[]> = {
  workdays: ["date", "employee", "startedAt", "productiveSeconds", "breakSeconds", "spanSeconds", "breakCount"],
  employee: ["label", "workdays", "employees", "productiveSeconds", "breakSeconds", "spanSeconds", "breakCount", "averageProductiveSeconds"],
  manager: ["label", "workdays", "employees", "productiveSeconds", "breakSeconds", "spanSeconds", "breakCount", "averageProductiveSeconds"],
  date: ["label", "workdays", "employees", "productiveSeconds", "breakSeconds", "spanSeconds", "breakCount", "averageProductiveSeconds"],
};

/** The API's default sorting of each view: workdays newest first, groups by label (dates newest first). */
export function defaultSortOf(view: ReportView): { sort: string; direction: SortDirection } {
  if (view === "workdays") return { sort: "date", direction: "desc" };
  return { sort: "label", direction: view === "date" ? "desc" : "asc" };
}

/** Every URL parameter a report filter uses (for "Clear all"). */
const REPORT_FILTER_NAMES = ["range", "from", "to", "scope", "employeeId", "managerId", "status", "search"] as const;

const isRangePreset = (value: string | undefined): value is RangePreset => (RANGE_PRESETS as readonly string[]).includes(value ?? "");
const isReportStatus = (value: string): value is ReportStatus => (REPORT_STATUSES as readonly string[]).includes(value);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: string | undefined): value is string => UUID_PATTERN.test(value ?? "");

/** The scopes the role can choose (the default first); empty for a role without reports. */
export function scopeChoices(role: Role): readonly ReportScope[] {
  return SCOPES_BY_ROLE[role] ?? [];
}

/** The view the URL asks for (`groupBy`; the workdays without one or with an unknown one). */
export function selectedView(searchParams: Record<string, string>): ReportView {
  const groupBy = searchParams.groupBy;
  return (REPORT_VIEWS as readonly string[]).includes(groupBy ?? "") && groupBy !== "workdays" ? (groupBy as ReportView) : "workdays";
}

/** The range preset the URL asks for (the API's default when it names none or an unknown one). */
export function selectedReportRange(searchParams: Record<string, string>): RangePreset {
  return isRangePreset(searchParams.range) ? searchParams.range : DEFAULT_REPORT_RANGE;
}

/** The range the API will resolve for the URL (same rules as the backend), from today in the business time zone. */
export function resolvedReportRange(searchParams: Record<string, string>, today: string): DateRange {
  return resolveRange({ ...searchParams, range: selectedReportRange(searchParams) }, today, DEFAULT_REPORT_RANGE);
}

/** The scope the URL asks for, when the role can choose it (else the role's default). */
export function selectedScope(searchParams: Record<string, string>, role: Role): ReportScope | undefined {
  const choices = scopeChoices(role);
  const requested = (searchParams.scope ?? "").toLowerCase();
  return choices.find((scope) => scope === requested) ?? choices[0];
}

/** The statuses of the URL's `status` (known ones, any case, each once, in the fixed order). */
export function selectedStatuses(searchParams: Record<string, string>): ReportStatus[] {
  const requested = new Set((searchParams.status ?? "").split(",").map((status) => status.trim().toUpperCase()).filter(isReportStatus));
  return REPORT_STATUSES.filter((status) => requested.has(status));
}

/** The URL change for switching one status on or off (none left removes the parameter). */
export function toggleStatusChange(current: readonly ReportStatus[], status: ReportStatus): Record<string, string | null> {
  const next = current.includes(status) ? current.filter((selected) => selected !== status) : [...current, status];
  const ordered = REPORT_STATUSES.filter((known) => next.includes(known));
  return { status: ordered.length ? ordered.join(",") : null };
}

/**
 * The filters both endpoints share, as the API wants them: the default range and scope are left out, `from` / `to` only with a
 * custom range and only when they are dates, ids only when they look like ids, an unknown scope left out (the role's default
 * applies; the API answers 403 to `scope=all` from a manager, which the URL may still ask for and the page explains).
 */
function sharedFilters(searchParams: Record<string, string>): Record<string, string | undefined> {
  const range = selectedReportRange(searchParams);
  const isCustom = range === "custom";
  const statuses = selectedStatuses(searchParams);
  const scope = (searchParams.scope ?? "").toLowerCase();
  return {
    range: range === DEFAULT_REPORT_RANGE ? undefined : range,
    from: isCustom && isDateKey(searchParams.from) ? searchParams.from : undefined,
    to: isCustom && isDateKey(searchParams.to) ? searchParams.to : undefined,
    scope: ["direct", "indirect", "all"].includes(scope) ? scope : undefined,
    employeeId: isUuid(searchParams.employeeId) ? searchParams.employeeId : undefined,
    managerId: isUuid(searchParams.managerId) ? searchParams.managerId : undefined,
    status: statuses.length ? statuses.join(",") : undefined,
    search: searchParams.search?.trim() || undefined,
  };
}

/** Sorting and paging of the URL, kept only when the view knows the sort key (a key of another view is dropped). */
function listParameters(searchParams: Record<string, string>, view: ReportView): Record<string, string | undefined> {
  const sortDirection = searchParams.sortDirection === "asc" || searchParams.sortDirection === "desc" ? searchParams.sortDirection : undefined;
  return {
    sort: SORT_KEYS[view].includes(searchParams.sort ?? "") ? searchParams.sort : undefined,
    sortDirection,
    page: /^\d+$/.test(searchParams.page ?? "") && Number(searchParams.page) > 1 ? searchParams.page : undefined,
    pageSize: /^\d+$/.test(searchParams.pageSize ?? "") ? searchParams.pageSize : undefined,
  };
}

/** `GET /reports/workdays` for the URL (one page of workdays). */
export function workdayReportPath(searchParams: Record<string, string>): string {
  return `/reports/workdays${toQueryString({ ...sharedFilters(searchParams), ...listParameters(searchParams, "workdays") })}`;
}

/** `GET /reports/summaries` for the URL, grouped by `groupBy`. */
export function summaryReportPath(searchParams: Record<string, string>, groupBy: SummaryGroup): string {
  return `/reports/summaries${toQueryString({ groupBy, ...sharedFilters(searchParams), ...listParameters(searchParams, groupBy) })}`;
}

/** The API path of the view the URL shows. */
export function reportPath(searchParams: Record<string, string>): string {
  const view = selectedView(searchParams);
  return view === "workdays" ? workdayReportPath(searchParams) : summaryReportPath(searchParams, view);
}

/**
 * The CSV of the URL's workday report (`GET /reports/workdays` with `Accept: text/csv`): the same filters and order, every row
 * (no paging), times in `timeZone` (the chosen display time zone).
 */
export function workdayExportPath(searchParams: Record<string, string>, timeZone: string): string {
  const { sort, sortDirection } = listParameters(searchParams, "workdays");
  return `/reports/workdays${toQueryString({ ...sharedFilters(searchParams), sort, sortDirection, timeZone })}`;
}

/** The file name the API gives the CSV, used when its answer has no readable one. */
export function exportFallbackFileName(from: string, to: string): string {
  return `juristrack-${from}-to-${to}.csv`;
}

/** How many people the employee picker lists at once. */
const PICKER_PAGE_SIZE = 20;

/**
 * The employee picker's list: the people in the report's range and scope (and manager filter) whose name, email or code matches
 * `search`, one group each (`GET /reports/summaries?groupBy=employee`), by name. Status, search and employee filters of the page
 * are left out, so the picker can switch to anybody of the range.
 */
export function employeePickerPath(searchParams: Record<string, string>, search: string): string {
  const { range, from, to, scope, managerId } = sharedFilters(searchParams);
  return `/reports/summaries${toQueryString({ groupBy: "employee", range, from, to, scope, managerId, search: search.trim() || undefined, sort: "label", pageSize: PICKER_PAGE_SIZE })}`;
}

/** The name of one chosen employee: their group in the range (`employeeId` filter). */
export function employeeNamePath(searchParams: Record<string, string>, employeeId: string): string {
  const { range, from, to, scope } = sharedFilters(searchParams);
  return `/reports/summaries${toQueryString({ groupBy: "employee", range, from, to, scope, employeeId, pageSize: 1 })}`;
}

/** The URL changes for switching the view: sorting and paging of the old view mean nothing in the new one. */
export function viewSearchChanges(view: ReportView): Record<string, string | null> {
  return { groupBy: view === "workdays" ? null : view, sort: null, sortDirection: null, page: null };
}

/** The URL changes of "Clear all": every filter goes, the view stays. */
export function clearFiltersChanges(): Record<string, string | null> {
  return Object.fromEntries(REPORT_FILTER_NAMES.map((name) => [name, null]));
}

/** Whether the URL has any filter besides the defaults (range "week", the role's scope). */
export function hasActiveFilters(searchParams: Record<string, string>, role: Role): boolean {
  const filters = sharedFilters(searchParams);
  const scope = selectedScope(searchParams, role);
  return Boolean(filters.range || filters.employeeId || filters.managerId || filters.status || filters.search || (filters.scope && scope !== scopeChoices(role)[0]));
}

/** "No manager" (a translation key): the label of the summaries' group of workdays without a manager. */
const NO_MANAGER_LABEL = "No manager";

/**
 * The text of a summary group's first cell: the name, the date written out (By day), or "No manager" (translated) for the
 * workdays without a manager. A missing name (a person since deleted) shows "—".
 */
export function summaryRowLabel(row: Pick<ReportSummaryRow, "key" | "label">, groupBy: SummaryGroup, t: (text: string) => string): string {
  if (groupBy === "manager" && (row.key === "none" || row.label === null)) return t(NO_MANAGER_LABEL);
  if (groupBy === "date") return isDateKey(row.label ?? row.key) ? formatDateKey(row.label ?? row.key) : (row.label ?? "—");
  return row.label ?? "—";
}

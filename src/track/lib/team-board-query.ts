/**
 * The live board of the Team tab (`GET /team/members`; references/API-team-and-corrections.md) keeps its scope, status filter,
 * search, sorting and paging in the URL under the API's own parameter names (`scope`, `status`, `search`, `sort`,
 * `sortDirection`, `page`, `pageSize`), so a board can be bookmarked and the values go to the API unchanged.
 */
import type { Role } from "../roles";
import { listPath } from "./list-query";
import type { LiveStatus } from "./time/types";

/** Whose people the board shows: the caller's direct reports, also their reports' reports, or (the owner only) everybody. */
export type TeamScope = "direct" | "indirect" | "all";

/** The scopes each role may ask for, the default first (the API answers 400 to any other). */
const SCOPES_OF_ROLE: Partial<Record<Role, readonly TeamScope[]>> = {
  MANAGER: ["direct", "indirect"],
  ADMIN: ["all", "direct", "indirect"],
};

/** The scopes `role` may choose from, the default first (none for a role without a Team tab). */
export function scopesOf(role: Role): readonly TeamScope[] {
  return SCOPES_OF_ROLE[role] ?? [];
}

/** The API's default scope of a role: `direct` for a manager, `all` for the owner. */
export function defaultScopeOf(role: Role): TeamScope {
  return scopesOf(role)[0] ?? "direct";
}

/** The scope the URL asks for, when `role` may use it; else the role's default. Any case is accepted, as by the API. */
export function selectedScope(role: Role, scopeInUrl: string | undefined): TeamScope {
  const scope = (scopeInUrl ?? "").toLowerCase();
  return (scopesOf(role) as readonly string[]).includes(scope) ? (scope as TeamScope) : defaultScopeOf(role);
}

/** The URL change for choosing a scope: the role's default removes `scope`. */
export function scopeSearchChange(role: Role, scope: TeamScope): Record<string, string | null> {
  return { scope: scope === defaultScopeOf(role) ? null : scope };
}

/** The status filter's values; `all` (the default) is left out of the URL. */
export const TEAM_STATUS_FILTERS: readonly (LiveStatus | "all")[] = ["all", "WORKING", "ON_BREAK", "NOT_STARTED", "DAY_ENDED"];

/** The board's sort keys (the API answers 400 to any other). */
export const TEAM_SORT_KEYS = ["name", "status", "productiveSeconds", "lastActivity"] as const;
export const DEFAULT_TEAM_SORT = "name";

const isStatusFilter = (value: string): boolean => (TEAM_STATUS_FILTERS as readonly string[]).includes(value);
const isSortKey = (value: string): boolean => (TEAM_SORT_KEYS as readonly string[]).includes(value);

/**
 * The API path of the board the URL shows for `role`. Values the API would refuse (an unknown scope, status or sort key, a
 * scope the role may not use) are left out, so the API's defaults apply instead of a 400.
 */
export function teamBoardPath(role: Role, searchParams: Record<string, string>): string {
  const scope = selectedScope(role, searchParams.scope);
  const status = (searchParams.status ?? "").toUpperCase();
  const sort = searchParams.sort ?? "";
  return listPath("/team/members", {
    ...searchParams,
    scope: scope === defaultScopeOf(role) ? "" : scope,
    status: status !== "ALL" && isStatusFilter(status) ? status : "",
    sort: isSortKey(sort) ? sort : "",
  }, ["scope", "status"]);
}

/** The page of one person of the board: the manager's Team tab, or the owner's Time Tracking. */
export function memberPagePath(role: Role, employeeId: string): string {
  return role === "ADMIN" ? `/admin/time-tracking/${encodeURIComponent(employeeId)}` : `/team/employees/${encodeURIComponent(employeeId)}`;
}

/** The board a member page goes back to. */
export function boardPagePath(role: Role): string {
  return role === "ADMIN" ? "/admin/time-tracking" : "/team";
}

/**
 * List pages keep their search, filters, sorting and paging in the URL, with the API's own query parameter names
 * (`search`, `status`, `role`, `managerId`, `sort`, `sortDirection`, `page`, `pageSize`), so the URL's values go to the API unchanged.
 */

export type SortDirection = "asc" | "desc";

/** The query parameters every list endpoint takes (API.md, "Lists"). */
const LIST_PARAMETERS = ["search", "sort", "sortDirection", "page", "pageSize"] as const;

/** `?name=value&…` of the parameters that have a value (null, undefined and "" are left out), or "" when none has. */
export function toQueryString(parameters: Record<string, string | number | null | undefined>): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(parameters)) {
    if (value === null || value === undefined || value === "") continue;
    query.set(name, String(value));
  }
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

/**
 * The API path of one list page: `path` plus the URL's list parameters and the endpoint's own filters. Other URL parameters
 * are not sent (the API answers 400 to a parameter value it does not know, never to an unknown name, but they mean nothing to it).
 */
export function listPath(path: string, searchParams: Record<string, string>, filterNames: readonly string[]): string {
  const names = [...LIST_PARAMETERS, ...filterNames];
  return `${path}${toQueryString(Object.fromEntries(names.map((name) => [name, searchParams[name]])))}`;
}

/** Clicking a column header: the sorted column flips its direction, any other column starts ascending. */
export function nextSortDirection(currentSort: string, currentDirection: SortDirection, columnKey: string): SortDirection {
  if (currentSort !== columnKey) return "asc";
  return currentDirection === "asc" ? "desc" : "asc";
}

/** What a pager shows: rows `from`–`to` of `total` (1-based), and the number of the last page. */
export function pageRange(page: number, pageSize: number, total: number): { from: number; to: number; lastPage: number } {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return { from: 0, to: 0, lastPage };
  return { from: (page - 1) * pageSize + 1, to: Math.min(total, page * pageSize), lastPage };
}

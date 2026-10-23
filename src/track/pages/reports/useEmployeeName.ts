import { useQuery } from "@tanstack/react-query";
import { apiData } from "@/track/api";
import type { SummaryReport } from "@/track/api-types";
import { employeeNamePath } from "@/track/lib/report-query";

/** Names of the people chosen in the employee picker during this visit (a name does not change while the page is open). */
const knownEmployeeNames = new Map<string, string>();

/** Remembers the name of a person chosen in the picker, so the filter shows it without asking the API. */
export function rememberEmployeeName(employeeId: string, name: string) {
  knownEmployeeNames.set(employeeId, name);
}

/**
 * The name of the employee the URL filters by (`employeeId`): remembered from the picker, or else (a bookmark, a reload) the label
 * of their group in the range (`GET /reports/summaries?groupBy=employee&employeeId=…`). null without a filter; undefined while
 * unknown (loading, or nobody with workdays in the range).
 */
export function useEmployeeName(searchParams: Record<string, string>): string | null | undefined {
  const employeeId = searchParams.employeeId || null;
  const knownName = employeeId ? knownEmployeeNames.get(employeeId) : undefined;
  const namePath = employeeId ? employeeNamePath(searchParams, employeeId) : null;
  const nameQuery = useQuery({
    queryKey: ["track", namePath],
    queryFn: () => apiData<SummaryReport>(namePath ?? ""),
    enabled: Boolean(employeeId && !knownName),
    retry: false,
  });
  if (!employeeId) return null;
  return knownName ?? nameQuery.data?.rows[0]?.label ?? undefined;
}

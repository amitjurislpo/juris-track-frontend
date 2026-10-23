import { useQuery } from "@tanstack/react-query";
import { apiData } from "@/track/api";
import type { Employee, ListPage } from "@/track/api-types";
import { toQueryString } from "@/track/lib/list-query";
import { fullName } from "@/track/lib/time/format";

/** The most the API gives in one page; a business with more managers than this offers the first 100 by name. */
const MANAGER_PAGE_SIZE = 100;
const MANAGERS_PATH = `/employees${toQueryString({ role: "MANAGER,ADMIN", status: "all", sort: "name", pageSize: MANAGER_PAGE_SIZE })}`;

export interface ReportManager {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * The owner's choice of managers for the report's manager filter: every MANAGER and ADMIN of the business, deactivated ones too
 * (their past workdays stay in the reports), by name (`GET /employees`, an owner-only endpoint: `isEnabled` only for the owner).
 * Not suspending, so the filters never wait for it.
 */
export function useReportManagers(isEnabled: boolean): ReportManager[] {
  const managersQuery = useQuery({
    queryKey: ["track", MANAGERS_PATH],
    queryFn: () => apiData<ListPage<Employee>>(MANAGERS_PATH),
    enabled: isEnabled,
  });
  return (managersQuery.data?.rows ?? []).map((manager) => ({ id: manager.id, name: fullName(manager), isActive: manager.isActive }));
}

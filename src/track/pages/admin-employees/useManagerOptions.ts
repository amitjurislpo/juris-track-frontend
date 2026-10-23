import type { Employee, ListPage } from "@/track/api-types";
import { toQueryString } from "@/track/lib/list-query";
import { fullName } from "@/track/lib/time/format";
import { useData } from "@/track/usePage";

/** The most the API gives in one page; a business with more managers than this shows the first 100 by name. */
const MANAGER_PAGE_SIZE = 100;

export interface ManagerOption {
  id: string;
  name: string;
}

/** The people who can be a manager: the business's active MANAGER and ADMIN users, by name (`GET /employees?role=MANAGER,ADMIN&status=active`). */
export function useManagerOptions(): ManagerOption[] {
  const data = useData<ListPage<Employee>>(`/employees${toQueryString({ role: "MANAGER,ADMIN", status: "active", sort: "name", pageSize: MANAGER_PAGE_SIZE })}`);
  return (data?.rows ?? []).map((manager) => ({ id: manager.id, name: fullName(manager) }));
}

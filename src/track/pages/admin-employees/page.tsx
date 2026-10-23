import { TrackLink } from "@/track/components/TrackLink";
import type { Employee, ListPage } from "@/track/api-types";
import { EmptyState } from "@/track/components/EmptyState";
import { Icon } from "@/track/components/Icon";
import { Pagination } from "@/track/components/list/Pagination";
import { SearchBox } from "@/track/components/list/SearchBox";
import { SegmentedFilter } from "@/track/components/list/SegmentedFilter";
import { SelectFilter } from "@/track/components/list/SelectFilter";
import { SortableHeader } from "@/track/components/list/SortableHeader";
import { useListQuery } from "@/track/components/list/useListQuery";
import { PageHeader } from "@/track/components/PageHeader";
import { StatusChip } from "@/track/components/StatusChip";
import { PageLoading } from "@/track/PageLoading";
import { listPath } from "@/track/lib/list-query";
import { formatDateTime, fullName } from "@/track/lib/time/format";
import { viewerTimeZone } from "@/track/lib/viewer-time-zone";
import { ROLE_LABELS } from "@/track/roles";
import { useTrack } from "@/track/TrackContext";
import { useData, usePage } from "@/track/usePage";
import { useManagerOptions } from "./useManagerOptions";

/** The filters of `GET /employees` besides the list parameters. */
const FILTERS = ["status", "role", "managerId"];

/** The owner's people: search, status / role / manager filters, sortable columns and pages; a row opens the employee. */
export default function EmployeesPage() {
  const { user, t, searchParams } = usePage();
  const { navigate } = useTrack();
  const { update } = useListQuery();
  const data = useData<ListPage<Employee>>(listPath("/employees", searchParams, FILTERS));
  const managers = useManagerOptions();
  if (!data) return <PageLoading />;
  const timeZone = viewerTimeZone(user);
  const hasFilters = FILTERS.some((name) => searchParams[name]) || Boolean(searchParams.search);
  const openEmployee = (employeeId: string) => navigate(`/admin/employees/${employeeId}`);

  return (
    <div className="col">
      <PageHeader eyebrow={t("Administration")} title={t("Employees")} sub={t("Everyone in your business, their role and who they report to.")}>
        <TrackLink className="btn btn-gold btn-lg" to="/admin/employees/new"><Icon name="plus" size={16} />{t("Add employee")}</TrackLink>
      </PageHeader>
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <SearchBox placeholder={t("Search name, email or code")} label={t("Search employees")} />
        <SegmentedFilter name="status" label={t("Status")} defaultValue="active"
          options={[{ value: "active", label: t("Active") }, { value: "inactive", label: t("Inactive") }, { value: "all", label: t("All") }]} />
        <SelectFilter name="role" label={t("Role")} defaultValue=""
          options={[{ value: "", label: t("All") }, ...(["EMPLOYEE", "MANAGER", "ADMIN"] as const).map((role) => ({ value: role, label: t(ROLE_LABELS[role]) }))]} />
        <SelectFilter name="managerId" label={t("Manager")} defaultValue=""
          options={[{ value: "", label: t("Anyone") }, ...managers.map((manager) => ({ value: manager.id, label: manager.name }))]} />
        <span className="tcount">{t("{total} found", { total: data.total })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 2, padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <SortableHeader sortKey="name" defaultSort="name">{t("Name")}</SortableHeader>
                <SortableHeader sortKey="employeeCode" defaultSort="name" className="hide-sm">{t("Code")}</SortableHeader>
                <SortableHeader sortKey="email" defaultSort="name" className="hide-sm">{t("Email")}</SortableHeader>
                <SortableHeader sortKey="role" defaultSort="name">{t("Role")}</SortableHeader>
                <th className="hide-sm">{t("Manager")}</th>
                <SortableHeader sortKey="status" defaultSort="name">{t("Status")}</SortableHeader>
                <SortableHeader sortKey="lastLoginAt" defaultSort="name" className="hide-sm">{t("Last sign-in")}</SortableHeader>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((employee) => (
                <tr key={employee.id} tabIndex={0} style={{ cursor: "pointer" }} className={employee.isActive ? undefined : "dim"}
                  onClick={() => openEmployee(employee.id)} onKeyDown={(e) => { if (e.key === "Enter") openEmployee(employee.id); }}>
                  <td>
                    <div className="person"><div>
                      <b><TrackLink to={`/admin/employees/${employee.id}`} style={{ color: "inherit", textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>{fullName(employee)}</TrackLink></b>
                      <small className="show-sm">{employee.email}</small>
                    </div></div>
                  </td>
                  <td className="muted num hide-sm">{employee.employeeCode ?? "—"}</td>
                  <td className="muted hide-sm">{employee.email}</td>
                  <td>{t(ROLE_LABELS[employee.role])}</td>
                  <td className="muted hide-sm">{employee.managerName ?? "—"}</td>
                  <td>
                    <StatusChip isGood={employee.isActive} label={employee.isActive ? t("Active") : t("Inactive")} />
                    {!employee.isLoginEnabled && <> <span className="chip warn">{t("Login off")}</span></>}
                  </td>
                  <td className="muted hide-sm">{employee.lastLoginAt ? formatDateTime(employee.lastLoginAt, timeZone) : t("Never")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.rows.length && (
          <EmptyState title={t("No one matches")} text={hasFilters ? t("Try a different search or filter.") : undefined}>
            {hasFilters && <button type="button" className="btn btn-sm" onClick={() => update({ search: null, status: null, role: null, managerId: null })}>{t("Clear filters")}</button>}
          </EmptyState>
        )}
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </section>
    </div>
  );
}

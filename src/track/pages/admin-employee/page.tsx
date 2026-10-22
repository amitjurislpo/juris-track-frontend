import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Employee } from "@/track/api-types";
import { PageHeader } from "@/track/components/PageHeader";
import { StatusChip } from "@/track/components/StatusChip";
import { PageLoading } from "@/track/PageLoading";
import { formatDateTime, fullName } from "@/track/lib/time/format";
import { viewerTimeZone } from "@/track/lib/viewer-time-zone";
import { ROLE_LABELS } from "@/track/roles";
import { useData, usePage } from "@/track/usePage";
import { useManagerOptions } from "../admin-employees/useManagerOptions";
import { EmployeeEditForm } from "./EmployeeEditForm";
import { EmployeeStatusButton } from "./EmployeeStatusButton";

const KeyValue = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="kv"><span className="muted">{label}</span><b>{children}</b></div>
);

/** One employee for the owner: edit their details and reporting manager, deactivate or reactivate them. */
export default function EmployeePage() {
  const { user, t, params } = usePage();
  const employee = useData<Employee>(`/employees/${encodeURIComponent(params.id)}`);
  const managers = useManagerOptions();
  if (!employee) return <PageLoading />;
  const timeZone = viewerTimeZone(user);
  const isSelf = employee.id === user.id;
  // the form starts again from the saved record whenever the API answers with a changed one
  const formKey = [employee.employeeCode, employee.firstName, employee.lastName, employee.email, employee.role, employee.managerId].join("|");

  return (
    <div className="col">
      <PageHeader back="/admin/employees" eyebrow={`${t(ROLE_LABELS[employee.role])}${employee.employeeCode ? ` · ${employee.employeeCode}` : ""}`} title={fullName(employee)}
        sub={<StatusChip isGood={employee.isActive} label={employee.isActive ? t("Active") : t("Inactive")} />}>
        {!isSelf && <EmployeeStatusButton employee={employee} />}
      </PageHeader>
      <div className="split enter" style={{ ["--i" as string]: 1 }}>
        <EmployeeEditForm key={formKey} employee={employee} managers={managers} />
        <section className="card" style={{ padding: 20 }} aria-labelledby="account-heading">
          <div className="card-h"><h3 id="account-heading">{t("Account")}</h3></div>
          <KeyValue label={t("Reporting manager")}>{employee.managerName ?? t("No manager")}</KeyValue>
          <KeyValue label={t("Active reports")}>
            {employee.activeReportCount > 0
              ? <Link to={`/admin/employees?managerId=${employee.id}`}>{employee.activeReportCount}</Link>
              : 0}
          </KeyValue>
          <KeyValue label={t("Last sign-in")}>{employee.lastLoginAt ? formatDateTime(employee.lastLoginAt, timeZone) : t("Never")}</KeyValue>
          <KeyValue label={t("Added")}>{formatDateTime(employee.createdAt, timeZone)}</KeyValue>
        </section>
      </div>
    </div>
  );
}

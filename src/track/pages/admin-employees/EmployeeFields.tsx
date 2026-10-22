import { FormField } from "@/track/components/FormField";
import type { EmployeeForm } from "@/track/lib/employee-form";
import { ROLE_LABELS } from "@/track/roles";
import { useTrack } from "@/track/TrackContext";
import type { ManagerOption } from "./useManagerOptions";

/**
 * The fields of an employee (add and edit): code, names, email, role and reporting manager. The manager list holds the
 * business's active managers and owners, never the employee themself; a current manager who is no longer in it (deactivated,
 * or now an employee) stays selectable under their name so the form shows the truth.
 */
export function EmployeeFields({ form, onChange, errors, managers, employeeId, currentManagerName }: {
  form: EmployeeForm;
  onChange: (form: EmployeeForm) => void;
  errors: Record<string, string>;
  managers: ManagerOption[];
  /** The employee being edited (absent when adding). */
  employeeId?: string;
  currentManagerName?: string | null;
}) {
  const { t } = useTrack();
  const change = (fieldName: keyof EmployeeForm, value: string) => onChange({ ...form, [fieldName]: value });
  const managerChoices = managers.filter((manager) => manager.id !== employeeId);
  if (form.managerId && !managerChoices.some((manager) => manager.id === form.managerId)) {
    managerChoices.push({ id: form.managerId, name: currentManagerName ?? t("Current manager") });
  }
  const isOwner = form.role === "ADMIN";
  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="grid2">
        <FormField label={t("First name")} error={errors.firstName}>
          <input value={form.firstName} onChange={(e) => change("firstName", e.target.value)} maxLength={60} autoFocus />
        </FormField>
        <FormField label={t("Last name")} error={errors.lastName}>
          <input value={form.lastName} onChange={(e) => change("lastName", e.target.value)} maxLength={60} />
        </FormField>
      </div>
      <div className="grid2">
        <FormField label={t("Email")} hint={t("signs in with it")} error={errors.email}>
          <input type="email" value={form.email} onChange={(e) => change("email", e.target.value)} maxLength={200} autoComplete="off" />
        </FormField>
        <FormField label={t("Employee code")} hint={t("optional")} error={errors.employeeCode}>
          <input value={form.employeeCode} onChange={(e) => change("employeeCode", e.target.value)} maxLength={32} />
        </FormField>
      </div>
      <div className="grid2">
        <FormField label={t("Role")} hint={isOwner ? t("the owner's role cannot be changed") : undefined} error={errors.role}>
          <select value={form.role} onChange={(e) => change("role", e.target.value)} disabled={isOwner}>
            {isOwner && <option value="ADMIN">{t(ROLE_LABELS.ADMIN)}</option>}
            <option value="EMPLOYEE">{t(ROLE_LABELS.EMPLOYEE)}</option>
            <option value="MANAGER">{t(ROLE_LABELS.MANAGER)}</option>
          </select>
        </FormField>
        <FormField label={t("Reporting manager")} error={errors.managerId}>
          <select value={form.managerId} onChange={(e) => change("managerId", e.target.value)}>
            <option value="">{t("No manager")}</option>
            {managerChoices.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
          </select>
        </FormField>
      </div>
    </div>
  );
}

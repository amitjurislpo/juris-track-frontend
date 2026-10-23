import type { Role } from "../roles";
import { changedFields } from "./patch";

/** An employee as the add / edit form holds them; `managerId` "" means "no manager". */
export interface EmployeeForm {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Exclude<Role, "SUPER_ADMIN">;
  managerId: string;
}

export const EMPTY_EMPLOYEE_FORM: EmployeeForm = { employeeCode: "", firstName: "", lastName: "", email: "", role: "EMPLOYEE", managerId: "" };

/** The form fields, which are also the API's field names (field errors and problem codes land on them). */
export const EMPLOYEE_FORM_FIELDS: readonly string[] = ["employeeCode", "firstName", "lastName", "email", "role", "managerId"];

export function toEmployeeForm(employee: { employeeCode: string | null; firstName: string; lastName: string; email: string; role: EmployeeForm["role"]; managerId: string | null }): EmployeeForm {
  return {
    employeeCode: employee.employeeCode ?? "",
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    role: employee.role,
    managerId: employee.managerId ?? "",
  };
}

/** The `POST /employees` body: trimmed text; an empty code or manager is left out. */
export function newEmployeeBody(form: EmployeeForm): Record<string, string> {
  const body: Record<string, string> = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), role: form.role };
  if (form.employeeCode.trim()) body.employeeCode = form.employeeCode.trim();
  if (form.managerId) body.managerId = form.managerId;
  return body;
}

/** The `PATCH /employees/{employeeId}` body: only the changed fields; an emptied code or a removed manager is sent as null (clears it). */
export function employeeChanges(original: EmployeeForm, edited: EmployeeForm): Record<string, unknown> {
  return changedFields({ ...original }, { ...edited }, ["employeeCode", "managerId"]);
}

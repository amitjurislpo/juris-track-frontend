import { useState } from "react";
import type { Employee } from "@/track/api-types";
import { EMPLOYEE_FORM_FIELDS, employeeChanges, toEmployeeForm } from "@/track/lib/employee-form";
import { formErrorsOf, type FormErrors } from "@/track/lib/problems";
import { useTrack } from "@/track/TrackContext";
import { EmployeeFields } from "../admin-employees/EmployeeFields";
import type { ManagerOption } from "../admin-employees/useManagerOptions";
import { updateEmployee } from "./actions";

const NO_ERRORS: FormErrors = { fields: {}, general: null };

/** Edits an employee; Save sends only the changed fields (a removed manager or an emptied code as null). */
export function EmployeeEditForm({ employee, managers }: { employee: Employee; managers: ManagerOption[] }) {
  const { t, toast } = useTrack();
  const original = toEmployeeForm(employee);
  const [form, setForm] = useState(original);
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [isSaving, setIsSaving] = useState(false);
  const changes = employeeChanges(original, form);
  const hasChanges = Object.keys(changes).length > 0;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;
    setIsSaving(true);
    const result = await updateEmployee(employee.id, changes);
    setIsSaving(false);
    if (!result.ok) { setErrors(formErrorsOf(result, EMPLOYEE_FORM_FIELDS, t)); return; }
    toast(result.message ?? t("Employee saved."));
  };

  return (
    <form className="card" style={{ padding: 20 }} onSubmit={save} noValidate aria-labelledby="edit-employee-heading">
      <div className="card-h"><h3 id="edit-employee-heading">{t("Details")}</h3></div>
      <EmployeeFields form={form} onChange={(updatedForm) => { setForm(updatedForm); setErrors(NO_ERRORS); }} errors={errors.fields}
        managers={managers} employeeId={employee.id} currentManagerName={employee.managerName} />
      {errors.general && <div className="err" role="alert" style={{ marginTop: 12 }}>{errors.general}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
        <button type="button" className="btn btn-ghost" disabled={!hasChanges} onClick={() => { setForm(original); setErrors(NO_ERRORS); }}>{t("Undo changes")}</button>
        <button type="submit" className="btn btn-gold" disabled={!hasChanges || isSaving}>{isSaving ? t("Saving…") : t("Save changes")}</button>
      </div>
    </form>
  );
}

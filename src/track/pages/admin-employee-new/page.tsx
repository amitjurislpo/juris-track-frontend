import { useState } from "react";
import { FormField } from "@/track/components/FormField";
import { PageHeader } from "@/track/components/PageHeader";
import { EMPLOYEE_FORM_FIELDS, EMPTY_EMPLOYEE_FORM, newEmployeeBody } from "@/track/lib/employee-form";
import { formErrorsOf, problemMessage, type FormErrors } from "@/track/lib/problems";
import { formatShiftWindow } from "@/track/lib/time/shift";
import { useTrack } from "@/track/TrackContext";
import { usePage } from "@/track/usePage";
import { setEmployeeShift } from "../admin-employee/actions";
import { useShifts } from "../admin-shifts/useShifts";
import { EmployeeFields } from "../admin-employees/EmployeeFields";
import { useManagerOptions } from "../admin-employees/useManagerOptions";
import { createEmployee } from "./actions";

const NO_ERRORS: FormErrors = { fields: {}, general: null };

/** The owner adds an employee: they are active at once and sign in with an emailed code. */
export default function NewEmployeePage() {
  const { t, searchParams } = usePage();
  const { toast, navigate } = useTrack();
  const managers = useManagerOptions();
  const shifts = useShifts({ isActive: true });
  // "?managerId=" pre-selects the manager (e.g. "Add a report" from a manager's page)
  const [form, setForm] = useState(() => ({ ...EMPTY_EMPLOYEE_FORM, managerId: searchParams.managerId ?? "" }));
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [isSaving, setIsSaving] = useState(false);
  // the select starts on the business default shift until the owner picks another
  const defaultShift = shifts.find((shift) => shift.isDefault);
  const [pickedShiftId, setPickedShiftId] = useState("");
  const shiftId = pickedShiftId || defaultShift?.id || "";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await createEmployee(newEmployeeBody(form));
    setIsSaving(false);
    if (!result.ok) { setErrors(formErrorsOf(result, EMPLOYEE_FORM_FIELDS, t)); return; }
    toast(result.message ?? t("Employee added."));
    // the create endpoint takes no shift: a shift other than the default is set right after, with its own call
    if (result.data && shiftId && shiftId !== defaultShift?.id) {
      const shiftResult = await setEmployeeShift(result.data.id, { shiftId });
      if (!shiftResult.ok) toast(t("The employee was added, but the shift could not be set: {reason}", { reason: problemMessage(shiftResult, t) }));
    }
    navigate("/admin/employees");
  };

  return (
    <div className="col">
      <PageHeader back="/admin/employees" eyebrow={t("Employees")} title={t("New employee")} sub={t("They can sign in with an emailed code as soon as they are added.")} />
      <form className="card enter" style={{ ["--i" as string]: 1, padding: 20 }} onSubmit={save} noValidate>
        <EmployeeFields form={form} onChange={(updatedForm) => { setForm(updatedForm); setErrors(NO_ERRORS); }} errors={errors.fields} managers={managers} />
        <div style={{ marginTop: 14 }}>
          <FormField label={t("Shift")} hint={t("The default shift is pre-selected; pick another to change it")}>
            <select value={shiftId} onChange={(e) => setPickedShiftId(e.target.value)}>
              {shifts.map((shift) => <option key={shift.id} value={shift.id}>{`${shift.name} · ${formatShiftWindow(shift)}`}</option>)}
            </select>
          </FormField>
        </div>
        {errors.general && <div className="err" role="alert" style={{ marginTop: 12 }}>{errors.general}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/admin/employees")}>{t("Cancel")}</button>
          <button type="submit" className="btn btn-gold" disabled={isSaving}>{isSaving ? t("Adding…") : t("Add employee")}</button>
        </div>
      </form>
    </div>
  );
}

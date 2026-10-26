import { useMemo, useState } from "react";
import { FormField } from "@/track/components/FormField";
import { Icon } from "@/track/components/Icon";
import { Modal } from "@/track/components/Modal";
import { formErrorsOf, type FormErrors } from "@/track/lib/problems";
import { timeZoneOptions, zoneOptionLabel } from "@/track/lib/time/zone-names";
import { useTrack } from "@/track/TrackContext";
import { createBusiness } from "./actions";

const DEFAULT_TIME_ZONE = "Asia/Kolkata";
const FORM_FIELDS = ["name", "timeZone", "owner.firstName", "owner.lastName", "owner.email", "owner.employeeCode"];
/** On this form the owner's email and code are the fields the conflicts belong to. */
const FIELD_OF_CODE = { EMAIL_IN_USE: "owner.email", EMPLOYEE_CODE_IN_USE: "owner.employeeCode" };

const EMPTY_FORM = { name: "", timeZone: DEFAULT_TIME_ZONE, firstName: "", lastName: "", email: "", employeeCode: "" };
const NO_ERRORS: FormErrors = { fields: {}, general: null };

/** "New business": creates a business and its owner, who then signs in with an emailed code. */
export function NewBusinessButton() {
  const { t, toast, navigate } = useTrack();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [isSaving, setIsSaving] = useState(false);
  const zones = useMemo(() => timeZoneOptions([DEFAULT_TIME_ZONE]), []);

  const close = () => { setIsOpen(false); setForm(EMPTY_FORM); setErrors(NO_ERRORS); };
  const change = (fieldName: keyof typeof EMPTY_FORM, value: string) => setForm((current) => ({ ...current, [fieldName]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await createBusiness({
      name: form.name.trim(),
      timeZone: form.timeZone,
      owner: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), ...(form.employeeCode.trim() ? { employeeCode: form.employeeCode.trim() } : {}) },
    });
    setIsSaving(false);
    if (!result.ok) { setErrors(formErrorsOf(result, FORM_FIELDS, t, FIELD_OF_CODE)); return; }
    toast(result.message ?? t("Business created."));
    close();
    if (result.data) navigate(`/platform/businesses/${result.data.id}`);
  };

  return (
    <>
      <button type="button" className="btn btn-gold btn-lg" onClick={() => setIsOpen(true)}><Icon name="plus" size={16} />{t("New business")}</button>
      {isOpen && (
        <Modal title={t("New business")} eyebrow={t("Platform")} onClose={close}
          footer={<>
            <button type="button" className="btn btn-ghost" onClick={close}>{t("Cancel")}</button>
            <button type="submit" form="new-business-form" className="btn btn-gold" disabled={isSaving}>{isSaving ? t("Creating…") : t("Create business")}</button>
          </>}>
          <form id="new-business-form" className="col" style={{ gap: 14 }} onSubmit={save} noValidate>
            <div className="grid2">
              <FormField label={t("Business name")} error={errors.fields.name}>
                <input value={form.name} onChange={(e) => change("name", e.target.value)} maxLength={80} autoFocus />
              </FormField>
              <FormField label={t("Time zone")} error={errors.fields.timeZone}>
                <select value={form.timeZone} onChange={(e) => change("timeZone", e.target.value)}>
                  {zones.map((zone) => <option key={zone} value={zone}>{zoneOptionLabel(zone)}</option>)}
                </select>
              </FormField>
            </div>
            <h4 style={{ margin: "6px 0 0" }}>{t("Owner")} <span className="hint muted">{t("runs the business and signs in with an emailed code")}</span></h4>
            <div className="grid2">
              <FormField label={t("First name")} error={errors.fields["owner.firstName"]}>
                <input value={form.firstName} onChange={(e) => change("firstName", e.target.value)} maxLength={60} />
              </FormField>
              <FormField label={t("Last name")} error={errors.fields["owner.lastName"]}>
                <input value={form.lastName} onChange={(e) => change("lastName", e.target.value)} maxLength={60} />
              </FormField>
            </div>
            <div className="grid2">
              <FormField label={t("Email")} error={errors.fields["owner.email"]}>
                <input type="email" value={form.email} onChange={(e) => change("email", e.target.value)} maxLength={200} autoComplete="off" />
              </FormField>
              <FormField label={t("Employee code")} hint={t("optional")} error={errors.fields["owner.employeeCode"]}>
                <input value={form.employeeCode} onChange={(e) => change("employeeCode", e.target.value)} maxLength={32} />
              </FormField>
            </div>
            {errors.general && <div className="err" role="alert">{errors.general}</div>}
          </form>
        </Modal>
      )}
    </>
  );
}

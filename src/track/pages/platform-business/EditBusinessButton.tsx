import { useState } from "react";
import type { BusinessDetail } from "@/track/api-types";
import { BusinessSettingsFields } from "@/track/components/BusinessSettingsFields";
import { Icon } from "@/track/components/Icon";
import { Modal } from "@/track/components/Modal";
import { businessSettingsChanges, toBusinessSettingsForm } from "@/track/lib/business-settings";
import { formErrorsOf, type FormErrors } from "@/track/lib/problems";
import { useTrack } from "@/track/TrackContext";
import { updateBusiness } from "./actions";

const FORM_FIELDS = ["name", "timeZone", "staleWorkdayHours", "displayTimeZones"];
const NO_ERRORS: FormErrors = { fields: {}, general: null };

/** "Edit settings" on a business's page: name, time zone, stale workday hours and display time zones (only changes are sent). */
export function EditBusinessButton({ business }: { business: BusinessDetail }) {
  const { t, toast } = useTrack();
  const [isOpen, setIsOpen] = useState(false);
  const original = toBusinessSettingsForm(business);
  const [form, setForm] = useState(original);
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [isSaving, setIsSaving] = useState(false);

  const open = () => { setForm(toBusinessSettingsForm(business)); setErrors(NO_ERRORS); setIsOpen(true); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { changes, fieldErrors } = businessSettingsChanges(original, form, business.minimumStaleWorkdayHours);
    if (Object.keys(fieldErrors).length) {
      setErrors({ fields: Object.fromEntries(Object.entries(fieldErrors).map(([field, message]) => [field, t(message, { minimum: business.minimumStaleWorkdayHours })])), general: null });
      return;
    }
    if (!Object.keys(changes).length) { setIsOpen(false); return; }
    setIsSaving(true);
    const result = await updateBusiness(business.id, changes);
    setIsSaving(false);
    if (!result.ok) { setErrors(formErrorsOf(result, FORM_FIELDS, t)); return; }
    toast(result.message ?? t("Business saved."));
    setIsOpen(false);
  };

  return (
    <>
      <button type="button" className="btn" onClick={open}><Icon name="edit" size={14} />{t("Edit settings")}</button>
      {isOpen && (
        <Modal title={t("Business settings")} eyebrow={business.name} onClose={() => setIsOpen(false)}
          footer={<>
            <button type="button" className="btn btn-ghost" onClick={() => setIsOpen(false)}>{t("Cancel")}</button>
            <button type="submit" form="business-settings-form" className="btn btn-gold" disabled={isSaving}>{isSaving ? t("Saving…") : t("Save")}</button>
          </>}>
          <form id="business-settings-form" onSubmit={save} noValidate>
            <BusinessSettingsFields form={form} onChange={(updatedForm) => { setForm(updatedForm); setErrors(NO_ERRORS); }} errors={errors.fields} minimumStaleWorkdayHours={business.minimumStaleWorkdayHours} />
            {errors.general && <div className="err" role="alert" style={{ marginTop: 12 }}>{errors.general}</div>}
          </form>
        </Modal>
      )}
    </>
  );
}

import { useState } from "react";
import type { BusinessSettings } from "@/track/api-types";
import { BusinessSettingsFields } from "@/track/components/BusinessSettingsFields";
import { businessSettingsChanges, toBusinessSettingsForm } from "@/track/lib/business-settings";
import { formErrorsOf, type FormErrors } from "@/track/lib/problems";
import { useTrack } from "@/track/TrackContext";
import { updateBusinessSettings } from "./actions";

const FORM_FIELDS = ["name", "timeZone", "staleWorkdayHours", "displayTimeZones"];
const NO_ERRORS: FormErrors = { fields: {}, general: null };

/** The owner's settings form; Save sends only the changed fields. */
export function BusinessSettingsForm({ settings }: { settings: BusinessSettings }) {
  const { t, toast } = useTrack();
  const original = toBusinessSettingsForm(settings);
  const [form, setForm] = useState(original);
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges = JSON.stringify(form) !== JSON.stringify(original);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { changes, fieldErrors } = businessSettingsChanges(original, form, settings.minimumStaleWorkdayHours);
    if (Object.keys(fieldErrors).length) {
      setErrors({ fields: Object.fromEntries(Object.entries(fieldErrors).map(([field, message]) => [field, t(message, { minimum: settings.minimumStaleWorkdayHours })])), general: null });
      return;
    }
    if (!Object.keys(changes).length) return;
    setIsSaving(true);
    const result = await updateBusinessSettings(changes);
    setIsSaving(false);
    if (!result.ok) { setErrors(formErrorsOf(result, FORM_FIELDS, t)); return; }
    toast(result.message ?? t("Settings saved."));
  };

  return (
    <form className="card" style={{ padding: 20 }} onSubmit={save} noValidate aria-labelledby="business-settings-heading">
      <div className="card-h"><h3 id="business-settings-heading">{t("Business")}</h3></div>
      <BusinessSettingsFields form={form} onChange={(updatedForm) => { setForm(updatedForm); setErrors(NO_ERRORS); }} errors={errors.fields} minimumStaleWorkdayHours={settings.minimumStaleWorkdayHours} />
      {errors.general && <div className="err" role="alert" style={{ marginTop: 12 }}>{errors.general}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
        <button type="button" className="btn btn-ghost" disabled={!hasChanges} onClick={() => { setForm(original); setErrors(NO_ERRORS); }}>{t("Undo changes")}</button>
        <button type="submit" className="btn btn-gold" disabled={!hasChanges || isSaving}>{isSaving ? t("Saving…") : t("Save changes")}</button>
      </div>
    </form>
  );
}

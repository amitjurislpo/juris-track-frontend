import { useState } from "react";
import type { Shift } from "@/track/api-types";
import { FormField } from "@/track/components/FormField";
import { Modal } from "@/track/components/Modal";
import { EMPTY_SHIFT_FORM, MAXIMUM_SHIFT_NAME_LENGTH, newShiftBody, SHIFT_FORM_FIELDS, shiftChanges, shiftFormErrors, toShiftForm, type ShiftForm } from "@/track/lib/shift-form";
import { formErrorsOf, type FormErrors } from "@/track/lib/problems";
import { formatScheduledMinutes, formatShiftWindow, scheduledMinutesOf } from "@/track/lib/time/shift";
import { useTrack } from "@/track/TrackContext";
import { createShift, updateShift } from "./actions";

const NO_ERRORS: FormErrors = { fields: {}, general: null };

/** Create a shift (no `shift`) or edit one: name, start, end and the two grace periods. Editing sends only the changed fields. */
export function ShiftFormDialog({ shift, onClose }: { shift?: Shift; onClose: () => void }) {
  const { t, toast } = useTrack();
  const original = shift ? toShiftForm(shift) : EMPTY_SHIFT_FORM;
  const [form, setForm] = useState<ShiftForm>(original);
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [isSaving, setIsSaving] = useState(false);
  const changes = shift ? shiftChanges(original, form) : {};
  const hasChanges = !shift || Object.keys(changes).length > 0;
  const change = (fieldName: keyof ShiftForm, value: string) => { setForm({ ...form, [fieldName]: value }); setErrors(NO_ERRORS); };
  const isDefault = Boolean(shift?.isDefault);
  const hasTimes = Boolean(form.startTime && form.endTime && form.startTime !== form.endTime);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = shiftFormErrors(form);
    if (Object.keys(fieldErrors).length) {
      setErrors({ fields: Object.fromEntries(Object.entries(fieldErrors).map(([field, message]) => [field, t(message)])), general: null });
      return;
    }
    if (!hasChanges) return;
    setIsSaving(true);
    const result = shift ? await updateShift(shift.id, changes) : await createShift(newShiftBody(form));
    setIsSaving(false);
    if (!result.ok) { setErrors(formErrorsOf(result, SHIFT_FORM_FIELDS, t)); return; }
    toast(result.message ?? (shift ? t("Shift saved.") : t("Shift added.")));
    onClose();
  };

  return (
    <Modal title={shift ? t("Edit shift") : t("New shift")} eyebrow={t("Shifts")} onClose={onClose}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
        <button type="submit" form="shift-form" className="btn btn-gold" disabled={!hasChanges || isSaving}>{isSaving ? t("Saving…") : shift ? t("Save changes") : t("Add shift")}</button>
      </>}>
      <form id="shift-form" className="col" style={{ gap: 14 }} onSubmit={save} noValidate>
        <FormField label={t("Name")} hint={t("for example US shift")} error={errors.fields.name}>
          <input value={form.name} onChange={(e) => change("name", e.target.value)} maxLength={MAXIMUM_SHIFT_NAME_LENGTH} autoFocus />
        </FormField>
        <div className="grid2">
          <FormField label={t("Starts at")} hint={t("business time")} error={errors.fields.startTime}>
            <input type="time" value={form.startTime} disabled={isDefault} onChange={(e) => change("startTime", e.target.value)} />
          </FormField>
          <FormField label={t("Ends at")} hint={t("business time")} error={errors.fields.endTime}>
            <input type="time" value={form.endTime} disabled={isDefault} onChange={(e) => change("endTime", e.target.value)} />
          </FormField>
        </div>
        {hasTimes && (
          <p className="muted" style={{ margin: 0, fontSize: 13 }} data-testid="shift-preview">
            {t("{window}, {hours} scheduled. A shift that ends at or before its start time ends on the next day (+1).", {
              window: formatShiftWindow(form),
              hours: formatScheduledMinutes(scheduledMinutesOf(form.startTime, form.endTime)),
            })}
          </p>
        )}
        <div className="grid2">
          <FormField label={t("Early start allowance")} hint={t("minutes")} error={errors.fields.earlyStartMinutes}>
            <input type="number" inputMode="numeric" min={0} max={720} step={1} value={form.earlyStartMinutes} disabled={isDefault} onChange={(e) => change("earlyStartMinutes", e.target.value)} />
          </FormField>
          <FormField label={t("Late finish allowance")} hint={t("minutes")} error={errors.fields.lateEndMinutes}>
            <input type="number" inputMode="numeric" min={0} max={720} step={1} value={form.lateEndMinutes} disabled={isDefault} onChange={(e) => change("lateEndMinutes", e.target.value)} />
          </FormField>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          {t("Work that starts up to the early allowance before the shift, or runs up to the late allowance after it, still counts for this shift and is not marked as outside it.")}
        </p>
        {isDefault && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t("This is the default shift: every new employee starts on it and only its name can be changed.")}</p>}
        {errors.general && <div className="err" role="alert">{errors.general}</div>}
      </form>
    </Modal>
  );
}

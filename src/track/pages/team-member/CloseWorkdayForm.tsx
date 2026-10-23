import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/track/components/ConfirmDialog";
import { FormField } from "@/track/components/FormField";
import { toZonedInputValue } from "@/track/lib/time/business-calendar";
import { serverNow } from "@/track/lib/time/clock-offset";
import { addDays } from "@/track/lib/time/business-calendar";
import { formatDateKey, formatDateTime } from "@/track/lib/time/format";
import type { WorkdaySnapshot } from "@/track/lib/time/types";
import { zoneLabel } from "@/track/lib/time/zone-names";
import { checkCloseWorkday, isNowOutsideCorrectionWindow, lastRecordedActivity, type CloseWorkdayBody } from "@/track/lib/time-correction";
import { formErrorsOf, type FormErrors } from "@/track/lib/problems";
import { useTrack } from "@/track/TrackContext";
import { closeWorkday } from "./actions";
import { ReasonField } from "./ReasonField";

const NO_ERRORS: FormErrors = { fields: {}, general: null };

/**
 * Ends an open (typically forgotten) workday: an optional end time in the display time zone (empty = now), a mandatory reason and
 * a confirmation. The running work or break interval ends then and the day becomes "Day ended".
 */
export function CloseWorkdayForm({ workday, timeZone, businessTimeZone, clockOffsetMilliseconds, onDone }: {
  workday: WorkdaySnapshot;
  timeZone: string;
  businessTimeZone: string;
  clockOffsetMilliseconds: number;
  onDone: () => void;
}) {
  const { t, toast } = useTrack();
  // when "now" is past the days a correction may name, an empty end would be refused: start from the last recorded activity
  const isOutsideWindow = isNowOutsideCorrectionWindow(workday.date, businessTimeZone, serverNow(clockOffsetMilliseconds), workday.shift?.scheduledEndAt);
  const [endInput, setEndInput] = useState(() => (isOutsideWindow ? toZonedInputValue(new Date(lastRecordedActivity(workday)), timeZone) : ""));
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [pendingBody, setPendingBody] = useState<CloseWorkdayBody | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const nowInput = toZonedInputValue(new Date(serverNow(clockOffsetMilliseconds)), timeZone);
  const earliestInput = toZonedInputValue(new Date(lastRecordedActivity(workday)), timeZone);

  function review(e: FormEvent) {
    e.preventDefault();
    const check = checkCloseWorkday(workday, endInput, reason, timeZone, serverNow(clockOffsetMilliseconds));
    if (!check.body) {
      setErrors({ fields: Object.fromEntries(Object.entries(check.errors).map(([field, message]) => [field, t(message)])), general: null });
      return;
    }
    setErrors(NO_ERRORS);
    setPendingBody(check.body);
  }

  async function confirm() {
    if (!pendingBody) return;
    setIsBusy(true);
    const result = await closeWorkday(workday.id, pendingBody);
    setIsBusy(false);
    setPendingBody(null);
    if (result.ok) {
      toast(result.message ?? t("Workday ended."));
      onDone();
      return;
    }
    setErrors(formErrorsOf(result, ["endedAt", "reason"], t));
  }

  return (
    <form className="col" style={{ gap: 12 }} onSubmit={review} noValidate aria-label={t("Close this workday")}>
      <FormField label={t("End time")} hint={t("optional: empty ends it now")} error={errors.fields.endedAt}>
        <input type="datetime-local" step={60} min={earliestInput} max={nowInput} value={endInput}
          onChange={(e) => { setEndInput(e.target.value); setErrors(NO_ERRORS); }} />
      </FormField>
      {isOutsideWindow && (
        <p className="notice warn" style={{ margin: 0 }} role="status">
          <span>{t("This workday is too old to end at the current time. Choose the time it really ended, on {date} or {nextDate}; the last recorded activity is filled in.", {
            date: formatDateKey(workday.date), nextDate: formatDateKey(addDays(workday.date, 1)),
          })}</span>
        </p>
      )}
      <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>
        {t("Times are in {zone}. The end cannot be before the last recorded activity ({time}).", {
          zone: zoneLabel(timeZone, new Date(workday.startedAt)),
          time: formatDateTime(new Date(lastRecordedActivity(workday)), timeZone),
        })}
      </p>
      <ReasonField value={reason} error={errors.fields.reason} onChange={(text) => { setReason(text); setErrors(NO_ERRORS); }}
        placeholder={t("For example: forgot to end the workday; left at 18:05 as confirmed.")} />
      {errors.general && <div className="err" role="alert">{errors.general}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={isBusy}>{t("Cancel")}</button>
        <button type="submit" className="btn btn-danger" disabled={isBusy}>{t("Close this workday")}</button>
      </div>
      {pendingBody && (
        <ConfirmDialog title={t("Close this workday?")} isDanger isBusy={isBusy} confirmLabel={t("Close workday")}
          body={t("The running interval ends at {time} and the workday becomes Day ended. The change and your reason are recorded in the audit log.", {
            time: pendingBody.endedAt ? formatDateTime(pendingBody.endedAt, timeZone) : t("now"),
          })}
          onConfirm={() => { void confirm(); }} onClose={() => setPendingBody(null)} />
      )}
    </form>
  );
}

import { useState, type FormEvent } from "react";
import { FormField } from "@/track/components/FormField";
import { toZonedInputValue } from "@/track/lib/time/business-calendar";
import { formatDuration } from "@/track/lib/time/format";
import { serverNow } from "@/track/lib/time/clock-offset";
import type { TimelineSegment, WorkdaySnapshot } from "@/track/lib/time/types";
import { checkIntervalCorrection, correctionErrorsOf, initialIntervalForm, previewCorrectedTotals, type IntervalCorrectionForm as FormValues } from "@/track/lib/time-correction";
import type { FormErrors } from "@/track/lib/problems";
import { workdayFigures } from "@/track/lib/time/live-totals";
import { zoneLabel } from "@/track/lib/time/zone-names";
import { useTrack } from "@/track/TrackContext";
import { correctBreakSession, correctWorkSession } from "./actions";
import { ReasonField } from "./ReasonField";

const NO_ERRORS: FormErrors = { fields: {}, general: null };

/**
 * Corrects one work or break interval: its start and end as date and time in the display time zone (a running interval only
 * moves its start), a mandatory reason, and a preview of the day's totals after the change. The API checks everything again; its
 * refusals (overlap, a break first, a time in the future…) are shown next to the field they concern.
 */
export function IntervalCorrectionForm({ workday, segment, timeZone, clockOffsetMilliseconds, nowMilliseconds, onDone }: {
  workday: WorkdaySnapshot;
  segment: TimelineSegment;
  timeZone: string;
  clockOffsetMilliseconds: number;
  nowMilliseconds: number;
  onDone: () => void;
}) {
  const { t, toast } = useTrack();
  const [form, setForm] = useState<FormValues>(() => initialIntervalForm(segment, timeZone));
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [isBusy, setIsBusy] = useState(false);
  const isRunning = segment.endedAt === null;
  const typeName = segment.type === "WORK" ? t("Work interval") : t("Break interval");
  const preview = checkIntervalCorrection(segment, form, timeZone, nowMilliseconds);
  const previewTotals = preview.hasChanges && preview.corrected ? previewCorrectedTotals(workday, preview.corrected, nowMilliseconds) : null;
  const currentTotals = workdayFigures(workday, nowMilliseconds);
  const latestInput = toZonedInputValue(new Date(nowMilliseconds), timeZone);
  const change = (field: keyof FormValues, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ fields: { ...previous.fields, [field]: "" }, general: null }));
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    // check against the server's clock as it is now (the dialog may have been open for a while)
    const check = checkIntervalCorrection(segment, form, timeZone, serverNow(clockOffsetMilliseconds));
    if (!check.hasChanges) {
      setErrors({ fields: {}, general: t("Nothing changed. Change the start or the end time first.") });
      return;
    }
    if (!check.body) {
      setErrors({ fields: Object.fromEntries(Object.entries(check.errors).map(([field, message]) => [field, t(message)])), general: null });
      return;
    }
    setIsBusy(true);
    const result = await (segment.type === "WORK" ? correctWorkSession : correctBreakSession)(workday.id, segment.id, check.body);
    setIsBusy(false);
    if (result.ok) {
      toast(result.message ?? t("Time corrected."));
      onDone();
      return;
    }
    setErrors(correctionErrorsOf(result, check.body, t));
  }

  return (
    <form className="col" style={{ gap: 12, padding: "12px 0" }} onSubmit={save} noValidate aria-label={t("Correct the {interval}", { interval: typeName.toLowerCase() })}>
      <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>{t("Times are in {zone}.", { zone: zoneLabel(timeZone, new Date(segment.startedAt)) })}</p>
      <div className="cards2" style={{ gap: 12 }}>
        <FormField label={t("Start")} error={errors.fields.startedAt}>
          <input type="datetime-local" step={60} max={latestInput} value={form.startedAt} onChange={(e) => change("startedAt", e.target.value)} required />
        </FormField>
        {isRunning
          ? (
            <FormField label={t("End")} hint={t("Still running")} error={errors.fields.endedAt}>
              <input type="text" value={t("Now")} readOnly disabled />
            </FormField>
          )
          : (
            <FormField label={t("End")} error={errors.fields.endedAt}>
              <input type="datetime-local" step={60} max={latestInput} value={form.endedAt} onChange={(e) => change("endedAt", e.target.value)} required />
            </FormField>
          )}
      </div>
      {isRunning && <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>{t("A running interval keeps running: only its start can move. To end it, close the workday.")}</p>}
      <ReasonField value={form.reason} error={errors.fields.reason} onChange={(reason) => change("reason", reason)}
        placeholder={t("For example: forgot to start the break; confirmed with the employee.")} />
      {previewTotals && (
        <p className="notice info" role="status" style={{ margin: 0 }}>
          <b>{t("After this correction")}</b>
          <span className="num">{t("Productive {after} (now {before}) · Break {breakAfter} (now {breakBefore})", {
            after: formatDuration(previewTotals.productiveSeconds),
            before: formatDuration(currentTotals.productiveSeconds),
            breakAfter: formatDuration(previewTotals.breakSeconds),
            breakBefore: formatDuration(currentTotals.breakSeconds),
          })}</span>
        </p>
      )}
      {errors.general && <div className="err" role="alert">{errors.general}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={isBusy}>{t("Cancel")}</button>
        <button type="submit" className="btn btn-gold" disabled={isBusy}>{t("Save correction")}</button>
      </div>
    </form>
  );
}

/**
 * Time corrections by a manager or the owner (references/API-team-and-corrections.md, "Corrections"): the form rules the API
 * applies again (a reason of 5 to 500 characters, an end after the start, nothing in the future), the request bodies, a preview
 * of the corrected totals and where each refusal is shown. Times are typed as wall-clock times in the display time zone and sent
 * as UTC ISO-8601 instants. Messages are translation keys (the API's own wording where it has one).
 */
import type { ActionResult } from "../action";
import { formErrorsOf, type FormErrors } from "./problems";
import { resolveZonedDateTime, toZonedInputValue } from "./time/business-calendar";
import { computeTotals, type WorkdayTotals } from "./time/interval-math";
import type { TimelineSegment, WorkdaySnapshot } from "./time/types";

export const MINIMUM_REASON_LENGTH = 5;
export const MAXIMUM_REASON_LENGTH = 500;

const REASON_TOO_SHORT = "Give a reason of at least 5 characters.";
const REASON_TOO_LONG = "The reason must be at most 500 characters.";
const FUTURE_TIME = "Times cannot be in the future.";
const INVALID_TIME = "Enter a date and time.";
const NONEXISTENT_TIME = "This time does not exist on that date: the clocks move forward. Choose another time.";

/**
 * A datetime-local value ("2026-10-22T15:00") read as a wall-clock time in `timeZone`, as a UTC ISO instant; null when malformed.
 * `reference` is the value the field held before it was edited: inside the repeated hour of a fall-back clock change it picks the
 * occurrence closest to it (see `resolveZonedDateTime`).
 */
export function zonedInputToIsoInstant(value: string, timeZone: string, reference?: string | null): string | null {
  return resolveZonedDateTime(value.trim(), timeZone, reference)?.instant.toISOString() ?? null;
}

/** True when the value names a time that does not exist (inside the hour the clocks skip in spring). */
function isSkippedLocalTime(value: string, timeZone: string): boolean {
  return resolveZonedDateTime(value.trim(), timeZone)?.kind === "gap";
}

/** The message for a reason, or null when it is fine (5 to 500 characters after trimming). */
export function reasonError(reason: string): string | null {
  const length = reason.trim().length;
  if (length < MINIMUM_REASON_LENGTH) return REASON_TOO_SHORT;
  if (length > MAXIMUM_REASON_LENGTH) return REASON_TOO_LONG;
  return null;
}

/** What the interval form holds: datetime-local values in the display time zone (`endedAt` "" for a running interval). */
export interface IntervalCorrectionForm {
  startedAt: string;
  endedAt: string;
  reason: string;
}

/** The body of `PATCH /workdays/{workdayId}/work-sessions|break-sessions/{sessionId}`: only the times that change. */
export interface IntervalCorrectionBody {
  startedAt?: string;
  endedAt?: string;
  reason: string;
}

/** The form's starting values: the interval's times in the display time zone (to the minute) and no reason. */
export function initialIntervalForm(segment: TimelineSegment, timeZone: string): IntervalCorrectionForm {
  return {
    startedAt: toZonedInputValue(segment.startedAt, timeZone),
    endedAt: segment.endedAt ? toZonedInputValue(segment.endedAt, timeZone) : "",
    reason: "",
  };
}

export interface IntervalCorrectionCheck {
  /** Message per field (`startedAt`, `endedAt`, `reason`); empty when the form can be sent. */
  errors: Record<string, string>;
  /** False when neither time differs from the stored one (to the minute the form shows). */
  hasChanges: boolean;
  /** The request body, when the form can be sent. */
  body: IntervalCorrectionBody | null;
  /** The interval as it would be after the correction (for the preview), when both times are readable. */
  corrected: TimelineSegment | null;
}

/**
 * Checks the interval form against the rules the API applies and builds the PATCH body. A time is sent only when the form's
 * value differs from the stored one: the form shows minutes, so an untouched field must not cut the stored seconds off. A running
 * interval only moves its start (its end is never sent).
 */
export function checkIntervalCorrection(segment: TimelineSegment, form: IntervalCorrectionForm, timeZone: string, nowMilliseconds: number): IntervalCorrectionCheck {
  const initial = initialIntervalForm(segment, timeZone);
  const isRunning = segment.endedAt === null;
  const errors: Record<string, string> = {};
  const isStartChanged = form.startedAt !== initial.startedAt;
  const isEndChanged = !isRunning && form.endedAt !== initial.endedAt;
  const startedAt = isStartChanged ? zonedInputToIsoInstant(form.startedAt, timeZone, segment.startedAt) : segment.startedAt;
  const endedAt = isRunning ? null : isEndChanged ? zonedInputToIsoInstant(form.endedAt, timeZone, segment.endedAt) : segment.endedAt;
  if (!startedAt) errors.startedAt = INVALID_TIME;
  else if (isStartChanged && isSkippedLocalTime(form.startedAt, timeZone)) errors.startedAt = NONEXISTENT_TIME;
  if (!isRunning && !endedAt) errors.endedAt = form.endedAt.trim() ? INVALID_TIME : "An end time is required.";
  else if (isEndChanged && isSkippedLocalTime(form.endedAt, timeZone)) errors.endedAt = NONEXISTENT_TIME;
  if (startedAt && Date.parse(startedAt) > nowMilliseconds) errors.startedAt = FUTURE_TIME;
  if (endedAt && Date.parse(endedAt) > nowMilliseconds) errors.endedAt = FUTURE_TIME;
  if (startedAt && endedAt && !errors.endedAt && Date.parse(endedAt) <= Date.parse(startedAt)) errors.endedAt = "The end time must be after the start time.";
  const reasonMessage = reasonError(form.reason);
  if (reasonMessage) errors.reason = reasonMessage;
  const hasChanges = isStartChanged || isEndChanged;
  const corrected = startedAt && (isRunning || endedAt) ? { ...segment, startedAt, endedAt } : null;
  const canSend = hasChanges && Object.keys(errors).length === 0;
  const body: IntervalCorrectionBody | null = canSend
    ? { ...(isStartChanged ? { startedAt: startedAt! } : {}), ...(isEndChanged ? { endedAt: endedAt! } : {}), reason: form.reason.trim() }
    : null;
  return { errors, hasChanges, body, corrected };
}

/**
 * The workday's totals with one interval replaced (a preview; the API recomputes and decides). The day runs from its first
 * interval to its last end when it has ended, else to now.
 */
export function previewCorrectedTotals(workday: WorkdaySnapshot, corrected: TimelineSegment, nowMilliseconds: number): WorkdayTotals {
  const segments = workday.segments.map((segment) => (segment.id === corrected.id && segment.type === corrected.type ? corrected : segment));
  const firstStart = Math.min(...segments.map((segment) => Date.parse(segment.startedAt)));
  const lastEnd = Math.max(...segments.map((segment) => (segment.endedAt ? Date.parse(segment.endedAt) : nowMilliseconds)));
  const span = { startedAt: new Date(firstStart), endedAt: workday.endedAt ? new Date(lastEnd) : null };
  return computeTotals(
    span,
    segments.filter((segment) => segment.type === "WORK"),
    segments.filter((segment) => segment.type === "BREAK"),
    nowMilliseconds,
  );
}

/** The body of `PUT /workdays/{workdayId}/status`. */
export interface CloseWorkdayBody {
  status: "DAY_ENDED";
  endedAt?: string;
  reason: string;
}

/** The latest recorded activity of a workday: the start of its running interval or the end of any interval. */
export function lastRecordedActivity(workday: WorkdaySnapshot): number {
  return Math.max(Date.parse(workday.startedAt), ...workday.segments.map((segment) => Date.parse(segment.endedAt ?? segment.startedAt)));
}

/**
 * Checks the "Close this workday" form: the end time is optional (empty = the API's default: now while an interval runs), may not
 * lie in the future nor before the last recorded activity; the reason is mandatory.
 */
export function checkCloseWorkday(workday: WorkdaySnapshot, endInput: string, reason: string, timeZone: string, nowMilliseconds: number): { errors: Record<string, string>; body: CloseWorkdayBody | null } {
  const errors: Record<string, string> = {};
  const endedAt = endInput.trim() ? zonedInputToIsoInstant(endInput, timeZone, new Date(lastRecordedActivity(workday)).toISOString()) : null;
  if (endInput.trim() && !endedAt) errors.endedAt = INVALID_TIME;
  else if (endedAt && isSkippedLocalTime(endInput, timeZone)) errors.endedAt = NONEXISTENT_TIME;
  else if (endedAt && Date.parse(endedAt) > nowMilliseconds) errors.endedAt = FUTURE_TIME;
  // the form shows minutes: compare with the last activity cut to its minute, the API decides on the exact instant
  else if (endedAt && Date.parse(endedAt) < Math.floor(lastRecordedActivity(workday) / 60_000) * 60_000) errors.endedAt = "The end time cannot be before the last recorded activity.";
  const reasonMessage = reasonError(reason);
  if (reasonMessage) errors.reason = reasonMessage;
  if (Object.keys(errors).length) return { errors, body: null };
  return { errors, body: { status: "DAY_ENDED", ...(endedAt ? { endedAt } : {}), reason: reason.trim() } };
}

/** Problem codes of the corrections, and the field each belongs to on the interval form. */
const CORRECTION_FIELDS_OF_CODES: Record<string, string> = {
  WORKDAY_MUST_START_WITH_WORK: "startedAt",
  INTERVAL_STILL_RUNNING: "endedAt",
};

/**
 * Spreads a refused correction over the form: the 400 field errors next to `startedAt` / `endedAt` / `reason`; an overlap next
 * to the one time that changed (both changed: above the buttons); a break before the first work next to the start; the rest
 * (CANNOT_CORRECT_OWN_TIME, not found) above the buttons.
 */
export function correctionErrorsOf(result: Extract<ActionResult<unknown>, { ok: false }>, body: { startedAt?: string; endedAt?: string }, t: (text: string) => string): FormErrors {
  const fieldOfCode = { ...CORRECTION_FIELDS_OF_CODES };
  const isStartSent = body.startedAt !== undefined;
  const isEndSent = body.endedAt !== undefined;
  if (isStartSent !== isEndSent) fieldOfCode.TIME_INTERVAL_OVERLAP = isStartSent ? "startedAt" : "endedAt";
  return formErrorsOf(result, ["startedAt", "endedAt", "reason"], t, fieldOfCode);
}

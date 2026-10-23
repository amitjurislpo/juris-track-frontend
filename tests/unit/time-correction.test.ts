import { describe, expect, it } from "vitest";
import { HINDI_MESSAGES } from "@/standalone/i18n/translate";
import { PROBLEM_MESSAGES } from "@/track/lib/problems";
import type { TimelineSegment, WorkdaySnapshot } from "@/track/lib/time/types";
import {
  checkCloseWorkday,
  checkIntervalCorrection,
  correctionErrorsOf,
  initialIntervalForm,
  lastRecordedActivity,
  previewCorrectedTotals,
  reasonError,
  zonedInputToIsoInstant,
} from "@/track/lib/time-correction";

const KOLKATA = "Asia/Kolkata";
const NEW_YORK = "America/New_York";
const NOW = Date.parse("2026-10-22T12:00:00Z");
const REASON = "Forgot to start the break";
const translate = (text: string) => `[${text}]`;
const failure = (fields: { error?: string; code?: string; errors?: { field: string; message: string }[] }) => ({ ok: false as const, error: fields.error ?? "detail", ...fields });

// 09:00:30-12:00 work, 12:00-12:30 break, 12:30-17:00 work (IST), stored with seconds
const FIRST_WORK: TimelineSegment = { id: "w1", type: "WORK", startedAt: "2026-10-22T03:30:30Z", endedAt: "2026-10-22T06:30:00Z" };
const BREAK: TimelineSegment = { id: "b1", type: "BREAK", startedAt: "2026-10-22T06:30:00Z", endedAt: "2026-10-22T07:00:00Z" };
const SECOND_WORK: TimelineSegment = { id: "w2", type: "WORK", startedAt: "2026-10-22T07:00:00Z", endedAt: "2026-10-22T11:30:00Z" };
const RUNNING_WORK: TimelineSegment = { id: "w3", type: "WORK", startedAt: "2026-10-22T11:00:00Z", endedAt: null };

function workday(segments: TimelineSegment[], endedAt: string | null): WorkdaySnapshot {
  return {
    id: "d1", date: "2026-10-22", status: endedAt ? "DAY_ENDED" : "WORKING", startedAt: segments[0].startedAt, endedAt, isStale: false, shift: null, isOutsideShift: false, varianceSeconds: null, extraSeconds: 0, isOffDay: false,
    closedProductiveSeconds: 0, closedBreakSeconds: 0, activeWorkStartedAt: null, activeBreakStartedAt: null,
    productiveSeconds: 0, breakSeconds: 0, spanSeconds: 0, breakCount: 0, lastBreak: null,
    lastActivity: { type: "STARTED_WORK", at: segments[0].startedAt }, segments,
  };
}

describe("zonedInputToIsoInstant", () => {
  it("reads a datetime-local value in the display time zone and sends UTC", () => {
    expect(zonedInputToIsoInstant("2026-10-22T15:00", KOLKATA)).toBe("2026-10-22T09:30:00.000Z");
    expect(zonedInputToIsoInstant("2026-10-22T15:00", "UTC")).toBe("2026-10-22T15:00:00.000Z");
    expect(zonedInputToIsoInstant("2026-07-01T09:00", NEW_YORK)).toBe("2026-07-01T13:00:00.000Z");
    expect(zonedInputToIsoInstant("2026-12-01T09:00", NEW_YORK)).toBe("2026-12-01T14:00:00.000Z");
  });

  it("handles the daylight-saving changes: a time in the spring gap one hour earlier, an autumn time twice as its first", () => {
    // New York 2026-03-08 02:30 does not exist: read as 01:30 EST
    expect(zonedInputToIsoInstant("2026-03-08T02:30", NEW_YORK)).toBe("2026-03-08T06:30:00.000Z");
    expect(zonedInputToIsoInstant("2026-03-08T03:30", NEW_YORK)).toBe("2026-03-08T07:30:00.000Z");
    // 2026-11-01 01:30 happens twice: the first (EDT) is taken
    expect(zonedInputToIsoInstant("2026-11-01T01:30", NEW_YORK)).toBe("2026-11-01T05:30:00.000Z");
    expect(zonedInputToIsoInstant("2026-11-01T03:00", NEW_YORK)).toBe("2026-11-01T08:00:00.000Z");
  });

  it("refuses what is not a date and time", () => {
    expect(zonedInputToIsoInstant("", KOLKATA)).toBeNull();
    expect(zonedInputToIsoInstant("2026-02-30T10:00", KOLKATA)).toBeNull();
    expect(zonedInputToIsoInstant("2026-10-22 25:00", KOLKATA)).toBeNull();
  });
});

describe("reasonError", () => {
  it("wants 5 to 500 characters after trimming", () => {
    expect(reasonError("  abcd ")).toBe("Give a reason of at least 5 characters.");
    expect(reasonError("abcde")).toBeNull();
    expect(reasonError("x".repeat(500))).toBeNull();
    expect(reasonError("x".repeat(501))).toBe("The reason must be at most 500 characters.");
  });
});

describe("checkIntervalCorrection", () => {
  it("starts from the interval's times in the display time zone, to the minute", () => {
    expect(initialIntervalForm(FIRST_WORK, KOLKATA)).toEqual({ startedAt: "2026-10-22T09:00", endedAt: "2026-10-22T12:00", reason: "" });
    expect(initialIntervalForm(RUNNING_WORK, KOLKATA)).toEqual({ startedAt: "2026-10-22T16:30", endedAt: "", reason: "" });
  });

  it("sends only the time that changed (an untouched start keeps its stored seconds) and the trimmed reason", () => {
    const form = { ...initialIntervalForm(FIRST_WORK, KOLKATA), endedAt: "2026-10-22T11:45", reason: `  ${REASON} ` };
    const check = checkIntervalCorrection(FIRST_WORK, form, KOLKATA, NOW);
    expect(check.errors).toEqual({});
    expect(check.body).toEqual({ endedAt: "2026-10-22T06:15:00.000Z", reason: REASON });
    expect(check.corrected).toEqual({ ...FIRST_WORK, endedAt: "2026-10-22T06:15:00.000Z" });
  });

  it("sends both times when both changed", () => {
    const form = { startedAt: "2026-10-22T09:15", endedAt: "2026-10-22T11:45", reason: REASON };
    expect(checkIntervalCorrection(FIRST_WORK, form, KOLKATA, NOW).body).toEqual({ startedAt: "2026-10-22T03:45:00.000Z", endedAt: "2026-10-22T06:15:00.000Z", reason: REASON });
  });

  it("says when nothing changed and sends nothing", () => {
    const check = checkIntervalCorrection(FIRST_WORK, { ...initialIntervalForm(FIRST_WORK, KOLKATA), reason: REASON }, KOLKATA, NOW);
    expect(check.hasChanges).toBe(false);
    expect(check.body).toBeNull();
  });

  it("moves only the start of a running interval, never its end", () => {
    const form = { startedAt: "2026-10-22T16:00", endedAt: "2026-10-22T17:00", reason: REASON };
    const check = checkIntervalCorrection(RUNNING_WORK, form, KOLKATA, NOW);
    expect(check.body).toEqual({ startedAt: "2026-10-22T10:30:00.000Z", reason: REASON });
    expect(check.corrected?.endedAt).toBeNull();
  });

  it("refuses an end before the start, times in the future, a missing end, a bad time and a short reason", () => {
    const base = initialIntervalForm(FIRST_WORK, KOLKATA);
    expect(checkIntervalCorrection(FIRST_WORK, { ...base, endedAt: "2026-10-22T08:00", reason: REASON }, KOLKATA, NOW).errors)
      .toEqual({ endedAt: "The end time must be after the start time." });
    expect(checkIntervalCorrection(FIRST_WORK, { ...base, endedAt: "2026-10-22T09:00", reason: REASON }, KOLKATA, NOW).errors)
      .toEqual({ endedAt: "The end time must be after the start time." });
    expect(checkIntervalCorrection(FIRST_WORK, { ...base, endedAt: "2026-10-22T18:00", reason: REASON }, KOLKATA, NOW).errors)
      .toEqual({ endedAt: "Times cannot be in the future." });
    expect(checkIntervalCorrection(RUNNING_WORK, { ...base, startedAt: "2026-10-22T18:00", reason: REASON }, KOLKATA, NOW).errors)
      .toEqual({ startedAt: "Times cannot be in the future." });
    expect(checkIntervalCorrection(FIRST_WORK, { ...base, endedAt: "", reason: REASON }, KOLKATA, NOW).errors)
      .toEqual({ endedAt: "An end time is required." });
    expect(checkIntervalCorrection(FIRST_WORK, { ...base, startedAt: "2026-13-01T10:00", reason: "ok" }, KOLKATA, NOW).errors)
      .toEqual({ startedAt: "Enter a date and time.", reason: "Give a reason of at least 5 characters." });
  });
});

describe("previewCorrectedTotals", () => {
  it("recomputes an ended day's totals with the corrected interval", () => {
    const ended = workday([FIRST_WORK, BREAK, SECOND_WORK], SECOND_WORK.endedAt);
    // the break ends 10 minutes earlier: 10 minutes less break, the work and the span stay as they are
    const totals = previewCorrectedTotals(ended, { ...BREAK, endedAt: "2026-10-22T06:50:00Z" }, NOW);
    expect(totals).toEqual({ productiveSeconds: 10770 + 16200, breakSeconds: 1200, spanSeconds: 28770, breakCount: 1 });
    // an earlier first start lengthens the span and the productive time
    expect(previewCorrectedTotals(ended, { ...FIRST_WORK, startedAt: "2026-10-22T03:00:00Z" }, NOW)).toMatchObject({ productiveSeconds: 12600 + 16200, spanSeconds: 30600 });
  });

  it("runs an open day to now", () => {
    const open = workday([{ ...FIRST_WORK }, { ...BREAK }, RUNNING_WORK], null);
    expect(previewCorrectedTotals(open, { ...RUNNING_WORK, startedAt: "2026-10-22T11:30:00Z" }, NOW)).toMatchObject({ productiveSeconds: 10770 + 1800, breakSeconds: 1800 });
  });
});

describe("checkCloseWorkday", () => {
  const open = workday([FIRST_WORK, BREAK, RUNNING_WORK], null);

  it("knows the last recorded activity (the running interval's start or the latest end)", () => {
    expect(lastRecordedActivity(open)).toBe(Date.parse(RUNNING_WORK.startedAt));
  });

  it("ends now without an end time, or at the chosen time, with the trimmed reason", () => {
    expect(checkCloseWorkday(open, "", ` ${REASON} `, KOLKATA, NOW)).toEqual({ errors: {}, body: { status: "DAY_ENDED", reason: REASON } });
    expect(checkCloseWorkday(open, "2026-10-22T17:00", REASON, KOLKATA, NOW).body).toEqual({ status: "DAY_ENDED", endedAt: "2026-10-22T11:30:00.000Z", reason: REASON });
  });

  it("refuses an end in the future or before the last activity, and a missing reason", () => {
    expect(checkCloseWorkday(open, "2026-10-22T18:00", REASON, KOLKATA, NOW).errors).toEqual({ endedAt: "Times cannot be in the future." });
    expect(checkCloseWorkday(open, "2026-10-22T16:00", REASON, KOLKATA, NOW).errors).toEqual({ endedAt: "The end time cannot be before the last recorded activity." });
    expect(checkCloseWorkday(open, "", "", KOLKATA, NOW)).toEqual({ errors: { reason: "Give a reason of at least 5 characters." }, body: null });
  });
});

describe("correctionErrorsOf", () => {
  it("puts the API's field errors next to their fields", () => {
    const result = failure({ code: "VALIDATION_FAILED", errors: [{ field: "endedAt", message: "The end time must be after the start time." }, { field: "reason", message: "Give a reason of at least 5 characters." }] });
    expect(correctionErrorsOf(result, { endedAt: "x" }, translate)).toEqual({
      fields: { endedAt: "The end time must be after the start time.", reason: "Give a reason of at least 5 characters." }, general: null,
    });
  });

  it("puts an overlap next to the one time that changed, or above the buttons when both changed", () => {
    const overlap = failure({ code: "TIME_INTERVAL_OVERLAP" });
    const message = `[${PROBLEM_MESSAGES.TIME_INTERVAL_OVERLAP}]`;
    expect(correctionErrorsOf(overlap, { endedAt: "x" }, translate)).toEqual({ fields: { endedAt: message }, general: null });
    expect(correctionErrorsOf(overlap, { startedAt: "x" }, translate)).toEqual({ fields: { startedAt: message }, general: null });
    expect(correctionErrorsOf(overlap, { startedAt: "x", endedAt: "y" }, translate)).toEqual({ fields: {}, general: message });
  });

  it("puts a break before the first work next to the start, and one's own time above the buttons", () => {
    expect(correctionErrorsOf(failure({ code: "WORKDAY_MUST_START_WITH_WORK" }), { startedAt: "x" }, translate).fields.startedAt)
      .toBe(`[${PROBLEM_MESSAGES.WORKDAY_MUST_START_WITH_WORK}]`);
    expect(correctionErrorsOf(failure({ code: "INTERVAL_STILL_RUNNING" }), { startedAt: "x" }, translate).fields.endedAt)
      .toBe(`[${PROBLEM_MESSAGES.INTERVAL_STILL_RUNNING}]`);
    expect(correctionErrorsOf(failure({ code: "CANNOT_CORRECT_OWN_TIME" }), { startedAt: "x" }, translate))
      .toEqual({ fields: {}, general: `[${PROBLEM_MESSAGES.CANNOT_CORRECT_OWN_TIME}]` });
    expect(correctionErrorsOf(failure({ error: "Time record not found.", code: "NOT_FOUND" }), {}, translate)).toEqual({ fields: {}, general: "Time record not found." });
  });

  it("has a message and its Hindi for every correction code and for the form's own messages", () => {
    for (const code of ["CANNOT_CORRECT_OWN_TIME", "TIME_INTERVAL_OVERLAP", "WORKDAY_MUST_START_WITH_WORK", "INTERVAL_STILL_RUNNING", "CORRECTION_OUT_OF_RANGE", "WORKDAY_OVERLAP"]) {
      expect(HINDI_MESSAGES[PROBLEM_MESSAGES[code]], code).toBeTruthy();
    }
    for (const message of ["Give a reason of at least 5 characters.", "The reason must be at most 500 characters.", "Times cannot be in the future.",
      "Enter a date and time.", "An end time is required.", "The end time must be after the start time.", "The end time cannot be before the last recorded activity.",
      "This time does not exist on that date: the clocks move forward. Choose another time."]) {
      expect(HINDI_MESSAGES[message], message).toBeTruthy();
    }
  });
});

describe("daylight-saving changes in the corrections", () => {
  // New York, 2026-11-01: the clocks go back at 02:00 EDT, so 01:00-02:00 happens twice (05:00Z-06:00Z in EDT, 06:00Z-07:00Z in EST)
  const NIGHT_WORK: TimelineSegment = { id: "n1", type: "WORK", startedAt: "2026-11-01T04:00:00Z", endedAt: "2026-11-01T06:30:00Z" };
  const NIGHT_NOW = Date.parse("2026-11-02T12:00:00Z");

  it("an end that is the second 01:30 (EST) is shown as 01:30 and left alone when the user changes only the start", () => {
    const form = initialIntervalForm(NIGHT_WORK, NEW_YORK);
    expect(form.endedAt).toBe("2026-11-01T01:30");
    const check = checkIntervalCorrection(NIGHT_WORK, { ...form, startedAt: "2026-10-31T23:30", reason: REASON }, NEW_YORK, NIGHT_NOW);
    expect(check.body).toEqual({ startedAt: "2026-11-01T03:30:00.000Z", reason: REASON });
  });

  it("an end edited to another time in the repeated hour keeps the occurrence nearest to the stored end (no one-hour jump)", () => {
    const check = checkIntervalCorrection(NIGHT_WORK, { startedAt: initialIntervalForm(NIGHT_WORK, NEW_YORK).startedAt, endedAt: "2026-11-01T01:45", reason: REASON }, NEW_YORK, NIGHT_NOW);
    expect(check.errors).toEqual({});
    expect(check.body).toEqual({ endedAt: "2026-11-01T06:45:00.000Z", reason: REASON });
  });

  it("refuses a changed time that does not exist (the spring gap) and says why", () => {
    const segment: TimelineSegment = { id: "s1", type: "WORK", startedAt: "2026-03-08T06:00:00Z", endedAt: "2026-03-08T09:00:00Z" };
    const check = checkIntervalCorrection(segment, { startedAt: "2026-03-08T02:30", endedAt: initialIntervalForm(segment, NEW_YORK).endedAt, reason: REASON }, NEW_YORK, NIGHT_NOW);
    expect(check.errors.startedAt).toBe("This time does not exist on that date: the clocks move forward. Choose another time.");
    expect(check.body).toBeNull();
  });

  it("closing a workday at a time that does not exist is refused; the repeated hour is read near the last activity", () => {
    const day = workday([{ ...NIGHT_WORK, endedAt: null }], null);
    expect(checkCloseWorkday({ ...day, startedAt: "2026-03-08T05:00:00Z", segments: [{ ...NIGHT_WORK, startedAt: "2026-03-08T05:00:00Z", endedAt: null }] }, "2026-03-08T02:30", REASON, NEW_YORK, NIGHT_NOW).errors.endedAt)
      .toBe("This time does not exist on that date: the clocks move forward. Choose another time.");
    const afterOverlap = workday([{ ...NIGHT_WORK, endedAt: "2026-11-01T06:10:00Z" }], null);
    expect(checkCloseWorkday(afterOverlap, "2026-11-01T01:30", REASON, NEW_YORK, NIGHT_NOW).body?.endedAt).toBe("2026-11-01T06:30:00.000Z");
  });
});

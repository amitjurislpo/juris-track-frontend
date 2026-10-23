import { describe, expect, it } from "vitest";
import { HINDI_MESSAGES } from "@/standalone/i18n/translate";
import { EMPTY_SHIFT_FORM, newShiftBody, shiftChanges, shiftFormErrors, toShiftForm } from "@/track/lib/shift-form";

const usForm = { name: "US shift", startTime: "19:30", endTime: "04:30", earlyStartMinutes: "30", lateEndMinutes: "60" };

describe("shiftFormErrors", () => {
  it("accepts a good form", () => {
    expect(shiftFormErrors(usForm)).toEqual({});
  });

  it("asks for what is missing", () => {
    expect(Object.keys(shiftFormErrors(EMPTY_SHIFT_FORM)).sort()).toEqual(["endTime", "name", "startTime"]);
    expect(shiftFormErrors({ ...usForm, name: "  " }).name).toBeTruthy();
  });

  it("refuses an end equal to the start and minutes that are not whole numbers", () => {
    expect(shiftFormErrors({ ...usForm, endTime: "19:30" }).endTime).toBeTruthy();
    expect(shiftFormErrors({ ...usForm, earlyStartMinutes: "-5" }).earlyStartMinutes).toBeTruthy();
    expect(shiftFormErrors({ ...usForm, earlyStartMinutes: "721" }).earlyStartMinutes).toBeTruthy();
    expect(shiftFormErrors({ ...usForm, earlyStartMinutes: "720" }).earlyStartMinutes).toBeUndefined();
    expect(shiftFormErrors({ ...usForm, lateEndMinutes: "1.5" }).lateEndMinutes).toBeTruthy();
    expect(shiftFormErrors({ ...usForm, lateEndMinutes: "" }).lateEndMinutes).toBeTruthy();
  });

  it("has Hindi for every message", () => {
    const messages = [...Object.values(shiftFormErrors(EMPTY_SHIFT_FORM)), ...Object.values(shiftFormErrors({ ...usForm, endTime: "19:30", earlyStartMinutes: "x" }))];
    for (const message of messages) expect(HINDI_MESSAGES[message], message).toBeTruthy();
  });
});

describe("shift request bodies", () => {
  it("builds the create body with trimmed text and numeric minutes", () => {
    expect(newShiftBody({ ...usForm, name: "  US shift " })).toEqual({ name: "US shift", startTime: "19:30", endTime: "04:30", earlyStartMinutes: 30, lateEndMinutes: 60 });
  });

  it("sends only the changed fields of an edit, minutes as numbers", () => {
    const original = toShiftForm({ name: "US shift", startTime: "19:30", endTime: "04:30", earlyStartMinutes: 30, lateEndMinutes: 60 });
    expect(original).toEqual(usForm);
    expect(shiftChanges(original, original)).toEqual({});
    expect(shiftChanges(original, { ...original, endTime: "05:00", lateEndMinutes: "90" })).toEqual({ endTime: "05:00", lateEndMinutes: 90 });
  });
});

import { changedFields } from "./patch";

/** A shift as the create / edit form holds it; the grace minutes are text while typed. */
export interface ShiftForm {
  name: string;
  /** "HH:mm" */
  startTime: string;
  endTime: string;
  earlyStartMinutes: string;
  lateEndMinutes: string;
}

export const EMPTY_SHIFT_FORM: ShiftForm = { name: "", startTime: "", endTime: "", earlyStartMinutes: "180", lateEndMinutes: "180" };

/** The form fields, which are also the API's field names. */
export const SHIFT_FORM_FIELDS: readonly string[] = ["name", "startTime", "endTime", "earlyStartMinutes", "lateEndMinutes"];

export const MAXIMUM_SHIFT_NAME_LENGTH = 60;
/** The API accepts 0 to 720 minutes of allowance (180 when left out, which the form starts with). */
const MAXIMUM_ALLOWANCE_MINUTES = 720;

export function toShiftForm(shift: { name: string; startTime: string; endTime: string; earlyStartMinutes: number; lateEndMinutes: number }): ShiftForm {
  return {
    name: shift.name,
    startTime: shift.startTime,
    endTime: shift.endTime,
    earlyStartMinutes: String(shift.earlyStartMinutes),
    lateEndMinutes: String(shift.lateEndMinutes),
  };
}

const isAllowance = (text: string): boolean => /^\d{1,4}$/.test(text.trim()) && Number(text) <= MAXIMUM_ALLOWANCE_MINUTES;

/** What is wrong with the form before it is sent: a message (a translation key) per field name; empty when it is fine. */
export function shiftFormErrors(form: ShiftForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Enter a name for the shift.";
  if (!form.startTime) errors.startTime = "Choose when the shift starts.";
  if (!form.endTime) errors.endTime = "Choose when the shift ends.";
  if (form.startTime && form.startTime === form.endTime) errors.endTime = "The shift must end at a different time than it starts.";
  if (!isAllowance(form.earlyStartMinutes)) errors.earlyStartMinutes = "Enter a whole number of minutes from 0 to 720.";
  if (!isAllowance(form.lateEndMinutes)) errors.lateEndMinutes = "Enter a whole number of minutes from 0 to 720.";
  return errors;
}

/** The `POST /shifts` body. */
export function newShiftBody(form: ShiftForm): Record<string, string | number> {
  return {
    name: form.name.trim(),
    startTime: form.startTime,
    endTime: form.endTime,
    earlyStartMinutes: Number(form.earlyStartMinutes),
    lateEndMinutes: Number(form.lateEndMinutes),
  };
}

/** The `PATCH /shifts/{shiftId}` body: only the changed fields; the minutes go as numbers. */
export function shiftChanges(original: ShiftForm, edited: ShiftForm): Record<string, unknown> {
  const changes: Record<string, unknown> = changedFields({ ...original }, { ...edited });
  for (const fieldName of ["earlyStartMinutes", "lateEndMinutes"]) {
    if (fieldName in changes) changes[fieldName] = Number(changes[fieldName]);
  }
  return changes;
}

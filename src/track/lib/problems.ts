import type { ActionResult } from "../action";

type FailedResult = Extract<ActionResult<unknown>, { ok: false }>;

/**
 * Clear messages for the API's stable problem codes (API.md). They are translation keys; a code that is not listed shows the
 * API's own `detail`.
 */
export const PROBLEM_MESSAGES: Record<string, string> = {
  EMAIL_IN_USE: "An account with this email already exists.",
  EMPLOYEE_CODE_IN_USE: "This employee code is already in use.",
  MANAGER_NOT_FOUND: "Choose a manager from this business.",
  MANAGER_INACTIVE: "The chosen manager is deactivated. Choose an active manager.",
  MANAGER_ROLE_REQUIRED: "The chosen manager needs the Manager role. Change their role first.",
  MANAGER_IS_SELF: "An employee cannot be their own manager.",
  MANAGER_CYCLE: "The chosen manager reports to this employee, so the reporting line would go round in a circle.",
  MANAGER_HAS_REPORTS: "This manager still has active reports. Give them another manager first.",
  ROLE_NOT_ASSIGNABLE: "This role cannot be given here: an employee is an Employee or a Manager, and the owner stays the owner.",
  CANNOT_DEACTIVATE_SELF: "You cannot deactivate your own account.",
  CANNOT_DISABLE_OWN_LOGIN: "You cannot switch off your own sign-in.",
  LAST_ACTIVE_OWNER: "The business must keep at least one active owner.",
  BUSINESS_SUSPENDED: "Your company's access to JurisTrack is suspended. Please contact support.",
  // time events (POST /me/time-events): the state changed elsewhere (another tab or device) or the button was out of date
  WORKDAY_NOT_STARTED: "Your workday has not started yet. Select Start work first.",
  NOT_ON_BREAK: "You are not on a break any more. Your timer has been refreshed.",
  BREAK_IN_PROGRESS: "You are on a break. Select Back to work before ending your workday.",
  TIME_RECORD_INCONSISTENT: "Your time record is in an unexpected state. Please contact your business owner to review it.",
  // time corrections by a manager or the owner (PATCH /workdays/{workdayId}/work-sessions|break-sessions/{sessionId}, PUT /workdays/{workdayId}/status)
  CANNOT_CORRECT_OWN_TIME: "You cannot correct your own time. Ask your manager or the owner to do it.",
  TIME_INTERVAL_OVERLAP: "The corrected interval overlaps another work or break interval. Choose times that do not overlap.",
  WORKDAY_MUST_START_WITH_WORK: "A workday must begin with a work interval: a break cannot come first.",
  INTERVAL_STILL_RUNNING: "This interval is still running. Close the workday instead of setting an end time.",
  CORRECTION_OUT_OF_RANGE: "Choose a time on the workday's date or the day after, in the business time zone. To close a forgotten shift, give the time it really ended.",
  WORKDAY_OVERLAP: "The corrected time overlaps another workday of this person. Their hours would count twice.",
  // shifts (PUT /shifts/{shiftId}/status, PUT /employees/{employeeId}/shift)
  SHIFT_IN_USE: "Employees still work this shift. Move them to another shift first, then deactivate it.",
  DEFAULT_SHIFT_REQUIRED: "The default shift cannot be deactivated: every new employee starts on it.",
  SHIFT_EFFECTIVE_DATE_IN_PAST: "Choose today or a later date: a shift change cannot rewrite past days.",
  // roster (PUT/DELETE /employees/{employeeId}/schedule-entries)
  SCHEDULE_DATE_TOO_FAR: "This date is too far ahead. Choose a nearer date.",
  SCHEDULE_DATE_HAS_WORKDAY: "This date already has a recorded workday, so its roster entry cannot be changed. Correct the workday instead.",
  SHIFT_NOT_FOUND: "This shift does not exist in your business.",
  SHIFT_INACTIVE: "This shift is deactivated. Reactivate it first or choose another shift.",
  SHIFT_NAME_IN_USE: "A shift with this name already exists.",
  // reports (GET /reports/workdays as CSV): more rows than one file may hold
  EXPORT_TOO_LARGE: "This export has too many rows for one file. Narrow the date range or choose fewer people, then export again.",
  // any write: the request body is above the API's limit (64 KB)
  PAYLOAD_TOO_LARGE: "The request is too large.",
  // linking a business to JurisOne (PUT /businesses/{businessId}/jurisone-link)
  BUSINESS_ALREADY_LINKED: "This business is already linked to another JurisOne business. Unlink it first.",
  JURISONE_BUSINESS_IN_USE: "Another business is already linked to that JurisOne business.",
};

/** The problem code of an open workday whose intervals do not match its status (an administrator has to correct it). */
export const TIME_RECORD_INCONSISTENT = "TIME_RECORD_INCONSISTENT";

/** The form field each code belongs to (where its message is shown). */
export const PROBLEM_FIELDS: Record<string, string> = {
  EMAIL_IN_USE: "email",
  EMPLOYEE_CODE_IN_USE: "employeeCode",
  MANAGER_NOT_FOUND: "managerId",
  MANAGER_INACTIVE: "managerId",
  MANAGER_ROLE_REQUIRED: "managerId",
  MANAGER_IS_SELF: "managerId",
  MANAGER_CYCLE: "managerId",
  MANAGER_HAS_REPORTS: "role",
  ROLE_NOT_ASSIGNABLE: "role",
  SHIFT_EFFECTIVE_DATE_IN_PAST: "effectiveFrom",
  SHIFT_NAME_IN_USE: "name",
};

/** The message to show for a failed write: the clear text of its code, else the API's `detail`. */
export function problemMessage(result: FailedResult, t: (text: string) => string): string {
  const knownMessage = result.code ? PROBLEM_MESSAGES[result.code] : undefined;
  return knownMessage ? t(knownMessage) : result.error;
}

export interface FormErrors {
  /** Message per form field name. */
  fields: Record<string, string>;
  /** What belongs to no field of the form (shown above the buttons), or null. */
  general: string | null;
}

/**
 * Spreads a failed write over a form: each 400 field error, and each code with a field (`PROBLEM_FIELDS`, overridable per form,
 * e.g. the owner's email is `owner.email` on the new-business form), goes next to that field when the form has it; the rest is general.
 */
export function formErrorsOf(result: FailedResult, formFields: readonly string[], t: (text: string) => string, fieldOfCode: Record<string, string> = PROBLEM_FIELDS): FormErrors {
  const fields: Record<string, string> = {};
  for (const fieldError of result.errors ?? []) {
    if (formFields.includes(fieldError.field) && !fields[fieldError.field]) fields[fieldError.field] = fieldError.message;
  }
  const codeField = result.code ? fieldOfCode[result.code] : undefined;
  if (codeField && formFields.includes(codeField)) fields[codeField] = problemMessage(result, t);
  const unplacedFieldError = (result.errors ?? []).find((fieldError) => !formFields.includes(fieldError.field));
  if (unplacedFieldError) return { fields, general: unplacedFieldError.message };
  return { fields, general: Object.keys(fields).length > 0 ? null : problemMessage(result, t) };
}

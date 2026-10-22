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
  LAST_ACTIVE_OWNER: "The business must keep at least one active owner.",
  BUSINESS_SUSPENDED: "Your company's access to JurisTrack is suspended. Please contact support.",
  FORBIDDEN: "You don't have permission to do that.",
  // time events (POST /me/time-events): the state changed elsewhere (another tab or device) or the button was out of date
  WORKDAY_NOT_STARTED: "Your workday has not started yet. Select Start work first.",
  NOT_ON_BREAK: "You are not on a break any more. Your timer has been refreshed.",
  BREAK_IN_PROGRESS: "You are on a break. Select Back to work before ending your workday.",
  TIME_RECORD_INCONSISTENT: "Your time record is in an unexpected state. Please contact an administrator to review it.",
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

/**
 * Readable names for the audit log's machine values (backend API.md, "Audit log" > "Catalogue"). Every label is an English
 * translation key; `t()` shows it in the reader's language. An action the catalogue does not list (a newer backend) still reads
 * well: its dotted name is turned into words.
 */

/** Every action of the catalogue, with its English label. Keep in step with the backend's `AuditAction`. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "auth.sign_in_code_requested": "Sign-in code requested",
  "auth.signed_in": "Signed in",
  "auth.sign_in_failed": "Sign-in failed",
  "auth.sign_in_code_burnt": "Sign-in code used up",
  "auth.rate_limited": "Sign-in rate limit hit",
  "auth.signed_out": "Signed out",
  "auth.session_revoked_refresh_reuse": "Session ended: refresh token reused",
  "auth.session_refresh_failed": "Session refresh refused",
  "security.access_denied": "Access denied",
  "security.suspended_business_request": "Request of a suspended business",
  "security.invalid_session_cookie": "Invalid session cookie",
  "security.out_of_scope_access": "Access outside the allowed people refused",
  "security.cross_site_request_blocked": "Cross-site request blocked",
  "access.employee_list_viewed": "Employee list viewed",
  "access.employee_viewed": "Employee viewed",
  "access.business_list_viewed": "Business list viewed",
  "access.business_viewed": "Business viewed",
  "access.team_member_viewed": "Team member viewed",
  "access.team_member_workdays_viewed": "Team member's workdays viewed",
  "access.workday_viewed": "Workday viewed",
  "reports.viewed": "Reports viewed",
  "reports.exported": "Report exported",
  "audit.exported": "Audit log exported",
  "business.created": "Business created",
  "business.updated": "Business updated",
  "business.suspended": "Business suspended",
  "business.reactivated": "Business reactivated",
  "employee.created": "Employee added",
  "employee.updated": "Employee updated",
  "employee.deactivated": "Employee deactivated",
  "employee.reactivated": "Employee reactivated",
  "employee.change_refused": "Employee change refused",
  "employee.shift_changed": "Employee shift changed",
  "shift.created": "Shift created",
  "shift.updated": "Shift updated",
  "shift.status_changed": "Shift activated or deactivated",
  "schedule.entry_set": "Roster day set",
  "schedule.entry_removed": "Roster day cleared",
  "time.workday_started": "Workday started",
  "time.workday_reopened": "Workday reopened",
  "time.break_started": "Break started",
  "time.work_resumed": "Work resumed",
  "time.workday_ended": "Workday ended",
  "time.event_failed": "Time event failed",
  "workday.closed": "Workday closed",
  "time.session_adjusted": "Time interval corrected",
  "time.workday_closed": "Workday closed by a manager",
  "time.correction_refused": "Time correction refused",
  "integration.business_provisioned": "Business created from JurisOne",
  "integration.business_linked": "Business linked to JurisOne",
  "integration.business_unlinked": "Business unlinked from JurisOne",
  "integration.business_updated": "Business updated from JurisOne",
  "integration.user_provisioned": "User created from JurisOne",
  "integration.user_linked": "User linked to JurisOne",
  "integration.user_updated": "User updated from JurisOne",
  "integration.token_rejected": "JurisOne token rejected",
  "integration.user_refused": "JurisOne user refused",
};

/** The groups of actions, filtered with the API's action prefix (`time.`); the label is a translation key. */
export const AUDIT_ACTION_GROUPS: { prefix: string; label: string }[] = [
  { prefix: "auth.", label: "Sign-in and sessions" },
  { prefix: "security.", label: "Security" },
  { prefix: "access.", label: "Viewing other people's data" },
  { prefix: "reports.", label: "Reports" },
  { prefix: "audit.", label: "Audit log exports" },
  { prefix: "business.", label: "Business changes" },
  { prefix: "employee.", label: "Employee changes" },
  { prefix: "shift.", label: "Shift changes" },
  { prefix: "schedule.", label: "Roster changes" },
  { prefix: "time.", label: "Time tracking" },
  { prefix: "workday.", label: "Workdays closed by others" },
  { prefix: "integration.", label: "JurisOne integration" },
];

export const AUDIT_CATEGORIES = ["auth", "people", "business", "time", "security", "access", "integration", "audit"] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

/** Translation keys of the categories. */
export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  auth: "Sign-in",
  people: "People",
  business: "Business",
  time: "Time",
  security: "Security",
  access: "Access",
  integration: "Integration",
  audit: "Audit",
};

export const AUDIT_OUTCOMES = ["SUCCESS", "DENIED", "FAILED"] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

/** Translation keys of the outcomes. */
export const AUDIT_OUTCOME_LABELS: Record<AuditOutcome, string> = {
  SUCCESS: "Success",
  DENIED: "Denied",
  FAILED: "Failed",
};

/** The design chip colour of each outcome. */
export const AUDIT_OUTCOME_CHIPS: Record<AuditOutcome, string> = { SUCCESS: "ok", DENIED: "warn", FAILED: "bad" };

export const AUDIT_SOURCES = ["STANDALONE", "INTEGRATION", "SYSTEM"] as const;
export type AuditSource = (typeof AUDIT_SOURCES)[number];

/** Translation keys of the sources (where the request came from). */
export const AUDIT_SOURCE_LABELS: Record<AuditSource, string> = {
  STANDALONE: "JurisTrack",
  INTEGRATION: "JurisOne",
  SYSTEM: "System",
};

/** The kinds of record an entry is about (`entityType`), with their translation keys. */
export const AUDIT_ENTITY_TYPE_LABELS: Record<string, string> = {
  user: "Person",
  business: "Business",
  workday: "Workday",
  work_session: "Work interval",
  break_session: "Break interval",
  report: "Report",
  session: "Session",
  request: "Request",
  audit_log: "Audit log",
};

/** `employee.change_refused` -> "Employee change refused": the fallback label of an action the catalogue does not list. */
export function humanizeAction(action: string): string {
  const words = action.replace(/[._]+/g, " ").trim().replace(/\s+/g, " ");
  return words ? words[0].toUpperCase() + words.slice(1) : action;
}

/** The readable label of an action, translated; an unknown action gets its humanized name (not translated, it is no key). */
export function actionLabel(action: string, t: (text: string) => string): string {
  const label = AUDIT_ACTION_LABELS[action];
  return label ? t(label) : humanizeAction(action);
}

/**
 * Who did it, as the log shows it: the person's name; the platform admin when the actor is outside the viewer's business (no
 * name, role SUPER_ADMIN); "System" for work without a request; "Not signed in" for a request without a session (a sign-in attempt).
 */
export function actorName(actor: { name: string | null; role: string | null } | null, source: string, t: (text: string) => string): string {
  if (!actor) return source === "SYSTEM" ? t("System") : t("Not signed in");
  if (actor.name) return actor.name;
  return actor.role === "SUPER_ADMIN" ? t("Platform admin") : t("Unknown person");
}

/** A translated label from one of the label maps, or the raw value when the map does not know it. */
export function labelOf(labels: Record<string, string>, value: string | null | undefined, t: (text: string) => string): string {
  if (!value) return "—";
  const label = labels[value];
  return label ? t(label) : value;
}

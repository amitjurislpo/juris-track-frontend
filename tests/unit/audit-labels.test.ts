import { describe, expect, it } from "vitest";
import { HINDI_MESSAGES } from "@/standalone/i18n/translate";
import {
  actionLabel,
  actorName,
  AUDIT_ACTION_GROUPS,
  AUDIT_ACTION_LABELS,
  AUDIT_CATEGORY_LABELS,
  AUDIT_ENTITY_TYPE_LABELS,
  AUDIT_OUTCOME_LABELS,
  AUDIT_SOURCE_LABELS,
  humanizeAction,
  labelOf,
} from "@/track/lib/audit/audit-labels";
import { DATE_PRESET_LABELS } from "@/track/lib/audit/audit-query";

/** Every action of the backend's catalogue (API.md "Audit log" > "Catalogue", the backend's AuditAction enum). */
const CATALOGUE_ACTIONS = [
  "auth.sign_in_code_requested", "auth.signed_in", "auth.sign_in_failed", "auth.sign_in_code_burnt", "auth.rate_limited", "auth.signed_out",
  "auth.session_revoked_refresh_reuse", "auth.session_refresh_failed",
  "security.access_denied", "security.suspended_business_request", "security.invalid_session_cookie", "security.cross_site_request_blocked", "security.out_of_scope_access",
  "access.employee_list_viewed", "access.employee_viewed", "access.business_list_viewed", "access.business_viewed",
  "access.team_member_viewed", "access.team_member_workdays_viewed", "access.workday_viewed", "reports.viewed", "reports.exported",
  "audit.exported",
  "business.created", "business.updated", "business.suspended", "business.reactivated",
  "employee.created", "employee.updated", "employee.deactivated", "employee.reactivated", "employee.login_disabled", "employee.login_enabled",
  "employee.change_refused",
  "time.workday_started", "time.workday_reopened", "time.break_started", "time.work_resumed", "time.workday_ended", "time.event_failed",
  "workday.closed", "time.session_adjusted", "time.workday_closed", "time.correction_refused",
  "integration.business_provisioned", "integration.business_linked", "integration.business_unlinked", "integration.business_updated",
  "integration.user_provisioned", "integration.user_linked", "integration.user_updated", "integration.token_rejected", "integration.user_refused",
];

const english = (text: string) => text;
const hindi = (text: string) => HINDI_MESSAGES[text] ?? text;

describe("audit action labels", () => {
  it("label every action of the catalogue, and only those", () => {
    expect(CATALOGUE_ACTIONS).toHaveLength(53);
    for (const action of CATALOGUE_ACTIONS) expect(AUDIT_ACTION_LABELS[action], action).toBeTruthy();
    expect(Object.keys(AUDIT_ACTION_LABELS).sort()).toEqual([...CATALOGUE_ACTIONS].sort());
  });

  it("have a Hindi translation for every action label", () => {
    for (const action of CATALOGUE_ACTIONS) expect(HINDI_MESSAGES[AUDIT_ACTION_LABELS[action]], action).toBeTruthy();
  });

  it("are unique, so two actions never read the same", () => {
    const labels = Object.values(AUDIT_ACTION_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("put every action in exactly one group", () => {
    for (const action of CATALOGUE_ACTIONS) {
      expect(AUDIT_ACTION_GROUPS.filter((group) => action.startsWith(group.prefix)), action).toHaveLength(1);
    }
    for (const group of AUDIT_ACTION_GROUPS) expect(group.prefix).toMatch(/^[a-z_]+\.$/);
  });

  it("read the label in the reader's language", () => {
    expect(actionLabel("time.break_started", english)).toBe("Break started");
    expect(actionLabel("auth.sign_in_code_requested", english)).toBe("Sign-in code requested");
    expect(actionLabel("employee.updated", english)).toBe("Employee updated");
    expect(actionLabel("time.break_started", hindi)).toBe(HINDI_MESSAGES["Break started"]);
  });

  it("fall back to the humanized dotted name for an action the catalogue does not list", () => {
    expect(humanizeAction("reports.export_created")).toBe("Reports export created");
    expect(humanizeAction("team.member__added")).toBe("Team member added");
    expect(actionLabel("reports.export_created", hindi)).toBe("Reports export created");
    expect(humanizeAction("")).toBe("");
  });
});

describe("audit category, outcome, source, record type and date preset labels", () => {
  it("have Hindi for every label", () => {
    const maps = [AUDIT_CATEGORY_LABELS, AUDIT_OUTCOME_LABELS, AUDIT_SOURCE_LABELS, AUDIT_ENTITY_TYPE_LABELS, DATE_PRESET_LABELS];
    for (const labels of maps) for (const label of Object.values(labels)) expect(HINDI_MESSAGES[label], label).toBeTruthy();
    for (const group of AUDIT_ACTION_GROUPS) expect(HINDI_MESSAGES[group.label], group.label).toBeTruthy();
  });

  it("cover the API's categories, outcomes and sources", () => {
    expect(Object.keys(AUDIT_CATEGORY_LABELS).sort()).toEqual(["access", "audit", "auth", "business", "integration", "people", "security", "time"]);
    expect(Object.keys(AUDIT_OUTCOME_LABELS)).toEqual(["SUCCESS", "DENIED", "FAILED"]);
    expect(Object.keys(AUDIT_SOURCE_LABELS)).toEqual(["STANDALONE", "INTEGRATION", "SYSTEM"]);
  });

  it("show an unknown value as it is and a missing one as a dash", () => {
    expect(labelOf(AUDIT_OUTCOME_LABELS, "DENIED", english)).toBe("Denied");
    expect(labelOf(AUDIT_CATEGORY_LABELS, "reports", english)).toBe("reports");
    expect(labelOf(AUDIT_CATEGORY_LABELS, null, english)).toBe("—");
  });
});

describe("actorName", () => {
  it("names the person, the platform admin, the system or nobody", () => {
    expect(actorName({ name: "Asha Rao", role: "EMPLOYEE" }, "STANDALONE", english)).toBe("Asha Rao");
    expect(actorName({ name: null, role: "SUPER_ADMIN" }, "STANDALONE", english)).toBe("Platform admin");
    expect(actorName({ name: null, role: "ADMIN" }, "STANDALONE", english)).toBe("Unknown person");
    expect(actorName(null, "SYSTEM", english)).toBe("System");
    expect(actorName(null, "STANDALONE", english)).toBe("Not signed in");
  });
});

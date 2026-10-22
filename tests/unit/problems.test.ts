import { describe, expect, it } from "vitest";
import { HINDI_MESSAGES } from "@/standalone/i18n/translate";
import { formErrorsOf, PROBLEM_FIELDS, PROBLEM_MESSAGES, problemMessage } from "@/track/lib/problems";

const translate = (text: string) => `[${text}]`;
const failure = (fields: { error?: string; code?: string; errors?: { field: string; message: string }[] }) => ({ ok: false as const, error: fields.error ?? "detail", ...fields });

describe("problemMessage", () => {
  it("gives the clear, translated text of a known code", () => {
    expect(problemMessage(failure({ code: "MANAGER_CYCLE" }), translate)).toBe(`[${PROBLEM_MESSAGES.MANAGER_CYCLE}]`);
    expect(problemMessage(failure({ code: "MANAGER_HAS_REPORTS" }), translate)).toContain("another manager first");
  });

  it("falls back to the API's detail for an unknown or missing code", () => {
    expect(problemMessage(failure({ error: "Something odd.", code: "SOMETHING_NEW" }), translate)).toBe("Something odd.");
    expect(problemMessage(failure({ error: "Plain." }), translate)).toBe("Plain.");
  });

  it("has a message for every code the employee and business pages show", () => {
    for (const code of ["MANAGER_CYCLE", "MANAGER_HAS_REPORTS", "MANAGER_NOT_FOUND", "MANAGER_INACTIVE", "MANAGER_ROLE_REQUIRED", "MANAGER_IS_SELF",
      "EMPLOYEE_CODE_IN_USE", "EMAIL_IN_USE", "CANNOT_DEACTIVATE_SELF", "ROLE_NOT_ASSIGNABLE", "LAST_ACTIVE_OWNER", "BUSINESS_SUSPENDED"]) {
      expect(PROBLEM_MESSAGES[code], code).toBeTruthy();
    }
  });

  it("every problem message has its Hindi", () => {
    for (const message of Object.values(PROBLEM_MESSAGES)) expect(HINDI_MESSAGES[message], message).toBeTruthy();
  });
});

describe("formErrorsOf", () => {
  const employeeFields = ["employeeCode", "firstName", "lastName", "email", "role", "managerId"];

  it("puts each 400 field error next to its field, first message per field", () => {
    const result = failure({ code: "VALIDATION_FAILED", errors: [{ field: "firstName", message: "First name is required." }, { field: "email", message: "Enter a valid email." }, { field: "email", message: "second" }] });
    expect(formErrorsOf(result, employeeFields, translate)).toEqual({ fields: { firstName: "First name is required.", email: "Enter a valid email." }, general: null });
  });

  it("shows a field error the form has no field for as the general message", () => {
    const result = failure({ code: "VALIDATION_FAILED", errors: [{ field: "firstName", message: "First name is required." }, { field: "body", message: "Send a JSON object." }] });
    expect(formErrorsOf(result, employeeFields, translate)).toEqual({ fields: { firstName: "First name is required." }, general: "Send a JSON object." });
  });

  it("puts a code that belongs to a field next to it", () => {
    expect(formErrorsOf(failure({ code: "MANAGER_CYCLE" }), employeeFields, translate)).toEqual({ fields: { managerId: `[${PROBLEM_MESSAGES.MANAGER_CYCLE}]` }, general: null });
    expect(formErrorsOf(failure({ code: "MANAGER_HAS_REPORTS" }), employeeFields, translate).fields).toHaveProperty("role");
    expect(PROBLEM_FIELDS.EMPLOYEE_CODE_IN_USE).toBe("employeeCode");
  });

  it("lets a form say where a code belongs (the owner's email on the new-business form)", () => {
    const businessFields = ["name", "timeZone", "owner.firstName", "owner.lastName", "owner.email", "owner.employeeCode"];
    expect(formErrorsOf(failure({ code: "EMAIL_IN_USE" }), businessFields, translate, { EMAIL_IN_USE: "owner.email" }))
      .toEqual({ fields: { "owner.email": `[${PROBLEM_MESSAGES.EMAIL_IN_USE}]` }, general: null });
  });

  it("shows a code without a field on the form, or an unknown one, as the general message", () => {
    expect(formErrorsOf(failure({ code: "CANNOT_DEACTIVATE_SELF" }), employeeFields, translate)).toEqual({ fields: {}, general: `[${PROBLEM_MESSAGES.CANNOT_DEACTIVATE_SELF}]` });
    expect(formErrorsOf(failure({ error: "Not found.", code: "NOT_FOUND" }), employeeFields, translate)).toEqual({ fields: {}, general: "Not found." });
  });
});

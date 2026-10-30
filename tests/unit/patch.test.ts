import { describe, expect, it } from "vitest";
import { businessSettingsChanges, toBusinessSettingsForm } from "@/track/lib/business-settings";
import { EMPTY_EMPLOYEE_FORM, employeeChanges, newEmployeeBody, toEmployeeForm } from "@/track/lib/employee-form";
import { changedFields } from "@/track/lib/patch";

describe("changedFields (PATCH bodies)", () => {
  it("is empty when nothing changed, also after trimming", () => {
    expect(changedFields({ name: "Asha", code: "A1" }, { name: "  Asha ", code: "A1" })).toEqual({});
  });

  it("sends only the changed fields, trimmed", () => {
    expect(changedFields({ name: "Asha", code: "A1" }, { name: " Asha Rao ", code: "A1" })).toEqual({ name: "Asha Rao" });
  });

  it("sends null for an emptied field that may be cleared, and an empty string for any other", () => {
    expect(changedFields({ code: "A1", name: "Asha" }, { code: "  ", name: "" }, ["code"])).toEqual({ code: null, name: "" });
  });

  it("treats an empty original and an empty edit of a clearable field as unchanged", () => {
    expect(changedFields({ code: "" }, { code: " " }, ["code"])).toEqual({});
  });

  it("compares lists item by item and keeps numbers and booleans", () => {
    expect(changedFields({ zones: ["Asia/Kolkata"], hours: 14, isOn: true }, { zones: ["Asia/Kolkata"], hours: 14, isOn: true })).toEqual({});
    expect(changedFields({ zones: ["Asia/Kolkata"], hours: 14 }, { zones: ["Asia/Kolkata", "Europe/London"], hours: 12 })).toEqual({ zones: ["Asia/Kolkata", "Europe/London"], hours: 12 });
    expect(changedFields({ zones: ["A", "B"] }, { zones: ["B", "A"] })).toEqual({ zones: ["B", "A"] });
  });
});

describe("employee form", () => {
  const employee = { employeeCode: "E-7", firstName: "Asha", lastName: "Rao", email: "asha@example.com", role: "EMPLOYEE" as const, managerId: "manager-1" };

  it("builds the POST body without an empty code or manager", () => {
    expect(newEmployeeBody({ ...EMPTY_EMPLOYEE_FORM, firstName: " Asha ", lastName: "Rao", email: " asha@example.com " }))
      .toEqual({ firstName: "Asha", lastName: "Rao", email: "asha@example.com", role: "EMPLOYEE" });
    expect(newEmployeeBody({ ...EMPTY_EMPLOYEE_FORM, firstName: "A", lastName: "B", email: "a@b.co", role: "MANAGER", employeeCode: "M1", managerId: "owner-1" }))
      .toEqual({ firstName: "A", lastName: "B", email: "a@b.co", role: "MANAGER", employeeCode: "M1", managerId: "owner-1" });
  });

  it("turns null code and manager into empty form values", () => {
    expect(toEmployeeForm({ ...employee, employeeCode: null, managerId: null })).toMatchObject({ employeeCode: "", managerId: "" });
  });

  it("PATCHes only what changed; clearing the manager or the code sends null", () => {
    const original = toEmployeeForm(employee);
    expect(employeeChanges(original, { ...original })).toEqual({});
    expect(employeeChanges(original, { ...original, managerId: "" })).toEqual({ managerId: null });
    expect(employeeChanges(original, { ...original, employeeCode: "" })).toEqual({ employeeCode: null });
    expect(employeeChanges(original, { ...original, role: "MANAGER", managerId: "manager-2" })).toEqual({ role: "MANAGER", managerId: "manager-2" });
  });
});

describe("business settings form", () => {
  const settings = { name: "Acme", timeZone: "Asia/Kolkata", staleWorkdayHours: 14, displayTimeZones: ["Asia/Kolkata", "America/New_York"] };

  it("sends only the changed settings, with the hours as a number", () => {
    const original = toBusinessSettingsForm(settings);
    expect(businessSettingsChanges(original, original, 12)).toEqual({ changes: {}, fieldErrors: {} });
    expect(businessSettingsChanges(original, { ...original, staleWorkdayHours: "12", displayTimeZones: [] }, 12))
      .toEqual({ changes: { staleWorkdayHours: 12, displayTimeZones: [] }, fieldErrors: {} });
  });

  it("refuses a changed stale hours value below the minimum (longest shift plus 3) and accepts exactly the minimum", () => {
    const original = toBusinessSettingsForm(settings);
    expect(businessSettingsChanges(original, { ...original, staleWorkdayHours: "11" }, 12).fieldErrors)
      .toEqual({ staleWorkdayHours: "Stale workday hours must be at least {minimum}: your longest shift plus 3 hours." });
    expect(businessSettingsChanges(original, { ...original, staleWorkdayHours: "12" }, 12)).toEqual({ changes: { staleWorkdayHours: 12 }, fieldErrors: {} });
    expect(businessSettingsChanges(original, { ...original, staleWorkdayHours: "27" }, 27).fieldErrors).toEqual({});
  });

  it("lets an older stored value below the minimum stay while other settings change", () => {
    const legacy = toBusinessSettingsForm({ ...settings, staleWorkdayHours: 10 });
    expect(businessSettingsChanges(legacy, { ...legacy, name: "Acme Ltd" }, 12)).toEqual({ changes: { name: "Acme Ltd" }, fieldErrors: {} });
    expect(businessSettingsChanges(legacy, { ...legacy, staleWorkdayHours: "11" }, 12).fieldErrors).toHaveProperty("staleWorkdayHours");
  });

  it("refuses an empty name, hours outside 1..48 or not whole, and more than 8 display zones before sending", () => {
    const original = toBusinessSettingsForm(settings);
    expect(businessSettingsChanges(original, { ...original, name: " " }, 12).fieldErrors).toHaveProperty("name");
    for (const hours of ["0", "49", "1.5", "", "abc"]) {
      expect(businessSettingsChanges(original, { ...original, staleWorkdayHours: hours }, 1).fieldErrors, hours).toHaveProperty("staleWorkdayHours");
    }
    for (const hours of ["1", "48"]) expect(businessSettingsChanges(original, { ...original, staleWorkdayHours: hours }, 1).fieldErrors).toEqual({});
    const nineZones = Array.from({ length: 9 }, (_, i) => `Etc/GMT+${i + 1}`);
    expect(businessSettingsChanges(original, { ...original, displayTimeZones: nineZones }, 12).fieldErrors).toHaveProperty("displayTimeZones");
  });
});

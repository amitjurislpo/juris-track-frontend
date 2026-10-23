import { describe, expect, it } from "vitest";
import { changedRowCount, diffRecords, formatAuditValue, isSameJson, LONG_VALUE_LENGTH } from "@/track/lib/audit/audit-diff";

describe("diffRecords", () => {
  it("marks changed, unchanged, added and removed fields of an update, in the record's order", () => {
    const before = { firstName: "Asha", role: "EMPLOYEE", managerId: "m-1", employeeCode: "E1" };
    const after = { firstName: "Asha", role: "MANAGER", managerId: null, isActive: true };
    expect(diffRecords(before, after)).toEqual([
      { field: "firstName", kind: "unchanged", before: "Asha", after: "Asha", isLong: false },
      { field: "role", kind: "changed", before: "EMPLOYEE", after: "MANAGER", isLong: false },
      { field: "managerId", kind: "changed", before: "m-1", after: "null", isLong: false },
      { field: "employeeCode", kind: "removed", before: "E1", isLong: false },
      { field: "isActive", kind: "added", after: "true", isLong: false },
    ]);
  });

  it("lists every field as added for a creation and as removed when there is no after", () => {
    expect(diffRecords(null, { name: "Orbit", staleWorkdayHours: 14 }).map((row) => [row.field, row.kind, row.after])).toEqual([
      ["name", "added", "Orbit"],
      ["staleWorkdayHours", "added", "14"],
    ]);
    expect(diffRecords({ status: "WORKING" }, null)).toEqual([{ field: "status", kind: "removed", before: "WORKING", isLong: false }]);
  });

  it("gives nothing when there is no record at all", () => {
    expect(diffRecords(null, null)).toEqual([]);
    expect(diffRecords(undefined, undefined)).toEqual([]);
  });

  it("compares nested values deeply, whatever the key order", () => {
    const rows = diffRecords({ filters: { status: "active", role: "ADMIN" }, list: [1, 2] }, { filters: { role: "ADMIN", status: "active" }, list: [1, 3] });
    expect(rows.map((row) => [row.field, row.kind])).toEqual([["filters", "unchanged"], ["list", "changed"]]);
    expect(changedRowCount(rows)).toBe(1);
  });

  it("compares records that are not objects as one value", () => {
    expect(diffRecords("a", "b")).toEqual([{ field: "", kind: "changed", before: "a", after: "b", isLong: false }]);
    expect(diffRecords([1], [1])).toEqual([{ field: "", kind: "unchanged", before: "[\n  1\n]", after: "[\n  1\n]", isLong: true }]);
    expect(diffRecords(null, 5)).toEqual([{ field: "", kind: "added", after: "5", isLong: false }]);
  });

  it("flags long and multi-line values so they start collapsed", () => {
    const longText = "x".repeat(LONG_VALUE_LENGTH + 1);
    const [longRow] = diffRecords({ note: "short" }, { note: longText });
    expect(longRow.isLong).toBe(true);
    const [nestedRow] = diffRecords({}, { details: { a: 1 } });
    expect(nestedRow).toMatchObject({ kind: "added", after: '{\n  "a": 1\n}', isLong: true });
    expect(diffRecords({ note: "x".repeat(LONG_VALUE_LENGTH) }, {})[0].isLong).toBe(false);
  });

  it("keeps markup and redacted values as plain text", () => {
    const [row] = diffRecords({ lastName: "<b>Rao</b>" }, { lastName: "<script>alert(1)</script>" });
    expect(row.before).toBe("<b>Rao</b>");
    expect(row.after).toBe("<script>alert(1)</script>");
    expect(diffRecords(null, { otp: "[redacted]" })[0].after).toBe("[redacted]");
  });

  it("keeps a field named like an Object prototype member", () => {
    expect(diffRecords({ constructor: 1 }, { constructor: 2, toString: "x" }).map((row) => [row.field, row.kind])).toEqual([
      ["constructor", "changed"],
      ["toString", "added"],
    ]);
  });
});

describe("formatAuditValue and isSameJson", () => {
  it("formats strings as they are and everything else as JSON", () => {
    expect(formatAuditValue("Asia/Kolkata")).toBe("Asia/Kolkata");
    expect(formatAuditValue(null)).toBe("null");
    expect(formatAuditValue(false)).toBe("false");
    expect(formatAuditValue(12.5)).toBe("12.5");
    expect(formatAuditValue(["Asia/Kolkata"])).toBe('[\n  "Asia/Kolkata"\n]');
    expect(formatAuditValue(undefined)).toBe("");
  });

  it("compares JSON deeply", () => {
    expect(isSameJson({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(isSameJson({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(isSameJson([1, 2], [2, 1])).toBe(false);
    expect(isSameJson(null, {})).toBe(false);
    expect(isSameJson("1", 1)).toBe(false);
  });
});

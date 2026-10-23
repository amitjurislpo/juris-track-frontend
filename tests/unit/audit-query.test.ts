import { describe, expect, it } from "vitest";
import {
  activeFilters,
  auditFilterNames,
  clearAllChanges,
  customRangeChanges,
  filterTimeZone,
  isExportTooLarge,
  isRequestId,
  presetDates,
  requestIdFilterChanges,
  selectedDatePreset,
  shortId,
  todayIn,
} from "@/track/lib/audit/audit-query";
import { auditLogExportPath, auditLogPath, auditLogsPath, businessSearchPath, employeeSearchPath } from "@/track/pages/audit-log/actions";

const ACTOR_ID = "6f1c2b9e-0d5a-4a0e-9a63-1f2e3d4c5b6a";

describe("audit log paths", () => {
  it("send the URL's filters, sorting and paging under the API's names, and nothing else", () => {
    const searchParams = { from: "2026-10-01", to: "2026-10-22", actorId: ACTOR_ID, action: "time.", outcome: "DENIED", sort: "action", sortDirection: "asc", page: "2", pageSize: "50", search: "rao", panel: "x" };
    expect(auditLogsPath(searchParams, false)).toBe(
      `/audit-logs?search=rao&sort=action&sortDirection=asc&page=2&pageSize=50&from=2026-10-01&to=2026-10-22&actorId=${ACTOR_ID}&action=time.&outcome=DENIED`,
    );
    expect(auditLogsPath({}, false)).toBe("/audit-logs");
  });

  it("send the business filter for the super admin only", () => {
    expect(auditLogsPath({ businessId: "none" }, true)).toBe("/audit-logs?businessId=none");
    expect(auditLogsPath({ businessId: "none" }, false)).toBe("/audit-logs");
    expect(auditFilterNames(true)).toContain("businessId");
    expect(auditFilterNames(false)).not.toContain("businessId");
  });

  it("export the same filter and sort as CSV, without paging", () => {
    const searchParams = { category: "people", sort: "outcome", page: "3", pageSize: "10", businessId: "none" };
    expect(auditLogExportPath(searchParams, false)).toBe("/audit-logs?sort=outcome&category=people&format=csv");
    expect(auditLogExportPath(searchParams, true)).toBe("/audit-logs?sort=outcome&category=people&businessId=none&format=csv");
    expect(auditLogExportPath({}, false)).toBe("/audit-logs?format=csv");
  });

  it("encode the entry id and search the pickers by name", () => {
    expect(auditLogPath(ACTOR_ID)).toBe(`/audit-logs/${ACTOR_ID}`);
    expect(auditLogPath("a/b")).toBe("/audit-logs/a%2Fb");
    expect(employeeSearchPath(" asha ")).toBe("/employees?search=asha&status=all&sort=name&pageSize=20");
    expect(employeeSearchPath("")).toBe("/employees?status=all&sort=name&pageSize=20");
    expect(businessSearchPath("orbit")).toBe("/businesses?search=orbit&sort=name&pageSize=20");
  });

  it("know the export cap", () => {
    expect(isExportTooLarge(10_000)).toBe(false);
    expect(isExportTooLarge(10_001)).toBe(true);
  });
});

describe("date presets", () => {
  const today = "2026-10-23";

  it("turn into inclusive from / to dates", () => {
    expect(presetDates("today", today)).toEqual({ from: today, to: today });
    expect(presetDates("last7Days", today)).toEqual({ from: "2026-10-17", to: today });
    expect(presetDates("last30Days", today)).toEqual({ from: "2026-09-24", to: today });
    expect(presetDates("all", today)).toEqual({ from: null, to: null });
  });

  it("are recognised from the URL; anything else is custom", () => {
    expect(selectedDatePreset({}, today)).toBe("all");
    expect(selectedDatePreset({ from: today, to: today }, today)).toBe("today");
    expect(selectedDatePreset({ from: "2026-10-17", to: today }, today)).toBe("last7Days");
    expect(selectedDatePreset({ from: "2026-09-24", to: today }, today)).toBe("last30Days");
    expect(selectedDatePreset({ from: "2026-10-01" }, today)).toBe("custom");
    expect(selectedDatePreset({ from: "2026-10-17", to: "2026-10-22" }, today)).toBe("custom");
  });

  it("leave a malformed custom end open", () => {
    expect(customRangeChanges("2026-10-01", "2026-10-05")).toEqual({ from: "2026-10-01", to: "2026-10-05" });
    expect(customRangeChanges("", "2026-13-40")).toEqual({ from: null, to: null });
  });

  it("use the business time zone for the owner and UTC for the super admin", () => {
    expect(filterTimeZone({ businessTimeZone: "Asia/Kolkata" })).toBe("Asia/Kolkata");
    expect(filterTimeZone({ businessTimeZone: null })).toBe("UTC");
    // 20:00 UTC on 22 October is already 23 October in India
    const evening = new Date("2026-10-22T20:00:00Z");
    expect(todayIn("Asia/Kolkata", evening)).toBe("2026-10-23");
    expect(todayIn("UTC", evening)).toBe("2026-10-22");
  });
});

describe("active filters", () => {
  it("list the date range once, then the others in toolbar order", () => {
    const searchParams = { to: "2026-10-22", outcome: "DENIED", search: "rao", actorId: ACTOR_ID, page: "2", sort: "action", businessId: "none" };
    expect(activeFilters(searchParams, false)).toEqual([
      { key: "date", clears: ["from", "to"] },
      { key: "search", clears: ["search"] },
      { key: "actorId", clears: ["actorId"] },
      { key: "outcome", clears: ["outcome"] },
    ]);
    expect(activeFilters(searchParams, true).map((filter) => filter.key)).toEqual(["date", "search", "actorId", "outcome", "businessId"]);
    expect(activeFilters({ sort: "action", page: "3" }, true)).toEqual([]);
  });

  it("are all cleared by Clear all, which keeps the sort", () => {
    const changes = clearAllChanges(true);
    expect(changes.search).toBeNull();
    expect(changes.from).toBeNull();
    expect(changes.businessId).toBeNull();
    expect("sort" in changes).toBe(false);
    expect("businessId" in clearAllChanges(false)).toBe(false);
  });
});

describe("request ids", () => {
  it("accept what the API keeps as a request id", () => {
    expect(isRequestId(ACTOR_ID)).toBe(true);
    expect(isRequestId("jurisone:req-42.a_b")).toBe(true);
    expect(isRequestId("x".repeat(64))).toBe(true);
    expect(isRequestId("x".repeat(65))).toBe(false);
    expect(isRequestId("has space")).toBe(false);
    expect(isRequestId("")).toBe(false);
    expect(isRequestId(null)).toBe(false);
  });

  it("filter the log by one request through the search, clearing every other filter", () => {
    expect(requestIdFilterChanges("req-1", false)).toEqual({ ...clearAllChanges(false), search: "req-1" });
    expect(requestIdFilterChanges("bad id", false)).toBeNull();
  });

  it("shorten long ids for narrow columns", () => {
    expect(shortId(ACTOR_ID)).toBe("6f1c2b9e…");
    expect(shortId("req-42")).toBe("req-42");
    expect(shortId("0123456789")).toBe("0123456789");
    expect(shortId(null)).toBe("—");
  });
});

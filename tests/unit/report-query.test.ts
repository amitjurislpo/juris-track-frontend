import { describe, expect, it } from "vitest";
import {
  clearFiltersChanges,
  defaultSortOf,
  employeeNamePath,
  employeePickerPath,
  exportFallbackFileName,
  hasActiveFilters,
  reportPath,
  resolvedReportRange,
  scopeChoices,
  selectedReportRange,
  selectedScope,
  selectedStatuses,
  selectedView,
  summaryReportPath,
  summaryRowLabel,
  toggleStatusChange,
  viewSearchChanges,
  workdayExportPath,
  workdayReportPath,
} from "@/track/lib/report-query";
import { rangeSearchChanges } from "@/track/lib/workday-history-query";

const EMPLOYEE_ID = "0b6e1f9a-3c1d-4e55-9a51-1f0f2a3b4c5d";
const MANAGER_ID = "7d1c2b3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const translate = (text: string) => `«${text}»`;

describe("reports: the workdays endpoint's path", () => {
  it("leaves the defaults out (range week, the role's scope, every status)", () => {
    expect(workdayReportPath({})).toBe("/reports/workdays");
    expect(workdayReportPath({ range: "week" })).toBe("/reports/workdays");
  });

  it("sends every filter under the API's own names", () => {
    expect(workdayReportPath({ range: "month", scope: "indirect", employeeId: EMPLOYEE_ID, managerId: MANAGER_ID, status: "WORKING,NOT_ENDED", search: " asha " }))
      .toBe(`/reports/workdays?range=month&scope=indirect&employeeId=${EMPLOYEE_ID}&managerId=${MANAGER_ID}&status=WORKING%2CNOT_ENDED&search=asha`);
  });

  it("sends from / to only with a custom range and only well-formed dates", () => {
    expect(workdayReportPath({ range: "custom", from: "2026-09-01", to: "2026-10-05" })).toBe("/reports/workdays?range=custom&from=2026-09-01&to=2026-10-05");
    expect(workdayReportPath({ range: "today", from: "2026-09-01", to: "2026-10-05" })).toBe("/reports/workdays?range=today");
    expect(workdayReportPath({ range: "custom", from: "2026-02-30", to: "later" })).toBe("/reports/workdays?range=custom");
  });

  it("drops what the API would refuse: an unknown range, scope, status, a malformed id", () => {
    expect(workdayReportPath({ range: "decade", scope: "galaxy", status: "ASLEEP", employeeId: "42", managerId: "x" })).toBe("/reports/workdays");
    // a known scope goes through even when the role may not use it: the API answers 403 and the page explains it
    expect(workdayReportPath({ scope: "ALL" })).toBe("/reports/workdays?scope=all");
  });

  it("normalises the statuses: any case, each once, in a fixed order", () => {
    expect(workdayReportPath({ status: "not_ended, working,WORKING,bogus" })).toBe("/reports/workdays?status=WORKING%2CNOT_ENDED");
  });

  it("keeps sorting and paging of the workdays, and drops a sort key of another view", () => {
    expect(workdayReportPath({ sort: "productiveSeconds", sortDirection: "asc", page: "3", pageSize: "10" }))
      .toBe("/reports/workdays?sort=productiveSeconds&sortDirection=asc&page=3&pageSize=10");
    expect(workdayReportPath({ sort: "label", sortDirection: "sideways", page: "1" })).toBe("/reports/workdays");
  });
});

describe("reports: the summaries endpoint's path", () => {
  it("always names groupBy and shares the filters", () => {
    expect(summaryReportPath({}, "employee")).toBe("/reports/summaries?groupBy=employee");
    expect(summaryReportPath({ range: "yesterday", status: "DAY_ENDED", search: "li" }, "manager"))
      .toBe("/reports/summaries?groupBy=manager&range=yesterday&status=DAY_ENDED&search=li");
  });

  it("keeps the summary sort keys and drops the workday ones", () => {
    expect(summaryReportPath({ sort: "averageProductiveSeconds", sortDirection: "desc", page: "2" }, "date"))
      .toBe("/reports/summaries?groupBy=date&sort=averageProductiveSeconds&sortDirection=desc&page=2");
    expect(summaryReportPath({ sort: "startedAt" }, "employee")).toBe("/reports/summaries?groupBy=employee");
  });

  it("picks the endpoint by the URL's view (groupBy)", () => {
    expect(reportPath({ range: "today" })).toBe("/reports/workdays?range=today");
    expect(reportPath({ groupBy: "date", range: "today" })).toBe("/reports/summaries?groupBy=date&range=today");
    expect(reportPath({ groupBy: "teams" })).toBe("/reports/workdays");
  });
});

describe("reports: the CSV export's path", () => {
  it("has the same filters and order, no paging, and the display time zone", () => {
    expect(workdayExportPath({ range: "custom", from: "2026-10-01", to: "2026-10-07", status: "WORKING", sort: "employee", sortDirection: "asc", page: "4", pageSize: "10" }, "America/New_York"))
      .toBe("/reports/workdays?range=custom&from=2026-10-01&to=2026-10-07&status=WORKING&sort=employee&sortDirection=asc&timeZone=America%2FNew_York");
  });

  it("exports the workdays even from a summary view (its sort key is not sent)", () => {
    expect(workdayExportPath({ groupBy: "manager", sort: "label" }, "Asia/Kolkata")).toBe("/reports/workdays?timeZone=Asia%2FKolkata");
  });

  it("knows the API's file name for a fallback", () => {
    expect(exportFallbackFileName("2026-10-19", "2026-10-23")).toBe("juristrack-2026-10-19-to-2026-10-23.csv");
  });
});

describe("reports: the employee picker's paths", () => {
  it("lists the people of the range and scope by name, with the picker's own search", () => {
    expect(employeePickerPath({ range: "month", scope: "indirect", managerId: MANAGER_ID, status: "WORKING", search: "x", employeeId: EMPLOYEE_ID }, " ben "))
      .toBe(`/reports/summaries?groupBy=employee&range=month&scope=indirect&managerId=${MANAGER_ID}&search=ben&sort=label&pageSize=20`);
    expect(employeePickerPath({}, "")).toBe("/reports/summaries?groupBy=employee&sort=label&pageSize=20");
  });

  it("looks up one chosen person's name in the same range and scope", () => {
    expect(employeeNamePath({ range: "today", scope: "direct", search: "x" }, EMPLOYEE_ID))
      .toBe(`/reports/summaries?groupBy=employee&range=today&scope=direct&employeeId=${EMPLOYEE_ID}&pageSize=1`);
  });
});

describe("reports: the URL state", () => {
  it("reads the view, the range and the statuses", () => {
    expect(selectedView({})).toBe("workdays");
    expect(selectedView({ groupBy: "manager" })).toBe("manager");
    expect(selectedView({ groupBy: "workdays" })).toBe("workdays");
    expect(selectedReportRange({})).toBe("week");
    expect(selectedReportRange({ range: "custom" })).toBe("custom");
    expect(selectedStatuses({ status: "on_break,DAY_ENDED,nope" })).toEqual(["ON_BREAK", "DAY_ENDED"]);
    expect(selectedStatuses({})).toEqual([]);
  });

  it("offers each role its scopes, the API's default first", () => {
    expect(scopeChoices("MANAGER")).toEqual(["direct", "indirect"]);
    expect(scopeChoices("ADMIN")).toEqual(["all", "direct", "indirect"]);
    expect(scopeChoices("EMPLOYEE")).toEqual([]);
    expect(selectedScope({}, "MANAGER")).toBe("direct");
    expect(selectedScope({ scope: "INDIRECT" }, "MANAGER")).toBe("indirect");
    expect(selectedScope({ scope: "all" }, "MANAGER")).toBe("direct");
    expect(selectedScope({}, "ADMIN")).toBe("all");
  });

  it("resolves the range as the API does (default this week, Monday to today)", () => {
    expect(resolvedReportRange({}, "2026-10-23")).toEqual({ preset: "week", from: "2026-10-19", to: "2026-10-23" });
    expect(resolvedReportRange({ range: "month" }, "2026-10-23")).toEqual({ preset: "month", from: "2026-10-01", to: "2026-10-23" });
    expect(resolvedReportRange({ range: "custom", from: "2026-10-10", to: "2026-10-01" }, "2026-10-23")).toEqual({ preset: "custom", from: "2026-10-01", to: "2026-10-10" });
  });

  it("toggles a status on and off", () => {
    expect(toggleStatusChange([], "NOT_ENDED")).toEqual({ status: "NOT_ENDED" });
    expect(toggleStatusChange(["NOT_ENDED"], "WORKING")).toEqual({ status: "WORKING,NOT_ENDED" });
    expect(toggleStatusChange(["WORKING"], "WORKING")).toEqual({ status: null });
  });

  it("switching the view drops the old sorting and paging", () => {
    expect(viewSearchChanges("employee")).toEqual({ groupBy: "employee", sort: null, sortDirection: null, page: null });
    expect(viewSearchChanges("workdays")).toEqual({ groupBy: null, sort: null, sortDirection: null, page: null });
  });

  it("Clear all removes every filter but keeps the view", () => {
    const changes = clearFiltersChanges();
    expect(Object.keys(changes).sort()).toEqual(["employeeId", "from", "managerId", "range", "scope", "search", "status", "to"]);
    expect(Object.values(changes).every((value) => value === null)).toBe(true);
    expect("groupBy" in changes).toBe(false);
  });

  it("knows when filters other than the defaults are in use", () => {
    expect(hasActiveFilters({}, "MANAGER")).toBe(false);
    expect(hasActiveFilters({ range: "week", scope: "direct", groupBy: "date", sort: "label" }, "MANAGER")).toBe(false);
    expect(hasActiveFilters({ scope: "all" }, "ADMIN")).toBe(false);
    expect(hasActiveFilters({ scope: "indirect" }, "MANAGER")).toBe(true);
    expect(hasActiveFilters({ range: "today" }, "ADMIN")).toBe(true);
    expect(hasActiveFilters({ status: "WORKING" }, "ADMIN")).toBe(true);
    expect(hasActiveFilters({ employeeId: EMPLOYEE_ID }, "ADMIN")).toBe(true);
    expect(hasActiveFilters({ search: "  " }, "ADMIN")).toBe(false);
  });

  it("the history and the reports share the range control, each with its own default range", () => {
    expect(rangeSearchChanges("week", undefined, undefined, "week")).toEqual({ range: null, from: null, to: null });
    expect(rangeSearchChanges("month", undefined, undefined, "week")).toEqual({ range: "month", from: null, to: null });
    expect(rangeSearchChanges("custom", "2026-10-01", "2026-10-09", "week")).toEqual({ range: "custom", from: "2026-10-01", to: "2026-10-09" });
  });

  it("sorts each view by the API's default", () => {
    expect(defaultSortOf("workdays")).toEqual({ sort: "date", direction: "desc" });
    expect(defaultSortOf("employee")).toEqual({ sort: "label", direction: "asc" });
    expect(defaultSortOf("manager")).toEqual({ sort: "label", direction: "asc" });
    expect(defaultSortOf("date")).toEqual({ sort: "label", direction: "desc" });
  });
});

describe("reports: summary rows", () => {
  it("shows the group without a manager as 'No manager' (translated)", () => {
    expect(summaryRowLabel({ key: "none", label: null }, "manager", translate)).toBe("«No manager»");
    expect(summaryRowLabel({ key: MANAGER_ID, label: "Maya Manager" }, "manager", translate)).toBe("Maya Manager");
  });

  it("writes a date group out and keeps names as they are", () => {
    expect(summaryRowLabel({ key: "2026-10-20", label: "2026-10-20" }, "date", translate)).toBe("Tue, 20 Oct 2026");
    expect(summaryRowLabel({ key: EMPLOYEE_ID, label: "=cmd |calc" }, "employee", translate)).toBe("=cmd |calc");
    expect(summaryRowLabel({ key: EMPLOYEE_ID, label: null }, "employee", translate)).toBe("—");
  });
});

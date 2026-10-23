import { describe, expect, it } from "vitest";
import { rangeSearchChanges, selectedRange, workdayHistoryPath } from "@/track/lib/workday-history-query";

describe("history range in the URL and the API path", () => {
  it("leaves the default range (this month) out of the path", () => {
    expect(workdayHistoryPath({})).toBe("/workdays/mine");
    expect(workdayHistoryPath({ range: "month" })).toBe("/workdays/mine");
    expect(selectedRange({})).toBe("month");
  });

  it("sends a preset as range, without from and to", () => {
    expect(workdayHistoryPath({ range: "week", from: "2026-10-01", to: "2026-10-05" })).toBe("/workdays/mine?range=week");
    expect(workdayHistoryPath({ range: "yesterday" })).toBe("/workdays/mine?range=yesterday");
    expect(selectedRange({ range: "today" })).toBe("today");
  });

  it("sends a custom range with its dates, and only well-formed dates", () => {
    expect(workdayHistoryPath({ range: "custom", from: "2026-09-01", to: "2026-10-05" })).toBe("/workdays/mine?range=custom&from=2026-09-01&to=2026-10-05");
    expect(workdayHistoryPath({ range: "custom", from: "2026-02-30", to: "soon" })).toBe("/workdays/mine?range=custom");
  });

  it("drops an unknown range (the API would refuse it), so the default applies", () => {
    expect(selectedRange({ range: "decade" })).toBe("month");
    expect(workdayHistoryPath({ range: "decade" })).toBe("/workdays/mine");
  });

  it("passes sorting and paging on under the API's names and ignores other URL parameters", () => {
    expect(workdayHistoryPath({ range: "week", sort: "productiveSeconds", sortDirection: "asc", page: "2", pageSize: "10", tab: "x" }))
      .toBe("/workdays/mine?sort=productiveSeconds&sortDirection=asc&page=2&pageSize=10&range=week");
  });

  it("turns a chosen range into URL changes", () => {
    expect(rangeSearchChanges("month")).toEqual({ range: null, from: null, to: null });
    expect(rangeSearchChanges("today", "2026-10-01", "2026-10-02")).toEqual({ range: "today", from: null, to: null });
    expect(rangeSearchChanges("custom", "2026-10-01", "2026-10-02")).toEqual({ range: "custom", from: "2026-10-01", to: "2026-10-02" });
    expect(rangeSearchChanges("custom", "", "nonsense")).toEqual({ range: "custom", from: null, to: null });
  });
});

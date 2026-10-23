import { describe, expect, it } from "vitest";
import {
  boardPagePath,
  defaultScopeOf,
  memberPagePath,
  scopesOf,
  scopeSearchChange,
  selectedScope,
  TEAM_SORT_KEYS,
  TEAM_STATUS_FILTERS,
  teamBoardPath,
} from "@/track/lib/team-board-query";
import { workdayHistoryPath } from "@/track/lib/workday-history-query";

describe("team board scope", () => {
  it("offers a manager direct and indirect (direct by default), the owner also everybody (the default)", () => {
    expect(scopesOf("MANAGER")).toEqual(["direct", "indirect"]);
    expect(scopesOf("ADMIN")).toEqual(["all", "direct", "indirect"]);
    expect(scopesOf("EMPLOYEE")).toEqual([]);
    expect(defaultScopeOf("MANAGER")).toBe("direct");
    expect(defaultScopeOf("ADMIN")).toBe("all");
  });

  it("reads the URL's scope in any case and falls back to the role's default for one it may not use", () => {
    expect(selectedScope("MANAGER", "indirect")).toBe("indirect");
    expect(selectedScope("MANAGER", "INDIRECT")).toBe("indirect");
    expect(selectedScope("MANAGER", "all")).toBe("direct");
    expect(selectedScope("MANAGER", undefined)).toBe("direct");
    expect(selectedScope("ADMIN", "direct")).toBe("direct");
    expect(selectedScope("ADMIN", "everybody")).toBe("all");
  });

  it("removes the default scope from the URL and keeps the others", () => {
    expect(scopeSearchChange("MANAGER", "direct")).toEqual({ scope: null });
    expect(scopeSearchChange("MANAGER", "indirect")).toEqual({ scope: "indirect" });
    expect(scopeSearchChange("ADMIN", "all")).toEqual({ scope: null });
    expect(scopeSearchChange("ADMIN", "direct")).toEqual({ scope: "direct" });
  });
});

describe("teamBoardPath", () => {
  it("is the bare collection for the defaults", () => {
    expect(teamBoardPath("MANAGER", {})).toBe("/team/members");
    expect(teamBoardPath("ADMIN", { scope: "all", status: "all" })).toBe("/team/members");
  });

  it("sends the scope, status, search, sorting and paging under the API's names", () => {
    expect(teamBoardPath("MANAGER", { scope: "indirect", status: "ON_BREAK", search: "asha", sort: "productiveSeconds", sortDirection: "desc", page: "2", pageSize: "10" }))
      .toBe("/team/members?search=asha&sort=productiveSeconds&sortDirection=desc&page=2&pageSize=10&scope=indirect&status=ON_BREAK");
    expect(teamBoardPath("ADMIN", { scope: "direct" })).toBe("/team/members?scope=direct");
  });

  it("leaves out values the API would refuse, so its defaults apply", () => {
    expect(teamBoardPath("MANAGER", { scope: "all" })).toBe("/team/members");
    expect(teamBoardPath("MANAGER", { status: "SLEEPING", sort: "email", range: "week" })).toBe("/team/members");
    expect(teamBoardPath("MANAGER", { status: "working" })).toBe("/team/members?status=WORKING");
  });

  it("knows the API's status filters and sort keys", () => {
    expect(TEAM_STATUS_FILTERS).toEqual(["all", "WORKING", "ON_BREAK", "NOT_STARTED", "DAY_ENDED"]);
    expect(TEAM_SORT_KEYS).toEqual(["name", "status", "productiveSeconds", "lastActivity"]);
  });
});

describe("member pages", () => {
  it("opens a person on the manager's Team tab or the owner's Time Tracking", () => {
    expect(memberPagePath("MANAGER", "abc")).toBe("/team/employees/abc");
    expect(memberPagePath("ADMIN", "abc")).toBe("/admin/time-tracking/abc");
    expect(boardPagePath("MANAGER")).toBe("/team");
    expect(boardPagePath("ADMIN")).toBe("/admin/time-tracking");
  });

  it("reads one person's history with the parameters of My history", () => {
    expect(workdayHistoryPath({ range: "week", sort: "productiveSeconds" }, "/team/members/abc/workdays"))
      .toBe("/team/members/abc/workdays?sort=productiveSeconds&range=week");
    expect(workdayHistoryPath({}, "/team/members/abc/workdays")).toBe("/team/members/abc/workdays");
  });
});

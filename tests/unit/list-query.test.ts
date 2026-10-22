import { describe, expect, it } from "vitest";
import { listPath, nextSortDirection, pageRange, toQueryString } from "@/track/lib/list-query";

describe("toQueryString", () => {
  it("leaves out empty values and gives an empty string when nothing is left", () => {
    expect(toQueryString({})).toBe("");
    expect(toQueryString({ search: "", status: null, page: undefined })).toBe("");
  });

  it("encodes values and keeps numbers", () => {
    expect(toQueryString({ search: "a&b c", page: 2 })).toBe("?search=a%26b+c&page=2");
  });

  it("keeps a comma-separated role list as one value (role=MANAGER,ADMIN)", () => {
    expect(new URLSearchParams(toQueryString({ role: "MANAGER,ADMIN", status: "active" })).get("role")).toBe("MANAGER,ADMIN");
  });
});

describe("listPath", () => {
  it("passes the list parameters and the endpoint's filters, with the API's names, and nothing else", () => {
    const path = listPath("/employees", { search: "asha", sort: "email", sortDirection: "desc", page: "2", pageSize: "10", status: "all", role: "MANAGER", managerId: "m-1", other: "x" }, ["status", "role", "managerId"]);
    const [pathname, query] = path.split("?");
    expect(pathname).toBe("/employees");
    expect(Object.fromEntries(new URLSearchParams(query))).toEqual({ search: "asha", sort: "email", sortDirection: "desc", page: "2", pageSize: "10", status: "all", role: "MANAGER", managerId: "m-1" });
  });

  it("is the bare path without parameters", () => {
    expect(listPath("/businesses", {}, ["status"])).toBe("/businesses");
  });
});

describe("nextSortDirection", () => {
  it("starts a new column ascending and flips the sorted one", () => {
    expect(nextSortDirection("name", "asc", "email")).toBe("asc");
    expect(nextSortDirection("name", "desc", "email")).toBe("asc");
    expect(nextSortDirection("name", "asc", "name")).toBe("desc");
    expect(nextSortDirection("name", "desc", "name")).toBe("asc");
  });
});

describe("pageRange", () => {
  it("gives the rows shown and the last page", () => {
    expect(pageRange(1, 25, 40)).toEqual({ from: 1, to: 25, lastPage: 2 });
    expect(pageRange(2, 25, 40)).toEqual({ from: 26, to: 40, lastPage: 2 });
    expect(pageRange(1, 25, 25)).toEqual({ from: 1, to: 25, lastPage: 1 });
  });

  it("handles an empty list", () => {
    expect(pageRange(1, 25, 0)).toEqual({ from: 0, to: 0, lastPage: 1 });
  });
});

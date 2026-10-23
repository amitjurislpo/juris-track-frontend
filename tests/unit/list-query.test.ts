import { describe, expect, it } from "vitest";
import { listPath, nextSortDirection, pageRange, sortChangeOf, toQueryString } from "@/track/lib/list-query";

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

describe("sortChangeOf", () => {
  it("flips the direction named in the address bar, so a quick second click is not answered from stale rows", () => {
    expect(sortChangeOf("?sort=email&sortDirection=asc", "email", "name", "asc")).toEqual({ sort: "email", sortDirection: "desc" });
    expect(sortChangeOf("?sort=email&sortDirection=desc", "email", "name", "asc")).toEqual({ sort: "email", sortDirection: "asc" });
  });

  it("uses the default sort and direction of the page when the address names none", () => {
    expect(sortChangeOf("", "name", "name", "asc")).toEqual({ sort: "name", sortDirection: "desc" });
    expect(sortChangeOf("", "date", "date", "desc")).toEqual({ sort: "date", sortDirection: "asc" });
    expect(sortChangeOf("?search=a", "email", "name", "asc")).toEqual({ sort: "email", sortDirection: "asc" });
  });
});

describe("pageRange", () => {
  it("gives the rows shown and the last page", () => {
    expect(pageRange(1, 25, 40)).toEqual({ from: 1, to: 25, lastPage: 2, shownPage: 1 });
    expect(pageRange(2, 25, 40)).toEqual({ from: 26, to: 40, lastPage: 2, shownPage: 2 });
    expect(pageRange(1, 25, 25)).toEqual({ from: 1, to: 25, lastPage: 1, shownPage: 1 });
  });

  it("handles an empty list", () => {
    expect(pageRange(1, 25, 0)).toEqual({ from: 0, to: 0, lastPage: 1, shownPage: 1 });
  });

  it("never shows an upside-down range for a page beyond the last one (not 26-25 of 25)", () => {
    expect(pageRange(2, 25, 25)).toEqual({ from: 1, to: 25, lastPage: 1, shownPage: 1 });
    expect(pageRange(9, 25, 40)).toEqual({ from: 26, to: 40, lastPage: 2, shownPage: 2 });
    expect(pageRange(3, 25, 0)).toEqual({ from: 0, to: 0, lastPage: 1, shownPage: 1 });
  });

  it("treats a page below 1 or not a number as the first page", () => {
    expect(pageRange(0, 25, 40).shownPage).toBe(1);
    expect(pageRange(-3, 25, 40).shownPage).toBe(1);
    expect(pageRange(Number.NaN, 25, 40).shownPage).toBe(1);
  });
});

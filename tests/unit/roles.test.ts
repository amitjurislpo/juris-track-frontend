import { describe, expect, it } from "vitest";
import { navFor } from "@/standalone/nav";

const linksOf = (role: Parameters<typeof navFor>[0]) => navFor(role).flatMap((navGroup) => navGroup.items.map((navItem) => navItem.href));
import { homeFor, ROLES } from "@/track/roles";
import { trackRoutes } from "@/track/routes";

describe("roles and navigation", () => {
  it("lands each role on a page that role may open", () => {
    for (const role of ROLES) {
      const route = trackRoutes.find((candidate) => `/${candidate.path}` === homeFor(role));
      expect(route, role).toBeDefined();
      expect(route!.roles).toContain(role);
    }
  });

  it("only links to pages the role may open", () => {
    for (const role of ROLES) {
      for (const href of linksOf(role)) {
        const route = trackRoutes.find((candidate) => `/${candidate.path}` === href);
        expect(route, href).toBeDefined();
        expect(route!.roles, href).toContain(role);
      }
    }
  });

  it("gives every user of a business the personal time-tracking pages, but not the super admin", () => {
    for (const path of ["dashboard", "my-time", "my-history", "profile"]) {
      const route = trackRoutes.find((candidate) => candidate.path === path)!;
      expect([...route.roles].sort(), path).toEqual(["ADMIN", "EMPLOYEE", "MANAGER"]);
    }
    for (const role of ["ADMIN", "MANAGER", "EMPLOYEE"] as const) {
      expect(linksOf(role), role).toEqual(expect.arrayContaining(["/dashboard", "/my-time", "/my-history", "/profile"]));
    }
  });

  it("keeps the super admin on the platform pages only", () => {
    for (const route of trackRoutes.filter((candidate) => candidate.roles.includes("SUPER_ADMIN"))) expect(route.path.startsWith("platform"), route.path).toBe(true);
    for (const href of linksOf("SUPER_ADMIN")) expect(href.startsWith("/platform"), href).toBe(true);
  });

  it("gives an employee only the personal section, a manager also the Team tab, the owner the administration", () => {
    expect(linksOf("EMPLOYEE")).toEqual(["/dashboard", "/my-time", "/my-history", "/profile"]);
    expect(linksOf("MANAGER")).toEqual(expect.arrayContaining(["/team", "/team/reports"]));
    expect(linksOf("MANAGER").some((href) => href.startsWith("/admin"))).toBe(false);
    expect(linksOf("ADMIN").every((href) => !href.startsWith("/team") && !href.startsWith("/platform"))).toBe(true);
    expect(homeFor("MANAGER")).toBe("/team");
    expect(homeFor("EMPLOYEE")).toBe("/dashboard");
  });

  it("has no team pages (the reporting manager replaces teams)", () => {
    expect(trackRoutes.filter((route) => /teams/.test(route.path))).toEqual([]);
  });

  it("has no duplicate route paths", () => {
    const paths = trackRoutes.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

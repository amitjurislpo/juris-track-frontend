/**
 * The roles of JurisTrack: a fixed set, no permission table. The API enforces them on every request.
 * SUPER_ADMIN is the platform user (no business: creates businesses and their owner); ADMIN is the business owner; MANAGER manages teams;
 * EMPLOYEE is everybody else. Every user of a business, whatever the role, has the same personal time-tracking pages.
 */
export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE";

export const ROLES: readonly Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE"];

/** Translation keys. */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Platform admin",
  ADMIN: "Owner",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

/** The landing page of each role (a path inside the JurisTrack routes). */
export function homeFor(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/platform";
    case "ADMIN":
      return "/admin";
    case "MANAGER":
      return "/team";
    default:
      return "/dashboard";
  }
}

import type { ComponentType } from "react";
import { ComingSoon } from "./components/ComingSoon";
import type { Role } from "./roles";

/**
 * Every JurisTrack page. `roles` are the roles that may open it (see RequireRole). The host mounts these under its own
 * layout (the standalone shell, or JurisOne's). The pages are placeholders until their phase.
 */
export interface TrackRoute {
  /** Path without a leading slash (`admin/teams/:id`). */
  path: string;
  /** Tab title and top-bar title; also a translation key. */
  title: string;
  roles: readonly Role[];
  Page: ComponentType;
}

/** A page whose content is built in a later phase. */
const placeholder = (title: string): ComponentType => function PlaceholderPage() { return <ComingSoon title={title} />; };

/** Every user of a business tracks their own time; the super admin (no business) does not. */
const BUSINESS_USERS: readonly Role[] = ["ADMIN", "MANAGER", "EMPLOYEE"];
const SUPER_ADMIN_ONLY: readonly Role[] = ["SUPER_ADMIN"];
const MANAGER_ONLY: readonly Role[] = ["MANAGER"];
const ADMIN_ONLY: readonly Role[] = ["ADMIN"];

export const trackRoutes: TrackRoute[] = [
  // personal time tracking: the same for every user of a business, whatever the role
  { path: "dashboard", title: "Dashboard", roles: BUSINESS_USERS, Page: placeholder("Dashboard") },
  { path: "my-time", title: "My Time", roles: BUSINESS_USERS, Page: placeholder("My Time") },
  { path: "my-history", title: "My History", roles: BUSINESS_USERS, Page: placeholder("My History") },
  { path: "profile", title: "Profile", roles: BUSINESS_USERS, Page: placeholder("Profile") },
  // manager: the Team tab (the people who report to them)
  { path: "team", title: "Team", roles: MANAGER_ONLY, Page: placeholder("Team") },
  { path: "team/employees/:id", title: "Employee", roles: MANAGER_ONLY, Page: placeholder("Employee") },
  { path: "team/reports", title: "Reports", roles: MANAGER_ONLY, Page: placeholder("Reports") },
  // admin (the business owner)
  { path: "admin", title: "Overview", roles: ADMIN_ONLY, Page: placeholder("Overview") },
  { path: "admin/employees", title: "Employees", roles: ADMIN_ONLY, Page: placeholder("Employees") },
  { path: "admin/employees/new", title: "New employee", roles: ADMIN_ONLY, Page: placeholder("New employee") },
  { path: "admin/employees/:id", title: "Employee", roles: ADMIN_ONLY, Page: placeholder("Employee") },
  { path: "admin/time-tracking", title: "Time Tracking", roles: ADMIN_ONLY, Page: placeholder("Time Tracking") },
  { path: "admin/reports", title: "Reports", roles: ADMIN_ONLY, Page: placeholder("Reports") },
  { path: "admin/audit-log", title: "Audit Log", roles: ADMIN_ONLY, Page: placeholder("Audit Log") },
  { path: "admin/settings", title: "Settings", roles: ADMIN_ONLY, Page: placeholder("Settings") },
  // platform (super admin: businesses and their owners)
  { path: "platform", title: "Businesses", roles: SUPER_ADMIN_ONLY, Page: placeholder("Businesses") },
  { path: "platform/businesses/:id", title: "Business", roles: SUPER_ADMIN_ONLY, Page: placeholder("Business") },
  { path: "platform/audit", title: "Audit Log", roles: SUPER_ADMIN_ONLY, Page: placeholder("Audit Log") },
  // first run: the administrator creates the organization
  { path: "setup", title: "Setup", roles: ADMIN_ONLY, Page: placeholder("Setup") },
];

import { lazy, type ComponentType } from "react";
import { ComingSoon } from "./components/ComingSoon";
import type { Role } from "./roles";

// built pages load on first use (the host's Suspense boundary shows the loading state meanwhile)
const DashboardPage = lazy(() => import("./pages/dashboard/page"));
const MyTimePage = lazy(() => import("./pages/my-time/page"));
const MyHistoryPage = lazy(() => import("./pages/my-history/page"));
const ProfilePage = lazy(() => import("./pages/profile/page"));
const EmployeesPage = lazy(() => import("./pages/admin-employees/page"));
const NewEmployeePage = lazy(() => import("./pages/admin-employee-new/page"));
const EmployeePage = lazy(() => import("./pages/admin-employee/page"));
const SettingsPage = lazy(() => import("./pages/admin-settings/page"));
const BusinessesPage = lazy(() => import("./pages/platform/page"));
const BusinessPage = lazy(() => import("./pages/platform-business/page"));
const TeamBoardPage = lazy(() => import("./pages/team-board/page"));
const TeamMemberPage = lazy(() => import("./pages/team-member/page"));

/**
 * Every JurisTrack page. `roles` are the roles that may open it (see RequireRole). The host mounts these under its own
 * layout (the standalone shell, or JurisOne's). Pages of later phases are "Coming soon" placeholders until they are built.
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
  { path: "dashboard", title: "Dashboard", roles: BUSINESS_USERS, Page: DashboardPage },
  { path: "my-time", title: "My Time", roles: BUSINESS_USERS, Page: MyTimePage },
  { path: "my-history", title: "My History", roles: BUSINESS_USERS, Page: MyHistoryPage },
  { path: "profile", title: "Profile", roles: BUSINESS_USERS, Page: ProfilePage },
  // manager: the Team tab (the people who report to them)
  { path: "team", title: "Team", roles: MANAGER_ONLY, Page: TeamBoardPage },
  { path: "team/employees/:id", title: "Employee", roles: MANAGER_ONLY, Page: TeamMemberPage },
  { path: "team/reports", title: "Reports", roles: MANAGER_ONLY, Page: placeholder("Reports") },
  // admin (the business owner)
  { path: "admin", title: "Overview", roles: ADMIN_ONLY, Page: placeholder("Overview") },
  { path: "admin/employees", title: "Employees", roles: ADMIN_ONLY, Page: EmployeesPage },
  { path: "admin/employees/new", title: "New employee", roles: ADMIN_ONLY, Page: NewEmployeePage },
  { path: "admin/employees/:id", title: "Employee", roles: ADMIN_ONLY, Page: EmployeePage },
  { path: "admin/time-tracking", title: "Time Tracking", roles: ADMIN_ONLY, Page: TeamBoardPage },
  { path: "admin/time-tracking/:id", title: "Employee", roles: ADMIN_ONLY, Page: TeamMemberPage },
  { path: "admin/reports", title: "Reports", roles: ADMIN_ONLY, Page: placeholder("Reports") },
  { path: "admin/audit-log", title: "Audit Log", roles: ADMIN_ONLY, Page: placeholder("Audit Log") },
  { path: "admin/settings", title: "Settings", roles: ADMIN_ONLY, Page: SettingsPage },
  // platform (super admin: creates businesses and their owners)
  { path: "platform", title: "Businesses", roles: SUPER_ADMIN_ONLY, Page: BusinessesPage },
  { path: "platform/businesses/:id", title: "Business", roles: SUPER_ADMIN_ONLY, Page: BusinessPage },
  { path: "platform/audit", title: "Audit Log", roles: SUPER_ADMIN_ONLY, Page: placeholder("Audit Log") },
];

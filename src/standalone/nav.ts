import type { Role } from "@/track/roles";

interface NavItem {
  href: string;
  /** Translation key. */
  label: string;
  /** A name from `track/components/Icon`. */
  icon: string;
}

export interface NavGroup {
  /** Translation key. */
  title: string;
  items: NavItem[];
}

/** The personal section every user of a business has (the same for every role). */
const PERSONAL: NavGroup = {
  title: "My workspace",
  items: [
    { href: "/dashboard", label: "Dashboard", icon: "home" },
    { href: "/my-time", label: "My Time", icon: "clock" },
    { href: "/my-schedule", label: "My Schedule", icon: "cal" },
    { href: "/my-history", label: "My History", icon: "cal" },
    { href: "/profile", label: "Profile", icon: "user" },
  ],
};

/**
 * The standalone sidebar of a role: the personal section, plus the Team group for a manager (their reports) or the
 * Administration group for the owner. The super admin has the platform pages only. (Embedded in JurisOne, the host's own
 * menu links to the JurisTrack routes instead.)
 */
export function navFor(role: Role): NavGroup[] {
  switch (role) {
    case "SUPER_ADMIN":
      return [{
        title: "Platform",
        items: [
          { href: "/platform", label: "Businesses", icon: "building" },
          { href: "/platform/audit", label: "Audit Log", icon: "shield" },
        ],
      }];
    case "ADMIN":
      return [
        PERSONAL,
        {
          title: "Administration",
          items: [
            { href: "/admin", label: "Overview", icon: "home" },
            { href: "/admin/employees", label: "Employees", icon: "users" },
            { href: "/admin/shifts", label: "Shifts", icon: "moon" },
            { href: "/admin/roster", label: "Roster", icon: "cal" },
            { href: "/admin/time-tracking", label: "Time Tracking", icon: "grid" },
            { href: "/admin/reports", label: "Reports", icon: "chart" },
            { href: "/admin/audit-log", label: "Audit Log", icon: "shield" },
            { href: "/admin/settings", label: "Settings", icon: "sliders" },
          ],
        },
      ];
    case "MANAGER":
      return [
        PERSONAL,
        {
          title: "Team",
          items: [
            { href: "/team", label: "Team", icon: "team" },
            { href: "/admin/roster", label: "Roster", icon: "cal" },
            { href: "/team/reports", label: "Reports", icon: "chart" },
          ],
        },
      ];
    default:
      return [PERSONAL];
  }
}

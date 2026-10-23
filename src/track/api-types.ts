/** The JSON of the API's answers (`data`), with the API's field names exactly (see the backend's references/API.md). */
import type { TeamScope } from "./lib/team-board-query";
import type { ActivityType, LastBreak, LiveStatus, WorkdaySnapshot } from "./lib/time/types";
import type { Role } from "./roles";

/** One page of a list endpoint. */
export interface ListPage<Row> {
  rows: Row[];
  /** Rows on all pages. */
  total: number;
  page: number;
  pageSize: number;
}

/** A row of `GET /businesses` (super admin). */
export interface BusinessRow {
  id: string;
  name: string;
  timeZone: string;
  isSuspended: boolean;
  isLinkedToJurisone: boolean;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  employeeCount: number;
  activeEmployeeCount: number;
  createdAt: string;
}

/** The settings of a business, as `GET /business` (owner) answers them. */
export interface BusinessSettings {
  id: string;
  name: string;
  timeZone: string;
  staleWorkdayHours: number;
  displayTimeZones: string[];
  createdAt: string;
  updatedAt: string;
}

/** `GET /businesses/{businessId}` (super admin). */
export interface BusinessDetail extends BusinessSettings {
  isSuspended: boolean;
  isLinkedToJurisone: boolean;
  owner: {
    id: string;
    employeeCode: string | null;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
    lastLoginAt: string | null;
  } | null;
  employeeCount: number;
  activeEmployeeCount: number;
}

/** A user of the owner's business (`GET /employees`, `GET /employees/{employeeId}`). */
export interface Employee {
  id: string;
  employeeCode: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: Exclude<Role, "SUPER_ADMIN">;
  isActive: boolean;
  managerId: string | null;
  managerName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  activeReportCount: number;
}

/** A row of `GET /workdays/mine` (the signed-in user's history); an open day's figures run to the time of the answer. */
export interface WorkdayHistoryRow {
  id: string;
  date: string;
  status: "WORKING" | "ON_BREAK" | "DAY_ENDED";
  isStale: boolean;
  startedAt: string;
  endedAt: string | null;
  productiveSeconds: number;
  breakSeconds: number;
  spanSeconds: number;
  breakCount: number;
  lastBreak: LastBreak | null;
}

/** A row of `GET /audit-logs` (owner: their business; super admin: every entry). Names are the current ones, resolved when read. */
export interface AuditLogRow {
  id: string;
  createdAt: string;
  /** null for a platform event (outside any business). */
  businessId: string | null;
  businessName: string | null;
  /** Who did it; null when nobody was signed in. `name` is null for a person outside the viewer's business (the platform admin in an owner's log). */
  actor: { id: string; name: string | null; role: string | null } | null;
  /** Whom it is about; null when it is about nobody in particular. */
  subject: { id: string; name: string | null } | null;
  action: string;
  category: string;
  outcome: string;
  entityType: string | null;
  entityId: string | null;
  source: string;
  ipAddress: string | null;
  requestId: string | null;
  reason: string | null;
  /** Machine-made: the changed fields of an update ("changed: role, managerId"), else the reason of a refusal or failure, else null. */
  summary: string | null;
}

/** `GET /audit-logs/{auditLogId}`: the row plus the record before and after and the request it came from. */
export interface AuditLogDetail extends AuditLogRow {
  before: unknown;
  after: unknown;
  userAgent: string | null;
  httpMethod: string | null;
  requestPath: string | null;
}

/** `GET /workdays/mine`: one page of workdays plus the whole range's totals and one chart point per date. */
export interface WorkdayHistory extends ListPage<WorkdayHistoryRow> {
  range: "today" | "yesterday" | "week" | "month" | "custom";
  from: string;
  to: string;
  totals: { workdays: number; productiveSeconds: number; breakSeconds: number; spanSeconds: number; breakCount: number };
  dailySeries: DailySeriesPoint[];
}

/** One date of a range's chart: what every workday of that date adds up to (zero when nothing was recorded). */
interface DailySeriesPoint {
  date: string;
  productiveSeconds: number;
  breakSeconds: number;
  workdays: number;
}

/** What every workday of a report's range adds up to (all pages); `employees` = different people. */
export interface ReportTotals {
  workdays: number;
  employees: number;
  productiveSeconds: number;
  breakSeconds: number;
  spanSeconds: number;
  breakCount: number;
  /** Productive seconds per workday, rounded (0 without workdays). */
  averageProductiveSeconds: number;
}

/** A row of `GET /reports/workdays` (backend references/API-reports.md). */
export interface ReportWorkdayRow extends WorkdayHistoryRow {
  employee: { id: string; employeeCode: string | null; name: string };
  /** The employee's manager when the workday started (with today's name); null when they had none that day. */
  manager: { id: string; name: string } | null;
}

/** What both report endpoints answer besides their rows. */
interface ReportEnvelope<Row> extends ListPage<Row> {
  range: WorkdayHistory["range"];
  from: string;
  to: string;
  scope: "direct" | "indirect" | "all";
  totals: ReportTotals;
  dailySeries: DailySeriesPoint[];
}

/** `GET /reports/workdays`: one page of workdays plus the whole range's totals and one chart point per date. */
export type WorkdayReport = ReportEnvelope<ReportWorkdayRow>;

/** A group of `GET /reports/summaries`. */
export interface ReportSummaryRow {
  /** The employee's id, the manager's id ("none" for the workdays without a manager) or the date. */
  key: string;
  /** The name or the date; null for the "none" manager group (shown as "No manager"). */
  label: string | null;
  /** Only with `groupBy=employee`. */
  employeeCode: string | null;
  workdays: number;
  employees: number;
  productiveSeconds: number;
  breakSeconds: number;
  spanSeconds: number;
  breakCount: number;
  averageProductiveSeconds: number;
  firstStartedAt: string;
  /** Null when every workday of the group is still open. */
  lastEndedAt: string | null;
}

/** `GET /reports/summaries`: one page of groups plus the totals and the daily series of the whole range. */
export interface SummaryReport extends ReportEnvelope<ReportSummaryRow> {
  groupBy: "employee" | "manager" | "date";
}

/** A person of the Team tab (`GET /team/members`, `GET /team/members/{employeeId}`). */
interface TeamMemberEmployee {
  id: string;
  employeeCode: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: Exclude<Role, "SUPER_ADMIN">;
  isActive: boolean;
  managerId: string | null;
  /** "First Last" of the person's manager; null without one. */
  managerName: string | null;
}

/**
 * A row of the live board: the person and today's state as `GET /me/time` decides it for oneself. The time fields mean what they
 * mean in a workday snapshot (live values up to the board's `serverTime`); a NOT_STARTED row has every number 0 and every time null.
 */
export interface TeamMemberRow {
  employee: TeamMemberEmployee;
  status: LiveStatus;
  workdayId: string | null;
  date: string | null;
  startedAt: string | null;
  endedAt: string | null;
  isStale: boolean;
  closedProductiveSeconds: number;
  closedBreakSeconds: number;
  activeWorkStartedAt: string | null;
  activeBreakStartedAt: string | null;
  productiveSeconds: number;
  breakSeconds: number;
  spanSeconds: number;
  breakCount: number;
  lastBreak: LastBreak | null;
  lastActivity: { type: ActivityType; at: string } | null;
}

/** The board's tiles: everybody of the scope (the status filter, search and paging do not change them). */
export interface TeamMetrics {
  total: number;
  working: number;
  onBreak: number;
  notStarted: number;
  dayEnded: number;
  /** Open and running longer than the business's stale workday hours ("Not ended"). */
  stale: number;
  totalProductiveSeconds: number;
  totalBreakSeconds: number;
  /** Total productive time divided by the people who started today, rounded down; 0 when nobody started. */
  averageProductiveSeconds: number;
}

/** `GET /team/members`: one page of the board plus what the client needs to run the live timers. */
export interface TeamBoard extends ListPage<TeamMemberRow> {
  scope: TeamScope;
  serverTime: string;
  today: string;
  businessTimeZone: string;
  staleWorkdayHours: number;
  metrics: TeamMetrics;
}

/** `GET /team/members/{employeeId}`: one person of the scope with their current time state. */
export interface TeamMemberDetail {
  employee: TeamMemberEmployee;
  serverTime: string;
  today: string;
  businessTimeZone: string;
  staleWorkdayHours: number;
  status: LiveStatus;
  /** The open workday (whatever its date), else today's ended workday, else null. */
  workday: WorkdaySnapshot | null;
}

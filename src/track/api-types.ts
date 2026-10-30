/** The JSON of the API's answers (`data`), with the API's field names exactly (see the backend's references/API.md). */
import type { TeamScope } from "./lib/team-board-query";
import type { ActivityType, LastBreak, LiveStatus, ShiftFigures, WorkdayShift, WorkdaySnapshot } from "./lib/time/types";
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
  /** The least the owner may set: the longest active shift in whole hours plus 3 (1 without such a shift). A stored value below it still reads as is. */
  minimumStaleWorkdayHours: number;
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
  /** False = the owner switched sign-in off: the person stays in the business but cannot sign in. */
  isLoginEnabled: boolean;
  managerId: string | null;
  managerName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  activeReportCount: number;
  /** The shift the person works now. */
  shift: EmployeeShift;
}

/** The short shift of a person (`GET /employees`): enough to show its name and window. */
type EmployeeShift = Pick<WorkdayShift, "name" | "startTime" | "endTime"> & { id: string };

/** A row of `GET /shifts` and the answer of `GET /shifts/{shiftId}`. */
export interface Shift {
  id: string;
  name: string;
  /** "HH:mm" in the business time zone. */
  startTime: string;
  endTime: string;
  /** The shift ends on the next day. */
  crossesMidnight: boolean;
  scheduledMinutes: number;
  /** Minutes before the start from which work still belongs to this shift. */
  earlyStartMinutes: number;
  /** Minutes after the end until which work still belongs to this shift. */
  lateEndMinutes: number;
  /** The business's default shift ("General day"): it cannot be deactivated. */
  isDefault: boolean;
  isActive: boolean;
  employeeCount: number;
}

/** One date of a person's roster (`GET /schedule-entries`, `GET /me/schedule`). */
export interface ScheduleDay {
  date: string;
  shiftId: string | null;
  shiftName: string | null;
  reason?: string | null;
  /** The date is a week off. */
  isOff: boolean;
  /** Where it comes from: a roster entry of that date, the person's shift assignment, or the business default shift. */
  source: "ENTRY" | "ASSIGNMENT" | "DEFAULT";
}

/** A person with their days: a row of `GET /schedule-entries`, and what `GET /me/schedule` answers for oneself. */
export interface ScheduleRow {
  employeeId: string;
  name: string;
  employeeCode: string | null;
  shift: EmployeeShift;
  days: ScheduleDay[];
}

/** A row of `GET /workdays/mine` (the signed-in user's history); an open day's figures run to the time of the answer. */
export interface WorkdayHistoryRow extends ShiftFigures {
  id: string;
  /** The shift date. */
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
  totals: { workdays: number; productiveSeconds: number; extraSeconds?: number; breakSeconds: number; spanSeconds: number; breakCount: number };
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
  /** Productive seconds outside the shift or on a week off. */
  extraSeconds?: number;
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
  /** Productive seconds outside the shift or on a week off. */
  extraSeconds?: number;
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
export interface TeamMemberRow extends ShiftFigures {
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
  /** People who are off today and have no workday (not counted in `notStarted`). */
  weekOff: number;
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
  /** The shift occurrence the person is in now (absent in older answers). */
  shift?: WorkdayShift | null;
  /** Today is a week off for the person (absent in older answers). */
  isOffDay?: boolean;
  /** The open workday (whatever its date), else today's ended workday, else null. */
  workday: WorkdaySnapshot | null;
}

/** The JSON of the API's answers (`data`), with the API's field names exactly (see the backend's references/API.md). */
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

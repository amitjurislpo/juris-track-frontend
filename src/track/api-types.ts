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
  dailySeries: { date: string; productiveSeconds: number; breakSeconds: number; workdays: number }[];
}

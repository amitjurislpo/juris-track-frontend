/**
 * The time-tracking JSON of the API (`GET /me/time`, `POST /me/time-events`, `GET /workdays/{workdayId}`; see the backend's
 * references/API.md), with the API's field names exactly. The labels are English text = translation keys.
 */

export type LiveStatus = "NOT_STARTED" | "WORKING" | "ON_BREAK" | "DAY_ENDED";

export const LIVE_STATUSES: readonly LiveStatus[] = ["WORKING", "ON_BREAK", "NOT_STARTED", "DAY_ENDED"];

export const LIVE_STATUS_LABELS: Record<LiveStatus, string> = {
  WORKING: "Working",
  ON_BREAK: "On break",
  NOT_STARTED: "Not started",
  DAY_ENDED: "Day ended",
};

/** One work or break interval of a workday; `endedAt` is null while it runs. */
export interface TimelineSegment {
  id: string;
  type: "WORK" | "BREAK";
  startedAt: string;
  endedAt: string | null;
}

export type ActivityType = "STARTED_WORK" | "STARTED_BREAK" | "RESUMED_WORK" | "ENDED_DAY";

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  STARTED_WORK: "Started work",
  STARTED_BREAK: "Started break",
  RESUMED_WORK: "Resumed work",
  ENDED_DAY: "Ended workday",
};

/**
 * A workday as of the server time it was read at. Live values are advanced on the client (see `liveTotals`):
 *   productive = closedProductiveSeconds + (now - activeWorkStartedAt)
 *   break      = closedBreakSeconds      + (now - activeBreakStartedAt)
 */
export interface WorkdaySnapshot {
  id: string;
  /** The calendar date (business time zone) the day started on; kept when it runs past midnight. */
  date: string;
  status: Exclude<LiveStatus, "NOT_STARTED">;
  startedAt: string;
  endedAt: string | null;
  /** Still open and longer than the business's stale workday hours ("not ended"). */
  isStale: boolean;
  closedProductiveSeconds: number;
  closedBreakSeconds: number;
  activeWorkStartedAt: string | null;
  activeBreakStartedAt: string | null;
  productiveSeconds: number;
  breakSeconds: number;
  spanSeconds: number;
  breakCount: number;
  lastActivity: { type: ActivityType; at: string };
  /** Oldest first. */
  segments: TimelineSegment[];
}

/** `GET /me/time`: the signed-in user's current time state. */
export interface TimeState {
  employeeId: string;
  /** The server's "now" of this answer (the client measures its clock offset from it). */
  serverTime: string;
  /** Today's date in the business time zone. */
  today: string;
  businessTimeZone: string;
  staleWorkdayHours: number;
  /** The business's configured display time zones; the business time zone is offered as well (the client adds it). */
  displayTimeZones: string[];
  status: LiveStatus;
  /** The open workday (whatever its date), else today's ended workday, else null. */
  workday: WorkdaySnapshot | null;
}

/** The events of `POST /me/time-events`. */
export type TimeEventType = "START" | "BREAK" | "RESUME" | "END";

/** What `POST /me/time-events` answers in `data`. */
export interface TimeEventResult {
  type: TimeEventType;
  /** True when the person already was where the event leads (a double click, another device): nothing was created or changed. */
  alreadyApplied: boolean;
  /** The workday the event applied to; after a night shift ended past midnight it is that day while `state.workday` is null. */
  workdayId: string | null;
  state: TimeState;
}

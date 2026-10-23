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

/** The shift a workday (or the current occurrence) is counted against; the times are "HH:mm" in the business time zone. */
export interface WorkdayShift {
  /** Null for a record written before shifts existed. */
  id: string | null;
  name: string;
  startTime: string;
  endTime: string;
  /** The window of this occurrence as instants. */
  scheduledStartAt: string;
  scheduledEndAt: string;
  scheduledSeconds: number;
}

/** What every workday figure carries about its shift (snapshots, history, board and report rows). */
export interface ShiftFigures {
  /** Null for a workday without a shift on record. */
  shift: WorkdayShift | null;
  /** Work was recorded outside the shift's window (plus its grace). */
  isOutsideShift: boolean;
  /** Productive minus scheduled seconds; only once the day has ended, else null. */
  varianceSeconds: number | null;
  /** Productive seconds outside the scheduled window (all of them on a week-off day): counted as extra time. */
  extraSeconds: number;
  /** The workday's date is a week off for the person. */
  isOffDay: boolean;
}

/** The break that started last; `endedAt` is null while it runs. */
export interface LastBreak {
  startedAt: string;
  endedAt: string | null;
}

/**
 * A workday as of the server time it was read at. Live values are advanced on the client (see `liveTotals`):
 *   productive = closedProductiveSeconds + (now - activeWorkStartedAt)
 *   break      = closedBreakSeconds      + (now - activeBreakStartedAt)
 */
export interface WorkdaySnapshot extends ShiftFigures {
  id: string;
  /** The SHIFT date: the calendar date (business time zone) the day's shift started on; kept when it runs past midnight. */
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
  lastBreak: LastBreak | null;
  lastActivity: { type: ActivityType; at: string };
  /** Oldest first. */
  segments: TimelineSegment[];
}

/** `GET /me/time`: the signed-in user's current time state. */
export interface TimeState {
  employeeId: string;
  /** The server's "now" of this answer (the client measures its clock offset from it). */
  serverTime: string;
  /** Today's calendar date in the business time zone. */
  today: string;
  /** The date of the shift occurrence "now" belongs to (what a workday's `date` is compared with); the calendar date for the default shift. */
  shiftDate: string;
  /** The current shift occurrence, also while there is no workday yet; null without one. */
  shift: WorkdayShift | null;
  /** Today is a week off for the person (they may still work: the time counts as extra). */
  isOffDay: boolean;
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

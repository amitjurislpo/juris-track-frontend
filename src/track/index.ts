// The public face of the embeddable JurisTrack layer: what a host (the standalone app, or JurisOne) imports.
export { trackRoutes, type TrackRoute } from "./routes";
export { TrackProvider, useTrack, type TrackContextValue, type TrackUser } from "./TrackContext";
export { RequireRole } from "./RequireRole";
export { PageLoading } from "./PageLoading";
export { usePage, useData } from "./usePage";
export { apiAction, createApiClient, ApiError, type ApiClientOptions } from "./api";
export type { ActionResult } from "./action";
export { ROLES, ROLE_LABELS, homeFor, type Role } from "./roles";
export { trackHindiMessages } from "./messages/hi";
export { trackHindiApiMessages } from "./messages/hi-api";
// Time engine: interval totals, the business calendar, date ranges, live timers and display formatting.
export { intervalSeconds, sumSeconds, closedSeconds, findOpenInterval, computeTotals, type IntervalLike, type WorkdayTotals } from "./lib/time/interval-math";
export {
  isValidTimeZone,
  isDateKey,
  timeZoneOffsetMilliseconds,
  toDateKey,
  zonedTimeToUtc,
  startOfDayUtc,
  addDays,
  startOfWeek,
  startOfMonth,
  daysBetween,
  eachDay,
  parseZonedDateTime,
  toZonedInputValue,
  type DateKey,
} from "./lib/time/business-calendar";
export { timeZoneOptions, zoneAbbreviation, zoneLabel, zoneLongName } from "./lib/time/zone-names";
export { RANGE_PRESETS, RANGE_LABELS, MAX_RANGE_DAYS, resolveRange, type RangePreset, type DateRange } from "./lib/time/date-ranges";
export { formatClock, formatDuration, toDecimalHours, formatTime, formatDateTime, formatDateKey, fullName, initials } from "./lib/time/format";
export { liveTotals, type LiveTotals, type LiveTotalsSnapshot } from "./lib/time/live-totals";
export {
  LIVE_STATUSES,
  LIVE_STATUS_LABELS,
  ACTIVITY_LABELS,
  type LiveStatus,
  type TimelineSegment,
  type ActivityType,
  type WorkdaySnapshot,
  type TimeState,
  type TimeEventType,
  type TimeEventResult,
} from "./lib/time/types";
export { measureClockOffset, serverNow } from "./lib/time/clock-offset";
export { displayTimeZoneChoices, resolveDisplayTimeZone } from "./lib/time/display-time-zone";
// The display time zone: an embedding host can build its own switcher on this hook (the standalone shell has one).
export { useDisplayTimeZone, type DisplayTimeZone } from "./time/useDisplayTimeZone";
export { useServerClock } from "./time/useServerClock";

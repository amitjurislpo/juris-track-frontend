import { changedFields } from "./patch";

/** The API's limits for a business's settings (API.md, `PATCH /businesses/{businessId}`). */
const MINIMUM_STALE_WORKDAY_HOURS = 1;
const MAXIMUM_STALE_WORKDAY_HOURS = 48;
/** The stale hours must cover the longest shift plus 3 hours (the API refuses less); `{minimum}` is the number to show. */
const STALE_WORKDAY_HOURS_TOO_LOW_MESSAGE = "Stale workday hours must be at least {minimum}: your longest shift plus 3 hours.";
export const MAXIMUM_DISPLAY_TIME_ZONES = 8;
export const MAXIMUM_BUSINESS_NAME_LENGTH = 80;

/** The settings as an edit form holds them (the hours as typed). */
export interface BusinessSettingsForm {
  name: string;
  timeZone: string;
  staleWorkdayHours: string;
  displayTimeZones: string[];
}

export function toBusinessSettingsForm(settings: { name: string; timeZone: string; staleWorkdayHours: number; displayTimeZones: string[] }): BusinessSettingsForm {
  return { name: settings.name, timeZone: settings.timeZone, staleWorkdayHours: String(settings.staleWorkdayHours), displayTimeZones: [...settings.displayTimeZones] };
}

/**
 * The PATCH body for an edited settings form (only the changed fields), or the problems found before sending: field name to a
 * message (a translation key; the stale hours message has a `{minimum}` placeholder). The stale hours are checked against
 * `minimumStaleWorkdayHours` only when they were changed (an older, lower stored value can stay).
 */
export function businessSettingsChanges(original: BusinessSettingsForm, edited: BusinessSettingsForm, minimumStaleWorkdayHours: number): { changes: Record<string, unknown>; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  if (!edited.name.trim()) fieldErrors.name = "Business name is required.";
  const hours = Number(edited.staleWorkdayHours.trim());
  if (!/^\d+$/.test(edited.staleWorkdayHours.trim()) || hours < MINIMUM_STALE_WORKDAY_HOURS || hours > MAXIMUM_STALE_WORKDAY_HOURS) {
    fieldErrors.staleWorkdayHours = "Enter a whole number of hours from 1 to 48.";
  } else if (hours !== Number(original.staleWorkdayHours) && hours < minimumStaleWorkdayHours) {
    fieldErrors.staleWorkdayHours = STALE_WORKDAY_HOURS_TOO_LOW_MESSAGE;
  }
  if (edited.displayTimeZones.length > MAXIMUM_DISPLAY_TIME_ZONES) fieldErrors.displayTimeZones = "Choose at most 8 display time zones.";
  if (Object.keys(fieldErrors).length) return { changes: {}, fieldErrors };
  const changes: Record<string, unknown> = changedFields(
    { name: original.name, timeZone: original.timeZone, staleWorkdayHours: Number(original.staleWorkdayHours), displayTimeZones: original.displayTimeZones },
    { name: edited.name, timeZone: edited.timeZone, staleWorkdayHours: hours, displayTimeZones: edited.displayTimeZones },
  );
  return { changes, fieldErrors };
}

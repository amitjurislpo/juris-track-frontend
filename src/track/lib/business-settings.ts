import { changedFields } from "./patch";

/** The API's limits for a business's settings (API.md, `PATCH /businesses/{businessId}`). */
const MINIMUM_STALE_WORKDAY_HOURS = 1;
const MAXIMUM_STALE_WORKDAY_HOURS = 48;
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
 * message (a translation key).
 */
export function businessSettingsChanges(original: BusinessSettingsForm, edited: BusinessSettingsForm): { changes: Record<string, unknown>; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  if (!edited.name.trim()) fieldErrors.name = "Business name is required.";
  const hours = Number(edited.staleWorkdayHours.trim());
  if (!/^\d+$/.test(edited.staleWorkdayHours.trim()) || hours < MINIMUM_STALE_WORKDAY_HOURS || hours > MAXIMUM_STALE_WORKDAY_HOURS) {
    fieldErrors.staleWorkdayHours = "Enter a whole number of hours from 1 to 48.";
  }
  if (edited.displayTimeZones.length > MAXIMUM_DISPLAY_TIME_ZONES) fieldErrors.displayTimeZones = "Choose at most 8 display time zones.";
  if (Object.keys(fieldErrors).length) return { changes: {}, fieldErrors };
  const changes: Record<string, unknown> = changedFields(
    { name: original.name, timeZone: original.timeZone, staleWorkdayHours: Number(original.staleWorkdayHours), displayTimeZones: original.displayTimeZones },
    { name: edited.name, timeZone: edited.timeZone, staleWorkdayHours: hours, displayTimeZones: edited.displayTimeZones },
  );
  return { changes, fieldErrors };
}

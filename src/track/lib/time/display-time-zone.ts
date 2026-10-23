/**
 * The display time zone: which zone clock times (start, end, segments) are shown in. The business offers its own time zone plus
 * its configured display time zones (`GET /me/time`); each browser remembers its choice. Display only: workday dates and date
 * ranges stay in the business time zone, as the API returns them, and durations do not depend on it.
 */
import { isValidTimeZone } from "./business-calendar";

/** The zones offered: the business time zone first, then the configured display zones (duplicates and unknown ids dropped). */
export function displayTimeZoneChoices(businessTimeZone: string, displayTimeZones: readonly string[]): string[] {
  return [...new Set([businessTimeZone, ...displayTimeZones])].filter((timeZone) => isValidTimeZone(timeZone));
}

/**
 * The zone to show: the stored choice when it is still offered, else the business time zone. While the offered zones are not
 * known yet (`choices` null), a stored choice that is a real time zone is kept, so the screen does not jump.
 */
export function resolveDisplayTimeZone(storedChoice: string | null, choices: readonly string[] | null, businessTimeZone: string): string {
  if (!storedChoice) return businessTimeZone;
  if (choices === null) return isValidTimeZone(storedChoice) ? storedChoice : businessTimeZone;
  return choices.includes(storedChoice) ? storedChoice : businessTimeZone;
}

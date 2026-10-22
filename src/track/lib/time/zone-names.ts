/**
 * Display names of time zones (ported from the old app's lib/time/zones.ts; display only, so it has no backend equivalent).
 * Labels come from Intl so any IANA zone works; "America/New_York" shows EDT or EST depending on the date.
 */

/**
 * Intl.supportedValuesOf("timeZone") returns some legacy ICU names (e.g. "Asia/Calcutta"). Offer the modern IANA names instead;
 * both resolve to the same rules.
 */
const MODERN_ZONE_NAMES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Europe/Kiev": "Europe/Kyiv",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Godthab": "America/Nuuk",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Pacific/Truk": "Pacific/Chuuk",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Enderbury": "Pacific/Kanton",
};

/** Sorted list of selectable IANA zones, always including `include`. */
export function timeZoneOptions(include: readonly string[] = []): string[] {
  const listed = Intl.supportedValuesOf("timeZone").map((timeZone) => MODERN_ZONE_NAMES[timeZone] ?? timeZone);
  return [...new Set([...listed, ...include])].sort((first, second) => first.localeCompare(second));
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

function zoneName(timeZone: string, style: "short" | "long", instant: Date): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: style })
    .formatToParts(instant)
    .find((candidate) => candidate.type === "timeZoneName");
  return part?.value ?? timeZone;
}

/** Short abbreviation at an instant: "IST", "EDT", "EST", "GMT", … */
export function zoneAbbreviation(timeZone: string, instant: Date = new Date()): string {
  const shortName = zoneName(timeZone, "short", instant);
  // en-US gives "GMT+5:30" for many zones; fall back to the initials of the long name.
  if (/^GMT[+-]/.test(shortName) || /^UTC[+-]/.test(shortName)) return initialsOf(zoneName(timeZone, "long", instant));
  return shortName;
}

/** Friendly label: "India Standard Time (IST)". */
export function zoneLabel(timeZone: string, instant: Date = new Date()): string {
  return `${zoneName(timeZone, "long", instant)} (${zoneAbbreviation(timeZone, instant)})`;
}

/** Long name at an instant: "India Standard Time", "Eastern Daylight Time". */
export function zoneLongName(timeZone: string, instant: Date = new Date()): string {
  return zoneName(timeZone, "long", instant);
}

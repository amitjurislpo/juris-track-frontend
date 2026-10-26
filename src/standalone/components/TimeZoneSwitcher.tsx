import { useT } from "@/standalone/i18n/client";
import { formatTime } from "@/track/lib/time/format";
import { zoneAbbreviation, zoneLongName } from "@/track/lib/time/zone-names";
import { useDisplayTimeZone } from "@/track/time/useDisplayTimeZone";
import { useServerClock } from "@/track/time/useServerClock";

/** The clocks next to the choices only need minutes. */
const CLOCK_TICK_MILLISECONDS = 30_000;

/**
 * "Show times in": the business time zone and its display time zones (`GET /me/time`), each with its current time and short name ("12:14 AM IST"; the full name is the tooltip). The choice is
 * this browser's (see useDisplayTimeZone) and changes the clock times on the time pages, not the dates or durations. Hidden when
 * the business offers only one zone, and for the super admin.
 */
export function TimeZoneSwitcher() {
  const t = useT();
  const { timeZone, choices, setTimeZone, clockOffsetMilliseconds } = useDisplayTimeZone();
  const now = new Date(useServerClock(clockOffsetMilliseconds, choices.length > 1, CLOCK_TICK_MILLISECONDS));
  if (choices.length < 2) return null;
  return (
    <select className="lang-switch tz-switch" value={timeZone} aria-label={t("Show times in")} title={zoneLongName(timeZone, now)} onChange={(e) => setTimeZone(e.target.value)}>
      {choices.map((zone) => (
        <option key={zone} value={zone} title={zoneLongName(zone, now)}>{`${formatTime(now, zone)} ${zoneAbbreviation(zone, now)}`}</option>
      ))}
    </select>
  );
}

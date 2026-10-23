import { useCallback, useSyncExternalStore } from "react";
import { currentDisplayTimeZoneChoice, storeDisplayTimeZone, subscribeToDisplayTimeZone } from "../lib/display-time-zone-store";
import { displayTimeZoneChoices, resolveDisplayTimeZone } from "../lib/time/display-time-zone";
import { viewerTimeZone } from "../lib/viewer-time-zone";
import { useTrack } from "../TrackContext";
import { useTimeState } from "./useTimeState";

export interface DisplayTimeZone {
  /** The zone clock times are shown in. */
  timeZone: string;
  /** The zones offered (the business time zone first); a single zone means there is nothing to choose. */
  choices: string[];
  /** Remembers this browser's choice (every page using this hook follows at once). */
  setTimeZone: (timeZone: string) => void;
  /** The server clock's offset (milliseconds) from the last time state, for clocks next to the choices. */
  clockOffsetMilliseconds: number;
}

/**
 * The display time zone of the signed-in user: the business time zone or one of the business's display time zones
 * (`GET /me/time`), as chosen in this browser. Clock times on the time pages use it; workday dates and ranges stay in the
 * business time zone. The standalone shell shows a switcher built on this hook; an embedding host can build its own.
 * The super admin (no business, no time tracking) gets the browser's time zone and no choice.
 */
export function useDisplayTimeZone(): DisplayTimeZone {
  const { user } = useTrack();
  const hasTimeTracking = user.role !== "SUPER_ADMIN";
  const { data: reading } = useTimeState({ isEnabled: hasTimeTracking });
  const storedChoice = useSyncExternalStore(subscribeToDisplayTimeZone, currentDisplayTimeZoneChoice, () => null);
  const setTimeZone = useCallback((timeZone: string) => storeDisplayTimeZone(timeZone), []);
  const businessTimeZone = reading?.state.businessTimeZone ?? viewerTimeZone(user);
  const choices = reading ? displayTimeZoneChoices(businessTimeZone, reading.state.displayTimeZones) : null;
  return {
    timeZone: hasTimeTracking ? resolveDisplayTimeZone(storedChoice, choices, businessTimeZone) : businessTimeZone,
    choices: hasTimeTracking ? (choices ?? [businessTimeZone]) : [businessTimeZone],
    setTimeZone,
    clockOffsetMilliseconds: reading?.clockOffsetMilliseconds ?? 0,
  };
}

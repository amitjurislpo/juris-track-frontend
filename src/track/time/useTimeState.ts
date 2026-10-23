import { useQuery } from "@tanstack/react-query";
import { apiData } from "../api";
import { measureClockOffset } from "../lib/time/clock-offset";
import type { TimeState } from "../lib/time/types";

/** One reading of `GET /me/time`, with the server clock's offset measured on that answer. */
export interface TimeStateReading {
  state: TimeState;
  /** How far the server's clock is ahead of this browser's (milliseconds). */
  clockOffsetMilliseconds: number;
}

/** The cache key of the time state (every successful write refetches it, like every other query). */
export const TIME_STATE_QUERY_KEY = ["track", "time-state"];

/** While a timer is on screen the state is read again this often (another device may have changed it). */
const LIVE_REFRESH_MILLISECONDS = 30_000;

async function readTimeState(): Promise<TimeStateReading> {
  const requestSentAt = Date.now();
  const state = await apiData<TimeState>("/me/time");
  return { state, clockOffsetMilliseconds: measureClockOffset(state.serverTime, requestSentAt, Date.now()) };
}

/**
 * The signed-in user's time state (`GET /me/time`). With `isLive` (a timer is on screen) it is read again every 30 seconds while
 * the tab is visible, when the tab or window gets the focus back and when the network comes back. `isEnabled` false: not read
 * (the super admin has no time tracking).
 */
export function useTimeState({ isLive = false, isEnabled = true }: { isLive?: boolean; isEnabled?: boolean } = {}) {
  return useQuery({
    queryKey: TIME_STATE_QUERY_KEY,
    queryFn: readTimeState,
    enabled: isEnabled,
    refetchInterval: isLive ? LIVE_REFRESH_MILLISECONDS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: isLive,
    refetchOnReconnect: isLive,
    // keep the last state on screen while a new one loads or when one reading fails
    placeholderData: (previousReading) => previousReading,
  });
}

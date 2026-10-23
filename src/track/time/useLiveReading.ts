import { useQuery } from "@tanstack/react-query";
import { apiData } from "../api";
import { measureClockOffset } from "../lib/time/clock-offset";

/** One answer of a live endpoint, with the server clock's offset measured on that answer. */
export interface LiveReading<T> {
  value: T;
  /** How far the server's clock is ahead of this browser's (milliseconds). */
  clockOffsetMilliseconds: number;
}

/** The Team tab's live pages read their data again this often while they are visible. */
const TEAM_REFRESH_MILLISECONDS = 15_000;

/**
 * A GET whose answer carries `serverTime` (the Team board, one person of it), read again every 15 seconds while the tab is
 * visible (paused while it is hidden), when the window gets the focus back and when the network returns. The last answer stays on
 * screen while a new one loads (also for another filter) or when one reading fails. Errors are returned, not thrown, so a page
 * can answer a 404 in its own words.
 */
export function useLiveReading<T extends { serverTime: string }>(path: string) {
  return useQuery({
    queryKey: ["track", "live", path],
    queryFn: async (): Promise<LiveReading<T>> => {
      const requestSentAt = Date.now();
      const value = await apiData<T>(path);
      return { value, clockOffsetMilliseconds: measureClockOffset(value.serverTime, requestSentAt, Date.now()) };
    },
    refetchInterval: TEAM_REFRESH_MILLISECONDS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (previousReading) => previousReading,
  });
}

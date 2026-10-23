import { apiAction } from "@/track/api";
import type { TimeEventResult, TimeEventType } from "@/track/lib/time/types";

// The signed-in user's own time (API.md, "Time tracking (own)"). Paths are relative to the TrackContext's API base path.

/**
 * Start work, take a break, resume or end the day (`POST /me/time-events`). 201 with a message when the state changed; 200
 * without one and `alreadyApplied` when the person already was there (a double click, another device). Used by My time and
 * by the dashboard's quick action.
 */
export function recordTimeEvent(type: TimeEventType) {
  return apiAction<TimeEventResult>("POST", "/me/time-events", { type });
}

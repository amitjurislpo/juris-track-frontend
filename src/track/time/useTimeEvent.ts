import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { NETWORK_ERROR } from "../api";
import { problemMessage, TIME_RECORD_INCONSISTENT } from "../lib/problems";
import type { TimeEventType } from "../lib/time/types";
import { recordTimeEvent } from "../pages/my-time/actions";
import { useTrack } from "../TrackContext";
import { TIME_STATE_QUERY_KEY } from "./useTimeState";

/** The message shown when the request did not reach the API at all. */
const UNREACHABLE = "Could not reach the server. Your time is safe. Please try again.";

export interface TimeEventRunner {
  /** Sends one event; a second call while one runs is ignored (double clicks never send twice). */
  run: (event: TimeEventType) => Promise<void>;
  /** The event being sent, or null. Every time button is disabled meanwhile. */
  runningEvent: TimeEventType | null;
  /** The message of a TIME_RECORD_INCONSISTENT answer: the record needs an administrator; null otherwise. */
  inconsistencyMessage: string | null;
  /** Clears the inconsistency and reads the state again (the "Check again" button). */
  retry: () => void;
  /** The day an End event closed when it is no longer the current one (a night shift ended after midnight), else null. */
  endedWorkdayId: string | null;
}

/**
 * Sends the time events (start, break, resume, end) for the timer and the dashboard: a toast with the API's message when the state
 * changed, a quiet refresh when it was already applied (a double click or another device), a clear message for the 409 refusals
 * (the state is read again, since it changed elsewhere) and an error state for an inconsistent time record.
 */
export function useTimeEvent(): TimeEventRunner {
  const { t, toast } = useTrack();
  const queryClient = useQueryClient();
  const isRunning = useRef(false);
  const [runningEvent, setRunningEvent] = useState<TimeEventType | null>(null);
  const [inconsistencyMessage, setInconsistencyMessage] = useState<string | null>(null);
  const [endedWorkdayId, setEndedWorkdayId] = useState<string | null>(null);

  const refreshState = useCallback(() => queryClient.invalidateQueries({ queryKey: TIME_STATE_QUERY_KEY }), [queryClient]);

  const run = useCallback(async (event: TimeEventType) => {
    if (isRunning.current) return;
    isRunning.current = true;
    setRunningEvent(event);
    try {
      const result = await recordTimeEvent(event);
      if (result.ok) {
        const answer = result.data;
        setInconsistencyMessage(null);
        if (answer && !answer.alreadyApplied && result.message) toast(result.message);
        if (event === "END" && answer?.workdayId && answer.state.workday?.id !== answer.workdayId) setEndedWorkdayId(answer.workdayId);
        else if (event === "START") setEndedWorkdayId(null);
        return;
      }
      if (result.code === TIME_RECORD_INCONSISTENT) setInconsistencyMessage(problemMessage(result, t));
      else if (result.code === NETWORK_ERROR) toast(t(UNREACHABLE), "bad");
      else toast(problemMessage(result, t), "bad");
      await refreshState();
    } finally {
      isRunning.current = false;
      setRunningEvent(null);
    }
  }, [refreshState, t, toast]);

  const retry = useCallback(() => {
    setInconsistencyMessage(null);
    void refreshState();
  }, [refreshState]);

  return { run, runningEvent, inconsistencyMessage, retry, endedWorkdayId };
}

/**
 * Which time buttons the timer shows in each state, and whether they can be pressed (the old timer panel's rules). The API
 * enforces the same rules (409 codes); these keep the screen from offering what would be refused. Labels are translation keys.
 */
import type { LiveStatus, TimeEventType } from "./types";

export interface TimerAction {
  event: TimeEventType;
  /** Translation key of the button. */
  label: string;
  /** The main button of the state (gold, larger). */
  isPrimary: boolean;
  isEnabled: boolean;
  /** Ending the day asks "are you sure?" first. */
  needsConfirmation: boolean;
  /** Why a button is disabled, or what pressing it means (translation key), shown under the buttons. */
  hint?: string;
}

/** End is disabled during a break: the break must be ended with Back to work first. */
export const END_DISABLED_ON_BREAK_HINT = "Return from your break before ending your day.";
/** Starting again after the day ended reopens the same workday. */
export const START_AGAIN_HINT = "Starting again reopens today's workday. The time since you ended counts as neither productive nor break time.";

/**
 * The buttons of a state. `isBusy`: a time request is running, so nothing can be pressed (no double submissions).
 */
export function timerActionsFor(status: LiveStatus, isBusy: boolean): TimerAction[] {
  const action = (event: TimeEventType, label: string, isPrimary: boolean, isAllowed = true, hint?: string): TimerAction => ({
    event,
    label,
    isPrimary,
    isEnabled: isAllowed && !isBusy,
    needsConfirmation: event === "END",
    ...(hint ? { hint } : {}),
  });
  switch (status) {
    case "NOT_STARTED":
      return [action("START", "Start work", true)];
    case "WORKING":
      return [action("BREAK", "Take a break", true), action("END", "End workday", false)];
    case "ON_BREAK":
      return [action("RESUME", "Back to work", true), action("END", "End workday", false, false, END_DISABLED_ON_BREAK_HINT)];
    case "DAY_ENDED":
      return [action("START", "Start again", true, true, START_AGAIN_HINT)];
  }
}

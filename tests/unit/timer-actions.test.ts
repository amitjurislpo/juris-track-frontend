import { describe, expect, it } from "vitest";
import { HINDI_MESSAGES } from "@/standalone/i18n/translate";
import { END_DISABLED_ON_BREAK_HINT, START_AGAIN_HINT, timerActionsFor } from "@/track/lib/time/timer-actions";
import { LIVE_STATUSES, type LiveStatus } from "@/track/lib/time/types";

/** "EVENT:enabled" or "EVENT:disabled" per button, in order. */
const buttons = (status: LiveStatus, isBusy: boolean) =>
  timerActionsFor(status, isBusy).map((action) => `${action.event}:${action.isEnabled ? "enabled" : "disabled"}`);

describe("time buttons per state", () => {
  it("offers Start work before the day started", () => {
    expect(buttons("NOT_STARTED", false)).toEqual(["START:enabled"]);
    expect(timerActionsFor("NOT_STARTED", false)[0]).toMatchObject({ label: "Start work", isPrimary: true, needsConfirmation: false });
  });

  it("offers Take a break and End workday while working; End asks for confirmation", () => {
    expect(buttons("WORKING", false)).toEqual(["BREAK:enabled", "END:enabled"]);
    const [takeBreak, end] = timerActionsFor("WORKING", false);
    expect(takeBreak).toMatchObject({ label: "Take a break", isPrimary: true });
    expect(end).toMatchObject({ label: "End workday", isPrimary: false, needsConfirmation: true });
  });

  it("disables End workday during a break and says why", () => {
    expect(buttons("ON_BREAK", false)).toEqual(["RESUME:enabled", "END:disabled"]);
    expect(timerActionsFor("ON_BREAK", false)[1].hint).toBe(END_DISABLED_ON_BREAK_HINT);
  });

  it("offers Start again after the day ended and explains the gap", () => {
    expect(buttons("DAY_ENDED", false)).toEqual(["START:enabled"]);
    expect(timerActionsFor("DAY_ENDED", false)[0]).toMatchObject({ label: "Start again", hint: START_AGAIN_HINT });
  });

  it("disables every button while a request runs", () => {
    for (const status of LIVE_STATUSES) {
      expect(timerActionsFor(status, true).every((action) => !action.isEnabled), status).toBe(true);
    }
  });

  it("has Hindi for every button label and hint", () => {
    for (const status of LIVE_STATUSES) {
      for (const action of timerActionsFor(status, false)) {
        expect(HINDI_MESSAGES[action.label], action.label).toBeTruthy();
        if (action.hint) expect(HINDI_MESSAGES[action.hint], action.hint).toBeTruthy();
      }
    }
  });
});

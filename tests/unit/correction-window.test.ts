import { describe, expect, it } from "vitest";
import { isNowOutsideCorrectionWindow } from "@/track/lib/time-correction";

describe("isNowOutsideCorrectionWindow", () => {
  const KOLKATA = "Asia/Kolkata";

  it("allows the workday's date and the day after, in the business time zone", () => {
    // shift date 2026-10-20: still fine until the end of 2026-10-21 (18:29:59 UTC)
    expect(isNowOutsideCorrectionWindow("2026-10-20", KOLKATA, Date.parse("2026-10-20T10:00:00Z"))).toBe(false);
    expect(isNowOutsideCorrectionWindow("2026-10-20", KOLKATA, Date.parse("2026-10-21T18:29:59Z"))).toBe(false);
  });

  it("is outside from the start of the second day after", () => {
    expect(isNowOutsideCorrectionWindow("2026-10-20", KOLKATA, Date.parse("2026-10-21T18:30:00Z"))).toBe(true);
    expect(isNowOutsideCorrectionWindow("2026-10-20", KOLKATA, Date.parse("2026-10-25T00:00:00Z"))).toBe(true);
  });

  it("widens the window to 12 hours after the scheduled end of a long shift", () => {
    // a 24-hour shift of 2026-10-20 scheduled to end 2026-10-21T23:30Z: the window runs to 2026-10-22T11:30Z
    expect(isNowOutsideCorrectionWindow("2026-10-20", KOLKATA, Date.parse("2026-10-22T11:29:00Z"), "2026-10-21T23:30:00Z")).toBe(false);
    expect(isNowOutsideCorrectionWindow("2026-10-20", KOLKATA, Date.parse("2026-10-22T11:30:00Z"), "2026-10-21T23:30:00Z")).toBe(true);
  });

  it("counts calendar days across a clock change", () => {
    // New York leaves daylight saving on 2026-11-01: the window of 2026-10-31 still ends at the start of 2026-11-02 (05:00 UTC)
    expect(isNowOutsideCorrectionWindow("2026-10-31", "America/New_York", Date.parse("2026-11-02T04:59:00Z"))).toBe(false);
    expect(isNowOutsideCorrectionWindow("2026-10-31", "America/New_York", Date.parse("2026-11-02T05:00:00Z"))).toBe(true);
  });
});

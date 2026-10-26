import { describe, expect, it } from "vitest";
import { HINDI_MESSAGES } from "@/standalone/i18n/translate";
import { resetDisplayLanguage, setDisplayLanguage } from "@/track/lib/time/display-language";
import {
  dayHeading, formatScheduledMinutes, formatScheduledSeconds, formatShiftLabel, formatShiftWindow, formatVariance, isAllDaySeconds, scheduledMinutesOf, shiftCrossesMidnight, shiftOf,
} from "@/track/lib/time/shift";
import type { WorkdayShift } from "@/track/lib/time/types";

const english = (text: string, variables?: Record<string, string | number>) =>
  variables ? text.replace(/\{(\w+)\}/g, (placeholder, name: string) => (name in variables ? String(variables[name]) : placeholder)) : text;

const usShift: WorkdayShift = {
  id: "us", name: "US shift", startTime: "19:30", endTime: "04:30",
  scheduledStartAt: "2026-10-22T14:00:00Z", scheduledEndAt: "2026-10-22T23:00:00Z", scheduledSeconds: 32400,
};

describe("shift windows", () => {
  it("marks an end on the next day with (+1)", () => {
    expect(formatShiftWindow({ startTime: "19:30", endTime: "04:30" })).toBe("07:30 PM – 04:30 AM (+1)");
    expect(formatShiftWindow({ startTime: "14:00", endTime: "23:00" })).toBe("02:00 PM – 11:00 PM");
    expect(formatShiftWindow({ startTime: "09:00", endTime: "09:00" })).toBe("09:00 AM – 09:00 AM (+1)");
    expect(formatShiftWindow({ startTime: "00:00", endTime: "00:00" })).toBe("All day");
    expect(formatScheduledMinutes(1440)).toBe("All day");
    expect(formatScheduledSeconds(86400)).toBe("All day");
  });

  it("trusts crossesMidnight when the API sends it", () => {
    expect(formatShiftWindow({ startTime: "19:30", endTime: "04:30", crossesMidnight: false })).toBe("07:30 PM – 04:30 AM");
    expect(shiftCrossesMidnight("22:00", "06:00")).toBe(true);
    expect(shiftCrossesMidnight("06:00", "14:00")).toBe(false);
  });

  it("labels a shift with its name and window", () => {
    expect(formatShiftLabel(usShift)).toBe("US shift · 07:30 PM – 04:30 AM (+1)");
  });

  it("works out the scheduled length, also across midnight", () => {
    expect(scheduledMinutesOf("19:30", "04:30")).toBe(540);
    expect(scheduledMinutesOf("14:00", "23:00")).toBe(540);
    expect(scheduledMinutesOf("00:00", "23:59")).toBe(1439);
    expect(scheduledMinutesOf("22:00", "06:00")).toBe(480);
  });

  it("writes hours and minutes", () => {
    expect(formatScheduledMinutes(540)).toBe("9h 00m");
    expect(formatScheduledMinutes(485)).toBe("8h 05m");
    expect(formatScheduledSeconds(32400)).toBe("9h 00m");
  });
});

describe("variance wording", () => {
  it("has no variance against the default all-day shift", () => {
    expect(isAllDaySeconds(24 * 3600)).toBe(true);
    expect(isAllDaySeconds(9 * 3600)).toBe(false);
    expect(isAllDaySeconds(null)).toBe(false);
  });
  it("says over, short or on schedule", () => {
    expect(formatVariance(25 * 60)).toBe("+0h 25m over");
    expect(formatVariance(-40 * 60)).toBe("0h 40m short");
    expect(formatVariance(3600 + 5 * 60)).toBe("+1h 05m over");
    expect(formatVariance(-(9 * 3600))).toBe("9h 00m short");
    expect(formatVariance(0)).toBe("On schedule");
    expect(formatVariance(20)).toBe("On schedule");
  });

  it("has Hindi for its patterns", () => {
    for (const key of ["{hours}h {minutes}m", "+{hours}h {minutes}m over", "{hours}h {minutes}m short", "On schedule", "All day"]) expect(HINDI_MESSAGES[key], key).toBeTruthy();
  });

  it("follows the display language", () => {
    setDisplayLanguage("hi-IN", (text, variables) => (HINDI_MESSAGES[text] ?? text).replace(/\{(\w+)\}/g, (placeholder, name: string) => (variables && name in variables ? String(variables[name]) : placeholder)));
    try {
      expect(formatVariance(-40 * 60)).toBe("0 घं 40 मि कम");
    } finally {
      resetDisplayLanguage();
    }
  });
});

describe("which shift and which day heading", () => {
  it("prefers the workday's shift, else the current occurrence", () => {
    expect(shiftOf({ shift: usShift }, null)).toBe(usShift);
    expect(shiftOf(null, usShift)).toBe(usShift);
    expect(shiftOf({ shift: null }, usShift)).toBe(usShift);
    expect(shiftOf(null, null)).toBeNull();
    expect(shiftOf(undefined, undefined)).toBeNull();
  });

  it("says Today for the current occurrence and the shift date for another", () => {
    expect(dayHeading("2026-10-22", "2026-10-22", english)).toBe("Today");
    expect(dayHeading(undefined, "2026-10-22", english)).toBe("Today");
    expect(dayHeading("2026-10-21", "2026-10-22", english)).toMatch(/^Workday of .*21/);
  });
});

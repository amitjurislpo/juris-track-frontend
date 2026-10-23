import { describe, expect, it } from "vitest";
import { HINDI_MESSAGES } from "@/standalone/i18n/translate";
import {
  cellsBetween, changingEntries, chunkEntries, datesByEmployee, monthBounds, nextSelection, patternEntries, patternProblem, WEEKDAY_LABELS, shiftColorSlot, shiftMonth, nextOffDay, nextWorkingDay, shiftShortName, weekdayOf,
  type RosterCell, type RosterDayState, type RosterPattern,
} from "@/track/lib/roster";

const US = "shift-us";
const offDates = (pattern: RosterPattern, from: string, to: string) => patternEntries(pattern, from, to, US).filter((entry) => entry.shiftId === null).map((entry) => entry.date);

describe("dates", () => {
  it("knows the ISO weekday of a date", () => {
    expect(weekdayOf("2026-10-24")).toBe(6); // Saturday
    expect(weekdayOf("2026-10-25")).toBe(7);
    expect(weekdayOf("2026-10-26")).toBe(1);
  });

  it("gives the bounds of a month, leap February included, and moves across years", () => {
    expect(monthBounds("2026-10")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(monthBounds("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthBounds("2026-12").to).toBe("2026-12-31");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("weekly off pattern", () => {
  it("sets Saturday and Sunday off and the shift on the other days", () => {
    const entries = patternEntries({ kind: "weekly", offWeekdays: [6, 7] }, "2026-10-23", "2026-10-27", US);
    expect(entries).toEqual([
      { date: "2026-10-23", shiftId: US }, { date: "2026-10-24", shiftId: null }, { date: "2026-10-25", shiftId: null },
      { date: "2026-10-26", shiftId: US }, { date: "2026-10-27", shiftId: US },
    ]);
  });

  it("is not moved by daylight-saving changes (it works on calendar dates)", () => {
    // US spring forward 2026-03-08, Europe 2026-03-29 and 2026-10-25, US fall back 2026-11-01: Sundays stay Sundays
    expect(offDates({ kind: "weekly", offWeekdays: [7] }, "2026-03-01", "2026-03-31")).toEqual(["2026-03-01", "2026-03-08", "2026-03-15", "2026-03-22", "2026-03-29"]);
    expect(offDates({ kind: "weekly", offWeekdays: [7] }, "2026-10-20", "2026-11-03")).toEqual(["2026-10-25", "2026-11-01"]);
  });
});

describe("rotation pattern", () => {
  const rotation = (daysOn: number, daysOff: number, startDate: string): RosterPattern => ({ kind: "rotation", daysOn, daysOff, startDate });

  it("5 days on, 2 off from the start date", () => {
    expect(offDates(rotation(5, 2, "2026-10-26"), "2026-10-26", "2026-11-08")).toEqual(["2026-10-31", "2026-11-01", "2026-11-07", "2026-11-08"]);
  });

  it("carries on across the end of a month and a year", () => {
    expect(offDates(rotation(4, 3, "2026-12-28"), "2026-12-28", "2027-01-12")).toEqual(["2027-01-01", "2027-01-02", "2027-01-03", "2027-01-08", "2027-01-09", "2027-01-10"]);
    // the same rotation seen from a later month keeps its rhythm
    expect(offDates(rotation(4, 3, "2026-12-28"), "2027-01-08", "2027-01-10")).toEqual(["2027-01-08", "2027-01-09", "2027-01-10"]);
  });

  it("runs backwards before the start date with the same rhythm", () => {
    expect(offDates(rotation(5, 2, "2026-10-26"), "2026-10-19", "2026-10-25")).toEqual(["2026-10-24", "2026-10-25"]);
  });

  it("keeps its rhythm over the clock changes", () => {
    expect(offDates(rotation(6, 1, "2026-10-20"), "2026-10-20", "2026-11-10")).toEqual(["2026-10-26", "2026-11-02", "2026-11-09"]);
  });
});

describe("patternProblem", () => {
  const weekly: RosterPattern = { kind: "weekly", offWeekdays: [7] };

  it("accepts a good pattern", () => {
    expect(patternProblem(weekly, "2026-10-01", "2026-10-31")).toBeNull();
  });

  it("refuses a bad range and an empty or full week", () => {
    expect(patternProblem(weekly, "", "2026-10-31")).toBeTruthy();
    expect(patternProblem(weekly, "2026-11-01", "2026-10-31")).toBeTruthy();
    expect(patternProblem(weekly, "2026-01-01", "2027-01-02")).toBeTruthy();
    expect(patternProblem({ kind: "weekly", offWeekdays: [] }, "2026-10-01", "2026-10-31")).toBeTruthy();
    expect(patternProblem({ kind: "weekly", offWeekdays: [1, 2, 3, 4, 5, 6, 7] }, "2026-10-01", "2026-10-31")).toBeTruthy();
  });

  it("refuses a rotation without days on or off", () => {
    expect(patternProblem({ kind: "rotation", daysOn: 0, daysOff: 2, startDate: "2026-10-01" }, "2026-10-01", "2026-10-31")).toBeTruthy();
    expect(patternProblem({ kind: "rotation", daysOn: 5, daysOff: 1.5, startDate: "2026-10-01" }, "2026-10-01", "2026-10-31")).toBeTruthy();
    expect(patternProblem({ kind: "rotation", daysOn: 5, daysOff: 2, startDate: "" }, "2026-10-01", "2026-10-31")).toBeTruthy();
  });
});

describe("changingEntries", () => {
  const current = new Map<string, RosterDayState>([
    ["2026-10-24", { date: "2026-10-24", shiftId: US, isOff: false }],
    ["2026-10-25", { date: "2026-10-25", shiftId: null, isOff: true }],
  ]);

  it("counts only the dates whose result differs, and the dates it cannot see", () => {
    const entries = [
      { date: "2026-10-24", shiftId: US }, // same
      { date: "2026-10-25", shiftId: null }, // same
      { date: "2026-10-24", shiftId: null }, // working to off
      { date: "2026-10-25", shiftId: US }, // off to working
      { date: "2026-10-26", shiftId: US }, // not shown
    ];
    expect(changingEntries(entries, current).map((entry) => entry.date)).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
    expect(changingEntries(entries.slice(0, 2), current)).toEqual([]);
  });
});

describe("chunkEntries", () => {
  it("splits into batches of at most 62", () => {
    const entries = Array.from({ length: 130 }, (_, i) => i);
    expect(chunkEntries(entries).map((chunk) => chunk.length)).toEqual([62, 62, 6]);
    expect(chunkEntries([])).toEqual([]);
  });
});

describe("cell selection", () => {
  const employees = ["a", "b", "c"];
  const dates = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
  const cell = (employeeId: string, date: string): RosterCell => ({ employeeId, date });

  it("selects the rectangle between two cells, whichever corner comes first", () => {
    const rectangle = cellsBetween(employees, dates, cell("c", "2026-10-03"), cell("b", "2026-10-02"));
    expect(rectangle).toEqual([cell("b", "2026-10-02"), cell("b", "2026-10-03"), cell("c", "2026-10-02"), cell("c", "2026-10-03")]);
  });

  it("a click selects one cell, a second click on it clears, shift extends, ctrl toggles", () => {
    const first = nextSelection([], null, cell("a", "2026-10-01"), "replace", employees, dates);
    expect(first).toEqual([cell("a", "2026-10-01")]);
    expect(nextSelection(first, cell("a", "2026-10-01"), cell("a", "2026-10-01"), "replace", employees, dates)).toEqual([]);
    const range = nextSelection(first, cell("a", "2026-10-01"), cell("a", "2026-10-03"), "extend", employees, dates);
    expect(range).toHaveLength(3);
    const added = nextSelection(range, cell("a", "2026-10-03"), cell("c", "2026-10-04"), "toggle", employees, dates);
    expect(added).toHaveLength(4);
    expect(nextSelection(added, null, cell("c", "2026-10-04"), "toggle", employees, dates)).toHaveLength(3);
    expect(nextSelection(range, cell("b", "2026-10-02"), cell("b", "2026-10-03"), "replace", employees, dates)).toEqual([cell("b", "2026-10-03")]);
  });

  it("groups the selected cells by employee with sorted dates", () => {
    const groups = datesByEmployee([cell("b", "2026-10-03"), cell("a", "2026-10-02"), cell("b", "2026-10-01")]);
    expect(groups.get("b")).toEqual(["2026-10-01", "2026-10-03"]);
    expect(groups.get("a")).toEqual(["2026-10-02"]);
  });
});

describe("shiftColorSlot", () => {
  it("is stable per shift and cycles through six colours", () => {
    const ids = ["s0", "s1", "s2", "s3", "s4", "s5", "s6"];
    expect(shiftColorSlot("s1", ids)).toBe(1);
    expect(shiftColorSlot("s6", ids)).toBe(0);
    expect(shiftColorSlot(null, ids)).toBe(0);
    expect(shiftColorSlot("unknown", ids)).toBe(0);
  });
});

describe("shiftShortName", () => {
  it("uses the initials of several words and the first letters of one", () => {
    expect(shiftShortName("US shift")).toBe("US");
    expect(shiftShortName("UK  late shift")).toBe("ULS");
    expect(shiftShortName("General day")).toBe("GD");
    expect(shiftShortName("Night")).toBe("Nig");
    expect(shiftShortName("")).toBe("");
  });
});

describe("next shift and next week off", () => {
  const days = [
    { date: "2026-10-23", isOff: false, shiftId: "us" },
    { date: "2026-10-24", isOff: true, shiftId: null },
    { date: "2026-10-25", isOff: true, shiftId: null },
    { date: "2026-10-26", isOff: false, shiftId: "us" },
  ];

  it("finds the first working day and the first week off from today on", () => {
    expect(nextWorkingDay(days, "2026-10-24")?.date).toBe("2026-10-26");
    expect(nextWorkingDay(days, "2026-10-23")?.date).toBe("2026-10-23");
    expect(nextOffDay(days, "2026-10-23")?.date).toBe("2026-10-24");
    expect(nextOffDay(days, "2026-10-26")).toBeNull();
    expect(nextWorkingDay([], "2026-10-26")).toBeNull();
  });
});

describe("roster texts", () => {
  it("have Hindi for every pattern problem and weekday", () => {
    const weekly: RosterPattern = { kind: "weekly", offWeekdays: [] };
    const problems = [
      patternProblem(weekly, "", ""), patternProblem(weekly, "2026-11-01", "2026-10-01"), patternProblem(weekly, "2026-01-01", "2028-01-01"), patternProblem(weekly, "2026-10-01", "2026-10-02"),
      patternProblem({ kind: "weekly", offWeekdays: [1, 2, 3, 4, 5, 6, 7] }, "2026-10-01", "2026-10-02"),
      patternProblem({ kind: "rotation", daysOn: 0, daysOff: 1, startDate: "2026-10-01" }, "2026-10-01", "2026-10-02"),
      patternProblem({ kind: "rotation", daysOn: 1, daysOff: 0, startDate: "2026-10-01" }, "2026-10-01", "2026-10-02"),
      patternProblem({ kind: "rotation", daysOn: 1, daysOff: 1, startDate: "" }, "2026-10-01", "2026-10-02"),
    ];
    for (const problem of problems) expect(HINDI_MESSAGES[problem!], String(problem)).toBeTruthy();
    for (const label of Object.values(WEEKDAY_LABELS)) expect(HINDI_MESSAGES[label], label).toBeTruthy();
  });
});

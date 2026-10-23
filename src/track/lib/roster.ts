/**
 * Roster rules (display and input only; the API decides what is allowed): the dates of a month, the week-off patterns
 * (weekly off weekdays, rotation "N days on, M days off"), how many dates a pattern would change, the selection of cells
 * in the grid and the batches of the bulk endpoint. Dates are calendar date keys ("2026-10-22") with no time zone, so a
 * clock change (daylight saving) never moves a pattern.
 */
import { addDays, daysBetween, eachDay, type DateKey } from "./time/business-calendar";

/** One entry of the bulk body: the shift of a date, or null for a week off. */
export interface ScheduleEntryInput {
  date: DateKey;
  shiftId: string | null;
}

/** What one date of the roster currently is (a day of `GET /schedule-entries`). */
export interface RosterDayState {
  date: DateKey;
  shiftId: string | null;
  isOff: boolean;
}

/** The API takes at most this many dates in one range and one bulk call. */
const MAXIMUM_SCHEDULE_DATES = 62;

/** The longest date range the pattern dialog accepts (the dialog saves it in batches of `MAXIMUM_SCHEDULE_DATES`). */
const MAXIMUM_PATTERN_DAYS = 366;

/** ISO weekdays, Monday first: 1 = Monday ... 7 = Sunday. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const WEEKDAY_LABELS: Record<number, string> = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday", 7: "Sunday" };

/** ISO weekday (1 Monday ... 7 Sunday) of a date key. */
export function weekdayOf(date: DateKey): number {
  return ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

/** The first and last date of a month ("2026-02" gives 2026-02-01 and 2026-02-28). */
export function monthBounds(month: string): { from: DateKey; to: DateKey } {
  const from = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = monthNumber === 12 ? `${year + 1}-01-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;
  return { from, to: addDays(nextMonth, -1) };
}

/** The month before (`step` -1) or after (+1) a month. */
export function shiftMonth(month: string, step: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = year * 12 + (monthNumber - 1) + step;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export const isMonth = (value: unknown): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** What a pattern sets: weekly days off, or a rotation of working days and days off. */
export type RosterPattern =
  | { kind: "weekly"; offWeekdays: readonly number[] }
  | { kind: "rotation"; daysOn: number; daysOff: number; startDate: DateKey };

/** The problem with a pattern (a translation key), or null when it can be applied. */
export function patternProblem(pattern: RosterPattern, from: DateKey, to: DateKey): string | null {
  if (!from || !to) return "Choose the first and the last date.";
  if (from > to) return "The first date must not be after the last date.";
  if (daysBetween(from, to) + 1 > MAXIMUM_PATTERN_DAYS) return "Choose at most 366 days at a time.";
  if (pattern.kind === "weekly" && pattern.offWeekdays.length === 0) return "Choose at least one weekday off.";
  if (pattern.kind === "weekly" && pattern.offWeekdays.length === 7) return "Not every weekday can be off.";
  if (pattern.kind === "rotation") {
    if (!Number.isInteger(pattern.daysOn) || pattern.daysOn < 1) return "Days on must be a whole number, 1 or more.";
    if (!Number.isInteger(pattern.daysOff) || pattern.daysOff < 1) return "Days off must be a whole number, 1 or more.";
    if (!pattern.startDate) return "Choose the date the rotation starts on.";
  }
  return null;
}

/** True when `date` is a day off under the pattern. A rotation counts from its start date and also runs backwards before it. */
function isOffUnder(pattern: RosterPattern, date: DateKey): boolean {
  if (pattern.kind === "weekly") return pattern.offWeekdays.includes(weekdayOf(date));
  const cycle = pattern.daysOn + pattern.daysOff;
  const position = ((daysBetween(pattern.startDate, date) % cycle) + cycle) % cycle;
  return position >= pattern.daysOn;
}

/** The entries a pattern sets from `from` to `to`: `shiftId` on working days, null (week off) on days off. */
export function patternEntries(pattern: RosterPattern, from: DateKey, to: DateKey, shiftId: string): ScheduleEntryInput[] {
  return eachDay(from, to).map((date) => ({ date, shiftId: isOffUnder(pattern, date) ? null : shiftId }));
}

/**
 * The entries that would change something: those whose result differs from the date as the roster shows it now. A date the
 * roster does not show (outside the loaded month) cannot be compared, so it counts as a change.
 */
export function changingEntries(entries: readonly ScheduleEntryInput[], current: ReadonlyMap<DateKey, RosterDayState>): ScheduleEntryInput[] {
  return entries.filter((entry) => {
    const day = current.get(entry.date);
    if (!day) return true;
    return entry.shiftId === null ? !day.isOff : day.isOff || day.shiftId !== entry.shiftId;
  });
}

/** Batches for the bulk endpoint (at most `MAXIMUM_SCHEDULE_DATES` dates each). */
export function chunkEntries<Entry>(entries: readonly Entry[], size = MAXIMUM_SCHEDULE_DATES): Entry[][] {
  const chunks: Entry[][] = [];
  for (let start = 0; start < entries.length; start += size) chunks.push(entries.slice(start, start + size));
  return chunks;
}

/** A cell of the grid: one employee on one date. */
export interface RosterCell {
  employeeId: string;
  date: DateKey;
}

export const cellKey = (cell: RosterCell): string => `${cell.employeeId}|${cell.date}`;

/**
 * Every cell of the rectangle between two cells (the rows between their employees, the dates between theirs), in row order.
 * `employeeIds` is the order of the rows on screen, `dates` the order of the columns.
 */
export function cellsBetween(employeeIds: readonly string[], dates: readonly DateKey[], first: RosterCell, second: RosterCell): RosterCell[] {
  const rowA = employeeIds.indexOf(first.employeeId);
  const rowB = employeeIds.indexOf(second.employeeId);
  const columnA = dates.indexOf(first.date);
  const columnB = dates.indexOf(second.date);
  if (rowA < 0 || rowB < 0 || columnA < 0 || columnB < 0) return [first];
  const cells: RosterCell[] = [];
  for (let row = Math.min(rowA, rowB); row <= Math.max(rowA, rowB); row += 1) {
    for (let column = Math.min(columnA, columnB); column <= Math.max(columnA, columnB); column += 1) {
      cells.push({ employeeId: employeeIds[row], date: dates[column] });
    }
  }
  return cells;
}

/** The selected cells grouped by employee, each with its dates in order. */
export function datesByEmployee(cells: readonly RosterCell[]): Map<string, DateKey[]> {
  const groups = new Map<string, DateKey[]>();
  for (const cell of cells) groups.set(cell.employeeId, [...(groups.get(cell.employeeId) ?? []), cell.date]);
  for (const dates of groups.values()) dates.sort();
  return groups;
}

export type SelectionMode = "replace" | "extend" | "toggle";

/**
 * The new selection after a click: a plain click selects only that cell, a shift-click selects the rectangle from the cell last
 * clicked (`anchor`), a ctrl/cmd-click adds or removes the cell. Clicking the only selected cell again clears the selection.
 */
export function nextSelection(
  selection: readonly RosterCell[],
  anchor: RosterCell | null,
  clicked: RosterCell,
  mode: SelectionMode,
  employeeIds: readonly string[],
  dates: readonly DateKey[],
): RosterCell[] {
  if (mode === "extend" && anchor) return cellsBetween(employeeIds, dates, anchor, clicked);
  if (mode === "toggle") {
    const isSelected = selection.some((cell) => cellKey(cell) === cellKey(clicked));
    return isSelected ? selection.filter((cell) => cellKey(cell) !== cellKey(clicked)) : [...selection, clicked];
  }
  if (selection.length === 1 && cellKey(selection[0]) === cellKey(clicked)) return [];
  return [clicked];
}

/** A stable colour slot (0 to 5) per shift, by its place in the business's shift list, for the cells of the grid. */
export function shiftColorSlot(shiftId: string | null, shiftIds: readonly string[]): number {
  const index = shiftId ? shiftIds.indexOf(shiftId) : -1;
  return index < 0 ? 0 : index % 6;
}

/** The short name of a shift for a grid cell: the initials of several words ("US shift" gives "US"), else the first letters ("General" gives "Gen"). */
export function shiftShortName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
  return (words[0] ?? "").slice(0, 3);
}

/** The first day from `today` on that is a working day (it has a shift), or null. */
export function nextWorkingDay<Day extends { date: DateKey; isOff: boolean; shiftId: string | null }>(days: readonly Day[], today: DateKey): Day | null {
  return days.find((day) => day.date >= today && !day.isOff && day.shiftId !== null) ?? null;
}

/** The first day from `today` on that is a week off, or null. */
export function nextOffDay<Day extends { date: DateKey; isOff: boolean }>(days: readonly Day[], today: DateKey): Day | null {
  return days.find((day) => day.date >= today && day.isOff) ?? null;
}

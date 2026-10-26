/**
 * Display rules of shifts (time is counted per shift, not per calendar day): the window "19:30 – 04:30 (+1)", the scheduled hours,
 * the variance of a finished workday against its shift and the heading that says which workday a figure belongs to. Display only:
 * the API sends the raw times and seconds.
 */
import type { DateKey } from "./business-calendar";
import { displayText } from "./display-language";
import { formatDateKey, formatTimeOfDay } from "./format";
import type { WorkdayShift } from "./types";

/** The part of a shift that tells when it starts and ends (the times are "HH:mm" in the business time zone). */
interface ShiftWindow {
  startTime: string;
  endTime: string;
  /** Sent by the shifts endpoints; computed from the two times when absent. */
  crossesMidnight?: boolean;
}

/** True when the shift ends on the next day: it ends at or before the time it starts. */
export function shiftCrossesMidnight(startTime: string, endTime: string): boolean {
  return endTime <= startTime;
}

const minutesOfDay = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/** The length of a shift in minutes (19:30 to 04:30 is 540); an end at or before the start is on the next day. */
export function scheduledMinutesOf(startTime: string, endTime: string): number {
  const difference = minutesOfDay(endTime) - minutesOfDay(startTime);
  return difference > 0 ? difference : difference + 24 * 60;
}

/** 07:30 PM – 04:30 AM (+1) — the "(+1)" marks an end on the next day; the default shift (00:00 – 00:00, the whole calendar day) reads "All day". */
export function formatShiftWindow(shift: ShiftWindow): string {
  if (shift.startTime === "00:00" && shift.endTime === "00:00") return displayText("All day");
  const crossesMidnight = shift.crossesMidnight ?? shiftCrossesMidnight(shift.startTime, shift.endTime);
  return `${formatTimeOfDay(shift.startTime)} – ${formatTimeOfDay(shift.endTime)}${crossesMidnight ? " (+1)" : ""}`;
}

/** US shift · 07:30 PM – 04:30 AM (+1) */
export function formatShiftLabel(shift: ShiftWindow & { name: string }): string {
  return `${shift.name} · ${formatShiftWindow(shift)}`;
}

function hoursAndMinutes(totalSeconds: number): { hours: number; minutes: string } {
  const totalMinutes = Math.round(Math.max(0, totalSeconds) / 60);
  return { hours: Math.floor(totalMinutes / 60), minutes: String(totalMinutes % 60).padStart(2, "0") };
}

/** 9h 00m — scheduled length of a shift given in minutes. */
export function formatScheduledMinutes(scheduledMinutes: number): string {
  if (scheduledMinutes === 24 * 60) return displayText("All day");
  return displayText("{hours}h {minutes}m", hoursAndMinutes(scheduledMinutes * 60));
}

/** True for the default shift (00:00 – 00:00): the whole calendar day, so no scheduled hours to measure a workday against. */
export function isAllDaySeconds(scheduledSeconds: number | null | undefined): boolean {
  return scheduledSeconds === 24 * 3600;
}

/** 9h 00m — the same from seconds (the scheduled length of a workday's shift). */
export function formatScheduledSeconds(scheduledSeconds: number): string {
  if (isAllDaySeconds(scheduledSeconds)) return displayText("All day");
  return displayText("{hours}h {minutes}m", hoursAndMinutes(scheduledSeconds));
}

/** "+0h 25m over", "0h 40m short" or "On schedule" (under a minute apart); productive time minus scheduled time, once the day has ended. */
export function formatVariance(varianceSeconds: number): string {
  const { hours, minutes } = hoursAndMinutes(Math.abs(varianceSeconds));
  if (hours === 0 && minutes === "00") return displayText("On schedule");
  return displayText(varianceSeconds > 0 ? "+{hours}h {minutes}m over" : "{hours}h {minutes}m short", { hours, minutes });
}

/** The shift a figure belongs to: the workday's own shift, else the current occurrence the server sends when no workday exists yet. */
export function shiftOf(workday: { shift: WorkdayShift | null } | null | undefined, currentShift: WorkdayShift | null | undefined): WorkdayShift | null {
  return workday?.shift ?? currentShift ?? null;
}

/** "Today" for the current shift occurrence, else "Workday of {date}" (the workday carries its shift date, which may be yesterday's). */
export function dayHeading(workdayDate: DateKey | null | undefined, today: DateKey, t: (text: string, variables?: Record<string, string | number>) => string): string {
  return workdayDate && workdayDate !== today ? t("Workday of {date}", { date: formatDateKey(workdayDate) }) : t("Today");
}

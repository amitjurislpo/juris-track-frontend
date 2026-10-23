import type { ScheduleDay } from "@/track/api-types";
import { shiftColorSlot, shiftShortName } from "@/track/lib/roster";
import { formatDateKey } from "@/track/lib/time/format";
import { useTrack } from "@/track/TrackContext";

/**
 * One day of one person: the shift's short name in the shift's colour, or "Off". The owner's cell is a button that selects it
 * (click, shift-click for a range, ctrl-click to add); for a manager it is plain text.
 */
export function RosterCellButton({ day, employeeName, shiftIds, isSelected, canEdit, isFull = false, onSelect }: {
  day: ScheduleDay;
  employeeName: string;
  shiftIds: readonly string[];
  isSelected: boolean;
  canEdit: boolean;
  /** Write the shift's whole name (the phone agenda has room) instead of its short name. */
  isFull?: boolean;
  onSelect: (event: React.MouseEvent | React.KeyboardEvent) => void;
}) {
  const { t } = useTrack();
  const fullText = day.isOff ? t("Week off") : (day.shiftName ?? "");
  const text = day.isOff ? t("Off") : isFull ? fullText : shiftShortName(day.shiftName ?? "");
  const className = `roster-cell ${day.isOff ? "off" : `slot-${shiftColorSlot(day.shiftId, shiftIds)}`}${isSelected ? " selected" : ""}${day.source === "ENTRY" ? " entry" : ""}`;
  const label = t("{name}, {date}: {shift}", { name: employeeName, date: formatDateKey(day.date), shift: fullText });
  if (!canEdit) return <span className={className} title={label} aria-label={label}>{text}</span>;
  return (
    <button type="button" className={className} title={label} aria-label={label} aria-pressed={isSelected} data-date={day.date} onClick={onSelect}>{text}</button>
  );
}

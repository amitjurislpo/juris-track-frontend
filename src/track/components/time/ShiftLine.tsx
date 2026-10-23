import type { WorkdayShift } from "@/track/lib/time/types";
import { formatShiftLabel } from "@/track/lib/time/shift";
import { useTrack } from "@/track/TrackContext";
import { OutsideShiftChip } from "./OutsideShiftChip";

/** "Shift: US shift 19:30 – 04:30" with an "Outside shift" chip when work was recorded outside the window; nothing without a shift. */
export function ShiftLine({ shift, isOutsideShift = false }: { shift: Pick<WorkdayShift, "name" | "startTime" | "endTime"> | null; isOutsideShift?: boolean }) {
  const { t } = useTrack();
  if (!shift) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} data-testid="shift-line">
      <span className="faint" style={{ fontSize: 13 }}>{t("Shift: {shift}", { shift: formatShiftLabel(shift) })}</span>
      {isOutsideShift && <OutsideShiftChip />}
    </span>
  );
}

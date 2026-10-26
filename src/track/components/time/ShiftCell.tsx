import type { WorkdayShift } from "@/track/lib/time/types";
import { formatShiftWindow } from "@/track/lib/time/shift";
import { OutsideShiftChip } from "./OutsideShiftChip";

/** The shift of a table row: its name with the window under it, and the "Outside shift" chip when work was recorded outside it. */
export function ShiftCell({ shift, isOutsideShift }: { shift: WorkdayShift | null; isOutsideShift: boolean }) {
  if (!shift) return <>—</>;
  return (
    <>
      <span style={{ whiteSpace: "nowrap" }}>{shift.name}</span>
      <small className="muted" style={{ display: "block", whiteSpace: "nowrap" }}>{formatShiftWindow(shift)}</small>
      {isOutsideShift && <div style={{ marginTop: 4 }}><OutsideShiftChip /></div>}
    </>
  );
}

import { useState } from "react";
import type { Shift } from "@/track/api-types";
import { EmptyState } from "@/track/components/EmptyState";
import { Icon } from "@/track/components/Icon";
import { PageHeader } from "@/track/components/PageHeader";
import { StatusChip } from "@/track/components/StatusChip";
import { formatScheduledMinutes, formatShiftWindow } from "@/track/lib/time/shift";
import { usePage } from "@/track/usePage";
import { ShiftFormDialog } from "./ShiftFormDialog";
import { ShiftStatusButton } from "./ShiftStatusButton";
import { useShifts } from "./useShifts";

/** The owner's shifts: when each starts and ends, how long it is, who works it; add, edit, deactivate. Time is counted per shift. */
export default function ShiftsPage() {
  const { t } = usePage();
  const shifts = useShifts();
  // "new" = the create dialog, a shift = its edit dialog, null = closed
  const [dialog, setDialog] = useState<Shift | "new" | null>(null);

  return (
    <div className="col">
      <PageHeader eyebrow={t("Administration")} title={t("Shifts")} sub={t("When each team works. Time is counted per shift, so a night shift stays one workday across midnight.")}>
        <button type="button" className="btn btn-gold btn-lg" onClick={() => setDialog("new")}><Icon name="plus" size={16} />{t("New shift")}</button>
      </PageHeader>
      <section className="card enter" style={{ ["--i" as string]: 1, padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>{t("Name")}</th>
                <th>{t("Shift hours")}</th>
                <th className="hide-sm">{t("Scheduled")}</th>
                <th className="r">{t("Employees")}</th>
                <th>{t("Status")}</th>
                <th><span className="sr-only">{t("Actions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr key={shift.id} className={shift.isActive ? undefined : "dim"} data-shift-id={shift.id}>
                  <td><b>{shift.name}</b></td>
                  <td className="num" style={{ whiteSpace: "nowrap" }}>
                    {formatShiftWindow(shift)}
                    <small className="sub-sm">{formatScheduledMinutes(shift.scheduledMinutes)}</small>
                  </td>
                  <td className="num hide-sm">{formatScheduledMinutes(shift.scheduledMinutes)}</td>
                  <td className="r num">{shift.employeeCount}</td>
                  <td>
                    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                      <StatusChip isGood={shift.isActive} label={shift.isActive ? t("Active") : t("Inactive")} />
                      {shift.isDefault && <span className="chip info">{t("Default")}</span>}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button type="button" className="btn btn-sm" onClick={() => setDialog(shift)}>{t("Edit")}</button>
                      <ShiftStatusButton shift={shift} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shifts.length && <EmptyState title={t("No shifts yet")} text={t("Add the first shift, then give it to your employees.")} />}
      </section>
      {dialog && <ShiftFormDialog key={dialog === "new" ? "new" : dialog.id} shift={dialog === "new" ? undefined : dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}

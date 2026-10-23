import { TrackLink } from "@/track/components/TrackLink";
import { Icon } from "@/track/components/Icon";
import { nextOffDay, nextWorkingDay } from "@/track/lib/roster";
import { formatDateKey } from "@/track/lib/time/format";
import { formatShiftWindow } from "@/track/lib/time/shift";
import { useTrack } from "@/track/TrackContext";
import { useShifts } from "../admin-shifts/useShifts";
import { useMySchedule } from "../my-schedule/useMySchedule";

/** "Next shift": the date and hours of the next working day, and the next week off, from the next two weeks of the user's schedule. */
export function NextShiftCard({ today }: { today: string }) {
  const { t } = useTrack();
  const days = useMySchedule(today);
  const shiftsById = new Map(useShifts().map((shift) => [shift.id, shift]));
  const nextShift = nextWorkingDay(days, today);
  const nextOff = nextOffDay(days, today);
  const shift = nextShift?.shiftId ? shiftsById.get(nextShift.shiftId) : undefined;
  return (
    <section className="card pad span-12 enter" style={{ ["--i" as string]: 2 }} aria-labelledby="next-shift-heading" data-testid="next-shift">
      <div className="card-h"><h3 id="next-shift-heading">{t("Next shift")}</h3></div>
      {nextShift ? (
        <div>
          <b className="display" style={{ fontSize: 18 }}>{formatDateKey(nextShift.date)}</b>
          <div className="muted num">{nextShift.shiftName}{shift && <> · {formatShiftWindow(shift)}</>}</div>
        </div>
      ) : (
        <span className="muted">{t("No shift in the next two weeks.")}</span>
      )}
      <div className="faint" style={{ fontSize: 13, marginTop: 10 }}>
        {nextOff ? t("Next week off: {date}", { date: formatDateKey(nextOff.date) }) : t("No week off in the next two weeks.")}
      </div>
      <TrackLink className="linklike" to="/my-schedule" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10 }}>
        {t("Open My schedule")}<Icon name="arrow" size={14} />
      </TrackLink>
    </section>
  );
}

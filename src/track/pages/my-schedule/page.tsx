import { EmptyState } from "@/track/components/EmptyState";
import { PageHeader } from "@/track/components/PageHeader";
import { formatDateKey } from "@/track/lib/time/format";
import { formatScheduledMinutes, formatShiftWindow } from "@/track/lib/time/shift";
import { viewerTimeZone } from "@/track/lib/viewer-time-zone";
import { useServerToday } from "@/track/time/useServerToday";
import { usePage } from "@/track/usePage";
import { useShifts } from "../admin-shifts/useShifts";
import { SCHEDULE_DAYS_AHEAD, useMySchedule } from "./useMySchedule";

/** My schedule (`GET /me/schedule`): the next 14 days, each with the shift and its hours, or "Week off". */
export default function MySchedulePage() {
  const { user, t } = usePage();
  const today = useServerToday(viewerTimeZone(user));
  const days = useMySchedule(today);
  const shiftsById = new Map(useShifts().map((shift) => [shift.id, shift]));

  return (
    <div className="col">
      <PageHeader eyebrow={t("My workspace")} title={t("My Schedule")} sub={t("Your shifts and week-off days for the next {count} days.", { count: SCHEDULE_DAYS_AHEAD })} />
      <section className="card enter" style={{ ["--i" as string]: 1, padding: 0 }} aria-label={t("My Schedule")}>
        {days.length > 0 ? (
          <ul className="schedule-list">
            {days.map((day) => {
              const shift = day.shiftId ? shiftsById.get(day.shiftId) : undefined;
              return (
                <li key={day.date} className={day.date === today ? "today" : undefined} data-date={day.date}>
                  <span><b>{formatDateKey(day.date)}</b>{day.date === today && <> <span className="chip nodot gold">{t("Today")}</span></>}</span>
                  {day.isOff
                    ? <span className="chip gold">{t("Week off")}</span>
                    : <span className="num" style={{ textAlign: "right" }}>
                        <b>{day.shiftName}</b>
                        {shift && <small className="muted" style={{ display: "block" }}>{formatShiftWindow(shift)} · {formatScheduledMinutes(shift.scheduledMinutes)}</small>}
                      </span>}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title={t("No schedule to show")} text={t("Your shifts appear here once they are set.")} />
        )}
      </section>
    </div>
  );
}

import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, type ReactNode } from "react";
import { Modal } from "@/track/components/Modal";
import { PageLoading } from "@/track/PageLoading";
import { formatDateKey, formatTime } from "@/track/lib/time/format";
import { workdayFigures } from "@/track/lib/time/live-totals";
import { formatScheduledSeconds, formatVariance } from "@/track/lib/time/shift";
import type { WorkdaySnapshot } from "@/track/lib/time/types";
import { useServerClock } from "@/track/time/useServerClock";
import { useTimeState } from "@/track/time/useTimeState";
import { useTrack } from "@/track/TrackContext";
import { useData } from "@/track/usePage";
import { ShiftLine } from "./ShiftLine";
import { Timeline } from "./Timeline";
import { WorkdayDetailErrorBoundary } from "./WorkdayDetailErrorBoundary";
import { WorkdayStatusChip } from "./WorkdayStatusChip";
import { WorkdaySummary } from "./WorkdaySummary";

/** What a page may add under the workday (the Team tab's corrections), given the workday and the server's "now". */
type WorkdayExtras = (workday: WorkdaySnapshot, nowMilliseconds: number) => ReactNode;

/** The body of the dialog: `GET /workdays/{workdayId}`, its figures and every interval. An open day keeps running. */
function WorkdayDetail({ workdayId, timeZone, renderExtras }: { workdayId: string; timeZone: string; renderExtras?: WorkdayExtras }) {
  const { t } = useTrack();
  const workday = useData<WorkdaySnapshot>(`/workdays/${encodeURIComponent(workdayId)}`);
  const { data: reading } = useTimeState();
  const isOpen = workday ? workday.endedAt === null : false;
  const now = useServerClock(reading?.clockOffsetMilliseconds ?? 0, isOpen);
  if (!workday) return null;
  const live = workdayFigures(workday, now);
  return (
    <div className="col" style={{ gap: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <WorkdayStatusChip status={workday.status} isStale={workday.isStale} isOffDay={workday.isOffDay} />
        <ShiftLine shift={workday.shift} isOutsideShift={workday.isOutsideShift} />
      </div>
      {workday.shift && (
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }} data-testid="shift-schedule">
          {t("Scheduled {start} – {end} ({duration}).", {
            start: formatTime(workday.shift.scheduledStartAt, timeZone),
            end: formatTime(workday.shift.scheduledEndAt, timeZone),
            duration: formatScheduledSeconds(workday.shift.scheduledSeconds),
          })}
          {workday.varianceSeconds !== null && <> <b data-testid="shift-variance">{t("Productive time against the schedule: {variance}.", { variance: formatVariance(workday.varianceSeconds) })}</b></>}
        </p>
      )}
      <WorkdaySummary figures={{ ...live, startedAt: workday.startedAt, endedAt: workday.endedAt, scheduledSeconds: workday.shift?.scheduledSeconds, extraSeconds: workday.extraSeconds }} timeZone={timeZone} label={t("Workday summary")} />
      <Timeline segments={workday.segments} nowMilliseconds={now} timeZone={timeZone} />
      {renderExtras?.(workday, now)}
    </div>
  );
}

/**
 * A workday in a dialog (from a history and the dashboard). `dateKey` titles it while it loads. `renderExtras` adds a section under
 * the intervals (the corrections of the Team tab).
 */
export function WorkdayDetailModal({ workdayId, dateKey, timeZone, onClose, renderExtras }: {
  workdayId: string;
  dateKey: string;
  timeZone: string;
  onClose: () => void;
  renderExtras?: WorkdayExtras;
}) {
  const { t } = useTrack();
  const { reset } = useQueryErrorResetBoundary();
  return (
    <Modal title={formatDateKey(dateKey)} eyebrow={t("Workday")} onClose={onClose}>
      <WorkdayDetailErrorBoundary t={t} onRetry={reset}>
        <Suspense fallback={<PageLoading />}>
          <WorkdayDetail workdayId={workdayId} timeZone={timeZone} renderExtras={renderExtras} />
        </Suspense>
      </WorkdayDetailErrorBoundary>
    </Modal>
  );
}

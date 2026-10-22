import { Suspense } from "react";
import { Modal } from "@/track/components/Modal";
import { PageLoading } from "@/track/PageLoading";
import { formatDateKey } from "@/track/lib/time/format";
import { workdayFigures } from "@/track/lib/time/live-totals";
import type { WorkdaySnapshot } from "@/track/lib/time/types";
import { useServerClock } from "@/track/time/useServerClock";
import { useTimeState } from "@/track/time/useTimeState";
import { useTrack } from "@/track/TrackContext";
import { useData } from "@/track/usePage";
import { Timeline } from "./Timeline";
import { WorkdayStatusChip } from "./WorkdayStatusChip";
import { WorkdaySummary } from "./WorkdaySummary";

/** The body of the dialog: `GET /workdays/{workdayId}`, its figures and every interval. An open day keeps running. */
function WorkdayDetail({ workdayId, timeZone }: { workdayId: string; timeZone: string }) {
  const { t } = useTrack();
  const workday = useData<WorkdaySnapshot>(`/workdays/${encodeURIComponent(workdayId)}`);
  const { data: reading } = useTimeState();
  const isOpen = workday ? workday.endedAt === null : false;
  const now = useServerClock(reading?.clockOffsetMilliseconds ?? 0, isOpen);
  if (!workday) return null;
  const live = workdayFigures(workday, now);
  return (
    <div className="col" style={{ gap: 16 }}>
      <div><WorkdayStatusChip status={workday.status} isStale={workday.isStale} /></div>
      <WorkdaySummary figures={{ ...live, startedAt: workday.startedAt, endedAt: workday.endedAt }} timeZone={timeZone} label={t("Workday summary")} />
      <Timeline segments={workday.segments} nowMilliseconds={now} timeZone={timeZone} />
    </div>
  );
}

/** One of my workdays in a dialog (from the history and the dashboard). `dateKey` titles it while it loads. */
export function WorkdayDetailModal({ workdayId, dateKey, timeZone, onClose }: { workdayId: string; dateKey: string; timeZone: string; onClose: () => void }) {
  const { t } = useTrack();
  return (
    <Modal title={formatDateKey(dateKey)} eyebrow={t("Workday")} onClose={onClose}>
      <Suspense fallback={<PageLoading />}>
        <WorkdayDetail workdayId={workdayId} timeZone={timeZone} />
      </Suspense>
    </Modal>
  );
}

import { useEffect, useState } from "react";
import { TrackLink } from "@/track/components/TrackLink";
import { ApiError, isNetworkError } from "@/track/api";
import { Icon } from "@/track/components/Icon";
import { PageHeader } from "@/track/components/PageHeader";
import { PageLoading } from "@/track/PageLoading";
import { formatDateKey } from "@/track/lib/time/format";
import { useDisplayTimeZone } from "@/track/time/useDisplayTimeZone";
import { useTimeEvent } from "@/track/time/useTimeEvent";
import { useTimeState } from "@/track/time/useTimeState";
import { usePage } from "@/track/usePage";
import { TimerPanel } from "./TimerPanel";

/** True while the browser says it has no network. */
function useIsBrowserOffline(): boolean {
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  return isOffline;
}

/** My time: the timer with start, break, resume and end, today's totals and timeline (`GET /me/time`, `POST /me/time-events`). */
export default function MyTimePage() {
  const { t } = usePage();
  const timeState = useTimeState({ isLive: true });
  const runner = useTimeEvent();
  const { timeZone } = useDisplayTimeZone();
  const isBrowserOffline = useIsBrowserOffline();
  const reading = timeState.data;

  if (!reading) {
    if (timeState.isError) {
      return (
        <div className="empty" role="alert">
          <b className="display">{t("Your time could not be loaded")}</b>
          <span className="muted">{timeState.error.message}</span>
          <button type="button" className="btn btn-sm" onClick={() => { void timeState.refetch(); }}>{t("Check again")}</button>
        </div>
      );
    }
    return <PageLoading />;
  }

  return (
    <div className="col">
      <PageHeader eyebrow={t("My workspace")} title={t("My Time")} sub={formatDateKey(reading.state.today)}>
        <TrackLink className="btn" to="/my-history"><Icon name="cal" size={15} />{t("My History")}</TrackLink>
      </PageHeader>
      <TimerPanel reading={reading} runner={runner} timeZone={timeZone} isOffline={isBrowserOffline || (timeState.isRefetchError && (isNetworkError(timeState.error) || !(timeState.error instanceof ApiError)))} />
    </div>
  );
}

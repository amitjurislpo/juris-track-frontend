import { LIVE_STATUS_LABELS, type LiveStatus } from "@/track/lib/time/types";
import { useTrack } from "@/track/TrackContext";

const STATUS_TONES: Record<LiveStatus, string> = {
  WORKING: "ok",
  ON_BREAK: "warn",
  NOT_STARTED: "neutral",
  DAY_ENDED: "info",
};

/** The state of a workday (Not started / Working / On break / Day ended), plus "Not ended" for a day left open too long. */
export function WorkdayStatusChip({ status, isStale = false }: { status: LiveStatus; isStale?: boolean }) {
  const { t } = useTrack();
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      <span className={`chip ${STATUS_TONES[status]}`}>{t(LIVE_STATUS_LABELS[status])}</span>
      {isStale && <span className="chip bad">{t("Not ended")}</span>}
    </span>
  );
}

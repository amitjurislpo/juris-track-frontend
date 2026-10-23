import { LIVE_STATUS_LABELS, type LiveStatus } from "@/track/lib/time/types";
import { useTrack } from "@/track/TrackContext";

const STATUS_TONES: Record<LiveStatus, string> = {
  WORKING: "ok",
  ON_BREAK: "warn",
  NOT_STARTED: "neutral",
  DAY_ENDED: "info",
};

/**
 * The state of a workday (Not started / Working / On break / Day ended), plus "Not ended" for a day left open too long and "Week off"
 * for a date that is the person's week off (alone when they have not started: it replaces "Not started").
 */
export function WorkdayStatusChip({ status, isStale = false, isOffDay = false }: { status: LiveStatus; isStale?: boolean; isOffDay?: boolean }) {
  const { t } = useTrack();
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      {!(isOffDay && status === "NOT_STARTED") && <span className={`chip ${STATUS_TONES[status]}`}>{t(LIVE_STATUS_LABELS[status])}</span>}
      {isOffDay && <span className="chip gold">{t("Week off")}</span>}
      {isStale && <span className="chip bad">{t("Not ended")}</span>}
    </span>
  );
}

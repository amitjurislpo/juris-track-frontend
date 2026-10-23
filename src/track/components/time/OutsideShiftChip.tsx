import { useTrack } from "@/track/TrackContext";

/** "Outside shift": work was recorded outside the shift's window (and its allowances). */
export function OutsideShiftChip() {
  const { t } = useTrack();
  return <span className="chip warn" title={t("Work was recorded outside the scheduled shift.")}>{t("Outside shift")}</span>;
}

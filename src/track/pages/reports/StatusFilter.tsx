import { useListQuery } from "@/track/components/list/useListQuery";
import { REPORT_STATUS_LABELS, REPORT_STATUSES, type ReportStatus } from "@/track/lib/report-query";
import { useTrack } from "@/track/TrackContext";
import { statusToggleChange } from "./statusToggleChange";

/** The status filter: Working / On break / Day ended / Not ended as toggle buttons, any number at once (`?status=WORKING,NOT_ENDED`); none = every status. */
export function StatusFilter({ selected }: { selected: readonly ReportStatus[] }) {
  const { t, readCurrentSearch } = useTrack();
  const { update } = useListQuery();
  return (
    <div className="report-statuses" role="group" aria-label={t("Status")}>
      <span className="report-filter-label" aria-hidden="true">{t("Status")}</span>
      {REPORT_STATUSES.map((status) => {
        const isOn = selected.includes(status);
        return (
          <button key={status} type="button" className={isOn ? "pill on" : "pill"} aria-pressed={isOn} onClick={() => update(statusToggleChange(status, readCurrentSearch()))}>
            {t(REPORT_STATUS_LABELS[status])}
          </button>
        );
      })}
    </div>
  );
}

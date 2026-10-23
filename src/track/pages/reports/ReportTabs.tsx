import { useRef, type KeyboardEvent } from "react";
import { useListQuery } from "@/track/components/list/useListQuery";
import { REPORT_VIEW_LABELS, REPORT_VIEWS, viewSearchChanges, type ReportView } from "@/track/lib/report-query";
import { useTrack } from "@/track/TrackContext";

/** The id of the tab panel the tabs control (the report table). */
export const REPORT_PANEL_ID = "report-panel";
export const reportTabId = (view: ReportView) => `report-tab-${view}`;

/**
 * Workdays / By employee / By manager / By day, as a WAI-ARIA tab list: the chosen tab is in the URL (`groupBy`); arrow keys,
 * Home and End move between the tabs and open them (roving tab index: Tab leaves the list).
 */
export function ReportTabs({ view }: { view: ReportView }) {
  const { t } = useTrack();
  const { update } = useListQuery();
  const tabList = useRef<HTMLDivElement>(null);
  const openView = (nextView: ReportView, shouldFocus = false) => {
    if (nextView !== view) update(viewSearchChanges(nextView));
    if (shouldFocus) tabList.current?.querySelector<HTMLButtonElement>(`#${reportTabId(nextView)}`)?.focus();
  };
  const moveWithKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = REPORT_VIEWS.indexOf(view);
    const lastIndex = REPORT_VIEWS.length - 1;
    const nextIndex = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: lastIndex }[e.key];
    if (nextIndex === undefined) return;
    e.preventDefault();
    openView(REPORT_VIEWS[(nextIndex + REPORT_VIEWS.length) % REPORT_VIEWS.length], true);
  };
  return (
    <div ref={tabList} className="seg seg-scroll report-tabs" role="tablist" aria-label={t("Report view")} onKeyDown={moveWithKeys}>
      {REPORT_VIEWS.map((tabView) => (
        <button key={tabView} id={reportTabId(tabView)} type="button" role="tab" className={tabView === view ? "on" : undefined}
          aria-selected={tabView === view} aria-controls={REPORT_PANEL_ID} tabIndex={tabView === view ? 0 : -1} onClick={() => openView(tabView)}>
          {t(REPORT_VIEW_LABELS[tabView])}
        </button>
      ))}
    </div>
  );
}

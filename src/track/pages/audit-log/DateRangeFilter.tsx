import { useState } from "react";
import { useListQuery } from "@/track/components/list/useListQuery";
import { customRangeChanges, DATE_PRESET_LABELS, DATE_PRESETS, presetDates, selectedDatePreset, type DatePreset } from "@/track/lib/audit/audit-query";
import { useTrack } from "@/track/TrackContext";

/**
 * The log's date range: All time / Today / Last 7 days / Last 30 days / Custom, kept in the URL as the API's `from` / `to`
 * (inclusive dates in the filter time zone; `today` is today's date there).
 */
export function DateRangeFilter({ searchParams, today }: { searchParams: Record<string, string>; today: string }) {
  const { t } = useTrack();
  const { update } = useListQuery();
  const presetInUrl = selectedDatePreset(searchParams, today);
  const [isCustomOpen, setIsCustomOpen] = useState(presetInUrl === "custom");
  const [customFrom, setCustomFrom] = useState(searchParams.from ?? "");
  const [customTo, setCustomTo] = useState(searchParams.to ?? "");
  // follow the URL when it changes elsewhere (a preset, "Clear all", the back button)
  const rangeInUrl = `${searchParams.from ?? ""}/${searchParams.to ?? ""}`;
  const [lastRangeInUrl, setLastRangeInUrl] = useState(rangeInUrl);
  if (lastRangeInUrl !== rangeInUrl) {
    setLastRangeInUrl(rangeInUrl);
    setCustomFrom(searchParams.from ?? "");
    setCustomTo(searchParams.to ?? "");
    if (presetInUrl !== "custom") setIsCustomOpen(false);
  }
  const shownPreset: DatePreset = isCustomOpen ? "custom" : presetInUrl;

  const choosePreset = (preset: DatePreset) => {
    if (preset === "custom") { setIsCustomOpen(true); return; }
    setIsCustomOpen(false);
    update(presetDates(preset, today));
  };

  return (
    <div className="audit-dates">
      <div className="seg seg-scroll" role="group" aria-label={t("Date range")}>
        {DATE_PRESETS.map((preset) => (
          <button key={preset} type="button" className={shownPreset === preset ? "on" : undefined} aria-pressed={shownPreset === preset} onClick={() => choosePreset(preset)}>
            {t(DATE_PRESET_LABELS[preset])}
          </button>
        ))}
      </div>
      {shownPreset === "custom" && (
        <form className="daynav" style={{ flexWrap: "wrap", gap: 6 }} onSubmit={(e) => { e.preventDefault(); update(customRangeChanges(customFrom, customTo)); }}>
          <input type="date" aria-label={t("From date")} value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} />
          <span className="muted" style={{ fontSize: 13 }}>{t("to")}</span>
          <input type="date" aria-label={t("To date")} value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} />
          <button type="submit" className="btn btn-sm">{t("Apply")}</button>
        </form>
      )}
    </div>
  );
}

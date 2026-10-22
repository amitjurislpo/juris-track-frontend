import { useState } from "react";
import { useListQuery } from "@/track/components/list/useListQuery";
import { RANGE_LABELS, RANGE_PRESETS, type RangePreset } from "@/track/lib/time/date-ranges";
import { rangeSearchChanges } from "@/track/lib/workday-history-query";
import { useTrack } from "@/track/TrackContext";

/**
 * The date range of the history: Today / Yesterday / This week / This month / Custom range, kept in the URL as `range`
 * (and `from` / `to` for a custom range). `from` / `to` are the range the API resolved, the starting values of the date fields.
 */
export function RangeFilter({ range, from, to }: { range: RangePreset; from: string; to: string }) {
  const { t } = useTrack();
  const { update } = useListQuery();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  // follow the API's resolved range when it changes (another preset, back button)
  const [lastResolved, setLastResolved] = useState(`${from}/${to}`);
  if (lastResolved !== `${from}/${to}`) {
    setLastResolved(`${from}/${to}`);
    setCustomFrom(from);
    setCustomTo(to);
  }
  return (
    <div className="toolbar enter" style={{ ["--i" as string]: 1, flexWrap: "wrap", gap: 10 }}>
      <div className="seg seg-scroll" role="group" aria-label={t("Date range")}>
        {RANGE_PRESETS.map((preset) => (
          <button key={preset} type="button" className={range === preset ? "on" : undefined} aria-pressed={range === preset}
            onClick={() => update(rangeSearchChanges(preset, customFrom, customTo))}>
            {t(RANGE_LABELS[preset])}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <form className="daynav" style={{ flexWrap: "wrap", gap: 6 }} onSubmit={(e) => { e.preventDefault(); update(rangeSearchChanges("custom", customFrom, customTo)); }}>
          <input type="date" aria-label={t("From date")} value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} required />
          <span className="muted" style={{ fontSize: 13 }}>{t("to")}</span>
          <input type="date" aria-label={t("To date")} value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} required />
          <button type="submit" className="btn btn-sm">{t("Apply")}</button>
        </form>
      )}
    </div>
  );
}

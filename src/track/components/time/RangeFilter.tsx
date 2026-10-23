import { useId, useState } from "react";
import { useListQuery } from "@/track/components/list/useListQuery";
import { customRangeProblem, MAX_RANGE_DAYS, RANGE_LABELS, RANGE_PRESETS, type RangePreset } from "@/track/lib/time/date-ranges";
import { rangeSearchChanges } from "@/track/lib/workday-history-query";
import { useTrack } from "@/track/TrackContext";

/**
 * A date range: Today / Yesterday / This week / This month / Custom range, kept in the URL as `range` (and `from` / `to` for a
 * custom range). `from` / `to` are the resolved range, the starting values of the date fields. `defaultRange` is the preset the
 * API uses when `range` is left out (the history's "month", the reports' "week"). A custom range is checked before it is applied
 * (both dates, start not after end, at most 366 days).
 */
export function RangeFilter({ range, from, to, defaultRange }: { range: RangePreset; from: string; to: string; defaultRange?: RangePreset }) {
  const { t } = useTrack();
  const { update } = useListQuery();
  const problemId = useId();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [problem, setProblem] = useState<string | null>(null);
  // follow the resolved range when it changes (another preset, back button)
  const [lastResolved, setLastResolved] = useState(`${from}/${to}`);
  if (lastResolved !== `${from}/${to}`) {
    setLastResolved(`${from}/${to}`);
    setCustomFrom(from);
    setCustomTo(to);
    setProblem(null);
  }
  const applyCustomRange = () => {
    const rangeProblem = customRangeProblem(customFrom, customTo);
    setProblem(rangeProblem);
    if (!rangeProblem) update(rangeSearchChanges("custom", customFrom, customTo, defaultRange));
  };
  return (
    <div className="toolbar enter" style={{ ["--i" as string]: 1, flexWrap: "wrap", gap: 10 }}>
      <div className="seg seg-scroll" role="group" aria-label={t("Date range")}>
        {RANGE_PRESETS.map((preset) => (
          <button key={preset} type="button" className={range === preset ? "on" : undefined} aria-pressed={range === preset}
            onClick={() => { setProblem(null); update(rangeSearchChanges(preset, customFrom, customTo, defaultRange)); }}>
            {t(RANGE_LABELS[preset])}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <form className="daynav" style={{ flexWrap: "wrap", gap: 6 }} noValidate onSubmit={(e) => { e.preventDefault(); applyCustomRange(); }}>
          <input type="date" aria-label={t("From date")} value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} required
            aria-invalid={problem ? true : undefined} aria-describedby={problem ? problemId : undefined} />
          <span className="muted" style={{ fontSize: 13 }}>{t("to")}</span>
          <input type="date" aria-label={t("To date")} value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} required
            aria-invalid={problem ? true : undefined} aria-describedby={problem ? problemId : undefined} />
          <button type="submit" className="btn btn-sm">{t("Apply")}</button>
          {problem && <span id={problemId} className="range-problem" role="alert">{t(problem, { days: MAX_RANGE_DAYS })}</span>}
        </form>
      )}
    </div>
  );
}

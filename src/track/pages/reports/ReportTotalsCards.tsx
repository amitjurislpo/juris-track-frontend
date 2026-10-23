import type { ReportTotals } from "@/track/api-types";
import { formatDuration } from "@/track/lib/time/format";
import { useTrack } from "@/track/TrackContext";

/** The range's totals (every page, `totals` of the API): workdays, people, productive, break, span, breaks and the average per workday. */
export function ReportTotalsCards({ totals, rangeText }: { totals: ReportTotals; rangeText: string }) {
  const { t } = useTrack();
  const cards: { label: string; value: string; note?: string }[] = [
    { label: t("Workdays"), value: String(totals.workdays) },
    { label: t("People"), value: String(totals.employees), note: t("with recorded time") },
    { label: t("Productive"), value: formatDuration(totals.productiveSeconds) },
    ...(totals.extraSeconds === undefined ? [] : [{ label: t("Extra time"), value: formatDuration(totals.extraSeconds), note: t("outside the shift or on a week off") }]),
    { label: t("Break"), value: formatDuration(totals.breakSeconds) },
    { label: t("Span"), value: formatDuration(totals.spanSeconds), note: t("start to end of each workday") },
    { label: t("Breaks"), value: String(totals.breakCount) },
    { label: t("Average per workday"), value: formatDuration(totals.averageProductiveSeconds), note: t("productive time per workday") },
  ];
  return (
    <div className="kpis report-kpis enter" style={{ ["--i" as string]: 2 }} role="list" aria-label={t("Totals of {range}", { range: rangeText })}>
      {cards.map((card) => (
        <div key={card.label} className="card kpi" role="listitem" data-testid="report-total">
          <span className="l">{card.label}</span>
          <span className="v num">{card.value}</span>
          {card.note && <span className="s">{card.note}</span>}
        </div>
      ))}
    </div>
  );
}

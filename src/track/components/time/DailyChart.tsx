import { buildDailyChart, type DailyChartPoint } from "@/track/lib/time/daily-chart";
import { formatDateKey, formatDuration } from "@/track/lib/time/format";
import { useTrack } from "@/track/TrackContext";

/**
 * Productive and break time per day as stacked columns (an SVG, no chart library). Every column has an accessible label and a
 * tooltip with the day's figures; the history table next to it is the full non-visual equivalent.
 */
export function DailyChart({ points, height = 170, label }: { points: DailyChartPoint[]; height?: number; label: string }) {
  const { t } = useTrack();
  if (!points.length) return null;
  const chart = buildDailyChart(points);
  const slotShare = 100 / chart.bars.length;
  const heightOf = (fraction: number) => (fraction > 0 ? Math.max(2, fraction * height) : 0);
  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="daychart">
        <div className="daychart-axis" style={{ height }} aria-hidden="true">
          {chart.tickHours.map((hours) => <span key={hours} style={{ bottom: `${(hours / chart.topHours) * 100}%` }}>{t("{hours}h", { hours })}</span>)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <svg width="100%" height={height} role="group" aria-label={label}>
            {chart.tickHours.map((hours) => {
              const y = height - (hours / chart.topHours) * height;
              return <line key={hours} className="grid" x1="0" x2="100%" y1={y} y2={y} aria-hidden="true" />;
            })}
            {chart.bars.map((bar, i) => {
              const productiveHeight = heightOf(bar.productiveFraction);
              const breakHeight = heightOf(bar.breakFraction);
              const description = t("{date}: {productive} productive, {break} break", {
                date: formatDateKey(bar.date),
                productive: formatDuration(bar.productiveSeconds),
                break: formatDuration(bar.breakSeconds),
              });
              return (
                <g key={bar.date} role="img" tabIndex={0} aria-label={description}>
                  <title>{description}</title>
                  <rect className="hit" x={`${i * slotShare}%`} width={`${slotShare}%`} y={0} height={height} rx={6} />
                  <rect className="work" x={`${(i + 0.2) * slotShare}%`} width={`${slotShare * 0.6}%`} y={height - productiveHeight} height={productiveHeight} rx={2} />
                  <rect className="break" x={`${(i + 0.2) * slotShare}%`} width={`${slotShare * 0.6}%`} y={height - productiveHeight - breakHeight} height={breakHeight} rx={2} />
                </g>
              );
            })}
          </svg>
          <div className="daychart-x" aria-hidden="true">
            {chart.bars.map((bar) => (
              <span key={bar.date}>{bar.hasLabel ? formatDateKey(bar.date, { weekday: chart.bars.length <= 7, year: false }).replace(",", "") : ""}</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, paddingLeft: 42 }}>
        <span className="legend"><i className="work" aria-hidden="true"></i>{t("Productive")}</span>
        <span className="legend"><i className="break" aria-hidden="true"></i>{t("Break")}</span>
      </div>
    </div>
  );
}

import type { BusinessSettings } from "@/track/api-types";
import { PageHeader } from "@/track/components/PageHeader";
import { PageLoading } from "@/track/PageLoading";
import { formatDateTime } from "@/track/lib/time/format";
import { zoneLabel } from "@/track/lib/time/zone-names";
import { useData, usePage } from "@/track/usePage";
import { BusinessSettingsForm } from "./BusinessSettingsForm";

/** The owner's business settings: name, time zone, when an open workday counts as stale, and the extra clocks shown. */
export default function SettingsPage() {
  const { t } = usePage();
  const settings = useData<BusinessSettings>("/business");
  if (!settings) return <PageLoading />;
  // the business time zone is always shown, then the chosen display zones
  const shownZones = [...new Set([settings.timeZone, ...settings.displayTimeZones])];
  const now = new Date();
  const formKey = JSON.stringify([settings.name, settings.timeZone, settings.staleWorkdayHours, settings.displayTimeZones]);

  return (
    <div className="col">
      <PageHeader eyebrow={t("Administration")} title={t("Settings")} sub={t("How JurisTrack works for your business.")} />
      <div className="split enter" style={{ ["--i" as string]: 1 }}>
        <BusinessSettingsForm key={formKey} settings={settings} />
        <section className="card" style={{ padding: 20 }} aria-labelledby="clocks-heading">
          <div className="card-h"><h3 id="clocks-heading">{t("Current time")}</h3></div>
          {shownZones.map((zone) => (
            <div key={zone} className="kv"><span className="muted">{zoneLabel(zone, now)}</span><b className="num">{formatDateTime(now, zone)}</b></div>
          ))}
          <p className="muted" style={{ fontSize: 12.5, margin: "12px 0 0" }}>
            {t("A workday that is still open after the stale workday hours is shown as not ended.")}
          </p>
        </section>
      </div>
    </div>
  );
}

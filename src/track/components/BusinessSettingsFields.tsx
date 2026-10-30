import { useMemo } from "react";
import { MAXIMUM_BUSINESS_NAME_LENGTH, MAXIMUM_DISPLAY_TIME_ZONES, type BusinessSettingsForm } from "../lib/business-settings";
import { timeZoneOptions, zoneLabel, zoneOptionLabel } from "../lib/time/zone-names";
import { useTrack } from "../TrackContext";
import { FormField } from "./FormField";
import { Icon } from "./Icon";

/**
 * The settings of a business (name, time zone, stale workday hours, display time zones), edited by the owner (Settings) and by
 * the super admin (a business's page). `errors` holds a message per field name.
 */
export function BusinessSettingsFields({ form, onChange, errors, minimumStaleWorkdayHours }: {
  form: BusinessSettingsForm;
  onChange: (form: BusinessSettingsForm) => void;
  errors: Record<string, string>;
  /** The least the stale workday hours may be set to (the longest shift plus 3 hours). */
  minimumStaleWorkdayHours: number;
}) {
  const { t } = useTrack();
  const zones = useMemo(() => timeZoneOptions([form.timeZone, ...form.displayTimeZones]), [form.timeZone, form.displayTimeZones]);
  const isDisplayListFull = form.displayTimeZones.length >= MAXIMUM_DISPLAY_TIME_ZONES;
  const displayZoneError = errors.displayTimeZones ?? Object.entries(errors).find(([field]) => field.startsWith("displayTimeZones["))?.[1];
  return (
    <div className="col" style={{ gap: 14 }}>
      <FormField label={t("Business name")} error={errors.name}>
        <input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} maxLength={MAXIMUM_BUSINESS_NAME_LENGTH} required />
      </FormField>
      <div className="grid2">
        <FormField label={t("Time zone")} hint={t("workdays started from now on use it")} error={errors.timeZone}>
          <select value={form.timeZone} onChange={(e) => onChange({ ...form, timeZone: e.target.value })}>
            {zones.map((zone) => <option key={zone} value={zone}>{zoneOptionLabel(zone)}</option>)}
          </select>
        </FormField>
        <FormField label={t("Stale workday hours")} hint={t("{minimum} to 48; at least your longest shift plus 3 hours", { minimum: minimumStaleWorkdayHours })} error={errors.staleWorkdayHours}>
          <input type="number" inputMode="numeric" min={minimumStaleWorkdayHours} max={48} step={1} value={form.staleWorkdayHours} onChange={(e) => onChange({ ...form, staleWorkdayHours: e.target.value })} />
        </FormField>
      </div>
      <div className="field">
        <span id="display-time-zones-label">{t("Display time zones")} <span className="hint">{t("up to 8; the business time zone is always shown too")}</span></span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} role="list" aria-labelledby="display-time-zones-label">
          {form.displayTimeZones.map((zone) => (
            <span key={zone} role="listitem" className="chip nodot gold">
              {zoneLabel(zone)}
              <button type="button" className="linkish" style={{ display: "inline-flex" }} aria-label={t("Remove {zone}", { zone })}
                onClick={() => onChange({ ...form, displayTimeZones: form.displayTimeZones.filter((displayZone) => displayZone !== zone) })}>
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
          {!form.displayTimeZones.length && <span className="muted" style={{ fontSize: 13 }}>{t("None")}</span>}
        </div>
        <select aria-label={t("Add a display time zone")} value="" disabled={isDisplayListFull}
          onChange={(e) => { if (e.target.value) onChange({ ...form, displayTimeZones: [...form.displayTimeZones, e.target.value] }); }}>
          <option value="">{isDisplayListFull ? t("The list is full (8 time zones)") : t("Add a display time zone…")}</option>
          {zones.filter((zone) => !form.displayTimeZones.includes(zone)).map((zone) => <option key={zone} value={zone}>{zoneOptionLabel(zone)}</option>)}
        </select>
        {displayZoneError && <span className="err" role="alert">{displayZoneError}</span>}
      </div>
    </div>
  );
}

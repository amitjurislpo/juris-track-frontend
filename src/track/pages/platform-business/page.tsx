import type { ReactNode } from "react";
import type { BusinessDetail } from "@/track/api-types";
import { PageHeader } from "@/track/components/PageHeader";
import { StatusChip } from "@/track/components/StatusChip";
import { PageLoading } from "@/track/PageLoading";
import { formatDateTime, fullName } from "@/track/lib/time/format";
import { viewerTimeZone } from "@/track/lib/viewer-time-zone";
import { useData, usePage } from "@/track/usePage";
import { BusinessStatusButton } from "./BusinessStatusButton";
import { EditBusinessButton } from "./EditBusinessButton";

const KeyValue = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="kv"><span className="muted">{label}</span><b>{children}</b></div>
);

/** One business for the super admin: its owner, head counts and settings; edit the settings, suspend or reactivate it. */
export default function BusinessPage() {
  const { user, t, params } = usePage();
  const business = useData<BusinessDetail>(`/businesses/${encodeURIComponent(params.id)}`);
  if (!business) return <PageLoading />;
  const timeZone = viewerTimeZone(user);
  const { owner } = business;

  return (
    <div className="col">
      <PageHeader back="/platform" eyebrow={t("Business")} title={business.name}
        sub={<StatusChip isGood={!business.isSuspended} label={business.isSuspended ? t("Suspended") : t("Active")} />}>
        <EditBusinessButton business={business} />
        <BusinessStatusButton business={business} />
      </PageHeader>
      <div className="kpis enter" style={{ ["--i" as string]: 1 }}>
        <div className="card kpi"><span className="l">{t("People")}</span><span className="v num">{business.employeeCount}</span></div>
        <div className="card kpi"><span className="l">{t("Active people")}</span><span className="v num">{business.activeEmployeeCount}</span></div>
      </div>
      <div className="cards2 enter" style={{ ["--i" as string]: 2 }}>
        <section className="card" style={{ padding: 20 }} aria-labelledby="owner-heading">
          <div className="card-h"><h3 id="owner-heading">{t("Owner")}</h3></div>
          {owner ? (
            <>
              <KeyValue label={t("Name")}>{fullName(owner)}</KeyValue>
              <KeyValue label={t("Email")}>{owner.email}</KeyValue>
              <KeyValue label={t("Employee code")}>{owner.employeeCode ?? "—"}</KeyValue>
              <KeyValue label={t("Status")}><StatusChip isGood={owner.isActive} label={owner.isActive ? t("Active") : t("Inactive")} /></KeyValue>
              <KeyValue label={t("Last sign-in")}>{owner.lastLoginAt ? formatDateTime(owner.lastLoginAt, timeZone) : t("Never")}</KeyValue>
            </>
          ) : <p className="muted" style={{ margin: 0 }}>{t("This business has no owner account (it comes from JurisOne).")}</p>}
        </section>
        <section className="card" style={{ padding: 20 }} aria-labelledby="settings-heading">
          <div className="card-h"><h3 id="settings-heading">{t("Settings")}</h3></div>
          <KeyValue label={t("Time zone")}>{business.timeZone}</KeyValue>
          <KeyValue label={t("Stale workday hours")}>{business.staleWorkdayHours}</KeyValue>
          <KeyValue label={t("Display time zones")}>{business.displayTimeZones.length ? business.displayTimeZones.join(", ") : t("None")}</KeyValue>
          <KeyValue label={t("Linked to JurisOne")}>{business.isLinkedToJurisone ? t("Yes") : t("No")}</KeyValue>
          <KeyValue label={t("Created")}>{formatDateTime(business.createdAt, timeZone)}</KeyValue>
          <KeyValue label={t("Last changed")}>{formatDateTime(business.updatedAt, timeZone)}</KeyValue>
        </section>
      </div>
    </div>
  );
}

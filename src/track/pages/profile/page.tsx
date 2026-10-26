import { PageHeader } from "@/track/components/PageHeader";
import { fullName } from "@/track/lib/time/format";
import { zoneOptionLabel } from "@/track/lib/time/zone-names";
import { ROLE_LABELS } from "@/track/roles";
import { usePage } from "@/track/usePage";

/** The signed-in user's own account, read-only (from `GET /me`): changes are made by the business owner. */
export default function ProfilePage() {
  const { user, t } = usePage();
  const rows: [string, string][] = [
    [t("Name"), fullName(user)],
    [t("Email"), user.email],
    [t("Employee code"), user.employeeCode ?? "—"],
    [t("Role"), t(ROLE_LABELS[user.role])],
    [t("Reporting manager"), user.managerName ?? t("No manager")],
    [t("Business"), user.businessName ?? "—"],
    [t("Business time zone"), user.businessTimeZone ? zoneOptionLabel(user.businessTimeZone) : "—"],
  ];
  return (
    <div className="col">
      <PageHeader eyebrow={t("My workspace")} title={t("Profile")} sub={user.role === "ADMIN" ? t("Your account details. You can change them on the Employees page.") : t("Your account details. To change them, ask your business owner.")} />
      <section className="card enter" style={{ ["--i" as string]: 1, padding: 20, maxWidth: 640 }} aria-label={t("Account")}>
        <dl style={{ margin: 0 }}>
          {rows.map(([label, value]) => (
            <div key={label} className="kv"><dt className="muted">{label}</dt><dd style={{ margin: 0, fontWeight: 500 }}>{value}</dd></div>
          ))}
        </dl>
      </section>
    </div>
  );
}

import { useState } from "react";
import type { Employee } from "@/track/api-types";
import { ConfirmDialog } from "@/track/components/ConfirmDialog";
import { Icon } from "@/track/components/Icon";
import { StatusChip } from "@/track/components/StatusChip";
import { problemMessage } from "@/track/lib/problems";
import { fullName } from "@/track/lib/time/format";
import { useTrack } from "@/track/TrackContext";
import { setEmployeeLoginAccess } from "./actions";

/**
 * The "Login access" card of the employee page: whether the person can sign in, and for somebody else's record the button that
 * switches it off or on after a confirmation that asks for an optional reason (kept in the audit log). It is not Deactivate: the
 * person stays in the list, the board and the reports.
 */
export function EmployeeLoginAccessCard({ employee, isSelf }: { employee: Employee; isSelf: boolean }) {
  const { t, toast } = useTrack();
  const [isAsking, setIsAsking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDisabling = employee.isLoginEnabled;
  const name = fullName(employee);

  const confirm = async (reason: string) => {
    setIsSaving(true);
    const result = await setEmployeeLoginAccess(employee.id, { isEnabled: !isDisabling, ...(reason ? { reason } : {}) });
    setIsSaving(false);
    if (!result.ok) { setError(problemMessage(result, t)); return; }
    toast(result.message ?? (isDisabling ? t("Login disabled.") : t("Login enabled.")));
    setIsAsking(false);
  };

  return (
    <section className="card" style={{ padding: 20 }} aria-labelledby="login-access-heading">
      <div className="card-h"><h3 id="login-access-heading">{t("Login access")}</h3></div>
      <div className="kv">
        <span className="muted">{t("Sign-in")}</span>
        <StatusChip isGood={employee.isLoginEnabled} label={employee.isLoginEnabled ? t("Login on") : t("Login off")} />
      </div>
      <p className="muted" style={{ margin: "12px 0 0", fontSize: 13.5, lineHeight: 1.6 }}>
        {employee.isLoginEnabled
          ? t("This person can sign in with an emailed code.")
          : t("This person cannot sign in. They stay in the list, the board and the reports.")}
      </p>
      {!isSelf && (
        <div style={{ marginTop: 14 }}>
          <button type="button" className={`btn ${isDisabling ? "btn-danger" : "btn-gold"}`} onClick={() => { setError(null); setIsAsking(true); }}>
            <Icon name={isDisabling ? "lock" : "ok"} size={14} />{isDisabling ? t("Disable login") : t("Enable login")}
          </button>
        </div>
      )}
      {isAsking && (
        <ConfirmDialog
          title={isDisabling ? t("Disable login") : t("Enable login")}
          body={isDisabling
            ? t("Disable login for {name}? They are signed out at once, their open workday is closed, and they get no sign-in codes until you enable it again. They stay in the list, the board and the reports.", { name })
            : t("Enable login for {name}? They can sign in again with an emailed code. Nothing that was closed is reopened.", { name })}
          confirmLabel={isDisabling ? t("Disable login") : t("Enable login")}
          isDanger={isDisabling}
          isBusy={isSaving}
          isReasonAsked
          error={error}
          onConfirm={(reason) => { void confirm(reason); }}
          onClose={() => setIsAsking(false)}
        />
      )}
    </section>
  );
}

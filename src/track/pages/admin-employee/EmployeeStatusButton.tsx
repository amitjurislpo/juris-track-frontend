import { useState } from "react";
import type { Employee } from "@/track/api-types";
import { ConfirmDialog } from "@/track/components/ConfirmDialog";
import { Icon } from "@/track/components/Icon";
import { problemMessage } from "@/track/lib/problems";
import { fullName } from "@/track/lib/time/format";
import { useTrack } from "@/track/TrackContext";
import { setEmployeeStatus } from "./actions";

/** Deactivate / Reactivate an employee, after a confirmation that asks for an optional reason (kept in the audit log). */
export function EmployeeStatusButton({ employee }: { employee: Employee }) {
  const { t, toast } = useTrack();
  const [isAsking, setIsAsking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDeactivating = employee.isActive;
  const name = fullName(employee);

  const confirm = async (reason: string) => {
    setIsSaving(true);
    const result = await setEmployeeStatus(employee.id, { isActive: !isDeactivating, ...(reason ? { reason } : {}) });
    setIsSaving(false);
    if (!result.ok) { setError(problemMessage(result, t)); return; }
    toast(result.message ?? (isDeactivating ? t("Employee deactivated.") : t("Employee is active.")));
    setIsAsking(false);
  };

  return (
    <>
      <button type="button" className={`btn ${isDeactivating ? "btn-danger" : "btn-gold"}`} onClick={() => { setError(null); setIsAsking(true); }}>
        <Icon name={isDeactivating ? "lock" : "ok"} size={14} />{isDeactivating ? t("Deactivate") : t("Reactivate")}
      </button>
      {isAsking && (
        <ConfirmDialog
          title={isDeactivating ? t("Deactivate employee") : t("Reactivate employee")}
          body={isDeactivating
            ? t("Deactivate {name}? They are signed out at once and get no sign-in codes until reactivated. Their reports keep them as manager.", { name })
            : t("Reactivate {name}? They can sign in again with an emailed code.", { name })}
          confirmLabel={isDeactivating ? t("Deactivate") : t("Reactivate")}
          isDanger={isDeactivating}
          isBusy={isSaving}
          isReasonAsked
          error={error}
          onConfirm={(reason) => { void confirm(reason); }}
          onClose={() => setIsAsking(false)}
        />
      )}
    </>
  );
}

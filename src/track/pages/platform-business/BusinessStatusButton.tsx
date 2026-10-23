import { useState } from "react";
import type { BusinessDetail } from "@/track/api-types";
import { ConfirmDialog } from "@/track/components/ConfirmDialog";
import { Icon } from "@/track/components/Icon";
import { problemMessage } from "@/track/lib/problems";
import { useTrack } from "@/track/TrackContext";
import { setBusinessStatus } from "./actions";

/** Suspend / Reactivate, after a confirmation that asks for an optional reason (kept in the audit log). */
export function BusinessStatusButton({ business }: { business: BusinessDetail }) {
  const { t, toast } = useTrack();
  const [isAsking, setIsAsking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSuspending = !business.isSuspended;

  const confirm = async (reason: string) => {
    setIsSaving(true);
    const result = await setBusinessStatus(business.id, { isSuspended: isSuspending, ...(reason ? { reason } : {}) });
    setIsSaving(false);
    if (!result.ok) { setError(problemMessage(result, t)); return; }
    toast(result.message ?? (isSuspending ? t("Business suspended.") : t("Business is active.")));
    setIsAsking(false);
  };

  return (
    <>
      <button type="button" className={`btn ${isSuspending ? "btn-danger" : "btn-gold"}`} onClick={() => { setError(null); setIsAsking(true); }}>
        <Icon name={isSuspending ? "lock" : "ok"} size={14} />{isSuspending ? t("Suspend") : t("Reactivate")}
      </button>
      {isAsking && (
        <ConfirmDialog
          title={isSuspending ? t("Suspend business") : t("Reactivate business")}
          body={isSuspending
            ? t("Suspend {name}? Its people get no sign-in codes and cannot use JurisTrack until you reactivate it. Nothing is deleted.", { name: business.name })
            : t("Reactivate {name}? Its people can sign in and use JurisTrack again.", { name: business.name })}
          confirmLabel={isSuspending ? t("Suspend") : t("Reactivate")}
          isDanger={isSuspending}
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

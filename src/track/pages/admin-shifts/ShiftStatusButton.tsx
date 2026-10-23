import { useState } from "react";
import type { Shift } from "@/track/api-types";
import { ConfirmDialog } from "@/track/components/ConfirmDialog";
import { problemMessage } from "@/track/lib/problems";
import { useTrack } from "@/track/TrackContext";
import { setShiftStatus } from "./actions";

/**
 * Deactivate / Reactivate a shift, after a confirmation. The API refuses to deactivate a shift employees still work (SHIFT_IN_USE)
 * or the default shift (DEFAULT_SHIFT_REQUIRED); the refusal is shown in the dialog.
 */
export function ShiftStatusButton({ shift }: { shift: Shift }) {
  const { t, toast } = useTrack();
  const [isAsking, setIsAsking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDeactivating = shift.isActive;

  const confirm = async () => {
    setIsSaving(true);
    const result = await setShiftStatus(shift.id, { isActive: !isDeactivating });
    setIsSaving(false);
    if (!result.ok) { setError(problemMessage(result, t)); return; }
    toast(result.message ?? (isDeactivating ? t("Shift deactivated.") : t("Shift is active.")));
    setIsAsking(false);
  };

  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => { setError(null); setIsAsking(true); }}>{isDeactivating ? t("Deactivate") : t("Reactivate")}</button>
      {isAsking && (
        <ConfirmDialog
          title={isDeactivating ? t("Deactivate shift") : t("Reactivate shift")}
          body={isDeactivating
            ? t("Deactivate {name}? It can no longer be given to employees. Workdays already recorded keep it.", { name: shift.name })
            : t("Reactivate {name}? It can be given to employees again.", { name: shift.name })}
          confirmLabel={isDeactivating ? t("Deactivate") : t("Reactivate")}
          isDanger={isDeactivating}
          isBusy={isSaving}
          error={error}
          onConfirm={() => { void confirm(); }}
          onClose={() => setIsAsking(false)}
        />
      )}
    </>
  );
}

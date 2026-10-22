import { useState, type ReactNode } from "react";
import { useTrack } from "../TrackContext";
import { Modal } from "./Modal";

/**
 * "Are you sure?" before a change that matters (suspend, deactivate). With `isReasonAsked` it also asks for an optional reason
 * (at most 500 characters, as the API allows) and hands it to `onConfirm`.
 */
export function ConfirmDialog({ title, body, confirmLabel, isDanger, isBusy, isReasonAsked, error, onConfirm, onClose }: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  isDanger?: boolean;
  isBusy?: boolean;
  isReasonAsked?: boolean;
  /** A refusal from the API, shown in the dialog. */
  error?: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const { t } = useTrack();
  const [reason, setReason] = useState("");
  return (
    <Modal title={title} onClose={onClose} isSmall isStacked
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
        <button type="button" className={isDanger ? "btn btn-danger" : "btn btn-gold"} disabled={isBusy} onClick={() => onConfirm(reason.trim())}>{confirmLabel}</button>
      </>}>
      <div className="col" style={{ gap: 14 }}>
        <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{body}</p>
        {isReasonAsked && (
          <label className="field">{t("Reason")} <span className="hint">{t("optional")}</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
          </label>
        )}
        {error && <div className="err" role="alert">{error}</div>}
      </div>
    </Modal>
  );
}

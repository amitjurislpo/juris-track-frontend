import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ApiError, apiData } from "@/track/api";
import type { AuditLogDetail, AuditLogRow } from "@/track/api-types";
import { CopyButton } from "@/track/components/CopyButton";
import { Icon } from "@/track/components/Icon";
import { SidePanel } from "@/track/components/SidePanel";
import { actionLabel, actorName, AUDIT_ENTITY_TYPE_LABELS, AUDIT_SOURCE_LABELS, labelOf } from "@/track/lib/audit/audit-labels";
import { clearAllChanges, requestIdFilterChanges } from "@/track/lib/audit/audit-query";
import { formatDateTime } from "@/track/lib/time/format";
import { ROLE_LABELS } from "@/track/roles";
import { useTrack } from "@/track/TrackContext";
import { auditLogPath } from "./actions";
import { AuditChips } from "./AuditChips";
import { AuditDiff } from "./AuditDiff";

/** One line of the panel: a label and its value (design `.kv`). */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="kv audit-kv">
      <span className="muted">{label}</span>
      <b>{children}</b>
    </div>
  );
}

/**
 * One entry in full (`GET /audit-logs/{auditLogId}`), in a side panel: every field including the request (method, path, user agent)
 * and the reason, the record before and after as a readable diff, the request id with a copy button and links that filter the log by
 * the same request, person or record. Read only: entries cannot be changed or deleted.
 */
export function AuditDetailPanel({ row, timeZone, isPlatform, onClose, onFilter }: {
  row: AuditLogRow;
  timeZone: string;
  isPlatform: boolean;
  onClose: () => void;
  /** Applies URL changes to the log's filters (and closes the panel). */
  onFilter: (changes: Record<string, string | null>) => void;
}) {
  const { t } = useTrack();
  const path = auditLogPath(row.id);
  const query = useQuery({ queryKey: ["track", path], queryFn: () => apiData<AuditLogDetail>(path) });
  const entry: AuditLogRow = query.data ?? row;
  const detail = query.data;
  const actor = actorName(entry.actor, entry.source, t);
  const filterOnly = (changes: Record<string, string>) => onFilter({ ...clearAllChanges(isPlatform), ...changes });
  const requestIdChanges = entry.requestId ? requestIdFilterChanges(entry.requestId, isPlatform) : null;

  return (
    <SidePanel eyebrow={t("Audit entry")} title={actionLabel(entry.action, t)} onClose={onClose}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><AuditChips category={entry.category} outcome={entry.outcome} /></div>
      <section aria-label={t("Entry details")}>
        <Field label={t("When")}>
          <span title={entry.createdAt}>{formatDateTime(entry.createdAt, timeZone)}</span>
        </Field>
        {isPlatform && <Field label={t("Business")}>{entry.businessName ?? t("No business")}</Field>}
        <Field label={t("Actor")}>
          {actor}{entry.actor?.role && <span className="muted"> · {labelOf(ROLE_LABELS, entry.actor.role, t)}</span>}
          {entry.actor && <button type="button" className="linklike audit-link" onClick={() => filterOnly({ actorId: entry.actor!.id })}>{t("Entries by this person")}</button>}
        </Field>
        <Field label={t("Subject")}>
          {entry.subject ? (entry.subject.name ?? t("Unknown person")) : "—"}
          {entry.subject && <button type="button" className="linklike audit-link" onClick={() => filterOnly({ subjectId: entry.subject!.id })}>{t("Entries about this person")}</button>}
        </Field>
        <Field label={t("Action")}>{actionLabel(entry.action, t)}<small className="mono muted">{entry.action}</small></Field>
        <Field label={t("Reason")}>{entry.reason ?? "—"}</Field>
        {entry.summary && <Field label={t("Summary")}>{entry.summary}</Field>}
        <Field label={t("Record")}>
          {entry.entityType ? labelOf(AUDIT_ENTITY_TYPE_LABELS, entry.entityType, t) : "—"}
          {entry.entityId && <small className="mono muted audit-break">{entry.entityId}</small>}
          {entry.entityType && entry.entityId && (
            <button type="button" className="linklike audit-link" onClick={() => filterOnly({ entityType: entry.entityType!, entityId: entry.entityId! })}>{t("Entries of this record")}</button>
          )}
        </Field>
        <Field label={t("Source")}>{labelOf(AUDIT_SOURCE_LABELS, entry.source, t)}</Field>
        <Field label={t("IP address")}><span className="mono">{entry.ipAddress ?? "—"}</span></Field>
        <Field label={t("Request")}>
          {detail ? <span className="mono audit-break">{[detail.httpMethod, detail.requestPath].filter(Boolean).join(" ") || "—"}</span> : "…"}
        </Field>
        <Field label={t("User agent")}>{detail ? <span className="audit-break">{detail.userAgent ?? "—"}</span> : "…"}</Field>
        <Field label={t("Request id")}>
          <span className="mono audit-break">{entry.requestId ?? "—"}</span>
          {entry.requestId && (
            <span className="audit-actions">
              <CopyButton value={entry.requestId} label={t("Copy request id")} copiedMessage={t("Request id copied.")}>{t("Copy request id")}</CopyButton>
              {requestIdChanges && <button type="button" className="btn btn-sm" onClick={() => onFilter(requestIdChanges)}>{t("All entries of this request")}</button>}
            </span>
          )}
        </Field>
      </section>
      <section aria-labelledby="audit-diff-heading" className="col" style={{ gap: 10 }}>
        <h3 id="audit-diff-heading" style={{ margin: 0, fontSize: 15 }}>{t("Before and after")}</h3>
        {query.isPending && <p className="muted" style={{ margin: 0 }}>{t("Loading…")}</p>}
        {query.isError && (
          <div className="notice bad" role="alert">
            <b>{query.error instanceof ApiError && query.error.status === 404 ? t("This entry was not found.") : t("The entry could not be loaded.")}</b>
            <span>{query.error.message}</span>
            <button type="button" className="btn btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => void query.refetch()}>{t("Retry")}</button>
          </div>
        )}
        {detail && <AuditDiff before={detail.before} after={detail.after} />}
      </section>
      <p className="muted audit-note" style={{ margin: 0 }}><Icon name="lock" size={14} />{t("Audit entries are permanent: nobody can change or delete them.")}</p>
    </SidePanel>
  );
}

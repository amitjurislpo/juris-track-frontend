import type { AuditLogRow } from "@/track/api-types";
import { CopyButton } from "@/track/components/CopyButton";
import { SortableHeader } from "@/track/components/list/SortableHeader";
import { actionLabel, actorName, AUDIT_ENTITY_TYPE_LABELS, AUDIT_SOURCE_LABELS, labelOf } from "@/track/lib/audit/audit-labels";
import { shortId } from "@/track/lib/audit/audit-query";
import { formatDateTime } from "@/track/lib/time/format";
import { ROLE_LABELS } from "@/track/roles";
import { useTrack } from "@/track/TrackContext";
import { AuditChips } from "./AuditChips";

/** The sort key the API uses when the URL names none, and its direction (newest first). */
const DEFAULT_SORT = "createdAt";

/**
 * The entries of one page: when (in the display time zone), the business (super admin), who did it with their role, whom it was
 * about, the action as a readable label, category and outcome chips, the record, the source and IP address, the request id
 * (copyable). Narrow screens keep the time, the action (with the actor underneath) and the outcome. A row opens the entry.
 */
export function AuditTable({ rows, timeZone, isPlatform, onOpen }: { rows: AuditLogRow[]; timeZone: string; isPlatform: boolean; onOpen: (row: AuditLogRow) => void }) {
  const { t } = useTrack();
  const sortable = (sortKey: string, label: string, className?: string) => (
    <SortableHeader sortKey={sortKey} defaultSort={DEFAULT_SORT} defaultDirection="desc" className={className}>{label}</SortableHeader>
  );
  return (
    <div className="table-wrap">
      <table className="t audit-table">
        <thead>
          <tr>
            {sortable("createdAt", t("When"))}
            {isPlatform && <th className="hide-md">{t("Business")}</th>}
            {sortable("actor", t("Actor"), "hide-sm")}
            {sortable("subject", t("Subject"), "hide-sm")}
            {sortable("action", t("Action"))}
            {sortable("category", t("Category"), "hide-md")}
            {sortable("outcome", t("Outcome"))}
            <th className="hide-lg">{t("Record")}</th>
            <th className="hide-md">{t("Source")}</th>
            <th className="hide-lg">{t("Request id")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const actor = actorName(row.actor, row.source, t);
            return (
              <tr key={row.id} tabIndex={0} style={{ cursor: "pointer" }} data-audit-id={row.id}
                onClick={() => onOpen(row)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(row); } }}>
                <td className="num nowrap">{formatDateTime(row.createdAt, timeZone)}</td>
                {isPlatform && <td className="hide-md">{row.businessName ?? <span className="muted">{t("No business")}</span>}</td>}
                <td className="hide-sm">
                  <div className="person"><div>
                    <b>{actor}</b>
                    {row.actor?.role && <small>{labelOf(ROLE_LABELS, row.actor.role, t)}</small>}
                  </div></div>
                </td>
                <td className="hide-sm">{row.subject ? (row.subject.name ?? t("Unknown person")) : <span className="muted">—</span>}</td>
                <td>
                  <div className="person"><div>
                    <b>{actionLabel(row.action, t)}</b>
                    <small className="mono">{row.action}</small>
                    <small className="show-sm">{actor}</small>
                  </div></div>
                </td>
                <td className="hide-md"><AuditChips category={row.category} /></td>
                <td><AuditChips category={row.category} outcome={row.outcome} isCategoryShown={false} /></td>
                <td className="hide-lg">
                  {row.entityType
                    ? <div className="person"><div><b>{labelOf(AUDIT_ENTITY_TYPE_LABELS, row.entityType, t)}</b>{row.entityId && <small className="mono" title={row.entityId}>{shortId(row.entityId)}</small>}</div></div>
                    : <span className="muted">—</span>}
                </td>
                <td className="hide-md">
                  <div className="person"><div><b>{labelOf(AUDIT_SOURCE_LABELS, row.source, t)}</b>{row.ipAddress && <small className="mono">{row.ipAddress}</small>}</div></div>
                </td>
                <td className="hide-lg">
                  {row.requestId
                    ? <span className="request-id"><span className="mono" title={row.requestId}>{shortId(row.requestId)}</span>
                        <CopyButton value={row.requestId} label={t("Copy request id")} copiedMessage={t("Request id copied.")} /></span>
                    : <span className="muted">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

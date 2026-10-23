import { useState } from "react";
import { changedRowCount, diffRecords, type DiffKind } from "@/track/lib/audit/audit-diff";
import { useTrack } from "@/track/TrackContext";

/** Translation keys of the kinds of change. */
const KIND_LABELS: Record<DiffKind, string> = { added: "Added", removed: "Removed", changed: "Changed", unchanged: "Unchanged" };
const KIND_CHIPS: Record<DiffKind, string> = { added: "ok", removed: "bad", changed: "warn", unchanged: "neutral" };

/** A value as text; a long one starts collapsed. Always plain text, never HTML. */
function DiffValue({ text, isLong, className }: { text: string | undefined; isLong: boolean; className: string }) {
  const { t } = useTrack();
  if (text === undefined) return <span className="muted">{t("(none)")}</span>;
  if (!isLong) return <code className={`diff-value ${className}`}>{text}</code>;
  return (
    <details className="diff-long">
      <summary><code className={`diff-value ${className}`}>{text.replace(/\s+/g, " ").slice(0, 60)}…</code></summary>
      <pre className={`diff-value ${className}`}>{text}</pre>
    </details>
  );
}

/**
 * The record before and after the change, field by field: changed, added and removed fields are highlighted (old value struck
 * through, new value marked); unchanged fields are hidden behind a button; the raw JSON of both is available collapsed.
 */
export function AuditDiff({ before, after }: { before: unknown; after: unknown }) {
  const { t } = useTrack();
  const [isUnchangedShown, setIsUnchangedShown] = useState(false);
  const rows = diffRecords(before, after);
  if (!rows.length) return <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{t("This entry has no record before or after.")}</p>;
  const unchangedCount = rows.length - changedRowCount(rows);
  const shownRows = isUnchangedShown ? rows : rows.filter((row) => row.kind !== "unchanged");
  return (
    <div className="col" style={{ gap: 10 }}>
      <ul className="diff-list" aria-label={t("Changes")}>
        {shownRows.map((row) => (
          <li key={row.field || "value"} className={`diff-row ${row.kind}`}>
            <div className="diff-head">
              <span className="mono diff-field">{row.field || t("Value")}</span>
              <span className={`chip nodot ${KIND_CHIPS[row.kind]}`}>{t(KIND_LABELS[row.kind])}</span>
            </div>
            {row.kind === "changed" && (
              <div className="diff-change">
                <DiffValue text={row.before} isLong={row.isLong} className="old" />
                <span aria-hidden="true" className="muted">→</span>
                <span className="sr-only">{t("changed to")}</span>
                <DiffValue text={row.after} isLong={row.isLong} className="new" />
              </div>
            )}
            {row.kind === "added" && <DiffValue text={row.after} isLong={row.isLong} className="new" />}
            {row.kind === "removed" && <DiffValue text={row.before} isLong={row.isLong} className="old" />}
            {row.kind === "unchanged" && <DiffValue text={row.after} isLong={row.isLong} className="same" />}
          </li>
        ))}
      </ul>
      {!shownRows.length && <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{t("Nothing changed.")}</p>}
      {unchangedCount > 0 && (
        <button type="button" className="btn btn-sm" style={{ alignSelf: "flex-start" }} aria-expanded={isUnchangedShown} onClick={() => setIsUnchangedShown(!isUnchangedShown)}>
          {isUnchangedShown ? t("Hide unchanged fields") : t("Show {count} unchanged fields", { count: unchangedCount })}
        </button>
      )}
      <details className="diff-long">
        <summary>{t("Raw JSON")}</summary>
        <div className="col" style={{ gap: 8, marginTop: 8 }}>
          <span className="eyebrow">{t("Before")}</span>
          <pre className="diff-value">{JSON.stringify(before ?? null, null, 2)}</pre>
          <span className="eyebrow">{t("After")}</span>
          <pre className="diff-value">{JSON.stringify(after ?? null, null, 2)}</pre>
        </div>
      </details>
    </div>
  );
}

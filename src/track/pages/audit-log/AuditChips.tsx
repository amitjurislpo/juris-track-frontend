import { AUDIT_CATEGORY_LABELS, AUDIT_OUTCOME_CHIPS, AUDIT_OUTCOME_LABELS, labelOf } from "@/track/lib/audit/audit-labels";
import { useTrack } from "@/track/TrackContext";

/** The category and the outcome of an entry as design chips (outcome: green success, amber denied, red failed). */
export function AuditChips({ category, outcome, isCategoryShown = true }: { category: string; outcome?: string; isCategoryShown?: boolean }) {
  const { t } = useTrack();
  const outcomeChip = outcome ? (AUDIT_OUTCOME_CHIPS as Record<string, string>)[outcome] ?? "neutral" : null;
  return (
    <>
      {isCategoryShown && <span className="chip neutral nodot">{labelOf(AUDIT_CATEGORY_LABELS, category, t)}</span>}
      {outcome && <span className={`chip ${outcomeChip}`}>{labelOf(AUDIT_OUTCOME_LABELS, outcome, t)}</span>}
    </>
  );
}

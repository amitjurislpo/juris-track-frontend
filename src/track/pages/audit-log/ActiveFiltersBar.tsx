import { Icon } from "@/track/components/Icon";
import { useListQuery } from "@/track/components/list/useListQuery";
import { actionLabel, AUDIT_ACTION_GROUPS, AUDIT_CATEGORY_LABELS, AUDIT_ENTITY_TYPE_LABELS, AUDIT_OUTCOME_LABELS, AUDIT_SOURCE_LABELS, labelOf } from "@/track/lib/audit/audit-labels";
import { activeFilters, clearAllChanges, NO_BUSINESS, shortId } from "@/track/lib/audit/audit-query";
import { formatDateKey } from "@/track/lib/time/format";
import { useTrack } from "@/track/TrackContext";

/** Translation keys of the filter names. */
const FILTER_LABELS: Record<string, string> = {
  date: "Date",
  search: "Search",
  actorId: "Actor",
  subjectId: "Subject",
  action: "Action",
  category: "Category",
  entityType: "Record type",
  entityId: "Record",
  outcome: "Outcome",
  source: "Source",
  businessId: "Business",
};

/**
 * The filters in effect as removable chips ("Outcome: Denied ×"), with "Clear all". `nameOf` gives the name of a person or
 * business id when the page knows it.
 */
export function ActiveFiltersBar({ searchParams, isPlatform, nameOf }: { searchParams: Record<string, string>; isPlatform: boolean; nameOf: (id: string) => string | null }) {
  const { t } = useTrack();
  const { update } = useListQuery();
  const filters = activeFilters(searchParams, isPlatform);
  if (!filters.length) return null;

  const valueOf = (key: string): string => {
    const value = searchParams[key] ?? "";
    switch (key) {
      case "date": {
        const from = searchParams.from ? formatDateKey(searchParams.from, { weekday: false }) : "…";
        const to = searchParams.to ? formatDateKey(searchParams.to, { weekday: false }) : "…";
        return searchParams.from === searchParams.to ? from : `${from} – ${to}`;
      }
      case "action": {
        const group = AUDIT_ACTION_GROUPS.find((actionGroup) => actionGroup.prefix === value);
        if (group) return t("All: {group}", { group: t(group.label) });
        return value.endsWith(".") ? t("All: {group}", { group: value }) : actionLabel(value, t);
      }
      case "category": return labelOf(AUDIT_CATEGORY_LABELS, value, t);
      case "outcome": return labelOf(AUDIT_OUTCOME_LABELS, value.toUpperCase(), t);
      case "source": return labelOf(AUDIT_SOURCE_LABELS, value.toUpperCase(), t);
      case "entityType": return labelOf(AUDIT_ENTITY_TYPE_LABELS, value, t);
      case "entityId": return shortId(value);
      case "businessId": return value === NO_BUSINESS ? t("No business") : (nameOf(value) ?? shortId(value));
      case "actorId":
      case "subjectId": return nameOf(value) ?? shortId(value);
      default: return value;
    }
  };

  return (
    <div className="active-filters enter" style={{ ["--i" as string]: 2 }} role="group" aria-label={t("Active filters")}>
      {filters.map((filter) => {
        const text = `${t(FILTER_LABELS[filter.key] ?? filter.key)}: ${valueOf(filter.key)}`;
        return (
          <button key={filter.key} type="button" className="filter-chip" aria-label={t("Remove filter {filter}", { filter: text })}
            onClick={() => update(Object.fromEntries(filter.clears.map((name) => [name, null])))}>
            <span>{text}</span><Icon name="x" size={12} />
          </button>
        );
      })}
      <button type="button" className="linklike" style={{ fontSize: 13 }} onClick={() => update(clearAllChanges(isPlatform))}>{t("Clear all")}</button>
    </div>
  );
}

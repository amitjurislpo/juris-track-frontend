import { Icon } from "@/track/components/Icon";
import { useListQuery } from "@/track/components/list/useListQuery";
import {
  clearFiltersChanges,
  hasActiveFilters,
  REPORT_STATUS_LABELS,
  SCOPE_LABELS,
  scopeChoices,
  selectedReportRange,
  selectedScope,
  selectedStatuses,
} from "@/track/lib/report-query";
import { RANGE_LABELS, type DateRange } from "@/track/lib/time/date-ranges";
import { formatDateKey } from "@/track/lib/time/format";
import { useTrack } from "@/track/TrackContext";
import { statusRemovalChange } from "./statusToggleChange";
import { useEmployeeName } from "./useEmployeeName";

interface FilterChip {
  key: string;
  text: string;
  /** The URL changes that remove this filter (worked out at the click, from the browser's current URL where it matters). */
  removal: () => Record<string, string | null>;
}

/**
 * The filters in use, one removable chip each (range other than this week, scope other than the role's default, employee,
 * manager, each status, search), and "Clear all". Hidden when only the defaults apply.
 */
export function ActiveFilterBar({ searchParams, role, range, managerName }: {
  searchParams: Record<string, string>;
  role: "MANAGER" | "ADMIN";
  range: DateRange;
  managerName: string | undefined;
}) {
  const { t, readCurrentSearch } = useTrack();
  const { update } = useListQuery();
  const employeeName = useEmployeeName(searchParams);
  if (!hasActiveFilters(searchParams, role)) return null;
  const chips: FilterChip[] = [];
  const preset = selectedReportRange(searchParams);
  if (preset !== "week") {
    const text = preset === "custom" ? `${formatDateKey(range.from, { weekday: false })} – ${formatDateKey(range.to, { weekday: false })}` : t(RANGE_LABELS[preset]);
    chips.push({ key: "range", text, removal: () => ({ range: null, from: null, to: null }) });
  }
  const scope = selectedScope(searchParams, role);
  if (searchParams.scope && scope && scope !== scopeChoices(role)[0]) chips.push({ key: "scope", text: t(SCOPE_LABELS[role][scope]), removal: () => ({ scope: null }) });
  if (searchParams.employeeId) {
    chips.push({ key: "employeeId", text: t("Employee: {name}", { name: employeeName ?? t("Selected employee") }), removal: () => ({ employeeId: null }) });
  }
  if (searchParams.managerId) {
    chips.push({ key: "managerId", text: t("Manager: {name}", { name: managerName ?? t("Selected manager") }), removal: () => ({ managerId: null }) });
  }
  const statuses = selectedStatuses(searchParams);
  for (const status of statuses) {
    chips.push({ key: `status-${status}`, text: t("Status: {status}", { status: t(REPORT_STATUS_LABELS[status]) }), removal: () => statusRemovalChange(status, readCurrentSearch()) });
  }
  if (searchParams.search?.trim()) chips.push({ key: "search", text: t("Search: {text}", { text: searchParams.search.trim() }), removal: () => ({ search: null }) });

  return (
    <div className="filter-bar enter" style={{ ["--i" as string]: 1 }} role="region" aria-label={t("Filters in use")}>
      <ul className="filter-chips">
        {chips.map((chip) => (
          <li key={chip.key} className="filter-chip">
            <span>{chip.text}</span>
            <button type="button" aria-label={t("Remove filter: {filter}", { filter: chip.text })} onClick={() => update(chip.removal())}>
              <Icon name="x" size={12} />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-sm" onClick={() => update(clearFiltersChanges())}>{t("Clear all")}</button>
    </div>
  );
}

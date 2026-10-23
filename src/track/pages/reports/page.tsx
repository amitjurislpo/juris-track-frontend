import { QueryErrorResetBoundary, useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import { SearchBox } from "@/track/components/list/SearchBox";
import { SegmentedFilter } from "@/track/components/list/SegmentedFilter";
import { useListQuery } from "@/track/components/list/useListQuery";
import { PageHeader } from "@/track/components/PageHeader";
import { RangeFilter } from "@/track/components/time/RangeFilter";
import { PageLoading } from "@/track/PageLoading";
import {
  clearFiltersChanges,
  DEFAULT_REPORT_RANGE,
  hasActiveFilters,
  reportPath,
  resolvedReportRange,
  SCOPE_LABELS,
  scopeChoices,
  selectedStatuses,
  selectedView,
} from "@/track/lib/report-query";
import { viewerTimeZone } from "@/track/lib/viewer-time-zone";
import { useServerToday } from "@/track/time/useServerToday";
import { useDisplayTimeZone } from "@/track/time/useDisplayTimeZone";
import { usePage } from "@/track/usePage";
import { ActiveFilterBar } from "./ActiveFilterBar";
import { EmployeePicker } from "./EmployeePicker";
import { ExportCsvButton } from "./ExportCsvButton";
import { ManagerFilter } from "./ManagerFilter";
import { ReportErrorBoundary } from "./ReportErrorBoundary";
import { ReportResults } from "./ReportResults";
import { StatusFilter } from "./StatusFilter";
import { useReportManagers } from "./useReportManagers";

/**
 * Reports, one page for both roles (`team/reports` for a MANAGER, `admin/reports` for the owner): the workdays of the people in
 * scope for a date range (`GET /reports/workdays`), or the same added up per employee, manager or day (`GET /reports/summaries`),
 * with totals, a daily chart and the CSV export. Every filter lives in the URL under the API's own names. A MANAGER sees their
 * direct reports, or also the indirect ones; the owner sees everybody, or their own reporting line, and can filter by manager.
 */
export default function ReportsPage() {
  const { user, t, searchParams } = usePage();
  const { update } = useListQuery();
  const queryClient = useQueryClient();
  const { timeZone } = useDisplayTimeZone();
  const role = user.role === "ADMIN" ? "ADMIN" : "MANAGER";
  const isOwner = role === "ADMIN";
  const businessTimeZone = viewerTimeZone(user);
  const serverToday = useServerToday(businessTimeZone);
  const range = resolvedReportRange(searchParams, serverToday);
  const view = selectedView(searchParams);
  const path = reportPath(searchParams);
  const hasFilters = hasActiveFilters(searchParams, role);
  const scopes = scopeChoices(role);
  const managers = useReportManagers(isOwner);
  const managerName = managers.find((manager) => manager.id === searchParams.managerId)?.name;
  const employeePath = (employeeId: string) => (isOwner ? `/admin/employees/${employeeId}` : `/team/employees/${employeeId}`);

  return (
    <div className="col">
      <PageHeader eyebrow={isOwner ? t("Administration") : t("Team")} title={t("Reports")}
        sub={isOwner ? t("Workdays of everybody in your business, added up as you need them.") : t("Workdays of the people who report to you, added up as you need them.")}>
        <ExportCsvButton searchParams={searchParams} timeZone={timeZone} from={range.from} to={range.to} />
      </PageHeader>
      <section className="report-filters" aria-label={t("Report filters")}>
        <RangeFilter range={range.preset} from={range.from} to={range.to} defaultRange={DEFAULT_REPORT_RANGE} />
        <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
          <SegmentedFilter name="scope" label={t("People")} defaultValue={scopes[0]}
            options={scopes.map((scope) => ({ value: scope, label: t(SCOPE_LABELS[role][scope]) }))} />
          {isOwner && <ManagerFilter managers={managers} selectedId={searchParams.managerId} />}
          <EmployeePicker searchParams={searchParams} />
          <SearchBox placeholder={t("Search name, email or code")} label={t("Search people")} />
        </div>
        <StatusFilter selected={selectedStatuses(searchParams)} />
      </section>
      <ActiveFilterBar searchParams={searchParams} role={role} range={range} managerName={managerName} />
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ReportErrorBoundary resetKey={path} t={t}
            onReset={() => { reset(); void queryClient.resetQueries({ queryKey: ["track", path] }); }}
            onClearFilters={() => update(clearFiltersChanges())}>
            <Suspense fallback={<PageLoading />}>
              <ReportResults path={path} view={view} timeZone={timeZone} hasFilters={hasFilters} employeePath={employeePath} />
            </Suspense>
          </ReportErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </div>
  );
}

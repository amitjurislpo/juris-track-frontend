import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { ApiError, apiData } from "@/track/api";
import type { AuditLogRow, BusinessRow, Employee, ListPage } from "@/track/api-types";
import { EmptyState } from "@/track/components/EmptyState";
import { Icon } from "@/track/components/Icon";
import { Pagination } from "@/track/components/list/Pagination";
import { SearchBox } from "@/track/components/list/SearchBox";
import { SelectFilter } from "@/track/components/list/SelectFilter";
import { useListQuery } from "@/track/components/list/useListQuery";
import { PageHeader } from "@/track/components/PageHeader";
import { PageLoading } from "@/track/PageLoading";
import {
  AUDIT_CATEGORIES,
  AUDIT_CATEGORY_LABELS,
  AUDIT_ENTITY_TYPE_LABELS,
  AUDIT_OUTCOME_LABELS,
  AUDIT_OUTCOMES,
  AUDIT_SOURCE_LABELS,
  AUDIT_SOURCES,
} from "@/track/lib/audit/audit-labels";
import { activeFilters, clearAllChanges, filterTimeZone, NO_BUSINESS, todayIn } from "@/track/lib/audit/audit-query";
import { fullName } from "@/track/lib/time/format";
import { homeFor } from "@/track/roles";
import { useDisplayTimeZone } from "@/track/time/useDisplayTimeZone";
import { usePage } from "@/track/usePage";
import { ActionFilter } from "./ActionFilter";
import { auditLogsPath, businessSearchPath, employeeSearchPath } from "./actions";
import { ActiveFiltersBar } from "./ActiveFiltersBar";
import { AuditDetailPanel } from "./AuditDetailPanel";
import { AuditTable } from "./AuditTable";
import { DateRangeFilter } from "./DateRangeFilter";
import { ExportButton } from "./ExportButton";
import { rememberedLabel, SearchPicker } from "./SearchPicker";

/** How long after an export starts the list is read again, so the new `audit.exported` entry shows. */
const EXPORT_REFRESH_DELAY_MILLISECONDS = 1500;

const employeeOptions = (data: ListPage<Employee>) => data.rows.map((employee) => ({ value: employee.id, label: fullName(employee), detail: employee.email }));
const businessOptions = (data: ListPage<BusinessRow>) => data.rows.map((business) => ({ value: business.id, label: business.name, detail: business.ownerEmail ?? undefined }));

/**
 * The audit log (`GET /audit-logs`), read only. The owner (`admin/audit-log`) sees their business's entries; the super admin
 * (`platform/audit`) sees every entry and can filter by business, including "No business" (platform events). Filters, sorting
 * and paging live in the URL under the API's parameter names; a row opens the entry in a side panel; "Export CSV" downloads the
 * same filter. Entries cannot be edited or deleted, so there are no such controls.
 */
export default function AuditLogPage() {
  const { user, t, searchParams } = usePage();
  const { update } = useListQuery();
  const queryClient = useQueryClient();
  const isPlatform = user.role === "SUPER_ADMIN";
  const canExport = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const { timeZone } = useDisplayTimeZone();
  const datesTimeZone = filterTimeZone(user);
  const path = auditLogsPath(searchParams, isPlatform);
  const query = useQuery({ queryKey: ["track", path], queryFn: () => apiData<ListPage<AuditLogRow>>(path), placeholderData: keepPreviousData });
  const [openRow, setOpenRow] = useState<AuditLogRow | null>(null);

  const data = query.data;
  const hasFilters = activeFilters(searchParams, isPlatform).length > 0;
  const clearFilters = () => update(clearAllChanges(isPlatform));
  /** The name of a person or business id from the rows on screen (or the one chosen in a picker). */
  const nameOf = (id: string): string | null => {
    const remembered = rememberedLabel(id);
    if (remembered) return remembered;
    for (const row of data?.rows ?? []) {
      if (row.actor?.id === id && row.actor.name) return row.actor.name;
      if (row.subject?.id === id && row.subject.name) return row.subject.name;
      if (row.businessId === id && row.businessName) return row.businessName;
    }
    return null;
  };

  const header = (
    <PageHeader eyebrow={isPlatform ? t("Platform") : t("Administration")} title={t("Audit Log")}
      sub={isPlatform ? t("Every entry of every business, and the platform's own events.") : t("Every sign-in, change, refusal and export in your business: who did it, when and from where.")}>
      {canExport && data && <ExportButton searchParams={searchParams} isPlatform={isPlatform} total={data.total}
        onExported={() => setTimeout(() => void queryClient.invalidateQueries({ queryKey: ["track", path] }), EXPORT_REFRESH_DELAY_MILLISECONDS)} />}
    </PageHeader>
  );

  if (query.isError && !data) {
    const error = query.error;
    const status = error instanceof ApiError ? error.status : 0;
    return (
      <div className="col">
        {header}
        <section className="card enter" style={{ ["--i" as string]: 1 }} role="alert">
          {status === 403
            ? <EmptyState title={t("You don't have access to the audit log")} text={error.message}>
                <Link className="btn btn-sm" to={homeFor(user.role)}>{t("Go to my home page")}</Link>
              </EmptyState>
            : status === 400
              ? <EmptyState title={t("These filters cannot be used")} text={error.message}>
                  <button type="button" className="btn btn-sm" onClick={clearFilters}>{t("Clear filters")}</button>
                </EmptyState>
              : <EmptyState title={t("The audit log could not be loaded")} text={error.message}>
                  <button type="button" className="btn btn-sm" onClick={() => void query.refetch()}>{t("Retry")}</button>
                </EmptyState>}
        </section>
      </div>
    );
  }
  if (!data) return <PageLoading />;

  return (
    <div className="col">
      {header}
      <p className="audit-note enter" style={{ ["--i" as string]: 1 }}>
        <Icon name="lock" size={14} />
        <span>
          {t("Entries are permanent: nobody can edit or delete them.")}{" "}
          {timeZone === datesTimeZone
            ? t("Times and dates are in {zone}.", { zone: timeZone })
            : t("Times are shown in {zone}; date filters use {datesZone}.", { zone: timeZone, datesZone: datesTimeZone })}
        </span>
      </p>
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <SearchBox placeholder={t("Search action, name, request id, record or IP")} label={t("Search the audit log")} />
        <DateRangeFilter searchParams={searchParams} today={todayIn(datesTimeZone)} />
      </div>
      <div className="toolbar audit-filters enter" style={{ ["--i" as string]: 2 }}>
        {isPlatform
          ? <SearchPicker<ListPage<BusinessRow>> name="businessId" label={t("Business")} emptyLabel={t("Any business")}
              selectedLabel={searchParams.businessId ? nameOf(searchParams.businessId) : null} searchPath={businessSearchPath} toOptions={businessOptions}
              fixedOptions={[{ value: NO_BUSINESS, label: t("No business (platform)") }]} />
          : <>
              <SearchPicker<ListPage<Employee>> name="actorId" label={t("Actor")} emptyLabel={t("Anyone")}
                selectedLabel={searchParams.actorId ? nameOf(searchParams.actorId) : null} searchPath={employeeSearchPath} toOptions={employeeOptions} />
              <SearchPicker<ListPage<Employee>> name="subjectId" label={t("Subject")} emptyLabel={t("Anyone")}
                selectedLabel={searchParams.subjectId ? nameOf(searchParams.subjectId) : null} searchPath={employeeSearchPath} toOptions={employeeOptions} />
            </>}
        <ActionFilter />
        <SelectFilter name="category" label={t("Category")} defaultValue=""
          options={[{ value: "", label: t("All") }, ...AUDIT_CATEGORIES.map((category) => ({ value: category, label: t(AUDIT_CATEGORY_LABELS[category]) }))]} />
        <SelectFilter name="outcome" label={t("Outcome")} defaultValue=""
          options={[{ value: "", label: t("All") }, ...AUDIT_OUTCOMES.map((outcome) => ({ value: outcome, label: t(AUDIT_OUTCOME_LABELS[outcome]) }))]} />
        <SelectFilter name="source" label={t("Source")} defaultValue=""
          options={[{ value: "", label: t("All") }, ...AUDIT_SOURCES.map((source) => ({ value: source, label: t(AUDIT_SOURCE_LABELS[source]) }))]} />
        <SelectFilter name="entityType" label={t("Record type")} defaultValue=""
          options={[{ value: "", label: t("All") }, ...Object.entries(AUDIT_ENTITY_TYPE_LABELS).map(([entityType, label]) => ({ value: entityType, label: t(label) }))]} />
        <span className="tcount">{t("{total} found", { total: data.total })}</span>
      </div>
      <ActiveFiltersBar searchParams={searchParams} isPlatform={isPlatform} nameOf={nameOf} />
      <section className="card enter" style={{ ["--i" as string]: 3, padding: 0, overflow: "hidden" }} aria-busy={query.isFetching} aria-label={t("Audit entries")}>
        <div className={query.isPlaceholderData ? "audit-loading" : undefined}>
          {data.rows.length > 0 && <AuditTable rows={data.rows} timeZone={timeZone} isPlatform={isPlatform} onOpen={setOpenRow} />}
        </div>
        {!data.rows.length && (
          hasFilters
            ? <EmptyState title={t("No entries match")} text={t("Try a different search or filter.")}>
                <button type="button" className="btn btn-sm" onClick={clearFilters}>{t("Clear filters")}</button>
              </EmptyState>
            : <EmptyState title={t("No entries yet")} text={t("Sign-ins, changes and refusals appear here as they happen.")} />
        )}
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </section>
      {openRow && (
        <AuditDetailPanel row={openRow} timeZone={timeZone} isPlatform={isPlatform} onClose={() => setOpenRow(null)}
          onFilter={(changes) => { setOpenRow(null); update(changes); }} />
      )}
    </div>
  );
}

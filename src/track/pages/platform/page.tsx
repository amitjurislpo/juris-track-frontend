import { TrackLink } from "@/track/components/TrackLink";
import type { BusinessRow, ListPage } from "@/track/api-types";
import { EmptyState } from "@/track/components/EmptyState";
import { Icon } from "@/track/components/Icon";
import { Pagination } from "@/track/components/list/Pagination";
import { SearchBox } from "@/track/components/list/SearchBox";
import { SegmentedFilter } from "@/track/components/list/SegmentedFilter";
import { SortableHeader } from "@/track/components/list/SortableHeader";
import { useListQuery } from "@/track/components/list/useListQuery";
import { PageHeader } from "@/track/components/PageHeader";
import { StatusChip } from "@/track/components/StatusChip";
import { PageLoading } from "@/track/PageLoading";
import { listPath } from "@/track/lib/list-query";
import { formatDateTime } from "@/track/lib/time/format";
import { viewerTimeZone } from "@/track/lib/viewer-time-zone";
import { useTrack } from "@/track/TrackContext";
import { useData, usePage } from "@/track/usePage";
import { NewBusinessButton } from "./NewBusinessButton";

/** The super admin's businesses: search (name, owner's name or email), status filter, sortable columns, pages. */
export default function BusinessesPage() {
  const { user, t, searchParams } = usePage();
  const { navigate } = useTrack();
  const { update } = useListQuery();
  const data = useData<ListPage<BusinessRow>>(listPath("/businesses", searchParams, ["status"]));
  if (!data) return <PageLoading />;
  const timeZone = viewerTimeZone(user);
  const hasFilters = Boolean(searchParams.search || searchParams.status);

  return (
    <div className="col">
      <PageHeader eyebrow={t("Platform")} title={t("Businesses")} sub={t("Every business on JurisTrack and its owner.")}>
        <NewBusinessButton />
      </PageHeader>
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <SearchBox placeholder={t("Search business, owner or email")} label={t("Search businesses")} />
        <SegmentedFilter name="status" label={t("Status")} defaultValue="all"
          options={[{ value: "all", label: t("All") }, { value: "active", label: t("Active") }, { value: "suspended", label: t("Suspended") }]} />
        <span className="tcount">{t("{total} found", { total: data.total })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 2, padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <SortableHeader sortKey="name" defaultSort="name">{t("Business")}</SortableHeader>
                <th>{t("Owner")}</th>
                <th className="hide-sm">{t("Time zone")}</th>
                <SortableHeader sortKey="employeeCount" defaultSort="name" className="r">{t("People")}</SortableHeader>
                <SortableHeader sortKey="status" defaultSort="name">{t("Status")}</SortableHeader>
                <SortableHeader sortKey="createdAt" defaultSort="name" className="hide-sm">{t("Created")}</SortableHeader>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((business) => (
                <tr key={business.id} tabIndex={0} style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/platform/businesses/${business.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/platform/businesses/${business.id}`); }}>
                  <td>
                    <div className="person">
                      <span className="kpi-ico" style={{ width: 34, height: 34, background: "var(--accentsoft)", color: "var(--accent)" }}><Icon name="building" size={16} /></span>
                      <div>
                        <b><TrackLink to={`/platform/businesses/${business.id}`} style={{ color: "inherit", textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>{business.name}</TrackLink></b>
                        {business.isLinkedToJurisone && <small>{t("Linked to JurisOne")}</small>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {business.ownerName ? <div className="person"><div><b>{business.ownerName}</b><small>{business.ownerEmail}</small></div></div> : <span className="muted">—</span>}
                  </td>
                  <td className="muted hide-sm">{business.timeZone}</td>
                  <td className="r num">{business.activeEmployeeCount}<span className="muted"> / {business.employeeCount}</span></td>
                  <td><StatusChip isGood={!business.isSuspended} label={business.isSuspended ? t("Suspended") : t("Active")} /></td>
                  <td className="muted hide-sm">{formatDateTime(business.createdAt, timeZone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.rows.length && (
          hasFilters
            ? <EmptyState title={t("No business matches")} text={t("Try a different search or filter.")}>
                <button type="button" className="btn btn-sm" onClick={() => update({ search: null, status: null })}>{t("Clear filters")}</button>
              </EmptyState>
            : <EmptyState title={t("No businesses yet")} text={t("Create a business and its owner with “New business”.")} />
        )}
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </section>
    </div>
  );
}

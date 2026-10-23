import { TrackLink } from "@/track/components/TrackLink";
import { ApiError, isNetworkError } from "@/track/api";
import type { TeamBoard } from "@/track/api-types";
import { EmptyState } from "@/track/components/EmptyState";
import { Pagination } from "@/track/components/list/Pagination";
import { SearchBox } from "@/track/components/list/SearchBox";
import { SegmentedFilter } from "@/track/components/list/SegmentedFilter";
import { useListQuery } from "@/track/components/list/useListQuery";
import { PageHeader } from "@/track/components/PageHeader";
import { PageLoading } from "@/track/PageLoading";
import { selectedScope, TEAM_STATUS_FILTERS, teamBoardPath } from "@/track/lib/team-board-query";
import { formatDateKey, formatTime } from "@/track/lib/time/format";
import { LIVE_STATUS_LABELS } from "@/track/lib/time/types";
import { zoneAbbreviation } from "@/track/lib/time/zone-names";
import { useDisplayTimeZone } from "@/track/time/useDisplayTimeZone";
import { useLiveReading } from "@/track/time/useLiveReading";
import { useServerClock } from "@/track/time/useServerClock";
import { usePage } from "@/track/usePage";
import { ScopeControl } from "./ScopeControl";
import { TeamBoardTable } from "./TeamBoardTable";
import { TeamMetricsTiles } from "./TeamMetricsTiles";

/**
 * The live board (`GET /team/members`): the manager's Team tab and the owner's Time Tracking. Tiles over everybody of the scope,
 * the scope (a manager's "Include indirect reports", the owner's "Everybody"), a status filter, search, sortable columns and pages,
 * all in the URL. The timers run on the server's clock from each row's timestamps; the board is read again every 15 seconds while
 * the tab is visible, on focus and when the network returns. A row opens the person.
 */
export default function TeamBoardPage() {
  const { user, t, searchParams } = usePage();
  const { update } = useListQuery();
  const { timeZone } = useDisplayTimeZone();
  const board = useLiveReading<TeamBoard>(teamBoardPath(user.role, searchParams));
  const reading = board.data;
  const hasRunningTimer = Boolean(reading?.value.metrics.working || reading?.value.metrics.onBreak);
  const now = useServerClock(reading?.clockOffsetMilliseconds ?? 0, hasRunningTimer);
  const isOwner = user.role === "ADMIN";

  if (!reading) {
    if (board.isError) throw board.error;
    return <PageLoading />;
  }
  const data = reading.value;
  const scope = selectedScope(user.role, searchParams.scope);
  const hasFilters = Boolean(searchParams.search) || Boolean(searchParams.status && searchParams.status.toLowerCase() !== "all");
  const isReconnecting = board.isRefetchError && (isNetworkError(board.error) || !(board.error instanceof ApiError && board.error.status < 500));

  return (
    <div className="col">
      <PageHeader eyebrow={isOwner ? t("Administration") : t("Team")} title={isOwner ? t("Time Tracking") : t("Team")}
        sub={isOwner ? t("Who is working right now, across your business.") : t("Who is working right now among the people who report to you.")}>
        <span className="faint" role="status" style={{ fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className={`dot${isReconnecting ? "" : " live"}`} style={{ color: isReconnecting ? "var(--warn)" : "var(--ok)" }} aria-hidden="true"></span>
          {isReconnecting
            ? t("Reconnecting…")
            : t("Live · {date}, updated {time}", { date: formatDateKey(data.today, { year: false }), time: `${formatTime(data.serverTime, timeZone)} ${zoneAbbreviation(timeZone, new Date(data.serverTime))}` })}
        </span>
      </PageHeader>
      <TeamMetricsTiles metrics={data.metrics} serverTime={data.serverTime} nowMilliseconds={now} />
      <div className="toolbar enter" style={{ ["--i" as string]: 2, flexWrap: "wrap", gap: 10 }}>
        <SearchBox placeholder={t("Search name, email or code")} label={t("Search people")} />
        <SegmentedFilter name="status" label={t("Status")} defaultValue="all" isScrollable
          options={TEAM_STATUS_FILTERS.map((status) => ({ value: status, label: status === "all" ? t("All") : t(LIVE_STATUS_LABELS[status]) }))} />
        <ScopeControl />
        <span className="tcount">{t("{total} found", { total: data.total })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 3, padding: 0, overflow: "hidden" }} aria-label={t("People")}>
        {data.rows.length > 0 && <TeamBoardTable rows={data.rows} nowMilliseconds={now} timeZone={timeZone} />}
        {!data.rows.length && data.metrics.total === 0 && (
          isOwner && scope === "all"
            ? <EmptyState title={t("Nobody to show yet")} text={t("Add employees to see who is working.")}>
                <TrackLink className="btn btn-sm" to="/admin/employees/new">{t("Add employee")}</TrackLink>
              </EmptyState>
            : <EmptyState title={t("Nobody reports to you yet")}
                text={isOwner ? t("Assign people to yourself as their manager on the Employees page.") : t("When the owner makes you somebody's manager, they appear here.")} />
        )}
        {!data.rows.length && data.metrics.total > 0 && (
          <EmptyState title={t("No one matches")} text={t("Try a different search or filter.")}>
            {hasFilters && <button type="button" className="btn btn-sm" onClick={() => update({ search: null, status: null })}>{t("Clear filters")}</button>}
          </EmptyState>
        )}
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </section>
    </div>
  );
}

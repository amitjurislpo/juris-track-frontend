import type { ListPage, ScheduleRow } from "@/track/api-types";
import { Icon } from "@/track/components/Icon";
import { SearchBox } from "@/track/components/list/SearchBox";
import { useListQuery } from "@/track/components/list/useListQuery";
import { PageHeader } from "@/track/components/PageHeader";
import { toQueryString } from "@/track/lib/list-query";
import { isMonth, monthBounds, shiftMonth } from "@/track/lib/roster";
import { displayLocale } from "@/track/lib/time/display-language";
import { viewerTimeZone } from "@/track/lib/viewer-time-zone";
import { useServerToday } from "@/track/time/useServerToday";
import { useData, usePage } from "@/track/usePage";
import { useShifts } from "../admin-shifts/useShifts";
import { RosterBoard } from "./RosterBoard";
import { RosterManagerFilter } from "./RosterManagerFilter";

/** People per page of the roster (the grid is wide, so fewer than a list). */
const ROSTER_PAGE_SIZE = 20;

/**
 * The roster (`GET /schedule-entries`): one month, one row per person, one column per date, showing each day's shift or week off.
 * The owner edits it (select days, set a shift or a week off, apply a weekly or rotating pattern); a manager reads their reports'.
 * Month, search, manager and page are in the URL.
 */
export default function RosterPage() {
  const { user, t, searchParams } = usePage();
  const { update } = useListQuery();
  const today = useServerToday(viewerTimeZone(user));
  const month = isMonth(searchParams.month) ? searchParams.month : today.slice(0, 7);
  const { from, to } = monthBounds(month);
  const isOwner = user.role === "ADMIN";
  const data = useData<ListPage<ScheduleRow>>(`/schedule-entries${toQueryString({
    from, to, search: searchParams.search, managerId: isOwner ? searchParams.managerId : undefined, page: searchParams.page, pageSize: ROSTER_PAGE_SIZE,
  })}`);
  const activeShifts = useShifts({ isActive: true });
  const allShifts = useShifts();
  const monthTitle = new Intl.DateTimeFormat(displayLocale(), { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${from}T00:00:00Z`));

  return (
    <div className="col">
      <PageHeader eyebrow={isOwner ? t("Administration") : t("Team")} title={t("Roster")}
        sub={isOwner ? t("Who works which shift on which day, and who is off. Select days to change them.") : t("Who works which shift on which day among the people who report to you.")} />
      <div className="toolbar enter" style={{ ["--i" as string]: 1, flexWrap: "wrap", gap: 10 }}>
        <div className="daynav" role="group" aria-label={t("Month")}>
          <button type="button" className="icon-btn" aria-label={t("Previous month")} onClick={() => update({ month: shiftMonth(month, -1) })}><Icon name="chevL" size={16} /></button>
          <b data-testid="roster-month" style={{ minWidth: 120, textAlign: "center" }}>{monthTitle}</b>
          <button type="button" className="icon-btn" aria-label={t("Next month")} onClick={() => update({ month: shiftMonth(month, 1) })}><Icon name="chevR" size={16} /></button>
        </div>
        <SearchBox placeholder={t("Search name, email or code")} label={t("Search people")} />
        {isOwner && <RosterManagerFilter />}
        <span className="tcount">{t("{total} found", { total: data?.total ?? 0 })}</span>
      </div>
      {data && (
        <RosterBoard key={`${from}|${data.page}|${searchParams.search ?? ""}|${searchParams.managerId ?? ""}`} data={data} from={from} to={to} today={today}
          activeShifts={activeShifts} allShifts={allShifts} canEdit={isOwner} hasFilters={Boolean(searchParams.search || (isOwner && searchParams.managerId))} />
      )}
    </div>
  );
}

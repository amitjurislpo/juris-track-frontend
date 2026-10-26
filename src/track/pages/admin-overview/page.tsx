import type { TeamBoard } from "@/track/api-types";
import { Icon } from "@/track/components/Icon";
import { PageHeader } from "@/track/components/PageHeader";
import { TrackLink } from "@/track/components/TrackLink";
import { teamBoardPath } from "@/track/lib/team-board-query";
import { PageLoading } from "@/track/PageLoading";
import { useLiveReading } from "@/track/time/useLiveReading";
import { useServerClock } from "@/track/time/useServerClock";
import { usePage } from "@/track/usePage";
import { TeamMetricsTiles } from "../team-board/TeamMetricsTiles";

/** Where the owner goes from here: the Administration pages, each with what it is for (translation keys). */
const SHORTCUTS: { path: string; icon: string; title: string; text: string }[] = [
  { path: "/admin/time-tracking", icon: "grid", title: "Time Tracking", text: "See who is working right now." },
  { path: "/admin/employees", icon: "users", title: "Employees", text: "Add people and manage their roles and managers." },
  { path: "/admin/shifts", icon: "moon", title: "Shifts", text: "Define the working hours." },
  { path: "/admin/roster", icon: "cal", title: "Roster", text: "Plan who works which shift on which day." },
  { path: "/admin/reports", icon: "chart", title: "Reports", text: "Hours worked by day, person or manager." },
];

/**
 * The owner's landing page: the live numbers of the whole business (the same tiles as the Time Tracking board, from
 * `GET /team/members`) and shortcuts to the Administration pages.
 */
export default function AdminOverviewPage() {
  const { user, t } = usePage();
  const board = useLiveReading<TeamBoard>(teamBoardPath(user.role, {}));
  const reading = board.data;
  const hasRunningTimer = Boolean(reading?.value.metrics.working || reading?.value.metrics.onBreak);
  const now = useServerClock(reading?.clockOffsetMilliseconds ?? 0, hasRunningTimer);
  if (!reading) {
    if (board.isError) throw board.error;
    return <PageLoading />;
  }
  const { metrics, serverTime } = reading.value;
  return (
    <div className="col">
      <PageHeader eyebrow={t("Administration")} title={t("Overview")} sub={t("Your business at a glance.")} />
      <TeamMetricsTiles metrics={metrics} serverTime={serverTime} nowMilliseconds={now} />
      <div className="cards2 enter" style={{ ["--i" as string]: 2 }}>
        {SHORTCUTS.map((shortcut) => (
          <TrackLink key={shortcut.path} to={shortcut.path} className="card pad overview-link">
            <Icon name={shortcut.icon} size={18} />
            <span><b>{t(shortcut.title)}</b><small className="muted">{t(shortcut.text)}</small></span>
          </TrackLink>
        ))}
      </div>
    </div>
  );
}

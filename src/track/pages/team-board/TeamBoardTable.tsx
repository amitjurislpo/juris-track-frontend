import { TrackLink } from "@/track/components/TrackLink";
import type { TeamMemberRow } from "@/track/api-types";
import { SortableHeader } from "@/track/components/list/SortableHeader";
import { LastBreakNote } from "@/track/components/time/LastBreakNote";
import { OutsideShiftChip } from "@/track/components/time/OutsideShiftChip";
import { WorkdayStatusChip } from "@/track/components/time/WorkdayStatusChip";
import { DEFAULT_TEAM_SORT, memberPagePath } from "@/track/lib/team-board-query";
import { formatClock, formatDuration, formatTime, formatTimeOnDay, fullName } from "@/track/lib/time/format";
import { formatShiftLabel, formatShiftWindow } from "@/track/lib/time/shift";
import { teamRowFigures } from "@/track/lib/time/team-live-figures";
import { ACTIVITY_LABELS } from "@/track/lib/time/types";
import { zoneAbbreviation } from "@/track/lib/time/zone-names";
import { useTrack } from "@/track/TrackContext";

/**
 * The people of the board: name and code, manager, state ("Not ended" for a day left open too long, the running break's length),
 * productive time (live for a working person), break time, when work started, the last break and last activity in the display time zone. Sortable through the
 * URL; a row opens the person.
 */
export function TeamBoardTable({ rows, nowMilliseconds, timeZone }: { rows: TeamMemberRow[]; nowMilliseconds: number; timeZone: string }) {
  const { user, t, navigate } = useTrack();
  const zone = zoneAbbreviation(timeZone, new Date(nowMilliseconds));
  return (
    <div className="table-wrap">
      <table className="t">
        <thead>
          <tr>
            <SortableHeader sortKey="name" defaultSort={DEFAULT_TEAM_SORT}>{t("Name")}</SortableHeader>
            <th className="hide-sm">{t("Manager")}</th>
            <th className="hide-sm">{t("Shift")}</th>
            <SortableHeader sortKey="status" defaultSort={DEFAULT_TEAM_SORT}>{t("Status")}</SortableHeader>
            <SortableHeader sortKey="productiveSeconds" defaultSort={DEFAULT_TEAM_SORT} className="r">{t("Productive")}</SortableHeader>
            <th className="r hide-sm">{t("Break")}</th>
            <th className="hide-sm">{t("Work started ({zone})", { zone })}</th>
            <th className="hide-sm">{t("Last break")}</th>
            <SortableHeader sortKey="lastActivity" defaultSort={DEFAULT_TEAM_SORT} className="hide-sm">{t("Last activity")}</SortableHeader>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const figures = teamRowFigures(row, nowMilliseconds);
            const name = fullName(row.employee);
            const memberPath = memberPagePath(user.role, row.employee.id);
            return (
              <tr key={row.employee.id} tabIndex={0} style={{ cursor: "pointer" }} data-employee-id={row.employee.id} className={row.employee.isActive ? undefined : "dim"}
                onClick={() => navigate(memberPath)} onKeyDown={(e) => { if (e.key === "Enter") navigate(memberPath); }}>
                <td>
                  <div className="person"><div>
                    <b><TrackLink to={memberPath} style={{ color: "inherit", textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>{name}</TrackLink></b>
                    <small>{row.employee.employeeCode ?? row.employee.email}</small>
                    {row.shift && <small className="sub-sm" data-testid="shift-sub">{formatShiftLabel(row.shift)}</small>}
                    {figures && <LastBreakNote lastBreak={figures.lastBreak} timeZone={timeZone} className="show-sm" />}
                  </div></div>
                </td>
                <td className="muted hide-sm">{row.employee.managerName ?? "—"}</td>
                <td className="muted hide-sm" style={{ whiteSpace: "nowrap" }}>{row.shift ? <>{row.shift.name}<small style={{ display: "block" }}>{formatShiftWindow(row.shift)}</small></> : "—"}</td>
                <td>
                  <WorkdayStatusChip status={row.status} isStale={row.isStale} isOffDay={row.isOffDay} />
                  {row.isOutsideShift && <div style={{ marginTop: 4 }}><OutsideShiftChip /></div>}
                  {row.status === "ON_BREAK" && figures && (
                    <small className="faint num" style={{ display: "block", marginTop: 4 }}>{t("Break {duration}", { duration: formatClock(figures.currentBreakSeconds) })}</small>
                  )}
                </td>
                <td className="r num" style={{ fontWeight: 600 }}>
                  {figures
                    ? <span role="timer" aria-label={t("Productive time of {name}", { name })} data-seconds={figures.productiveSeconds}>{formatDuration(figures.productiveSeconds)}</span>
                    : "—"}
                </td>
                <td className="r num hide-sm">
                  {figures ? formatDuration(figures.breakSeconds) : "—"}
                  {figures && <small className="faint" style={{ display: "block", marginTop: 4 }}>{t(figures.breakCount === 1 ? "{count} break" : "{count} breaks", { count: figures.breakCount })}</small>}
                </td>
                <td className="num hide-sm">{formatTimeOnDay(row.startedAt, timeZone, new Date(nowMilliseconds))}</td>
                <td className="num hide-sm">{figures?.lastBreak ? <LastBreakNote lastBreak={figures.lastBreak} timeZone={timeZone} isLabelled={false} /> : "—"}</td>
                <td className="muted hide-sm">
                  {row.lastActivity ? <>{t(ACTIVITY_LABELS[row.lastActivity.type])} · <span style={{ whiteSpace: "nowrap" }}>{formatTime(row.lastActivity.at, timeZone)}</span></> : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

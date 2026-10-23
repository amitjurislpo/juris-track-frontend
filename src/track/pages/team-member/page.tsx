import { Suspense, useState } from "react";
import { Link } from "react-router";
import { ApiError } from "@/track/api";
import type { TeamMemberDetail } from "@/track/api-types";
import { EmptyState } from "@/track/components/EmptyState";
import { PageHeader } from "@/track/components/PageHeader";
import { StatusChip } from "@/track/components/StatusChip";
import { WorkdayDetailModal } from "@/track/components/time/WorkdayDetailModal";
import { PageLoading } from "@/track/PageLoading";
import { boardPagePath } from "@/track/lib/team-board-query";
import { fullName } from "@/track/lib/time/format";
import { ROLE_LABELS } from "@/track/roles";
import { useDisplayTimeZone } from "@/track/time/useDisplayTimeZone";
import { useLiveReading } from "@/track/time/useLiveReading";
import { useServerClock } from "@/track/time/useServerClock";
import { usePage } from "@/track/usePage";
import { MemberHistory } from "./MemberHistory";
import { MemberStatusCard } from "./MemberStatusCard";
import { WorkdayCorrections } from "./WorkdayCorrections";

/**
 * One person of the Team tab (the manager's `team/employees/:id`, the owner's `admin/time-tracking/:id`): who they are, their
 * state right now with a live timer, their history, and each workday with its intervals; a manager or the owner corrects times
 * there (never their own: the API answers 404 for one's own id here). Out of the caller's scope the API answers 404, shown as
 * "not found".
 */
function TeamMemberView({ employeeId }: { employeeId: string }) {
  const { user, t } = usePage();
  const { timeZone } = useDisplayTimeZone();
  const member = useLiveReading<TeamMemberDetail>(`/team/members/${encodeURIComponent(employeeId)}`);
  const reading = member.data;
  const isRunning = reading?.value.status === "WORKING" || reading?.value.status === "ON_BREAK";
  const now = useServerClock(reading?.clockOffsetMilliseconds ?? 0, isRunning);
  // kept on its own: closing the workday from the dialog makes it no longer the person's current one, the dialog stays
  const [openWorkday, setOpenWorkday] = useState<{ id: string; date: string } | null>(null);
  const boardPath = boardPagePath(user.role);

  if (!reading) {
    if (member.error instanceof ApiError && (member.error.status === 404 || member.error.status === 400)) {
      return (
        <div className="col">
          <PageHeader back={boardPath} eyebrow={user.role === "ADMIN" ? t("Time Tracking") : t("Team")} title={t("Employee not found")} />
          <section className="card enter" style={{ ["--i" as string]: 1 }}>
            <EmptyState title={t("This person is not in your team")} text={t("They may not exist, or they do not report to you. Only the people in your reporting line can be opened here.")}>
              <Link className="btn btn-sm" to={boardPath}>{user.role === "ADMIN" ? t("Back to Time Tracking") : t("Back to Team")}</Link>
            </EmptyState>
          </section>
        </div>
      );
    }
    if (member.isError) throw member.error;
    return <PageLoading />;
  }
  const { employee } = reading.value;
  // the API never lets anybody correct their own time; managers and the owner correct the people of their scope
  const canCorrect = (user.role === "ADMIN" || user.role === "MANAGER") && employee.id !== user.id;
  const eyebrow = [t(ROLE_LABELS[employee.role]), employee.employeeCode].filter(Boolean).join(" · ");

  return (
    <div className="col">
      <PageHeader back={boardPath} eyebrow={eyebrow} title={fullName(employee)}
        sub={<>
          {employee.managerName ? t("Reports to {name}", { name: employee.managerName }) : t("No manager")}
          {!employee.isActive && <> <StatusChip isGood={false} label={t("Inactive")} /></>}
        </>}>
        {user.role === "ADMIN" && <Link className="btn" to={`/admin/employees/${encodeURIComponent(employee.id)}`}>{t("Edit employee")}</Link>}
      </PageHeader>
      <MemberStatusCard member={reading.value} nowMilliseconds={now} timeZone={timeZone} onOpenWorkday={() => setOpenWorkday(reading.value.workday)} />
      <Suspense fallback={<PageLoading />}>
        <MemberHistory employeeId={employee.id} timeZone={timeZone} canCorrect={canCorrect} />
      </Suspense>
      {openWorkday && (
        <WorkdayDetailModal workdayId={openWorkday.id} dateKey={openWorkday.date} timeZone={timeZone} onClose={() => setOpenWorkday(null)}
          renderExtras={canCorrect ? (workday, nowMilliseconds) => <WorkdayCorrections workday={workday} timeZone={timeZone} nowMilliseconds={nowMilliseconds} /> : undefined} />
      )}
    </div>
  );
}

/** The route component: a new person (another id in the URL) starts from a clean page. */
export default function TeamMemberPage() {
  const { params } = usePage();
  return <TeamMemberView key={params.id} employeeId={params.id} />;
}

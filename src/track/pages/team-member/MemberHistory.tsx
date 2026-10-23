import { useState } from "react";
import type { WorkdayHistory, WorkdayHistoryRow } from "@/track/api-types";
import { WorkdayDetailModal } from "@/track/components/time/WorkdayDetailModal";
import { WorkdayHistoryView } from "@/track/components/time/WorkdayHistoryView";
import { PageLoading } from "@/track/PageLoading";
import { selectedRange, workdayHistoryPath } from "@/track/lib/workday-history-query";
import { useData, usePage } from "@/track/usePage";
import { WorkdayCorrections } from "./WorkdayCorrections";

/**
 * One person's history (`GET /team/members/{employeeId}/workdays`, the parameters of My history in the URL); a row opens the
 * workday with its intervals and, when `canCorrect`, the corrections.
 */
export function MemberHistory({ employeeId, timeZone, canCorrect }: { employeeId: string; timeZone: string; canCorrect: boolean }) {
  const { searchParams } = usePage();
  const history = useData<WorkdayHistory>(workdayHistoryPath(searchParams, `/team/members/${encodeURIComponent(employeeId)}/workdays`));
  const [openWorkday, setOpenWorkday] = useState<WorkdayHistoryRow | null>(null);
  if (!history) return <PageLoading />;
  return (
    <>
      <WorkdayHistoryView history={history} range={selectedRange(searchParams)} timeZone={timeZone}
        onOpen={(workdayId) => setOpenWorkday(history.rows.find((row) => row.id === workdayId) ?? null)} />
      {openWorkday && (
        <WorkdayDetailModal workdayId={openWorkday.id} dateKey={openWorkday.date} timeZone={timeZone} onClose={() => setOpenWorkday(null)}
          renderExtras={canCorrect ? (workday, nowMilliseconds) => <WorkdayCorrections workday={workday} timeZone={timeZone} nowMilliseconds={nowMilliseconds} /> : undefined} />
      )}
    </>
  );
}

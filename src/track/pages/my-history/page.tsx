import { useState } from "react";
import { Link } from "react-router";
import type { WorkdayHistory, WorkdayHistoryRow } from "@/track/api-types";
import { Icon } from "@/track/components/Icon";
import { PageHeader } from "@/track/components/PageHeader";
import { WorkdayDetailModal } from "@/track/components/time/WorkdayDetailModal";
import { WorkdayHistoryView } from "@/track/components/time/WorkdayHistoryView";
import { PageLoading } from "@/track/PageLoading";
import { historyRangeText, selectedRange, workdayHistoryPath } from "@/track/lib/workday-history-query";
import { useDisplayTimeZone } from "@/track/time/useDisplayTimeZone";
import { useData, usePage } from "@/track/usePage";

/**
 * My history (`GET /workdays/mine`): a date range kept in the URL, the range's totals, productive and break time per day, and the
 * workdays (sortable, paged); a row opens the workday with its intervals (`GET /workdays/{workdayId}`).
 */
export default function MyHistoryPage() {
  const { t, searchParams } = usePage();
  const data = useData<WorkdayHistory>(workdayHistoryPath(searchParams));
  const { timeZone } = useDisplayTimeZone();
  const [openWorkday, setOpenWorkday] = useState<WorkdayHistoryRow | null>(null);
  if (!data) return <PageLoading />;
  const openRow = (workdayId: string) => setOpenWorkday(data.rows.find((row) => row.id === workdayId) ?? null);

  return (
    <div className="col">
      <PageHeader eyebrow={t("My workspace")} title={t("My History")} sub={historyRangeText(data)}>
        <Link className="btn" to="/my-time"><Icon name="clock" size={15} />{t("My Time")}</Link>
      </PageHeader>
      <WorkdayHistoryView history={data} range={selectedRange(searchParams)} timeZone={timeZone} onOpen={openRow} />
      {openWorkday && <WorkdayDetailModal workdayId={openWorkday.id} dateKey={openWorkday.date} timeZone={timeZone} onClose={() => setOpenWorkday(null)} />}
    </div>
  );
}

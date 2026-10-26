import { useMemo, useState } from "react";
import type { ListPage, ScheduleRow, Shift } from "@/track/api-types";
import { TrackLink } from "@/track/components/TrackLink";
import { EmptyState } from "@/track/components/EmptyState";
import { Pagination } from "@/track/components/list/Pagination";
import { problemMessage } from "@/track/lib/problems";
import { cellKey, chunkEntries, datesByEmployee, nextSelection, type RosterCell } from "@/track/lib/roster";
import { eachDay } from "@/track/lib/time/business-calendar";
import { useTrack } from "@/track/TrackContext";
import { removeScheduleEntry, setScheduleEntries, setScheduleEntry } from "./actions";
import { RosterActionBar } from "./RosterActionBar";
import { RosterAgenda } from "./RosterAgenda";
import { RosterGrid } from "./RosterGrid";
import { RosterLegend } from "./RosterLegend";
import { RosterPatternDialog } from "./RosterPatternDialog";

/** What the write of one person's dates answers: done, or the message that refused it. */
type PersonResult = { ok: true } | { ok: false; message: string };

/**
 * One month of the roster for the people of one page: the grid (or the agenda on phones), the selection of days and, for the owner,
 * the actions on the selection. A manager sees the same read-only. Starts again whenever the month, search or page changes.
 */
export function RosterBoard({ data, from, to, today, activeShifts, allShifts, canEdit, hasFilters }: {
  data: ListPage<ScheduleRow>;
  from: string;
  to: string;
  today: string;
  activeShifts: Shift[];
  allShifts: Shift[];
  canEdit: boolean;
  /** A search or manager filter is applied: an empty page then means "nothing matches", else there are no employees at all. */
  hasFilters: boolean;
}) {
  const { t, toast } = useTrack();
  const [selection, setSelection] = useState<RosterCell[]>([]);
  const [anchor, setAnchor] = useState<RosterCell | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPatternOpen, setIsPatternOpen] = useState(false);
  const dates = useMemo(() => eachDay(from, to), [from, to]);
  const employeeIds = useMemo(() => data.rows.map((row) => row.employeeId), [data.rows]);
  const shiftIds = useMemo(() => allShifts.map((shift) => shift.id), [allShifts]);
  const selectedKeys = useMemo(() => new Set(selection.map(cellKey)), [selection]);
  const selectedRows = data.rows.filter((row) => selection.some((cell) => cell.employeeId === row.employeeId));

  const deselect = () => { setSelection([]); setAnchor(null); };

  const select = (cell: RosterCell, event: React.MouseEvent | React.KeyboardEvent) => {
    const mode = event.shiftKey ? "extend" : event.ctrlKey || event.metaKey ? "toggle" : "replace";
    setSelection(nextSelection(selection, anchor, cell, mode, employeeIds, dates));
    if (mode !== "extend") setAnchor(cell);
    setError(null);
  };

  /** Runs the writes of every selected person; stops at the first refusal and shows its message. */
  const run = async (successText: string, write: (employeeId: string, employeeDates: string[]) => Promise<PersonResult>) => {
    setIsBusy(true);
    setError(null);
    for (const [employeeId, employeeDates] of datesByEmployee(selection)) {
      const result = await write(employeeId, employeeDates);
      if (!result.ok) {
        const name = data.rows.find((row) => row.employeeId === employeeId)?.name ?? "";
        setError(t("{name}: {reason}", { name, reason: result.message }));
        setIsBusy(false);
        return;
      }
    }
    setIsBusy(false);
    toast(successText);
    deselect();
  };

  const setShift = (shiftId: string | null) => run(t("Roster saved."), async (employeeId, employeeDates): Promise<PersonResult> => {
    if (employeeDates.length === 1) {
      const result = await setScheduleEntry(employeeId, employeeDates[0], { shiftId });
      return result.ok ? { ok: true } : { ok: false, message: problemMessage(result, t) };
    }
    for (const entries of chunkEntries(employeeDates.map((date) => ({ date, shiftId })))) {
      const result = await setScheduleEntries(employeeId, { entries });
      if (!result.ok) return { ok: false, message: problemMessage(result, t) };
    }
    return { ok: true };
  });

  const clear = () => run(t("Roster entries cleared."), async (employeeId, employeeDates): Promise<PersonResult> => {
    for (const date of employeeDates) {
      const result = await removeScheduleEntry(employeeId, date);
      if (!result.ok) return { ok: false, message: problemMessage(result, t) };
    }
    return { ok: true };
  });

  return (
    <>
      {canEdit && selection.length > 0 && (
        <RosterActionBar count={selection.length} shifts={activeShifts} isBusy={isBusy} onSetShift={(shiftId) => { void setShift(shiftId); }}
          onClear={() => { void clear(); }} onOpenPattern={() => setIsPatternOpen(true)} onDeselect={deselect} />
      )}
      {error && <div className="err" role="alert" data-testid="roster-error">{error}</div>}
      <section className="card enter" style={{ ["--i" as string]: 3, padding: 0 }} aria-label={t("Roster")}>
        {data.rows.length > 0 && (
          <>
            <RosterGrid rows={data.rows} dates={dates} today={today} shiftIds={shiftIds} selectedKeys={selectedKeys} canEdit={canEdit} onSelect={select} />
            <RosterAgenda rows={data.rows} today={today} shiftIds={shiftIds} selectedKeys={selectedKeys} canEdit={canEdit} onSelect={select} />
            <RosterLegend rows={data.rows} shiftIds={shiftIds} />
          </>
        )}
        {!data.rows.length && (hasFilters
          ? <EmptyState title={t("No one matches")} text={t("Try a different search or filter.")} />
          : (
            <EmptyState title={t("No employees yet")} text={canEdit ? t("Add people first, then plan their shifts here.") : undefined}>
              {canEdit && <TrackLink to="/admin/employees" className="btn btn-sm">{t("Go to Employees")}</TrackLink>}
            </EmptyState>
          ))}
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </section>
      {isPatternOpen && (
        <RosterPatternDialog rows={selectedRows} shifts={activeShifts} defaultFrom={from} defaultTo={to} onClose={() => { setIsPatternOpen(false); deselect(); }} />
      )}
    </>
  );
}

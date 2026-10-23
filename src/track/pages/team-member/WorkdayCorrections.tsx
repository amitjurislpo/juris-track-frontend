import { useState } from "react";
import { Icon } from "@/track/components/Icon";
import { formatDuration, formatTime, formatTimeOnDay } from "@/track/lib/time/format";
import { intervalSeconds } from "@/track/lib/time/interval-math";
import type { TimelineSegment, WorkdaySnapshot } from "@/track/lib/time/types";
import { useTimeState } from "@/track/time/useTimeState";
import { useTrack } from "@/track/TrackContext";
import { CloseWorkdayForm } from "./CloseWorkdayForm";
import { IntervalCorrectionForm } from "./IntervalCorrectionForm";

const segmentKey = (segment: TimelineSegment) => `${segment.type}:${segment.id}`;

/**
 * The corrections of a workday of somebody else (a manager's report, or anybody for the owner; never one's own): edit an
 * interval's start and end, or close a workday that was left open. Every change is recorded in the audit log, with the reason.
 */
export function WorkdayCorrections({ workday, timeZone, nowMilliseconds }: { workday: WorkdaySnapshot; timeZone: string; nowMilliseconds: number }) {
  const { t } = useTrack();
  const { data: reading } = useTimeState();
  const clockOffsetMilliseconds = reading?.clockOffsetMilliseconds ?? 0;
  const [editedKey, setEditedKey] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const isOpen = workday.endedAt === null;
  const rangeOf = (segment: TimelineSegment) =>
    `${formatTime(segment.startedAt, timeZone)} – ${segment.endedAt ? formatTimeOnDay(segment.endedAt, timeZone, segment.startedAt) : t("now")}`;

  return (
    <section className="col" style={{ gap: 12, borderTop: "1px solid var(--line)", paddingTop: 16 }} aria-labelledby="corrections-heading">
      <div className="card-h" style={{ margin: 0 }}><h3 id="corrections-heading">{t("Correct this workday")}</h3></div>
      <p className="notice info" style={{ margin: 0 }}>
        <span>{t("Every correction is recorded in the audit log with your name, the times before and after, and your reason.")}</span>
      </p>
      <ol style={{ margin: 0, padding: 0, listStyle: "none" }} aria-label={t("Intervals to correct")}>
        {workday.segments.map((segment) => {
          const typeName = segment.type === "WORK" ? t("Work") : t("Break");
          const isEdited = editedKey === segmentKey(segment);
          return (
            <li key={segmentKey(segment)} style={{ borderBottom: "1px solid var(--line)", padding: "8px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className={`chip nodot ${segment.type === "WORK" ? "gold" : "warn"}`}>{typeName}</span>
                <b className="num" style={{ fontSize: 13.5 }}>{rangeOf(segment)}</b>
                <span className="faint num" style={{ fontSize: 12.5 }}>{formatDuration(intervalSeconds(segment, nowMilliseconds))}</span>
                {!isEdited && (
                  <button type="button" className="btn btn-sm btn-ghost" style={{ marginLeft: "auto" }}
                    aria-label={t("Edit {type} {range}", { type: typeName, range: rangeOf(segment) })}
                    onClick={() => { setEditedKey(segmentKey(segment)); setIsClosing(false); }}>
                    <Icon name="edit" size={14} />{t("Edit")}
                  </button>
                )}
              </div>
              {isEdited && (
                <IntervalCorrectionForm key={`${segmentKey(segment)}|${segment.startedAt}|${segment.endedAt}`} workday={workday} segment={segment} timeZone={timeZone}
                  clockOffsetMilliseconds={clockOffsetMilliseconds} nowMilliseconds={nowMilliseconds} onDone={() => setEditedKey(null)} />
              )}
            </li>
          );
        })}
      </ol>
      {isOpen && !isClosing && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="faint" style={{ fontSize: 12.5, flex: "1 1 220px" }}>
            {workday.isStale ? t("This workday was not ended and has been open too long.") : t("This workday is still open.")}
          </span>
          <button type="button" className="btn btn-sm" onClick={() => { setIsClosing(true); setEditedKey(null); }}>
            <Icon name="stop" size={14} />{t("Close this workday")}
          </button>
        </div>
      )}
      {isOpen && isClosing && (
        <CloseWorkdayForm workday={workday} timeZone={timeZone} businessTimeZone={reading?.state.businessTimeZone ?? timeZone} clockOffsetMilliseconds={clockOffsetMilliseconds} onDone={() => setIsClosing(false)} />
      )}
    </section>
  );
}

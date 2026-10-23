import { formatTimeOnDay } from "@/track/lib/time/format";
import type { LastBreak } from "@/track/lib/time/types";
import { useTrack } from "@/track/TrackContext";

/**
 * The start of the break that started last, in `timeZone` (with its date when it is not today): "Last break 01:14", or "01:14" with
 * `isLabelled` false (under a "Last break" heading); "· running" while it is still on; nothing without a break.
 */
export function LastBreakNote({ lastBreak, timeZone, isLabelled = true, className, style }: {
  lastBreak: LastBreak | null;
  timeZone: string;
  isLabelled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { t } = useTrack();
  if (!lastBreak) return null;
  const time = formatTimeOnDay(lastBreak.startedAt, timeZone, new Date());
  const text = isLabelled
    ? (lastBreak.endedAt ? t("Last break {time}", { time }) : t("Last break {time} · running", { time }))
    : (lastBreak.endedAt ? time : t("{time} · running", { time }));
  return <small className={className} style={style}>{text}</small>;
}

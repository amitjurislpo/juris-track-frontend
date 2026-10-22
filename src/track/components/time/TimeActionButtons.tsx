import { useState } from "react";
import { ConfirmDialog } from "@/track/components/ConfirmDialog";
import { Icon } from "@/track/components/Icon";
import { timerActionsFor, type TimerAction } from "@/track/lib/time/timer-actions";
import type { LiveStatus } from "@/track/lib/time/types";
import type { TimeEventRunner } from "@/track/time/useTimeEvent";
import { useTrack } from "@/track/TrackContext";

const ICONS: Record<TimerAction["event"], string> = { START: "play", BREAK: "pause", RESUME: "play", END: "stop" };

/**
 * The time buttons of a state (Start work / Take a break / Back to work / End workday / Start again) with the old rules: all
 * disabled while a request runs, End disabled during a break, End asks for confirmation. `endSummary`: what the confirmation
 * shows about the day so far.
 */
export function TimeActionButtons({ status, runner, endSummary, isLarge = true }: {
  status: LiveStatus;
  runner: TimeEventRunner;
  endSummary?: string;
  isLarge?: boolean;
}) {
  const { t } = useTrack();
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const actions = timerActionsFor(status, runner.runningEvent !== null || runner.inconsistencyMessage !== null);
  const hints = actions.flatMap((action) => (action.hint ? [action.hint] : []));

  const press = (action: TimerAction) => {
    if (action.needsConfirmation) setIsConfirmingEnd(true);
    else void runner.run(action.event);
  };

  return (
    <>
      <div className="timer-actions">
        {actions.map((action) => (
          <span key={action.event} className={action.isPrimary && status === "NOT_STARTED" ? "punch" : undefined}>
            {action.isPrimary && status === "NOT_STARTED" && action.isEnabled && <span className="halo" aria-hidden="true"></span>}
            <button type="button" className={`btn ${action.isPrimary ? "btn-gold" : ""} ${isLarge ? "btn-lg" : ""}`.trim()} disabled={!action.isEnabled}
              aria-busy={runner.runningEvent === action.event || undefined} onClick={() => press(action)}>
              <Icon name={ICONS[action.event]} size={16} />
              {runner.runningEvent === action.event ? t("Saving…") : t(action.label)}
            </button>
          </span>
        ))}
      </div>
      {hints.map((hint) => <p key={hint} className="timer-hint">{t(hint)}</p>)}
      {isConfirmingEnd && (
        <ConfirmDialog
          title={t("End your workday?")}
          body={<>{t("Your final productive and break time will be recorded. You can start again later today if needed.")}{endSummary && <><br /><b>{endSummary}</b></>}</>}
          confirmLabel={t("End workday")}
          isBusy={runner.runningEvent !== null}
          onConfirm={() => { void runner.run("END").then(() => setIsConfirmingEnd(false)); }}
          onClose={() => setIsConfirmingEnd(false)}
        />
      )}
    </>
  );
}

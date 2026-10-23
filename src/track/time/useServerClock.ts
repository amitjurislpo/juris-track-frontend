import { useEffect, useState } from "react";
import { serverNow } from "../lib/time/clock-offset";

/**
 * The server's "now" (milliseconds), re-read from the clock on every tick: displays compute from it and never count up on their
 * own, so a tab that slept catches up at once. Ticks each `tickMilliseconds` (aligned to the server's whole seconds) while
 * `isTicking` and while the tab is visible; a hidden tab does not tick at all.
 */
export function useServerClock(clockOffsetMilliseconds: number, isTicking: boolean, tickMilliseconds = 1000): number {
  const [browserNow, setBrowserNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isTicking) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => { clearTimeout(timer); timer = undefined; };
    const tick = () => {
      const now = Date.now();
      setBrowserNow(now);
      // the next tick lands just after the server's next whole second, so every displayed second changes on time
      const untilNextTick = tickMilliseconds - (serverNow(clockOffsetMilliseconds, now) % tickMilliseconds) + 5;
      timer = setTimeout(tick, untilNextTick);
    };
    const followVisibility = () => {
      stop();
      if (document.visibilityState !== "hidden") tick();
    };
    followVisibility();
    document.addEventListener("visibilitychange", followVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", followVisibility);
    };
  }, [isTicking, clockOffsetMilliseconds, tickMilliseconds]);

  return serverNow(clockOffsetMilliseconds, browserNow);
}

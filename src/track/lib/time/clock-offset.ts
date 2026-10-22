/**
 * The browser's clock may be wrong or drift; the timers run on the server's clock instead. Every time-state answer carries the
 * server's `serverTime`, and the offset between it and the browser's clock is measured again on each answer. Displays then
 * compute from `Date.now() + offset`; nothing counts up on its own.
 */

/**
 * How far the server's clock is ahead of the browser's (milliseconds; negative when behind), measured from one answer. The
 * server read its clock somewhere between sending and receiving, so its time is compared with the middle of the round trip.
 */
export function measureClockOffset(serverTime: string, requestSentAt: number, responseReceivedAt: number): number {
  const serverMilliseconds = Date.parse(serverTime);
  if (Number.isNaN(serverMilliseconds)) return 0;
  return Math.round(serverMilliseconds - (requestSentAt + responseReceivedAt) / 2);
}

/** The server's "now" as the browser estimates it. */
export function serverNow(clockOffsetMilliseconds: number, browserNow: number = Date.now()): number {
  return browserNow + clockOffsetMilliseconds;
}

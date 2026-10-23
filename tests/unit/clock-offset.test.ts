import { describe, expect, it } from "vitest";
import { measureClockOffset, serverNow } from "@/track/lib/time/clock-offset";

describe("server clock offset", () => {
  const sentAt = Date.parse("2026-10-22T09:00:00.000Z");

  it("compares the server time with the middle of the round trip", () => {
    // the request took 400 ms; the server answered 09:00:05.200, the browser's middle was 09:00:00.200
    expect(measureClockOffset("2026-10-22T09:00:05.200Z", sentAt, sentAt + 400)).toBe(5000);
  });

  it("is negative when the browser's clock is ahead of the server's", () => {
    expect(measureClockOffset("2026-10-22T08:59:00.000Z", sentAt, sentAt)).toBe(-60_000);
  });

  it("is zero for an unreadable server time (the browser's clock is used)", () => {
    expect(measureClockOffset("not a time", sentAt, sentAt + 100)).toBe(0);
  });

  it("gives the server's now from the browser's clock and the offset", () => {
    expect(serverNow(5000, sentAt)).toBe(sentAt + 5000);
    expect(serverNow(-250, sentAt)).toBe(sentAt - 250);
  });
});

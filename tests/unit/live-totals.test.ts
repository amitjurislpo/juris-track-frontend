import { describe, expect, it } from "vitest";
import { liveTotals, workdayFigures, type LiveTotals, type LiveTotalsSnapshot } from "@/track/lib/time/live-totals";
import { serverNow } from "@/track/lib/time/clock-offset";
import { ACTIVITY_LABELS, LIVE_STATUS_LABELS, LIVE_STATUSES, type WorkdaySnapshot } from "@/track/lib/time/types";
import { HINDI_MESSAGES } from "@/standalone/i18n/translate";
import { goldenCases } from "./golden-fixture";

describe("live totals: golden cases from the old live.ts", () => {
  it.each(goldenCases<{ name: string; snapshot: LiveTotalsSnapshot; now: string }, LiveTotals>("live", "liveTotals"))(
    "liveTotals #%# ($input.name)",
    ({ input, output }) => {
      expect(liveTotals(input.snapshot, Date.parse(input.now))).toEqual(output);
    },
  );

  describe("from a GET /me/time snapshot and the server-corrected clock", () => {
    // read at 10:00:00 server time: 2h closed work + a running break since 09:50, 20 minutes of earlier breaks
    const snapshotOnBreak: WorkdaySnapshot = {
      id: "workday-1",
      date: "2026-10-22",
      status: "ON_BREAK",
      startedAt: "2026-10-22T07:30:00.000Z",
      endedAt: null,
      isStale: false,
      shift: null,
      isOutsideShift: false,
      varianceSeconds: null,
      extraSeconds: 0,
      isOffDay: false,
      closedProductiveSeconds: 7200,
      closedBreakSeconds: 1200,
      activeWorkStartedAt: null,
      activeBreakStartedAt: "2026-10-22T09:50:00.000Z",
      productiveSeconds: 7200,
      breakSeconds: 1800,
      spanSeconds: 9000,
      breakCount: 2,
      lastBreak: { startedAt: "2026-10-22T09:50:00.000Z", endedAt: null },
      lastActivity: { type: "STARTED_BREAK", at: "2026-10-22T09:50:00.000Z" },
      segments: [],
    };
    const serverTimeOfAnswer = Date.parse("2026-10-22T10:00:00.000Z");

    it("matches the API's own totals at the time of the answer", () => {
      const totals = liveTotals(snapshotOnBreak, serverTimeOfAnswer);
      expect([totals.productiveSeconds, totals.breakSeconds, totals.spanSeconds, totals.breakCount]).toEqual([7200, 1800, 9000, 2]);
    });

    it("hands on the last break (running while it has no end) and nothing for a day without a break", () => {
      expect(liveTotals(snapshotOnBreak, serverTimeOfAnswer).lastBreak).toEqual({ startedAt: "2026-10-22T09:50:00.000Z", endedAt: null });
      expect(workdayFigures({ ...snapshotOnBreak, lastBreak: null, breakCount: 0 }, serverTimeOfAnswer).lastBreak).toBeNull();
      const ended = { ...snapshotOnBreak, status: "DAY_ENDED" as const, endedAt: "2026-10-22T10:30:00.000Z", lastBreak: { startedAt: "2026-10-22T09:50:00.000Z", endedAt: "2026-10-22T09:59:00.000Z" } };
      expect(workdayFigures(ended, serverTimeOfAnswer).lastBreak).toEqual(ended.lastBreak);
    });

    it("keeps productive time still and lets the break grow during a break, from the server clock (not the browser's)", () => {
      // the browser's clock is 3 minutes behind; 45 seconds later by the server's clock
      const clockOffsetMilliseconds = 180_000;
      const browserNow = serverTimeOfAnswer - clockOffsetMilliseconds + 45_000;
      const totals = liveTotals(snapshotOnBreak, serverNow(clockOffsetMilliseconds, browserNow));
      expect(totals.productiveSeconds).toBe(7200);
      expect(totals.breakSeconds).toBe(1845);
      expect(totals.currentBreakSeconds).toBe(645);
      expect(totals.spanSeconds).toBe(9045);
    });

    it("grows productive time while working and never goes below the closed time on a clock behind the answer", () => {
      const working: WorkdaySnapshot = { ...snapshotOnBreak, status: "WORKING", activeBreakStartedAt: null, activeWorkStartedAt: "2026-10-22T09:59:00.000Z", closedBreakSeconds: 1800 };
      expect(liveTotals(working, serverTimeOfAnswer + 10_000).productiveSeconds).toBe(7200 + 70);
      expect(liveTotals(working, Date.parse("2026-10-22T09:58:00.000Z")).productiveSeconds).toBe(7200);
    });

    it("shows an ended day's own totals as the API computed them, and advances an open day", () => {
      const ended: WorkdaySnapshot = { ...snapshotOnBreak, status: "DAY_ENDED", activeBreakStartedAt: null, endedAt: "2026-10-22T10:00:00.000999Z", spanSeconds: 8999 };
      expect(workdayFigures(ended, serverTimeOfAnswer + 60_000)).toEqual({
        productiveSeconds: 7200, breakSeconds: 1800, currentWorkSeconds: 0, currentBreakSeconds: 0, spanSeconds: 8999, breakCount: 2, lastBreak: snapshotOnBreak.lastBreak,
      });
      expect(workdayFigures(snapshotOnBreak, serverTimeOfAnswer + 60_000)).toEqual(liveTotals(snapshotOnBreak, serverTimeOfAnswer + 60_000));
    });

    it("stops at the end of an ended day, whatever the clock says", () => {
      const ended: WorkdaySnapshot = { ...snapshotOnBreak, status: "DAY_ENDED", activeBreakStartedAt: null, endedAt: "2026-10-22T10:00:00.000Z", closedBreakSeconds: 1800 };
      const totals = liveTotals(ended, serverTimeOfAnswer + 3_600_000);
      expect([totals.productiveSeconds, totals.breakSeconds, totals.spanSeconds]).toEqual([7200, 1800, 9000]);
    });
  });

  it("has a Hindi label for every live status and activity", () => {
    for (const status of LIVE_STATUSES) expect(HINDI_MESSAGES[LIVE_STATUS_LABELS[status]], status).toBeTruthy();
    for (const label of Object.values(ACTIVITY_LABELS)) expect(HINDI_MESSAGES[label], label).toBeTruthy();
  });
});

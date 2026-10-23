import { describe, expect, it } from "vitest";
import type { TeamMemberRow, TeamMetrics } from "@/track/api-types";
import { liveTeamTotals, teamRowFigures } from "@/track/lib/time/team-live-figures";

const SERVER_TIME = "2026-10-22T10:00:00Z";
const at = (iso: string) => Date.parse(iso);

function row(fields: Partial<TeamMemberRow>): TeamMemberRow {
  return {
    employee: { id: "e1", employeeCode: "E1", firstName: "Asha", lastName: "Rao", email: "asha@example.test", role: "EMPLOYEE", isActive: true, managerId: "m1", managerName: "Milo Manager" },
    status: "NOT_STARTED", workdayId: null, date: null, startedAt: null, endedAt: null, isStale: false,
    closedProductiveSeconds: 0, closedBreakSeconds: 0, activeWorkStartedAt: null, activeBreakStartedAt: null,
    productiveSeconds: 0, breakSeconds: 0, spanSeconds: 0, breakCount: 0, lastActivity: null,
    shift: null, isOutsideShift: false, varianceSeconds: null, extraSeconds: 0, isOffDay: false,
    ...fields,
  };
}

describe("teamRowFigures", () => {
  it("has no figures before the person started", () => {
    expect(teamRowFigures(row({}), at(SERVER_TIME))).toBeNull();
  });

  it("runs a working person's productive time from the closed seconds and the running interval's start", () => {
    const working = row({ status: "WORKING", startedAt: "2026-10-22T08:00:00Z", closedProductiveSeconds: 3600, closedBreakSeconds: 600,
      activeWorkStartedAt: "2026-10-22T09:30:00Z", breakCount: 1, productiveSeconds: 5400 });
    expect(teamRowFigures(working, at("2026-10-22T10:00:00Z"))).toMatchObject({ productiveSeconds: 3600 + 1800, breakSeconds: 600, currentWorkSeconds: 1800 });
    // a second later the timer is one second further: computed again, never counted
    expect(teamRowFigures(working, at("2026-10-22T10:00:01.500Z"))?.productiveSeconds).toBe(5401);
  });

  it("keeps productive time still during a break and runs the break", () => {
    const onBreak = row({ status: "ON_BREAK", startedAt: "2026-10-22T08:00:00Z", closedProductiveSeconds: 7200, closedBreakSeconds: 0,
      activeBreakStartedAt: "2026-10-22T09:55:00Z", breakCount: 1 });
    const figures = teamRowFigures(onBreak, at("2026-10-22T10:00:00Z"));
    expect(figures).toMatchObject({ productiveSeconds: 7200, breakSeconds: 300, currentBreakSeconds: 300, currentWorkSeconds: 0 });
    expect(teamRowFigures(onBreak, at("2026-10-22T10:10:00Z"))?.productiveSeconds).toBe(7200);
  });

  it("shows an ended day's own totals, whatever the time", () => {
    const ended = row({ status: "DAY_ENDED", startedAt: "2026-10-22T03:00:00Z", endedAt: "2026-10-22T09:00:00Z", productiveSeconds: 20000,
      breakSeconds: 1600, spanSeconds: 21600, breakCount: 2, closedProductiveSeconds: 20000, closedBreakSeconds: 1600 });
    expect(teamRowFigures(ended, at("2026-10-22T23:00:00Z"))).toEqual({ productiveSeconds: 20000, breakSeconds: 1600, currentWorkSeconds: 0, currentBreakSeconds: 0, spanSeconds: 21600, breakCount: 2 });
  });
});

describe("liveTeamTotals", () => {
  const metrics: TeamMetrics = { total: 5, working: 2, onBreak: 1, notStarted: 1, weekOff: 0, dayEnded: 1, stale: 0, totalProductiveSeconds: 9000, totalBreakSeconds: 900, averageProductiveSeconds: 3000 };

  it("adds the time each working person worked since the answer", () => {
    // two working people, ten seconds: 20 seconds more; the average over the four who started (working, on break, day ended)
    expect(liveTeamTotals(metrics, SERVER_TIME, at("2026-10-22T10:00:10Z"))).toEqual({ totalProductiveSeconds: 9020, averageProductiveSeconds: 2255 });
    expect(liveTeamTotals(metrics, SERVER_TIME, at("2026-10-22T10:00:01Z"))).toEqual({ totalProductiveSeconds: 9002, averageProductiveSeconds: 2250 });
  });

  it("never goes back before the answer, and is 0 on average when nobody started", () => {
    expect(liveTeamTotals(metrics, SERVER_TIME, at("2026-10-22T09:59:00Z")).totalProductiveSeconds).toBe(9000);
    const nobody: TeamMetrics = { ...metrics, working: 0, onBreak: 0, dayEnded: 0, notStarted: 5, totalProductiveSeconds: 0 };
    expect(liveTeamTotals(nobody, SERVER_TIME, at("2026-10-22T11:00:00Z"))).toEqual({ totalProductiveSeconds: 0, averageProductiveSeconds: 0 });
  });
});

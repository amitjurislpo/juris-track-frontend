import { describe, expect, it } from "vitest";
import { liveTotals, type LiveTotals, type LiveTotalsSnapshot } from "@/track/lib/time/live-totals";
import { ACTIVITY_LABELS, LIVE_STATUS_LABELS, LIVE_STATUSES } from "@/track/lib/time/types";
import { HINDI_MESSAGES } from "@/standalone/i18n/translate";
import { goldenCases } from "./golden-fixture";

describe("live totals: golden cases from the old live.ts", () => {
  it.each(goldenCases<{ name: string; snapshot: LiveTotalsSnapshot; now: string }, LiveTotals>("live", "liveTotals"))(
    "liveTotals #%# ($input.name)",
    ({ input, output }) => {
      expect(liveTotals(input.snapshot, Date.parse(input.now))).toEqual(output);
    },
  );

  it("has a Hindi label for every live status and activity", () => {
    for (const status of LIVE_STATUSES) expect(HINDI_MESSAGES[LIVE_STATUS_LABELS[status]], status).toBeTruthy();
    for (const label of Object.values(ACTIVITY_LABELS)) expect(HINDI_MESSAGES[label], label).toBeTruthy();
  });
});

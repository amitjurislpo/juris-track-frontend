import { describe, expect, it } from "vitest";
import { timeZoneOptions, zoneAbbreviation, zoneLabel, zoneLongName } from "@/track/lib/time/zone-names";
import { goldenCases } from "./golden-fixture";

type ZoneAtInstant = { timeZone: string; instant: string };

// The names come from the ICU data of the JavaScript engine; the fixture was made with the same Node major as these tests run on
// (see generatedWith in the fixture). A browser with other ICU data may word a few long names differently.
describe("zone names: golden cases from the old zones.ts", () => {
  it.each(goldenCases<ZoneAtInstant, string>("zones", "zoneAbbr"))("zoneAbbreviation #%# ($input.timeZone)", ({ input, output }) => {
    expect(zoneAbbreviation(input.timeZone, new Date(input.instant))).toBe(output);
  });

  it.each(goldenCases<ZoneAtInstant, string>("zones", "zoneLabel"))("zoneLabel #%# ($input.timeZone)", ({ input, output }) => {
    expect(zoneLabel(input.timeZone, new Date(input.instant))).toBe(output);
  });

  it.each(goldenCases<ZoneAtInstant, string>("zones", "zoneLongName"))("zoneLongName #%# ($input.timeZone)", ({ input, output }) => {
    expect(zoneLongName(input.timeZone, new Date(input.instant))).toBe(output);
  });

  it.each(goldenCases<string[], string[]>("zones", "timezoneOptions"))("timeZoneOptions #%#", ({ input, output }) => {
    expect(timeZoneOptions(input)).toEqual(output);
  });

  it("offers the modern names only, sorted", () => {
    const options = timeZoneOptions();
    expect(options).toContain("Asia/Kolkata");
    expect(options).not.toContain("Asia/Calcutta");
    expect(options).toEqual([...options].sort((first, second) => first.localeCompare(second)));
  });
});

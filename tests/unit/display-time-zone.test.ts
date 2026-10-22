import { describe, expect, it } from "vitest";
import { displayTimeZoneChoices, resolveDisplayTimeZone } from "@/track/lib/time/display-time-zone";

describe("display time zone", () => {
  it("offers the business time zone first, then the display zones, without duplicates or unknown ids", () => {
    expect(displayTimeZoneChoices("Asia/Kolkata", ["America/New_York", "Asia/Kolkata", "Mars/Olympus", "Europe/London"]))
      .toEqual(["Asia/Kolkata", "America/New_York", "Europe/London"]);
    expect(displayTimeZoneChoices("Asia/Kolkata", [])).toEqual(["Asia/Kolkata"]);
  });

  it("uses the stored choice while the business still offers it, else the business time zone", () => {
    const choices = ["Asia/Kolkata", "America/New_York"];
    expect(resolveDisplayTimeZone("America/New_York", choices, "Asia/Kolkata")).toBe("America/New_York");
    expect(resolveDisplayTimeZone("Europe/London", choices, "Asia/Kolkata")).toBe("Asia/Kolkata");
    expect(resolveDisplayTimeZone(null, choices, "Asia/Kolkata")).toBe("Asia/Kolkata");
  });

  it("keeps a real stored zone while the offered zones are not known yet", () => {
    expect(resolveDisplayTimeZone("America/New_York", null, "Asia/Kolkata")).toBe("America/New_York");
    expect(resolveDisplayTimeZone("Nowhere/Land", null, "Asia/Kolkata")).toBe("Asia/Kolkata");
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { resetDisplayLanguage, setDisplayLanguage } from "@/track/lib/time/display-language";
import { formatDateKey, formatDateTime, formatDuration, formatTime } from "@/track/lib/time/format";
import { zoneAbbreviation, zoneLabel, zoneLongName } from "@/track/lib/time/zone-names";
import { HINDI_MESSAGES, translate } from "@/standalone/i18n/translate";

const hindi = (text: string, variables?: Record<string, string | number>) => translate("hi", text, variables);

afterEach(() => { resetDisplayLanguage(); });

describe("formatters follow the display language", () => {
  it("stay English (en-GB) until a language is set", () => {
    expect(formatDuration(28085)).toBe("7h 48m 05s");
    expect(formatDateKey("2026-10-01")).toBe("Thu, 1 Oct 2026");
    expect(zoneLongName("Asia/Kolkata", new Date("2026-10-01T00:00:00Z"))).toBe("India Standard Time");
  });

  it("write durations with the Hindi unit letters", () => {
    setDisplayLanguage("hi-IN", hindi);
    expect(formatDuration(28085)).toBe("7 घं 48 मि 05 से");
    expect(formatDuration(189)).toBe("3 मि 09 से");
    expect(formatDuration(42)).toBe("42 से");
    expect(formatDuration(null)).toBe("—");
  });

  it("write dates, date-times and zone names in Hindi, but keep the zone code and the 24-hour clock", () => {
    setDisplayLanguage("hi-IN", hindi);
    const date = formatDateKey("2026-10-01");
    expect(date).toMatch(/[ऀ-ॿ]/);
    expect(date).not.toMatch(/Oct|Thu/);
    expect(formatDateTime("2026-10-01T03:35:00Z", "Asia/Kolkata")).toMatch(/[ऀ-ॿ]/);
    expect(formatTime("2026-10-01T03:35:00Z", "Asia/Kolkata")).toBe("09:05");
    const longName = zoneLongName("Asia/Kolkata", new Date("2026-10-01T00:00:00Z"));
    expect(longName).toMatch(/[ऀ-ॿ]/);
    expect(zoneAbbreviation("America/New_York", new Date("2026-07-01T00:00:00Z"))).toBe("EDT");
    expect(zoneLabel("Asia/Kolkata", new Date("2026-10-01T00:00:00Z"))).toBe(`${longName} (IST)`);
  });

  it("have every unit pattern in the Hindi dictionary", () => {
    for (const pattern of ["{hours}h {minutes}m {seconds}s", "{minutes}m {seconds}s", "{seconds}s"]) expect(HINDI_MESSAGES[pattern], pattern).toBeTruthy();
  });

  it("go back to English when reset", () => {
    setDisplayLanguage("hi-IN", hindi);
    resetDisplayLanguage();
    expect(formatDuration(42)).toBe("42s");
  });
});

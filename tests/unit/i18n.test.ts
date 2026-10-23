import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isLang, LANGUAGES } from "@/standalone/i18n/config";
import { HINDI_MESSAGES, translate, translator } from "@/standalone/i18n/translate";
import { navFor } from "@/standalone/nav";
import { ROLE_LABELS, ROLES } from "@/track/roles";
import { trackRoutes } from "@/track/routes";

function sources(directory: string): string[] {
  return readdirSync(directory).flatMap((fileName) => {
    const filePath = path.join(directory, fileName);
    return statSync(filePath).isDirectory() ? sources(filePath) : /\.tsx?$/.test(fileName) ? [filePath] : [];
  });
}

describe("translate", () => {
  it("returns the English text for English and for unknown keys", () => {
    expect(translate("en", "Dashboard")).toBe("Dashboard");
    expect(translate("hi", "A sentence nobody translated")).toBe("A sentence nobody translated");
  });

  it("translates to Hindi", () => {
    expect(translate("hi", "Dashboard")).toBe(HINDI_MESSAGES["Dashboard"]);
    expect(translate("hi", "Sign out")).toBe("साइन आउट");
  });

  it("fills {placeholders} in both languages and leaves unknown ones alone", () => {
    expect(translate("en", "Welcome, {name}", { name: "Amit" })).toBe("Welcome, Amit");
    expect(translate("hi", "Resend code in {seconds}s", { seconds: 5 })).toContain("5");
    expect(translate("en", "Hi {who}", { other: 1 })).toBe("Hi {who}");
  });

  it("translator() binds a language", () => {
    expect(translator("hi")("Language")).toBe(HINDI_MESSAGES["Language"]);
  });
});

describe("languages", () => {
  it("recognises only the supported codes", () => {
    for (const language of LANGUAGES) expect(isLang(language.code)).toBe(true);
    expect(isLang("fr")).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });
});

describe("Hindi dictionary", () => {
  it("has no empty translations and keeps every {placeholder} of its key", () => {
    for (const [key, translation] of Object.entries(HINDI_MESSAGES)) {
      expect(translation.trim(), key).not.toBe("");
      const wanted = (key.match(/\{\w+\}/g) ?? []).sort();
      const got = (translation.match(/\{\w+\}/g) ?? []).sort();
      expect(got, key).toEqual(wanted);
    }
  });

  it("translates every page title, role and sidebar label", () => {
    for (const route of trackRoutes) expect(HINDI_MESSAGES[route.title], `page title "${route.title}"`).toBeTruthy();
    for (const role of ROLES) {
      expect(HINDI_MESSAGES[ROLE_LABELS[role]], `role "${role}"`).toBeTruthy();
      for (const navGroup of navFor(role)) {
        expect(HINDI_MESSAGES[navGroup.title], `nav group "${navGroup.title}"`).toBeTruthy();
        for (const navItem of navGroup.items) expect(HINDI_MESSAGES[navItem.label], `nav label "${navItem.label}"`).toBeTruthy();
      }
    }
  });

  it("translates every string passed to t(\"…\") in the source", () => {
    const missing = new Set<string>();
    for (const file of sources(path.resolve(import.meta.dirname, "../../src"))) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/\bt\("((?:[^"\\]|\\.)*)"/g)) {
        const key = match[1].replaceAll("\\'", "'");
        if (!HINDI_MESSAGES[key]) missing.add(`${path.basename(file)}: ${key}`);
      }
    }
    expect([...missing]).toEqual([]);
  });
});

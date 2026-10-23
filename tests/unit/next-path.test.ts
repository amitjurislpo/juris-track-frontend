import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/standalone/next-path";

describe("safeNextPath", () => {
  it("accepts paths inside the app", () => {
    expect(safeNextPath("/admin/teams?x=1")).toBe("/admin/teams?x=1");
  });

  it("refuses outside addresses, empty values and the sign-in page", () => {
    for (const unsafe of ["/\t/evil.test", "/\n/evil.test", "/a\rb", "/\x7f", "https://evil.test", "//evil.test", "/\\evil.test", "", undefined, null, "/login", "/login?next=/x"]) {
      expect(safeNextPath(unsafe), String(unsafe)).toBeNull();
    }
  });
});

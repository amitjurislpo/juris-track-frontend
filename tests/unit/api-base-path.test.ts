import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { API_BASE_PATH } from "@/standalone/api-base-path";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("API base path", () => {
  it("is version 1 of the API", () => {
    expect(API_BASE_PATH).toBe("/api/v1");
  });

  it("is the only place in src that writes an API prefix: no other string starts with /api", () => {
    const offenders = sourceFiles("src")
      .filter((file) => !file.endsWith("api-base-path.ts"))
      .flatMap((file) => readFileSync(file, "utf8").split("\n").map((line, i) => ({ file, line, number: i + 1 })))
      // code only: comments and doc text may mention addresses
      .filter(({ line }) => /["'`]\/api(\/|["'`])/.test(line) && !/^\s*(\/?\*|\/\/)/.test(line))
      .filter(({ line }) => !/["'`]\/api\/v1(\/|["'`])/.test(line));
    expect(offenders).toEqual([]);
  });
});

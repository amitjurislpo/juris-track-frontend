import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The golden cases generated from the old Node code (tests/fixtures/time-engine.json; the backend repo has an identical copy in
 * backend/src/test/resources/golden/time-engine.json). Each case is { input, output }; instants are ISO-8601 UTC strings.
 */
export interface GoldenCase<Input, Output> {
  input: Input;
  output: Output;
}

type GoldenFixture = Record<string, Record<string, unknown>>;

const FIXTURE = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../fixtures/time-engine.json"), "utf8")) as GoldenFixture;

/** The cases of one old function, for example goldenCases("calc", "intervalSeconds"); never empty. */
export function goldenCases<Input, Output>(module: string, functionName: string): GoldenCase<Input, Output>[] {
  const cases = FIXTURE[module]?.[functionName];
  if (!Array.isArray(cases) || cases.length === 0) throw new Error(`no golden cases for ${module}.${functionName}`);
  return cases as GoldenCase<Input, Output>[];
}

/** A single value of the fixture, for example goldenValue("ranges", "maxRangeDays"). */
export function goldenValue(module: string, name: string): unknown {
  return FIXTURE[module]?.[name];
}

/**
 * The record before and after a change (`before` / `after` of an audit entry, any JSON) as rows a reader can scan: each field
 * of the two records, marked added, removed, changed or unchanged. Values are turned into plain text here and shown as text
 * (never as HTML); long values (nested objects, long strings) are flagged so the panel can collapse them.
 */

export type DiffKind = "added" | "removed" | "changed" | "unchanged";

export interface DiffRow {
  /** The field name; "" when the records are not objects (a list or a single value is compared as a whole). */
  field: string;
  kind: DiffKind;
  /** The value before as text; undefined when the field did not exist before. */
  before?: string;
  /** The value after as text; undefined when the field does not exist after. */
  after?: string;
  /** A value is longer than `LONG_VALUE_LENGTH` characters or spans lines: shown collapsed at first. */
  isLong: boolean;
}

/** From this many characters on, a value starts collapsed. */
export const LONG_VALUE_LENGTH = 120;

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject => typeof value === "object" && value !== null && !Array.isArray(value);

/** A JSON value as text: a string as it is, null as "null", anything else as (indented) JSON. */
export function formatAuditValue(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  if (value === null || typeof value !== "object") return String(value);
  return JSON.stringify(value, null, 2);
}

/** Deep equality of two JSON values (key order does not matter). */
export function isSameJson(first: unknown, second: unknown): boolean {
  if (first === second) return true;
  if (Array.isArray(first) || Array.isArray(second)) {
    if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) return false;
    return first.every((item, i) => isSameJson(item, second[i]));
  }
  if (isJsonObject(first) && isJsonObject(second)) {
    const firstKeys = Object.keys(first);
    if (firstKeys.length !== Object.keys(second).length) return false;
    return firstKeys.every((key) => Object.hasOwn(second, key) && isSameJson(first[key], second[key]));
  }
  return false;
}

const isLongText = (text: string | undefined) => !!text && (text.length > LONG_VALUE_LENGTH || text.includes("\n"));

function rowOf(field: string, kind: DiffKind, before: unknown, after: unknown, hasBefore: boolean, hasAfter: boolean): DiffRow {
  const row: DiffRow = { field, kind, isLong: false };
  if (hasBefore) row.before = formatAuditValue(before);
  if (hasAfter) row.after = formatAuditValue(after);
  row.isLong = isLongText(row.before) || isLongText(row.after);
  return row;
}

/**
 * Compares `before` and `after` field by field. A creation (no `before`) lists every field as added, a removal (no `after`)
 * every field as removed. Fields keep their order: the fields of `before` first, then the ones only `after` has.
 * Records that are not objects are compared as one value (field "").
 */
export function diffRecords(before: unknown, after: unknown): DiffRow[] {
  const hasBefore = before !== null && before !== undefined;
  const hasAfter = after !== null && after !== undefined;
  if (!hasBefore && !hasAfter) return [];
  const isObjectPair = (!hasBefore || isJsonObject(before)) && (!hasAfter || isJsonObject(after));
  if (!isObjectPair) {
    const kind: DiffKind = !hasBefore ? "added" : !hasAfter ? "removed" : isSameJson(before, after) ? "unchanged" : "changed";
    return [rowOf("", kind, before, after, hasBefore, hasAfter)];
  }
  const beforeRecord = (hasBefore ? before : {}) as JsonObject;
  const afterRecord = (hasAfter ? after : {}) as JsonObject;
  const fields = [...new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])];
  return fields.map((field) => {
    const isInBefore = Object.hasOwn(beforeRecord, field);
    const isInAfter = Object.hasOwn(afterRecord, field);
    const kind: DiffKind = !isInBefore ? "added" : !isInAfter ? "removed" : isSameJson(beforeRecord[field], afterRecord[field]) ? "unchanged" : "changed";
    return rowOf(field, kind, beforeRecord[field], afterRecord[field], isInBefore, isInAfter);
  });
}

/** How many rows of a diff are not unchanged (the panel says "3 fields changed"). */
export const changedRowCount = (rows: readonly DiffRow[]) => rows.filter((row) => row.kind !== "unchanged").length;

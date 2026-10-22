/**
 * PATCH bodies: the API changes only the fields that are sent (API.md, "PATCH"), so an edit form sends only what the user changed.
 * Text is compared and sent trimmed; a field listed in `clearedWhenEmpty` is sent as null when it was emptied (that clears it).
 */

type FieldValue = string | number | boolean | null | readonly string[];

const normalize = (value: FieldValue, isClearedWhenEmpty: boolean): FieldValue => {
  if (typeof value !== "string") return value;
  const trimmedValue = value.trim();
  return isClearedWhenEmpty && trimmedValue === "" ? null : trimmedValue;
};

const isSameValue = (first: FieldValue, second: FieldValue): boolean => {
  if (Array.isArray(first) && Array.isArray(second)) return first.length === second.length && first.every((item, i) => item === second[i]);
  return first === second;
};

/** The fields of `edited` that differ from `original`, with their normalized new values; `{}` when nothing changed. */
export function changedFields<Form extends Record<string, FieldValue>>(
  original: Form,
  edited: Form,
  clearedWhenEmpty: readonly (keyof Form)[] = [],
): Partial<Record<keyof Form, FieldValue>> {
  const changes: Partial<Record<keyof Form, FieldValue>> = {};
  for (const fieldName of Object.keys(edited) as (keyof Form)[]) {
    const isClearedWhenEmpty = clearedWhenEmpty.includes(fieldName);
    const editedValue = normalize(edited[fieldName], isClearedWhenEmpty);
    if (!isSameValue(normalize(original[fieldName], isClearedWhenEmpty), editedValue)) changes[fieldName] = editedValue;
  }
  return changes;
}

/** One invalid field of a 400 `VALIDATION_FAILED` answer (`errors` in the problem details). */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * What every write returns: the API's `{ ok, message?, data? }` envelope, passed through unchanged; a failure carries the problem
 * details' `detail` as `error`, its stable `code` and, on a 400, the per-field `errors`.
 */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; code?: string; errors?: FieldError[] };

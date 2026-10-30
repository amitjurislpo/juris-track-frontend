import type { QueryClient } from "@tanstack/react-query";
import type { ActionResult, FieldError } from "./action";

/** The problem code of a request by a user whose business the platform has suspended (403). */
export const BUSINESS_SUSPENDED = "BUSINESS_SUSPENDED";

/** The problem code the client gives a request answered 404 when the host found that the whole module is no longer available. */
const MODULE_UNAVAILABLE = "MODULE_UNAVAILABLE";

/**
 * The problem code the client itself gives a request that never got an answer (offline, the API or proxy down, the connection
 * dropped, a timeout). It comes back in the normal problem shape (`status` 0), so forms show it and pages can offer a retry.
 */
export const NETWORK_ERROR = "NETWORK_ERROR";

/** The message of a `NETWORK_ERROR` (a translation key). */
const NETWORK_ERROR_MESSAGE = "Could not reach the server. Please check your connection and try again.";

/** How long one request may take before it counts as unreachable. */
const REQUEST_TIMEOUT_MILLISECONDS = 30_000;

/**
 * The API client. It is built from settings (`ApiClientOptions`), never from a fixed address: JurisTrack standalone uses `/api/v1`
 * with a cookie session, embedded in JurisOne it uses the JurisOne gateway with a token in the Authorization header.
 * Paths passed to the client are relative to the base path (`/time/state`, not `/api/v1/time/state`).
 */
export interface ApiClientOptions {
  /** Where the API lives, e.g. `/api/v1`. */
  basePath: string;
  /** Extra request headers (an Authorization token); asked for on every request. */
  getHeaders: () => Record<string, string> | Promise<Record<string, string>>;
  /** Called on a 401. Return true when the session was renewed, so the request is sent once more. */
  onUnauthorized?: (info: { isQuiet: boolean }) => Promise<boolean>;
  /** Shows the API's fixed English messages in the reader's language. */
  translateMessage?: (text: string) => string;
  /** Called when the API answers 403 `BUSINESS_SUSPENDED` (the user's business was suspended while they were signed in). */
  onBusinessSuspended?: () => void;
  /**
   * Called when the API answers 404. The host checks whether the whole module is gone (a stale tab after the business lost access)
   * and, if so, takes the user away and returns the message to show instead of "Not found."; null when it is an ordinary 404.
   */
  onNotFound?: () => Promise<string | null>;
  /** Refetched after every successful write. */
  queryClient: QueryClient;
}

export interface ApiResponse<T> {
  status: number;
  body: ActionResult<T>;
}

export class ApiError extends Error {
  status: number;
  /** The problem details' stable `code` (`NOT_FOUND`, `BUSINESS_SUSPENDED`, …), when the API sent one. */
  code: string | undefined;
  /** The field errors of a 400 (translated), so a page can say which parameter was wrong. */
  fieldErrors: FieldError[];
  constructor(message: string, status: number, code?: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** A file the API sent (`file()`): the content and the raw `Content-Disposition` header (it names the file). */
interface ApiFile {
  ok: true;
  blob: Blob;
  contentDisposition: string | null;
}

/** What `file()` gives: the file, or the failure as problem details (code, translated message, field errors). */
export type ApiFileResult = ApiFile | Extract<ActionResult<never>, { ok: false }>;

const isFieldError = (value: unknown): value is FieldError =>
  typeof value === "object" && value !== null && typeof (value as FieldError).field === "string" && typeof (value as FieldError).message === "string";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const FALLBACK_ERROR = "Something went wrong. Please try again.";

/** True for an error that came from a request that got no answer at all (see `NETWORK_ERROR`). */
export const isNetworkError = (error: unknown): boolean => error instanceof ApiError && error.code === NETWORK_ERROR;

/** The answer given for a request that never got one. */
const unreachable = <T,>(): ActionResult<T> => ({ ok: false, error: NETWORK_ERROR_MESSAGE, code: NETWORK_ERROR });

export function createApiClient(options: ApiClientOptions) {
  const translateMessage = options.translateMessage ?? ((text: string) => text);

  /** Reads an answer's JSON: the success envelope, or RFC 7807 problem details ({ status, code, detail, errors?: [{ field, message }] }). */
  async function readJson<T>(response: Response): Promise<ActionResult<T>> {
    try {
      const json = await response.json();
      if (typeof json?.ok === "boolean") return json as ActionResult<T>;
      const failure: ActionResult<T> = { ok: false, error: String(json?.detail ?? FALLBACK_ERROR) };
      if (typeof json?.code === "string") failure.code = json.code;
      if (Array.isArray(json?.errors)) failure.errors = json.errors.filter(isFieldError);
      return failure;
    } catch {
      return { ok: false, error: FALLBACK_ERROR };
    }
  }

  /** Translates a result's messages and tells the host about a suspended business. */
  function translateResult<T>(status: number, result: ActionResult<T>): ActionResult<T> {
    if (result.ok) return result.message ? { ...result, message: translateMessage(result.message) } : result;
    if (status === 403 && result.code === BUSINESS_SUSPENDED) options.onBusinessSuspended?.();
    return {
      ...result,
      error: translateMessage(result.error),
      ...(result.errors ? { errors: result.errors.map((fieldError) => ({ field: fieldError.field, message: translateMessage(fieldError.message) })) } : {}),
    };
  }

  async function send<T>(method: Method, path: string, body: unknown): Promise<ApiResponse<T>> {
    const isWrite = method !== "GET";
    let response: Response;
    try {
      response = await fetch(`${options.basePath}${path}`, {
        method,
        headers: { accept: "application/json", ...(isWrite ? { "content-type": "application/json" } : {}), ...(await options.getHeaders()) },
        body: isWrite ? JSON.stringify(body ?? {}) : undefined,
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
      });
    } catch {
      // offline, the API or proxy is down, the connection dropped or the request timed out: the normal problem shape, never a rejection
      return { status: 0, body: translateResult(0, unreachable<T>()) };
    }
    return { status: response.status, body: translateResult(response.status, await readJson<T>(response)) };
  }

  /** Repeats `request` once when it answered 401 and the host renewed the session. */
  async function withSessionRenewal<Answer extends { status: number }>(path: string, isQuiet: boolean, request: () => Promise<Answer>): Promise<Answer> {
    const answer = await request();
    if (answer.status === 401 && options.onUnauthorized && !path.startsWith("/auth/")) {
      if (await options.onUnauthorized({ isQuiet })) return request();
    }
    return answer;
  }

  /** One API call; a 401 gives the host one chance to renew the session, then the request is repeated once. */
  async function call<T>(method: Method, path: string, body?: unknown, callOptions: { isQuiet?: boolean } = {}): Promise<ApiResponse<T>> {
    const answer = await withSessionRenewal(path, !!callOptions.isQuiet, () => send<T>(method, path, body));
    if (answer.status === 404 && !answer.body.ok && options.onNotFound) {
      const message = await options.onNotFound();
      if (message) return { status: 404, body: { ...answer.body, error: translateMessage(message), code: MODULE_UNAVAILABLE } };
    }
    return answer;
  }

  /**
   * A GET for a file in another representation than JSON (`accept`, e.g. `text/csv`): a plain link cannot set the Accept header,
   * so the file is fetched and handed over as a blob. Errors still arrive as problem details (JSON) and come back as a failure.
   */
  async function file(path: string, accept: string): Promise<ApiFileResult> {
    const answer = await withSessionRenewal(path, false, async () => {
      try {
        const response = await fetch(`${options.basePath}${path}`, {
          method: "GET",
          headers: { accept, ...(await options.getHeaders()) },
          credentials: "same-origin",
          cache: "no-store",
        });
        return { status: response.status, response };
      } catch {
        return { status: 0, response: null };
      }
    });
    const { response } = answer;
    if (!response) return { ok: false, error: translateMessage(NETWORK_ERROR_MESSAGE), code: NETWORK_ERROR };
    const contentType = response.headers.get("content-type") ?? "";
    if (response.ok && !contentType.includes("json")) {
      return { ok: true, blob: await response.blob(), contentDisposition: response.headers.get("content-disposition") };
    }
    const result = translateResult<never>(response.status, response.ok ? { ok: false, error: FALLBACK_ERROR } : await readJson<never>(response));
    return result.ok ? { ok: false, error: translateMessage(FALLBACK_ERROR) } : result;
  }

  /** GET returning `data`, or null on 401 (signed out). Other errors throw. */
  async function get<T>(path: string): Promise<T | null> {
    const response = await call<T>("GET", path, undefined, { isQuiet: true });
    if (response.status === 401) return null;
    if (!response.body.ok) throw new ApiError(response.body.error, response.status, response.body.code);
    return response.body.data as T;
  }

  /** GET returning `data`; throws an ApiError on any error. */
  async function data<T>(path: string): Promise<T> {
    const response = await call<T>("GET", path);
    if (!response.body.ok) throw new ApiError(response.body.error, response.status, response.body.code, response.body.errors);
    return response.body.data as T;
  }

  /** A write: returns the API's envelope unchanged. On success every cached page is refetched before this resolves. */
  async function action<T = undefined>(method: Exclude<Method, "GET">, path: string, body?: unknown): Promise<ActionResult<T>> {
    const response = await call<T>(method, path, body);
    // wait for the refetch: the caller shows its toast together with the fresh data
    if (response.body.ok) await options.queryClient.invalidateQueries();
    return response.body;
  }

  return { call, get, data, action, file };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** The client of the JurisTrack pages, registered by `TrackProvider` from the `TrackContext` (so `actions.ts` files can stay plain functions). */
let trackClient: ApiClient | null = null;
export const registerTrackClient = (client: ApiClient) => { trackClient = client; };
const currentClient = (): ApiClient => {
  if (!trackClient) throw new Error("The JurisTrack API is not ready: render inside <TrackProvider>");
  return trackClient;
};

/** GET for the JurisTrack pages; `path` is relative to the context's API base path. */
export const apiData = <T>(path: string) => currentClient().data<T>(path);
/** Write for the JurisTrack pages (used by each page folder's `actions.ts`). */
export const apiAction = <T = undefined>(method: Exclude<Method, "GET">, path: string, body?: unknown) => currentClient().action<T>(method, path, body);
/** A file download for the JurisTrack pages (`Accept: accept`), e.g. a CSV export (used by `actions.ts`). */
export const apiFile = (path: string, accept: string) => currentClient().file(path, accept);

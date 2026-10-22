import type { QueryClient } from "@tanstack/react-query";
import type { ActionResult } from "./action";

/**
 * The API client. It is built from settings (`ApiClientOptions`), never from a fixed address: JurisTrack standalone uses `/api`
 * with a cookie session, embedded in JurisOne it uses the JurisOne gateway with a token in the Authorization header.
 * Paths passed to the client are relative to the base path (`/time/state`, not `/api/time/state`).
 */
export interface ApiClientOptions {
  /** Where the API lives, e.g. `/api`. */
  basePath: string;
  /** Extra request headers (an Authorization token); asked for on every request. */
  getHeaders: () => Record<string, string> | Promise<Record<string, string>>;
  /** Called on a 401. Return true when the session was renewed, so the request is sent once more. */
  onUnauthorized?: (info: { isQuiet: boolean }) => Promise<boolean>;
  /** Shows the API's fixed English messages in the reader's language. */
  translateMessage?: (text: string) => string;
  /** Refetched after every successful write. */
  queryClient: QueryClient;
}

export interface ApiResponse<T> {
  status: number;
  body: ActionResult<T>;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const FALLBACK_ERROR = "Something went wrong. Please try again.";

export function createApiClient(options: ApiClientOptions) {
  const translateMessage = options.translateMessage ?? ((text: string) => text);

  async function send<T>(method: Method, path: string, body: unknown): Promise<ApiResponse<T>> {
    const isWrite = method !== "GET";
    const response = await fetch(`${options.basePath}${path}`, {
      method,
      headers: { accept: "application/json", ...(isWrite ? { "content-type": "application/json" } : {}), ...(await options.getHeaders()) },
      body: isWrite ? JSON.stringify(body ?? {}) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
    let parsed: ActionResult<T>;
    try {
      const json = await response.json();
      // errors arrive as RFC 7807 problem details: { status, code, detail, ... }
      parsed = typeof json?.ok === "boolean" ? (json as ActionResult<T>) : { ok: false, error: String(json?.detail ?? FALLBACK_ERROR) };
    } catch {
      parsed = { ok: false, error: FALLBACK_ERROR };
    }
    if (!parsed.ok) parsed = { ...parsed, error: translateMessage(parsed.error) };
    else if (parsed.message) parsed = { ...parsed, message: translateMessage(parsed.message) };
    return { status: response.status, body: parsed };
  }

  /** One API call; a 401 gives the host one chance to renew the session, then the request is repeated once. */
  async function call<T>(method: Method, path: string, body?: unknown, callOptions: { isQuiet?: boolean } = {}): Promise<ApiResponse<T>> {
    let response = await send<T>(method, path, body);
    if (response.status === 401 && options.onUnauthorized && !path.startsWith("/auth/")) {
      if (await options.onUnauthorized({ isQuiet: !!callOptions.isQuiet })) response = await send<T>(method, path, body);
    }
    return response;
  }

  /** GET returning `data`, or null on 401 (signed out). Other errors throw. */
  async function get<T>(path: string): Promise<T | null> {
    const response = await call<T>("GET", path, undefined, { isQuiet: true });
    if (response.status === 401) return null;
    if (!response.body.ok) throw new ApiError(response.body.error, response.status);
    return response.body.data as T;
  }

  /** GET returning `data`; throws an ApiError on any error. */
  async function data<T>(path: string): Promise<T> {
    const response = await call<T>("GET", path);
    if (!response.body.ok) throw new ApiError(response.body.error, response.status);
    return response.body.data as T;
  }

  /** A write: returns the API's envelope unchanged. On success every cached page is refetched before this resolves. */
  async function action<T = undefined>(method: Exclude<Method, "GET">, path: string, body?: unknown): Promise<ActionResult<T>> {
    const response = await call<T>(method, path, body);
    // wait for the refetch: the caller shows its toast together with the fresh data
    if (response.body.ok) await options.queryClient.invalidateQueries();
    return response.body;
  }

  return { call, get, data, action };
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

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import { createApiClient, registerTrackClient } from "./api";
import type { Role } from "./roles";

/** The signed-in user as JurisTrack needs to know them (the standalone app reads it from `GET /api/me`). */
export interface TrackUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  /** null for the super admin (a platform user without a business). */
  businessName: string | null;
  /** null when not set. */
  employeeCode: string | null;
  /** "First Last" of the reporting manager; null when the user reports to nobody. */
  managerName: string | null;
  /** The business's IANA time zone; null for the super admin. */
  businessTimeZone: string | null;
}

/**
 * Everything environment-specific the JurisTrack pages get from their host (the standalone app, or JurisOne when embedded).
 * The pages import nothing from the host.
 */
export interface TrackContextValue {
  /** Where the API lives: `/api` standalone, the JurisOne gateway path when embedded. */
  apiBasePath: string;
  /** Extra headers for every API call, e.g. `{ Authorization: "Bearer …" }`. Empty for the cookie session. */
  getHeaders: () => Record<string, string> | Promise<Record<string, string>>;
  user: TrackUser;
  /** Translates an English text (the English text is the key). */
  t: (text: string, variables?: Record<string, string | number>) => string;
  /** Moves to a path of the JurisTrack routes, or back in history with a negative number. */
  navigate: (to: string | number) => void;
  /** Shows a short message to the user. */
  toast: (message: string, kind?: "ok" | "bad") => void;
  /** Called when the API answers 401: renew the session and return true to repeat the request, or end the session. */
  onUnauthorized?: (info: { isQuiet: boolean }) => Promise<boolean>;
  /** Called when the API answers 403 `BUSINESS_SUSPENDED`: the host shows its "access is paused" screen instead of the pages. */
  onBusinessSuspended?: () => void;
}

const TrackContext = createContext<TrackContextValue | null>(null);

export function useTrack(): TrackContextValue {
  const value = useContext(TrackContext);
  if (!value) throw new Error("useTrack() outside <TrackProvider>");
  return value;
}

/** Gives the JurisTrack pages their context and builds their API client from it. The host provides the TanStack `QueryClientProvider` and a `Suspense` boundary. */
export function TrackProvider({ value, children }: { value: TrackContextValue; children: ReactNode }) {
  const queryClient = useQueryClient();
  // the client reads the latest context on every call (a language change replaces `t`, a token refresh changes the headers)
  const latest = useRef(value);
  latest.current = value;
  const client = useMemo(
    () => createApiClient({
      basePath: value.apiBasePath,
      getHeaders: () => latest.current.getHeaders(),
      onUnauthorized: (info) => latest.current.onUnauthorized?.(info) ?? Promise.resolve(false),
      translateMessage: (text) => latest.current.t(text),
      onBusinessSuspended: () => latest.current.onBusinessSuspended?.(),
      queryClient,
    }),
    [value.apiBasePath, queryClient],
  );
  registerTrackClient(client);
  return <TrackContext.Provider value={value}>{children}</TrackContext.Provider>;
}

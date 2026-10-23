import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useRef, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from "react";
import { createApiClient, registerTrackClient } from "./api";
import { setDisplayLanguage } from "./lib/time/display-language";
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

/** The props of the host's link component: a normal anchor whose `to` is a path of the JurisTrack routes (`/my-time`, `/admin/employees?managerId=…`). */
export type TrackLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to: string };

/** Where the host's router is now: the pieces of the address the pages read. */
export interface TrackLocation {
  /** The path of the JurisTrack route (`/admin/employees`), without the query string. */
  pathname: string;
  /** The query string with its leading "?" (`?page=2`), or "". */
  search: string;
  /** The values of the route's `:parameters` (`{ id: "…" }`). */
  params: Record<string, string>;
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
  /** The BCP 47 locale dates, times and zone names are written in (`en-GB`, `hi-IN`). */
  locale: string;
  /** Translates an English text (the English text is the key). */
  t: (text: string, variables?: Record<string, string | number>) => string;
  /** Moves to a path of the JurisTrack routes, or back in history with a negative number. `replace` swaps the current history entry (list filters); `keepScroll` leaves the scroll position alone. */
  navigate: (to: string | number, options?: { replace?: boolean; keepScroll?: boolean }) => void;
  /** Where the host's router is now (path, query string, route parameters). */
  location: TrackLocation;
  /** The query string of the address bar right now (the router's own state can lag a change made a moment ago). */
  readCurrentSearch: () => string;
  /** True when there is an earlier JurisTrack page to go back to. */
  canGoBack: () => boolean;
  /** A link to a path of the JurisTrack routes, drawn with the host's router. */
  Link: ComponentType<TrackLinkProps>;
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
  // dates, times and durations are formatted by plain functions: they follow the host's language
  setDisplayLanguage(value.locale, value.t);
  return <TrackContext.Provider value={value}>{children}</TrackContext.Provider>;
}

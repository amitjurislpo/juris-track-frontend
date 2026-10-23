import { createApiClient } from "@/track/api";
import { readLang } from "./i18n/lang";
import { translate } from "./i18n/translate";
import { queryClient } from "./query";

/** Where to go when the session has ended (set by the app once the router exists). */
let navigateTo: (destination: string) => void = (destination) => window.location.assign(destination);
export const setNavigator = (navigator: (destination: string) => void) => { navigateTo = navigator; };
/** Client-side navigation from outside React (after sign-in / sign-out). */
export const navigate = (to: string) => navigateTo(to);

const isOnPublicPage = () => location.pathname === "/login" || location.pathname.startsWith("/login/");

let refreshing: Promise<boolean> | null = null;
/** Exchanges the refresh cookie for new session cookies; one call at a time. */
function refreshSession(): Promise<boolean> {
  refreshing ??= standaloneApi.call("POST", "/auth/session-refreshes", {})
    .then((response) => response.body.ok)
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

/**
 * A 401: one silent session refresh. If that fails the session has ended and the user is sent to the sign-in page (unless
 * the call was quiet, used when asking "who am I?", or this already is a public page).
 */
export async function handleUnauthorized(info: { isQuiet: boolean }): Promise<boolean> {
  if (await refreshSession()) return true;
  if (!info.isQuiet && !isOnPublicPage()) {
    queryClient.clear();
    const next = location.pathname + location.search;
    navigateTo(next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  return false;
}

/** The standalone app's API client: `/api`, cookie session (no extra headers). Used for sign-in, `GET /api/me` and the shell. */
export const standaloneApi = createApiClient({
  basePath: "/api",
  getHeaders: () => ({}),
  onUnauthorized: handleUnauthorized,
  translateMessage: (text) => translate(readLang(), text),
  queryClient,
});

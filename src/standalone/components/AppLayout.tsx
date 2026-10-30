import { Suspense, useMemo } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router";
import { handleUnauthorized } from "@/standalone/api";
import { API_BASE_PATH } from "@/standalone/api-base-path";
import { Shell } from "@/standalone/components/Shell";
import { PageErrorBoundary } from "@/standalone/components/PageErrorBoundary";
import { ToastProvider, useToast } from "@/standalone/components/Toasts";
import { localeOf } from "@/standalone/i18n/config";
import { useLang, useT } from "@/standalone/i18n/client";
import { queryClient } from "@/standalone/query";
import { CURRENT_USER_QUERY_KEY, useCurrentUser, type CurrentUser } from "@/standalone/session";
import { SessionLoadFailedScreen } from "@/standalone/components/SessionLoadFailedScreen";
import { BusinessSuspendedScreen } from "@/standalone/components/BusinessSuspendedScreen";
import { PageLoading } from "@/track/PageLoading";
import { TrackProvider, type TrackContextValue } from "@/track/TrackContext";

/** Supplies the JurisTrack pages with their context: `/api/v1`, cookie session (no extra headers), this app's user, translator, router and toasts. */
function StandaloneTrack({ user }: { user: CurrentUser }) {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const toast = useToast();
  const currentLocation = useLocation();
  const params = useParams() as Record<string, string>;
  const { pathname, search } = currentLocation;
  const contextValue = useMemo<TrackContextValue>(() => ({
    apiBasePath: API_BASE_PATH,
    getHeaders: () => ({}),
    user,
    t,
    locale: localeOf(lang),
    navigate: (to, options) => {
      if (typeof to === "number") void navigate(to);
      else void navigate(to, { replace: options?.replace, preventScrollReset: options?.keepScroll });
    },
    location: { pathname, search, params },
    readCurrentSearch: () => window.location.search,
    canGoBack: () => Boolean((window.history.state as { idx?: number } | null)?.idx),
    Link,
    toast,
    onUnauthorized: handleUnauthorized,
    // the business was suspended while signed in: asking "who am I?" again gets the same 403, and the layout shows the paused screen
    onBusinessSuspended: () => { void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY }); },
  }), [user, t, lang, navigate, toast, pathname, search, params]);
  return (
    <TrackProvider value={contextValue}>
      <Shell user={user}>
        <PageErrorBoundary key={currentLocation.pathname} t={t} onRetry={() => { void queryClient.invalidateQueries(); }} onReset={() => { void navigate(pathname, { replace: true }); }}>
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </PageErrorBoundary>
      </Shell>
    </TrackProvider>
  );
}

/** Layout of every signed-in page: the shell (sidebar, top bar) around the page. */
export function AppLayout() {
  const { user, isLoading, isBusinessSuspended, hasLoadFailed } = useCurrentUser();
  const currentLocation = useLocation();
  if (isLoading) return <PageLoading />;
  if (isBusinessSuspended) return <BusinessSuspendedScreen />;
  if (hasLoadFailed) return <SessionLoadFailedScreen />;
  if (!user) return <Navigate to={`/login${currentLocation.pathname !== "/" ? `?next=${encodeURIComponent(currentLocation.pathname + currentLocation.search)}` : ""}`} replace />;
  return (
    <ToastProvider>
      <StandaloneTrack user={user} />
    </ToastProvider>
  );
}

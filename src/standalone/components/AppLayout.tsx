import { Suspense, useMemo } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { handleUnauthorized } from "@/standalone/api";
import { Shell } from "@/standalone/components/Shell";
import { PageErrorBoundary } from "@/standalone/components/PageErrorBoundary";
import { ToastProvider, useToast } from "@/standalone/components/Toasts";
import { useT } from "@/standalone/i18n/client";
import { queryClient } from "@/standalone/query";
import { CURRENT_USER_QUERY_KEY, useCurrentUser, type CurrentUser } from "@/standalone/session";
import { BusinessSuspendedScreen } from "@/standalone/components/BusinessSuspendedScreen";
import { PageLoading } from "@/track/PageLoading";
import { TrackProvider, type TrackContextValue } from "@/track/TrackContext";

/** Supplies the JurisTrack pages with their context: `/api`, cookie session (no extra headers), this app's user, translator, router and toasts. */
function StandaloneTrack({ user }: { user: CurrentUser }) {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const currentLocation = useLocation();
  const contextValue = useMemo<TrackContextValue>(() => ({
    apiBasePath: "/api",
    getHeaders: () => ({}),
    user,
    t,
    navigate: (to) => { if (typeof to === "number") void navigate(to); else void navigate(to); },
    toast,
    onUnauthorized: handleUnauthorized,
    // the business was suspended while signed in: asking "who am I?" again gets the same 403, and the layout shows the paused screen
    onBusinessSuspended: () => { void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY }); },
  }), [user, t, navigate, toast]);
  return (
    <TrackProvider value={contextValue}>
      <Shell user={user}>
        <PageErrorBoundary key={currentLocation.pathname} t={t} onRetry={() => { void queryClient.invalidateQueries(); }}>
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
  const { user, isLoading, isBusinessSuspended } = useCurrentUser();
  const currentLocation = useLocation();
  if (isLoading) return <PageLoading />;
  if (isBusinessSuspended) return <BusinessSuspendedScreen />;
  if (!user) return <Navigate to={`/login${currentLocation.pathname !== "/" ? `?next=${encodeURIComponent(currentLocation.pathname + currentLocation.search)}` : ""}`} replace />;
  return (
    <ToastProvider>
      <StandaloneTrack user={user} />
    </ToastProvider>
  );
}

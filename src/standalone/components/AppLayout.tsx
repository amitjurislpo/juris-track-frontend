import { Suspense, useMemo } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { handleUnauthorized } from "@/standalone/api";
import { Shell } from "@/standalone/components/Shell";
import { PageErrorBoundary } from "@/standalone/components/PageErrorBoundary";
import { ToastProvider, useToast } from "@/standalone/components/Toasts";
import { useT } from "@/standalone/i18n/client";
import { queryClient } from "@/standalone/query";
import { useCurrentUser, type CurrentUser } from "@/standalone/session";
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
  }), [user, t, navigate, toast]);
  return (
    <TrackProvider value={contextValue}>
      <Shell user={user}>
        <PageErrorBoundary key={currentLocation.pathname} onRetry={() => { void queryClient.invalidateQueries(); }}>
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
  const { user, isLoading } = useCurrentUser();
  const currentLocation = useLocation();
  if (isLoading) return <PageLoading />;
  if (!user) return <Navigate to={`/login${currentLocation.pathname !== "/" ? `?next=${encodeURIComponent(currentLocation.pathname + currentLocation.search)}` : ""}`} replace />;
  return (
    <ToastProvider>
      <StandaloneTrack user={user} />
    </ToastProvider>
  );
}

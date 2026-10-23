import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router";
import { setNavigator } from "@/standalone/api";
import { AppLayout } from "@/standalone/components/AppLayout";
import { BusinessSuspendedScreen } from "@/standalone/components/BusinessSuspendedScreen";
import { RootErrorBoundary } from "@/standalone/components/RootErrorBoundary";
import { SessionLoadFailedScreen } from "@/standalone/components/SessionLoadFailedScreen";
import { NotFound } from "@/standalone/components/NotFound";
import { I18nProvider, useT } from "@/standalone/i18n/client";
import { queryClient } from "@/standalone/query";
import { useCurrentUser } from "@/standalone/session";
import { PageLoading } from "@/track/PageLoading";
import { RequireRole } from "@/track/RequireRole";
import { homeFor } from "@/track/roles";
import { trackRoutes } from "@/track/routes";

const LoginPage = lazy(() => import("@/standalone/login/page"));

/** Page title: "<page> · JurisTrack" (the browser tab), in the reader's language. */
function Titled({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useT();
  const translatedTitle = t(title);
  useEffect(() => { document.title = `${translatedTitle} · JurisTrack`; }, [translatedTitle]);
  return children;
}

/** `/` goes to the user's landing page, or to sign-in. */
function Root() {
  const { user, isLoading, isBusinessSuspended, hasLoadFailed } = useCurrentUser();
  if (isLoading) return <PageLoading />;
  if (isBusinessSuspended) return <BusinessSuspendedScreen />;
  if (hasLoadFailed) return <SessionLoadFailedScreen />;
  return <Navigate to={user ? homeFor(user.role) : "/login"} replace />;
}

/** Hands the router's navigate to the API client, so "session ended" can move the user to /login. */
function NavigatorBridge() {
  const navigate = useNavigate();
  useEffect(() => { setNavigator((to) => { void navigate(to, { replace: true }); }); }, [navigate]);
  return null;
}

/** The standalone JurisTrack app: its own sign-in and shell around the (embeddable) JurisTrack pages. */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <BrowserRouter>
          <NavigatorBridge />
          <RootErrorBoundary>
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/" element={<Root />} />
                <Route path="login" element={<Titled title="Sign in"><LoginPage /></Titled>} />
                <Route element={<AppLayout />}>
                  {trackRoutes.map(({ path, title, roles, Page }) => (
                    <Route key={path} path={path} element={<Titled title={title}><RequireRole roles={roles}><Page /></RequireRole></Titled>} />
                  ))}
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </RootErrorBoundary>
        </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
}

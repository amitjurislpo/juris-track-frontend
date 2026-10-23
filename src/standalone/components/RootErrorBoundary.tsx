import type { ReactNode } from "react";
import { PageErrorBoundary } from "@/standalone/components/PageErrorBoundary";
import { useT } from "@/standalone/i18n/client";

/** The last safety net around every route (sign-in included): an unexpected error shows a message and a reload button instead of a blank page. */
export function RootErrorBoundary({ children }: { children: ReactNode }) {
  const t = useT();
  return <PageErrorBoundary t={t} onRetry={() => { window.location.reload(); }}>{children}</PageErrorBoundary>;
}

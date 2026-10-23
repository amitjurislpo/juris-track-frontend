import { Component, type ReactNode } from "react";
import type { T } from "@/standalone/i18n/translate";
import { ApiError, BUSINESS_SUSPENDED } from "@/track/api";

/** The headline for a failed page load, by the API's answer (translation keys). */
function headlineOf(error: Error): string {
  if (!(error instanceof ApiError)) return "Something went wrong";
  if (error.code === BUSINESS_SUSPENDED) return "Your company's access is paused";
  if (error.status === 403) return "You don't have access to this";
  if (error.status === 404) return "Not found";
  return "Something went wrong";
}

/** Catches a page's failed data load (403/404 included) and offers a retry (and, for a 400, to clear the filters in the address). Reset by navigation (key on the path). */
export class PageErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void; /** Drops the address's query string (offered for a 400: a bad filter in the address). */ onReset?: () => void; t: T }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    const { error } = this.state;
    const { t } = this.props;
    if (!error) return this.props.children;
    return (
      <div className="empty" role="alert">
        <b className="display">{t(headlineOf(error))}</b>
        <span className="muted">{error.message}</span>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {error instanceof ApiError && error.status === 400 && this.props.onReset && (
            <button type="button" className="btn btn-sm" onClick={() => { this.setState({ error: null }); this.props.onReset?.(); }}>{t("Clear filters")}</button>
          )}
          <button type="button" className="btn btn-sm" onClick={() => { this.setState({ error: null }); this.props.onRetry(); }}>{t("Retry")}</button>
        </span>
      </div>
    );
  }
}

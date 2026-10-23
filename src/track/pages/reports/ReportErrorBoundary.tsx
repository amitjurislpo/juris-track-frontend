import { Component, type ReactNode } from "react";
import { ApiError, BUSINESS_SUSPENDED, isNetworkError } from "@/track/api";

interface ReportErrorBoundaryProps {
  children: ReactNode;
  /** The report's API path: a new path (other filters) clears the error and loads again. */
  resetKey: string;
  /** Forgets the failed query (TanStack's error reset), so the next render loads it again. */
  onReset: () => void;
  /** Removes every filter (offered for 400 and 404: a filter the API could not use). */
  onClearFilters: () => void;
  t: (text: string, variables?: Record<string, string | number>) => string;
}

/** A clear headline and hint for a report the API refused (translation keys). */
function explanationOf(error: Error): { headline: string; hint: string; canClearFilters: boolean } {
  if (!(error instanceof ApiError) || isNetworkError(error)) return { headline: "The report could not be loaded", hint: "Check your connection and try again.", canClearFilters: false };
  if (error.status === 403) return { headline: "You can't see this report", hint: "Reports show only the people you are allowed to see.", canClearFilters: true };
  if (error.status === 404) return { headline: "Not in your report", hint: "The chosen employee or manager is not among the people you can see.", canClearFilters: true };
  if (error.status === 400) return { headline: "Some filters are not valid", hint: "Change or clear the filters and try again.", canClearFilters: true };
  return { headline: "The report could not be loaded", hint: "Check your connection and try again.", canClearFilters: false };
}

/**
 * Catches a report the API refused (403 scope, 404 employee or manager not in scope, 400 bad parameter) inside the page, so the
 * filters stay usable: it explains what happened, shows the API's message (and each wrong parameter), and offers to clear the
 * filters or try again. A suspended business is left to the host's boundary.
 */
export class ReportErrorBoundary extends Component<ReportErrorBoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }

  componentDidUpdate(previousProps: ReportErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) this.retry();
  }

  retry = () => {
    this.props.onReset();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { t } = this.props;
    if (!error) return this.props.children;
    // the host shows its own "access is paused" screen for a suspended business
    if (error instanceof ApiError && error.code === BUSINESS_SUSPENDED) throw error;
    const { headline, hint, canClearFilters } = explanationOf(error);
    const fieldMessages = error instanceof ApiError ? error.fieldErrors.map((fieldError) => fieldError.message) : [];
    return (
      <div className="empty report-error" role="alert">
        <b>{t(headline)}</b>
        <span className="muted">{error.message}</span>
        {fieldMessages.length > 0 && <ul className="report-error-list">{fieldMessages.map((message) => <li key={message}>{message}</li>)}</ul>}
        <span className="muted">{t(hint)}</span>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {canClearFilters && <button type="button" className="btn btn-sm" onClick={this.props.onClearFilters}>{t("Clear filters")}</button>}
          <button type="button" className="btn btn-sm" onClick={this.retry}>{t("Try again")}</button>
        </span>
      </div>
    );
  }
}

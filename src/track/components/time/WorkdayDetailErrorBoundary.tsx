import { Component, type ReactNode } from "react";
import { ApiError, BUSINESS_SUSPENDED } from "@/track/api";

/**
 * Catches a failed load of the workday inside its dialog (removed day, no access, network), so the page behind keeps its state:
 * a message, the API's reason and a retry. A suspended business is left to the host's boundary.
 */
export class WorkdayDetailErrorBoundary extends Component<{
  children: ReactNode;
  t: (text: string) => string;
  /** Forgets the failed query so the next render loads it again. */
  onRetry: () => void;
}, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }

  render() {
    const { error } = this.state;
    const { t } = this.props;
    if (!error) return this.props.children;
    if (error instanceof ApiError && error.code === BUSINESS_SUSPENDED) throw error;
    return (
      <div className="empty" role="alert">
        <b>{error instanceof ApiError && error.status === 404 ? t("This workday was not found.") : t("The workday could not be loaded.")}</b>
        <span className="muted">{error.message}</span>
        <button type="button" className="btn btn-sm" onClick={() => { this.props.onRetry(); this.setState({ error: null }); }}>{t("Try again")}</button>
      </div>
    );
  }
}

import { Component, type ReactNode } from "react";
import { ApiError } from "@/track/api";

/** Catches a page's failed data load (403/404 included) and offers a retry. Reset by navigation (key on the path). */
export class PageErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const status = error instanceof ApiError ? error.status : 0;
    return (
      <div className="empty">
        <b className="display">{status === 403 ? "You don't have access to this" : status === 404 ? "Not found" : "Something went wrong"}</b>
        <span className="muted">{error.message}</span>
        <button className="btn btn-sm" onClick={() => { this.setState({ error: null }); this.props.onRetry(); }}>Retry</button>
      </div>
    );
  }
}

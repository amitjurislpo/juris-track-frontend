/** Shown while a page's data first loads. */
export function PageLoading() {
  return <div className="empty" role="status" aria-busy="true"><span className="muted">…</span></div>;
}

import type { ReactNode } from "react";

/** What a list or page shows when there is nothing to show (design `.empty`). Texts are already translated. */
export function EmptyState({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="empty" style={{ border: 0 }}>
      <b>{title}</b>
      {text && <span className="muted">{text}</span>}
      {children}
    </div>
  );
}

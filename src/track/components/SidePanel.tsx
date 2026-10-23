import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTrack } from "../TrackContext";
import { Icon } from "./Icon";

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex='-1'])";

/**
 * A panel that slides in from the right (design `.drawer`) over a dimmed page, rendered at <body> level. It is a modal dialog:
 * Escape, the close button and a click on the backdrop close it; focus moves to the panel, stays inside while tabbing and returns
 * to the element that opened it.
 */
export function SidePanel({ title, eyebrow, onClose, children }: { title: ReactNode; eyebrow?: ReactNode; onClose: () => void; children: ReactNode }) {
  const { t } = useTrack();
  const panelRef = useRef<HTMLDivElement>(null);
  const latestOnClose = useRef(onClose);
  useEffect(() => { latestOnClose.current = onClose; });
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        latestOnClose.current();
      }
      if (e.key === "Tab" && panel) {
        const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!focusable.length) return;
        const firstItem = focusable[0];
        const lastItem = focusable[focusable.length - 1];
        if (e.shiftKey && (document.activeElement === firstItem || document.activeElement === panel)) { e.preventDefault(); lastItem.focus(); }
        else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); firstItem.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <>
      <div className="panel-scrim" onMouseDown={onClose} aria-hidden="true" />
      <div ref={panelRef} tabIndex={-1} className="drawer side-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-h" style={{ padding: 0 }}>
          <div style={{ minWidth: 0 }}>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id={titleId}>{title}</h2></div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t("Close")}><Icon name="x" size={16} /></button>
        </div>
        {children}
      </div>
    </>,
    document.body,
  );
}

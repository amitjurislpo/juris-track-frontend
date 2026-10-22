import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTrack } from "../TrackContext";
import { Icon } from "./Icon";

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * A dialog (design `.overlay` / `.modal`), rendered at <body> level so animated cards cannot clip it. Escape and a click on the
 * backdrop close it; focus moves into it, stays inside while tabbing and returns to the trigger afterwards.
 */
export function Modal({ title, eyebrow, onClose, footer, children, isSmall, isStacked }: {
  title: ReactNode;
  eyebrow?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  isSmall?: boolean;
  /** Opened from another dialog: shown above it. */
  isStacked?: boolean;
}) {
  const { t } = useTrack();
  const dialogRef = useRef<HTMLDivElement>(null);
  const latestOnClose = useRef(onClose);
  useEffect(() => { latestOnClose.current = onClose; });
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const firstField = dialog?.querySelector<HTMLElement>("[autofocus], input, select, textarea, button:not(.icon-btn)");
    (firstField ?? dialog)?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        latestOnClose.current();
      }
      if (e.key === "Tab" && dialog) {
        const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!focusable.length) return;
        const firstItem = focusable[0];
        const lastItem = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === firstItem) { e.preventDefault(); lastItem.focus(); }
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
    <div className="overlay" style={isStacked ? { zIndex: 90 } : undefined} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} tabIndex={-1} className={`modal${isSmall ? " sm" : ""}`} style={isSmall ? undefined : { maxWidth: 720 }} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-h">
          <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id={titleId} className="display">{title}</h2></div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t("Close")}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

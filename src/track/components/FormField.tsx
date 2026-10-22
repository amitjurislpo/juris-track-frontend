import { cloneElement, useId, type ReactElement } from "react";

/**
 * A labelled form field (design `.field`): the label, an optional hint on the same line ("optional"), the control and the field's
 * error underneath. The control's accessible name is the label alone; the hint and the error describe it (`aria-describedby`).
 */
export function FormField({ label, hint, error, children }: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}) {
  const controlId = useId();
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      {/* with a hint the label keeps its own width, so the hint sits beside it */}
      <label htmlFor={controlId} style={hint ? { flexBasis: "auto" } : undefined}>{label}</label>
      {hint && <span id={hintId} className="hint">{hint}</span>}
      {cloneElement(children, { id: controlId, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error && <span id={errorId} className="err">{error}</span>}
    </div>
  );
}

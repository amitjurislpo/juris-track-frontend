
import { createContext, useCallback, useContext, useState } from "react";
import { Icon } from "@/track/components/Icon";

type ToastKind = "ok" | "bad";
interface Toast { id: number; message: string; kind: ToastKind }

const PushToast = createContext<(message: string, kind?: ToastKind) => void>(() => {});

export const useToast = () => useContext(PushToast);

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, kind: ToastKind = "ok") => {
    const id = ++toastCounter;
    setToasts((previousToasts) => [...previousToasts, { id, message, kind }]);
    setTimeout(() => setToasts((currentToasts) => currentToasts.filter((item) => item.id !== id)), 3800);
  }, []);
  return (
    <PushToast.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <span className="ti" style={toast.kind === "bad" ? { background: "var(--badbg)", color: "var(--bad)" } : undefined}>
              <Icon name={toast.kind === "bad" ? "x" : "ok"} size={14} />
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </PushToast.Provider>
  );
}

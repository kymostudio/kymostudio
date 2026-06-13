import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { X } from "lucide-react";

type ToastOpts = { message: string; actionLabel?: string; onAction?: () => void; duration?: number };

// Lightweight bottom snackbar — used mainly for "Deleted X · Undo" after deletes.
const Ctx = createContext<(o: ToastOpts) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastOpts | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((o: ToastOpts) => {
    clearTimeout(timer.current);
    setToast(o);
    timer.current = setTimeout(() => setToast(null), o.duration ?? 6000);
  }, []);
  const dismiss = useCallback(() => { clearTimeout(timer.current); setToast(null); }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-msg">{toast.message}</span>
          {toast.actionLabel && (
            <button className="toast-action" onClick={() => { toast.onAction?.(); dismiss(); }}>{toast.actionLabel}</button>
          )}
          <button className="toast-x" onClick={dismiss} aria-label="Dismiss"><X size={15} strokeWidth={2.2} /></button>
        </div>
      )}
    </Ctx.Provider>
  );
}

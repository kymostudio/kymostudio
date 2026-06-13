import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export type ConfirmOpts = {
  title: string;
  detail?: string;
  confirmLabel?: string; // default "Delete"
  cancelLabel?: string;  // default "Cancel"
  danger?: boolean;      // red confirm button (default true — these are destructive)
};

// Promise-based confirm to replace window.confirm() with a styled modal.
//   const confirm = useConfirm();
//   if (!(await confirm({ title: "Delete X?", detail: "…" }))) return;
const Ctx = createContext<(opts: ConfirmOpts) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => {
    resolver.current = resolve;
    setOpts(o);
  }), []);

  const close = useCallback((v: boolean) => {
    setOpts(null);
    resolver.current?.(v);
    resolver.current = null;
  }, []);

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {opts && <ConfirmDialog opts={opts} onCancel={() => close(false)} onConfirm={() => close(true)} />}
    </Ctx.Provider>
  );
}

function ConfirmDialog({ opts, onCancel, onConfirm }: { opts: ConfirmOpts; onCancel: () => void; onConfirm: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      else if (e.key === "Enter") { e.preventDefault(); onConfirm(); }
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onCancel, onConfirm]);
  const danger = opts.danger !== false;
  return (
    <div className="confirm-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-label={opts.title}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
        <button className="confirm-x" onClick={onCancel} aria-label="Close"><X size={18} strokeWidth={2.2} /></button>
        <div className="confirm-body">
          <span className={"confirm-icon" + (danger ? " danger" : "")}><AlertTriangle size={24} strokeWidth={2} /></span>
          <div className="confirm-text">
            <p className="confirm-title">{opts.title}</p>
            {opts.detail && <p className="confirm-detail">{opts.detail}</p>}
          </div>
        </div>
        <div className="confirm-foot">
          <button onClick={onCancel}>{opts.cancelLabel || "Cancel"}</button>
          <button ref={confirmRef} className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm}>{opts.confirmLabel || "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

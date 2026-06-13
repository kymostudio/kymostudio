import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";

// One row of a right-click menu. `sep: true` draws a divider instead.
export type MenuItem =
  | { sep: true }
  | {
      sep?: false;
      label: string;
      icon?: React.ReactNode;
      shortcut?: string;
      danger?: boolean;
      disabled?: boolean;
      onClick: () => void;
    };

type OpenFn = (e: { clientX: number; clientY: number; preventDefault?: () => void }, items: MenuItem[]) => void;

// Portal-based context menu, modeled on confirm.tsx — one provider at the app
// root, opened imperatively via useContextMenu().
const Ctx = createContext<OpenFn>(() => {});
export const useContextMenu = () => useContext(Ctx);

type State = { x: number; y: number; items: MenuItem[] };

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const open = useCallback<OpenFn>((e, items) => {
    e.preventDefault?.();
    if (items.length) setState({ x: e.clientX, y: e.clientY, items });
  }, []);
  const close = useCallback(() => setState(null), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      {state && <Menu state={state} onClose={close} />}
    </Ctx.Provider>
  );
}

function Menu({ state, onClose }: { state: State; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: state.x, y: state.y });

  // Flip back on-screen if the menu would overflow the viewport.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let x = state.x, y = state.y;
    if (x + r.width > window.innerWidth - 6) x = Math.max(6, window.innerWidth - r.width - 6);
    if (y + r.height > window.innerHeight - 6) y = Math.max(6, window.innerHeight - r.height - 6);
    setPos({ x, y });
  }, [state.x, state.y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="ctx-menu" role="menu" style={{ left: pos.x, top: pos.y }} onClick={(e) => e.stopPropagation()}>
      {state.items.map((it, i) =>
        it.sep ? (
          <div key={"s" + i} className="ctx-sep" />
        ) : (
          <button
            key={it.label + i}
            role="menuitem"
            className={"ctx-item" + (it.danger ? " danger" : "")}
            disabled={it.disabled}
            onClick={() => { onClose(); it.onClick(); }}
          >
            <span className="ctx-icon">{it.icon}</span>
            <span className="ctx-label">{it.label}</span>
            {it.shortcut && <span className="ctx-shortcut">{it.shortcut}</span>}
          </button>
        )
      )}
    </div>
  );
}

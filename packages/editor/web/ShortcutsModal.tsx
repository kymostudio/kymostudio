import React, { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { registerShortcutsOpener, toggleConnect } from "./mcpstatus";

// Mac shows ⌘, everyone else Ctrl. (Best-effort platform sniff.)
const IS_MAC = typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent || "");
const MOD = IS_MAC ? "⌘" : "Ctrl";

// Shortcuts are deliberately chosen to NOT clash with the browser's own keys: the
// only modified combos are ⌘/Ctrl+K and ⌘/Ctrl+S (which web apps conventionally
// override) plus ⌘/Ctrl+⇧+A; everything else is a single un-modified key that the
// browser leaves alone, and we ignore them while a text field is focused.
const GROUPS: { title: string; items: { keys: string[]; desc: string }[] }[] = [
  {
    title: "General",
    items: [
      { keys: ["?"], desc: "Show this keyboard-shortcuts panel" },
      { keys: [MOD, "K"], desc: "Search & jump to a project or diagram" },
      { keys: ["Esc"], desc: "Close the open dialog, panel, or palette" },
    ],
  },
  {
    title: "Diagram",
    items: [
      { keys: [MOD, "S"], desc: "Save the current diagram" },
    ],
  },
  {
    title: "Panels",
    items: [
      { keys: [MOD, "⇧", "A"], desc: "Toggle the Connect AI panel" },
    ],
  },
];

const isTyping = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = (t.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable;
};

// Keyboard Shortcuts: a reference modal opened from Settings → Keyboard Shortcuts or
// the "?" key. Also owns the global app shortcuts that aren't bound elsewhere
// (so they work from anywhere): "?" opens this, ⌘/Ctrl+⇧+A toggles Connect AI.
export function ShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => { registerShortcutsOpener(() => setOpen(true)); return () => registerShortcutsOpener(null); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘/Ctrl+⇧+A → toggle Connect AI (works even while typing — it's modified).
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.code === "KeyA" || e.key === "a" || e.key === "A")) {
        e.preventDefault(); toggleConnect(); return;
      }
      if (e.key === "Escape") { setOpen(false); return; }
      // "?" opens the panel — but not while typing in a field.
      if (e.key === "?" && !isTyping(e.target)) { e.preventDefault(); setOpen((o) => !o); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;
  return (
    <div className="ks-overlay" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="ks-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ks-head">
          <h2><Keyboard size={17} strokeWidth={2} /> Keyboard shortcuts</h2>
          <button className="ks-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>
        <div className="ks-body">
          {GROUPS.map((g) => (
            <section className="ks-group" key={g.title}>
              <h3 className="ks-group-title">{g.title}</h3>
              {g.items.map((it) => (
                <div className="ks-row" key={it.desc}>
                  <span className="ks-desc">{it.desc}</span>
                  <span className="ks-keys">
                    {it.keys.map((k, i) => <kbd className="ks-key" key={i}>{k}</kbd>)}
                  </span>
                </div>
              ))}
            </section>
          ))}
        </div>
        <p className="ks-foot">Chosen to avoid clashing with your browser’s own shortcuts.</p>
      </div>
    </div>
  );
}

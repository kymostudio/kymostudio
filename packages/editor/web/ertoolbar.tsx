import React, { useEffect } from "react";
import { MousePointer2, Hand, Table2, Eraser } from "lucide-react";
import type { ErTool } from "./preview";

// Floating canvas toolbar for the DBML ER editor (dbdiagram-style). Each button
// carries data-ertool so the AI ghost cursor (er-simulate.ts) can aim at and
// "click" it — the same control the human uses.
const TOOLS: { id: ErTool; key: string; label: string; Icon: typeof Hand }[] = [
  { id: "select", key: "1", label: "Select / move", Icon: MousePointer2 },
  { id: "hand", key: "2", label: "Pan", Icon: Hand },
  { id: "table", key: "3", label: "Add table", Icon: Table2 },
  { id: "delete", key: "4", label: "Delete", Icon: Eraser },
];

export function ErToolbar({ tool, onTool }: { tool: ErTool; onTool: (t: ErTool) => void }) {
  // Number-key shortcuts (ignored while typing in an input / textarea).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const t = TOOLS.find((x) => x.key === e.key);
      if (t) onTool(t.id);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onTool]);

  return (
    <div className="er-toolbar" role="toolbar" aria-label="ER tools"
      onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      {TOOLS.map((t) => (
        <button key={t.id} data-ertool={t.id} className={"er-tool" + (tool === t.id ? " active" : "")}
          title={`${t.label} (${t.key})`} aria-label={t.label} aria-pressed={tool === t.id}
          onClick={() => onTool(t.id)}>
          <t.Icon size={18} strokeWidth={2} />
          <span className="er-tool-key">{t.key}</span>
        </button>
      ))}
    </div>
  );
}

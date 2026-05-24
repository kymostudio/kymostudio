/**
 * ui/ToolRail.tsx — canvas-studio P3 (FR-CS-03): the left tool rail.
 *
 * A flush vertical rail on the canvas's left edge rendering the tool registry
 * (`tools.ts`). The active tool is highlighted; each tool shows its shortcut
 * badge. Enabled tools dispatch `setTool`; disabled placeholders are inert (they
 * reserve slots for the `canvas-create-tools` sibling) and explain themselves via
 * the tooltip. Token-driven classes (index.html) → themes via [data-theme].
 */
import { Fragment } from "react";
import type { Tool } from "../engine/react";
import { TOOLS } from "./tools";

export function ToolRail({ tool, setTool }: { tool: Tool; setTool: (t: Tool) => void }) {
  return (
    <div className="k-rail" role="toolbar" aria-label="Canvas tools">
      {TOOLS.map((t) => {
        const Icon = t.Icon;
        const active = t.enabled && tool === t.id;
        return (
          <Fragment key={t.id}>
            {t.sepBefore && <div className="sep" />}
            <div
              className={`tool${active ? " active" : ""}${t.enabled ? "" : " disabled"}`}
              title={t.title}
              aria-label={t.title}
              aria-disabled={!t.enabled}
              aria-pressed={active}
              onClick={t.enabled ? () => setTool(t.id as Tool) : undefined}
            >
              <Icon size={18} />
              <span className="kbd">{t.kbd}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

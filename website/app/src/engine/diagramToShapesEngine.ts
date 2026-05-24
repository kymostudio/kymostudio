/**
 * canvas-jam Phase 1 (FR-J-01) — the engine's shape builder.
 *
 * The shared `diagramToShapes` still emits tldraw-native `geo`/`arrow` (the live
 * `?engine=tldraw` path depends on them). The engine no longer wants those: this
 * builder reuses `diagramToShapes` for stable ids / positions / `meta.kymo`, then
 * remaps `geo` → `kymo-region` and `arrow` → `kymo-edge`, carrying only the props
 * the engine ShapeUtils read (dropping dead tldraw fields like `bend`/`size`/
 * `verticalAlign`/`richText`). `meta.kymo` is preserved verbatim, so the
 * `patchDsl` round-trip and persistence reconciliation are untouched.
 */
import { type ShapePartial, type ShapeId } from "../../../../packages/js-canvas/dist/index.js";
import type { Diagram } from "../../../../packages/js/dist/index.js";
import { diagramToShapes } from "../diagramToShapes";

/** Flatten tldraw's `toRichText` doc (set by `diagramToShapes`) to plain text. */
function richTextToPlain(rt: unknown): string {
  if (typeof rt === "string") return rt;
  const walk = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";
    const n = node as { text?: string; content?: unknown[] };
    if (typeof n.text === "string") return n.text;
    if (Array.isArray(n.content)) return n.content.map(walk).join("");
    return "";
  };
  return walk(rt);
}

/** Build the engine's kymo-layer shape partials for a positioned diagram. */
export function diagramToShapesEngine(d: Diagram): ShapePartial[] {
  return diagramToShapes(d).map((p): ShapePartial => {
    const id = p.id as unknown as ShapeId;
    const meta = (p.meta ?? {}) as Record<string, unknown>;
    const props = (p.props ?? {}) as Record<string, unknown>;

    if (p.type === "geo") {
      return {
        id, type: "kymo-region", x: p.x, y: p.y, meta,
        props: { w: props.w, h: props.h, color: "grey", dash: props.dash, label: richTextToPlain(props.richText) },
      };
    }
    if (p.type === "arrow") {
      return {
        id, type: "kymo-edge", x: p.x, y: p.y, meta,
        props: { start: props.start, end: props.end, color: "grey", arrowhead: props.arrowheadEnd, label: richTextToPlain(props.richText) },
      };
    }
    // kymo-node (kymo-diagram is created directly by EngineBoard's embed path).
    return { id, type: p.type as string, x: p.x, y: p.y, meta, props };
  });
}

/**
 * Map a positioned `Diagram` to engine shape partials, one per element
 * (Component → `kymo-node`, Region → `kymo-region` rect, Edge → `kymo-edge`).
 * Deterministic ids (derived from the kymo id) keep `EngineBoard`'s diff-sync
 * stable; every shape is tagged `meta.kymo` so the freeform layer stays
 * untouched. (Built-in consolidation, `FR-J-01`; tldraw-free since `FR-J-04`.)
 */
import { createShapeId, type ShapeId, type ShapePartial } from "../../../packages/js-canvas/dist/index.js";
import {
  anchor, componentHalf, resolveAnchors,
  type Component, type Diagram, type Region,
} from "../../../packages/js/dist/index.js";

export const nodeShapeId = (id: string): ShapeId => createShapeId("kymo-node-" + id);
export const regionShapeId = (id: string): ShapeId => createShapeId("kymo-region-" + id);
export const edgeShapeId = (i: number): ShapeId => createShapeId("kymo-edge-" + i);

/** Build the kymo-layer shape partials for a positioned diagram. */
export function diagramToShapes(d: Diagram): ShapePartial[] {
  const out: ShapePartial[] = [];
  const lookup = (id: string): Component | Region | undefined =>
    d.components.find((c) => c.id === id) ?? d.regions.find((r) => r.id === id);

  // Regions first so they sit behind the nodes.
  for (const r of d.regions) {
    if (r.visible === false) continue; // invisible layout frames
    const [x, y, w, h] = r.bounds;
    if (w <= 0 || h <= 0) continue;
    out.push({
      id: regionShapeId(r.id), type: "kymo-region", x, y,
      props: { w, h, color: "grey", dash: r.style === "inner" ? "dashed" : "solid", label: r.label || "" },
      meta: { kymo: { id: r.id, kind: "region" } },
    });
  }

  // Component nodes (pos is centre → top-left).
  for (const c of d.components) {
    const [hw, hh] = componentHalf(c);
    out.push({
      id: nodeShapeId(c.id), type: "kymo-node", x: c.pos[0] - hw, y: c.pos[1] - hh,
      props: { w: hw * 2, h: hh * 2, icon: c.icon, accent: c.accent, name: c.name, subtitle: c.subtitle },
      meta: { kymo: { id: c.id, kind: "node" } },
    });
  }

  // Edges → kymo-edge from resolved anchor points (BPMN polylines use the embed fallback).
  d.edges.forEach((e, i) => {
    if (e.points && e.points.length) return;
    const s = lookup(e.src), t = lookup(e.dst);
    if (!s || !t) return;
    const [sa, da] = resolveAnchors(e, s, t);
    const [x1, y1] = anchor(s, sa);
    const [x2, y2] = anchor(t, da);
    out.push({
      id: edgeShapeId(i), type: "kymo-edge", x: x1, y: y1,
      props: { start: { x: 0, y: 0 }, end: { x: x2 - x1, y: y2 - y1 }, color: "grey", arrowhead: "arrow", label: e.label || "" },
      meta: { kymo: { kind: "edge", src: e.src, dst: e.dst } },
    });
  });

  return out;
}

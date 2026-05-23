/**
 * Phase 2 — map a positioned `Diagram` to tldraw shape partials, one per
 * element (Component → custom `kymo-node`, Region → native `geo` rect, Edge →
 * native `arrow`). Deterministic ids (derived from the kymo id) make the diff
 * sync in Board stable. Every shape is tagged `meta.kymo` so the freeform layer
 * stays untouched.
 */
import { createShapeId, toRichText, type TLShapeId, type TLShapePartial } from "./engine/adapter";
import {
  anchor, componentHalf, resolveAnchors,
  type Component, type Diagram, type Region,
} from "../../../packages/js/dist/index.js";

export const nodeShapeId = (id: string): TLShapeId => createShapeId("kymo-node-" + id);
export const regionShapeId = (id: string): TLShapeId => createShapeId("kymo-region-" + id);
export const edgeShapeId = (i: number): TLShapeId => createShapeId("kymo-edge-" + i);

/** Build the kymo-layer shape partials for a positioned diagram. */
export function diagramToShapes(d: Diagram): TLShapePartial[] {
  const out: TLShapePartial[] = [];
  const lookup = (id: string): Component | Region | undefined =>
    d.components.find((c) => c.id === id) ?? d.regions.find((r) => r.id === id);

  // Regions first so they sit behind the nodes.
  for (const r of d.regions) {
    if (r.visible === false) continue; // invisible layout frames
    const [x, y, w, h] = r.bounds;
    if (w <= 0 || h <= 0) continue;
    out.push({
      id: regionShapeId(r.id), type: "geo", x, y,
      props: {
        geo: "rectangle", w, h, size: "s", color: "grey", fill: "none",
        dash: r.style === "inner" ? "dashed" : "solid", font: "sans",
        align: "start", verticalAlign: "start",
        richText: toRichText(r.label || ""),
      },
      meta: { kymo: { id: r.id, kind: "region" } },
    });
  }

  // Component nodes (pos is centre → tldraw x/y is top-left).
  for (const c of d.components) {
    const [hw, hh] = componentHalf(c);
    out.push({
      id: nodeShapeId(c.id), type: "kymo-node", x: c.pos[0] - hw, y: c.pos[1] - hh,
      props: { w: hw * 2, h: hh * 2, icon: c.icon, accent: c.accent, name: c.name, subtitle: c.subtitle },
      meta: { kymo: { id: c.id, kind: "node" } },
    });
  }

  // Edges → arrows from resolved anchor points (BPMN polylines handled by the embed fallback).
  d.edges.forEach((e, i) => {
    if (e.points && e.points.length) return;
    const s = lookup(e.src), t = lookup(e.dst);
    if (!s || !t) return;
    const [sa, da] = resolveAnchors(e, s, t);
    const [x1, y1] = anchor(s, sa);
    const [x2, y2] = anchor(t, da);
    out.push({
      id: edgeShapeId(i), type: "arrow", x: x1, y: y1,
      props: {
        start: { x: 0, y: 0 }, end: { x: x2 - x1, y: y2 - y1 }, bend: 0,
        size: "s", color: "grey", font: "sans", arrowheadStart: "none", arrowheadEnd: "arrow",
        richText: toRichText(e.label || ""),
      },
      meta: { kymo: { kind: "edge", src: e.src, dst: e.dst } },
    });
  });

  return out;
}

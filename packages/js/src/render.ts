/**
 * SVG image generator — an original TypeScript renderer.
 *
 * This is NOT a port of the Python `to_svg.py`; it is a small, independent
 * renderer that turns a {@link Diagram} (whose components already carry
 * positions) into a standalone SVG document. It draws:
 *   - a rounded background with a faint dot grid,
 *   - edges as horizontally-biased cubic Béziers with arrowheads,
 *   - each component's icon (via {@link getIcon}) plus its label,
 * and auto-computes the canvas bounds from the component geometry.
 *
 * Only built-in (vector) icons render fully offline. File-backed icons
 * require `setIconBaseURL(...)` to point at a host serving the manifest.
 */
import {
  anchor, resolveAnchors, componentHalf, LABEL_HEIGHT,
  type Component, type Diagram, type Point, type Region, type Side,
} from "./model.js";
import { getIcon } from "./icons-loader.js";
import { coreBpmnRender } from "./core.js";

export interface RenderOptions {
  /** Outer margin around the content, in px. Default 52. */
  padding?: number;
  /** Background fill. Pass `null` for a transparent canvas. Default `#f8fafc`. */
  background?: string | null;
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string
  ));
}

// Region rendering for the architecture (non-BPMN) renderer — outer/inner frames.
// (BPMN pool/lane regions render via the core.) CSS lives in REGION_STYLE below.
function regionRect(r: Region): string {
  const [x, y, w, h] = r.bounds;
  const cls = r.style === "inner" ? "region-rect region-rect--inner" : "region-rect";
  return `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>`;
}
function regionLabel(r: Region): string {
  if (!r.label) return "";
  const [x, y] = r.bounds;
  return `<text class="region-label--inner" x="${x + 12}" y="${y + 16}">${escapeXml(r.label)}</text>`;
}

function half(c: Component): Point {
  return componentHalf(c) ?? [35, 35];
}

const r1 = (n: number): number => Math.round(n * 10) / 10;

// Renderer-owned defs: a filled-triangle arrowhead, a soft drop shadow, and
// a faint dot grid. (Original to this renderer — not copied from Python.)
const DEFS = `
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8"/>
    </marker>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.18"/>
    </filter>
    <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#0f172a" fill-opacity="0.05"/>
    </pattern>`;

const CSS = `
    text { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    .title { fill: #0f172a; font-size: 17px; font-weight: 700; }
    .label { fill: #1e293b; font-size: 13px; font-weight: 600; text-anchor: middle; }
    .elabel { fill: #64748b; font-size: 10.5px; text-anchor: middle; }`;

// Architecture-diagram region styling. These same three rules also live in
// BPMN_STYLE (which serves pool/lane diagrams); inject this only for non-BPMN
// diagrams that have regions, so a `.kymo` with `outer`/`inner` frames gets
// its near-transparent fills + outlines instead of falling back to SVG-default
// black, while BPMN output stays byte-identical. (Without this, region rects
// have no fill rule and render solid black — breaking light backgrounds.)
const REGION_STYLE = `
    .region-rect        { fill: rgba(15,23,42,0.02); stroke: #cbd5e1; stroke-width: 1.4; }
    .region-rect--inner { fill: rgba(124,58,237,0.03); stroke: #7c3aed; stroke-width: 1.3; stroke-dasharray: 4 4; }
    .region-label--inner { font-size: 12px; font-weight: 600; fill: #6d28d9; }`;

// Flowchart-node styling — injected ONLY when a diagram has icon-less nodes
// (Mermaid imports), so icon-bearing diagrams stay byte-identical. Nodes
// carry their label centred INSIDE the glyph.
const FLOWCHART_STYLE = `
    .fc-shape { fill: #eff6ff; stroke: #3b82f6; stroke-width: 1.6; }
    .fc-shape-line { fill: none; stroke: #3b82f6; stroke-width: 1.6; stroke-linecap: round; }
    .fc-label { fill: #1e3a8a; font-size: 13px; font-weight: 600; text-anchor: middle; dominant-baseline: central; }`;

/**
 * Icon-less flowchart node (Mermaid import): a shape outline sized from
 * `Component.size`, with the label centred INSIDE the glyph. Handles the
 * six shapes the Mermaid importer emits (MERMAID-MAP-001 §3).
 */
function flowchartNode(c: Component): string {
  const [cx, cy] = c.pos;
  const [hw, hh] = half(c);
  let glyph: string;
  switch (c.shape) {
    case "circle":
      glyph = `<ellipse class="fc-shape" cx="${cx}" cy="${cy}" rx="${hw}" ry="${hh}"/>`;
      break;
    case "diamond":
      glyph = `<polygon class="fc-shape" points="${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}"/>`;
      break;
    case "hex": {
      const s = Math.min(hh, (hw / 2) | 0);
      glyph = `<polygon class="fc-shape" points="${cx - hw},${cy} ${cx - hw + s},${cy - hh} ${cx + hw - s},${cy - hh} ${cx + hw},${cy} ${cx + hw - s},${cy + hh} ${cx - hw + s},${cy + hh}"/>`;
      break;
    }
    case "cylinder": {
      const ry = Math.max(4, Math.round(hh * 0.22));
      const top = cy - hh + ry, bot = cy + hh - ry;
      glyph =
        `<path class="fc-shape" d="M${cx - hw},${top} V${bot} A${hw},${ry} 0 0 0 ${cx + hw},${bot} V${top} A${hw},${ry} 0 0 1 ${cx - hw},${top} Z"/>` +
        `<path class="fc-shape-line" d="M${cx - hw},${top} A${hw},${ry} 0 0 0 ${cx + hw},${top}"/>`;
      break;
    }
    case "badge":
      glyph = `<rect class="fc-shape" x="${cx - hw}" y="${cy - hh}" width="${2 * hw}" height="${2 * hh}" rx="${hh}"/>`;
      break;
    default: // "box" and any other icon-less shape — rounded rectangle.
      glyph = `<rect class="fc-shape" x="${cx - hw}" y="${cy - hh}" width="${2 * hw}" height="${2 * hh}" rx="6"/>`;
  }
  const label = c.name ? `<text class="fc-label" x="${cx}" y="${cy}">${escapeXml(c.name)}</text>` : "";
  return glyph + label;
}

/** Horizontally-biased cubic Bézier between two resolved anchor points. */
function edgePath(x1: number, y1: number, sa: Side, x2: number, y2: number, da: Side): string {
  const k = Math.max(40, Math.abs(x2 - x1) * 0.5);
  const off = (s: Side, x: number, y: number): Point => {
    switch (s) {
      case "left":   return [x - k, y];
      case "right":  return [x + k, y];
      case "top":    return [x, y - k];
      case "bottom": return [x, y + k];
      default:       return [x, y];
    }
  };
  const [c1x, c1y] = off(sa, x1, y1);
  const [c2x, c2y] = off(da, x2, y2);
  return `M${r1(x1)},${r1(y1)} C${r1(c1x)},${r1(c1y)} ${r1(c2x)},${r1(c2y)} ${r1(x2)},${r1(y2)}`;
}

/**
 * Render `d` to a complete SVG document string. Async because icon glyphs
 * are resolved through {@link getIcon}.
 */
export async function renderSVG(d: Diagram, opts: RenderOptions = {}): Promise<string> {
  if (d.bpmnBlocks && d.bpmnBlocks.length) {
    throw new Error("Diagram has un-laid-out bpmn { } blocks — run bpmnLayout (or parseDiagram) before renderSVG");
  }

  // BPMN diagrams (bpmn-* glyphs, waypoint flows, pool/lane regions) render via the
  // Rust core — the single source of truth, byte-identical across languages.
  if (d.components.some((c) => c.shape.startsWith("bpmn-"))
    || d.edges.some((e) => e.points != null && e.points.length > 0)
    || d.regions.some((r) => r.style === "pool" || r.style === "lane")) {
    return coreBpmnRender(d, opts);
  }

  const pad = opts.padding ?? 52;
  const background = opts.background === undefined ? "#f8fafc" : opts.background;
  const needsRegionStyle = d.regions.length > 0;
  const needsFlowchartStyle = d.components.some((c) => !c.icon);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const grow = (x: number, y: number): void => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  for (const c of d.components) {
    const [hw, hh] = half(c);
    const lh = c.size ? (c.name ? 30 : 0) : (LABEL_HEIGHT[c.shape] ?? 0);
    grow(c.pos[0] - hw, c.pos[1] - hh);
    grow(c.pos[0] + hw, c.pos[1] + hh + lh);
  }
  for (const r of d.regions) { const [x, y, w, h] = r.bounds; grow(x, y); grow(x + w, y + h); }
  for (const e of d.edges) for (const [x, y] of e.points ?? []) grow(x, y);
  if (!Number.isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0; }

  const x0 = minX - pad;
  const y0 = minY - pad - 22;          // headroom for the title
  const w = maxX + pad - x0;
  const h = maxY + pad - y0;

  const byId = new Map(d.components.map((c) => [c.id, c]));

  const edges: string[] = [];
  for (const e of d.edges) {
    const s = byId.get(e.src);
    const t = byId.get(e.dst);
    if (!s || !t) continue;
    const [sa, da] = resolveAnchors(e, s, t);
    const [x1, y1] = anchor(s, sa);
    const [x2, y2] = anchor(t, da);
    edges.push(`<path d="${edgePath(x1, y1, sa, x2, y2, da)}" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>`);
    if (e.label) {
      edges.push(`<text class="elabel" x="${r1((x1 + x2) / 2)}" y="${r1((y1 + y2) / 2 - 6)}">${escapeXml(e.label)}</text>`);
    }
  }

  const nodes: string[] = [];
  for (const c of d.components) {
    if (!c.icon) { nodes.push(flowchartNode(c)); continue; }
    const glyph = await getIcon(c.icon);
    const [, hh] = half(c);
    const parts = [`<g transform="translate(${c.pos[0]},${c.pos[1]})" filter="url(#soft)">${glyph}</g>`];
    if (c.name) parts.push(`<text class="label" x="${c.pos[0]}" y="${c.pos[1] + hh + 18}">${escapeXml(c.name)}</text>`);
    nodes.push(parts.join(""));
  }

  const regionRects = d.regions.length
    ? `\n  <g class="regions">\n    ${d.regions.map(regionRect).join("\n    ")}\n  </g>` : "";
  const regionLabels = d.regions.length
    ? `\n  <g class="region-labels">\n    ${d.regions.map(regionLabel).join("\n    ")}\n  </g>` : "";

  const bg = background === null
    ? ""
    : `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="14" fill="${background}"/>
  <rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="14" fill="url(#grid)"/>`;
  const title = d.title ? `<text class="title" x="${x0 + pad}" y="${y0 + 30}">${escapeXml(d.title)}</text>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" width="${w}" height="${h}">
  <defs>${DEFS}
  </defs>
  <style>${CSS}${needsRegionStyle ? REGION_STYLE : ""}${needsFlowchartStyle ? FLOWCHART_STYLE : ""}
  </style>
  ${bg}
  ${title}${regionRects}
  <g class="edges">
    ${edges.join("\n    ")}
  </g>
  <g class="nodes">
    ${nodes.join("\n    ")}
  </g>${regionLabels}
</svg>
`;
}

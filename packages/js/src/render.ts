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
import { HEADER_H, ROW_H, PAD, PK_ICON_W, NN_W, nameWidth } from "./from-dbml.js";

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

// ER-table styling (.dbml import) — injected ONLY when a diagram has a
// `table` component, so every other diagram stays byte-identical. Mirrors
// the dbdiagram.io look: steel-blue header bar, white field rows (name left,
// type right in gray monospace), 🔑 on PKs, NN badge on not-null, and gray
// relationship lines with junction dots.
const TABLE_STYLE = `
    .er-box   { fill: #ffffff; stroke: #e2e8f0; stroke-width: 1; }
    .er-title { fill: #ffffff; font-size: 13px; font-weight: 700; dominant-baseline: central; }
    .er-field { fill: #1f2937; font-size: 13px; dominant-baseline: central; }
    .er-field.er-pk { font-weight: 700; }
    .er-type  { fill: #94a3b8; font-size: 12px; text-anchor: end; dominant-baseline: central;
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .er-sep   { stroke: #f1f5f9; stroke-width: 1; }
    .er-key   { fill: none; stroke: #64748b; stroke-width: 1.4; }
    .er-nn    { fill: #94a3b8; font-size: 9px; font-weight: 700; text-anchor: end; dominant-baseline: central; }
    .er-note  { fill: none; stroke: #cbd5e1; stroke-width: 1.2; }
    .er-rel     { fill: none; stroke: #9aa7b8; stroke-width: 1.6; }
    .er-rel-dot { fill: #ffffff; stroke: #9aa7b8; stroke-width: 1.6; }
    .er-foot    { fill: none; stroke: #9aa7b8; stroke-width: 1.6; stroke-linecap: round; }`;

/** Small key outline drawn centred at (x, y) — the PK marker. */
function keyGlyph(x: number, y: number): string {
  return `<g class="er-key" transform="translate(${r1(x)},${r1(y)})">`
    + `<circle cx="3.2" cy="0" r="3.2"/>`
    + `<path d="M6,0 H12 M9.5,0 V2.6 M12,0 V2.6"/></g>`;
}

/** Small note (page) outline drawn centred at (x, y) — the column-note marker. */
function noteGlyph(x: number, y: number): string {
  return `<rect class="er-note" x="${r1(x)}" y="${r1(y - 5)}" width="9" height="10" rx="1.5"/>`;
}

/** ER table box: header bar + field rows (.dbml import). Sized from c.size. */
function tableNode(c: Component): string {
  const rows = c.rows ?? [];
  const w = c.size ? c.size[0] : 180;
  const h = c.size ? c.size[1] : HEADER_H + rows.length * ROW_H;
  const x0 = Math.round(c.pos[0] - w / 2);
  const y0 = Math.round(c.pos[1] - h / 2);
  const head = c.headerColor || "#33526e";
  // data-* lets the editor make the box draggable, re-route its edges live, and
  // map field rows → column names (for creating relationships by dragging).
  const cols = escapeXml(JSON.stringify(rows.map((r) => r.name)));
  const out: string[] = [`<g class="er-table" data-tid="${escapeXml(c.id)}" data-x="${x0}" data-y="${y0}" data-w="${w}" data-h="${h}" data-cols="${cols}" filter="url(#soft)">`];
  out.push(`<rect class="er-box" x="${x0}" y="${y0}" width="${w}" height="${h}" rx="7"/>`);
  // header bar with rounded top corners only
  out.push(`<path d="M${x0},${y0 + HEADER_H} V${y0 + 7} a7,7 0 0 1 7,-7 H${x0 + w - 7} a7,7 0 0 1 7,7 V${y0 + HEADER_H} Z" fill="${head}"/>`);
  out.push(`<text class="er-title" x="${x0 + PAD}" y="${y0 + HEADER_H / 2 + 1}">${escapeXml(c.name)}</text>`);
  rows.forEach((row, i) => {
    const ry = y0 + HEADER_H + i * ROW_H;
    const midY = ry + ROW_H / 2;
    if (i > 0) out.push(`<line class="er-sep" x1="${x0}" y1="${ry}" x2="${x0 + w}" y2="${ry}"/>`);
    let nameX = x0 + PAD;
    if (row.pk) { out.push(keyGlyph(nameX, midY)); nameX += PK_ICON_W; }
    out.push(`<text class="er-field${row.pk ? " er-pk" : ""}" x="${nameX}" y="${midY}">${escapeXml(row.name)}</text>`);
    if (row.note) out.push(noteGlyph(nameX + nameWidth(row.name, row.pk) + 5, midY));
    let typeRight = x0 + w - PAD;
    if (row.notNull) { out.push(`<text class="er-nn" x="${typeRight}" y="${midY}">NN</text>`); typeRight -= NN_W; }
    if (row.type) out.push(`<text class="er-type" x="${typeRight}" y="${midY}">${escapeXml(row.type)}</text>`);
  });
  out.push(`</g>`);
  return out.join("");
}

/** An ER table box as a drag geometry: top-left (x,y), size (w,h), and the
 *  vertical offset `oy` of the connected field row from the box top. */
export interface ErBox { x: number; y: number; w: number; h: number; oy: number }

/**
 * Geometry of a foreign-key relationship line between two table rows. Picks the
 * facing sides from the tables' current centres and returns the connector path
 * plus its two endpoints. Shared by the static renderer (`fkEdge`) and the
 * editor's live drag re-route, so a dragged table's edges match exactly.
 */
/** Radius of the "one"-side connection circle, and its centre offset from the
 *  table edge. The connector runs all the way to the edge, so a short stub of
 *  line stays visible between the edge and the circle (dbdiagram look): the
 *  circle floats slightly off the table but the path still covers the gap. */
export const ER_DOT_R = 3.5;
const ER_DOT_GAP = 2.5;                                // edge → circle inner-edge gap
export const ER_DOT_OFFSET = ER_DOT_R + ER_DOT_GAP;    // edge → circle centre
const ER_FOOT_LEN = 9;       // crow's-foot stem length (apex distance from edge)
const ER_FOOT_SPREAD = 5;

/** Crow's-foot path ("many" side): two prongs fan from `apex` (a point ON the
 *  connector curve, ~`ER_FOOT_LEN` from the table) back to the edge (ex,ey)
 *  ±spread. Apex comes from `erEdgeGeometry` so it sits exactly on the line. */
export function erMarkerD(apexX: number, apexY: number, ex: number, ey: number): string {
  return `M${r1(apexX)},${r1(apexY)} L${r1(ex)},${r1(ey - ER_FOOT_SPREAD)}`
    + ` M${r1(apexX)},${r1(apexY)} L${r1(ex)},${r1(ey + ER_FOOT_SPREAD)}`;
}

/** Cubic Bézier point at parameter t. */
function bez(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

// Which end gets the "many" (crow's-foot) vs "one" (circle) marker, per operator.
const ER_ENDS: Record<string, [string, string]> = {
  ">": ["many", "one"], "<": ["one", "many"], "-": ["one", "one"], "<>": ["many", "many"],
};

export function erEdgeGeometry(s: ErBox, t: ErBox): {
  d: string; x1: number; y1: number; x2: number; y2: number; srcApex: Point; dstApex: Point;
} {
  const goRight = (t.x + t.w / 2) >= (s.x + s.w / 2);
  const x1 = goRight ? s.x + s.w : s.x;          // connector runs to the table edge
  const x2 = goRight ? t.x : t.x + t.w;
  const y1 = s.y + s.oy;
  const y2 = t.y + t.oy;
  const sa: Side = goRight ? "right" : "left";
  const da: Side = goRight ? "left" : "right";
  // Control points match edgePath's so the crow's-foot apex lands on the curve.
  const k = Math.max(40, Math.abs(x2 - x1) * 0.5);
  const P0: Point = [x1, y1], P3: Point = [x2, y2];
  const c1: Point = [x1 + (sa === "right" ? k : -k), y1];
  const c2: Point = [x2 + (da === "right" ? k : -k), y2];
  const dt = ER_FOOT_LEN / (3 * k);              // ≈ arc-distance ER_FOOT_LEN from an end
  return {
    d: edgePath(x1, y1, sa, x2, y2, da), x1, y1, x2, y2,
    srcApex: bez(P0, c1, c2, P3, dt),
    dstApex: bez(P0, c1, c2, P3, 1 - dt),
  };
}

const erBox = (c: Component, rowIdx: number): ErBox => {
  const w = c.size ? c.size[0] : 180;
  const h = c.size ? c.size[1] : HEADER_H;
  return {
    x: Math.round(c.pos[0] - w / 2), y: Math.round(c.pos[1] - h / 2),
    w, h, oy: HEADER_H + rowIdx * ROW_H + ROW_H / 2,
  };
};

/** Foreign-key relationship line between two table rows (row-to-row). The
 *  wrapping group carries data-* so the editor can re-route it live on drag. */
/** A cardinality marker at an endpoint: hollow circle ("one") or crow's-foot ("many"). */
function erMarker(kind: string, ex: number, ey: number, apex: Point, outDir: number, cls: string): string {
  return kind === "one"
    ? `<circle class="er-rel-dot ${cls}" cx="${r1(ex + outDir * ER_DOT_OFFSET)}" cy="${r1(ey)}" r="${ER_DOT_R}"/>`
    : `<path class="er-foot ${cls}" d="${erMarkerD(apex[0], apex[1], ex, ey)}"/>`;
}

function fkEdge(e: { srcRow?: number; dstRow?: number; srcCol?: string; dstCol?: string; relOp?: string }, s: Component, t: Component): string {
  const sb = erBox(s, e.srcRow ?? 0);
  const tb = erBox(t, e.dstRow ?? 0);
  const g = erEdgeGeometry(sb, tb);
  const op = e.relOp ?? ">";
  const [srcKind, dstKind] = ER_ENDS[op] ?? ER_ENDS[">"];
  const goRight = (tb.x + tb.w / 2) >= (sb.x + sb.w / 2);
  return `<g class="er-rel-g" data-src="${escapeXml(s.id)}" data-dst="${escapeXml(t.id)}"`
    + ` data-src-col="${escapeXml(e.srcCol ?? "")}" data-dst-col="${escapeXml(e.dstCol ?? "")}" data-op="${escapeXml(op)}"`
    + ` data-soy="${sb.oy}" data-doy="${tb.oy}">`
    + `<path class="er-rel-hit" d="${g.d}" fill="none" stroke="transparent" stroke-width="12"/>`
    + `<path class="er-rel" d="${g.d}"/>`
    + erMarker(srcKind, g.x1, g.y1, g.srcApex, goRight ? 1 : -1, "er-ep-src")
    + erMarker(dstKind, g.x2, g.y2, g.dstApex, goRight ? -1 : 1, "er-ep-dst")
    + `</g>`;
}

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
  const needsTableStyle = d.components.some((c) => c.shape === "table");
  const needsFlowchartStyle = d.components.some((c) => !c.icon && c.shape !== "table");

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const grow = (x: number, y: number): void => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  for (const c of d.components) {
    const [hw, hh] = half(c);
    // Table boxes carry their name in the header bar, not a label band below.
    const lh = c.shape === "table" ? 0 : (c.size ? (c.name ? 30 : 0) : (LABEL_HEIGHT[c.shape] ?? 0));
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
    if (e.style === "fk") { edges.push(fkEdge(e, s, t)); continue; }
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
    if (c.shape === "table") { nodes.push(tableNode(c)); continue; }
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

  // ER (DBML) diagrams render on a plain canvas (like dbdiagram) — no tinted
  // background box / dot grid; the host (editor preview, white) shows through.
  const bg = (background === null || needsTableStyle)
    ? ""
    : `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="14" fill="${background}"/>
  <rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="14" fill="url(#grid)"/>`;
  const title = d.title ? `<text class="title" x="${x0 + pad}" y="${y0 + 30}">${escapeXml(d.title)}</text>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" width="${w}" height="${h}">
  <defs>${DEFS}
  </defs>
  <style>${CSS}${needsRegionStyle ? REGION_STYLE : ""}${needsFlowchartStyle ? FLOWCHART_STYLE : ""}${needsTableStyle ? TABLE_STYLE : ""}
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

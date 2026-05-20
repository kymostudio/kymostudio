/**
 * BPMN 2.0 glyph renderer — {@link renderSVG} delegates here for components
 * whose `shape` starts with `bpmn-`, and for pool/lane regions + flows.
 * Monochrome, matching the bpmn.io default look. Equivalent to the Python
 * `bpmn_shapes.py`. `Component.pos` is the glyph centre; `Component.size`
 * is its (width, height) box (from the file's Diagram-Interchange bounds).
 */
import { componentHalf, type Component, type Edge, type Point, type Region } from "./model.js";

const INK = "#4b5563";   // single dark ink for every glyph outline

const esc = (s: string): string =>
  s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

/** Compact number (drops trailing zeros): 1.50 → "1.5", 2.00 → "2". */
const f = (v: number): string => (Math.round(v * 100) / 100).toString();
const cos = (deg: number): number => Math.cos((deg * Math.PI) / 180);
const sin = (deg: number): number => Math.sin((deg * Math.PI) / 180);

// ── DEFS (flow markers) ─────────────────────────────────────────────────
export const BPMN_DEFS = `
    <marker id="bpmn-seq-end" viewBox="0 0 12 12" refX="10.5" refY="6" markerWidth="12" markerHeight="12" orient="auto" markerUnits="userSpaceOnUse">
      <path d="M1,1.5 L11,6 L1,10.5 Z" fill="#374151"/>
    </marker>
    <marker id="bpmn-msg-end" viewBox="0 0 14 14" refX="12" refY="7" markerWidth="13" markerHeight="13" orient="auto" markerUnits="userSpaceOnUse">
      <path d="M1.5,2 L12,7 L1.5,12 Z" fill="#ffffff" stroke="#374151" stroke-width="1.2"/>
    </marker>
    <marker id="bpmn-msg-start" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="11" markerHeight="11" orient="auto" markerUnits="userSpaceOnUse">
      <circle cx="6" cy="6" r="3.6" fill="#ffffff" stroke="#374151" stroke-width="1.2"/>
    </marker>`;

// ── CSS ───────────────────────────────────────────────────────────────────
export const BPMN_STYLE = `
    .bpmn-event       { fill: #ffffff; stroke: #4b5563; }
    .bpmn-event--start{ stroke-width: 1.6; }
    .bpmn-event--end  { stroke-width: 3.4; }
    .bpmn-event--ring { stroke-width: 1.5; }
    .bpmn-task        { fill: #ffffff; stroke: #4b5563; stroke-width: 1.6; }
    .bpmn-gateway     { fill: #ffffff; stroke: #4b5563; stroke-width: 1.6; }
    .bpmn-data        { fill: #ffffff; stroke: #6b7280; stroke-width: 1.4; }
    .bpmn-marker      { fill: none; stroke: #374151; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .bpmn-marker--fill{ fill: #374151; stroke: none; }
    .bpmn-label       { font-size: 12.5px; fill: #1f2937; text-anchor: middle; }
    .bpmn-label--out  { font-size: 11.5px; fill: #374151; text-anchor: middle; paint-order: stroke; stroke: #f8fafc; stroke-width: 3; stroke-linejoin: round; }
    .bpmn-anno-text   { font-size: 12px; fill: #374151; }
    .bpmn-flow        { fill: none; stroke: #374151; stroke-width: 1.6; stroke-linejoin: round; stroke-linecap: round; }
    .bpmn-flow--message { stroke-dasharray: 7 5; }
    .bpmn-flow--assoc { stroke: #6b7280; stroke-width: 1.3; stroke-dasharray: 1.5 4; }
    .bpmn-flow-label  { font-size: 11px; fill: #334155; text-anchor: middle; paint-order: stroke; stroke: #f8fafc; stroke-width: 3.5; stroke-linejoin: round; }
    .region-rect        { fill: rgba(15,23,42,0.02); stroke: #cbd5e1; stroke-width: 1.4; }
    .region-rect--inner { fill: rgba(124,58,237,0.03); stroke: #7c3aed; stroke-width: 1.3; stroke-dasharray: 4 4; }
    .region-rect--pool  { fill: rgba(248,250,252,0.5); stroke: #94a3b8; stroke-width: 1.4; }
    .region-rect--lane  { fill: none; stroke: #cbd5e1; stroke-width: 1.1; }
    .bpmn-pool-band   { stroke: #94a3b8; stroke-width: 1.4; }
    .bpmn-lane-band   { stroke: #cbd5e1; stroke-width: 1.1; }
    .bpmn-pool-label  { font-size: 12.5px; font-weight: 600; fill: #475569; }
    .region-label--inner { font-size: 12px; font-weight: 600; fill: #6d28d9; }`;

// ── text wrapping ─────────────────────────────────────────────────────────
function wrap(text: string, widthPx: number, fontPx: number, maxLines: number): string[] {
  if (!text) return [];
  const maxChars = Math.max(3, Math.floor((widthPx - 8) / (fontPx * 0.55)));
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  let truncated = false;
  for (let wi = 0; wi < words.length; wi++) {
    const cand = cur ? `${cur} ${words[wi]}` : words[wi];
    if (cand.length <= maxChars || !cur) cur = cand;
    else { lines.push(cur); cur = words[wi]; }
    if (lines.length === maxLines) { truncated = wi < words.length - 1 || cur.length > maxChars; break; }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (truncated && lines.length) {
    let last = lines[lines.length - 1];
    if (last.length > maxChars - 1) last = last.slice(0, maxChars - 1).trimEnd();
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

function centeredLines(lines: string[], cx: number, cy: number, fontPx: number, cls = "bpmn-label"): string {
  if (!lines.length) return "";
  const lh = fontPx + 2.5;
  const top = cy - ((lines.length - 1) * lh) / 2 + fontPx * 0.35;
  return lines.map((ln, i) => `<text class="${cls}" x="${f(cx)}" y="${f(top + i * lh)}">${esc(ln)}</text>`).join("");
}

// ── event-definition marker glyphs (centred on 0,0) ─────────────────────────
function eventMarker(kind: string, s: number, color: string): string {
  const cls = `class="bpmn-marker" stroke="${color}"`;
  const fillcls = `class="bpmn-marker--fill" fill="${color}"`;
  if (kind === "" || kind === "none") return "";
  if (kind === "message") {
    const w = s * 1.5, h = s * 1.05;
    return `<g ${cls}><rect x="${f(-w)}" y="${f(-h)}" width="${f(2 * w)}" height="${f(2 * h)}" rx="1"/>`
      + `<path d="M${f(-w)},${f(-h)} L0,${f(h * 0.15)} L${f(w)},${f(-h)}"/></g>`;
  }
  if (kind === "timer") {
    const r = s * 1.25;
    let ticks = "";
    for (let a = 0; a < 360; a += 30) {
      ticks += `<line x1="${f(r * 0.78 * cos(a))}" y1="${f(r * 0.78 * sin(a))}" x2="${f(r * 0.98 * cos(a))}" y2="${f(r * 0.98 * sin(a))}"/>`;
    }
    return `<g ${cls}><circle cx="0" cy="0" r="${f(r)}"/>${ticks}<path d="M0,${f(-r * 0.55)} L0,0 L${f(r * 0.45)},${f(r * 0.2)}"/></g>`;
  }
  if (kind === "error") {
    return `<g ${cls}><path d="M${f(-s)},${f(s)} L${f(-s * 0.25)},${f(-s * 0.4)} L${f(s * 0.3)},${f(s * 0.35)} L${f(s)},${f(-s)}"/></g>`;
  }
  if (kind === "escalation") {
    return `<g ${fillcls}><path d="M0,${f(-s)} L${f(s * 0.7)},${f(s * 0.6)} L0,${f(s * 0.05)} L${f(-s * 0.7)},${f(s * 0.6)} Z"/></g>`;
  }
  if (kind === "signal") {
    return `<g ${cls}><path d="M0,${f(-s)} L${f(s)},${f(s * 0.7)} L${f(-s)},${f(s * 0.7)} Z"/></g>`;
  }
  if (kind === "terminate") return `<g ${fillcls}><circle cx="0" cy="0" r="${f(s * 1.15)}"/></g>`;
  if (kind === "conditional") {
    const w = s * 1.1, h = s * 1.1;
    let rows = "";
    for (const y of [-h * 0.55, -h * 0.18, h * 0.18, h * 0.55]) rows += `<line x1="${f(-w * 0.7)}" y1="${f(y)}" x2="${f(w * 0.7)}" y2="${f(y)}"/>`;
    return `<g ${cls}><rect x="${f(-w)}" y="${f(-h)}" width="${f(2 * w)}" height="${f(2 * h)}" rx="1"/>${rows}</g>`;
  }
  if (kind === "link") {
    return `<g ${cls}><path d="M${f(-s)},${f(-s * 0.45)} L${f(s * 0.3)},${f(-s * 0.45)} L${f(s * 0.3)},${f(-s)} L${f(s)},0 L${f(s * 0.3)},${f(s)} L${f(s * 0.3)},${f(s * 0.45)} L${f(-s)},${f(s * 0.45)} Z"/></g>`;
  }
  if (kind === "compensation") {
    return `<g ${fillcls}><path d="M0,${f(-s)} L${f(-s)},0 L0,${f(s)} Z"/><path d="M${f(s)},${f(-s)} L0,0 L${f(s)},${f(s)} Z"/></g>`;
  }
  return "";
}

// ── task-type marker (top-left ~16px) ───────────────────────────────────────
function taskMarker(kind: string, x: number, y: number): string {
  if (kind === "" || kind === "none" || kind === "task") return "";
  const g = `<g class="bpmn-marker" transform="translate(${f(x + 4)}, ${f(y + 4)})">`;
  const e = "</g>";
  if (kind === "user") return g + '<circle cx="7" cy="4.5" r="3"/><path d="M1.5,14 C1.5,9.5 12.5,9.5 12.5,14"/>' + e;
  if (kind === "service") return g
    + '<path d="M7,1 L9,2 L11,1.5 L12,3.5 L13.5,5 L13,7 L13.5,9 L12,10.5 L11,12.5 L9,12 L7,13 L5,12 L3,12.5 L2,10.5 L0.5,9 L1,7 L0.5,5 L2,3.5 L3,1.5 L5,2 Z"/><circle cx="7" cy="7" r="2.6"/>' + e;
  if (kind === "script") return g
    + '<path d="M3,1 C1,1 1,4 3,4 L11,4 C13,4 13,1 11,1 Z"/><line x1="3.5" y1="7" x2="10" y2="7"/><line x1="3.5" y1="10" x2="10" y2="10"/><line x1="3.5" y1="13" x2="8" y2="13"/>' + e;
  if (kind === "send") return g.replace('class="bpmn-marker"', 'class="bpmn-marker--fill"')
    + '<path d="M0,1 L14,1 L14,11 L0,11 Z"/><path d="M0,1 L7,7 L14,1" fill="none" stroke="#ffffff" stroke-width="1"/>' + e;
  if (kind === "receive") return g + '<rect x="0.5" y="1.5" width="13" height="10" rx="0.5"/><path d="M0.5,1.5 L7,7 L13.5,1.5"/>' + e;
  if (kind === "manual") return g
    + '<path d="M3,7 L3,4.2 M5.5,7 L5.5,3 M8,7 L8,3 M10.5,7 L10.5,4.2"/><path d="M3,7 L3,10 C3,13.5 11,13.5 11,10 L11,6"/><path d="M3,8 L1.3,9.6"/>' + e;
  if (kind === "rule" || kind === "businessrule") return g
    + '<rect x="0.5" y="1.5" width="13" height="11" rx="0.5"/><line x1="0.5" y1="4.5" x2="13.5" y2="4.5"/><line x1="4" y1="1.5" x2="4" y2="12.5"/>' + e;
  return "";
}

// ── gateway-type marker (centred on cx,cy) ──────────────────────────────────
function gatewayMarker(kind: string, cx: number, cy: number, s: number): string {
  const cls = 'class="bpmn-marker" stroke-width="2.4"';
  if (kind === "" || kind === "none") return "";        // plain diamond
  if (kind === "exclusive") {
    return `<g ${cls}><line x1="${f(cx - s)}" y1="${f(cy - s)}" x2="${f(cx + s)}" y2="${f(cy + s)}"/>`
      + `<line x1="${f(cx + s)}" y1="${f(cy - s)}" x2="${f(cx - s)}" y2="${f(cy + s)}"/></g>`;
  }
  if (kind === "parallel") {
    return `<g ${cls}><line x1="${f(cx)}" y1="${f(cy - s)}" x2="${f(cx)}" y2="${f(cy + s)}"/>`
      + `<line x1="${f(cx - s)}" y1="${f(cy)}" x2="${f(cx + s)}" y2="${f(cy)}"/></g>`;
  }
  if (kind === "inclusive") return `<circle class="bpmn-marker" stroke-width="2.4" cx="${f(cx)}" cy="${f(cy)}" r="${f(s * 0.85)}"/>`;
  if (kind === "complex") {
    const d = s * 0.72;
    return `<g ${cls}><line x1="${f(cx)}" y1="${f(cy - s)}" x2="${f(cx)}" y2="${f(cy + s)}"/>`
      + `<line x1="${f(cx - s)}" y1="${f(cy)}" x2="${f(cx + s)}" y2="${f(cy)}"/>`
      + `<line x1="${f(cx - d)}" y1="${f(cy - d)}" x2="${f(cx + d)}" y2="${f(cy + d)}"/>`
      + `<line x1="${f(cx + d)}" y1="${f(cy - d)}" x2="${f(cx - d)}" y2="${f(cy + d)}"/></g>`;
  }
  if (kind === "event" || kind === "eventbased") {
    let pent = "";
    for (let i = 0; i < 5; i++) pent += `${f(cx + s * 0.6 * sin(72 * i))},${f(cy - s * 0.6 * cos(72 * i))} `;
    return `<g class="bpmn-marker"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s)}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s * 0.78)}"/><polygon points="${pent.trim()}"/></g>`;
  }
  return "";
}

// ── component dispatch ──────────────────────────────────────────────────────
export function renderBpmnComponent(c: Component): string {
  const [cx, cy] = c.pos;
  const [hw, hh] = componentHalf(c);
  const marker = c.icon || "";
  switch (c.shape) {
    case "bpmn-start": case "bpmn-end": case "bpmn-intermediate": case "bpmn-boundary":
      return renderEvent(c, cx, cy, Math.min(hw, hh), c.shape, marker);
    case "bpmn-task": return renderTask(c, cx, cy, hw, hh, marker, false);
    case "bpmn-subprocess": return renderTask(c, cx, cy, hw, hh, marker, true);
    case "bpmn-gateway": return renderGateway(c, cx, cy, hw, hh, marker);
    case "bpmn-data-object": return renderDataObject(c, cx, cy, hw, hh);
    case "bpmn-data-store": return renderDataStore(c, cx, cy, hw, hh);
    case "bpmn-annotation": return renderAnnotation(c, cx, cy, hw, hh);
    default: return "";
  }
}

function renderEvent(c: Component, cx: number, cy: number, r: number, shape: string, marker: string): string {
  let rings: string;
  if (shape === "bpmn-start") rings = `<circle class="bpmn-event bpmn-event--start" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`;
  else if (shape === "bpmn-end") rings = `<circle class="bpmn-event bpmn-event--end" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`;
  else rings = `<circle class="bpmn-event bpmn-event--ring" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`
    + `<circle class="bpmn-event bpmn-event--ring" cx="${f(cx)}" cy="${f(cy)}" r="${f(r - 3.2)}"/>`;
  const glyph = eventMarker(marker, r * 0.42, INK);
  const glyphG = glyph ? `<g transform="translate(${f(cx)}, ${f(cy)})">${glyph}</g>` : "";
  let label = "";
  if (c.name) label = centeredLines(wrap(c.name, Math.max(70, 2 * r + 40), 11.5, 2), cx, cy + r + 13, 11.5, "bpmn-label--out");
  return `${rings}${glyphG}${label}`;
}

function renderTask(c: Component, cx: number, cy: number, hw: number, hh: number, marker: string, collapsed: boolean): string {
  const x = cx - hw, y = cy - hh, w = 2 * hw, h = 2 * hh;
  const box = `<rect class="bpmn-task" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="9"/>`;
  const mk = taskMarker(marker, x, y);
  const label = centeredLines(wrap(c.name, w - 12, 12.5, 4), cx, cy + (mk ? 4 : 0), 12.5, "bpmn-label");
  let plus = "";
  if (collapsed) {
    const bx = cx - 6, by = y + h - 14;
    plus = `<g class="bpmn-marker"><rect x="${f(bx)}" y="${f(by)}" width="12" height="12" rx="1"/>`
      + `<line x1="${f(bx + 6)}" y1="${f(by + 2.5)}" x2="${f(bx + 6)}" y2="${f(by + 9.5)}"/>`
      + `<line x1="${f(bx + 2.5)}" y1="${f(by + 6)}" x2="${f(bx + 9.5)}" y2="${f(by + 6)}"/></g>`;
  }
  return `${box}${mk}${label}${plus}`;
}

function renderGateway(c: Component, cx: number, cy: number, hw: number, hh: number, marker: string): string {
  const pts = `${f(cx)},${f(cy - hh)} ${f(cx + hw)},${f(cy)} ${f(cx)},${f(cy + hh)} ${f(cx - hw)},${f(cy)}`;
  const diamond = `<polygon class="bpmn-gateway" points="${pts}"/>`;
  const mk = gatewayMarker(marker, cx, cy, Math.min(hw, hh) * 0.42);
  let label = "";
  if (c.name) label = centeredLines(wrap(c.name, Math.max(90, 2 * hw + 60), 11.5, 2), cx, cy + hh + 13, 11.5, "bpmn-label--out");
  return `${diamond}${mk}${label}`;
}

function renderDataObject(c: Component, cx: number, cy: number, hw: number, hh: number): string {
  const x = cx - hw, y = cy - hh, w = 2 * hw, h = 2 * hh;
  const fold = Math.min(w, h) * 0.32;
  const page = `<path class="bpmn-data" d="M${f(x)},${f(y)} L${f(x + w - fold)},${f(y)} L${f(x + w)},${f(y + fold)} L${f(x + w)},${f(y + h)} L${f(x)},${f(y + h)} Z"/>`
    + `<path class="bpmn-data" d="M${f(x + w - fold)},${f(y)} L${f(x + w - fold)},${f(y + fold)} L${f(x + w)},${f(y + fold)}"/>`;
  let label = "";
  if (c.name) label = centeredLines(wrap(c.name, Math.max(90, w + 50), 11.5, 2), cx, cy + hh + 13, 11.5, "bpmn-label--out");
  return `${page}${label}`;
}

function renderDataStore(c: Component, cx: number, cy: number, hw: number, hh: number): string {
  const x = cx - hw, w = 2 * hw;
  const top = cy - hh, bot = cy + hh;
  const ry = Math.min(hh * 0.45, hw * 0.4);
  const body = `<path class="bpmn-data" d="M${f(x)},${f(top + ry)} A${f(hw)},${f(ry)} 0 0 0 ${f(x + w)},${f(top + ry)} L${f(x + w)},${f(bot - ry)} A${f(hw)},${f(ry)} 0 0 1 ${f(x)},${f(bot - ry)} Z"/>`
    + `<path class="bpmn-data" fill="none" d="M${f(x)},${f(top + ry)} A${f(hw)},${f(ry)} 0 0 0 ${f(x + w)},${f(top + ry)}"/>`;
  let label = "";
  if (c.name) label = centeredLines(wrap(c.name, Math.max(90, w + 50), 11.5, 2), cx, cy + hh + 13, 11.5, "bpmn-label--out");
  return `${body}${label}`;
}

function renderAnnotation(c: Component, cx: number, cy: number, hw: number, hh: number): string {
  const x = cx - hw, y = cy - hh, h = 2 * hh;
  const tick = Math.min(8, hw * 0.5);
  const bracket = `<path class="bpmn-marker" stroke="#6b7280" d="M${f(x + tick)},${f(y)} L${f(x)},${f(y)} L${f(x)},${f(y + h)} L${f(x + tick)},${f(y + h)}"/>`;
  const lines = wrap(c.name, 2 * hw - tick - 6, 12, 4);
  const lh = 14.5;
  const text = lines.map((ln, i) => `<text class="bpmn-anno-text" x="${f(x + tick + 5)}" y="${f(y + 12 + i * lh)}">${esc(ln)}</text>`).join("");
  return bracket + text;
}

// ── pool / lane regions ─────────────────────────────────────────────────────
export function bpmnRegionRect(r: Region): string {
  const [x, y, w, h] = r.bounds;
  if (r.style === "pool" || r.style === "lane") {
    const band = 30;
    const rectCls = r.style === "pool" ? "region-rect region-rect--pool" : "region-rect region-rect--lane";
    const bandCls = r.style === "pool" ? "bpmn-pool-band" : "bpmn-lane-band";
    const sep = r.label ? `<line class="${bandCls}" x1="${x + band}" y1="${y}" x2="${x + band}" y2="${y + h}"/>` : "";
    return `<rect class="${rectCls}" x="${x}" y="${y}" width="${w}" height="${h}"/>${sep}`;
  }
  const cls = r.style === "inner" ? "region-rect region-rect--inner" : "region-rect";
  return `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>`;
}

export function bpmnRegionLabel(r: Region): string {
  if (!r.label) return "";
  const [x, y, w, h] = r.bounds;
  if (r.style === "pool" || r.style === "lane") {
    const tx = x + 15, ty = y + (h / 2) | 0;
    return `<text class="bpmn-pool-label" x="${tx}" y="${ty}" text-anchor="middle" transform="rotate(-90 ${tx} ${ty})">${esc(r.label)}</text>`;
  }
  return `<text class="region-label--inner" x="${x + 12}" y="${y + 16}">${esc(r.label)}</text>`;
}

// ── flows (explicit waypoints) ──────────────────────────────────────────────
const unit = (a: Point, b: Point): Point => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const n = Math.hypot(dx, dy) || 1;
  return [dx / n, dy / n];
};

export function renderBpmnEdge(e: Edge): string {
  const pts = e.points ?? [];
  if (pts.length < 2) return "";
  const path = "M " + pts.map(([x, y]) => `${x},${y}`).join(" L ");
  const flow = e.bpmnFlow || "sequence";
  let cls = "bpmn-flow", markers = ' marker-end="url(#bpmn-seq-end)"';
  if (flow === "message") { cls = "bpmn-flow bpmn-flow--message"; markers = ' marker-start="url(#bpmn-msg-start)" marker-end="url(#bpmn-msg-end)"'; }
  else if (flow === "association") { cls = "bpmn-flow bpmn-flow--assoc"; markers = ""; }

  let deco = "";
  const [p0, p1] = [pts[0], pts[1]];
  const [ux, uy] = unit(p0, p1);
  const px = -uy, py = ux;
  if (flow === "default") {
    const mx = p0[0] + ux * 14, my = p0[1] + uy * 14;
    deco = `<line class="bpmn-flow" x1="${f(mx - ux * 5 - px * 5)}" y1="${f(my - uy * 5 - py * 5)}" x2="${f(mx + ux * 5 + px * 5)}" y2="${f(my + uy * 5 + py * 5)}"/>`;
  } else if (flow === "conditional") {
    const cxp = p0[0] + ux * 11, cyp = p0[1] + uy * 11;
    const dpts = `${f(cxp + ux * 8)},${f(cyp + uy * 8)} ${f(cxp + px * 5)},${f(cyp + py * 5)} ${f(cxp - ux * 8)},${f(cyp - uy * 8)} ${f(cxp - px * 5)},${f(cyp - py * 5)}`;
    deco = `<polygon points="${dpts}" fill="#ffffff" stroke="#374151" stroke-width="1.4"/>`;
  }
  let label = "";
  if (e.label && e.labelPos) label = `<text class="bpmn-flow-label" x="${e.labelPos[0]}" y="${e.labelPos[1]}">${esc(e.label)}</text>`;
  return `<path class="${cls}" d="${path}"${markers}/>${deco}${label}`;
}

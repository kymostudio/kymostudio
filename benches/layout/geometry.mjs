// geometry.mjs — pure SVG geometry extractors for the layout-quality bench.
//
// Mirrors the parsers in ../mermaid-format/layout-accuracy.mjs (kymoNodes /
// mermaidNodes / edge flatten / elemBox / svgDims). Kept as a small standalone
// module here so this bench is self-contained — KEEP IN SYNC with that file if
// the SVG shape of either engine changes. No I/O, no deps: just regex over SVG.

const num = (s) => parseFloat(s);

// bbox + center of one shape element (rect/circle/ellipse/polygon/path)
export function elemBox(tag, el) {
  const a = (n) => { const x = el.match(new RegExp(`\\b${n}="([-\\d.]+)`)); return x ? num(x[1]) : NaN; };
  if (tag === "circle") { const r = a("r"); return { cx: a("cx"), cy: a("cy"), w: 2 * r, h: 2 * r }; }
  if (tag === "ellipse") { const rx = a("rx"), ry = a("ry"); return { cx: a("cx"), cy: a("cy"), w: 2 * rx, h: 2 * ry }; }
  if (tag === "rect") { const x = a("x"), y = a("y"), w = a("width"), h = a("height"); return { cx: x + w / 2, cy: y + h / 2, w, h }; }
  const src = tag === "polygon" ? (el.match(/points="([^"]*)"/)?.[1] || "") : (el.match(/\bd="([^"]*)"/)?.[1] || "");
  const ns = [...src.matchAll(/-?\d+\.?\d*/g)].map(Number);
  if (ns.length < 2) return null;
  const xs = ns.filter((_, i) => i % 2 === 0), ys = ns.filter((_, i) => i % 2 === 1);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}
function shapeSize(chunk) {
  for (const tag of ["circle", "ellipse", "rect", "polygon", "path"]) {
    const e = chunk.match(new RegExp(`<${tag}\\b[^>]*>`));
    if (e) { const b = elemBox(tag, e[0]); if (b) return { w: b.w, h: b.h }; }
  }
  return { w: NaN, h: NaN };
}
function shapeBoxFromChunk(chunk) {
  for (const t of ["circle", "ellipse", "rect", "polygon", "path"]) {
    const e = chunk.match(new RegExp(`<${t}\\b[^>]*>`));
    if (e) { const b = elemBox(t, e[0]); if (b) return b; }
  }
  return null;
}

// mermaid.js node boxes (id from flowchart-<ID>-<n>; transform on <g> or wrapping <a>)
export function mermaidNodes(svg) {
  const sec = svg.slice(svg.indexOf('class="nodes"'));
  const starts = [...sec.matchAll(/<g class="[^"]*\bnode\b[^"]*"[^>]*\bid="([^"]*flowchart-[^"]*)"[^>]*>/g)];
  const nodes = [];
  for (let i = 0; i < starts.length; i++) {
    const mm = starts[i];
    const idm = mm[1].match(/flowchart-(.+)-\d+$/);
    const id = idm ? idm[1] : mm[1];
    const chunk = sec.slice(mm.index, i + 1 < starts.length ? starts[i + 1].index : undefined);
    let tr = mm[0].match(/transform="translate\(([-\d.]+),\s*([-\d.]+)\)"/);
    if (!tr) tr = [...sec.slice(Math.max(0, mm.index - 240), mm.index).matchAll(/<a[^>]*transform="translate\(([-\d.]+),\s*([-\d.]+)\)"/g)].pop();
    const sz = shapeSize(chunk);
    if (tr) nodes.push({ id, cx: num(tr[1]), cy: num(tr[2]), ...sz });
    else { const b = shapeBoxFromChunk(chunk); nodes.push({ id, cx: b ? b.cx : NaN, cy: b ? b.cy : NaN, ...sz }); }
  }
  return nodes.filter((n) => Number.isFinite(n.cx) && Number.isFinite(n.w) && n.w > 0 && n.h > 0);
}

// kymo node boxes (<g class="fc-node" data-id="X"> with a .fc-shape inside)
export function kymoNodes(svg) {
  const nodes = [];
  for (const mm of svg.matchAll(/<g class="fc-node" data-id="([^"]*)">/g)) {
    const chunk = svg.slice(mm.index, svg.indexOf("</g>", mm.index));
    const sm = chunk.match(/<(ellipse|rect|polygon|path)\b[^>]*class="fc-shape[^"]*"[^>]*>/);
    const g = sm ? elemBox(sm[1], sm[0]) : null;
    if (g) nodes.push({ id: mm[1], cx: g.cx, cy: g.cy, w: g.w, h: g.h });
  }
  return nodes.filter((n) => Number.isFinite(n.cx) && n.w > 0 && n.h > 0);
}

export function svgDims(svg) {
  const vb = svg.match(/viewBox="([\d.\- ]+)"/);
  if (vb) { const a = vb[1].trim().split(/\s+/).map(Number); if (a.length === 4) return { W: Math.max(1, a[2]), H: Math.max(1, a[3]) }; }
  const w = svg.match(/\bwidth="(\d+)/), h = svg.match(/\bheight="(\d+)/);
  return w && h ? { W: +w[1], H: +h[1] } : { W: 800, H: 600 };
}

// Parse one edge path 'd' into { poly, straight }:
//   poly     — flattened polyline (cubic Béziers sampled 8×) for crossing/overlap tests
//   straight — only the M/L segments (curves are EXEMPT from the orthogonality rule, §7.6)
function parsePath(d) {
  const toks = d.match(/[MLCZ]|-?\d+\.?\d*/gi) || [];
  const poly = [], straight = []; let i = 0, cx = 0, cy = 0;
  const P = (x, y) => { cx = x; cy = y; poly.push([x, y]); };
  while (i < toks.length) {
    const c = toks[i++];
    if (c === "M") { P(+toks[i++], +toks[i++]); }
    else if (c === "L") { const px = cx, py = cy, x = +toks[i++], y = +toks[i++]; P(x, y); straight.push([[px, py], [x, y]]); }
    else if (c === "C") {
      const x1 = +toks[i++], y1 = +toks[i++], x2 = +toks[i++], y2 = +toks[i++], x = +toks[i++], y = +toks[i++];
      const sx = cx, sy = cy;
      for (let t = 1; t <= 8; t++) { const u = t / 8, v = 1 - u; P(v*v*v*sx + 3*v*v*u*x1 + 3*v*u*u*x2 + u*u*u*x, v*v*v*sy + 3*v*v*u*y1 + 3*v*u*u*y2 + u*u*u*y); }
    } else if (/^[-\d.]/.test(c)) { const px = cx, py = cy, x = +c, y = +toks[i++]; P(x, y); straight.push([[px, py], [x, y]]); }
  }
  return { poly, straight };
}

// All edges → { polylines: [[x,y]...], straights: [[[x,y],[x,y]]...] }
export function edges(svg, kymo) {
  const polylines = [], straights = [];
  for (const mm of svg.matchAll(/<path\b[^>]*>/g)) {
    const tag = mm[0], cls = tag.match(/class="([^"]*)"/)?.[1] || "";
    const ok = kymo ? cls.includes("edge-path") : (/\bedge\b/.test(cls) || /\blink\b/.test(cls) || cls.includes("flowchart-link"));
    if (!ok) continue;
    const d = tag.match(/\bd="([^"]*)"/)?.[1];
    if (d && /^\s*M/.test(d)) { const { poly, straight } = parsePath(d); if (poly.length > 1) { polylines.push(poly); straights.push(...straight); } }
  }
  return { polylines, straights };
}

// Extract everything the metric needs from a rendered SVG, engine-tagged.
export function extractGeometry(svg, engine) {
  const kymo = engine === "kymo";
  const nodes = kymo ? kymoNodes(svg) : mermaidNodes(svg);
  const { polylines, straights } = edges(svg, kymo);
  return { nodes, polylines, straights, dims: svgDims(svg) };
}

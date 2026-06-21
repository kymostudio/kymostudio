// metric.mjs — the ABSOLUTE layout-quality score. Pure, no I/O.
//
// Scores rendered geometry (nodes + edge polylines + canvas) on the principles in
// docs/diagrams/best-practices.md (BPD-DGM-001). Engine-agnostic: the same score
// applies to kymo, mermaid.js or d2 output, so they rank on ONE yardstick.
//
// Every term returns 0..1 (1 = best). composite = Σ wᵢ·termᵢ, ×100 for display.
// Weights are front-loaded on the robust "structured-system" signals (crossings,
// overlap, orthogonality); compactness/aspect/grid-snap are softer house-style.
// Tune ONLY this block during calibration.
export const WEIGHTS = {
  crossings: 0.28,          // §6.1 — edge crossings read as tangle
  node_overlap: 0.22,       // §6.7.6 — nodes must not overlap
  edge_node_overlap: 0.16,  // §7.4 — edges must not run under unrelated nodes
  orthogonality: 0.16,      // §7.6 — straight segments are H or V
  compactness: 0.08,        // §6.1 — whitespace without crowding
  aspect_balance: 0.05,     // §6.6.4 — sane width/height
  grid_snap: 0.05,          // §6.6.2 — 8-px grid (house style; matters most for the DSL grid)
};

const EPS = 1.5;        // px tolerance for "axis-aligned" and grid snap
const GRID = 8;

// ── geometry helpers ─────────────────────────────────────────────────────────
const boxOf = (n) => ({ x0: n.cx - n.w / 2, y0: n.cy - n.h / 2, x1: n.cx + n.w / 2, y1: n.cy + n.h / 2 });
const interArea = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
const ptInBox = (p, b) => p[0] >= b.x0 && p[0] <= b.x1 && p[1] >= b.y0 && p[1] <= b.y1;

// proper segment-segment intersection (returns the point, or null)
function segInter(p1, p2, p3, p4) {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
}
const segsOf = (poly) => { const s = []; for (let i = 0; i + 1 < poly.length; i++) s.push([poly[i], poly[i + 1]]); return s; };

// ── terms (each → 0..1, higher is better) ────────────────────────────────────

// crossings: count edge PAIRS that cross at a point NOT inside any node box
// (intersections inside a node are shared-endpoint incidence, not a real crossing).
export function termCrossings(polylines, boxes) {
  let crossings = 0;
  const segs = polylines.map(segsOf);
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      let cross = false;
      for (const a of segs[i]) { for (const b of segs[j]) {
        const p = segInter(a[0], a[1], b[0], b[1]);
        if (p && !boxes.some((bx) => ptInBox(p, bx))) { cross = true; break; }
      } if (cross) break; }
      if (cross) crossings++;
    }
  }
  const E = Math.max(1, polylines.length);
  return { score: 1 / (1 + crossings / E), raw: crossings };
}

// node_overlap: total pairwise box-intersection area / total node area
export function termNodeOverlap(boxes, nodes) {
  if (boxes.length < 2) return { score: 1, raw: 0 }; // nothing can overlap
  let inter = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) inter += interArea(boxes[i], boxes[j]);
  const area = nodes.reduce((s, n) => s + Math.max(1, n.w * n.h), 0) || 1;
  const ratio = inter / area;
  return { score: 1 - Math.min(1, ratio), raw: +ratio.toFixed(4) };
}

// edge_node_overlap: fraction of edge INTERIOR sample points that fall inside a node
// box (endpoints excluded — edges legitimately touch their own endpoints' nodes).
export function termEdgeNodeOverlap(polylines, boxes) {
  let bad = 0, total = 0;
  for (const poly of polylines) {
    const lo = Math.floor(poly.length * 0.18), hi = Math.ceil(poly.length * 0.82);
    for (let k = lo; k < hi; k++) { total++; if (boxes.some((b) => ptInBox(poly[k], b))) bad++; }
  }
  return { score: total ? 1 - bad / total : 1, raw: total ? +(bad / total).toFixed(4) : 0 };
}

// orthogonality: among STRAIGHT (M/L) segments, fraction that are H or V. All-curve
// edges contribute no straight segments and are neutral (curves are exempt, §7.6).
export function termOrthogonality(straights) {
  if (!straights.length) return { score: 1, raw: 1 };
  let ortho = 0;
  for (const [a, b] of straights) { if (Math.abs(a[0] - b[0]) <= EPS || Math.abs(a[1] - b[1]) <= EPS) ortho++; }
  return { score: ortho / straights.length, raw: +(ortho / straights.length).toFixed(3) };
}

// compactness: node ink as a fraction of the canvas — peaks in a comfortable band
// (too low = sparse/spread, too high = crowded). Triangular reward around target.
export function termCompactness(nodes, dims) {
  const ink = nodes.reduce((s, n) => s + n.w * n.h, 0);
  const util = ink / Math.max(1, dims.W * dims.H);
  const TARGET = 0.22, LO = 0.05, HI = 0.55;
  let score;
  if (util <= LO || util >= HI) score = 0.2;
  else if (util <= TARGET) score = 0.2 + 0.8 * (util - LO) / (TARGET - LO);
  else score = 0.2 + 0.8 * (HI - util) / (HI - TARGET);
  return { score: Math.max(0, Math.min(1, score)), raw: +util.toFixed(3) };
}

// aspect_balance: width/height inside a sane band; gentle decay outside.
export function termAspect(dims) {
  const r = dims.W / Math.max(1, dims.H);
  const LO = 0.4, HI = 2.6;
  let score = 1;
  if (r < LO) score = Math.max(0, r / LO);
  else if (r > HI) score = Math.max(0, 1 - (r - HI) / (6 - HI));
  return { score, raw: +r.toFixed(2) };
}

// grid_snap: fraction of node centres on the 8-px grid (house style, §6.6.2).
export function termGridSnap(nodes) {
  if (!nodes.length) return { score: 1, raw: 1 };
  const onGrid = (v) => Math.abs(v - Math.round(v / GRID) * GRID) <= EPS;
  const k = nodes.filter((n) => onGrid(n.cx) && onGrid(n.cy)).length;
  return { score: k / nodes.length, raw: +(k / nodes.length).toFixed(2) };
}

// ── composite ────────────────────────────────────────────────────────────────
export function scoreLayout({ nodes, polylines, straights, dims }) {
  if (!nodes.length) return { composite: null, degenerate: true, terms: {}, counts: { nodes: 0, edges: polylines.length } };
  const boxes = nodes.map(boxOf);
  const t = {
    crossings: termCrossings(polylines, boxes),
    node_overlap: termNodeOverlap(boxes, nodes),
    edge_node_overlap: termEdgeNodeOverlap(polylines, boxes),
    orthogonality: termOrthogonality(straights),
    compactness: termCompactness(nodes, dims),
    aspect_balance: termAspect(dims),
    grid_snap: termGridSnap(nodes),
  };
  let composite = 0;
  for (const k of Object.keys(WEIGHTS)) composite += WEIGHTS[k] * t[k].score;
  return {
    composite: +(composite * 100).toFixed(2),
    terms: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, { score: +v.score.toFixed(3), raw: v.raw }])),
    counts: { nodes: nodes.length, edges: polylines.length },
  };
}

/**
 * Layered (Sugiyama) left-to-right layout for `bpmn { … }` blocks — JS mirror
 * of `packages/python/src/kymo/bpmn_layout.py`, kept at functional parity.
 *
 * Consumes the positionless `BpmnBlock` AST on `Diagram.bpmnBlocks` and turns
 * each block into positioned `Component`s + orthogonally-routed `Edge`s (with
 * `points`), so the renderer draws it unchanged (FR-10). Pipeline: rank →
 * dummy nodes → side assignment → barycenter order → coordinates (longest path
 * pinned to a straight baseline, branches balanced above/below) → pin override
 * (FR-9) → orthogonal routing. Deterministic (NFR-1): stable sorts (decl-index
 * tiebreak), fixed even sweep counts, integer coords emitted only at the end.
 */
import {
  makeComponent, makeEdge,
  type BpmnBlock, type BpmnFlow, type Component, type Diagram, type Edge, type Point,
} from "./model.js";

// Box sizes by resolved shape (event 36, task 100×80, gateway 50).
const SIZE: Record<string, Point> = {
  "bpmn-start": [36, 36], "bpmn-end": [36, 36],
  "bpmn-intermediate": [36, 36], "bpmn-boundary": [36, 36],
  "bpmn-task": [100, 80], "bpmn-subprocess": [100, 80],
  "bpmn-gateway": [50, 50],
  "bpmn-data-object": [36, 50], "bpmn-data-store": [50, 50],
  "bpmn-annotation": [100, 40],
};
const DEFAULT_SIZE: Point = [100, 80];

const H_GAP = 80;
const V_GAP = 50;
const MARGIN = 40;
const BLOCK_GAP = 80;
const ORDER_SWEEPS = 6;
const ALIGN_SWEEPS = 8;

const PRIO_TRUNK = 2_000_000;
const PRIO_DUMMY = 1_000_000;
const PRIO_CHAIN = 10_000;

function median(vals: number[]): number {
  const s = [...vals].sort((a, b) => a - b);
  const n = s.length;
  const m = n >> 1;
  return n % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function range(start: number, stop: number, step = 1): number[] {
  const out: number[] = [];
  if (step > 0) for (let i = start; i < stop; i += step) out.push(i);
  else for (let i = start; i > stop; i += step) out.push(i);
  return out;
}

function pushMap(m: Map<string, string[]>, k: string, v: string): void {
  const a = m.get(k);
  if (a) a.push(v);
  else m.set(k, [v]);
}
function getMap(m: Map<string, string[]>, k: string): string[] {
  return m.get(k) ?? [];
}

export function bpmnLayout(diagram: Diagram): void {
  const blocks = diagram.bpmnBlocks;
  if (!blocks || blocks.length === 0) return;
  let topY = MARGIN;
  let maxRight = MARGIN;
  let bottom = MARGIN;
  for (const block of blocks) {
    const { comps, edges, right, bot } = layoutBlock(block, topY);
    diagram.components.push(...comps);
    diagram.edges.push(...edges);
    maxRight = Math.max(maxRight, right);
    bottom = Math.max(bottom, bot);
    topY = bot + BLOCK_GAP;
  }
  diagram.width = Math.round(maxRight + MARGIN);
  diagram.height = Math.round(bottom + MARGIN);
  diagram.bpmnBlocks = [];
}

function backEdges(ids: string[], flows: BpmnFlow[], decl: Record<string, number>): Set<number> {
  const out = new Map<string, Array<[number, string, number]>>();
  flows.forEach((f, k) => {
    if (f.src in decl && f.dst in decl) {
      const a = out.get(f.src) ?? [];
      a.push([decl[f.dst], f.dst, k]);
      out.set(f.src, a);
    }
  });
  const sortOut = (a: Array<[number, string, number]>) => [...a].sort((x, y) => x[0] - y[0]);
  const color: Record<string, number> = {};   // 0 white, 1 gray, 2 black
  for (const id of ids) color[id] = 0;
  const back = new Set<number>();
  for (const root of [...ids].sort((a, b) => decl[a] - decl[b])) {
    if (color[root] !== 0) continue;
    color[root] = 1;
    const stack: Array<{ u: string; ki: number; outs: Array<[number, string, number]> }> = [
      { u: root, ki: 0, outs: sortOut(out.get(root) ?? []) },
    ];
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (top.ki < top.outs.length) {
        const [, v, fk] = top.outs[top.ki];
        top.ki++;
        if (color[v] === 1) back.add(fk);
        else if (color[v] === 0) {
          color[v] = 1;
          stack.push({ u: v, ki: 0, outs: sortOut(out.get(v) ?? []) });
        }
      } else {
        color[top.u] = 2;
        stack.pop();
      }
    }
  }
  return back;
}

interface BlockResult { comps: Component[]; edges: Edge[]; right: number; bot: number; }

function layoutBlock(block: BpmnBlock, topY: number): BlockResult {
  const nodes = block.nodes;
  const flows = block.flows;
  const ids = nodes.map((n) => n.id);
  const decl: Record<string, number> = {};
  ids.forEach((id, i) => { decl[id] = i; });
  const sw: Record<string, number> = {};
  const sh: Record<string, number> = {};
  for (const n of nodes) {
    const [w, h] = SIZE[n.shape] ?? DEFAULT_SIZE;
    sw[n.id] = w; sh[n.id] = h;
  }

  // ── 1. Rank (longest-path; back-edges reversed) ──────────────────────
  const back = backEdges(ids, flows, decl);
  const succ = new Map<string, string[]>();
  const pred = new Map<string, string[]>();
  const indeg: Record<string, number> = {};
  for (const id of ids) indeg[id] = 0;
  const valid: number[] = [];
  flows.forEach((f, k) => {
    if (!(f.src in decl) || !(f.dst in decl)) return;
    valid.push(k);
    const [s, d] = back.has(k) ? [f.dst, f.src] : [f.src, f.dst];
    pushMap(succ, s, d); pushMap(pred, d, s); indeg[d]++;
  });
  const rank: Record<string, number> = {};
  for (const id of ids) rank[id] = 0;
  const deg: Record<string, number> = { ...indeg };
  const queue = ids.filter((id) => deg[id] === 0).sort((a, b) => decl[a] - decl[b]);
  while (queue.length) {
    const u = queue.shift()!;
    for (const v of getMap(succ, u)) {
      if (rank[u] + 1 > rank[v]) rank[v] = rank[u] + 1;
      deg[v]--;
      if (deg[v] === 0) { queue.push(v); queue.sort((a, b) => decl[a] - decl[b]); }
    }
  }

  // trunk = one longest source→sink path, pinned straight (finding #1)
  const better = (n: string, best: string): boolean =>
    rank[n] > rank[best] || (rank[n] === rank[best] && decl[n] < decl[best]);
  const trunk = new Set<string>();
  if (ids.length) {
    let cur: string | null = ids.reduce((b, n) => (better(n, b) ? n : b), ids[0]);
    while (cur !== null) {
      trunk.add(cur);
      const ps = getMap(pred, cur);
      cur = ps.length ? ps.reduce((b, p) => (better(p, b) ? p : b), ps[0]) : null;
    }
  }

  // ── 2. Dummy nodes for edges spanning >1 layer ───────────────────────
  const vsucc = new Map<string, string[]>();
  const vpred = new Map<string, string[]>();
  const vrank: Record<string, number> = { ...rank };
  const vw: Record<string, number> = { ...sw };
  const vh: Record<string, number> = { ...sh };
  const vdecl: Record<string, number> = { ...decl };
  const isDummy: Record<string, boolean> = {};
  const segments: Record<number, string[]> = {};
  let dn = 0;
  for (const k of valid) {
    const f = flows[k];
    const [s, d] = back.has(k) ? [f.dst, f.src] : [f.src, f.dst];
    const r0 = rank[s], r1 = rank[d];
    let seg: string[];
    if (Math.abs(r1 - r0) <= 1) {
      seg = [s, d];
      if (r0 !== r1) { pushMap(vsucc, s, d); pushMap(vpred, d, s); }
    } else {
      const step = r1 > r0 ? 1 : -1;
      const chain = [s];
      let prev = s;
      for (let r = r0 + step; r !== r1; r += step) {
        const dv = `__d${dn}`; dn++;
        vrank[dv] = r; isDummy[dv] = true; vw[dv] = 0; vh[dv] = 0;
        vdecl[dv] = decl[s] * 100000 + dn;
        pushMap(vsucc, prev, dv); pushMap(vpred, dv, prev);
        chain.push(dv); prev = dv;
      }
      pushMap(vsucc, prev, d); pushMap(vpred, d, prev);
      chain.push(d);
      seg = chain;
    }
    segments[k] = back.has(k) ? [...seg].reverse() : seg;
  }

  const maxRank = Object.values(vrank).reduce((a, b) => Math.max(a, b), 0);
  const layers: Record<number, string[]> = {};
  for (let L = 0; L <= maxRank; L++) layers[L] = [];
  for (const n of Object.keys(vrank).sort((a, b) => vdecl[a] - vdecl[b])) layers[vrank[n]].push(n);

  const side = assignSides(trunk, vrank, vsucc, vpred, vdecl);

  // ── 3. Ordering (barycenter sweeps) ──────────────────────────────────
  const order: Record<number, string[]> = {};
  for (let L = 0; L <= maxRank; L++) order[L] = [...layers[L]];
  for (let it = 0; it < ORDER_SWEEPS; it++) {
    const down = it % 2 === 0;
    const seq = down ? range(1, maxRank + 1) : range(maxRank - 1, -1, -1);
    const nbr = down ? vpred : vsucc;
    for (const L of seq) {
      const adj = down ? L - 1 : L + 1;
      const pos: Record<string, number> = {};
      (order[adj] ?? []).forEach((n, i) => { pos[n] = i; });
      const cur: Record<string, number> = {};
      order[L].forEach((n, i) => { cur[n] = i; });
      const bary = (n: string): number => {
        const ms = getMap(nbr, n).filter((m) => m in pos).map((m) => pos[m]);
        return ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : cur[n];
      };
      order[L] = [...order[L]].sort((a, b) => (bary(a) - bary(b)) || (vdecl[a] - vdecl[b]));
    }
  }
  // Group each layer `above | trunk | below` so branches balance both sides.
  for (let L = 0; L <= maxRank; L++) {
    const col = order[L];
    order[L] = [
      ...col.filter((n) => (side[n] ?? 0) < 0),
      ...col.filter((n) => (side[n] ?? 0) === 0),
      ...col.filter((n) => (side[n] ?? 0) > 0),
    ];
  }

  // ── 4. Coordinates ───────────────────────────────────────────────────
  const cx: Record<string, number> = {};
  let right = MARGIN;
  for (let L = 0; L <= maxRank; L++) {
    const colW = layers[L].reduce((a, n) => Math.max(a, vw[n]), 0);
    const center = right + H_GAP + colW / 2;
    for (const n of layers[L]) cx[n] = center;
    right = center + colW / 2;
  }
  const cy: Record<string, number> = {};
  for (let L = 0; L <= maxRank; L++) {
    const col = order[L];
    const total = col.reduce((a, n) => a + vh[n], 0) + V_GAP * Math.max(col.length - 1, 0);
    let run = -total / 2;
    for (const n of col) { cy[n] = run + vh[n] / 2; run += vh[n] + V_GAP; }
  }
  const prio = (n: string): number => {
    if (trunk.has(n)) return PRIO_TRUNK;
    if (isDummy[n]) return PRIO_DUMMY;
    if (getMap(vpred, n).length <= 1 && getMap(vsucc, n).length <= 1) return PRIO_CHAIN;
    return getMap(vpred, n).length + getMap(vsucc, n).length;
  };
  for (let it = 0; it < ALIGN_SWEEPS; it++) {
    const down = it % 2 === 0;
    const seq = down ? range(1, maxRank + 1) : range(maxRank - 1, -1, -1);
    const nbr = down ? vpred : vsucc;
    for (const L of seq) {
      const col = order[L];
      const desired = col.map((n) =>
        trunk.has(n) ? 0
          : (getMap(nbr, n).length ? median(getMap(nbr, n).map((m) => cy[m])) : cy[n]));
      placeLayer(col, col.map(prio), desired, cy, vh, vdecl);
    }
  }
  if (ids.length) {
    let top = Infinity;
    for (const n of ids) top = Math.min(top, cy[n] - vh[n] / 2);
    const dy = topY - top;
    for (const n of Object.keys(cy)) cy[n] += dy;
  }

  // ── 5. Pin override (FR-9) ───────────────────────────────────────────
  for (const n of nodes) if (n.pin) { cx[n.id] = n.pin[0]; cy[n.id] = n.pin[1]; }

  // ── emit components ──────────────────────────────────────────────────
  const comps: Component[] = nodes.map((n) => makeComponent({
    id: n.id, name: n.label, subtitle: "", icon: n.marker,
    shape: n.shape, accent: "blue",
    pos: [Math.round(cx[n.id]), Math.round(cy[n.id])],
    size: SIZE[n.shape] ?? DEFAULT_SIZE,
  }));

  // ── 6. Routing → Edge.points ─────────────────────────────────────────
  const multiOut: Record<string, boolean> = {};
  for (const id of ids) multiOut[id] = getMap(vsucc, id).length > 1;
  const edges: Edge[] = [];
  for (const k of valid) {
    const f = flows[k];
    const pts = route(segments[k], cx, cy, vw, vh, multiOut, back.has(k));
    edges.push(makeEdge({
      src: f.src, dst: f.dst, label: f.label,
      points: pts, bpmnFlow: f.flow, labelPos: f.label ? labelPos(pts) : null,
    }));
  }

  let rightExt = MARGIN, botExt = MARGIN;
  for (const n of nodes) {
    rightExt = Math.max(rightExt, cx[n.id] + sw[n.id] / 2);
    botExt = Math.max(botExt, cy[n.id] + sh[n.id] / 2);
  }
  for (const e of edges) for (const [px, py] of e.points ?? []) {
    rightExt = Math.max(rightExt, px); botExt = Math.max(botExt, py);
  }
  return { comps, edges, right: rightExt, bot: botExt };
}

function assignSides(
  trunk: Set<string>, vrank: Record<string, number>,
  vsucc: Map<string, string[]>, vpred: Map<string, string[]>, vdecl: Record<string, number>,
): Record<string, number> {
  const adj = new Map<string, Set<string>>();
  const addAdj = (a: string, b: string) => { const s = adj.get(a) ?? new Set<string>(); s.add(b); adj.set(a, s); };
  for (const u of Object.keys(vrank)) {
    if (trunk.has(u)) continue;
    for (const v of getMap(vsucc, u)) if (!trunk.has(v)) { addAdj(u, v); addAdj(v, u); }
  }
  const seen = new Set<string>();
  const comps: string[][] = [];
  for (const n of Object.keys(vrank).filter((x) => !trunk.has(x)).sort((a, b) => vdecl[a] - vdecl[b])) {
    if (seen.has(n)) continue;
    seen.add(n);
    const stack = [n];
    const comp: string[] = [];
    while (stack.length) {
      const u = stack.pop()!;
      comp.push(u);
      for (const w of adj.get(u) ?? []) if (!seen.has(w)) { seen.add(w); stack.push(w); }
    }
    comps.push(comp);
  }
  const anchor = (comp: string[]): number => {
    const rs: number[] = [];
    for (const u of comp) for (const v of [...getMap(vsucc, u), ...getMap(vpred, u)]) if (trunk.has(v)) rs.push(vrank[v]);
    return rs.length ? Math.min(...rs) : Math.min(...comp.map((u) => vrank[u]));
  };
  comps.sort((a, b) => {
    const aa = anchor(a), ab = anchor(b);
    if (aa !== ab) return aa - ab;
    return Math.min(...a.map((u) => vdecl[u])) - Math.min(...b.map((u) => vdecl[u]));
  });
  const side: Record<string, number> = {};
  comps.forEach((comp, i) => { const s = i % 2 === 0 ? -1 : 1; for (const u of comp) side[u] = s; });
  return side;
}

function placeLayer(
  col: string[], prios: number[], desired: number[],
  cy: Record<string, number>, vh: Record<string, number>, vdecl: Record<string, number>,
): void {
  const n = col.length;
  if (n === 0) return;
  const gap = (k: number): number => vh[col[k - 1]] / 2 + V_GAP + vh[col[k]] / 2;
  const y = col.map((c) => cy[c]);
  const placed = new Array<boolean>(n).fill(false);
  const seq = range(0, n).sort((a, b) => (prios[b] - prios[a]) || (vdecl[col[a]] - vdecl[col[b]]));
  for (const i of seq) {
    let lo = -Infinity, hi = Infinity;
    let cum = 0;
    for (let j = i - 1; j >= 0; j--) { cum += gap(j + 1); if (placed[j]) { lo = y[j] + cum; break; } }
    cum = 0;
    for (let j = i + 1; j < n; j++) { cum += gap(j); if (placed[j]) { hi = y[j] - cum; break; } }
    let want = desired[i];
    if (want > hi) want = hi;
    if (want < lo) want = lo;
    y[i] = want;
    placed[i] = true;
  }
  col.forEach((c, i) => { cy[c] = y[i]; });
}

function route(
  chain: string[], cx: Record<string, number>, cy: Record<string, number>,
  vw: Record<string, number>, vh: Record<string, number>,
  multiOut: Record<string, boolean>, reverse: boolean,
): Point[] {
  let pts: Point[] = [];
  for (let k = 0; k < chain.length - 1; k++) {
    const a = chain[k], b = chain[k + 1];
    const ax = cx[a], ay = cy[a], bx = cx[b], by = cy[b];
    const first = k === 0;
    const last = k === chain.length - 2;
    const ahw = vw[a] / 2, ahh = vh[a] / 2;
    const bhw = vw[b] / 2;
    const sx = last ? bx - bhw : bx;
    const sy = by;
    let seg: Point[];
    if (ay === by) {
      const ex = first ? ax + ahw : ax;
      seg = [[ex, ay], [sx, sy]];
    } else if (first && multiOut[a]) {
      const ey = by < ay ? ay - ahh : ay + ahh;
      seg = [[ax, ey], [ax, sy], [sx, sy]];
    } else {
      const ex = first ? ax + ahw : ax;
      const mx = (ex + sx) / 2;
      seg = [[ex, ay], [mx, ay], [mx, sy], [sx, sy]];
    }
    if (pts.length === 0) pts.push(...seg);
    else pts.push(...seg.slice(1));
  }
  pts = dedupe(pts.map(([x, y]) => [Math.round(x), Math.round(y)] as Point));
  if (reverse) pts.reverse();
  return pts;
}

function dedupe(pts: Point[]): Point[] {
  if (pts.length <= 2) return pts;
  const out: Point[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = out[out.length - 1];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    if ((x0 === x1 && x1 === x2) || (y0 === y1 && y1 === y2)) continue;   // collinear
    if (x1 !== x0 || y1 !== y0) out.push(pts[i]);
  }
  const lastP = pts[pts.length - 1], lastO = out[out.length - 1];
  if (lastP[0] !== lastO[0] || lastP[1] !== lastO[1]) out.push(lastP);
  return out;
}

function labelPos(pts: Point[]): Point | null {
  if (pts.length < 2) return null;
  const [x0, y0] = pts[0];
  const [x1, y1] = pts[1];
  return [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2) - 8];
}

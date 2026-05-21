/**
 * Auto-layout — JS port of `packages/python/src/kymo/layout.py`.
 *
 * Two layout strategies, both writing component `pos` (and region `bounds`)
 * in place:
 *   - `layout()` — grid mode: pack components into a region/row grid so rows
 *     line up across regions (cross-region same-row edges run flat).
 *   - `applyLayoutTree()` — Figma-style auto-layout: each frame hugs its
 *     contents, children flow along the frame axis with a fixed gap, cross
 *     axis centre-aligned. `minimizeCrossings()` barycenter-reorders children
 *     first so siblings land in a crossing-minimised order.
 *
 * This is an independent TypeScript implementation kept at parity with the
 * Python algorithm — not a transpile. Output need not be byte-identical to
 * Python's (the two renderers differ); it must produce equivalent geometry.
 */
import {
  LABEL_HEIGHT, SHAPE_HALF, componentHalf, anchor, resolveAnchors,
  getComponent, type Component, type Diagram, type Edge, type Point,
} from "./model.js";

// ── Layout tree node (mirrors Python's tuple shapes) ───────────────────
//   { t: "id", id }
//   { t: "group", dir, children }
//   { t: "group", dir, children, padding }   ← 4-tuple variant (cluster pad)
export type LayoutNode =
  | { t: "id"; id: string }
  | { t: "group"; dir: "horizontal" | "vertical"; children: LayoutNode[]; padding?: Point };

export function idNode(id: string): LayoutNode {
  return { t: "id", id };
}
export function groupNode(
  dir: "horizontal" | "vertical", children: LayoutNode[], padding?: Point,
): LayoutNode {
  return padding ? { t: "group", dir, children, padding } : { t: "group", dir, children };
}

export interface RegionLayout {
  [regionId: string]: string[][];
}
export interface ExternalSpec {
  [componentId: string]: { above?: string; gap?: number };
}

// ── Sizing ─────────────────────────────────────────────────────────────
const CHAR_W_NAME = 7.6;   // 14px component name
const CHAR_W_SUB = 6.4;    // 11.5px subtitle
const LABEL_GAP = 6;
const LINE_HEIGHT = 18;

// Derive icon (w, h) from SHAPE_HALF so new shapes don't drift; annotation
// keeps a (40, 32) label budget though SHAPE_HALF treats it as (0, 0).
const ICON_DIMS: Record<string, Point> = (() => {
  const out: Record<string, Point> = {};
  for (const [shape, [hw, hh]] of Object.entries(SHAPE_HALF)) out[shape] = [2 * hw, 2 * hh];
  out["annotation"] = [40, 32];
  return out;
})();

function iconDims(shape: string): Point {
  return ICON_DIMS[shape] ?? [0, 0];
}

function textW(s: string, charW: number): number {
  return Math.trunc(s.length * charW);
}

export interface Cell {
  w: number;
  h: number;
}

export function cellSize(c: Component, hPad = 8, vPad = 10): Cell {
  const [iw, ih] = iconDims(c.shape);
  const nameW = textW(c.name, CHAR_W_NAME);
  const subW = textW(c.subtitle, CHAR_W_SUB);
  const labelW = Math.max(nameW, subW);
  const labelH = LABEL_GAP + LINE_HEIGHT * 2;
  return { w: Math.max(iw, labelW) + hPad * 2, h: ih + labelH + vPad };
}

// ── Grid layout ──────────────────────────────────────────────────────────
export interface LayoutOptions {
  regionGap?: number;
  rowGap?: number;
  cellGap?: number;
  regionPaddingX?: number;
  regionPaddingY?: number;
  canvasMargin?: number;
}

export function layout(
  diagram: Diagram,
  regionLayout: RegionLayout,
  external: ExternalSpec | null = null,
  opts: LayoutOptions = {},
): void {
  const regionGap = opts.regionGap ?? 36;
  const rowGap = opts.rowGap ?? 28;
  const cellGap = opts.cellGap ?? 18;
  const regionPaddingX = opts.regionPaddingX ?? 18;
  const regionPaddingY = opts.regionPaddingY ?? 22;
  const canvasMargin = opts.canvasMargin ?? 18;

  const sizes = new Map<string, Cell>(diagram.components.map((c) => [c.id, cellSize(c)]));
  const regionIds = Object.keys(regionLayout);

  // Per-row height across all regions → consistent Y for cross-region rows.
  const maxRows = Math.max(...regionIds.map((rid) => regionLayout[rid].length));
  const rowHeights: number[] = [];
  for (let i = 0; i < maxRows; i++) {
    let h = 0;
    for (const rid of regionIds) {
      const rows = regionLayout[rid];
      if (i < rows.length) {
        for (const cid of rows[i]) {
          const s = sizes.get(cid);
          if (s) h = Math.max(h, s.h);
        }
      }
    }
    rowHeights.push(h || 100);
  }

  // Per-region width = max(row width).
  const regionWidths = new Map<string, number>();
  for (const rid of regionIds) {
    let w = 0;
    for (const row of regionLayout[rid]) {
      const rowW = row.reduce((acc, cid) => acc + (sizes.get(cid)?.w ?? 0), 0)
        + (row.length - 1) * cellGap;
      w = Math.max(w, rowW);
    }
    regionWidths.set(rid, w + regionPaddingX * 2);
  }

  // External components reserve vertical space above the first row.
  const ext = external ?? {};
  let extAboveHeight = 0;
  for (const [eid, spec] of Object.entries(ext)) {
    if (spec.above && sizes.has(eid)) {
      extAboveHeight = Math.max(extAboveHeight, sizes.get(eid)!.h + (spec.gap ?? 60));
    }
  }

  // Row centre-Y, cumulative.
  const rowYs: number[] = [];
  let y = canvasMargin + extAboveHeight;
  for (const h of rowHeights) {
    y += Math.floor(h / 2);
    rowYs.push(y);
    y += Math.floor(h / 2) + rowGap;
  }

  // Region centre-X, cumulative.
  const regionXs = new Map<string, number>();
  let x = canvasMargin;
  for (const rid of regionIds) {
    const w = regionWidths.get(rid)!;
    x += Math.floor(w / 2);
    regionXs.set(rid, x);
    x += Math.floor(w / 2) + regionGap;
  }
  const canvasRight = x - regionGap + canvasMargin;

  // Place each component at its grid cell.
  for (const rid of regionIds) {
    const rx = regionXs.get(rid)!;
    const rows = regionLayout[rid];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const ry = rowYs[i];
      const totalW = row.reduce((acc, cid) => acc + (sizes.get(cid)?.w ?? 0), 0)
        + (row.length - 1) * cellGap;
      let cursor = rx - Math.floor(totalW / 2);
      for (const cid of row) {
        const cw = sizes.get(cid)?.w ?? 0;
        getComponent(diagram, cid).pos = [cursor + Math.floor(cw / 2), ry];
        cursor += cw + cellGap;
      }
    }
  }

  // Place external (above a target).
  for (const [eid, spec] of Object.entries(ext)) {
    if (spec.above) {
      const target = getComponent(diagram, spec.above);
      const gap = spec.gap ?? 60;
      const targetTop = target.pos[1] - Math.floor((sizes.get(spec.above)?.h ?? 0) / 2);
      getComponent(diagram, eid).pos = [
        target.pos[0],
        targetTop - gap - Math.floor((sizes.get(eid)?.h ?? 0) / 2),
      ];
    }
  }

  // Region bounds — hug the cells with region padding.
  for (const rid of regionIds) {
    const rx = regionXs.get(rid)!;
    const rw = regionWidths.get(rid)!;
    const rows = regionLayout[rid];
    const n = rows.length;
    const top = rowYs[0] - Math.floor(rowHeights[0] / 2) - regionPaddingY;
    const bot = rowYs[n - 1] + Math.floor(rowHeights[n - 1] / 2) + regionPaddingY;
    for (const r of diagram.regions) {
      if (r.id === rid) {
        r.bounds = [rx - Math.floor(rw / 2), top, rw, bot - top];
        break;
      }
    }
  }

  // Auto-route edges that asked for it.
  routeEdges(diagram, rowYs);

  // Final canvas — fit content + margin.
  diagram.width = canvasRight;
  diagram.height = Math.max(
    ...diagram.components.map((c) => c.pos[1] + Math.floor((sizes.get(c.id)?.h ?? 0) / 2)),
  ) + canvasMargin;
}

// ── Anonymous layout-tree (Figma-style auto-layout) ────────────────────
export function applyLayoutTree(
  byId: Map<string, Component>,
  tree: LayoutNode,
  opts: { gap?: number; origin?: Point } = {},
): Point {
  const gap = opts.gap ?? 40;
  const origin = opts.origin ?? [0, 0];

  const lookup = (cid: string): Component => {
    const c = byId.get(cid);
    if (!c) throw new Error(`layout tree references unknown component ${JSON.stringify(cid)}`);
    return c;
  };

  const cell = (c: Component): Point => {
    const [iw, ih] = iconDims(c.shape);
    const lh = (c.name || c.subtitle) ? (LABEL_HEIGHT[c.shape] ?? 0) : 0;
    return [iw, ih + lh];
  };

  const padOf = (node: LayoutNode): Point =>
    (node.t === "group" && node.padding) ? node.padding : [0, 0];

  const effectiveGap = (dir: "horizontal" | "vertical", sizes: Point[]): number => {
    const cross = dir === "horizontal"
      ? Math.max(...sizes.map((s) => s[1]))
      : Math.max(...sizes.map((s) => s[0]));
    return Math.max(gap, Math.floor(cross / 4));
  };

  const measure = (node: LayoutNode): Point => {
    if (node.t === "id") return cell(lookup(node.id));
    const [px, py] = padOf(node);
    const sizes = node.children.map(measure);
    const eg = effectiveGap(node.dir, sizes);
    if (node.dir === "horizontal") {
      return [
        sizes.reduce((a, s) => a + s[0], 0) + (sizes.length - 1) * eg + 2 * px,
        Math.max(...sizes.map((s) => s[1])) + 2 * py,
      ];
    }
    return [
      Math.max(...sizes.map((s) => s[0])) + 2 * px,
      sizes.reduce((a, s) => a + s[1], 0) + (sizes.length - 1) * eg + 2 * py,
    ];
  };

  const place = (node: LayoutNode, cx: number, cy: number): void => {
    if (node.t === "id") {
      const c = lookup(node.id);
      const lh = (c.name || c.subtitle) ? (LABEL_HEIGHT[c.shape] ?? 0) : 0;
      c.pos = [cx, cy - Math.floor(lh / 2)];   // cell center → icon center
      return;
    }
    const sizes = node.children.map(measure);
    const eg = effectiveGap(node.dir, sizes);
    const [w, h] = measure(node);
    const [px, py] = padOf(node);
    const innerW = w - 2 * px;
    const innerH = h - 2 * py;
    if (node.dir === "horizontal") {
      let cursor = cx - Math.floor(innerW / 2);
      node.children.forEach((ch, i) => {
        const cw = sizes[i][0];
        place(ch, cursor + Math.floor(cw / 2), cy);
        cursor += cw + eg;
      });
    } else {
      let cursor = cy - Math.floor(innerH / 2);
      node.children.forEach((ch, i) => {
        const chH = sizes[i][1];
        place(ch, cx, cursor + Math.floor(chH / 2));
        cursor += chH + eg;
      });
    }
  };

  const [w, h] = measure(tree);
  place(tree, origin[0] + Math.floor(w / 2), origin[1] + Math.floor(h / 2));
  return [w, h];
}

// ── Crossing minimisation (barycenter heuristic) ────────────────────────
function collectLeavesOrdered(node: LayoutNode): string[] {
  if (node.t === "id") return [node.id];
  const out: string[] = [];
  for (const ch of node.children) out.push(...collectLeavesOrdered(ch));
  return out;
}

export function minimizeCrossings(
  tree: LayoutNode, edges: Array<[string, string]>, maxSweeps = 24,
): void {
  if (tree.t !== "group") return;

  const leafAdj = new Map<string, Set<string>>();
  const add = (a: string, b: string): void => {
    if (!leafAdj.has(a)) leafAdj.set(a, new Set());
    leafAdj.get(a)!.add(b);
  };
  for (const [s, d] of edges) { add(s, d); add(d, s); }

  for (let i = 0; i < maxSweeps; i++) {
    if (!sweepNode(tree, leafAdj)) break;
  }
}

function sweepNode(node: LayoutNode, leafAdj: Map<string, Set<string>>): boolean {
  if (node.t !== "group") return false;
  let changed = false;
  for (const ch of node.children) {
    if (sweepNode(ch, leafAdj)) changed = true;
  }
  const sibs = node.children;
  const n = sibs.length;
  if (n < 2) return changed;
  for (let i = 0; i < n - 1; i++) {
    if (barycenterReorder(sibs, i, i + 1, leafAdj)) changed = true;
  }
  for (let i = n - 1; i > 0; i--) {
    if (barycenterReorder(sibs, i, i - 1, leafAdj)) changed = true;
  }
  return changed;
}

function barycenterReorder(
  sibs: LayoutNode[], fixedIdx: number, freeIdx: number,
  adj: Map<string, Set<string>>,
): boolean {
  const free = sibs[freeIdx];
  if (free.t !== "group") return false;

  const fixedLeaves = collectLeavesOrdered(sibs[fixedIdx]);
  const fixedPos = new Map<string, number>(fixedLeaves.map((leaf, idx) => [leaf, idx]));

  const keyed = free.children.map((ch, chIdx) => {
    const positions: number[] = [];
    for (const leaf of collectLeavesOrdered(ch)) {
      for (const adjLeaf of adj.get(leaf) ?? []) {
        if (fixedPos.has(adjLeaf)) positions.push(fixedPos.get(adjLeaf)!);
      }
    }
    const bary = positions.length
      ? positions.reduce((a, b) => a + b, 0) / positions.length
      : chIdx;
    return { bary, chIdx, ch };
  });

  keyed.sort((a, b) => (a.bary - b.bary) || (a.chIdx - b.chIdx));   // stable on ties
  const newChildren = keyed.map((t) => t.ch);
  if (newChildren.length === free.children.length
    && newChildren.every((c, i) => c === free.children[i])) {
    return false;
  }
  free.children = newChildren;
  return true;
}

// ── Edge routing helpers ───────────────────────────────────────────────
function routeEdges(diagram: Diagram, rowYs: number[]): void {
  for (const e of diagram.edges) {
    if (e.via.length) continue;            // respect explicit waypoints
    if (e.route === "over") e.via = routeOver(diagram, e, rowYs);
    else if (e.route === "under") e.via = routeUnder(diagram, e, rowYs);
    // "auto" → no via; the renderer's auto-elbow handles it.
  }
}

function nearestRow(rowYs: number[], y: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < rowYs.length; i++) {
    const d = Math.abs(rowYs[i] - y);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function routeOver(diagram: Diagram, e: Edge, rowYs: number[]): Point[] {
  const src = getComponent(diagram, e.src);
  const dst = getComponent(diagram, e.dst);
  const [sa, da] = resolveAnchors(e, src, dst);
  const sp = anchor(src, sa);
  const dp = anchor(dst, da);

  const srcRow = nearestRow(rowYs, src.pos[1]);
  if (srcRow === 0) {
    const tops = diagram.components
      .filter((c) => c.shape !== "annotation")
      .map((c) => c.pos[1] - componentHalf(c)[1]);
    const topOfContent = tops.length ? Math.min(...tops) : 0;
    const overY = Math.max(14, topOfContent - 30);
    return [[sp[0], overY], [dp[0], overY]];
  }

  const TOL = 5;
  const prevRowY = rowYs[srcRow - 1];
  const currRowY = rowYs[srcRow];
  const prevCells = diagram.components.filter((c) => Math.abs(c.pos[1] - prevRowY) < TOL);
  const currCells = diagram.components.filter((c) => Math.abs(c.pos[1] - currRowY) < TOL);
  const prevBottom = prevCells.length
    ? Math.max(...prevCells.map((c) => c.pos[1] + componentHalf(c)[1] + (LABEL_HEIGHT[c.shape] ?? 0)))
    : prevRowY;
  const currTop = currCells.length
    ? Math.min(...currCells.map((c) => c.pos[1] - componentHalf(c)[1]))
    : currRowY;
  const overY = Math.floor((prevBottom + currTop) / 2);
  return [[sp[0], overY], [dp[0], overY]];
}

function routeUnder(diagram: Diagram, e: Edge, rowYs: number[]): Point[] {
  const src = getComponent(diagram, e.src);
  const dst = getComponent(diagram, e.dst);
  const [sa, da] = resolveAnchors(e, src, dst);
  const sp = anchor(src, sa);
  const dp = anchor(dst, da);

  const srcRow = nearestRow(rowYs, src.pos[1]);
  if (srcRow + 1 >= rowYs.length) {
    const yy = Math.max(sp[1], dp[1]) + 36;
    return [[sp[0], yy], [dp[0], yy]];
  }

  const TOL = 5;
  const srcRowY = rowYs[srcRow];
  const nextRowY = rowYs[srcRow + 1];
  const srcCells = diagram.components.filter((c) => Math.abs(c.pos[1] - srcRowY) < TOL);
  const nextCells = diagram.components.filter((c) => Math.abs(c.pos[1] - nextRowY) < TOL);
  const rowBottom = srcCells.length
    ? Math.max(...srcCells.map((c) => c.pos[1] + componentHalf(c)[1] + (LABEL_HEIGHT[c.shape] ?? 0)))
    : srcRowY;
  const nextTop = nextCells.length
    ? Math.min(...nextCells.map((c) => c.pos[1] - componentHalf(c)[1]))
    : nextRowY;
  const underY = Math.floor((rowBottom + nextTop) / 2);
  return [[sp[0], underY], [dp[0], underY]];
}

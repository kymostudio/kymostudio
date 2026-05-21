/**
 * Local alignment — JS port of `packages/python/src/kymo/alignment.py`.
 *
 * The post-parse resolver that turns declared relationships into absolute
 * geometry. Six passes, run in order by {@link resolveAlignments}:
 *   1. auto-layouts        — Figma-style: regions with a `layout` direction
 *                            position every child along that axis.
 *   2. component alignments — pairwise parent/child anchoring (`@ parent side`).
 *   3. region bounds        — bounding boxes from the enclosed components.
 *   4. fan-in / fan-out     — stagger shared-anchor ports so arrows fan out.
 *   5. trunk lanes          — channel-route parallel Z-edges into lanes.
 *   6. auto-size canvas      — derive width/height + snap to an 8px grid.
 *
 * Independent implementation kept at parity with the Python algorithm.
 */
import {
  LABEL_HEIGHT, componentHalf, regionHalf, anchor, resolveAnchors, getComponent,
  type Component, type Diagram, type Edge, type Region, type Point, type Side,
} from "./model.js";

type Node = Component | Region;

const NAME_CHAR_W = 7;   // 14px bold sans ≈ 7 px/char
const SUB_CHAR_W = 6;    // 11.5px regular sans ≈ 6 px/char

/** Round half-to-even, matching Python's built-in `round()` — so grid snapping
 *  and lane offsets land on the same pixels as the Python implementation
 *  (`Math.round` differs only at exact .5 boundaries, where it rounds up). */
function pyRound(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff < 0.5) return f;
  if (diff > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;   // exactly .5 → nearest even
}

function isRegion(n: Node): n is Region {
  return "bounds" in n;
}

function halfOf(n: Node): Point {
  return isRegion(n) ? regionHalf(n) : componentHalf(n);
}

/** Geometric centre of a node — components carry it as `pos`, regions derive
 *  it from `bounds` (Python sorts fan-in/out by the other endpoint's pos). */
function centerOf(n: Node): Point {
  return isRegion(n) ? anchor(n, "center") : n.pos;
}

function labelHalfWidth(c: Component): number {
  if (c.shape === "annotation" || c.shape === "badge") return 0;
  const nameW = c.name.length * NAME_CHAR_W;
  const subW = c.subtitle.length * SUB_CHAR_W;
  return Math.floor(Math.max(nameW, subW) / 2);
}

function effectiveHalf(c: Component): Point {
  const [hw, hh] = componentHalf(c);
  return [Math.max(hw, labelHalfWidth(c)), hh];
}

function isZeroBounds(b: [number, number, number, number]): boolean {
  return b[0] === 0 && b[1] === 0 && b[2] === 0 && b[3] === 0;
}

function buildNodeMap(diagram: Diagram): Map<string, Node> {
  const m = new Map<string, Node>();
  for (const r of diagram.regions) m.set(r.id, r);
  for (const c of diagram.components) m.set(c.id, c);   // components win on collision
  return m;
}

export function resolveAlignments(diagram: Diagram): void {
  resolveAutoLayouts(diagram);
  resolveComponentAlignments(diagram);
  resolveRegionBounds(diagram);
  staggerFaninEdges(diagram);
  staggerTrunkLanes(diagram);
  autoSizeCanvas(diagram);
}

// ── Pass 5: trunk-lane channel routing ─────────────────────────────────
function staggerTrunkLanes(diagram: Diagram, minStep = 8, maxStep = 16): void {
  const byId = buildNodeMap(diagram);
  type TrunkEntry = { e: Edge; sp: Point; dp: Point };
  const horiz = new Map<string, TrunkEntry[]>();
  const vert = new Map<string, TrunkEntry[]>();
  const push = (m: Map<string, TrunkEntry[]>, key: string, entry: TrunkEntry): void => {
    const arr = m.get(key);
    if (arr) arr.push(entry); else m.set(key, [entry]);
  };

  for (const e of diagram.edges) {
    if (e.via.length) continue;                        // explicit routing wins
    const src = byId.get(e.src);
    const dst = byId.get(e.dst);
    if (!src || !dst) continue;
    const [sa, da] = resolveAnchors(e, src, dst);
    const sp = anchor(src, sa);
    const dp = anchor(dst, da);
    if (sp[0] === dp[0] || sp[1] === dp[1]) continue;  // already axis-aligned
    if (sa === "left" || sa === "right") {
      push(horiz, `${pyRound(sp[0] / 8) * 8},${pyRound(dp[0] / 8) * 8}`, { e, sp, dp });
    } else {
      push(vert, `${pyRound(sp[1] / 8) * 8},${pyRound(dp[1] / 8) * 8}`, { e, sp, dp });
    }
  }

  const assign = (
    entries: TrunkEntry[],
    sortIdx: 0 | 1, channelWidth: number,
  ): void => {
    const n = entries.length;
    if (n <= 1) return;
    const overlaps = (t1: typeof entries[number], t2: typeof entries[number]): boolean => {
      const r1 = [t1.sp[sortIdx], t1.dp[sortIdx]].sort((a, b) => a - b);
      const r2 = [t2.sp[sortIdx], t2.dp[sortIdx]].sort((a, b) => a - b);
      return Math.max(r1[0], r2[0]) < Math.min(r1[1], r2[1]);
    };
    let any = false;
    for (let i = 0; i < n && !any; i++) {
      for (let j = i + 1; j < n; j++) {
        if (overlaps(entries[i], entries[j])) { any = true; break; }
      }
    }
    if (!any) return;
    const step = Math.max(minStep, Math.min(maxStep, Math.floor(channelWidth / (n + 1))));
    entries.sort((a, b) => (a.sp[sortIdx] - b.sp[sortIdx]) || (a.dp[sortIdx] - b.dp[sortIdx]));
    const mid = (n - 1) / 2;
    entries.forEach((t, i) => { t.e.trunkOffset = pyRound((i - mid) * step); });
  };

  for (const [key, entries] of horiz) {
    const [srcX, dstX] = key.split(",").map(Number);
    assign(entries, 1, Math.abs(dstX - srcX));
  }
  for (const [key, entries] of vert) {
    const [srcY, dstY] = key.split(",").map(Number);
    assign(entries, 0, Math.abs(dstY - srcY));
  }
}

// ── Pass 4: fan-in / fan-out port distribution ─────────────────────────
interface FanEntry {
  e: Edge;
  src: Node;
  dst: Node;
  sa: Side;
  da: Side;
}

function staggerFaninEdges(diagram: Diagram): void {
  const byId = buildNodeMap(diagram);
  const fanin = new Map<string, FanEntry[]>();
  const fanout = new Map<string, FanEntry[]>();
  const push = (m: Map<string, FanEntry[]>, key: string, entry: FanEntry): void => {
    const arr = m.get(key);
    if (arr) arr.push(entry); else m.set(key, [entry]);
  };

  for (const e of diagram.edges) {
    const src = byId.get(e.src);
    const dst = byId.get(e.dst);
    if (!src || !dst) continue;
    const [sa, da] = resolveAnchors(e, src, dst);
    const entry: FanEntry = { e, src, dst, sa, da };
    push(fanin, `${e.dst}|${da}`, entry);
    push(fanout, `${e.src}|${sa}`, entry);
  }

  const STEP = 16;

  const spread = (
    entriesIn: FanEntry[], anchorSide: Side, attr: "srcOffset" | "dstOffset",
    nodeOf: (t: FanEntry) => Node, otherOf: (t: FanEntry) => Node, minCount: number,
  ): void => {
    let entries = entriesIn;
    let n = entries.length;
    if (n < minCount) return;
    if (attr === "srcOffset") {
      entries = entries.filter((t) => !t.e.sharedPort);   // shared-port edges opt out
      if (entries.length < 1) return;
      n = entries.length;
    }
    const node = nodeOf(entries[0]);
    if (anchorSide === "left" || anchorSide === "right") {
      const crossSpan = halfOf(node)[1] * 2;
      entries.sort((a, b) => centerOf(otherOf(a))[1] - centerOf(otherOf(b))[1]);
      const spreadTotal = Math.min(crossSpan - 16, STEP * (n - 1));
      const mid = (n - 1) / 2;
      entries.forEach((t, i) => {
        const dy = pyRound(((i - mid) / Math.max(mid, 1)) * (spreadTotal / 2));
        const cur = t.e[attr];
        t.e[attr] = [cur[0], cur[1] + dy];
      });
    } else if (anchorSide === "top" || anchorSide === "bottom") {
      const crossSpan = halfOf(node)[0] * 2;
      entries.sort((a, b) => centerOf(otherOf(a))[0] - centerOf(otherOf(b))[0]);
      const spreadTotal = Math.min(crossSpan - 16, STEP * (n - 1));
      const mid = (n - 1) / 2;
      entries.forEach((t, i) => {
        const dx = pyRound(((i - mid) / Math.max(mid, 1)) * (spreadTotal / 2));
        const cur = t.e[attr];
        t.e[attr] = [cur[0] + dx, cur[1]];
      });
    }
  };

  for (const [key, entries] of fanin) {
    const da = key.split("|")[1] as Side;
    spread(entries, da, "dstOffset", (t) => t.dst, (t) => t.src, 2);
  }
  for (const [key, entries] of fanout) {
    const sa = key.split("|")[1] as Side;
    spread(entries, sa, "srcOffset", (t) => t.src, (t) => t.dst, 3);
  }
}

// ── Pass 6: auto-size canvas + snap to grid ────────────────────────────
function autoSizeCanvas(diagram: Diagram, margin = 30): void {
  if (diagram.width > 0 && diagram.height > 0) return;

  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;

  for (const c of diagram.components) {
    const effHw = Math.max(componentHalf(c)[0], labelHalfWidth(c));
    const lh = (c.name || c.subtitle) ? (LABEL_HEIGHT[c.shape] ?? 0) : 0;
    minX = Math.min(minX, c.pos[0] - effHw);
    maxX = Math.max(maxX, c.pos[0] + effHw);
    minY = Math.min(minY, c.pos[1] - componentHalf(c)[1]);
    maxY = Math.max(maxY, c.pos[1] + componentHalf(c)[1] + lh);
  }
  for (const r of diagram.regions) {
    if (isZeroBounds(r.bounds)) continue;
    const [x, y, w, h] = r.bounds;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
  }
  for (const e of diagram.edges) {
    for (const [vx, vy] of e.via) {
      minX = Math.min(minX, vx); minY = Math.min(minY, vy);
      maxX = Math.max(maxX, vx); maxY = Math.max(maxY, vy);
    }
    if (e.labelPos) {
      minX = Math.min(minX, e.labelPos[0]); minY = Math.min(minY, e.labelPos[1]);
      maxX = Math.max(maxX, e.labelPos[0]); maxY = Math.max(maxY, e.labelPos[1]);
    }
  }

  if (minX > maxX) return;   // nothing to size against

  const dx = minX < margin ? margin - minX : 0;
  const dy = minY < margin ? margin - minY : 0;
  if (dx || dy) {
    for (const c of diagram.components) c.pos = [c.pos[0] + dx, c.pos[1] + dy];
    for (const r of diagram.regions) {
      if (isZeroBounds(r.bounds)) continue;
      const [x, y, w, h] = r.bounds;
      r.bounds = [x + dx, y + dy, w, h];
    }
    for (const e of diagram.edges) {
      e.via = e.via.map(([vx, vy]) => [vx + dx, vy + dy] as Point);
      if (e.labelPos) e.labelPos = [e.labelPos[0] + dx, e.labelPos[1] + dy];
    }
    maxX += dx; maxY += dy;
  }

  if (diagram.width === 0) diagram.width = maxX + margin;
  if (diagram.height === 0) diagram.height = maxY + margin;

  // Enforce min 4:3 landscape aspect: pad width and re-centre horizontally.
  if (diagram.width * 3 < diagram.height * 4) {
    const newW = Math.floor((diagram.height * 4) / 3);
    const shift = Math.floor((newW - diagram.width) / 2);
    for (const c of diagram.components) c.pos = [c.pos[0] + shift, c.pos[1]];
    for (const r of diagram.regions) {
      if (isZeroBounds(r.bounds)) continue;
      const [x, y, w, h] = r.bounds;
      r.bounds = [x + shift, y, w, h];
    }
    for (const e of diagram.edges) {
      e.via = e.via.map(([vx, vy]) => [vx + shift, vy] as Point);
      if (e.labelPos) e.labelPos = [e.labelPos[0] + shift, e.labelPos[1]];
    }
    diagram.width = newW;
  }

  snapToGrid(diagram);
}

function snapToGrid(diagram: Diagram, grid = 8): void {
  const s = (v: number): number => pyRound(v / grid) * grid;
  const sUp = (v: number): number => Math.floor((v + grid - 1) / grid) * grid;

  for (const c of diagram.components) c.pos = [s(c.pos[0]), s(c.pos[1])];
  for (const e of diagram.edges) {
    e.via = e.via.map(([vx, vy]) => [s(vx), s(vy)] as Point);
    if (e.labelPos) e.labelPos = [s(e.labelPos[0]), s(e.labelPos[1])];
  }

  const byId = new Map(diagram.components.map((c) => [c.id, c]));
  for (const r of diagram.regions) {
    if (isZeroBounds(r.bounds) || !r.contains.length) continue;
    const cells = r.contains.map((cid) => byId.get(cid)).filter((c): c is Component => !!c);
    if (!cells.length) continue;
    const [padX, padY] = r.padding;
    const padB = r.paddingBottom ?? padY;
    const xsLeft = cells.map((c) => c.pos[0] - Math.max(componentHalf(c)[0], labelHalfWidth(c)));
    const xsRight = cells.map((c) => c.pos[0] + Math.max(componentHalf(c)[0], labelHalfWidth(c)));
    const ysTop = cells.map((c) => c.pos[1] - componentHalf(c)[1]);
    const ysBot = cells.map((c) =>
      c.pos[1] + componentHalf(c)[1] + ((c.name || c.subtitle) ? (LABEL_HEIGHT[c.shape] ?? 0) : 0));
    const x = Math.min(...xsLeft) - padX;
    const y = Math.min(...ysTop) - padY;
    r.bounds = [x, y, Math.max(...xsRight) - x + padX, Math.max(...ysBot) - y + padB];
  }

  diagram.width = sUp(diagram.width);
  diagram.height = sUp(diagram.height);
}

// ── Pass 1: Figma-style auto-layouts ───────────────────────────────────
function resolveAutoLayouts(diagram: Diagram): void {
  for (const r of diagram.regions) {
    const dir = r.layout as "horizontal" | "vertical" | null;
    if (dir == null) continue;
    if (r.pos == null) continue;
    if (!r.contains.length) continue;

    const children = r.contains.map((cid) => getComponent(diagram, cid));
    const [padX, padY] = r.padding;
    const [ox, oy] = r.pos;
    let cursorX = ox + padX;
    let cursorY = oy + padY;
    const effs = children.map(effectiveHalf);

    if (dir === "horizontal") {
      const maxH = Math.max(...effs.map(([, eh]) => eh));
      children.forEach((c, i) => {
        const [ew] = effs[i];
        const ch = componentHalf(c)[1];
        let cy: number;
        if (r.align === "start") cy = cursorY + ch;
        else if (r.align === "end") cy = cursorY + 2 * maxH - ch;
        else cy = cursorY + maxH;
        c.pos = [cursorX + ew, cy];
        cursorX += ew * 2 + r.gap;
      });
    } else {
      const maxW = Math.max(...effs.map(([ew]) => ew));
      children.forEach((c, i) => {
        const [, eh] = effs[i];
        const cw = componentHalf(c)[0];
        let cx: number;
        if (r.align === "start") cx = cursorX + cw;
        else if (r.align === "end") cx = cursorX + 2 * maxW - cw;
        else cx = cursorX + maxW;
        c.pos = [cx, cursorY + eh];
        cursorY += eh * 2 + r.gap;
      });
    }
  }
}

// ── Pass 2: parent/child alignment ─────────────────────────────────────
function resolveComponentAlignments(diagram: Diagram): void {
  const resolved = new Set<string>();

  const resolve = (cid: string, path: string[]): void => {
    if (resolved.has(cid)) return;
    if (path.includes(cid)) {
      throw new Error(`alignment cycle: ${[...path, cid].join(" → ")}`);
    }
    const comp = getComponent(diagram, cid);
    if (comp.parent === null) { resolved.add(cid); return; }

    resolve(comp.parent, [...path, cid]);
    const parent = getComponent(diagram, comp.parent);
    if (comp.align === null) {
      throw new Error(`component ${JSON.stringify(cid)} has parent=${JSON.stringify(comp.parent)} but no align side`);
    }
    comp.pos = alignTo(parent, comp, comp.align, comp.alignGap, comp.alignOffset);
    resolved.add(cid);
  };

  for (const c of diagram.components) resolve(c.id, []);
}

// ── Pass 3: region bounds from contents ────────────────────────────────
function resolveRegionBounds(diagram: Diagram): void {
  for (const r of diagram.regions) {
    if (!r.contains.length) continue;
    const cells = r.contains.map((cid) => getComponent(diagram, cid));
    const [padX, padY] = r.padding;
    const padB = r.paddingBottom ?? padY;
    const effHws = cells.map((c) => Math.max(componentHalf(c)[0], labelHalfWidth(c)));
    const xsLeft = cells.map((c, i) => c.pos[0] - effHws[i]);
    const xsRight = cells.map((c, i) => c.pos[0] + effHws[i]);
    const ysTop = cells.map((c) => c.pos[1] - componentHalf(c)[1]);
    const ysBot = cells.map((c) =>
      c.pos[1] + componentHalf(c)[1] + ((c.name || c.subtitle) ? (LABEL_HEIGHT[c.shape] ?? 0) : 0));
    const x = Math.min(...xsLeft) - padX;
    const y = Math.min(...ysTop) - padY;
    r.bounds = [x, y, Math.max(...xsRight) - x + padX, Math.max(...ysBot) - y + padB];
  }
}

function alignTo(
  parent: Component, child: Component, side: string, gap: number, offset: Point,
): Point {
  const [px, py] = parent.pos;
  const [pHw, pHh] = componentHalf(parent);
  const pLabel = LABEL_HEIGHT[parent.shape] ?? 0;
  const [cHw, cHh] = componentHalf(child);
  const [ox, oy] = offset;
  let cx: number, cy: number;
  switch (side) {
    case "right":  cx = px + pHw + gap + cHw; cy = py; break;
    case "left":   cx = px - pHw - gap - cHw; cy = py; break;
    case "bottom": cx = px; cy = py + pHh + pLabel + gap + cHh; break;
    case "top":    cx = px; cy = py - pHh - gap - cHh; break;
    default: throw new Error(`unknown align side: ${JSON.stringify(side)}`);
  }
  return [cx + ox, cy + oy];
}

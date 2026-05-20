/**
 * Data model for the container diagram — JS mirror of
 * `packages/python/src/kymo/model.py`.
 *
 * Components, regions and edges are plain object literals (no classes).
 * `anchor(node, side)` and `resolveAnchors(edge, src, dst)` mimic the
 * Python implementations 1:1.
 */

export type Point = [number, number];

export type Shape =
  | "circle" | "cube" | "cube-big" | "box" | "cylinder" | "hex"
  | "annotation" | "aws-tile" | "aws-tile-hero" | "badge" | "image"
  // ── BPMN 2.0 glyphs (see bpmn-shapes.ts) ──────────────────────────
  // Imported from .bpmn files; size comes from the file's Diagram-
  // Interchange bounds (Component.size), not SHAPE_HALF. The sub-type
  // marker (event-def / task-type / gateway-type) rides in Component.icon.
  | "bpmn-start" | "bpmn-end" | "bpmn-intermediate" | "bpmn-boundary"
  | "bpmn-task" | "bpmn-subprocess" | "bpmn-gateway"
  | "bpmn-data-object" | "bpmn-data-store" | "bpmn-annotation";

export type Side = "top" | "right" | "bottom" | "left" | "center";

export const SHAPE_HALF: Record<Shape, Point> = {
  "circle":        [38, 38],
  "cube":          [40, 40],
  "cube-big":      [50, 50],
  "box":           [35, 35],
  "cylinder":      [35, 35],
  "hex":           [35, 32],   // flat-top hexagon — wider than tall
  "annotation":    [0, 0],
  "aws-tile":      [32, 32],
  "aws-tile-hero": [40, 40],
  "badge":         [14, 14],
  "image":         [32, 32],
  // BPMN — fallbacks only; real sizes arrive via Component.size from DI.
  "bpmn-start":        [18, 18],
  "bpmn-end":          [18, 18],
  "bpmn-intermediate": [18, 18],
  "bpmn-boundary":     [18, 18],
  "bpmn-task":         [50, 40],
  "bpmn-subprocess":   [50, 40],
  "bpmn-gateway":      [25, 25],
  "bpmn-data-object":  [18, 25],
  "bpmn-data-store":   [25, 25],
  "bpmn-annotation":   [0, 0],
};

export const LABEL_HEIGHT: Record<Shape, number> = {
  "circle":        38,
  "cube":          42,
  "cube-big":      48,
  "box":           38,
  "cylinder":      38,
  "hex":           40,
  "annotation":    0,
  "aws-tile":      48,
  "aws-tile-hero": 48,
  "badge":         0,
  "image":         26,
  // BPMN edges carry explicit waypoints, so no label clearance needed.
  "bpmn-start":        0,
  "bpmn-end":          0,
  "bpmn-intermediate": 0,
  "bpmn-boundary":     0,
  "bpmn-task":         0,
  "bpmn-subprocess":   0,
  "bpmn-gateway":      0,
  "bpmn-data-object":  0,
  "bpmn-data-store":   0,
  "bpmn-annotation":   0,
};

// ── Types ─────────────────────────────────────────────────────────────

export interface Component {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  shape: Shape;
  accent: string;
  pos: Point;
  /** Explicit (width, height) box overriding SHAPE_HALF — set by the BPMN
   *  importer from each element's Diagram-Interchange bounds. */
  size: Point | null;
  parent: string | null;
  align: string | null;
  alignGap: number;
  alignOffset: Point;
}

// "pool" / "lane" are BPMN swimlanes (label band down the left edge).
export type RegionStyle = "outer" | "inner" | "pool" | "lane" | string;

export interface Region {
  id: string;
  label: string;
  bounds: [number, number, number, number];
  contains: string[];
  padding: [number, number];
  paddingBottom: number | null;
  style: RegionStyle;
  icon: string | null;
  layout: unknown;
  pos: Point | null;
  gap: number;
  align: string;
  visible: boolean;
  borderDash: string | null;
  borderStroke: string | null;
  labelAnchor: string;
  labelPosition: string | null;
}

export interface Edge {
  src: string;
  dst: string;
  label: string;
  style: string;
  srcAnchor: Side | null;
  dstAnchor: Side | null;
  route: string;
  via: Point[];
  srcOffset: Point;
  dstOffset: Point;
  labelOffset: Point;
  labelAnchor: string;
  labelSmall: boolean;
  labelPos: Point | null;
  dashed: boolean;
  noArrow: boolean;
  trunkOffset: number;
  sharedPort: boolean;
  /** BPMN flow: explicit polyline (the file's DI waypoints) drawn as-is,
   *  bypassing anchor resolution. `bpmnFlow` selects the marker/dash
   *  convention: sequence | default | conditional | message | association. */
  points: Point[] | null;
  bpmnFlow: string | null;
}

export interface Diagram {
  width: number;
  height: number;
  title: string;
  subtitle: string;
  components: Component[];
  regions: Region[];
  edges: Edge[];
  layoutTrees: unknown[];
}

// ── Factories (mirror Python @dataclass with defaults) ────────────────

export function makeComponent({
  id, name = "", subtitle = "", icon = "", shape = "box", accent = "green",
  pos = [0, 0], size = null,
  parent = null, align = null, alignGap = 24, alignOffset = [0, 0],
}: {
  id: string; name?: string; subtitle?: string; icon?: string;
  shape?: Shape; accent?: string; pos?: Point; size?: Point | null;
  parent?: string | null; align?: string | null; alignGap?: number; alignOffset?: Point;
}): Component {
  return {
    id, name, subtitle, icon, shape, accent, pos, size,
    parent, align, alignGap, alignOffset,
  };
}

export function makeRegion({
  id, label = "", bounds = [0, 0, 0, 0], contains = [],
  padding = [24, 24], paddingBottom = null, style = "outer",
  icon = null, layout = null, pos = null, gap = 24, align = "center",
  visible = true, borderDash = null, borderStroke = null,
  labelAnchor = "middle", labelPosition = null,
}: {
  id: string; label?: string; bounds?: [number, number, number, number]; contains?: string[];
  padding?: [number, number]; paddingBottom?: number | null; style?: RegionStyle;
  icon?: string | null; layout?: unknown; pos?: Point | null; gap?: number; align?: string;
  visible?: boolean; borderDash?: string | null; borderStroke?: string | null;
  labelAnchor?: string; labelPosition?: string | null;
}): Region {
  return {
    id, label, bounds, contains, padding, paddingBottom, style, icon,
    layout, pos, gap, align, visible, borderDash, borderStroke,
    labelAnchor, labelPosition,
  };
}

export function makeEdge({
  src, dst, label = "", style = "gray",
  srcAnchor = null, dstAnchor = null,
  route = "auto", via = [],
  srcOffset = [0, 0], dstOffset = [0, 0],
  labelOffset = [0, 0], labelAnchor = "mid",
  labelSmall = false, labelPos = null,
  dashed = false, noArrow = false,
  trunkOffset = 0, sharedPort = false,
  points = null, bpmnFlow = null,
}: {
  src: string; dst: string; label?: string; style?: string;
  srcAnchor?: Side | null; dstAnchor?: Side | null;
  route?: string; via?: Point[];
  srcOffset?: Point; dstOffset?: Point;
  labelOffset?: Point; labelAnchor?: string;
  labelSmall?: boolean; labelPos?: Point | null;
  dashed?: boolean; noArrow?: boolean;
  trunkOffset?: number; sharedPort?: boolean;
  points?: Point[] | null; bpmnFlow?: string | null;
}): Edge {
  return {
    src, dst, label, style, srcAnchor, dstAnchor, route, via,
    srcOffset, dstOffset, labelOffset, labelAnchor, labelSmall, labelPos,
    dashed, noArrow, trunkOffset, sharedPort, points, bpmnFlow,
  };
}

export function makeDiagram({
  width = 0, height = 0, title = "", subtitle = "",
  components = [], regions = [], edges = [], layoutTrees = [],
}: {
  width?: number; height?: number; title?: string; subtitle?: string;
  components?: Component[]; regions?: Region[]; edges?: Edge[]; layoutTrees?: unknown[];
} = {}): Diagram {
  return { width, height, title, subtitle, components, regions, edges, layoutTrees };
}

// ── Lookups & geometry helpers ────────────────────────────────────────

export function componentHalf(c: Component): Point {
  if (c.size) return [(c.size[0] / 2) | 0, (c.size[1] / 2) | 0];
  return SHAPE_HALF[c.shape];
}

export function regionHalf(r: Region): Point {
  const [, , w, h] = r.bounds;
  return [(w / 2) | 0, (h / 2) | 0];
}

/**
 * Edge attach point on `node` for a given side.
 * For a Component, `bottom` pushes past `LABEL_HEIGHT` when the
 * component actually has a name or subtitle.
 */
export function anchor(node: Component | Region, side: Side): Point {
  // Region path — has `bounds`, no `pos`-as-Point.
  if ("bounds" in node) {
    return regionAnchor(node, side);
  }
  return componentAnchor(node, side);
}

function componentAnchor(c: Component, side: Side): Point {
  const [cx, cy] = c.pos;
  const [hw, hh] = componentHalf(c);
  const labelled = (c.name && c.name.length > 0) || (c.subtitle && c.subtitle.length > 0);
  const lh = labelled ? (LABEL_HEIGHT[c.shape] || 0) : 0;
  switch (side) {
    case "top":    return [cx, cy - hh];
    case "right":  return [cx + hw, cy];
    case "bottom": return [cx, cy + hh + lh];
    case "left":   return [cx - hw, cy];
    case "center": return [cx, cy];
  }
  throw new Error(`anchor: bad side ${side}`);
}

function regionAnchor(r: Region, side: Side): Point {
  const [x, y, w, h] = r.bounds;
  switch (side) {
    case "top":    return [x + ((w / 2) | 0), y];
    case "right":  return [x + w, y + ((h / 2) | 0)];
    case "bottom": return [x + ((w / 2) | 0), y + h];
    case "left":   return [x, y + ((h / 2) | 0)];
    case "center": return [x + ((w / 2) | 0), y + ((h / 2) | 0)];
  }
  throw new Error(`anchor: bad side ${side}`);
}

/**
 * Pick effective (srcAnchor, dstAnchor) for an edge. `null` slots are
 * filled from geometry: horizontal-biased — vertical wins only when
 * `|dy| > 2·|dx|`.
 */
export function resolveAnchors(e: Edge, src: Component | Region, dst: Component | Region): [Side, Side] {
  const { srcAnchor: sa, dstAnchor: da } = e;
  if (sa !== null && da !== null) return [sa, da];
  const [scx, scy] = anchor(src, "center");
  const [dcx, dcy] = anchor(dst, "center");
  const dx = dcx - scx, dy = dcy - scy;
  let autoSa: Side, autoDa: Side;
  if (Math.abs(dy) > 2 * Math.abs(dx)) {
    [autoSa, autoDa] = dy >= 0 ? (["bottom", "top"] as const) : (["top", "bottom"] as const);
  } else {
    [autoSa, autoDa] = dx >= 0 ? (["right", "left"] as const) : (["left", "right"] as const);
  }
  return [sa ?? autoSa, da ?? autoDa];
}

// ── Diagram node lookups ──────────────────────────────────────────────

export function getComponent(d: Diagram, id: string): Component {
  const c = d.components.find((c) => c.id === id);
  if (!c) throw new Error(`component ${JSON.stringify(id)} not in diagram`);
  return c;
}

export function getNode(d: Diagram, id: string): Component | Region {
  const c = d.components.find((c) => c.id === id);
  if (c) return c;
  const r = d.regions.find((r) => r.id === id);
  if (r) return r;
  throw new Error(`node ${JSON.stringify(id)} not in diagram (checked components + regions)`);
}

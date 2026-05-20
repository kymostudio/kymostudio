/**
 * Data model for the container diagram — JS mirror of `src/model.py`.
 *
 * Components, regions and edges are plain object literals (no classes).
 * `anchor(node, side)` and `resolveAnchors(edge, src, dst)` mimic the
 * Python implementations 1:1.
 */

/** @type {Record<string, [number, number]>} */
export const SHAPE_HALF = {
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
};

/** @type {Record<string, number>} */
export const LABEL_HEIGHT = {
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
};

// ── Factories (mirror Python @dataclass with defaults) ────────────────

export function makeComponent({
  id, name = "", subtitle = "", icon = "", shape = "box", accent = "green",
  pos = [0, 0],
  parent = null, align = null, alignGap = 24, alignOffset = [0, 0],
}) {
  return {
    id, name, subtitle, icon, shape, accent, pos,
    parent, align, alignGap, alignOffset,
  };
}

export function makeRegion({
  id, label = "", bounds = [0, 0, 0, 0], contains = [],
  padding = [24, 24], paddingBottom = null, style = "outer",
  icon = null, layout = null, pos = null, gap = 24, align = "center",
  visible = true, borderDash = null, borderStroke = null,
  labelAnchor = "middle", labelPosition = null,
}) {
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
}) {
  return {
    src, dst, label, style, srcAnchor, dstAnchor, route, via,
    srcOffset, dstOffset, labelOffset, labelAnchor, labelSmall, labelPos,
    dashed, noArrow, trunkOffset, sharedPort,
  };
}

export function makeDiagram({
  width = 0, height = 0, title = "", subtitle = "",
  components = [], regions = [], edges = [], layoutTrees = [],
} = {}) {
  return { width, height, title, subtitle, components, regions, edges, layoutTrees };
}

// ── Lookups & geometry helpers ────────────────────────────────────────

export function componentHalf(c) {
  return SHAPE_HALF[c.shape];
}

export function regionHalf(r) {
  const [, , w, h] = r.bounds;
  return [(w / 2) | 0, (h / 2) | 0];
}

/**
 * Edge attach point on `node` for a given side.
 * For a Component, `bottom` pushes past `LABEL_HEIGHT` when the
 * component actually has a name or subtitle.
 */
export function anchor(node, side) {
  // Region path — has `bounds`, no `pos`.
  if (node.bounds !== undefined && node.pos === undefined) {
    return regionAnchor(node, side);
  }
  // Component path — has `pos`.
  return componentAnchor(node, side);
}

function componentAnchor(c, side) {
  const [cx, cy] = c.pos;
  const [hw, hh] = SHAPE_HALF[c.shape];
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

function regionAnchor(r, side) {
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
export function resolveAnchors(e, src, dst) {
  let { srcAnchor: sa, dstAnchor: da } = e;
  if (sa !== null && da !== null) return [sa, da];
  const [scx, scy] = anchor(src, "center");
  const [dcx, dcy] = anchor(dst, "center");
  const dx = dcx - scx, dy = dcy - scy;
  let autoSa, autoDa;
  if (Math.abs(dy) > 2 * Math.abs(dx)) {
    [autoSa, autoDa] = dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
  } else {
    [autoSa, autoDa] = dx >= 0 ? ["right", "left"] : ["left", "right"];
  }
  return [sa || autoSa, da || autoDa];
}

// ── Diagram node lookups ──────────────────────────────────────────────

export function getComponent(d, id) {
  const c = d.components.find(c => c.id === id);
  if (!c) throw new Error(`component ${JSON.stringify(id)} not in diagram`);
  return c;
}

export function getNode(d, id) {
  const c = d.components.find(c => c.id === id);
  if (c) return c;
  const r = d.regions.find(r => r.id === id);
  if (r) return r;
  throw new Error(`node ${JSON.stringify(id)} not in diagram (checked components + regions)`);
}

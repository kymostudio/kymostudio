/**
 * `.kymo.json` serializer — `Diagram` → the kymo.json interchange format.
 *
 * JS mirror of `packages/python/src/kymo/to_kymojson.py`. `.kymo.json`
 * (KYMOJSON-MAP-001) is a versioned, lossless JSON serialization of a **resolved**
 * `Diagram` — the model both front-ends produce (DSL parser, BPMN importer) and
 * every back-end consumes. `parseKymoJson` (`from-kymojson.ts`) is the inverse.
 *
 * `modelDict()` is the canonical model body (snake_case keys, points/bounds as
 * arrays, `-0`→`0`, every field explicit, parse order preserved); the conformance
 * suite imports it as the single source of truth. See `docs/formats/kymo.json.md`.
 */
import type { Diagram } from "./model.js";
import type { LayoutNode } from "./layout.js";

export const FORMAT = "kymo.json";
export const VERSION = 1;

/** JSON-neutral normalisation: arrays recursed, `-0`→`0`; numbers kept as-is. */
function norm(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(norm);
  if (typeof value === "number") return value === 0 ? 0 : value; // collapse -0
  return value; // string | boolean
}

// Each model field (camelCase) → canonical snake_case key. Order matches the Python
// field lists so the emitted JSON is byte-for-byte identical across languages.
const COMPONENT_FIELDS: Record<string, string> = {
  id: "id", name: "name", subtitle: "subtitle", icon: "icon", shape: "shape",
  accent: "accent", pos: "pos", size: "size", parent: "parent", align: "align",
  alignGap: "align_gap", alignOffset: "align_offset", labelBox: "label_box",
};
const REGION_FIELDS: Record<string, string> = {
  id: "id", label: "label", bounds: "bounds", contains: "contains",
  padding: "padding", paddingBottom: "padding_bottom", style: "style", icon: "icon",
  layout: "layout", pos: "pos", gap: "gap", align: "align", visible: "visible",
  borderDash: "border_dash", borderStroke: "border_stroke",
  labelAnchor: "label_anchor", labelPosition: "label_position",
};
const EDGE_FIELDS: Record<string, string> = {
  src: "src", dst: "dst", label: "label", style: "style",
  srcAnchor: "src_anchor", dstAnchor: "dst_anchor", route: "route", via: "via",
  srcOffset: "src_offset", dstOffset: "dst_offset", labelOffset: "label_offset",
  labelAnchor: "label_anchor", labelSmall: "label_small", labelPos: "label_pos",
  dashed: "dashed", noArrow: "no_arrow", trunkOffset: "trunk_offset",
  sharedPort: "shared_port", points: "points", bpmnFlow: "bpmn_flow",
};

function obj(o: Record<string, unknown>, fieldMap: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [jsKey, snakeKey] of Object.entries(fieldMap)) out[snakeKey] = norm(o[jsKey]);
  return out;
}

/** Canonical layout-tree node (basic leaf/group form — the only shape stored on a
 *  resolved Diagram; region inlining/padding is a transient positioning step). */
function layoutNode(n: LayoutNode): unknown {
  if (n.t === "id") return { t: "id", id: n.id };
  return { t: "group", dir: n.dir, children: n.children.map(layoutNode) };
}

/** Resolved model as language-neutral JSON (the `.kymo.json` `diagram` body). */
export function modelDict(d: Diagram): Record<string, unknown> {
  return {
    width: norm(d.width),
    height: norm(d.height),
    title: d.title,
    subtitle: d.subtitle,
    components: d.components.map((c) => obj(c as unknown as Record<string, unknown>, COMPONENT_FIELDS)),
    regions: d.regions.map((r) => obj(r as unknown as Record<string, unknown>, REGION_FIELDS)),
    edges: d.edges.map((e) => obj(e as unknown as Record<string, unknown>, EDGE_FIELDS)),
    layout_trees: (d.layoutTrees as LayoutNode[]).map(layoutNode),
  };
}

/** Serialize a resolved `Diagram` to a `.kymo.json` string (versioned envelope).
 *  2-space indent + trailing newline, matching the Python emitter byte-for-byte. */
export function toKymoJson(d: Diagram): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, diagram: modelDict(d) }, null, 2) + "\n";
}

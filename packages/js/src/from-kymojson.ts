/**
 * `.kymo.json` loader — the kymo.json interchange format → a resolved `Diagram`.
 *
 * The inverse of `toKymoJson` (`to-kymojson.ts`; KYMOJSON-MAP-001), and the JS mirror
 * of `packages/python/src/kymo/from_kymojson.py`. A `.kymo.json` file already holds a
 * fully-resolved model (positions baked in), so callers render it directly with no
 * layout / alignment pass. Unknown top-level fields are ignored (forward compatibility).
 */
import {
  makeComponent, makeDiagram, makeEdge, makeRegion,
  type Diagram, type Point, type Shape, type Side,
} from "./model.js";
import type { LayoutNode } from "./layout.js";

export const FORMAT = "kymo.json";

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function layoutNode(n: Obj): LayoutNode {
  if (n.t === "id") return { t: "id", id: n.id };
  return { t: "group", dir: n.dir, children: (n.children as Obj[]).map(layoutNode) };
}

/** Load a `.kymo.json` string into a fully-resolved `Diagram`. */
export function parseKymoJson(text: string): Diagram {
  const payload = JSON.parse(text);
  if (payload.format !== FORMAT) {
    throw new Error(`not a kymo.json document (format=${JSON.stringify(payload.format)}, expected ${JSON.stringify(FORMAT)})`);
  }
  const d = payload.diagram as Obj;
  return makeDiagram({
    width: d.width, height: d.height, title: d.title, subtitle: d.subtitle,
    components: (d.components as Obj[]).map((c) => makeComponent({
      id: c.id, name: c.name, subtitle: c.subtitle, icon: c.icon, shape: c.shape as Shape,
      accent: c.accent, pos: c.pos as Point, size: c.size as Point | null, parent: c.parent,
      align: c.align, alignGap: c.align_gap, alignOffset: c.align_offset as Point,
      labelBox: c.label_box ?? null,
    })),
    regions: (d.regions as Obj[]).map((r) => makeRegion({
      id: r.id, label: r.label, bounds: r.bounds, contains: r.contains,
      padding: r.padding, paddingBottom: r.padding_bottom, style: r.style, icon: r.icon,
      layout: r.layout, pos: r.pos as Point | null, gap: r.gap, align: r.align,
      visible: r.visible, borderDash: r.border_dash, borderStroke: r.border_stroke,
      labelAnchor: r.label_anchor, labelPosition: r.label_position,
    })),
    edges: (d.edges as Obj[]).map((e) => makeEdge({
      src: e.src, dst: e.dst, label: e.label, style: e.style,
      srcAnchor: e.src_anchor as Side | null, dstAnchor: e.dst_anchor as Side | null,
      route: e.route, via: e.via as Point[], srcOffset: e.src_offset as Point,
      dstOffset: e.dst_offset as Point, labelOffset: e.label_offset as Point,
      labelAnchor: e.label_anchor, labelSmall: e.label_small, labelPos: e.label_pos as Point | null,
      dashed: e.dashed, noArrow: e.no_arrow, trunkOffset: e.trunk_offset,
      sharedPort: e.shared_port, points: e.points as Point[] | null, bpmnFlow: e.bpmn_flow,
    })),
    layoutTrees: ((d.layout_trees ?? []) as Obj[]).map(layoutNode),
  });
}

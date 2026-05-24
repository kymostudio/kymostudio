/**
 * BPMN 2.0 XML emitter — the inverse of {@link parseBpmn} (`from-bpmn.ts`).
 *
 * Turns a resolved {@link Diagram} of `bpmn-*` glyphs (imported from a `.bpmn`
 * file or authored with the `bpmn { }` DSL block) back into a well-formed
 * BPMN 2.0 document: a `<bpmn:process>` (or a `<bpmn:collaboration>` of
 * `<participant>`s over one process, when the diagram has pools) plus a
 * `<bpmndi:BPMNDiagram>` carrying the Diagram-Interchange geometry. This
 * enables a `.bpmn` → kymo → `.bpmn` round-trip.
 *
 * Scope: events, tasks, gateways, sub-processes, and sequence / message /
 * association flows, plus pools / lanes / groups / expanded sub-processes.
 * `Component.pos` is a centre and `<dc:Bounds>` is a top-left; `Region.bounds`
 * is already top-left. A DI-bearing diagram round-trips its geometry — region
 * bounds exactly, node centres within ±1px on odd-width shapes (centre↔top-left
 * rounding).
 *
 * The element/flow mapping is the exact inverse of `from-bpmn.ts`'s
 * classification; the inverse tables are *derived* from that module's maps
 * (the single source of truth) so the two stay in lockstep — a unit test
 * asserts the round-trip. JS mirror of the Python `to_bpmn.py`.
 *
 * Out of scope (the importer flattens these on re-import, so the round-trip
 * fixpoint doesn't need them): faithful multi-pool node→process assignment and
 * nested `<childLaneSet>` hierarchy — pools beyond the first are emitted
 * black-box and lanes are emitted flat.
 */
import { EVENT_DEF, EVENT_SHAPE, GATEWAY_MARKER, TASK_MARKER } from "./from-bpmn.js";
import type { Component, Diagram, Point } from "./model.js";
import { pyRound } from "./round.js";

// ── Namespaces ──────────────────────────────────────────────────────────
const BPMN = "http://www.omg.org/spec/BPMN/20100524/MODEL";
const BPMNDI = "http://www.omg.org/spec/BPMN/20100524/DI";
const DC = "http://www.omg.org/spec/DD/20100524/DC";
const DI = "http://www.omg.org/spec/DD/20100524/DI";

// ── Inverse maps — derived from from-bpmn (single source of truth) ────────
// event shape → element tag. `intermediateCatchEvent` wins over `…Throw` (both
// import to `bpmn-intermediate`, so the Diagram can't distinguish them).
export const EVENT_TAG: Record<string, string> = {};
for (const [tag, shape] of Object.entries(EVENT_SHAPE)) {
  if (!(shape in EVENT_TAG)) EVENT_TAG[shape] = tag;
}
// marker → eventDefinition child tag (the empty marker has no child).
export const EVENTDEF_TAG: Record<string, string> = {};
for (const [tag, marker] of Object.entries(EVENT_DEF)) {
  if (marker) EVENTDEF_TAG[marker] = tag;
}
// task marker → element tag (`""` → `task`, not `callActivity`).
export const TASK_TAG: Record<string, string> = {};
for (const [tag, marker] of Object.entries(TASK_MARKER)) {
  if (!(marker in TASK_TAG)) TASK_TAG[marker] = tag;
}
// gateway marker → element tag (`""` → `exclusiveGateway` with the X not drawn).
export const GW_TAG: Record<string, string> = {};
for (const [tag, marker] of Object.entries(GATEWAY_MARKER)) GW_TAG[marker] = tag;
GW_TAG[""] = "exclusiveGateway";

export const FLOW_TAG: Record<string, string> = {
  sequence: "sequenceFlow", default: "sequenceFlow", conditional: "sequenceFlow",
  message: "messageFlow", association: "association",
};

const DEFAULT_SIZE: Point = [100, 80];

type Kind = "event" | "task" | "gateway" | "subprocess" | "data" | "annotation";

/** Return `[element_tag, kind]` for a component's `(shape, icon)`. */
function classify(c: Component): [string, Kind] {
  const s = c.shape;
  const m = c.icon;
  const ev = EVENT_TAG[s];
  if (ev) return [ev, "event"];
  if (s === "bpmn-task") return [TASK_TAG[m] ?? "task", "task"];
  if (s === "bpmn-gateway") return [GW_TAG[m] ?? "exclusiveGateway", "gateway"];
  if (s === "bpmn-subprocess") return ["subProcess", "subprocess"];
  if (s === "bpmn-data-object") return ["dataObjectReference", "data"];
  if (s === "bpmn-data-store") return ["dataStoreReference", "data"];
  if (s === "bpmn-annotation") return ["textAnnotation", "annotation"];
  return ["task", "task"];
}

/** Is a component centre inside a region's (x, y, w, h) box? */
function within(pos: Point, bounds: [number, number, number, number]): boolean {
  const [x, y, w, h] = bounds;
  const [cx, cy] = pos;
  return x <= cx && cx <= x + w && y <= cy && cy <= y + h;
}

// ── Tiny XML builder (dependency-free; replaces Python's ElementTree) ─────
interface El {
  tag: string;                       // prefixed, e.g. "bpmn:process"
  attrs: Record<string, string>;
  children: El[];
  text: string;
}

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

function el(tag: string, attrs: Record<string, string | number | undefined> = {}): El {
  const a: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== "") a[k] = String(v);
  return { tag, attrs: a, children: [], text: "" };
}

/** Append a child element to `parent` and return it. */
function sub(parent: El, tag: string, attrs: Record<string, string | number | undefined> = {}): El {
  const child = el(tag, attrs);
  parent.children.push(child);
  return child;
}

/** Serialize an element tree to indented XML (2-space, mirrors ET.indent). */
function serialize(node: El, depth = 0): string {
  const pad = "  ".repeat(depth);
  const attrs = Object.entries(node.attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
  if (node.children.length === 0 && node.text === "") return `${pad}<${node.tag}${attrs}/>`;
  if (node.children.length === 0) return `${pad}<${node.tag}${attrs}>${esc(node.text)}</${node.tag}>`;
  const inner = node.children.map((c) => serialize(c, depth + 1)).join("\n");
  return `${pad}<${node.tag}${attrs}>\n${inner}\n${pad}</${node.tag}>`;
}

/** Render a {@link Diagram} to a BPMN 2.0 XML string. */
export function toBpmn(diagram: Diagram): string {
  const defs = el("bpmn:definitions", {
    "xmlns:bpmn": BPMN, "xmlns:bpmndi": BPMNDI, "xmlns:dc": DC, "xmlns:di": DI,
    id: "defs_kymo",
  });

  const pools = diagram.regions.filter((r) => r.style === "pool");
  const lanes = diagram.regions.filter((r) => r.style === "lane");
  const groups = diagram.regions.filter((r) => r.style === "outer");
  const subprocs = diagram.regions.filter((r) => r.style === "inner");
  const useCollab = pools.length > 0;

  const collab = useCollab ? sub(defs, "bpmn:collaboration", { id: "Collab_kymo" }) : null;
  const proc = sub(defs, "bpmn:process", { id: "Process_kymo", isExecutable: "false" });

  // ── pools → participants (first owns the single process, rest black-box) ──
  pools.forEach((r, i) => {
    sub(collab as El, "bpmn:participant", {
      id: r.id, name: r.label, processRef: i === 0 ? "Process_kymo" : undefined,
    });
  });

  // ── lanes → laneSet, with geometric flowNodeRef membership (for validity) ──
  if (lanes.length > 0) {
    const laneset = sub(proc, "bpmn:laneSet", { id: "LaneSet_kymo" });
    const laneEls = new Map(lanes.map((r) => [r.id, sub(laneset, "bpmn:lane", { id: r.id, name: r.label })]));
    for (const c of diagram.components) {
      const lane = lanes.find((r) => within(c.pos, r.bounds));   // one lane per node
      if (lane) sub(laneEls.get(lane.id) as El, "bpmn:flowNodeRef").text = c.id;
    }
  }

  // ── semantic flow nodes ──
  const nodes = new Map<string, El>();
  for (const c of diagram.components) {
    const [tag, kind] = classify(c);
    const node = sub(proc, "bpmn:" + tag, { id: c.id });
    if (kind === "annotation") {
      sub(node, "bpmn:text").text = c.name;
    } else {
      if (c.name) node.attrs.name = c.name;
      const def = EVENTDEF_TAG[c.icon];
      if (kind === "event" && def) sub(node, "bpmn:" + def);
    }
    nodes.set(c.id, node);
  }

  // ── groups + expanded sub-processes → semantic placeholders ──
  for (const r of groups) sub(proc, "bpmn:group", { id: r.id, name: r.label });
  for (const r of subprocs) sub(proc, "bpmn:subProcess", { id: r.id, name: r.label });

  // ── semantic flows; message flows live in the collaboration ──
  const flowIds = diagram.edges.map((_, i) => `flow${i}`);
  diagram.edges.forEach((e, i) => {
    const fid = flowIds[i];
    const parent = useCollab && e.bpmnFlow === "message" ? (collab as El) : proc;
    const flow = sub(parent, "bpmn:" + (FLOW_TAG[e.bpmnFlow ?? "sequence"] ?? "sequenceFlow"), {
      id: fid, sourceRef: e.src, targetRef: e.dst, name: e.label,
    });
    if (e.bpmnFlow === "conditional") {
      sub(flow, "bpmn:conditionExpression").text = e.label || "true";
    } else if (e.bpmnFlow === "default") {
      const srcNode = nodes.get(e.src);
      if (srcNode) srcNode.attrs.default = fid;   // default flow named on its source node
    }
  });

  // ── DI plane — references the collaboration when pools exist ──
  const plane = sub(sub(defs, "bpmndi:BPMNDiagram", { id: "Diagram_kymo" }), "bpmndi:BPMNPlane", {
    id: "Plane_kymo", bpmnElement: useCollab ? "Collab_kymo" : "Process_kymo",
  });
  for (const r of diagram.regions) {                  // region shapes first (behind nodes)
    const shape = sub(plane, "bpmndi:BPMNShape", { bpmnElement: r.id });
    if (r.style === "pool" || r.style === "lane") shape.attrs.isHorizontal = "true";
    else if (r.style === "inner") shape.attrs.isExpanded = "true";  // re-imports expanded
    const [rx, ry, rw, rh] = r.bounds;
    sub(shape, "dc:Bounds", { x: rx, y: ry, width: rw, height: rh });
  }
  for (const c of diagram.components) {
    const [w, h] = c.size ?? DEFAULT_SIZE;
    const shape = sub(plane, "bpmndi:BPMNShape", { bpmnElement: c.id });
    if (c.shape === "bpmn-gateway" && c.icon === "exclusive") shape.attrs.isMarkerVisible = "true";
    sub(shape, "dc:Bounds", {
      x: pyRound(c.pos[0] - w / 2), y: pyRound(c.pos[1] - h / 2), width: w, height: h,
    });
  }
  diagram.edges.forEach((e, i) => {
    const edge = sub(plane, "bpmndi:BPMNEdge", { bpmnElement: flowIds[i] });
    for (const [px, py] of e.points ?? []) sub(edge, "di:waypoint", { x: px, y: py });
    if (e.label && e.labelPos) {
      const [lw, lh] = [40, 14];
      const label = sub(edge, "bpmndi:BPMNLabel");
      sub(label, "dc:Bounds", {
        x: pyRound(e.labelPos[0] - lw / 2), y: pyRound(e.labelPos[1] - lh / 2), width: lw, height: lh,
      });
    }
  });

  return '<?xml version="1.0" encoding="UTF-8"?>\n' + serialize(defs) + "\n";
}

/**
 * BPMN 2.0 XML importer — turns a standard `.bpmn` file (Camunda Modeler,
 * bpmn.io, Signavio, …) into a fully-resolved {@link Diagram} that
 * {@link renderSVG} can draw. Geometry comes from the file's Diagram-
 * Interchange section (`BPMNShape`/`dc:Bounds`, `BPMNEdge`/`di:waypoint`),
 * so no layout pass is needed.
 *
 * Equivalent to the Python `from_bpmn.py`; element types map to `bpmn-*`
 * shapes (drawn by `bpmn-shapes.ts`) or, for pools / lanes / expanded
 * sub-processes, to regions.
 */
import {
  makeComponent, makeDiagram, makeEdge, makeRegion,
  type Component, type Diagram, type Edge, type Point, type Region, type Shape,
} from "./model.js";
import { iterAll, parseXml, type XmlEl } from "./xml.js";

const MARGIN = 30;

const EVENT_SHAPE: Record<string, Shape> = {
  startEvent: "bpmn-start",
  endEvent: "bpmn-end",
  intermediateCatchEvent: "bpmn-intermediate",
  intermediateThrowEvent: "bpmn-intermediate",
  boundaryEvent: "bpmn-boundary",
};

const EVENT_DEF: Record<string, string> = {
  messageEventDefinition: "message",
  timerEventDefinition: "timer",
  errorEventDefinition: "error",
  signalEventDefinition: "signal",
  terminateEventDefinition: "terminate",
  escalationEventDefinition: "escalation",
  conditionalEventDefinition: "conditional",
  linkEventDefinition: "link",
  compensateEventDefinition: "compensation",
  cancelEventDefinition: "",
};

const TASK_MARKER: Record<string, string> = {
  task: "", userTask: "user", serviceTask: "service", scriptTask: "script",
  sendTask: "send", receiveTask: "receive", manualTask: "manual",
  businessRuleTask: "rule", callActivity: "",
};

const GATEWAY_MARKER: Record<string, string> = {
  exclusiveGateway: "exclusive", parallelGateway: "parallel",
  inclusiveGateway: "inclusive", eventBasedGateway: "event",
  complexGateway: "complex",
};

const SUBPROCESS_TAGS = new Set(["subProcess", "transaction", "adHocSubProcess"]);

const num = (v: string | undefined): number => (v ? parseFloat(v) : 0);

function bounds(el: XmlEl): [number, number, number, number] | null {
  for (const ch of el.children) {
    if (ch.tag === "Bounds") {
      return [num(ch.attrs.x), num(ch.attrs.y), num(ch.attrs.width), num(ch.attrs.height)];
    }
  }
  return null;
}

function labelCenter(el: XmlEl): Point | null {
  for (const ch of el.children) {
    if (ch.tag === "BPMNLabel") {
      const b = bounds(ch);
      if (b) return [b[0] + b[2] / 2, b[1] + b[3] / 2];
    }
  }
  return null;
}

function eventMarker(el: XmlEl): string {
  for (const ch of el.children) {
    const m = EVENT_DEF[ch.tag];
    if (m !== undefined) return m;
  }
  return "";
}

function annotationText(el: XmlEl): string {
  for (const ch of el.children) if (ch.tag === "text") return ch.text.trim();
  return "";
}

/** (shape, marker) for a Component, or null when the element is a Region. */
function classifyNode(tag: string, el: XmlEl, di: XmlEl): [Shape, string] | null {
  if (tag in EVENT_SHAPE) return [EVENT_SHAPE[tag], eventMarker(el)];
  if (tag in TASK_MARKER) return ["bpmn-task", TASK_MARKER[tag]];
  if (tag in GATEWAY_MARKER) {
    let marker = GATEWAY_MARKER[tag];
    // exclusive X only when DI opts in (bpmn.io default leaves it plain)
    if (tag === "exclusiveGateway" && di.attrs.isMarkerVisible !== "true") marker = "";
    return ["bpmn-gateway", marker];
  }
  if (tag === "dataObjectReference" || tag === "dataInput" || tag === "dataOutput") return ["bpmn-data-object", ""];
  if (tag === "dataStoreReference") return ["bpmn-data-store", ""];
  if (tag === "textAnnotation") return ["bpmn-annotation", ""];
  if (SUBPROCESS_TAGS.has(tag)) {
    const b = bounds(di)!;
    const exp = di.attrs.isExpanded;
    const expanded = exp === "true" || (exp === undefined && b[2] > 130 && b[3] > 90);
    if (expanded) return null;          // → Region
    return ["bpmn-subprocess", ""];
  }
  return null;
}

function flowKind(tag: string, el: XmlEl | undefined, byId: Map<string, XmlEl>): string {
  if (tag === "messageFlow") return "message";
  if (tag === "association" || tag === "dataInputAssociation" || tag === "dataOutputAssociation") return "association";
  if (tag === "sequenceFlow" && el) {
    const src = byId.get(el.attrs.sourceRef ?? "");
    if (src && src.attrs.default === el.attrs.id) return "default";
    const srcIsGateway = src ? src.tag.endsWith("Gateway") : false;
    if (!srcIsGateway && el.children.some((c) => c.tag === "conditionExpression")) return "conditional";
  }
  return "sequence";
}

/** Parse BPMN 2.0 XML into a resolved Diagram. */
export function parseBpmn(xmlText: string): Diagram {
  const root = parseXml(xmlText);

  const byId = new Map<string, XmlEl>();
  const diShapes: XmlEl[] = [];
  const diEdges: XmlEl[] = [];
  for (const el of iterAll(root)) {
    const id = el.attrs.id;
    if (id && !byId.has(id)) byId.set(id, el);
    if (el.tag === "BPMNShape") diShapes.push(el);
    else if (el.tag === "BPMNEdge") diEdges.push(el);
  }

  const components: Component[] = [];
  const regions: Region[] = [];
  const edges: Edge[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  const track = (x: number, y: number, w = 0, h = 0) => { xs.push(x, x + w); ys.push(y, y + h); };

  // ── shapes → components / regions ───────────────────────────────────
  for (const shape of diShapes) {
    const ref = shape.attrs.bpmnElement;
    const el = ref ? byId.get(ref) : undefined;
    const b = bounds(shape);
    if (!el || !b) continue;
    const [x, y, w, h] = b;
    track(x, y, w, h);
    const tag = el.tag;
    const name = (el.attrs.name ?? "").trim();
    const bnd: [number, number, number, number] = [Math.round(x), Math.round(y), Math.round(w), Math.round(h)];

    if (tag === "participant") { regions.push(makeRegion({ id: ref, label: name, bounds: bnd, style: "pool" })); continue; }
    if (tag === "lane") { regions.push(makeRegion({ id: ref, label: name, bounds: bnd, style: "lane" })); continue; }
    if (tag === "group") { regions.push(makeRegion({ id: ref, label: name, bounds: bnd, style: "outer" })); continue; }

    const cls = classifyNode(tag, el, shape);
    if (cls === null && SUBPROCESS_TAGS.has(tag)) {
      regions.push(makeRegion({ id: ref, label: name, bounds: bnd, style: "inner", labelPosition: "inside" }));
      continue;
    }
    if (cls === null) continue;

    const [cshape, marker] = cls;
    components.push(makeComponent({
      id: ref, name: tag === "textAnnotation" ? annotationText(el) : name,
      icon: marker, shape: cshape, accent: "blue",
      pos: [Math.round(x + w / 2), Math.round(y + h / 2)],
      size: [Math.round(w), Math.round(h)],
    }));
  }

  // ── edges → flows ───────────────────────────────────────────────────
  for (const de of diEdges) {
    const ref = de.attrs.bpmnElement;
    const el = ref ? byId.get(ref) : undefined;
    const wps: Point[] = de.children
      .filter((c) => c.tag === "waypoint")
      .map((wp) => [Math.round(num(wp.attrs.x)), Math.round(num(wp.attrs.y))] as Point);
    if (wps.length < 2) continue;
    for (const [px, py] of wps) track(px, py);

    const tag = el ? el.tag : "sequenceFlow";
    const lc = labelCenter(de);
    edges.push(makeEdge({
      src: (el?.attrs.sourceRef ?? ""), dst: (el?.attrs.targetRef ?? ""),
      label: (el?.attrs.name ?? "").trim(), points: wps, bpmnFlow: flowKind(tag, el, byId),
      labelPos: lc ? [Math.round(lc[0]), Math.round(lc[1])] : null,
    }));
  }

  // ── normalise into a tidy top-left-anchored canvas ──────────────────
  if (xs.length === 0) { xs.push(0); ys.push(0); }
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const dx = Math.round(MARGIN - minX), dy = Math.round(MARGIN - minY);
  const width = Math.round(Math.max(...xs) - minX + 2 * MARGIN);
  const height = Math.round(Math.max(...ys) - minY + 2 * MARGIN);

  for (const c of components) c.pos = [c.pos[0] + dx, c.pos[1] + dy];
  for (const r of regions) { const [bx, by, bw, bh] = r.bounds; r.bounds = [bx + dx, by + dy, bw, bh]; }
  for (const e of edges) {
    e.points = (e.points ?? []).map(([px, py]) => [px + dx, py + dy] as Point);
    if (e.labelPos) e.labelPos = [e.labelPos[0] + dx, e.labelPos[1] + dy];
  }

  // pools first (drawn underneath), then lanes, then containers
  regions.sort((a, b) => rank(a.style) - rank(b.style));

  return makeDiagram({ width, height, components, regions, edges });
}

function rank(style: string): number {
  return style === "pool" ? 0 : style === "lane" ? 1 : 2;
}

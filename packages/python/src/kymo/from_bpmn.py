"""BPMN 2.0 XML importer.

Turns a standard ``.bpmn`` file (Camunda Modeler, bpmn.io, Signavio, …)
into a fully-resolved `model.Diagram` that the existing SVG renderer can
draw. We rely on the file's **Diagram-Interchange** (DI) section for all
geometry:

  * ``<bpmndi:BPMNShape>`` → ``<dc:Bounds x y width height>`` gives each
    node's box (and `isHorizontal` / `isExpanded` hints for pools and
    sub-processes).
  * ``<bpmndi:BPMNEdge>`` → a list of ``<di:waypoint x y>`` gives each
    flow's exact polyline.

Because the coordinates are authored in the file, no layout pass is
needed — `cli` skips `layout()` / `resolve_alignments()` for `.bpmn`
sources. Every element type maps to a `bpmn-*` shape (drawn by
`bpmn_shapes.py`) or, for pools / lanes / expanded sub-processes, to a
`Region`.

Namespaces are ignored throughout (we match on the *local* tag name) so
the importer is agnostic to the ``bpmn:`` / ``bpmn2:`` / default-namespace
prefix a given tool emits.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET

from .model import Component, Diagram, Edge, Region

MARGIN = 30


# ── Element-type → kymo shape mappings ──────────────────────────────────
_EVENT_SHAPE = {
    "startEvent":              "bpmn-start",
    "endEvent":                "bpmn-end",
    "intermediateCatchEvent":  "bpmn-intermediate",
    "intermediateThrowEvent":  "bpmn-intermediate",
    "boundaryEvent":           "bpmn-boundary",
}

# event-definition child tag → marker key understood by bpmn_shapes
_EVENT_DEF = {
    "messageEventDefinition":      "message",
    "timerEventDefinition":        "timer",
    "errorEventDefinition":        "error",
    "signalEventDefinition":       "signal",
    "terminateEventDefinition":    "terminate",
    "escalationEventDefinition":   "escalation",
    "conditionalEventDefinition":  "conditional",
    "linkEventDefinition":         "link",
    "compensateEventDefinition":   "compensation",
    "cancelEventDefinition":       "",          # X drawn by tool; no glyph here
}

_TASK_MARKER = {
    "task":              "",
    "userTask":          "user",
    "serviceTask":       "service",
    "scriptTask":        "script",
    "sendTask":          "send",
    "receiveTask":       "receive",
    "manualTask":        "manual",
    "businessRuleTask":  "rule",
    "callActivity":      "",
}

_GATEWAY_MARKER = {
    "exclusiveGateway":  "exclusive",
    "parallelGateway":   "parallel",
    "inclusiveGateway":  "inclusive",
    "eventBasedGateway": "event",
    "complexGateway":    "complex",
}

_SUBPROCESS_TAGS = {"subProcess", "transaction", "adHocSubProcess"}


# ── XML helpers ─────────────────────────────────────────────────────────
def _local(tag: str) -> str:
    """Strip an XML namespace: ``{http://…}startEvent`` → ``startEvent``."""
    return tag.rsplit("}", 1)[-1]


def _num(v: str | None) -> float:
    return float(v) if v not in (None, "") else 0.0


def _bounds(shape: ET.Element):
    for ch in shape:
        if _local(ch.tag) == "Bounds":
            return (_num(ch.get("x")), _num(ch.get("y")),
                    _num(ch.get("width")), _num(ch.get("height")))
    return None


def _label_center(edge_or_shape: ET.Element):
    """Return the centre of a child <BPMNLabel>'s bounds, or None."""
    for ch in edge_or_shape:
        if _local(ch.tag) == "BPMNLabel":
            b = _bounds(ch)
            if b:
                x, y, w, h = b
                return (x + w / 2, y + h / 2)
    return None


# ── Classification ──────────────────────────────────────────────────────
def _event_marker(elem: ET.Element) -> str:
    for ch in elem:
        m = _EVENT_DEF.get(_local(ch.tag))
        if m is not None:
            return m
    return ""


def _annotation_text(elem: ET.Element) -> str:
    for ch in elem:
        if _local(ch.tag) == "text":
            return (ch.text or "").strip()
    return ""


def _classify_node(tag: str, elem: ET.Element, di_shape: ET.Element):
    """Map a semantic element to (shape, marker) for a Component, or return
    None when it should become a Region (pool / lane / expanded sub-process
    / group) — handled by the caller."""
    if tag in _EVENT_SHAPE:
        return _EVENT_SHAPE[tag], _event_marker(elem)
    if tag in _TASK_MARKER:
        return "bpmn-task", _TASK_MARKER[tag]
    if tag in _GATEWAY_MARKER:
        marker = _GATEWAY_MARKER[tag]
        # Exclusive gateways draw the X only when the DI opts in
        # (bpmndi:BPMNShape isMarkerVisible="true") — bpmn.io's default
        # leaves it as a plain diamond.
        if tag == "exclusiveGateway" and di_shape.get("isMarkerVisible") != "true":
            marker = ""
        return "bpmn-gateway", marker
    if tag in ("dataObjectReference", "dataInput", "dataOutput"):
        return "bpmn-data-object", ""
    if tag == "dataStoreReference":
        return "bpmn-data-store", ""
    if tag == "textAnnotation":
        return "bpmn-annotation", ""
    if tag in _SUBPROCESS_TAGS:
        x, y, w, h = _bounds(di_shape)
        expanded = di_shape.get("isExpanded")
        is_expanded = (expanded == "true") or (expanded is None and w > 130 and h > 90)
        if is_expanded:
            return None              # → Region
        return "bpmn-subprocess", ""
    return None


# ── Public API ──────────────────────────────────────────────────────────
def parse(xml_text: str) -> Diagram:
    """Parse BPMN 2.0 XML into a resolved `Diagram`."""
    root = ET.fromstring(xml_text)

    # Index every element carrying an id (semantic + DI alike).
    by_id: dict[str, ET.Element] = {}
    for el in root.iter():
        eid = el.get("id")
        if eid and eid not in by_id:
            by_id[eid] = el

    # Collect DI shapes & edges (there may be several BPMNPlane blocks).
    di_shapes: list[ET.Element] = []
    di_edges: list[ET.Element] = []
    for el in root.iter():
        t = _local(el.tag)
        if t == "BPMNShape":
            di_shapes.append(el)
        elif t == "BPMNEdge":
            di_edges.append(el)

    components: list[Component] = []
    regions: list[Region] = []
    edges: list[Edge] = []
    xs: list[float] = []
    ys: list[float] = []

    def track(x, y, w=0.0, h=0.0):
        xs.extend((x, x + w))
        ys.extend((y, y + h))

    # ── Shapes → components / regions ───────────────────────────────────
    for shape in di_shapes:
        ref = shape.get("bpmnElement")
        elem = by_id.get(ref) if ref else None
        if elem is None:
            continue
        b = _bounds(shape)
        if not b:
            continue
        x, y, w, h = b
        track(x, y, w, h)
        tag = _local(elem.tag)
        name = (elem.get("name") or "").strip()

        if tag == "participant":
            regions.append(Region(id=ref, label=name, bounds=(round(x), round(y),
                                   round(w), round(h)), style="pool"))
            continue
        if tag == "lane":
            regions.append(Region(id=ref, label=name, bounds=(round(x), round(y),
                                   round(w), round(h)), style="lane"))
            continue
        if tag == "group":
            regions.append(Region(id=ref, label=name, bounds=(round(x), round(y),
                                   round(w), round(h)), style="outer"))
            continue

        classified = _classify_node(tag, elem, shape)
        if classified is None and tag in _SUBPROCESS_TAGS:
            # expanded sub-process → container region
            regions.append(Region(id=ref, label=name, bounds=(round(x), round(y),
                                   round(w), round(h)), style="inner",
                                   label_position="inside"))
            continue
        if classified is None:
            continue

        cshape, marker = classified
        if tag == "textAnnotation":
            name = _annotation_text(elem)
        components.append(Component(
            id=ref, name=name, subtitle="", icon=marker, shape=cshape,
            accent="blue", pos=(round(x + w / 2), round(y + h / 2)),
            size=(round(w), round(h)),
        ))

    # ── Edges → flows ───────────────────────────────────────────────────
    for de in di_edges:
        ref = de.get("bpmnElement")
        elem = by_id.get(ref) if ref else None
        wps = [(round(_num(wp.get("x"))), round(_num(wp.get("y"))))
               for wp in de if _local(wp.tag) == "waypoint"]
        if len(wps) < 2:
            continue
        for px, py in wps:
            track(px, py)

        tag = _local(elem.tag) if elem is not None else "sequenceFlow"
        flow = _flow_kind(tag, elem, by_id)
        name = (elem.get("name") or "").strip() if elem is not None else ""
        src = (elem.get("sourceRef") if elem is not None else None) or ""
        dst = (elem.get("targetRef") if elem is not None else None) or ""
        label_pos = _label_center(de)

        edges.append(Edge(
            src=src, dst=dst, label=name, points=wps, bpmn_flow=flow,
            label_pos=(round(label_pos[0]), round(label_pos[1])) if label_pos else None,
        ))

    # ── Normalise coordinates into a tidy top-left-anchored canvas ──────
    if not xs:
        xs, ys = [0.0], [0.0]
    min_x, min_y = min(xs), min(ys)
    dx, dy = MARGIN - min_x, MARGIN - min_y
    width = round(max(xs) - min_x + 2 * MARGIN)
    height = round(max(ys) - min_y + 2 * MARGIN)

    idx, idy = round(dx), round(dy)
    for c in components:
        c.pos = (c.pos[0] + idx, c.pos[1] + idy)
    for r in regions:
        bx, by, bw, bh = r.bounds
        r.bounds = (bx + idx, by + idy, bw, bh)
    for e in edges:
        e.points = [(px + idx, py + idy) for px, py in (e.points or [])]
        if e.label_pos is not None:
            e.label_pos = (e.label_pos[0] + idx, e.label_pos[1] + idy)

    # Pools/lanes first (drawn underneath), then sub-process containers,
    # so child shapes render on top of their enclosing boxes.
    regions.sort(key=lambda r: 0 if r.style == "pool" else (1 if r.style == "lane" else 2))

    return Diagram(width=width, height=height, components=components,
                   regions=regions, edges=edges)


def _flow_kind(tag: str, elem, by_id) -> str:
    if tag == "messageFlow":
        return "message"
    if tag in ("association", "dataInputAssociation", "dataOutputAssociation"):
        return "association"
    if tag == "sequenceFlow" and elem is not None:
        src = by_id.get(elem.get("sourceRef") or "")
        # default flow → the source node names this flow in its `default`
        if src is not None and src.get("default") == elem.get("id"):
            return "default"
        # conditional flow → has a <conditionExpression> child. The little
        # diamond marker is only drawn when the source is an *activity*; a
        # gateway already encodes the branch, so we leave it plain there.
        src_is_gateway = src is not None and _local(src.tag).endswith("Gateway")
        if not src_is_gateway:
            for ch in elem:
                if _local(ch.tag) == "conditionExpression":
                    return "conditional"
    return "sequence"

"""BPMN 2.0 XML emitter — the inverse of `from_bpmn` (BPD-DGM-001).

Turns a resolved `Diagram` of `bpmn-*` glyphs (imported from a `.bpmn` file or
authored with the `bpmn { }` DSL block) back into a well-formed BPMN 2.0
document: a single `<bpmn:process>` (semantic model) plus a
`<bpmndi:BPMNDiagram>` (Diagram-Interchange geometry). This enables a
`.bpmn` → kymo → `.bpmn` round-trip.

Scope (this phase): a single process — events, tasks, gateways, and
sequence / message / association flows. Pools / lanes / collaboration are not
yet emitted (regions are dropped); that is planned for a later phase.
`Component.pos` is a centre and `<dc:Bounds>` is a top-left, so a DI-bearing
diagram round-trips its geometry exactly.

The element/flow mapping is the exact inverse of `from_bpmn`'s classification
(BPD-DGM-001); the inverse tables are *derived* from that module's maps so the
two stay in lockstep (a unit test asserts the round-trip).
"""
from __future__ import annotations

import xml.etree.ElementTree as ET

from .from_bpmn import _EVENT_DEF, _EVENT_SHAPE, _GATEWAY_MARKER, _TASK_MARKER
from .model import Component, Diagram

# ── Namespaces ──────────────────────────────────────────────────────────
BPMN = "http://www.omg.org/spec/BPMN/20100524/MODEL"
BPMNDI = "http://www.omg.org/spec/BPMN/20100524/DI"
DC = "http://www.omg.org/spec/DD/20100524/DC"
DI = "http://www.omg.org/spec/DD/20100524/DI"
for _prefix, _uri in (("bpmn", BPMN), ("bpmndi", BPMNDI), ("dc", DC), ("di", DI)):
    ET.register_namespace(_prefix, _uri)

# ── Inverse maps — derived from from_bpmn (single source of truth) ────────
# event shape → element tag. `intermediateCatchEvent` wins over `…Throw` (both
# import to `bpmn-intermediate`, so the Diagram can't distinguish them).
_EVENT_TAG: dict[str, str] = {}
for _tag, _shape in _EVENT_SHAPE.items():
    _EVENT_TAG.setdefault(_shape, _tag)
# marker → eventDefinition child tag (the empty marker has no child).
_EVENTDEF_TAG = {m: tag for tag, m in _EVENT_DEF.items() if m}
# task marker → element tag (`""` → `task`, not `callActivity`).
_TASK_TAG: dict[str, str] = {}
for _tag, _m in _TASK_MARKER.items():
    _TASK_TAG.setdefault(_m, _tag)
# gateway marker → element tag (`""` → `exclusiveGateway` with the X not drawn).
_GW_TAG = {m: tag for tag, m in _GATEWAY_MARKER.items()}
_GW_TAG[""] = "exclusiveGateway"

_FLOW_TAG = {
    "sequence": "sequenceFlow", "default": "sequenceFlow", "conditional": "sequenceFlow",
    "message": "messageFlow", "association": "association",
}
_DEFAULT_SIZE = (100, 80)


def _classify(c: Component) -> tuple[str, str]:
    """Return `(element_tag, kind)` for a component's `(shape, icon)`."""
    s, m = c.shape, c.icon
    if s in _EVENT_TAG:
        return _EVENT_TAG[s], "event"
    if s == "bpmn-task":
        return _TASK_TAG.get(m, "task"), "task"
    if s == "bpmn-gateway":
        return _GW_TAG.get(m, "exclusiveGateway"), "gateway"
    if s == "bpmn-subprocess":
        return "subProcess", "subprocess"
    if s == "bpmn-data-object":
        return "dataObjectReference", "data"
    if s == "bpmn-data-store":
        return "dataStoreReference", "data"
    if s == "bpmn-annotation":
        return "textAnnotation", "annotation"
    return "task", "task"


def _sub(parent: ET.Element, ns: str, tag: str, **attrs) -> ET.Element:
    el = ET.SubElement(parent, f"{{{ns}}}{tag}")
    for k, v in attrs.items():
        el.set(k, str(v))
    return el


def export(diagram: Diagram) -> str:
    """Render a `Diagram` to a BPMN 2.0 XML string (FR-1)."""
    defs = ET.Element(f"{{{BPMN}}}definitions", id="defs_kymo")
    proc = _sub(defs, BPMN, "process", id="Process_kymo", isExecutable="false")

    # ── semantic flow nodes (FR-2) ──
    nodes: dict[str, ET.Element] = {}
    for c in diagram.components:
        tag, kind = _classify(c)
        el = _sub(proc, BPMN, tag, id=c.id)
        if kind == "annotation":
            _sub(el, BPMN, "text").text = c.name
        else:
            if c.name:
                el.set("name", c.name)
            if kind == "event" and c.icon in _EVENTDEF_TAG:
                _sub(el, BPMN, _EVENTDEF_TAG[c.icon])
        nodes[c.id] = el

    # ── semantic flows (FR-3) ──
    flow_ids: list[str] = []
    for i, e in enumerate(diagram.edges):
        fid = f"flow{i}"
        flow_ids.append(fid)
        el = _sub(proc, BPMN, _FLOW_TAG.get(e.bpmn_flow or "sequence", "sequenceFlow"),
                  id=fid, sourceRef=e.src, targetRef=e.dst)
        if e.label:
            el.set("name", e.label)
        if e.bpmn_flow == "conditional":
            _sub(el, BPMN, "conditionExpression").text = e.label or "true"
        elif e.bpmn_flow == "default" and e.src in nodes:
            nodes[e.src].set("default", fid)   # default flow named on its source node

    # ── DI plane (FR-4) ──
    plane = _sub(_sub(defs, BPMNDI, "BPMNDiagram"), BPMNDI, "BPMNPlane",
                 bpmnElement="Process_kymo")
    for c in diagram.components:
        w, h = c.size if c.size else _DEFAULT_SIZE
        shape = _sub(plane, BPMNDI, "BPMNShape", bpmnElement=c.id)
        if c.shape == "bpmn-gateway" and c.icon == "exclusive":
            shape.set("isMarkerVisible", "true")        # a DI attribute, read by from_bpmn
        _sub(shape, DC, "Bounds",
             x=round(c.pos[0] - w / 2), y=round(c.pos[1] - h / 2), width=w, height=h)
    for e, fid in zip(diagram.edges, flow_ids):
        edge = _sub(plane, BPMNDI, "BPMNEdge", bpmnElement=fid)
        for px, py in (e.points or []):
            _sub(edge, DI, "waypoint", x=px, y=py)
        if e.label and e.label_pos:
            lw, lh = 40, 14
            label = _sub(edge, BPMNDI, "BPMNLabel")
            _sub(label, DC, "Bounds",
                 x=round(e.label_pos[0] - lw / 2), y=round(e.label_pos[1] - lh / 2),
                 width=lw, height=lh)

    ET.indent(defs)
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(defs, encoding="unicode")

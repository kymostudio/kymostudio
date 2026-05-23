#!/usr/bin/env python3
"""THROWAWAY SPIKE — bpmn-export Phase 0 (P0). NOT production code.

Purpose (FR-4): prove a `to_bpmn` emitter — the inverse of `from_bpmn` — can
turn a kymo Diagram back into BPMN 2.0 XML that **re-imports** and renders the
same, before P1 builds the real `src/kymo/to_bpmn.py`. De-risks the two hard
parts: the DI coordinate inverse (centre → top-left Bounds) and the
element/flow mapping (inverting from_bpmn's classification).

Flow:  samples/order.bpmn → from_bpmn.parse → d1 → export() → XML →
       from_bpmn.parse → d2 → compare(d1, d2) + render both → eyeball.

Run:  cd packages/python && uv run python spikes/bpmn_export_spike.py
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

from kymo.from_bpmn import parse as parse_bpmn
from kymo.to_svg import render

BPMN = "http://www.omg.org/spec/BPMN/20100524/MODEL"
BPMNDI = "http://www.omg.org/spec/BPMN/20100524/DI"
DC = "http://www.omg.org/spec/DD/20100524/DC"
DI = "http://www.omg.org/spec/DD/20100524/DI"
for _p, _u in (("bpmn", BPMN), ("bpmndi", BPMNDI), ("dc", DC), ("di", DI)):
    ET.register_namespace(_p, _u)

# ── Inverse maps (mirror from_bpmn._EVENT_SHAPE / _EVENT_DEF / _TASK_MARKER /
#    _GATEWAY_MARKER, read backwards). ─────────────────────────────────────
_SHAPE_EVENT_TAG = {
    "bpmn-start": "startEvent", "bpmn-end": "endEvent",
    "bpmn-intermediate": "intermediateCatchEvent",   # catch vs throw ambiguous → catch
    "bpmn-boundary": "boundaryEvent",
}
_MARKER_EVENTDEF = {
    "message": "messageEventDefinition", "timer": "timerEventDefinition",
    "error": "errorEventDefinition", "signal": "signalEventDefinition",
    "terminate": "terminateEventDefinition", "escalation": "escalationEventDefinition",
    "conditional": "conditionalEventDefinition", "link": "linkEventDefinition",
    "compensation": "compensateEventDefinition",
}
_MARKER_TASK_TAG = {
    "": "task", "user": "userTask", "service": "serviceTask", "script": "scriptTask",
    "send": "sendTask", "receive": "receiveTask", "manual": "manualTask", "rule": "businessRuleTask",
}
_MARKER_GW_TAG = {
    "": "exclusiveGateway", "exclusive": "exclusiveGateway", "parallel": "parallelGateway",
    "inclusive": "inclusiveGateway", "event": "eventBasedGateway", "complex": "complexGateway",
}
_FLOW_TAG = {
    "sequence": "sequenceFlow", "default": "sequenceFlow", "conditional": "sequenceFlow",
    "message": "messageFlow", "association": "association",
}


def _kind(shape: str) -> str:
    if shape in _SHAPE_EVENT_TAG:
        return "event"
    return {
        "bpmn-task": "task", "bpmn-gateway": "gateway", "bpmn-subprocess": "subprocess",
        "bpmn-data-object": "data-object", "bpmn-data-store": "data-store",
        "bpmn-annotation": "annotation",
    }.get(shape, "task")


def _elem_tag(c) -> str:
    k = _kind(c.shape)
    if k == "event":
        return _SHAPE_EVENT_TAG[c.shape]
    if k == "task":
        return _MARKER_TASK_TAG.get(c.icon, "task")
    if k == "gateway":
        return _MARKER_GW_TAG.get(c.icon, "exclusiveGateway")
    return {"subprocess": "subProcess", "data-object": "dataObjectReference",
            "data-store": "dataStoreReference", "annotation": "textAnnotation"}[k]


def export(d) -> str:
    """Prototype kymo Diagram → BPMN 2.0 XML (throwaway)."""
    defs = ET.Element(f"{{{BPMN}}}definitions", id="defs_export")
    proc = ET.SubElement(defs, f"{{{BPMN}}}process", id="Process_export", isExecutable="false")

    # ── semantic flow nodes ──
    nodes: dict[str, ET.Element] = {}
    for c in d.components:
        tag = _elem_tag(c)
        el = ET.SubElement(proc, f"{{{BPMN}}}{tag}", id=c.id)
        k = _kind(c.shape)
        if k == "annotation":
            ET.SubElement(el, f"{{{BPMN}}}text").text = c.name
        else:
            if c.name:
                el.set("name", c.name)
            if k == "event" and c.icon in _MARKER_EVENTDEF:
                ET.SubElement(el, f"{{{BPMN}}}{_MARKER_EVENTDEF[c.icon]}")
        nodes[c.id] = el

    # ── semantic flows ──
    fids: list[str] = []
    for i, e in enumerate(d.edges):
        fid = f"flow{i}"
        fids.append(fid)
        el = ET.SubElement(proc, f"{{{BPMN}}}{_FLOW_TAG.get(e.bpmn_flow, 'sequenceFlow')}",
                           id=fid, sourceRef=e.src, targetRef=e.dst)
        if e.label:
            el.set("name", e.label)
        if e.bpmn_flow == "conditional":
            ET.SubElement(el, f"{{{BPMN}}}conditionExpression").text = e.label or "true"
        if e.bpmn_flow == "default" and e.src in nodes:
            nodes[e.src].set("default", fid)   # default flow named on the source node

    # ── DI plane (geometry) ──
    plane = ET.SubElement(
        ET.SubElement(defs, f"{{{BPMNDI}}}BPMNDiagram"),
        f"{{{BPMNDI}}}BPMNPlane", bpmnElement="Process_export",
    )
    for c in d.components:
        w, h = c.size if c.size else (100, 80)
        sh = ET.SubElement(plane, f"{{{BPMNDI}}}BPMNShape", bpmnElement=c.id)
        if c.shape == "bpmn-gateway" and c.icon == "exclusive":
            sh.set("isMarkerVisible", "true")           # DI attribute (read by from_bpmn)
        ET.SubElement(sh, f"{{{DC}}}Bounds",
                      x=str(round(c.pos[0] - w / 2)), y=str(round(c.pos[1] - h / 2)),
                      width=str(w), height=str(h))
    for e, fid in zip(d.edges, fids):
        ed = ET.SubElement(plane, f"{{{BPMNDI}}}BPMNEdge", bpmnElement=fid)
        for px, py in (e.points or []):
            ET.SubElement(ed, f"{{{DI}}}waypoint", x=str(px), y=str(py))
        if e.label and e.label_pos:
            lw, lh = 40, 14
            lbl = ET.SubElement(ed, f"{{{BPMNDI}}}BPMNLabel")
            ET.SubElement(lbl, f"{{{DC}}}Bounds",
                          x=str(round(e.label_pos[0] - lw / 2)), y=str(round(e.label_pos[1] - lh / 2)),
                          width=str(lw), height=str(lh))

    ET.indent(defs)
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(defs, encoding="unicode")


def _comps(d):
    return {c.id: (c.shape, c.icon, c.pos, c.size) for c in d.components}


def _edges(d):
    return sorted((e.src, e.dst, e.bpmn_flow) for e in d.edges)


def _roundtrip(name: str, here: Path, render_png: bool):
    src = here.parents[2] / "samples" / name
    d1 = parse_bpmn(src.read_text(encoding="utf-8"))
    xml = export(d1)
    out = here / name.replace(".bpmn", "-export.bpmn")
    out.write_text(xml, encoding="utf-8")
    d2 = parse_bpmn(xml)

    print(f"\n=== {name} ===")
    print(f"  d1: {len(d1.components)} comps, {len(d1.edges)} edges, {len(d1.regions)} regions")
    print(f"  d2: {len(d2.components)} comps, {len(d2.edges)} edges, {len(d2.regions)} regions")
    c_ok = _comps(d1) == _comps(d2)
    e_ok = _edges(d1) == _edges(d2)
    print(f"  components round-trip: {'OK' if c_ok else 'DRIFT'}")
    print(f"  edges round-trip:      {'OK' if e_ok else 'DRIFT'}")
    if not c_ok:
        for cid in _comps(d1):
            if _comps(d1).get(cid) != _comps(d2).get(cid):
                print(f"    Δ {cid}: {_comps(d1).get(cid)} -> {_comps(d2).get(cid)}")
    if d1.regions:
        print(f"  NOTE: {len(d1.regions)} region(s) (pools/lanes) NOT exported — P2.")
    if render_png:
        (here / name.replace(".bpmn", "-orig.png"))   # placeholder for clarity
        for tag, d in (("orig", d1), ("roundtrip", d2)):
            svg = here / name.replace(".bpmn", f"-{tag}.svg")
            svg.write_text(render(d), encoding="utf-8")
    return c_ok and e_ok


def main():
    here = Path(__file__).resolve().parent
    ok = _roundtrip("order.bpmn", here, render_png=True)
    try:
        _roundtrip("collaboration.bpmn", here, render_png=False)
    except Exception as exc:  # noqa: BLE001 — spike: surface, don't fail
        print(f"  collaboration.bpmn: export/render raised — {type(exc).__name__}: {exc}")
    print(f"\norder.bpmn round-trip: {'PASS' if ok else 'FAIL'}")


if __name__ == "__main__":
    main()

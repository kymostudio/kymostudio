"""to_bpmn (P1): inverse-map consistency, unit mapping, well-formedness, and
round-trip against the importer (samples + region-free corpus)."""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

from kymo.from_bpmn import (
    _EVENT_DEF,
    _EVENT_SHAPE,
    _GATEWAY_MARKER,
    _TASK_MARKER,
    _local,
)
from kymo.from_bpmn import (
    parse as parse_bpmn,
)
from kymo.model import Component, Diagram, Edge
from kymo.to_bpmn import _EVENT_TAG, _EVENTDEF_TAG, _GW_TAG, _TASK_TAG, export

ROOT = Path(__file__).resolve().parents[3]
ORDER = ROOT / "samples" / "order.bpmn"
CORPUS = sorted((Path(__file__).resolve().parent / "corpus_bpmn").glob("*.bpmn"))


def _diagram() -> Diagram:
    """A small single-process diagram exercising events/task/gateway/flows."""
    def c(id, name, icon, shape, pos, size):
        return Component(id=id, name=name, subtitle="", icon=icon, shape=shape,
                         accent="blue", pos=pos, size=size)
    comps = [
        c("S", "Start", "message", "bpmn-start", (50, 50), (36, 36)),
        c("T", "Do", "user", "bpmn-task", (200, 50), (100, 80)),
        c("G", "?", "exclusive", "bpmn-gateway", (360, 50), (50, 50)),
        c("E", "End", "terminate", "bpmn-end", (500, 50), (36, 36)),
    ]
    edges = [
        Edge(src="S", dst="T", label="", points=[(68, 50), (150, 50)], bpmn_flow="sequence"),
        Edge(src="T", dst="G", label="", points=[(250, 50), (335, 50)], bpmn_flow="sequence"),
        Edge(src="G", dst="E", label="yes", points=[(385, 50), (482, 50)],
             bpmn_flow="default", label_pos=(430, 42)),
    ]
    return Diagram(width=560, height=120, components=comps, edges=edges)


def _tags(root):
    return {_local(e.tag) for e in root.iter()}


def _find(root, **kw):
    """First element whose local tag / attrs match."""
    for e in root.iter():
        if all((_local(e.tag) == v if k == "tag" else e.get(k) == v) for k, v in kw.items()):
            return e
    return None


def _comp_full(d):
    return {c.id: (c.shape, c.icon, c.pos, c.size) for c in d.components}


def _comp_shapes(d):
    return {c.id: (c.shape, c.icon) for c in d.components}


def _flow_keys(d):
    return sorted((e.src, e.dst, e.bpmn_flow) for e in d.edges)


def _flow_kinds(d):
    return sorted(e.bpmn_flow for e in d.edges)


# ── inverse-map consistency with the importer (BPD-DGM-001) ──────────────
def test_inverse_maps_consistent_with_importer():
    for shape, tag in _EVENT_TAG.items():
        assert _EVENT_SHAPE[tag] == shape
    for marker, tag in _EVENTDEF_TAG.items():
        assert _EVENT_DEF[tag] == marker
    for marker, tag in _TASK_TAG.items():
        assert _TASK_MARKER[tag] == marker
    for marker, tag in _GW_TAG.items():
        assert tag == "exclusiveGateway" if marker == "" else _GATEWAY_MARKER[tag] == marker


# ── unit: mapping + well-formedness ──────────────────────────────────────
def test_export_well_formed_and_mapped():
    root = ET.fromstring(export(_diagram()))      # parses → well-formed
    assert {"definitions", "process", "startEvent", "userTask", "exclusiveGateway",
            "endEvent", "sequenceFlow", "messageEventDefinition", "terminateEventDefinition",
            "BPMNShape", "Bounds", "BPMNEdge", "waypoint"} <= _tags(root)


def test_default_flow_named_on_source():
    root = ET.fromstring(export(_diagram()))
    g = _find(root, tag="exclusiveGateway", id="G")
    assert g is not None and g.get("default")          # default="<flow id>" on G


def test_exclusive_marker_is_a_di_attribute():
    root = ET.fromstring(export(_diagram()))
    sh = _find(root, tag="BPMNShape", bpmnElement="G")
    assert sh is not None and sh.get("isMarkerVisible") == "true"


def test_di_bounds_centre_to_topleft():
    root = ET.fromstring(export(_diagram()))
    sh = _find(root, tag="BPMNShape", bpmnElement="T")   # pos (200,50) size (100,80)
    b = next(ch for ch in sh if _local(ch.tag) == "Bounds")
    assert (b.get("x"), b.get("y"), b.get("width"), b.get("height")) == ("150", "10", "100", "80")


def test_export_deterministic():
    d = _diagram()
    assert export(d) == export(d)


# ── round-trip ────────────────────────────────────────────────────────────
def test_roundtrip_order_exact():
    d1 = parse_bpmn(ORDER.read_text(encoding="utf-8"))
    d2 = parse_bpmn(export(d1))
    assert len(d1.components) == len(d2.components) and len(d1.edges) == len(d2.edges)
    assert _comp_full(d1) == _comp_full(d2)
    assert _flow_keys(d1) == _flow_keys(d2)


@pytest.mark.parametrize("path", CORPUS, ids=[p.stem for p in CORPUS])
def test_roundtrip_corpus_region_free(path):
    """Region-free corpus files round-trip shape/icon + flow kinds (P1 scope)."""
    d1 = parse_bpmn(path.read_text(encoding="utf-8", errors="replace"))
    if d1.regions or not d1.components:
        pytest.skip("has pools/lanes (P2) or no drawable nodes")
    d2 = parse_bpmn(export(d1))
    assert len(d1.components) == len(d2.components)
    assert len(d1.edges) == len(d2.edges)
    assert _comp_shapes(d1) == _comp_shapes(d2)
    assert _flow_kinds(d1) == _flow_kinds(d2)

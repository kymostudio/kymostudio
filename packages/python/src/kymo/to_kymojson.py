"""`.kymo.json` serializer — `Diagram` → the kymo.json interchange format.

`.kymo.json` (KYMOJSON-MAP-001) is a versioned, lossless JSON serialization of a
**resolved** `Diagram`: the model both front-ends produce (the `.kymo` DSL parser
and the BPMN importer) and every back-end can consume. It is the persisted form of
kymo's model seam — a cache / interchange / IR. `from_kymojson` is the inverse, so a
`source → Diagram → .kymo.json → Diagram` round-trip preserves the model.

`model_dict()` is the single source of truth for kymo's canonical model JSON; the
cross-language conformance suite imports it. The body is snake_case, points/bounds are
arrays, integral floats collapse to ints (`5.0`→`5`), `-0`→`0`, every field is
explicit, and parse order is preserved. See `docs/formats/kymo.json.md`.
"""
from __future__ import annotations

import json
from dataclasses import fields

from .model import Component, Diagram, Edge, Region

FORMAT = "kymo.json"
VERSION = 1


def _norm(value):
    """JSON-neutral normalisation: tuples→lists, integral floats→ints
    (``5.0``→``5``), ``-0``→``0``; genuine fractions are kept."""
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if value.is_integer() else value
    if isinstance(value, (list, tuple)):
        return [_norm(v) for v in value]
    return value  # str | None


# Field order matches the dataclass definitions in `kymo.model` (snake_case).
_COMPONENT_FIELDS = [
    "id", "name", "subtitle", "icon", "shape", "accent", "pos", "size",
    "parent", "align", "align_gap", "align_offset",
]
_REGION_FIELDS = [
    "id", "label", "bounds", "contains", "padding", "padding_bottom", "style",
    "icon", "layout", "pos", "gap", "align", "visible", "border_dash",
    "border_stroke", "label_anchor", "label_position",
]
_EDGE_FIELDS = [
    "src", "dst", "label", "style", "src_anchor", "dst_anchor", "route", "via",
    "src_offset", "dst_offset", "label_offset", "label_anchor", "label_small",
    "label_pos", "dashed", "no_arrow", "trunk_offset", "shared_port", "points",
    "bpmn_flow",
]


def _check_complete(cls, names: list[str]) -> None:
    """Guardrail: fail loudly if a model field is missing from the serializer."""
    missing = {f.name for f in fields(cls)} - set(names)
    assert not missing, f"{cls.__name__} kymo.json serializer missing fields: {sorted(missing)}"


def _obj(obj, names: list[str]) -> dict:
    return {name: _norm(getattr(obj, name)) for name in names}


def _layout_node(node) -> dict:
    """Canonical layout-tree node. Stored trees are the basic parsed form —
    ``("id", cid)`` (leaf) or ``("group", dir, [children])`` — with no padding
    (region inlining/padding is a transient positioning step, never stored)."""
    if node[0] == "id":
        return {"t": "id", "id": node[1]}
    return {"t": "group", "dir": node[1], "children": [_layout_node(c) for c in node[2]]}


def model_dict(diagram: Diagram) -> dict:
    """The resolved model as language-neutral JSON (the `.kymo.json` `diagram` body).
    Includes `layout_trees` (consumed by the Figma back-end); excludes the transient
    `bpmn_blocks` (always empty in a resolved diagram)."""
    _check_complete(Component, _COMPONENT_FIELDS)
    _check_complete(Region, _REGION_FIELDS)
    _check_complete(Edge, _EDGE_FIELDS)
    return {
        "width": _norm(diagram.width),
        "height": _norm(diagram.height),
        "title": diagram.title,
        "subtitle": diagram.subtitle,
        "components": [_obj(c, _COMPONENT_FIELDS) for c in diagram.components],
        "regions": [_obj(r, _REGION_FIELDS) for r in diagram.regions],
        "edges": [_obj(e, _EDGE_FIELDS) for e in diagram.edges],
        "layout_trees": [_layout_node(t) for t in diagram.layout_trees],
    }


def export(diagram: Diagram) -> str:
    """Serialize a resolved `Diagram` to a `.kymo.json` string (versioned envelope)."""
    payload = {"format": FORMAT, "version": VERSION, "diagram": model_dict(diagram)}
    return json.dumps(payload, indent=2, ensure_ascii=False) + "\n"

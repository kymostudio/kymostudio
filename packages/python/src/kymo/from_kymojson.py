"""`.kymo.json` loader — the kymo.json interchange format → a resolved `Diagram`.

The inverse of `to_kymojson.export` (KYMOJSON-MAP-001). A `.kymo.json` file already
holds a fully-resolved model (positions baked in), so `cli` renders it directly with
no layout / alignment pass — exactly like a `.bpmn` import. JSON arrays are coerced
back to the tuple-typed model fields so a loaded `Diagram` is identical to a
natively-parsed one. Unknown top-level fields are ignored (forward compatibility).
"""
from __future__ import annotations

import json

from .model import Component, Diagram, Edge, Region

FORMAT = "kymo.json"


def _pt(v):
    """JSON array → tuple for a point/bounds field; pass through None / scalars."""
    return tuple(v) if isinstance(v, list) else v


def _pts(v):
    """JSON array-of-points → list of tuples; pass through None."""
    return [tuple(p) for p in v] if isinstance(v, list) else v


def _component(d: dict) -> Component:
    return Component(
        id=d["id"], name=d["name"], subtitle=d["subtitle"], icon=d["icon"],
        shape=d["shape"], accent=d["accent"], pos=_pt(d["pos"]), size=_pt(d["size"]),
        parent=d["parent"], align=d["align"], align_gap=d["align_gap"],
        align_offset=_pt(d["align_offset"]), label_box=_pt(d.get("label_box")),
    )


def _region(d: dict) -> Region:
    return Region(
        id=d["id"], label=d["label"], bounds=_pt(d["bounds"]), contains=list(d["contains"]),
        padding=_pt(d["padding"]), padding_bottom=d["padding_bottom"], style=d["style"],
        icon=d["icon"], layout=d["layout"], pos=_pt(d["pos"]), gap=d["gap"],
        align=d["align"], visible=d["visible"], border_dash=_pt(d["border_dash"]),
        border_stroke=d["border_stroke"], label_anchor=d["label_anchor"],
        label_position=d["label_position"],
    )


def _edge(d: dict) -> Edge:
    return Edge(
        src=d["src"], dst=d["dst"], label=d["label"], style=d["style"],
        src_anchor=d["src_anchor"], dst_anchor=d["dst_anchor"], route=d["route"],
        via=_pts(d["via"]), src_offset=_pt(d["src_offset"]), dst_offset=_pt(d["dst_offset"]),
        label_offset=_pt(d["label_offset"]), label_anchor=d["label_anchor"],
        label_small=d["label_small"], label_pos=_pt(d["label_pos"]), dashed=d["dashed"],
        no_arrow=d["no_arrow"], trunk_offset=d["trunk_offset"], shared_port=d["shared_port"],
        points=_pts(d["points"]), bpmn_flow=d["bpmn_flow"],
    )


def _layout_node(n: dict):
    """Canonical layout-tree node → native tuple (`("id", cid)` / `("group", dir,
    [children])`); the group's children stay a mutable list (the layout pass mutates it)."""
    if n["t"] == "id":
        return ("id", n["id"])
    return ("group", n["dir"], [_layout_node(c) for c in n["children"]])


def model_from_dict(d: dict) -> Diagram:
    """Build a `Diagram` from a canonical model **body** dict (the `diagram` payload,
    i.e. what `to_kymojson.model_dict` emits and the Rust core returns)."""
    return Diagram(
        width=d["width"], height=d["height"], title=d["title"], subtitle=d["subtitle"],
        components=[_component(c) for c in d["components"]],
        regions=[_region(r) for r in d["regions"]],
        edges=[_edge(e) for e in d["edges"]],
        layout_trees=[_layout_node(t) for t in d.get("layout_trees", [])],
    )


def parse(text: str) -> Diagram:
    """Load a `.kymo.json` string (versioned envelope) into a fully-resolved `Diagram`."""
    payload = json.loads(text)
    fmt = payload.get("format")
    if fmt != FORMAT:
        raise ValueError(f"not a kymo.json document (format={fmt!r}, expected {FORMAT!r})")
    return model_from_dict(payload["diagram"])

"""BPMN delegation to the Rust core (`_kymostudio_core`) — the single source of truth.

Python no longer has its own BPMN port; import / layout / export / render all go
through the in-repo Rust engine (the `kymostudio-core` wheel, Python's sole runtime
dep). The model JSON (`.kymo.json` body) is the wire format: the core returns/accepts
it and `from_kymojson` / `to_kymojson` (de)serialize it into a native `Diagram`.

Mirrors the `to_png.py` delegation pattern, but BPMN has no pure-Python fallback —
the core is required (raise a clear, actionable error if the wheel is missing).
"""
from __future__ import annotations

import json

from .from_kymojson import model_from_dict
from .from_kymojson import parse as parse_kymojson
from .model import Diagram
from .to_kymojson import model_dict

try:
    import _kymostudio_core as _kcore
except ModuleNotFoundError as exc:  # pragma: no cover - exercised only without the wheel
    raise ModuleNotFoundError(
        "BPMN and Mermaid support require the kymostudio-core engine (>=0.4). "
        "Try: pip install --upgrade kymostudio-core"
    ) from exc


def import_bpmn(xml: str) -> Diagram:
    """Parse BPMN 2.0 XML → a fully-resolved `Diagram` (DI geometry, no layout pass)."""
    return model_from_dict(json.loads(_kcore.bpmn_import(xml)))


def import_mermaid(src: str) -> Diagram:
    """Parse Mermaid source (flowchart) → a fully-resolved `Diagram`.

    The core lays the graph out and returns a `.kymo.json` envelope, so the
    result is already positioned — no Python layout/alignment pass, exactly
    like a `.bpmn` import."""
    return parse_kymojson(_kcore.mermaid_to_kymojson(src))


def mermaid_to_d2(src: str) -> str:
    """Convert Mermaid flowchart source → D2, via the shared flowchart IR."""
    return _kcore.mermaid_to_d2(src)


def mermaid_to_dot(src: str) -> str:
    """Convert Mermaid flowchart source → Graphviz DOT, via the flowchart IR."""
    return _kcore.mermaid_to_dot(src)


def normalize_mermaid(src: str) -> str:
    """Round-trip / normalize Mermaid flowchart source through the IR."""
    return _kcore.mermaid_to_mermaid(src)



def layout_bpmn(blocks: list) -> Diagram:
    """Lay out positionless `bpmn { }` blocks (the `dsl.BpmnBlock` ASTs) → `Diagram`."""
    payload = [
        {
            "nodes": [
                {
                    "id": n.id,
                    "label": n.label,
                    "shape": n.shape,
                    "marker": n.marker,
                    "pin": list(n.pin) if n.pin is not None else None,
                }
                for n in b.nodes
            ],
            "flows": [
                {"src": f.src, "dst": f.dst, "flow": f.flow, "label": f.label}
                for f in b.flows
            ],
        }
        for b in blocks
    ]
    return model_from_dict(json.loads(_kcore.bpmn_layout(json.dumps(payload))))


def apply_layout(diagram: Diagram) -> None:
    """Resolve a diagram's `bpmn { }` blocks in place — lay them out via the core,
    fold the positioned components/edges + canvas size back in, and clear the blocks.
    Mirrors the old `bpmn_layout.layout(diagram)` contract."""
    laid = layout_bpmn(diagram.bpmn_blocks)
    diagram.components.extend(laid.components)
    diagram.edges.extend(laid.edges)
    diagram.width = laid.width
    diagram.height = laid.height
    diagram.bpmn_blocks = []


def resolve_flowchart_blocks(diagram: Diagram) -> None:
    """Resolve a diagram's `flowchart { }` blocks in place — feed each block's
    body (as `flowchart <DIR>\\n<body>`) to the Mermaid importer, fold the
    positioned components/edges/regions + canvas size back in, and clear the
    blocks. Mirrors `apply_layout` for `bpmn { }`. One block per file is the
    supported case (the last block's canvas size wins)."""
    for direction, body in diagram.flowchart_blocks:
        laid = import_mermaid(f"flowchart {direction}\n{body}")
        diagram.components.extend(laid.components)
        diagram.edges.extend(laid.edges)
        diagram.regions.extend(laid.regions)
        diagram.width = laid.width
        diagram.height = laid.height
    diagram.flowchart_blocks = []


def export_bpmn(diagram: Diagram) -> str:
    """Serialize a `Diagram` of `bpmn-*` glyphs → BPMN 2.0 XML."""
    return _kcore.bpmn_export(json.dumps(model_dict(diagram)))


def render_bpmn(diagram: Diagram, animate: bool = False, background: str | None = None) -> str:
    """Render a BPMN `Diagram` → SVG (byte-identical to the old `to_svg` BPMN path)."""
    return _kcore.bpmn_render(json.dumps(model_dict(diagram)), animate, background)


def is_bpmn(diagram: Diagram) -> bool:
    """True when a resolved diagram uses BPMN features (so rendering must delegate)."""
    return (
        any(c.shape.startswith("bpmn-") for c in diagram.components)
        or any(e.points for e in diagram.edges)
        or any(r.style in ("pool", "lane") for r in diagram.regions)
    )

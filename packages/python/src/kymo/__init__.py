"""kymo — diagram-as-code DSL → animated SVG / WebP / Figma / Excalidraw.

Public API:

    from kymo import parse, layout, resolve_alignments, render

    diagram, layout_spec, external = parse(source_text)
    if layout_spec:
        layout(diagram, layout_spec, external)
    resolve_alignments(diagram)
    svg = render(diagram, animate=True)
"""
from __future__ import annotations

from .alignment import resolve_alignments
from .dsl import parse
from .layout import layout
from .lint_bpmn import lint as lint_bpmn
from .model import Component, Diagram, Edge, Region
from .to_svg import render

__version__ = "0.4.2"


# BPMN import/export delegate to the Rust core (the single source of truth). Imported
# lazily so `import kymo` stays wheel-free for non-BPMN use; the core is required only
# once a BPMN function is actually called. See `_core.py`.
def parse_bpmn(xml: str) -> Diagram:
    """Parse BPMN 2.0 XML → a resolved `Diagram` (via the Rust core)."""
    from ._core import import_bpmn

    return import_bpmn(xml)


def to_bpmn(diagram: Diagram) -> str:
    """Serialize a `Diagram` of `bpmn-*` glyphs → BPMN 2.0 XML (via the Rust core)."""
    from ._core import export_bpmn

    return export_bpmn(diagram)

__all__ = [
    "parse",
    "parse_bpmn",
    "lint_bpmn",
    "to_bpmn",
    "layout",
    "resolve_alignments",
    "render",
    "Component",
    "Diagram",
    "Edge",
    "Region",
    "__version__",
]

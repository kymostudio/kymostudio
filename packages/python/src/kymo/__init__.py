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
from .from_bpmn import parse as parse_bpmn
from .layout import layout
from .lint_bpmn import lint as lint_bpmn
from .model import Component, Diagram, Edge, Region
from .to_bpmn import export as to_bpmn
from .to_svg import render

__version__ = "0.3.6"

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

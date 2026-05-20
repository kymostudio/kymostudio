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
from .model import Component, Diagram, Edge, Region
from .to_svg import render

__version__ = "0.1.1"

__all__ = [
    "parse",
    "layout",
    "resolve_alignments",
    "render",
    "Component",
    "Diagram",
    "Edge",
    "Region",
    "__version__",
]

"""AIQ (Agent Intelligence Quotient) architecture replica.

The diagram itself is declared in **`aiq.diagram`** (Mermaid-like DSL).
This file is a thin loader so `generate.py` can dispatch the target
unchanged. To edit the diagram, edit the `.diagram` file.

Render with:
    uv run generate.py aiq
"""
from pathlib import Path

from dsl import parse


DIAGRAM = parse(Path(__file__).with_suffix(".diagram").read_text(encoding="utf-8"))
LAYOUT = None     # auto-layout regions in the DSL handle positioning

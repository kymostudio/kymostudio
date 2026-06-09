#!/usr/bin/env python3
"""Render a kymo flowchart DSL (.kymo source) from stdin to an SVG on stdout.

Replicates the SVG back-end of the `kymo` CLI's render flow (parse -> resolve
layout -> render) without pulling in the PNG/PDF code paths, so it only needs
the `kymostudio-core` engine (for `bpmn { }` / `flowchart { }` auto-layout).

    echo '<dsl>' | python render_kymo.py   # -> SVG on stdout

On a parse/render error the message goes to stderr and the exit code is 1.
"""
from __future__ import annotations

import sys

from kymo.dsl import parse as parse_dsl
from kymo.layout import layout
from kymo.alignment import resolve_alignments
from kymo.to_svg import render


def render_kymo(src: str) -> str:
    diagram, layout_spec, external = parse_dsl(src)
    had_bpmn = bool(getattr(diagram, "bpmn_blocks", None))
    had_flowchart = bool(getattr(diagram, "flowchart_blocks", None))
    if had_bpmn:
        from kymo._core import apply_layout

        apply_layout(diagram)
    if had_flowchart:
        from kymo._core import resolve_flowchart_blocks

        resolve_flowchart_blocks(diagram)
    if layout_spec:
        layout(diagram, layout_spec, external)
    if not had_bpmn and not had_flowchart:
        resolve_alignments(diagram)
    return render(diagram, animate=False)


def main() -> int:
    src = sys.stdin.read()
    if not src.strip():
        print("empty source", file=sys.stderr)
        return 1
    try:
        sys.stdout.write(render_kymo(src))
        return 0
    except Exception as exc:  # surface a clean one-line message to the caller
        print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

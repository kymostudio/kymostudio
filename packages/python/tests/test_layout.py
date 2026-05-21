"""Golden-file tests focused on layout-tree behaviour: each subdirectory
under ``tests/layout/`` exercises one layout-resolution rule and compares
the rendered SVG byte-for-byte against ``output.svg``.

Cases:
  - horizontal        — `layout { a | b | c }` → horizontal row
  - vertical          — `layout { a , b , c }` → vertical stack
  - nested            — `layout { orch | { a, b, c } }` → mixed nesting
  - cluster_inline    — cluster region with `vertical` direction inlines
                        into the layout tree (layout references the
                        cluster id, no leaf duplication)
  - cluster_padding   — adjacent clusters with default padding don't
                        overlap (regression for the padding-aware layout
                        fix that adds cluster padding into the outer gap)

Regenerate goldens after intentional renderer changes:

    KYMO_UPDATE_GOLDEN=1 uv run pytest tests/test_layout.py
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest

from kymo.alignment import resolve_alignments
from kymo.dsl import parse as parse_dsl
from kymo.layout import layout as apply_grid_layout
from kymo.to_svg import render

CASES_DIR = Path(__file__).parent / "layout"
UPDATE = os.environ.get("KYMO_UPDATE_GOLDEN") == "1"


def _discover_cases() -> list[str]:
    return sorted(p.name for p in CASES_DIR.iterdir() if p.is_dir())


def _render_case(case: str) -> str:
    src = CASES_DIR / case / "input.diagram"
    diagram, layout_spec, external = parse_dsl(src.read_text(encoding="utf-8"))
    if layout_spec:
        apply_grid_layout(diagram, layout_spec, external)
    resolve_alignments(diagram)
    return render(diagram)


@pytest.mark.parametrize("case", _discover_cases())
def test_layout_matches_golden(case: str) -> None:
    actual = _render_case(case)
    golden_path = CASES_DIR / case / "output.svg"

    if UPDATE:
        golden_path.write_text(actual, encoding="utf-8")
        pytest.skip(f"regenerated golden for {case}")

    expected = golden_path.read_text(encoding="utf-8")
    assert actual == expected, (
        f"Rendered SVG for layout case {case!r} differs from {golden_path.name}.\n"
        f"Re-run with KYMO_UPDATE_GOLDEN=1 if the change is intentional."
    )

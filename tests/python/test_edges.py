"""Golden-file tests focused on edge behaviour: each subdirectory
under ``tests/edges/`` exercises one routing or styling rule and
compares the rendered SVG byte-for-byte against ``output.svg``.

Cases:
  - horizontal_straight  — same-row src/dst, default `-->`
  - vertical_straight    — same-column src/dst, default `-->`
  - z_shape_horizontal   — off-axis dst, horizontal anchors → H-V-H Z
  - undirected           — `---` drops the arrowhead
  - fan_out              — 1 src → N dsts
  - fan_in_stagger       — N srcs → 1 dst (stagger spreads endpoints)

Regenerate goldens after intentional renderer changes:

    AXO_UPDATE_GOLDEN=1 uv run pytest tests/test_edges.py
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest

from alignment import resolve_alignments
from dsl import parse as parse_dsl
from layout import layout as apply_grid_layout
from to_svg import render


CASES_DIR = Path(__file__).parent.parent / "edges"
UPDATE = os.environ.get("AXO_UPDATE_GOLDEN") == "1"


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
def test_edge_matches_golden(case: str) -> None:
    actual = _render_case(case)
    golden_path = CASES_DIR / case / "output.svg"

    if UPDATE:
        golden_path.write_text(actual, encoding="utf-8")
        pytest.skip(f"regenerated golden for {case}")

    expected = golden_path.read_text(encoding="utf-8")
    assert actual == expected, (
        f"Rendered SVG for edge case {case!r} differs from {golden_path.name}.\n"
        f"Re-run with AXO_UPDATE_GOLDEN=1 if the change is intentional."
    )

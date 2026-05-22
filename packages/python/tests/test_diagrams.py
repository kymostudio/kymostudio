"""Golden-file tests: each subdirectory under ``tests/diagrams/`` is a
case with ``input.kymo`` and ``output.svg``. We re-render the input
through the full pipeline (parse → layout → align → SVG) and assert the
output matches the committed golden byte-for-byte.

When something changes the renderer on purpose, regenerate goldens:

    KYMO_UPDATE_GOLDEN=1 uv run pytest tests/test_diagrams.py
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest

from kymo.alignment import resolve_alignments
from kymo.dsl import parse as parse_dsl
from kymo.layout import layout as apply_grid_layout
from kymo.to_svg import render

CASES_DIR = Path(__file__).parent / "diagrams"
UPDATE = os.environ.get("KYMO_UPDATE_GOLDEN") == "1"


def _discover_cases() -> list[str]:
    return sorted(p.name for p in CASES_DIR.iterdir() if p.is_dir())


def _render_case(case: str) -> str:
    src = CASES_DIR / case / "input.kymo"
    diagram, layout_spec, external = parse_dsl(src.read_text(encoding="utf-8"))
    if layout_spec:
        apply_grid_layout(diagram, layout_spec, external)
    resolve_alignments(diagram)
    return render(diagram)


@pytest.mark.parametrize("case", _discover_cases())
def test_diagram_matches_golden(case: str) -> None:
    actual = _render_case(case)
    golden_path = CASES_DIR / case / "output.svg"

    if UPDATE:
        golden_path.write_text(actual, encoding="utf-8")
        pytest.skip(f"regenerated golden for {case}")

    expected = golden_path.read_text(encoding="utf-8")
    assert actual == expected, (
        f"Rendered SVG for {case!r} differs from {golden_path.name}.\n"
        f"Re-run with KYMO_UPDATE_GOLDEN=1 if the change is intentional."
    )

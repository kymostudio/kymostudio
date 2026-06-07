"""Golden-file tests for icon-less flowchart rendering (Mermaid imports).

Each subdirectory under ``tests/flowchart/`` is a case with a resolved
``input.kymo.json`` (as produced by the Rust core's Mermaid importer) and
an ``output.svg``. We load the model via ``from_kymojson`` (already
positioned → no layout/alignment pass, like a ``.bpmn`` import) and render
it, asserting the SVG matches the committed golden byte-for-byte.

This exercises the icon-less node path in ``to_svg.render_flowchart_node``
and the new ``diamond`` shape. When the renderer changes on purpose:

    KYMO_UPDATE_GOLDEN=1 uv run pytest tests/test_flowchart.py
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest

from kymo.from_kymojson import parse as parse_kymojson
from kymo.to_svg import render

CASES_DIR = Path(__file__).parent / "flowchart"
UPDATE = os.environ.get("KYMO_UPDATE_GOLDEN") == "1"


def _discover_cases() -> list[str]:
    return sorted(p.name for p in CASES_DIR.iterdir() if p.is_dir())


def _render_case(case: str) -> str:
    src = CASES_DIR / case / "input.kymo.json"
    diagram = parse_kymojson(src.read_text(encoding="utf-8"))
    return render(diagram)


@pytest.mark.parametrize("case", _discover_cases())
def test_flowchart_matches_golden(case: str) -> None:
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


def test_mermaid_import_renders() -> None:
    """End-to-end: Mermaid source → core binding → resolved Diagram → SVG.

    Skipped when the installed `kymostudio-core` predates the Mermaid
    binding (PyPI 0.4.2); CI builds the local core wheel so it runs there.
    """
    core = pytest.importorskip("_kymostudio_core")
    if not hasattr(core, "mermaid_to_kymojson"):
        pytest.skip("kymostudio-core lacks the Mermaid binding (pre-0.4.3)")
    from kymo._core import import_mermaid

    d = import_mermaid("flowchart TD\n  A[Start] --> B{ok?}\n  B -->|yes| C[Done]\n")
    svg = render(d)
    assert svg.startswith("<?xml")
    assert 'class="fc-shape"' in svg          # icon-less flowchart nodes drawn
    assert 'class="fc-label"' in svg and "Start" in svg
    assert any(c.shape == "diamond" for c in d.components)

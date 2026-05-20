"""Tier-1 unit smoke: every committed `.bpmn` fixture (+ repo samples) parses
and renders end-to-end to a well-formed SVG. Fast (in-process, no raster);
runs per build alongside the rest of the suite.

The large real-world regression sweep (777 MIWG files) lives separately in
`demos/bpmn-bench/regress_kymo.py` (kymo-only, ~2s) and the full 6-tool
comparison in `demos/bpmn-bench/run.sh` — neither runs per build.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

from kymo import parse_bpmn, render

HERE = Path(__file__).resolve().parent
FIXTURES = sorted((HERE / "fixtures" / "bpmn").glob("*.bpmn"))
SAMPLES = sorted((HERE.parents[2] / "samples").glob("*.bpmn"))   # repo-root samples/
CASES = FIXTURES + SAMPLES


def test_fixtures_present():
    assert FIXTURES, "no BPMN fixtures found"


@pytest.mark.parametrize("path", CASES, ids=[p.name for p in CASES])
def test_bpmn_renders_to_valid_svg(path: Path):
    d = parse_bpmn(path.read_text(encoding="utf-8"))
    svg = render(d)
    root = ET.fromstring(svg)                 # must be well-formed XML
    assert root.tag.endswith("svg")
    if path.name == "no_di.bpmn":
        assert not d.components and not d.edges  # no DI → empty diagram, no crash
    else:
        assert d.components                      # DI present → something is drawn
        assert "bpmn-" in svg                    # BPMN styles/markers injected

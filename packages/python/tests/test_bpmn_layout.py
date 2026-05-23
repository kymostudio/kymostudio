"""bpmn_layout (P2): structural layout assertions + the order-flow golden.

The pipeline mirrors the CLI for a bpmn-block `.kymo`: parse → bpmn_layout
(no `resolve_alignments`, the layout owns geometry). Regenerate the golden
after an INTENTIONAL layout change:

    KYMO_UPDATE_GOLDEN=1 uv run --group dev python -m pytest tests/test_bpmn_layout.py
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest

from kymo.bpmn_layout import layout as bpmn_layout
from kymo.dsl import parse
from kymo.to_svg import render

UPDATE = os.environ.get("KYMO_UPDATE_GOLDEN") == "1"
SAMPLE = Path(__file__).resolve().parents[3] / "samples" / "order-flow.kymo"
GOLDEN = SAMPLE.with_suffix(".svg")

SPLIT_JOIN = """
bpmn {
  start S  "s"
  task  A  "a"
  and   SP "split"
  task  B  "b"
  task  C  "c"
  and   SY "sync"
  end   E  "e"
  S -> A -> SP
  SP -> B ; SP -> C
  B -> SY ; C -> SY
  SY -> E
}
"""


def _laid_out(text: str):
    d, _, _ = parse(text)
    bpmn_layout(d)
    return d


def test_layout_consumes_block_and_positions_nodes():
    """FR-10: block → positioned components; the block is consumed."""
    d = _laid_out(SPLIT_JOIN)
    assert d.bpmn_blocks == []
    assert len(d.components) == 7
    for c in d.components:
        assert c.shape.startswith("bpmn-")
        assert isinstance(c.pos[0], int) and isinstance(c.pos[1], int)
        assert c.size is not None
    assert d.width > 0 and d.height > 0


def test_layout_lr_linear_chain_is_a_straight_trunk():
    """FR-8: a linear chain lands in increasing x columns, all on one y."""
    d = _laid_out('bpmn {\n start S "s"\n task A "a"\n task B "b"\n'
                  ' end E "e"\n S -> A -> B -> E\n}\n')
    x = {c.id: c.pos[0] for c in d.components}
    y = {c.id: c.pos[1] for c in d.components}
    assert x["S"] < x["A"] < x["B"] < x["E"]
    assert y["S"] == y["A"] == y["B"] == y["E"]      # finding #1: straight trunk


def test_layout_split_join_structure():
    """FR-8: parallel branches share a column between the split and join."""
    d = _laid_out(SPLIT_JOIN)
    x = {c.id: c.pos[0] for c in d.components}
    assert x["S"] < x["A"] < x["SP"]
    assert x["SP"] < x["B"] == x["C"] < x["SY"]
    assert x["SY"] < x["E"]


def test_layout_edges_carry_points_and_flow():
    """FR-10: every emitted edge has an integer polyline + bpmn_flow."""
    d = _laid_out(SPLIT_JOIN)
    assert len(d.edges) == 7
    for e in d.edges:
        assert e.points and len(e.points) >= 2
        assert all(isinstance(v, int) for p in e.points for v in p)
        assert e.bpmn_flow == "sequence"


def test_layout_pin_override():
    """FR-9: a pinned node keeps its centre; un-pinned nodes do not."""
    d = _laid_out('bpmn {\n start S "s"\n task A "a" @ (500,300)\n'
                  ' end E "e"\n S -> A -> E\n}\n')
    pos = {c.id: c.pos for c in d.components}
    assert pos["A"] == (500, 300)
    assert pos["S"] != (500, 300) and pos["E"] != (500, 300)
    a_edges = [e for e in d.edges if "A" in (e.src, e.dst)]
    assert len(a_edges) == 2 and all(e.points for e in a_edges)


def test_layout_deterministic():
    """NFR-1: re-running yields byte-identical SVG."""
    assert render(_laid_out(SPLIT_JOIN)) == render(_laid_out(SPLIT_JOIN))


def test_render_no_longer_raises_after_layout():
    """The P1 render guard clears once the block is laid out."""
    svg = render(_laid_out('bpmn {\n start S "s"\n end E "e"\n S -> E\n}\n'))
    assert svg.lstrip().startswith("<?xml") and "bpmn-" in svg


def test_order_flow_golden():
    """TC-8: samples/order-flow.kymo renders to the committed golden."""
    actual = render(_laid_out(SAMPLE.read_text(encoding="utf-8")))
    if UPDATE:
        GOLDEN.write_text(actual, encoding="utf-8")
        pytest.skip("regenerated samples/order-flow.svg")
    assert actual == GOLDEN.read_text(encoding="utf-8"), (
        "order-flow render differs from samples/order-flow.svg; "
        "re-run with KYMO_UPDATE_GOLDEN=1 if the change is intentional."
    )

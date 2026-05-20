"""DSL parser: leaf/edge/region/layout-tree syntax."""
from __future__ import annotations

import pytest

from kymo.dsl import (
    _inline_region_leaves,
    _parse_layout_tree,
    parse,
)


# ── Leaf component syntax ────────────────────────────────────────────
def test_leaf_minimal():
    """No name, no subtitle, no @-ref — just shape/icon/accent."""
    d, _, _ = parse("agent hex/hex-agent/green\n")
    assert len(d.components) == 1
    c = d.components[0]
    assert (c.id, c.shape, c.icon, c.accent) == ("agent", "hex", "hex-agent", "green")
    assert c.name == "" and c.subtitle == ""


def test_leaf_with_labels():
    d, _, _ = parse('orch hex/hex-agent/green "Orchestrator" "Sub"\n')
    c = d.components[0]
    assert c.name == "Orchestrator" and c.subtitle == "Sub"


def test_leaf_name_only():
    d, _, _ = parse('lb image/aws-elb/orange "lb"\n')
    assert d.components[0].name == "lb"
    assert d.components[0].subtitle == ""


# ── Edge syntax ──────────────────────────────────────────────────────
def test_edge_arrow():
    d, _, _ = parse("a hex/hex-agent/green\nb hex/hex-agent/green\na --> b\n")
    e = d.edges[0]
    assert (e.src, e.dst, e.style, e.no_arrow) == ("a", "b", "gray", False)


def test_edge_orange():
    d, _, _ = parse("a hex/hex-agent/green\nb hex/hex-agent/green\na ==> b\n")
    assert d.edges[0].style == "orange"


def test_edge_undirected():
    d, _, _ = parse("a hex/hex-agent/green\nb hex/hex-agent/green\na --- b\n")
    assert d.edges[0].no_arrow is True


def test_edge_default_anchors_unset():
    """Default anchors are None so resolve_anchors can auto-pick."""
    d, _, _ = parse("a hex/hex-agent/green\nb hex/hex-agent/green\na --> b\n")
    assert d.edges[0].src_anchor is None
    assert d.edges[0].dst_anchor is None


def test_edge_explicit_anchor():
    d, _, _ = parse(
        "a hex/hex-agent/green\nb hex/hex-agent/green\n"
        "a --> b { src=bottom, dst=top }\n"
    )
    assert d.edges[0].src_anchor == "bottom"
    assert d.edges[0].dst_anchor == "top"


# ── Layout tree expression ───────────────────────────────────────────
def test_layout_tree_horizontal():
    tree = _parse_layout_tree("a | b | c", line_no=1)
    assert tree == ("group", "horizontal", [("id", "a"), ("id", "b"), ("id", "c")])


def test_layout_tree_vertical():
    tree = _parse_layout_tree("a , b", line_no=1)
    assert tree == ("group", "vertical", [("id", "a"), ("id", "b")])


def test_layout_tree_nested():
    tree = _parse_layout_tree("orch | { a , b }", line_no=1)
    assert tree == (
        "group", "horizontal",
        [("id", "orch"),
         ("group", "vertical", [("id", "a"), ("id", "b")])],
    )


def test_layout_tree_single_id():
    """Single id with no separator returns leaf, not group."""
    assert _parse_layout_tree("solo", line_no=1) == ("id", "solo")


def test_layout_tree_mix_pipe_comma_rejected():
    with pytest.raises(SyntaxError, match="cannot mix"):
        _parse_layout_tree("a | b , c", line_no=1)


def test_layout_tree_missing_close_brace():
    with pytest.raises(SyntaxError, match="missing"):
        _parse_layout_tree("{ a , b", line_no=1)


# ── Region inlining ──────────────────────────────────────────────────
class _Region:
    """Minimal stand-in for model.Region (only the fields _inline_region_leaves reads)."""
    def __init__(self, layout, contains, padding=(24, 24)):
        self.layout = layout
        self.contains = contains
        self.padding = padding


def test_inline_region_expands_to_subtree():
    regions = {"svc": _Region("vertical", ["w1", "w2", "w3"])}
    out = _inline_region_leaves(("id", "svc"), regions)
    assert out == (
        "group", "vertical",
        [("id", "w1"), ("id", "w2"), ("id", "w3")],
        (24, 24),
    )


def test_inline_region_preserves_outer_tree():
    regions = {"svc": _Region("vertical", ["a", "b"])}
    tree = ("group", "horizontal", [("id", "x"), ("id", "svc")])
    out = _inline_region_leaves(tree, regions)
    assert out[0] == "group" and out[1] == "horizontal"
    # First child stays a leaf, second expands into the region's sub-tree.
    assert out[2][0] == ("id", "x")
    svc_node = out[2][1]
    assert svc_node[0] == "group" and svc_node[1] == "vertical"


def test_inline_region_without_direction_stays_opaque():
    regions = {"svc": _Region(None, ["a", "b"])}
    out = _inline_region_leaves(("id", "svc"), regions)
    assert out == ("id", "svc")     # untouched

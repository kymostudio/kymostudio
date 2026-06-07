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


# ── BPMN block (`bpmn { … }`) — P1 parser ────────────────────────────
def _block(text: str):
    """Parse a `bpmn { … }` source and return its single BpmnBlock AST."""
    d, _, _ = parse(text)
    assert len(d.bpmn_blocks) == 1
    return d.bpmn_blocks[0]


def test_bpmn_node_kinds():
    """Each kind maps to the expected (shape, marker) (FR-3)."""
    blk = _block(
        "bpmn {\n"
        '  start S "Start"\n'
        '  end   E "End"\n'
        '  end!  T "Terminate"\n'
        '  task  A "Do"\n'
        '  xor   X "X?"\n'
        '  and   P "Split"\n'
        '  or    O "Or"\n'
        '  event V "Wait"\n'
        '  subprocess U "Sub"\n'
        '  note  N "Note"\n'
        '  data  D "Doc"\n'
        '  store R "DB"\n'
        "}\n"
    )
    got = {n.id: (n.shape, n.marker) for n in blk.nodes}
    assert got == {
        "S": ("bpmn-start", ""),
        "E": ("bpmn-end", ""),
        "T": ("bpmn-end", "terminate"),
        "A": ("bpmn-task", ""),
        "X": ("bpmn-gateway", "exclusive"),
        "P": ("bpmn-gateway", "parallel"),
        "O": ("bpmn-gateway", "inclusive"),
        "V": ("bpmn-intermediate", ""),
        "U": ("bpmn-subprocess", ""),
        "N": ("bpmn-annotation", ""),
        "D": ("bpmn-data-object", ""),
        "R": ("bpmn-data-store", ""),
    }


def test_bpmn_type_subtype():
    """`type=` refines the marker (FR-4)."""
    blk = _block(
        "bpmn {\n"
        '  task  A "Approve" type=user\n'
        '  start S "Msg" type=message\n'
        '  event V "Wait" type=timer\n'
        "}\n"
    )
    assert {n.id: n.marker for n in blk.nodes} == {
        "A": "user", "S": "message", "V": "timer",
    }


def test_bpmn_pin_parsed():
    """`@ (x,y)` is parsed now (honoured in P2, FR-9); else None."""
    assert _block('bpmn {\n  task N "Notify" @ (560,90)\n}\n').nodes[0].pin == (560, 90)
    assert _block('bpmn {\n  task M "x"\n}\n').nodes[0].pin is None


def test_bpmn_flow_kinds():
    """`->`/`~>`/`..>` set the flow kind (FR-6)."""
    blk = _block("bpmn {\n  A -> B\n  B ~> C\n  C ..> D\n}\n")
    assert [(f.src, f.dst, f.flow) for f in blk.flows] == [
        ("A", "B", "sequence"),
        ("B", "C", "message"),
        ("C", "D", "association"),
    ]


def test_bpmn_chain_and_semicolon():
    """Chains expand to one flow per segment; `;` separates statements (FR-7)."""
    blk = _block("bpmn {\n  S -> V -> GW\n  SP -> Pk ; SP -> Iv\n}\n")
    assert [(f.src, f.dst) for f in blk.flows] == [
        ("S", "V"), ("V", "GW"), ("SP", "Pk"), ("SP", "Iv"),
    ]
    assert all(f.flow == "sequence" for f in blk.flows)


def test_bpmn_edge_label():
    blk = _block('bpmn {\n  GW -> P : "Yes"\n  GW -> N : "No"\n}\n')
    assert {(f.src, f.dst): f.label for f in blk.flows} == {
        ("GW", "P"): "Yes", ("GW", "N"): "No",
    }


def test_bpmn_full_example_parses():
    """The order-graph block parses to 12 nodes + 12 flows."""
    blk = _block(
        "bpmn {\n"
        '  start S  "Order received"\n'
        '  task  V  "Validate order"\n'
        '  xor   GW "In stock?"\n'
        '  task  N  "Notify customer" @ (560,90)\n'
        '  end!  C  "Order cancelled"\n'
        '  task  P  "Process payment"\n'
        '  and   SP "Split"\n'
        '  task  Pk "Pack"\n'
        '  task  Iv "Invoice"\n'
        '  and   Sy "Sync"\n'
        '  task  Sh "Ship order"\n'
        '  end   D  "Order delivered"\n'
        "\n"
        "  S -> V -> GW\n"
        '  GW -> P : "Yes"\n'
        '  GW -> N : "No"\n'
        "  N -> C\n"
        "  P -> SP\n"
        "  SP -> Pk ; SP -> Iv\n"
        "  Pk -> Sy ; Iv -> Sy\n"
        "  Sy -> Sh -> D\n"
        "}\n"
    )
    assert len(blk.nodes) == 12
    assert len(blk.flows) == 12


def test_bpmn_render_raises_until_layout():
    """A diagram still carrying an un-laid-out block must not render (P1)."""
    from kymo.to_svg import render
    d, _, _ = parse('bpmn {\n  start S "x"\n  S -> E\n  end E "y"\n}\n')
    with pytest.raises(ValueError, match="un-laid-out"):
        render(d)

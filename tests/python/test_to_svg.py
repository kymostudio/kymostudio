"""SVG renderer: route_edge Z-shape, no-arrow rendering."""
from __future__ import annotations

from kymo.model import Component, Diagram, Edge
from kymo.to_svg import render, route_edge


def _c(cid: str, x: int, y: int, shape: str = "image") -> Component:
    # Use 'hex-agent' — a real built-in icon — so full render() works
    # without hitting the file-backed icon loader.
    return Component(
        id=cid, name="", subtitle="", icon="hex-agent", shape=shape,
        accent="green", pos=(x, y),
    )


def _edge(src="a", dst="b", **kw) -> Edge:
    return Edge(src=src, dst=dst, label="", **kw)


# ── route_edge: Z-shape with midpoint bend ───────────────────────────
def test_route_axis_aligned_straight_line():
    """src/dst on same row → straight horizontal segment, no bend."""
    d = Diagram(width=0, height=0, components=[_c("a", 100, 200), _c("b", 300, 200)])
    d.edges.append(_edge(src_anchor="right", dst_anchor="left"))
    pts = route_edge(d.edges[0], d)
    assert pts == [(132, 200), (268, 200)]


def test_route_horizontal_anchors_z_shape():
    """src.right → dst.left at different Y → H-V-H Z with midpoint x."""
    d = Diagram(width=0, height=0, components=[_c("a", 100, 100), _c("b", 300, 200)])
    d.edges.append(_edge(src_anchor="right", dst_anchor="left"))
    pts = route_edge(d.edges[0], d)
    # sp=(132, 100), dp=(268, 200). midpoint x = (132+268)//2 = 200
    assert pts == [(132, 100), (200, 100), (200, 200), (268, 200)]


def test_route_vertical_anchors_z_shape():
    """src.bottom → dst.top at different X → V-H-V Z with midpoint y."""
    d = Diagram(width=0, height=0, components=[_c("a", 100, 100), _c("b", 300, 300)])
    d.edges.append(_edge(src_anchor="bottom", dst_anchor="top"))
    pts = route_edge(d.edges[0], d)
    sp = d.components[0].anchor("bottom")       # bottom uses LABEL_HEIGHT
    dp = d.components[1].anchor("top")
    mid_y = (sp[1] + dp[1]) // 2
    assert pts == [sp, (sp[0], mid_y), (dp[0], mid_y), dp]


def test_route_via_overrides_auto():
    d = Diagram(width=0, height=0, components=[_c("a", 100, 100), _c("b", 300, 300)])
    d.edges.append(_edge(src_anchor="right", dst_anchor="left", via=[(200, 50)]))
    pts = route_edge(d.edges[0], d)
    # via point inserted between sp and dp
    assert pts[0] == d.components[0].anchor("right")
    assert pts[1] == (200, 50)
    assert pts[2] == d.components[1].anchor("left")


def test_route_straight_bypasses_z_shape():
    """`route=straight` returns sp→dp directly, even when geometry would
    otherwise produce a Z-shape."""
    d = Diagram(width=0, height=0, components=[_c("a", 100, 100), _c("b", 300, 200)])
    d.edges.append(_edge(src_anchor="right", dst_anchor="left", route="straight"))
    pts = route_edge(d.edges[0], d)
    assert pts == [(132, 100), (268, 200)]


# ── Full render: no_arrow drops marker-end ───────────────────────────
def test_render_no_arrow_drops_marker():
    d = Diagram(width=400, height=200,
                components=[_c("a", 80, 100), _c("b", 320, 100)])
    e_arrow    = _edge(src="a", dst="b", src_anchor="right", dst_anchor="left")
    e_no_arrow = _edge(src="a", dst="b", src_anchor="right", dst_anchor="left",
                       no_arrow=True)
    d.edges = [e_arrow, e_no_arrow]
    svg = render(d)
    # Exactly ONE marker-end should appear (the arrow edge), not two.
    assert svg.count("marker-end=") == 1


# ── Auto-anchor resolution at route time ─────────────────────────────
def test_route_auto_anchors_pick_horizontal_for_side_dst():
    """No explicit anchor; dst is to the right → src=right, dst=left."""
    d = Diagram(width=0, height=0, components=[_c("a", 100, 200), _c("b", 300, 200)])
    d.edges.append(_edge())                     # both anchors None
    pts = route_edge(d.edges[0], d)
    # Path should start at a.right and end at b.left
    assert pts[0] == (132, 200)
    assert pts[-1] == (268, 200)

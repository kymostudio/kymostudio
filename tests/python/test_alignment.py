"""Alignment passes: snap to grid, stagger fan-in, auto-size canvas."""
from __future__ import annotations

from alignment import _auto_size_canvas, _snap_to_grid, _stagger_fanin_edges
from model import Component, Diagram, Edge


def _c(cid: str, x: int, y: int, shape: str = "image") -> Component:
    return Component(
        id=cid, name="", subtitle="", icon="", shape=shape, accent="green",
        pos=(x, y),
    )


# ── Snap to 8px grid ─────────────────────────────────────────────────
def test_snap_component_positions_to_grid():
    # Use non-equidistant values — Python round() is banker's rounding so
    # values exactly between two multiples (e.g. 100 ↔ {96, 104}) are
    # rounded to the even neighbour and depend on the multiple's parity.
    d = Diagram(width=0, height=0, components=[_c("a", 99, 217), _c("b", 107, 221)])
    _snap_to_grid(d)
    assert d.components[0].pos == (96, 216)     # 99 → 96, 217 → 216
    assert d.components[1].pos == (104, 224)    # 107 → 104, 221 → 224 (≥half)


def test_snap_canvas_dims_round_up():
    d = Diagram(width=159, height=129)
    _snap_to_grid(d)
    assert (d.width, d.height) == (160, 136)    # round UP to multiple of 8


def test_snap_edge_via_and_label():
    e = Edge(src="a", dst="b", label="lbl",
             via=[(101, 215), (159, 221)], label_pos=(123, 217))
    d = Diagram(width=0, height=0, edges=[e])
    _snap_to_grid(d)
    assert e.via == [(104, 216), (160, 224)]
    assert e.label_pos == (120, 216)


# ── Fan-in stagger ───────────────────────────────────────────────────
def test_stagger_three_edges_to_same_dst():
    """3 srcs at different Y → 1 dst.left should stagger dst_offset.y."""
    dst = _c("dst", 300, 200)
    src_top = _c("st", 100, 100)
    src_mid = _c("sm", 100, 200)
    src_bot = _c("sb", 100, 300)
    edges = [
        Edge(src=cid, dst="dst", label="", src_anchor="right", dst_anchor="left")
        for cid in ("st", "sm", "sb")
    ]
    d = Diagram(width=0, height=0,
                components=[dst, src_top, src_mid, src_bot], edges=edges)
    _stagger_fanin_edges(d)
    # 3 edges → mid index 1, step ±16 (or capped by dst cross-axis 64-16=48)
    # Sorted by src.pos.y: st(100), sm(200), sb(300)
    offsets = [e.dst_offset for e in edges]
    assert offsets[0][1] < 0      # topmost src → negative y offset
    assert offsets[1][1] == 0     # middle → 0
    assert offsets[2][1] > 0      # bottommost → positive y
    assert offsets[0][1] == -offsets[2][1]   # symmetric


def test_stagger_single_edge_untouched():
    dst = _c("dst", 300, 200)
    src = _c("s", 100, 200)
    e = Edge(src="s", dst="dst", label="",
             src_anchor="right", dst_anchor="left")
    d = Diagram(width=0, height=0, components=[dst, src], edges=[e])
    _stagger_fanin_edges(d)
    assert e.dst_offset == (0, 0)


def test_stagger_top_anchor_staggers_x():
    """Fan-in to dst.top staggers along X, not Y."""
    dst = _c("dst", 300, 300)
    a = _c("a", 100, 100)
    b = _c("b", 500, 100)
    edges = [
        Edge(src=cid, dst="dst", label="", src_anchor="bottom", dst_anchor="top")
        for cid in ("a", "b")
    ]
    d = Diagram(width=0, height=0, components=[dst, a, b], edges=edges)
    _stagger_fanin_edges(d)
    # Sorted by src.pos.x: a(100), b(500)
    assert edges[0].dst_offset[0] < 0    # left src → negative x offset
    assert edges[1].dst_offset[0] > 0    # right src → positive x offset
    assert edges[0].dst_offset[1] == 0   # no y change for top anchor


# ── Auto-size canvas: 4:3 min aspect ─────────────────────────────────
def test_canvas_pads_tall_to_4_3():
    """Portrait content (h > w·3/4) gets width padding toward 4:3.
    Final aspect is only approximately 4:3 because `_snap_to_grid` runs
    last and may round the width down by up to one grid step (8 px)."""
    d = Diagram(width=0, height=0, components=[_c("a", 32, 32)])
    before_w = 124    # what we'd get without padding (manual trace)
    _auto_size_canvas(d)
    # Width was padded — it's larger than the un-padded extent.
    assert d.width > before_w
    # And close to the 4:3 target (allowing one grid step of rounding).
    target_w = (d.height * 4) // 3
    assert abs(d.width - target_w) <= 8


def test_canvas_wide_untouched():
    """Already-landscape canvas not padded."""
    d = Diagram(width=0, height=0,
                components=[_c("a", 32, 200), _c("b", 600, 200)])
    _auto_size_canvas(d)
    # 600-wide content; height = 200 + half=32 + label ≈ 258
    # 600 > 258 * 4/3 = 344 → no width padding
    assert d.width * 3 >= d.height * 4

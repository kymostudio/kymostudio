"""Model helpers: resolve_anchors geometry pick + Component.anchor sides."""
from __future__ import annotations

from kymo.model import Component, Edge, resolve_anchors


def _c(x: int, y: int, shape: str = "image", icon: str = "cube") -> Component:
    # A normal icon-bearing component (icon-less nodes are flowchart glyphs,
    # which anchor flush with no label band — see the icon-less test below).
    return Component(
        id="c", name="", subtitle="", icon=icon, shape=shape, accent="green",
        pos=(x, y),
    )


def _edge(src_anchor=None, dst_anchor=None) -> Edge:
    return Edge(src="s", dst="d", label="",
                src_anchor=src_anchor, dst_anchor=dst_anchor)


# ── resolve_anchors: horizontal bias ─────────────────────────────────
def test_anchors_horizontal_when_dst_to_right():
    src, dst = _c(100, 200), _c(300, 200)       # same y, dst right
    sa, da = resolve_anchors(_edge(), src, dst)
    assert (sa, da) == ("right", "left")


def test_anchors_horizontal_when_dst_to_left():
    src, dst = _c(300, 200), _c(100, 200)       # dst left of src
    sa, da = resolve_anchors(_edge(), src, dst)
    assert (sa, da) == ("left", "right")


def test_anchors_vertical_only_when_dy_more_than_2x_dx():
    # |dy| = 100, 2·|dx| = 80 → vertical wins
    src, dst = _c(100, 100), _c(140, 200)
    sa, da = resolve_anchors(_edge(), src, dst)
    assert (sa, da) == ("bottom", "top")


def test_anchors_horizontal_when_dy_just_below_threshold():
    # |dy| = 70, 2·|dx| = 80 → horizontal still wins (bias)
    src, dst = _c(100, 100), _c(140, 170)
    sa, da = resolve_anchors(_edge(), src, dst)
    assert sa in ("right", "left")
    assert da in ("right", "left")


def test_anchors_vertical_up():
    src, dst = _c(100, 300), _c(100, 100)       # straight up
    sa, da = resolve_anchors(_edge(), src, dst)
    assert (sa, da) == ("top", "bottom")


# ── resolve_anchors: explicit user anchors win ───────────────────────
def test_anchors_explicit_both_preserved():
    src, dst = _c(100, 200), _c(300, 200)
    sa, da = resolve_anchors(_edge(src_anchor="bottom", dst_anchor="top"), src, dst)
    assert (sa, da) == ("bottom", "top")


def test_anchors_only_src_explicit_dst_auto():
    src, dst = _c(100, 200), _c(300, 200)
    sa, da = resolve_anchors(_edge(src_anchor="top"), src, dst)
    assert sa == "top"        # explicit kept
    assert da == "left"       # auto-picked (dst right of src)


# ── Component.anchor: side → point ───────────────────────────────────
def test_component_anchor_sides():
    c = _c(100, 100, shape="image")             # half=(32, 32)
    assert c.anchor("top")    == (100, 68)
    assert c.anchor("left")   == (68, 100)
    assert c.anchor("right")  == (132, 100)
    assert c.anchor("center") == (100, 100)


def test_component_anchor_bottom_includes_label_band():
    """When a component has a name/subtitle, bottom anchor pushes past
    LABEL_HEIGHT so edges don't cross the label text."""
    c = _c(100, 100, shape="image")
    c.name = "labelled"                         # opt-in to label band
    # 100 + 32 (half_h) + 26 (label_height for image) = 158
    assert c.anchor("bottom") == (100, 158)


def test_component_anchor_bottom_no_label_flush_with_icon():
    """Without name/subtitle the label band is suppressed → bottom anchor
    sits flush with the icon's bottom edge (no LABEL_HEIGHT padding)."""
    c = _c(100, 100, shape="image")             # empty name + subtitle
    # 100 + 32 (half_h) = 132 — no label band added.
    assert c.anchor("bottom") == (100, 132)


def test_component_anchor_bottom_iconless_flowchart_no_band():
    """An icon-less flowchart node carries its label INSIDE the glyph, so even
    when named the bottom anchor stays flush with the shape edge (no band)."""
    c = _c(100, 100, shape="image", icon="")    # icon-less → flowchart node
    c.name = "labelled"
    # 100 + 32 (half_h) = 132 — label is inside, no band despite the name.
    assert c.anchor("bottom") == (100, 132)

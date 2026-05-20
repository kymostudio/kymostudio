"""apply_layout_tree: Figma-style auto-layout with padding-aware groups."""
from __future__ import annotations

from kymo.layout import apply_layout_tree
from kymo.model import Component


def _c(cid: str, shape: str = "image") -> Component:
    return Component(
        id=cid, name="", subtitle="", icon="", shape=shape, accent="green",
        pos=(0, 0),
    )


# ── Single leaf ──────────────────────────────────────────────────────
def test_apply_single_leaf():
    by_id = {"a": _c("a")}
    w, h = apply_layout_tree(by_id, ("id", "a"), origin=(0, 0))
    # image half=(32,32) + no label → 64x64
    assert (w, h) == (64, 64)
    assert by_id["a"].pos == (32, 32)


# ── Horizontal layout: 3 leaves with gap 40 ──────────────────────────
def test_horizontal_three_leaves():
    by_id = {cid: _c(cid) for cid in ("a", "b", "c")}
    tree = ("group", "horizontal", [("id", cid) for cid in ("a", "b", "c")])
    w, h = apply_layout_tree(by_id, tree, origin=(0, 0))
    # 3 × 64 + 2 × 40 gap = 272
    assert w == 272 and h == 64
    # Centers at x=32, 32+64+40=136, 136+64+40=240
    assert by_id["a"].pos[0] == 32
    assert by_id["b"].pos[0] == 136
    assert by_id["c"].pos[0] == 240


# ── Vertical layout ──────────────────────────────────────────────────
def test_vertical_two_leaves():
    by_id = {cid: _c(cid) for cid in ("a", "b")}
    tree = ("group", "vertical", [("id", "a"), ("id", "b")])
    w, h = apply_layout_tree(by_id, tree, origin=(0, 0))
    # max(64) wide, 2·64 + 40 gap = 168 tall
    assert (w, h) == (64, 168)


# ── Nested mix ───────────────────────────────────────────────────────
def test_nested_horizontal_vertical():
    by_id = {cid: _c(cid) for cid in ("orch", "a", "b")}
    tree = ("group", "horizontal", [
        ("id", "orch"),
        ("group", "vertical", [("id", "a"), ("id", "b")]),
    ])
    w, h = apply_layout_tree(by_id, tree, origin=(0, 0))
    # inner col height = 2·64 + 40 = 168
    # outer effective_gap = max(40, 168 // 4) = 42 (scales with tall neighbour)
    # outer width  = 64 + 42 + 64 = 170
    # outer height = max(64, 168)  = 168
    assert (w, h) == (170, 168)


def test_horizontal_gap_scales_with_tall_neighbour():
    """Effective gap = max(base_gap, max_cross // 4). Flat horizontal
    of equal-height leaves stays at the floor (64 // 4 = 16 < 40)."""
    by_id = {cid: _c(cid) for cid in ("a", "b", "c")}
    flat = ("group", "horizontal", [("id", c) for c in ("a", "b", "c")])
    w, _ = apply_layout_tree(by_id, flat, origin=(0, 0))
    # 3·64 + 2·40 (floor gap) = 272
    assert w == 272


# ── 4-tuple padded group (region cluster padding) ────────────────────
def test_padded_group_expands_outer_dims():
    by_id = {"a": _c("a")}
    # Single leaf wrapped in a horizontal group with (24, 24) padding
    tree = ("group", "horizontal", [("id", "a")], (24, 24))
    w, h = apply_layout_tree(by_id, tree, origin=(0, 0))
    # 64 + 2·24 = 112 wide and tall
    assert (w, h) == (112, 112)
    # Leaf still centered within outer bounds
    assert by_id["a"].pos == (56, 56)


def test_padded_groups_side_by_side_do_not_overlap():
    """The original bug: 2 clusters with padding=(24,24) adjacent at gap=40
    overlapped by 8px because gap didn't account for inner padding."""
    by_id = {cid: _c(cid) for cid in ("a", "b")}
    tree = ("group", "horizontal", [
        ("group", "horizontal", [("id", "a")], (24, 24)),
        ("group", "horizontal", [("id", "b")], (24, 24)),
    ])
    apply_layout_tree(by_id, tree, origin=(0, 0))
    # Each padded group is 112 wide. Outer gap is 40.
    # a's group occupies x ∈ [0, 112], b's group ∈ [152, 264].
    # a icon center at 56, b icon center at 152 + 56 = 208.
    # Gap between icon edges: (208-32) - (56+32) = 176 - 88 = 88
    # = padding_right_a (24) + outer_gap (40) + padding_left_b (24) ✓
    assert by_id["a"].pos[0] == 56
    assert by_id["b"].pos[0] == 208


# ── Origin offset ────────────────────────────────────────────────────
def test_origin_shifts_all_positions():
    by_id = {"a": _c("a")}
    apply_layout_tree(by_id, ("id", "a"), origin=(100, 200))
    # Center within 64×64 block placed at (100, 200) → (132, 232)
    assert by_id["a"].pos == (132, 232)

"""Auto-layout: pack components tightly into a region/row grid.

Input:
  - `Diagram` with components/regions/edges (positions ignored)
  - `LAYOUT`  — dict of region_id → list[row], where row is a list of cell-ids
  - `EXTERNAL` — components placed relative to a target (e.g. user above jupyter)

Output (in place):
  - Each component's `pos` is set to its (cx, cy) center
  - Each region's `bounds` is set tight around its contents
  - Each edge with `route != "auto"` and empty `via` gets routing waypoints
  - Diagram width/height set to enclose everything

Whitespace minimisation principles:
  1. Per-row height = max(component height + label height) across all regions
     so rows align horizontally across regions (cross-region edges run flat).
  2. Per-region width = max(row width) — region only as wide as it needs.
  3. Component cell width = max(icon width, longest label width) + padding.
  4. Same gap between rows / between cells / between regions, but each is
     a tunable parameter so we don't over- or under-pad anywhere.
"""
from __future__ import annotations

from dataclasses import dataclass

from .model import Component, Diagram, Edge, LABEL_HEIGHT, SHAPE_HALF, resolve_anchors


# ── Sizing ─────────────────────────────────────────────────────────────
# Empirically-tuned character widths (avg over Latin + Vietnamese diacritics
# at the given pixel size). Off by < 5% which is plenty for layout.
_CHAR_W_NAME = 7.6        # 14px component name
_CHAR_W_SUB  = 6.4        # 11.5px subtitle
_LABEL_GAP   = 6
_LINE_HEIGHT = 18

# Derive from model.SHAPE_HALF so new shapes don't drift between modules.
# `annotation` keeps its (40, 32) box for label budget; SHAPE_HALF treats
# it as (0, 0) since annotations are floating glyphs without bounds.
_ICON_DIMS: dict[str, tuple[int, int]] = {
    s: (2 * hw, 2 * hh) for s, (hw, hh) in SHAPE_HALF.items()
}
_ICON_DIMS["annotation"] = (40, 32)


@dataclass
class Cell:
    w: int
    h: int


def _text_w(s: str, char_w: float) -> int:
    return int(len(s) * char_w)


def cell_size(c: Component, h_pad: int = 8, v_pad: int = 10) -> Cell:
    iw, ih = _ICON_DIMS[c.shape]
    name_w = _text_w(c.name,     _CHAR_W_NAME)
    sub_w  = _text_w(c.subtitle, _CHAR_W_SUB)
    label_w = max(name_w, sub_w)
    label_h = _LABEL_GAP + _LINE_HEIGHT * 2
    return Cell(
        w=max(iw, label_w) + h_pad * 2,
        h=ih + label_h + v_pad,
    )


# ── Layout ─────────────────────────────────────────────────────────────
def layout(
    diagram: Diagram,
    region_layout: dict[str, list[list[str]]],
    external: dict[str, dict] | None = None,
    *,
    region_gap: int = 36,
    row_gap: int = 28,
    cell_gap: int = 18,
    region_padding_x: int = 18,
    region_padding_y: int = 22,
    canvas_margin: int = 18,
) -> None:
    sizes = {c.id: cell_size(c) for c in diagram.components}
    region_ids = list(region_layout.keys())

    # Per-row height (across all regions) → consistent Y for cross-region rows.
    max_rows = max(len(rs) for rs in region_layout.values())
    row_heights: list[int] = []
    for i in range(max_rows):
        h = 0
        for rid in region_ids:
            rows = region_layout[rid]
            if i < len(rows):
                for cid in rows[i]:
                    if cid in sizes:
                        h = max(h, sizes[cid].h)
        row_heights.append(h or 100)

    # Per-region width = max(row width).
    region_widths: dict[str, int] = {}
    for rid, rows in region_layout.items():
        w = 0
        for row in rows:
            row_w = sum(sizes[cid].w for cid in row) + (len(row) - 1) * cell_gap
            w = max(w, row_w)
        region_widths[rid] = w + region_padding_x * 2

    # External components reserve vertical space above the first row.
    external = external or {}
    ext_above_height = 0
    for eid, spec in external.items():
        if spec.get("above") and eid in sizes:
            ext_above_height = max(ext_above_height, sizes[eid].h + spec.get("gap", 60))

    # Row centre-Y, cumulative.
    row_ys: list[int] = []
    y = canvas_margin + ext_above_height
    for h in row_heights:
        y += h // 2
        row_ys.append(y)
        y += h // 2 + row_gap

    # Region centre-X, cumulative.
    region_xs: dict[str, int] = {}
    x = canvas_margin
    for rid in region_ids:
        w = region_widths[rid]
        x += w // 2
        region_xs[rid] = x
        x += w // 2 + region_gap
    canvas_right = x - region_gap + canvas_margin

    # Place each component at its grid cell.
    for rid, rows in region_layout.items():
        rx = region_xs[rid]
        for i, row in enumerate(rows):
            ry = row_ys[i]
            total_w = sum(sizes[cid].w for cid in row) + (len(row) - 1) * cell_gap
            cursor = rx - total_w // 2
            for cid in row:
                cw = sizes[cid].w
                diagram.get(cid).pos = (cursor + cw // 2, ry)
                cursor += cw + cell_gap

    # Place external (above a target).
    for eid, spec in external.items():
        if "above" in spec:
            target = diagram.get(spec["above"])
            gap = spec.get("gap", 60)
            target_top = target.pos[1] - sizes[spec["above"]].h // 2
            diagram.get(eid).pos = (target.pos[0],
                                    target_top - gap - sizes[eid].h // 2)

    # Region bounds — hug the cells with region_padding.
    for rid, rows in region_layout.items():
        rx = region_xs[rid]
        rw = region_widths[rid]
        n = len(rows)
        top = row_ys[0] - row_heights[0] // 2 - region_padding_y
        bot = row_ys[n - 1] + row_heights[n - 1] // 2 + region_padding_y
        for r in diagram.regions:
            if r.id == rid:
                r.bounds = (rx - rw // 2, top, rw, bot - top)
                break

    # Auto-route edges that asked for it (route != "auto" or empty via).
    _route_edges(diagram, row_ys, row_heights)

    # Final canvas — fit content + margin.
    diagram.width  = canvas_right
    diagram.height = max(c.pos[1] + sizes[c.id].h // 2 for c in diagram.components) + canvas_margin


# ── Anonymous layout-tree (Figma-style auto-layout) ────────────────────
def apply_layout_tree(
    by_id: dict[str, Component],
    tree,
    *,
    gap: int = 40,
    origin: tuple[int, int] = (0, 0),
) -> tuple[int, int]:
    """Position every component referenced in `tree` according to a
    Figma-style auto-layout: each frame *hugs* its contents, children are
    laid out along the frame's axis with a fixed `gap`, and the
    cross-axis is *center-aligned*. Returns the (width, height) of the
    laid-out block; the block's top-left starts at `origin`.

    `tree` shape (recursive):
      ("id", "<component_id>")
      ("group", "horizontal"|"vertical", [child, …])

    Component icon centers (`c.pos`) are written in place. The auto-canvas
    pass shifts everything later if `origin` is closer to the canvas edge
    than the configured margin."""
    def cell(c: Component) -> tuple[int, int]:
        iw, ih = _ICON_DIMS[c.shape]
        lh = LABEL_HEIGHT.get(c.shape, 0) if (c.name or c.subtitle) else 0
        return (iw, ih + lh)

    def _padding(node) -> tuple[int, int]:
        # 4-tuple (group, direction, children, padding) carries cluster
        # padding so adjacent clusters don't overlap. 3-tuple groups have 0.
        return node[3] if len(node) > 3 else (0, 0)

    def _effective_gap(direction: str, sizes: list[tuple[int, int]]) -> int:
        """Per-group spacing that scales with the children's cross-axis
        extent: when one child is much taller (in a horizontal group) or
        wider (in a vertical group) than the base icon, sibling gap grows
        to keep the visual ratio. Floor = `gap`, ceiling = max cross / 4
        — gives `orch | { a , b , c }` extra breathing room around the
        tall column without bloating `a | b | c` (where all heights match
        the floor)."""
        cross = max(s[1] for s in sizes) if direction == "horizontal" \
            else max(s[0] for s in sizes)
        return max(gap, cross // 4)

    def measure(node) -> tuple[int, int]:
        if node[0] == "id":
            return cell(_lookup(by_id, node[1]))
        direction, children = node[1], node[2]
        px, py = _padding(node)
        sizes = [measure(ch) for ch in children]
        eg = _effective_gap(direction, sizes)
        if direction == "horizontal":
            return (
                sum(s[0] for s in sizes) + (len(sizes) - 1) * eg + 2 * px,
                max(s[1] for s in sizes) + 2 * py,
            )
        return (
            max(s[0] for s in sizes) + 2 * px,
            sum(s[1] for s in sizes) + (len(sizes) - 1) * eg + 2 * py,
        )

    def place(node, cx: int, cy: int) -> None:
        if node[0] == "id":
            c = _lookup(by_id, node[1])
            _, ih = _ICON_DIMS[c.shape]
            lh = LABEL_HEIGHT.get(c.shape, 0) if (c.name or c.subtitle) else 0
            # cell center → icon center: shift up by half the label band.
            c.pos = (cx, cy - lh // 2)
            return
        direction, children = node[1], node[2]
        sizes = [measure(ch) for ch in children]
        eg = _effective_gap(direction, sizes)
        # Children pack tightly inside the padded box — measure-with-padding
        # is the OUTER size, so the inner span is `outer − 2·padding`.
        w, h = measure(node)
        px, py = _padding(node)
        inner_w = w - 2 * px
        inner_h = h - 2 * py
        if direction == "horizontal":
            cursor = cx - inner_w // 2
            for ch, (cw, _) in zip(children, sizes):
                place(ch, cursor + cw // 2, cy)
                cursor += cw + eg
        else:
            cursor = cy - inner_h // 2
            for ch, (_, ch_h) in zip(children, sizes):
                place(ch, cx, cursor + ch_h // 2)
                cursor += ch_h + eg

    w, h = measure(tree)
    place(tree, origin[0] + w // 2, origin[1] + h // 2)
    return (w, h)


def _lookup(by_id: dict[str, Component], cid: str) -> Component:
    if cid not in by_id:
        raise KeyError(f"layout tree references unknown component {cid!r}")
    return by_id[cid]


# ── Crossing minimisation (barycenter heuristic) ────────────────────────
# A small port of the idea behind ELK's `BarycenterHeuristic`
# (Sugiyama et al., 1981): for two adjacent sibling groups in a layout
# container, sort the children of each by the mean index of the *other*
# group's leaves they connect to. Repeated alternating sweeps converge
# on a local minimum of edge crossings. The implementation here is
# original Python — only the algorithm name & shape come from public
# literature.
def _collect_leaves_ordered(node) -> list[str]:
    """Leaves of a tree node in their current left-to-right (or
    top-to-bottom) order, i.e. the order in which apply_layout_tree
    would place them."""
    if node[0] == "id":
        return [node[1]]
    out: list[str] = []
    for ch in node[2]:
        out.extend(_collect_leaves_ordered(ch))
    return out


def minimize_crossings(tree, edges: list, *, max_sweeps: int = 24) -> None:
    """Barycenter reorder of children inside every multi-child group in
    `tree`. Sweeps alternate fwd/bwd until no further reorder happens or
    `max_sweeps` is hit (in practice a handful of sweeps suffice).

    `edges` is a list of `(src_id, dst_id)` tuples — direction is
    ignored (barycenter treats connectivity as undirected for ordering
    purposes)."""
    if tree[0] != "group":
        return

    # Build undirected leaf adjacency once.
    leaf_adj: dict[str, set[str]] = {}
    for s, d in edges:
        leaf_adj.setdefault(s, set()).add(d)
        leaf_adj.setdefault(d, set()).add(s)

    for _ in range(max_sweeps):
        if not _sweep_node(tree, leaf_adj):
            break


def _sweep_node(node, leaf_adj: dict[str, set[str]]) -> bool:
    """One depth-first fwd+bwd sweep at this node. Returns True if any
    child group reorder happened (anywhere in the subtree)."""
    if node[0] != "group":
        return False

    changed = False
    # Recurse into children first (deepest reorders inform parent sweeps).
    for ch in node[2]:
        if _sweep_node(ch, leaf_adj):
            changed = True

    sibs = node[2]
    n = len(sibs)
    if n < 2:
        return changed

    # Forward sweep: for each adjacent pair (i, i+1), reorder i+1 by
    # barycenter computed against i's current leaf order.
    for i in range(n - 1):
        if _barycenter_reorder(sibs, fixed_idx=i, free_idx=i + 1, adj=leaf_adj):
            changed = True
    # Backward sweep: same in reverse to converge from both ends.
    for i in range(n - 1, 0, -1):
        if _barycenter_reorder(sibs, fixed_idx=i, free_idx=i - 1, adj=leaf_adj):
            changed = True
    return changed


def _barycenter_reorder(sibs: list, *, fixed_idx: int, free_idx: int,
                        adj: dict[str, set[str]]) -> bool:
    """Reorder the children of `sibs[free_idx]` so each is sorted by
    the mean leaf-index of its neighbours in `sibs[fixed_idx]`. No-op
    if `sibs[free_idx]` is a leaf (nothing to reorder). Returns True
    when the order actually changed."""
    free = sibs[free_idx]
    if free[0] != "group":
        return False

    fixed_leaves = _collect_leaves_ordered(sibs[fixed_idx])
    fixed_pos = {leaf: idx for idx, leaf in enumerate(fixed_leaves)}

    keyed = []
    for ch_idx, ch in enumerate(free[2]):
        positions = [
            fixed_pos[adj_leaf]
            for leaf in _collect_leaves_ordered(ch)
            for adj_leaf in adj.get(leaf, ())
            if adj_leaf in fixed_pos
        ]
        # Leaves with no connection keep their relative slot (use NaN-like
        # large sentinel that sorts to the end OR fall back to current idx
        # for stability — we pick current idx to bias toward minimal change).
        bary = (sum(positions) / len(positions)) if positions else ch_idx
        keyed.append((bary, ch_idx, ch))

    keyed.sort(key=lambda t: (t[0], t[1]))   # stable on barycenter ties
    new_children = [t[2] for t in keyed]
    if new_children == free[2]:
        return False

    # Rebuild the (possibly 4-tuple) node with reordered children.
    if len(free) > 3:
        sibs[free_idx] = (free[0], free[1], new_children, free[3])
    else:
        sibs[free_idx] = (free[0], free[1], new_children)
    return True


# ── Edge routing helpers ───────────────────────────────────────────────
def _route_edges(diagram: Diagram, row_ys: list[int], row_heights: list[int]) -> None:
    for e in diagram.edges:
        if e.via:
            continue  # respect explicit waypoints
        if e.route == "over":
            e.via = _route_over(diagram, e, row_ys, row_heights)
        elif e.route == "under":
            e.via = _route_under(diagram, e, row_ys, row_heights)
        # "auto" produces no via; the renderer's auto-elbow handles it.


def _route_over(diagram: Diagram, e: Edge, row_ys: list[int],
                row_heights: list[int]) -> list[tuple[int, int]]:
    """Snap the across-segment to the middle of the actual content gap above
    the source row — accounting for label area below row above's icons."""
    src = diagram.get(e.src)
    dst = diagram.get(e.dst)
    src_anchor, dst_anchor = resolve_anchors(e, src, dst)
    sp = src.anchor(src_anchor)
    dp = dst.anchor(dst_anchor)

    # Locate source row.
    src_y = src.pos[1]
    src_row = min(range(len(row_ys)), key=lambda i: abs(row_ys[i] - src_y))

    if src_row == 0:
        # No row above — route above everything
        top_of_content = min(c.pos[1] - c.half[1] for c in diagram.components
                             if c.shape != "annotation")
        over_y = max(14, top_of_content - 30)
        return [(sp[0], over_y), (dp[0], over_y)]

    TOL = 5
    prev_row_y = row_ys[src_row - 1]
    curr_row_y = row_ys[src_row]
    prev_cells = [c for c in diagram.components if abs(c.pos[1] - prev_row_y) < TOL]
    curr_cells = [c for c in diagram.components if abs(c.pos[1] - curr_row_y) < TOL]

    prev_bottom = max((c.pos[1] + c.half[1] + LABEL_HEIGHT.get(c.shape, 0)
                       for c in prev_cells), default=prev_row_y)
    curr_top    = min((c.pos[1] - c.half[1] for c in curr_cells), default=curr_row_y)
    over_y = (prev_bottom + curr_top) // 2

    return [(sp[0], over_y), (dp[0], over_y)]


def _route_under(diagram: Diagram, e: Edge, row_ys: list[int],
                 row_heights: list[int]) -> list[tuple[int, int]]:
    """Snap the across-segment to the middle of the actual content gap below
    the source row — accounting for label area which extends below the icon."""
    src = diagram.get(e.src)
    dst = diagram.get(e.dst)
    src_anchor, dst_anchor = resolve_anchors(e, src, dst)
    sp = src.anchor(src_anchor)
    dp = dst.anchor(dst_anchor)

    # Locate source row.
    src_y = src.pos[1]
    src_row = min(range(len(row_ys)), key=lambda i: abs(row_ys[i] - src_y))

    if src_row + 1 >= len(row_ys):
        return [(sp[0], max(sp[1], dp[1]) + 36), (dp[0], max(sp[1], dp[1]) + 36)]

    TOL = 5
    src_row_y = row_ys[src_row]
    next_row_y = row_ys[src_row + 1]
    src_cells  = [c for c in diagram.components if abs(c.pos[1] - src_row_y)  < TOL]
    next_cells = [c for c in diagram.components if abs(c.pos[1] - next_row_y) < TOL]

    row_bottom = max((c.pos[1] + c.half[1] + LABEL_HEIGHT.get(c.shape, 0)
                      for c in src_cells), default=src_row_y)
    next_top   = min((c.pos[1] - c.half[1] for c in next_cells), default=next_row_y)
    under_y = (row_bottom + next_top) // 2

    return [(sp[0], under_y), (dp[0], under_y)]

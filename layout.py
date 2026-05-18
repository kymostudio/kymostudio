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
from typing import Iterable

from model import Component, Diagram, Edge, LABEL_HEIGHT


# ── Sizing ─────────────────────────────────────────────────────────────
# Empirically-tuned character widths (avg over Latin + Vietnamese diacritics
# at the given pixel size). Off by < 5% which is plenty for layout.
_CHAR_W_NAME = 7.6        # 14px component name
_CHAR_W_SUB  = 6.4        # 11.5px subtitle
_LABEL_GAP   = 6
_LINE_HEIGHT = 18

_ICON_DIMS: dict[str, tuple[int, int]] = {
    "circle":     (76, 76),
    "cube":       (80, 80),
    "cube-big":   (100, 100),   # body; halo adds ~16px around but we don't count it for spacing
    "box":        (70, 70),
    "cylinder":   (70, 70),
    "hex":        (70, 64),     # flat-top hexagon
    "annotation": (40, 32),
}


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
    last_y_after_rows = y - row_gap + region_padding_y // 2  # for canvas height

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
    sp = src.anchor(e.src_anchor)
    dp = dst.anchor(e.dst_anchor)

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
    sp = src.anchor(e.src_anchor)
    dp = dst.anchor(e.dst_anchor)

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

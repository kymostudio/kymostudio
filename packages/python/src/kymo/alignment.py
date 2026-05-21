"""Local alignment — parent/child positioning + auto-bounded regions.

Components with a `parent` reference have their `pos` computed AFTER all
absolutely-positioned anchors are placed. Each child declares which side
of its parent it sits against (`align`) and how much breathing room
(`align_gap`).

Regions with a `contains` list have their `bounds` computed AFTER all
component positions are resolved — the bounding box automatically grows
to enclose every listed component INCLUDING its label area.

Resolution is depth-first with cycle detection; safe to call once per
diagram before rendering.

Example:

    Component("orch",       pos=(860, 200))
    Component("researcher", parent="orch", align="right",  align_gap=50)
    Component("planner",    parent="orch", align="bottom", align_gap=70)
    Component("fs",         parent="planner", align="right", align_gap=70)
    Component("todo",       parent="fs",      align="right", align_gap=20)

Moving `orch` by 50 px moves every descendant by 50 px automatically.
"""
from __future__ import annotations

from .model import LABEL_HEIGHT, Component, Diagram

# Approximate per-char widths used to estimate label extent. The renderer
# does not have access to real font metrics; these constants are tuned for
# the diagram's font stack (14 px bold name, 11.5 px regular subtitle).
# Slight overestimate is intentional — narrow labels never overlap, wide
# labels get just-enough breathing room.
_NAME_CHAR_W = 7        # 14 px bold sans average ≈ 7 px/char
_SUB_CHAR_W  = 6        # 11.5 px regular sans ≈ 6 px/char


def _label_half_width(c: Component) -> int:
    """Approximate half-width of the longest text line under `c`'s icon.
    Used by the auto-layout resolver to prevent adjacent components' labels
    from overlapping. Returns 0 for shapes that don't render labels
    (annotation, badge)."""
    if c.shape in ("annotation", "badge"):
        return 0
    name_w = len(c.name) * _NAME_CHAR_W
    sub_w  = len(c.subtitle) * _SUB_CHAR_W
    return max(name_w, sub_w) // 2


def _effective_half(c: Component) -> tuple[int, int]:
    """`Component.half` widened to whichever is bigger: icon or label.
    Heights stay icon-only (`half[1]`); the label area below the icon is
    accounted for separately via `LABEL_HEIGHT`."""
    hw, hh = c.half
    return (max(hw, _label_half_width(c)), hh)


def resolve_alignments(diagram: Diagram) -> None:
    """Five-pass resolver:

    1. `_resolve_auto_layouts` — Figma-style: regions with `layout` direction
       position every child component along that axis with `gap` spacing.
    2. `_resolve_component_alignments` — pairwise parent/child anchoring
       (`align="right"` etc) for components not placed by auto-layout.
    3. `_resolve_region_bounds` — region bounding boxes computed from the
       enclosed components (after their positions are final).
    4. `_stagger_fanin_edges` — when several edges converge on the same
       anchor (e.g. 3 webs → 1 userdb), spread their dst attach points
       so the arrowheads don't pile up at one pixel.
    5. `_auto_size_canvas` — if `diagram.width`/`height` are 0, derive
       them from the resolved geometry (component + region + via extents)
       plus a margin. Explicit `canvas W x H` directive overrides.

    Mutates `diagram` in place."""
    _resolve_auto_layouts(diagram)
    _resolve_component_alignments(diagram)
    _resolve_region_bounds(diagram)
    _stagger_fanin_edges(diagram)
    _stagger_trunk_lanes(diagram)
    _auto_size_canvas(diagram)


def _stagger_trunk_lanes(diagram: Diagram, min_step: int = 8, max_step: int = 16) -> None:
    """Sugiyama-style channel routing: when several Z-shape edges run
    through the same vertical (or horizontal) corridor between two
    component columns, assign each edge its own trunk-axis lane so the
    long perpendicular segments stay parallel instead of stacking on
    top of one another.

    A "channel" is keyed by the pair of orthogonal coordinates the
    edges enter/exit on — e.g. for horizontal anchors, all edges whose
    `(src.right.x, dst.left.x)` collapse to the same gap share a
    channel. Within each channel of N edges, lane offsets are
    `(i − (N−1)/2) · step` (centred on the channel midpoint), sorted
    by `(src.y, dst.y)` for a stable, geometrically sensible ordering.

    Mutates each edge's `trunk_offset`; route_edge then shifts the
    midpoint coord on the perpendicular axis."""
    from collections import defaultdict

    from .model import resolve_anchors

    horiz: dict[tuple[int, int], list] = defaultdict(list)
    vert:  dict[tuple[int, int], list] = defaultdict(list)
    for e in diagram.edges:
        if e.via:                                    # explicit routing wins
            continue
        src = diagram.get_node(e.src)
        dst = diagram.get_node(e.dst)
        if src is None or dst is None:
            continue
        sa, da = resolve_anchors(e, src, dst)
        sp = src.anchor(sa)
        dp = dst.anchor(da)
        if sp[0] == dp[0] or sp[1] == dp[1]:        # already axis-aligned
            continue
        if sa in ("left", "right"):
            # Horizontal anchors → vertical trunk at midpoint x. Channel
            # key snaps endpoints to the grid so near-equal x's group.
            horiz[(round(sp[0] / 8) * 8, round(dp[0] / 8) * 8)].append((e, sp, dp))
        else:
            vert[(round(sp[1] / 8) * 8, round(dp[1] / 8) * 8)].append((e, sp, dp))

    def assign(entries: list, sort_idx: int, channel_width: int) -> None:
        n = len(entries)
        if n <= 1:
            return
        # Only stagger when trunks would actually OVERLAP on the
        # perpendicular axis. Two edges whose trunk-axis ranges don't
        # intersect can share the channel midpoint — their trunks
        # diverge from there (eg. one going up, one going down) and a
        # forced lane offset just produces visible asymmetry (one
        # bends early, the other late) without any overlap benefit.
        def overlaps(t1, t2) -> bool:
            r1 = sorted([t1[1][sort_idx], t1[2][sort_idx]])
            r2 = sorted([t2[1][sort_idx], t2[2][sort_idx]])
            return max(r1[0], r2[0]) < min(r1[1], r2[1])

        if not any(overlaps(entries[i], entries[j])
                   for i in range(n) for j in range(i + 1, n)):
            return

        # Lane step is `max_step` (16 px) by default for clearly visible
        # separation, but shrinks toward `min_step` (8 px) when the
        # channel is too narrow to fit `(n+1)` lanes at the full step.
        step = max(min_step, min(max_step, channel_width // (n + 1)))
        entries.sort(key=lambda t: (t[1][sort_idx], t[2][sort_idx]))
        mid = (n - 1) / 2
        for i, (e, _sp, _dp) in enumerate(entries):
            e.trunk_offset = round((i - mid) * step)

    for (src_x, dst_x), entries in horiz.items():
        assign(entries, sort_idx=1, channel_width=abs(dst_x - src_x))
    for (src_y, dst_y), entries in vert.items():
        assign(entries, sort_idx=0, channel_width=abs(dst_y - src_y))


def _stagger_fanin_edges(diagram: Diagram) -> None:
    """ELK-style port distribution at both endpoints:

      - **Fan-in**  (N srcs → 1 dst, N ≥ 2): stagger `dst_offset` so
        arrowheads land at distinct points on the destination edge.
      - **Fan-out** (1 src → N dsts, N ≥ 3): stagger `src_offset` so
        departing arrows leave the source edge at distinct ports.
        The N ≥ 3 threshold keeps the "tree-branch" look for 2-edge
        fan-out (one up, one down) — those naturally diverge and an
        extra src spread just produces visible staircase steps.

    Spacing is capped at 16 px per step and at the icon's cross-axis
    dimension so offsets stay inside the icon. Pre-existing explicit
    offsets are accumulated on top of, not replaced."""
    from collections import defaultdict

    from .model import resolve_anchors

    fanin:  dict[tuple[str, str], list[tuple]] = defaultdict(list)
    fanout: dict[tuple[str, str], list[tuple]] = defaultdict(list)
    for e in diagram.edges:
        src = diagram.get_node(e.src)
        dst = diagram.get_node(e.dst)
        if src is None or dst is None:
            continue
        sa, da = resolve_anchors(e, src, dst)
        fanin[(e.dst, da)].append((e, src, dst, sa, da))
        fanout[(e.src, sa)].append((e, src, dst, sa, da))

    STEP = 16

    def spread(entries, anchor: str, attr: str, node_idx: int,
               min_count: int) -> None:
        """Stagger `attr` (src_offset/dst_offset) on edges sharing `anchor`.
        Skipped unless `len(entries) >= min_count`. Sorted by the OTHER
        endpoint's position on the perpendicular axis so ports come out
        in a non-crossing order (a → c-d-e from top to bottom → port
        from top to bottom on a.right).

        Edges marked `{ shared }` opt out — they stay on the centre
        port. They're still counted in `min_count` so a 3-edge fan-out
        with one `shared` still triggers stagger for the other two."""
        n = len(entries)
        if n < min_count:
            return
        # For fan-out (attr == "src_offset"), drop shared-port edges.
        if attr == "src_offset":
            entries = [t for t in entries if not getattr(t[0], "shared_port", False)]
            if len(entries) < 1:
                return
            n = len(entries)
        node = entries[0][node_idx]
        other_idx = 2 if node_idx == 1 else 1
        if anchor in ("left", "right"):
            cross_span = node.half[1] * 2
            entries.sort(key=lambda t: t[other_idx].pos[1])
            spread_total = min(cross_span - 16, STEP * (n - 1))
            mid = (n - 1) / 2
            for i, t in enumerate(entries):
                e = t[0]
                dy = round((i - mid) / max(mid, 1) * (spread_total / 2))
                cur = getattr(e, attr)
                setattr(e, attr, (cur[0], cur[1] + dy))
        elif anchor in ("top", "bottom"):
            cross_span = node.half[0] * 2
            entries.sort(key=lambda t: t[other_idx].pos[0])
            spread_total = min(cross_span - 16, STEP * (n - 1))
            mid = (n - 1) / 2
            for i, t in enumerate(entries):
                e = t[0]
                dx = round((i - mid) / max(mid, 1) * (spread_total / 2))
                cur = getattr(e, attr)
                setattr(e, attr, (cur[0] + dx, cur[1]))

    for (_, da), entries in fanin.items():
        spread(entries, da, "dst_offset", node_idx=2, min_count=2)
    for (_, sa), entries in fanout.items():
        spread(entries, sa, "src_offset", node_idx=1, min_count=3)


def _auto_size_canvas(diagram: Diagram, margin: int = 30) -> None:
    """Compute canvas dimensions from resolved geometry when not specified.

    Walks all components (icon + label extents), regions (rect bounds),
    and edge via points / explicit label positions. Computes both min and
    max extents — if the leftmost/topmost extent sits closer to the canvas
    edge than `margin`, every element is shifted to give it that margin.
    This lets orphan components (no region/layout) render correctly at
    their default `(0, 0)` position. Only overwrites `diagram.width` /
    `diagram.height` if they are 0 (sentinel)."""
    if diagram.width > 0 and diagram.height > 0:
        return

    min_x = min_y =  10**9
    max_x = max_y = -10**9

    for c in diagram.components:
        eff_hw = max(c.half[0], _label_half_width(c))
        lh     = LABEL_HEIGHT.get(c.shape, 0) if (c.name or c.subtitle) else 0
        left   = c.pos[0] - eff_hw
        right  = c.pos[0] + eff_hw
        top    = c.pos[1] - c.half[1]
        bottom = c.pos[1] + c.half[1] + lh
        if left   < min_x: min_x = left
        if top    < min_y: min_y = top
        if right  > max_x: max_x = right
        if bottom > max_y: max_y = bottom

    for r in diagram.regions:
        if r.bounds == (0, 0, 0, 0):
            continue                                 # invisible layout-only
        x, y, w, h = r.bounds
        if x     < min_x: min_x = x
        if y     < min_y: min_y = y
        if x + w > max_x: max_x = x + w
        if y + h > max_y: max_y = y + h

    for e in diagram.edges:
        for vx, vy in e.via:
            if vx < min_x: min_x = vx
            if vy < min_y: min_y = vy
            if vx > max_x: max_x = vx
            if vy > max_y: max_y = vy
        if e.label_pos is not None:
            lx, ly = e.label_pos
            if lx < min_x: min_x = lx
            if ly < min_y: min_y = ly
            if lx > max_x: max_x = lx
            if ly > max_y: max_y = ly

    if min_x > max_x:                                # nothing to size against
        return

    dx = margin - min_x if min_x < margin else 0
    dy = margin - min_y if min_y < margin else 0
    if dx or dy:
        for c in diagram.components:
            c.pos = (c.pos[0] + dx, c.pos[1] + dy)
        for r in diagram.regions:
            if r.bounds == (0, 0, 0, 0):
                continue
            x, y, w, h = r.bounds
            r.bounds = (x + dx, y + dy, w, h)
        for e in diagram.edges:
            e.via = [(vx + dx, vy + dy) for vx, vy in e.via]
            if e.label_pos is not None:
                e.label_pos = (e.label_pos[0] + dx, e.label_pos[1] + dy)
        max_x += dx
        max_y += dy

    if diagram.width == 0:
        diagram.width = max_x + margin
    if diagram.height == 0:
        diagram.height = max_y + margin

    # Enforce min 4:3 (landscape) aspect: pad width and re-center
    # horizontally so a tall vertical stack doesn't look like a column.
    # Wide canvases are left untouched.
    if diagram.width * 3 < diagram.height * 4:
        new_w = (diagram.height * 4) // 3
        shift = (new_w - diagram.width) // 2
        for c in diagram.components:
            c.pos = (c.pos[0] + shift, c.pos[1])
        for r in diagram.regions:
            if r.bounds == (0, 0, 0, 0):
                continue
            x, y, w, h = r.bounds
            r.bounds = (x + shift, y, w, h)
        for e in diagram.edges:
            e.via = [(vx + shift, vy) for vx, vy in e.via]
            if e.label_pos is not None:
                e.label_pos = (e.label_pos[0] + shift, e.label_pos[1])
        diagram.width = new_w

    _snap_to_grid(diagram)


def _snap_to_grid(diagram: Diagram, grid: int = 8) -> None:
    """Round all coordinates to multiples of `grid` (default 8px — matches
    Material Design / iOS / Figma defaults). Component centers, edge
    waypoints, label positions and canvas dimensions snap directly.
    Region bounds are **re-derived** from the snapped component
    positions (using the region's padding) rather than snapped
    independently — that prevents a region rect from drifting off-centre
    relative to its content when `s(x)` rounds down but `s_up(w)` rounds
    up. Shape widths (hex 70, circle 76, cube 80) are left alone so
    their edges may sit a half-pixel off the grid."""
    def s(v: int) -> int:
        return round(v / grid) * grid

    def s_up(v: int) -> int:
        return ((v + grid - 1) // grid) * grid

    for c in diagram.components:
        c.pos = (s(c.pos[0]), s(c.pos[1]))
    for e in diagram.edges:
        e.via = [(s(vx), s(vy)) for vx, vy in e.via]
        if e.label_pos is not None:
            e.label_pos = (s(e.label_pos[0]), s(e.label_pos[1]))

    by_id = {c.id: c for c in diagram.components}
    for r in diagram.regions:
        if r.bounds == (0, 0, 0, 0) or not r.contains:
            continue
        # Re-derive bounds from now-snapped positions so the rect stays
        # centred on its content. Mirror `_resolve_region_bounds` (label-
        # aware so unlabelled components don't reserve an empty band).
        cells = [by_id[cid] for cid in r.contains if cid in by_id]
        if not cells:
            continue
        pad_x, pad_y = r.padding
        pad_b = r.padding_bottom if r.padding_bottom is not None else pad_y
        eff_hws = [max(c.half[0], _label_half_width(c)) for c in cells]
        xs_left  = [c.pos[0] - ew for c, ew in zip(cells, eff_hws)]
        xs_right = [c.pos[0] + ew for c, ew in zip(cells, eff_hws)]
        ys_top   = [c.pos[1] - c.half[1] for c in cells]
        ys_bot   = [c.pos[1] + c.half[1]
                    + (LABEL_HEIGHT.get(c.shape, 0) if (c.name or c.subtitle) else 0)
                    for c in cells]
        x = min(xs_left)  - pad_x
        y = min(ys_top)   - pad_y
        w = max(xs_right) - x + pad_x
        h = max(ys_bot)   - y + pad_b
        r.bounds = (x, y, w, h)

    diagram.width = s_up(diagram.width)
    diagram.height = s_up(diagram.height)


def _resolve_auto_layouts(diagram: Diagram) -> None:
    """For each region with `layout` set, position every contained component
    along the layout axis starting from the region's `pos` (top-left).

    Regions without a `pos` are assumed to be positioned by an enclosing
    `layout { … }` tree (which already laid out their children via
    `apply_layout_tree` at parse time) — skip them silently."""
    for r in diagram.regions:
        if r.layout is None:
            continue
        if r.pos is None:
            continue
        if not r.contains:
            continue

        children = [diagram.get(cid) for cid in r.contains]
        pad_x, pad_y = r.padding
        ox, oy = r.pos
        cursor_x = ox + pad_x
        cursor_y = oy + pad_y

        # Use EFFECTIVE half-width (max of icon and label) so adjacent
        # children's labels don't overlap. `gap` then measures the clear
        # distance between adjacent LABEL ends, not icon edges.
        effs = [_effective_half(c) for c in children]

        if r.layout == "horizontal":
            # Cross-axis: vertical alignment based on the tallest child icon
            max_h = max(eh for _, eh in effs)
            for c, (ew, eh) in zip(children, effs):
                _, ch = c.half
                if r.align == "start":
                    cy = cursor_y + ch
                elif r.align == "end":
                    cy = cursor_y + 2 * max_h - ch
                else:  # center (default)
                    cy = cursor_y + max_h
                c.pos = (cursor_x + ew, cy)
                cursor_x += ew * 2 + r.gap

        else:  # vertical
            # Cross-axis: horizontal alignment based on the widest child
            # (icon or label, whichever is wider).
            max_w = max(ew for ew, _ in effs)
            for c, (ew, eh) in zip(children, effs):
                cw, _ = c.half
                if r.align == "start":
                    cx = cursor_x + cw
                elif r.align == "end":
                    cx = cursor_x + 2 * max_w - cw
                else:  # center
                    cx = cursor_x + max_w
                c.pos = (cx, cursor_y + eh)
                cursor_y += eh * 2 + r.gap


def _resolve_component_alignments(diagram: Diagram) -> None:
    resolved: set[str] = set()

    def resolve(cid: str, path: tuple[str, ...] = ()) -> None:
        if cid in resolved:
            return
        if cid in path:
            chain = " → ".join((*path, cid))
            raise ValueError(f"alignment cycle: {chain}")

        comp = diagram.get(cid)
        if comp.parent is None:
            resolved.add(cid)
            return

        # Resolve the parent first (depth-first).
        resolve(comp.parent, path + (cid,))
        parent = diagram.get(comp.parent)

        if comp.align is None:
            raise ValueError(
                f"component {cid!r} has parent={comp.parent!r} but no align side"
            )

        comp.pos = _align_to(parent, comp, comp.align, comp.align_gap, comp.align_offset)
        resolved.add(cid)

    for c in diagram.components:
        resolve(c.id)


def _resolve_region_bounds(diagram: Diagram) -> None:
    """For each region with `contains`, compute its bounding box as the
    envelope of all listed components (icon + label area), padded.

    `padding_bottom` (when set on the region) overrides the default
    bottom padding (`padding[1]`); useful to compensate visually for the
    region label sitting ABOVE the rect."""
    for r in diagram.regions:
        if not r.contains:
            continue
        cells = [diagram.get(cid) for cid in r.contains]
        pad_x, pad_y = r.padding
        pad_b = r.padding_bottom if r.padding_bottom is not None else pad_y

        # Use effective half-width so the rect wraps labels too, not just
        # icons. Without this, long labels (e.g., "Academic Papers") would
        # extend past the region rect.
        eff_hws  = [max(c.half[0], _label_half_width(c)) for c in cells]
        xs_left  = [c.pos[0] - ew for c, ew in zip(cells, eff_hws)]
        xs_right = [c.pos[0] + ew for c, ew in zip(cells, eff_hws)]
        ys_top   = [c.pos[1] - c.half[1] for c in cells]
        # Bottom extent INCLUDES label area when the component has one;
        # an unlabelled component shouldn't reserve an empty band.
        ys_bot   = [c.pos[1] + c.half[1]
                    + (LABEL_HEIGHT.get(c.shape, 0) if (c.name or c.subtitle) else 0)
                    for c in cells]

        x = min(xs_left)  - pad_x
        y = min(ys_top)   - pad_y
        w = max(xs_right) - x + pad_x
        h = max(ys_bot)   - y + pad_b
        r.bounds = (x, y, w, h)


def _align_to(parent: Component, child: Component, side: str,
              gap: int, offset: tuple[int, int]) -> tuple[int, int]:
    """Return the (cx, cy) for `child` aligned on `side` of `parent`."""
    px, py        = parent.pos
    p_hw, p_hh    = parent.half
    p_label       = LABEL_HEIGHT.get(parent.shape, 0)
    c_hw, c_hh    = child.half
    ox, oy        = offset

    match side:
        case "right":
            # parent's right edge + gap + child half-width
            cx = px + p_hw + gap + c_hw
            cy = py
        case "left":
            cx = px - p_hw - gap - c_hw
            cy = py
        case "bottom":
            # parent's bottom INCLUDING label area; child sits below that
            cx = px
            cy = py + p_hh + p_label + gap + c_hh
        case "top":
            cx = px
            cy = py - p_hh - gap - c_hh
        case _:
            raise ValueError(f"unknown align side: {side!r}")

    return (cx + ox, cy + oy)

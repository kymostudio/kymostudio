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

from model import Component, Diagram, LABEL_HEIGHT


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
    """Four-pass resolver:

    1. `_resolve_auto_layouts` — Figma-style: regions with `layout` direction
       position every child component along that axis with `gap` spacing.
    2. `_resolve_component_alignments` — pairwise parent/child anchoring
       (`align="right"` etc) for components not placed by auto-layout.
    3. `_resolve_region_bounds` — region bounding boxes computed from the
       enclosed components (after their positions are final).
    4. `_auto_size_canvas` — if `diagram.width`/`height` are 0, derive
       them from the resolved geometry (component + region + via extents)
       plus a margin. Explicit `canvas W x H` directive overrides.

    Mutates `diagram` in place."""
    _resolve_auto_layouts(diagram)
    _resolve_component_alignments(diagram)
    _resolve_region_bounds(diagram)
    _auto_size_canvas(diagram)


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


def _resolve_auto_layouts(diagram: Diagram) -> None:
    """For each region with `layout` set, position every contained component
    along the layout axis starting from the region's `pos` (top-left)."""
    for r in diagram.regions:
        if r.layout is None:
            continue
        if r.pos is None:
            raise ValueError(
                f"region {r.id!r} has layout={r.layout!r} but no `pos` anchor"
            )
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
        # Bottom extent INCLUDES label area below the icon.
        ys_bot   = [c.pos[1] + c.half[1] + LABEL_HEIGHT.get(c.shape, 0)
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

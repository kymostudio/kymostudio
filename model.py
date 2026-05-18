"""Data model for the container diagram.

Everything in the diagram is described as plain data — components, regions,
edges. The renderer is dumb: it takes this data and emits SVG. To change
the diagram, edit `data.py`.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

Shape   = Literal["circle", "cube", "cube-big", "box", "cylinder", "hex", "annotation",
                  "aws-tile", "aws-tile-hero", "badge"]
Accent  = Literal["green", "orange", "blue", "red"]
Anchor  = Literal["top", "right", "bottom", "left", "center"]
Style   = Literal["gray", "orange"]


# Half-size lookup for anchor-point computation. (w/2, h/2) of icon bounding box.
SHAPE_HALF: dict[Shape, tuple[int, int]] = {
    "circle":     (38, 38),
    "cube":       (40, 40),
    "cube-big":   (50, 50),
    "box":        (35, 35),
    "cylinder":   (35, 35),
    "hex":        (35, 32),     # flat-top hexagon — wider than tall
    "annotation": (0, 0),
    "aws-tile":      (32, 32),
    "aws-tile-hero": (40, 40),  # +25% over aws-tile — visual weight for orchestrator (§6.7.2)
    "badge":      (14, 14),     # numbered step circle (§6.7.3)
}

# How much space the name+subtitle take BELOW the icon — used to push
# top/bottom anchor points outside the visible label area so edges don't
# cross subtitle text.
LABEL_HEIGHT: dict[Shape, int] = {
    "circle":     38,
    "cube":       42,
    "cube-big":   48,
    "box":        38,
    "cylinder":   38,
    "hex":        40,
    "annotation": 0,
    "aws-tile":      48,
    "aws-tile-hero": 48,
    "badge":      0,
}


@dataclass
class Component:
    id: str
    name: str
    subtitle: str
    icon: str               # key into ICONS
    shape: Shape
    accent: Accent
    pos: tuple[int, int]    # center (cx, cy)

    # ── Local alignment (parent/child) ──────────────────────────────
    # If `parent` is set, this component's `pos` is computed AFTER
    # initial placement, relative to the parent's resolved position.
    # `align` is the side of the parent where this child sits:
    #   "right"  — child to the right of parent, same Y
    #   "left"   — child to the left of parent, same Y
    #   "bottom" — child below parent (under the parent's label area)
    #   "top"    — child above parent
    # `align_gap` is the pixel gap between the parent's outer edge and
    # the child's outer edge (think: padding, not centre-to-centre).
    # `align_offset` is a fine-tune nudge on top of the computed pos.
    parent: str | None = None
    align: Anchor | None = None       # "top" / "right" / "bottom" / "left"
    align_gap: int = 24
    align_offset: tuple[int, int] = (0, 0)

    @property
    def half(self) -> tuple[int, int]:
        return SHAPE_HALF[self.shape]

    def anchor(self, side: Anchor) -> tuple[int, int]:
        """Return the (x, y) where an edge enters/exits this component.
        `bottom` pushes past the label area so edge lines never cross subtitle text."""
        cx, cy = self.pos
        hw, hh = self.half
        lh = LABEL_HEIGHT.get(self.shape, 0)
        match side:
            case "top":    return (cx, cy - hh)
            case "right":  return (cx + hw, cy)
            case "bottom": return (cx, cy + hh + lh)
            case "left":   return (cx - hw, cy)
            case "center": return (cx, cy)


RegionStyle = Literal["outer", "inner"]
# outer — gray dashed (admin boundary: account, VPC, region)        — §6.7.4
# inner — coloured solid (logical subgroup: subnet, namespace, app) — §6.7.4

AutoLayout = Literal["horizontal", "vertical"]
# Figma-style auto-layout: stack contained components in the given direction
# with `gap` spacing and `align` cross-axis alignment. Combine with `pos`
# (top-left anchor) for a fully declarative region — children need no
# individual pos/parent/align.


@dataclass
class Region:
    id: str
    label: str
    bounds: tuple[int, int, int, int] = (0, 0, 0, 0)  # x, y, w, h
    # If `contains` is set, bounds are computed automatically as the bounding
    # box of those components (including their label area below the icon),
    # padded by `padding`. Otherwise `bounds` must be set explicitly.
    contains: list[str] = field(default_factory=list)
    padding: tuple[int, int] = (24, 24)  # (horizontal, vertical) padding
    # Override only the BOTTOM vertical padding. When set, replaces
    # `padding[1]` for the bottom extent only — useful to compensate for
    # the label sitting ABOVE the rect (top feels visually heavier than
    # bottom with symmetric padding). When None, falls back to padding[1].
    padding_bottom: int | None = None
    style: RegionStyle = "outer"
    # Optional icon (key into ICONS) drawn at the top-left of the region;
    # the label is rendered beside it. Used for admin/domain badges
    # (AWS logo on `us-east-1`, site glyph on `<your-company>.com`).
    icon: str | None = None

    # ── Figma-style auto-layout ─────────────────────────────────────
    # When `layout` is set, the resolver positions every component in
    # `contains` inside the region. `pos` is the region's top-left anchor;
    # children flow in `layout` direction with `gap` between them and
    # `align` controls cross-axis alignment.
    # `visible=False` suppresses border + label rendering (layout-only).
    layout: AutoLayout | None = None
    pos: tuple[int, int] | None = None  # top-left, required when layout is set
    gap: int = 24
    align: Literal["start", "center", "end"] = "center"
    visible: bool = True

    # ── Border style overrides ──────────────────────────────────────
    # When set, these override the `style` enum's defaults (outer=6 5
    # slate-300, inner=4 4 slate-400). Use them to declare custom dash
    # patterns or colors per region without inventing new style enums.
    # `border_dash`   — `(X, Y)` for `stroke-dasharray`; `(0, 0)` = solid.
    # `border_stroke` — hex color string like `"#94a3b8"`.
    border_dash: tuple[int, int] | None = None
    border_stroke: str | None = None

    # Horizontal anchor for the region's text label inside the rect.
    # Default "middle" (top-center). Use "start" (top-left) when the
    # region contains a nested inner region whose own label would
    # collide with this region's centered label. "end" = top-right.
    label_anchor: Literal["start", "middle", "end"] = "middle"

    # Vertical position of the label relative to the rect:
    #   "above"  — label sits ABOVE the rect's top edge (classic flowchart
    #              style; safer when contents are near top, but risks
    #              colliding with arrows entering the rect from above)
    #   "inside" — label sits INSIDE the rect at the top (works when an
    #              arrow lands on the rect's top border, because the label
    #              is past the landing point. Required when nested inside
    #              an outer region whose own label is "above").
    # Default `None` → resolved per style: outer → "above", inner → "inside".
    label_position: Literal["above", "inside"] | None = None

    @property
    def half(self) -> tuple[int, int]:
        _, _, w, h = self.bounds
        return (w // 2, h // 2)

    def anchor(self, side: Anchor) -> tuple[int, int]:
        """Return the (x, y) where an edge attaches to this region's border.
        Same signature as `Component.anchor` so edges can target regions
        transparently. Requires `bounds` to be resolved beforehand."""
        x, y, w, h = self.bounds
        match side:
            case "top":    return (x + w // 2, y)
            case "right":  return (x + w,     y + h // 2)
            case "bottom": return (x + w // 2, y + h)
            case "left":   return (x,         y + h // 2)
            case "center": return (x + w // 2, y + h // 2)


Route = Literal["auto", "over", "under", "curve"]
# auto  — straight or single-elbow L based on anchors
# over  — 3-segment up-across-down (for top→top edges spanning regions)
# under — 3-segment down-across-up (for bottom→bottom edges)
# curve — cubic Bézier with tangents matching the anchor directions (S-curve)


@dataclass
class Edge:
    src: str
    dst: str
    label: str
    style: Style = "gray"
    src_anchor: Anchor = "right"
    dst_anchor: Anchor = "left"
    route: Route = "auto"
    via: list[tuple[int, int]] = field(default_factory=list)  # explicit override
    src_offset: tuple[int, int] = (0, 0)  # nudge the source attach point
    dst_offset: tuple[int, int] = (0, 0)  # nudge the destination attach point
    label_offset: tuple[int, int] = (0, 0)
    label_anchor: Literal["src", "dst", "mid"] = "mid"
    label_small: bool = False
    label_pos: tuple[int, int] | None = None
    dashed: bool = False         # render with stroke-dasharray (eg. async fan-out)


@dataclass
class Diagram:
    width: int
    height: int
    title: str = ""             # rendered at top-center of the canvas
    subtitle: str = ""          # smaller, below the title
    components: list[Component] = field(default_factory=list)
    regions: list[Region] = field(default_factory=list)
    edges: list[Edge] = field(default_factory=list)

    def get(self, id: str) -> Component:
        for c in self.components:
            if c.id == id:
                return c
        raise KeyError(f"component {id!r} not in diagram")

    def get_node(self, id: str) -> Component | Region:
        """Lookup either a component or a region by id. Used by the edge
        renderer so `Edge.src` / `Edge.dst` may target either kind of node.
        Component ids win if there is a collision (caller's responsibility
        to keep ids unique)."""
        for c in self.components:
            if c.id == id:
                return c
        for r in self.regions:
            if r.id == id:
                return r
        raise KeyError(f"node {id!r} not in diagram (checked components + regions)")

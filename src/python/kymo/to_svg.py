"""SVG renderer.

Takes a `Diagram` and emits a single self-contained SVG string. Edges are
routed orthogonally through user-specified `via` waypoints with rounded
corners at every interior vertex.
"""
from __future__ import annotations

import re
from html import escape as _xml_escape

from .icons import ICONS, get_icon
from .model import Component, Diagram, Edge, Region, resolve_anchors


_WS_RE = re.compile(r"\s+")


def _x(text: str) -> str:
    """Escape `& < >` for safe XML text content."""
    return _xml_escape(text, quote=False)


def _tidy(svg: str) -> str:
    """Collapse runs of whitespace inside tags; preserve text-content runs."""
    out, last = [], 0
    for m in re.finditer(r">([^<]*)<", svg):
        out.append(svg[last:m.start() + 1])           # up through the closing `>`
        # tag-internal text content — keep but trim
        text = m.group(1)
        out.append(text.strip() and (" " + text.strip() + " ") or "")
        last = m.end() - 1                            # back up to the next `<`
    out.append(svg[last:])
    s = "".join(out)
    # collapse runs of whitespace in attributes/whitespace
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n[ \t]+", "\n", s)
    return s


# ── Static SVG fragments ──────────────────────────────────────────────
STYLE = """
text { fill: #1f2937; }
.bg-grid { fill: url(#dot-grid); }
.region-rect {
  fill: rgba(15, 23, 42, 0.02);
  stroke: #232f3e;           /* AWS navy — admin boundary */
  stroke-width: 1.5;
  stroke-dasharray: 6 5;
}
.region-rect--inner {
  fill: rgba(124, 58, 237, 0.03);
  stroke: #7c3aed;           /* purple — logical subgroup */
  stroke-width: 1.4;
  stroke-dasharray: 4 4;
}
.region-rect--cluster {
  fill: #eaf3ff;             /* light-blue solid (mingrammer cluster look) */
  stroke: #b8d0ee;
  stroke-width: 1.2;
  stroke-dasharray: none;
}
.region-label {
  font-size: 13px; font-weight: 700; fill: #232f3e; letter-spacing: 0.06em;
  text-transform: uppercase;
  paint-order: stroke; stroke: #fafafa; stroke-width: 4; stroke-linejoin: round;
}
.region-label--inner   { fill: #6d28d9; }
.region-label--cluster {
  fill: #475569; font-size: 11px; letter-spacing: 0.02em;
  text-transform: none; font-weight: 500;
  paint-order: stroke; stroke: #eaf3ff; stroke-width: 3;
}
.component-name { font-size: 14px; font-weight: 700; text-anchor: middle; fill: #0f172a; }
.component-sub  { font-size: 11.5px; font-weight: 400; text-anchor: middle; fill: #64748b; }
.diagram-title    { font-size: 20px; font-weight: 800; text-anchor: middle; fill: #0f172a; letter-spacing: 0.01em; }
.diagram-subtitle { font-size: 13px; font-weight: 400; text-anchor: middle; fill: #64748b; }
.icon-shadow { filter: url(#shadow); }
.edge-path {
  fill: none;
  stroke: #64748b;
  stroke-width: 1.8;
  stroke-linejoin: round;
  stroke-linecap: round;
  /* `filter: drop-shadow(...)` removed — rsvg-convert mis-renders the
     first path under a drop-shadow filter (drops it entirely). The
     shadow was barely visible anyway. */
}
.edge-path--orange { stroke: #ea580c; }
.edge-shadow {
  fill: none;
  stroke: rgba(15, 23, 42, 0.06);
  stroke-width: 4.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.edge-label {
  font-size: 11.5px; font-weight: 500; fill: #334155; text-anchor: middle;
  paint-order: stroke; stroke: #fafafa; stroke-width: 4; stroke-linejoin: round;
}
.edge-label--ext   { fill: #c2410c; font-weight: 600; }
.edge-label--small { font-size: 10.5px; }
"""

# Animation presets — appended to STYLE when render(animate=<name>).
# Use render(animate=True) for the default ("flow"), or pass a name
# explicitly for variants.
#
# Each preset is pure CSS keyframes — no JavaScript. All presets target
# `.edge-path` only (component-level animation flickers due to the
# drop-shadow filter interaction — see ANIM_PRESETS comment).
ANIM_PRESETS: dict[str, str] = {
    # Flowing dashes along each arrow + gentle component breath.
    # Default. Best for showing dataflow direction.
    "flow": """
@keyframes edge-flow {
  from { stroke-dashoffset: 16; }
  to   { stroke-dashoffset:  0; }
}
.edge-path {
  stroke-dasharray: 8 4;
  animation: edge-flow 1.2s linear infinite;
}
.edge-path--orange { animation-duration: 0.8s; }

@keyframes component-breath {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.92; }   /* 8 % dip */
}
.icon-shadow {
  animation: component-breath 2.4s ease-in-out infinite;
}

/* `accent="red"` components (HITL etc.) — pulse hue toward red so the
   "needs human" semantic surfaces only in animated mode. */
@keyframes alert-flash {
  0%, 70%, 100% { filter: hue-rotate(0deg); }
  35%           { filter: hue-rotate(-130deg); }
}
.alert-pulse { animation: alert-flash 2.4s ease-in-out infinite; }
""",

    # Slower flow with longer dashes — calmer, suitable for slides.
    "slow": """
@keyframes edge-flow {
  from { stroke-dashoffset: 24; }
  to   { stroke-dashoffset:  0; }
}
.edge-path {
  stroke-dasharray: 12 6;
  animation: edge-flow 2.4s linear infinite;
}
.edge-path--orange { animation-duration: 1.6s; }
""",

    # Pulsing edges (no dashes) — emphasises connection liveness rather
    # than directionality. Useful when many edges share a target.
    "pulse": """
@keyframes edge-pulse {
  0%, 100% { stroke-opacity: 1; }
  50%      { stroke-opacity: 0.4; }
}
.edge-path {
  animation: edge-pulse 1.6s ease-in-out infinite;
}
.edge-path--orange { animation-duration: 1.1s; }
""",

    # "Marching ants" — short dashes, fast — selection-style highlight.
    "ants": """
@keyframes edge-flow {
  from { stroke-dashoffset:  8; }
  to   { stroke-dashoffset:  0; }
}
.edge-path {
  stroke-dasharray: 4 3;
  animation: edge-flow 0.6s linear infinite;
}
.edge-path--orange { animation-duration: 0.4s; }
""",
}

# Back-compat alias kept for old callers passing `animate=True`.
ANIM_STYLE = ANIM_PRESETS["flow"]

DEFS = """
<!-- Open-V arrowheads: stroke-only, thinner, more elegant than filled triangles.
     markerUnits=userSpaceOnUse keeps the stroke at the declared width
     regardless of the path's own stroke-width. -->
<marker id="arrow-gray" viewBox="0 0 12 10" refX="11" refY="5"
        markerWidth="11" markerHeight="11" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M2,1 L11,5 L2,9" fill="none"
        stroke="#64748b" stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round"/>
</marker>
<marker id="arrow-orange" viewBox="0 0 12 10" refX="11" refY="5"
        markerWidth="11" markerHeight="11" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M2,1 L11,5 L2,9" fill="none"
        stroke="#ea580c" stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round"/>
</marker>

<!-- Soft drop shadow for icons -->
<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
  <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.18"/>
</filter>

<!-- Engineering-paper dot grid (very subtle) -->
<pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
  <circle cx="1" cy="1" r="0.8" fill="#0f172a" fill-opacity="0.045"/>
</pattern>

<!-- Gradient highlight for cube faces (subtle, top→bottom darken) -->
<linearGradient id="g-face-front" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="#82c70a"/>
  <stop offset="100%" stop-color="#6ba600"/>
</linearGradient>
<linearGradient id="g-face-top" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="#b7e756"/>
  <stop offset="100%" stop-color="#a0d440"/>
</linearGradient>
<linearGradient id="g-face-side" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="#588a00"/>
  <stop offset="100%" stop-color="#446a00"/>
</linearGradient>
<linearGradient id="g-box-orange" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="#fbbf24"/>
  <stop offset="100%" stop-color="#f59e0b"/>
</linearGradient>
<linearGradient id="g-cyl-orange" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="#fb923c"/>
  <stop offset="100%" stop-color="#ea7c1e"/>
</linearGradient>
<linearGradient id="g-user-blue" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="#3b82f6"/>
  <stop offset="100%" stop-color="#1d4ed8"/>
</linearGradient>
"""


# ── Edge routing ──────────────────────────────────────────────────────
def points_to_rounded_path(pts: list[tuple[int, int]], r: int = 10) -> str:
    """Build an orthogonal SVG path with a small quadratic-bezier round
    at every interior corner."""
    if len(pts) < 2:
        raise ValueError("need at least 2 points")
    if len(pts) == 2:
        x0, y0 = pts[0]
        x1, y1 = pts[1]
        return f"M {x0},{y0} L {x1},{y1}"

    out = [f"M {pts[0][0]},{pts[0][1]}"]
    for i in range(1, len(pts) - 1):
        prev = pts[i - 1]
        curr = pts[i]
        nxt  = pts[i + 1]

        # Vector into and out of the corner.
        dx_in,  dy_in  = curr[0] - prev[0], curr[1] - prev[1]
        dx_out, dy_out = nxt[0] - curr[0], nxt[1] - curr[1]

        # Clamp the round radius to half the shorter side.
        rr = min(r, abs(dx_in) // 2, abs(dy_in) // 2,
                    abs(dx_out) // 2, abs(dy_out) // 2)
        if rr <= 0:
            out.append(f"L {curr[0]},{curr[1]}")
            continue

        # Approach point (rr units before the corner) and depart point.
        ux_in,  uy_in  = (1 if dx_in  > 0 else (-1 if dx_in  < 0 else 0),
                          1 if dy_in  > 0 else (-1 if dy_in  < 0 else 0))
        ux_out, uy_out = (1 if dx_out > 0 else (-1 if dx_out < 0 else 0),
                          1 if dy_out > 0 else (-1 if dy_out < 0 else 0))

        ax = curr[0] - ux_in * rr
        ay = curr[1] - uy_in * rr
        bx = curr[0] + ux_out * rr
        by = curr[1] + uy_out * rr

        out.append(f"L {ax},{ay}")
        out.append(f"Q {curr[0]},{curr[1]} {bx},{by}")

    out.append(f"L {pts[-1][0]},{pts[-1][1]}")
    return " ".join(out)


def _anchor_pos(src, anchor, offset):
    sp = src.anchor(anchor)
    return (sp[0] + offset[0], sp[1] + offset[1])


def _region_label_clearance(r: Region, side: str) -> int:
    """How far INTO the rect the arrowhead must sit so its 11-px marker
    doesn't get hidden behind the region's label halo. Returns 0 when the
    label is on a different side than the arrow approach."""
    pos = getattr(r, "label_position", None) or (
        "inside" if getattr(r, "style", "outer") == "inner" else "above"
    )
    # Label is always at the TOP — only "top" approach risks hiding the
    # arrowhead. Other anchors (right/left/bottom) approach a label-free
    # edge.
    if side != "top":
        return 0
    # Halo extents (4 px around text; arrowhead is 11 px tall):
    #   label "above":  halo ends ~4 px BELOW rect.top (above the rect).
    #     Arrowhead at rect.top extends 11 px up → 7 px overlap → push ≥10
    #     px down into rect.
    #   label "inside": label baseline at rect.top + 18, halo to rect.top
    #     + 24. Arrowhead at rect.top extends 11 px down → 13 px halo
    #     overlap → push ≥35 px down to fully clear.
    return 10 if pos == "above" else 35


def route_edge(e: Edge, d: Diagram) -> list[tuple[int, int]]:
    src = d.get_node(e.src)         # accepts Component or Region
    dst = d.get_node(e.dst)
    src_anchor, dst_anchor = resolve_anchors(e, src, dst)
    sp = _anchor_pos(src, src_anchor, e.src_offset)
    dp = _anchor_pos(dst, dst_anchor, e.dst_offset)

    # Auto label-clearance: when targeting a region's top, push the
    # endpoint deeper into the rect so the arrowhead doesn't get hidden
    # behind the label halo. Only triggers if the user hasn't already
    # set a y-offset (respect explicit positioning).
    if isinstance(dst, Region) and dst_anchor == "top" and e.dst_offset[1] == 0:
        dp = (dp[0], dp[1] + _region_label_clearance(dst, "top"))

    if e.via:
        return [sp, *e.via, dp]

    # Explicit `straight` line shape — direct from sp to dp regardless
    # of geometry (used for diagonal links between off-axis components).
    if e.route == "straight":
        return [sp, dp]

    # Already axis-aligned — single straight segment.
    if sp[0] == dp[0] or sp[1] == dp[1]:
        return [sp, dp]

    # Z-shape with the perpendicular cross-segment at the midpoint
    # between src and dst, plus `trunk_offset` for channel lane
    # assignment (Sugiyama-style; see alignment._stagger_trunk_lanes).
    # Side anchors → H-V-H; top/bottom anchors → V-H-V.
    lane = getattr(e, "trunk_offset", 0)
    if src_anchor in ("left", "right"):
        mid_x = (sp[0] + dp[0]) // 2 + lane
        return [sp, (mid_x, sp[1]), (mid_x, dp[1]), dp]
    else:  # top, bottom
        mid_y = (sp[1] + dp[1]) // 2 + lane
        return [sp, (sp[0], mid_y), (dp[0], mid_y), dp]


def smooth_curve(sp, dp, src_anchor, dst_anchor) -> str:
    """Cubic Bézier from sp to dp with tangents matching the anchor directions.
    Control-point distance is half the chord length, which gives a balanced S."""
    dist = max(40, (abs(dp[0] - sp[0]) + abs(dp[1] - sp[1])) // 3)

    def cp(point, anchor):
        match anchor:
            case "top":
                return (point[0], point[1] - dist)
            case "bottom":
                return (point[0], point[1] + dist)
            case "left":
                return (point[0] - dist, point[1])
            case "right":
                return (point[0] + dist, point[1])
            case _:
                return point

    c1 = cp(sp, src_anchor)
    c2 = cp(dp, dst_anchor)
    return f"M {sp[0]},{sp[1]} C {c1[0]},{c1[1]} {c2[0]},{c2[1]} {dp[0]},{dp[1]}"


def edge_label_pos(e: Edge, d: Diagram, pts: list[tuple[int, int]]) -> tuple[int, int]:
    if e.label_pos is not None:
        return e.label_pos
    if e.label_anchor == "src":
        bx, by = pts[0]
    elif e.label_anchor == "dst":
        bx, by = pts[-1]
    elif e.route in ("over", "under") and len(pts) >= 4:
        # over/under route: pts = [sp, via1, via2, dp]
        # Use midpoint of the across segment (via1↔via2), which is where the line is visible.
        v1, v2 = pts[1], pts[2]
        bx = (v1[0] + v2[0]) // 2
        by = (v1[1] + v2[1]) // 2
    else:
        # geometric centroid of all waypoints — usually lands in a sane place
        bx = sum(p[0] for p in pts) // len(pts)
        by = sum(p[1] for p in pts) // len(pts)
    dx, dy = e.label_offset
    return (bx + dx, by + dy)


# ── Element rendering ────────────────────────────────────────────────
def render_region_rect(r: Region) -> str:
    """Just the dashed rectangle + optional icon. NO label — that's a
    separate pass (`render_region_label`) drawn AFTER edges so the label
    text appears on top of any arrow that crosses its space, with the
    label's white halo (paint-order: stroke) breaking the arrow line."""
    if not getattr(r, "visible", True):
        return ""
    x, y, w, h = r.bounds
    rect_cls = "region-rect"
    rstyle = getattr(r, "style", "outer")
    if rstyle == "inner":
        rect_cls += " region-rect--inner"
    elif rstyle == "cluster":
        rect_cls += " region-rect--cluster"

    icon_key = getattr(r, "icon", None)
    icon_g = (
        f'<g transform="translate({x + 18}, {y})">{get_icon(icon_key)}</g>\n'
        if icon_key else ""
    )

    inline_parts: list[str] = []
    if (dash := getattr(r, "border_dash", None)) is not None:
        inline_parts.append(
            "stroke-dasharray:none" if dash == (0, 0) else f"stroke-dasharray:{dash[0]} {dash[1]}"
        )
    if (stroke := getattr(r, "border_stroke", None)) is not None:
        inline_parts.append(f"stroke:{stroke}")
    style_attr = f' style="{";".join(inline_parts)}"' if inline_parts else ""

    return (
        f'<rect class="{rect_cls}"{style_attr} x="{x}" y="{y}" width="{w}" height="{h}" rx="14"/>'
        f'{icon_g}'
    )


def render_region_label(r: Region) -> str:
    """Just the region's text label, positioned TOP-CENTER inside the rect
    (or top-left next to a badge icon if `r.icon` is set). Rendered as a
    separate pass after edges so it sits on top of crossing arrows."""
    if not getattr(r, "visible", True) or not r.label:
        return ""
    x, y, w, h = r.bounds
    rstyle = getattr(r, "style", "outer")
    label_cls = "region-label"
    if rstyle == "inner":
        label_cls += " region-label--inner"
    elif rstyle == "cluster":
        label_cls += " region-label--cluster"

    if getattr(r, "icon", None):
        label_x, label_y, anchor = x + 42, y + 6, "start"
    else:
        anchor = getattr(r, "label_anchor", "middle")
        # Resolve label_position: explicit override, else default by style.
        #   outer   → above the rect (admin boundary, prominent)
        #   inner   → inside top-center (nested, can't sit above)
        #   cluster → inside top-left (mingrammer cluster look)
        pos = getattr(r, "label_position", None)
        if pos is None:
            if rstyle == "inner":
                pos = "inside"
            elif rstyle == "cluster":
                pos = "inside-tl"
            else:
                pos = "above"
        if pos == "inside-tl":
            label_x, label_y, anchor = x + 12, y + 16, "start"
        else:
            label_y = (y + 18) if pos == "inside" else (y - 10)
            if anchor == "start":
                label_x = x + 18           # inset from left edge
            elif anchor == "end":
                label_x = x + w - 18       # inset from right edge
            else:
                label_x = x + w // 2       # horizontal centre

    return f'<text class="{label_cls}" text-anchor="{anchor}" x="{label_x}" y="{label_y}">{_x(r.label)}</text>'


# Back-compat: callers expecting the old single-call behaviour still work.
def render_region(r: Region) -> str:
    return render_region_rect(r) + "\n" + render_region_label(r)


def render_edge(e: Edge, d: Diagram) -> str:
    src = d.get_node(e.src)         # accepts Component or Region
    dst = d.get_node(e.dst)
    src_anchor, dst_anchor = resolve_anchors(e, src, dst)
    sp = _anchor_pos(src, src_anchor, e.src_offset)
    dp = _anchor_pos(dst, dst_anchor, e.dst_offset)

    # Same label-clearance auto-push as route_edge — keeps the curve and
    # orthogonal renderers consistent on where the arrowhead lands.
    if isinstance(dst, Region) and dst_anchor == "top" and e.dst_offset[1] == 0:
        dp = (dp[0], dp[1] + _region_label_clearance(dst, "top"))

    if e.route == "curve":
        path = smooth_curve(sp, dp, src_anchor, dst_anchor)
        pts = [sp, dp]  # for label midpoint
    else:
        pts = route_edge(e, d)
        path = points_to_rounded_path(pts)

    cls  = "edge-path edge-path--orange" if e.style == "orange" else "edge-path"
    marker = "url(#arrow-orange)" if e.style == "orange" else "url(#arrow-gray)"
    dash_attr = ' style="stroke-dasharray:6 4"' if getattr(e, "dashed", False) else ""
    marker_attr = "" if getattr(e, "no_arrow", False) else f' marker-end="{marker}"'

    lx, ly = edge_label_pos(e, d, pts)
    lcls = "edge-label"
    if e.style == "orange":
        lcls += " edge-label--ext"
    if e.label_small:
        lcls += " edge-label--small"

    label_svg = (f'<text class="{lcls}" x="{lx}" y="{ly}">{_x(e.label)}</text>'
                 if e.label else "")
    return (
        f'<path class="{cls}"{dash_attr} d="{path}"{marker_attr}/>\n'
        f'{label_svg}'
    )


def render_component(c: Component) -> str:
    cx, cy = c.pos
    icon_svg = get_icon(c.icon)

    if c.shape == "annotation":
        # Annotation: small icon centered ABOVE 2 lines of text, no body.
        return f'''<g transform="translate({cx}, {cy})">
  <g transform="translate(-3, -22)">{icon_svg}</g>
  <text x="0" y="2"  style="font-size:13px;font-weight:700;text-anchor:middle;fill:#1f2937">{_x(c.name)}</text>
  <text x="0" y="20" style="font-size:11.5px;text-anchor:middle;fill:#374151">{_x(c.subtitle)}</text>
</g>'''

    if c.shape == "badge":
        # Numbered step badge (§6.7.3): icon-only, no labels.
        return f'<g transform="translate({cx}, {cy})">{icon_svg}</g>'

    # Standard: icon + name + subtitle below.
    # Name offset depends on shape (cube-big has a halo so name sits lower).
    if c.shape == "cube-big":
        name_y, name_size = 73, 15
    elif c.shape == "cube":
        name_y, name_size = 60, 14
    elif c.shape == "aws-tile-hero":
        name_y, name_size = 58, 14
    elif c.shape == "aws-tile":
        name_y, name_size = 50, 14
    else:
        name_y, name_size = 55, 14
    sub_y  = name_y + 17

    # Accent "red" — semantic marker for human-intervention / alert nodes.
    # Adds the `.alert-pulse` class to the group. In static SVG the class
    # has no visual effect (icon keeps its native colour); in animated
    # SVG the ANIM_PRESETS hue-rotate filter periodically shifts the
    # icon's hue toward red. This way the colour change is an animation-
    # only signal, not a static restyling.
    group_class = ' class="alert-pulse"' if c.accent == "red" else ''
    return f'''<g{group_class} transform="translate({cx}, {cy})">
  {icon_svg}
  <text class="component-name" y="{name_y}" style="font-size:{name_size}px">{_x(c.name)}</text>
  <text class="component-sub"  y="{sub_y}">{_x(c.subtitle)}</text>
</g>'''


def component_svg_snippet(c: Component) -> str:
    """Standalone SVG containing just this component's glyph + labels,
    centered inside its viewBox. Used by `to_figma.render()` for the
    auto-layout hybrid path: each leaf component gets imported into
    Figma via `figma.createNodeFromSvg(snippet)`, then placed by an
    enclosing Figma auto-layout frame.

    Width = icon.w; height = icon.h + label_band. The component is
    centered horizontally; the icon sits at y=hh (top of icon at 0)."""
    from .model import LABEL_HEIGHT
    hw, hh = c.half
    label_h = LABEL_HEIGHT.get(c.shape, 0) if (c.name or c.subtitle) else 0
    w = 2 * hw
    h = 2 * hh + label_h
    saved_pos = c.pos
    c.pos = (hw, hh)         # icon center inside the snippet
    body = render_component(c)
    c.pos = saved_pos
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
        f'<defs>{DEFS}</defs><style>{STYLE}</style>{body}</svg>'
    )


# ── Top-level render ─────────────────────────────────────────────────
def _title_block(d: Diagram) -> tuple[str, int]:
    """Render the title + subtitle block at top-center. Returns the SVG
    fragment and the total Y offset content should shift down by to leave
    clean space for the block (top margin + title + gap + subtitle + gap)."""
    if not d.title and not d.subtitle:
        return "", 0

    TOP_MARGIN   = 24
    TITLE_CAP    = 18           # cap height for 20-px bold
    SUB_CAP      = 11           # cap height for 13-px regular
    GAP_T_S      = 8            # gap between title baseline and subtitle top
    GAP_BLOCK    = 28           # gap below the title block before content

    cx = d.width // 2
    parts: list[str] = []
    y = TOP_MARGIN

    if d.title:
        y += TITLE_CAP
        parts.append(f'<text class="diagram-title" x="{cx}" y="{y}">{_x(d.title)}</text>')
    if d.subtitle:
        y += GAP_T_S + SUB_CAP
        parts.append(f'<text class="diagram-subtitle" x="{cx}" y="{y}">{_x(d.subtitle)}</text>')

    block_h = y + GAP_BLOCK
    return "\n  ".join(parts), block_h


def render(d: Diagram, animate: bool = False) -> str:
    """Render a diagram to a single self-contained SVG string.

    `animate=True` appends CSS that animates each edge path's
    `stroke-dashoffset` so arrows visualise data flow direction. The
    output is still a single static SVG (no JS); CSS keyframes drive
    the motion. All static SVG viewers (browsers, Figma, Inkscape)
    will render it correctly — non-animating viewers show a dashed
    line frozen at offset 0."""
    region_rects  = "\n  ".join(render_region_rect(r)  for r in d.regions)
    region_labels = "\n  ".join(render_region_label(r) for r in d.regions)
    edges         = "\n  ".join(render_edge(e, d)      for e in d.edges)
    comps         = "\n  ".join(render_component(c)    for c in d.components)

    style = STYLE + (ANIM_STYLE if animate else "")

    # Page auto-layout: title/subtitle stack at top, content below.
    # Content is translated DOWN by title_block_h so its DSL coordinates
    # stay logical (rails at y=45 in DSL render at y=45+offset visually).
    title_block, title_block_h = _title_block(d)
    total_height = d.height + title_block_h
    content_open  = (f'<g transform="translate(0, {title_block_h})">'
                     if title_block_h else "")
    content_close = "</g>" if title_block_h else ""

    # Render order (bottom → top):
    #   1. region RECTS (so dashed borders sit below everything)
    #   2. edges (lines + arrowheads; visible across region borders)
    #   3. components (icons + names; sit on top of arrows that approach them)
    #   4. region LABELS (text on top — its white halo punches a hole through
    #      arrows that cross behind it, e.g. kbapi → rag landing under
    #      "RAG KNOWLEDGE LAYER")
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {d.width} {total_height}"
     width="{d.width}" height="{total_height}"
     style="max-width: 100%; height: auto"
     font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif">
  <style>{style}</style>
  <defs>{DEFS}</defs>

  <rect width="{d.width}" height="{total_height}" fill="#fafafa"/>
  <rect width="{d.width}" height="{total_height}" class="bg-grid"/>

  <!-- title block (top, fixed) -->
  {title_block}

  <!-- content (auto-translated down by title_block_h) -->
  {content_open}
  <!-- region rects -->
  {region_rects}

  <!-- edges -->
  {edges}

  <!-- components -->
  {comps}

  <!-- region labels (drawn last so they sit on top of crossing arrows) -->
  {region_labels}
  {content_close}
</svg>
'''
    return _tidy(svg)

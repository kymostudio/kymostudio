"""Excalidraw renderer.

Takes a `Diagram` and emits a single JSON string in the Excalidraw scene
schema (`type: "excalidraw"`, version 2). The output can be opened
directly in https://excalidraw.com (Menu → Open) or the Excalidraw
desktop app — no plugin required.

Mirrors `to_svg.py` and `to_figma.py`:
  - `render(diagram)` is the entry point.
  - Render order matches: region rects → edges → components → region labels
    (Excalidraw paints elements in array order, so later wins).

Icons are rasterised to PNG at build time (via cairosvg) and embedded as
Excalidraw `image` elements. We rasterise instead of embedding the SVG
directly because Excalidraw has a long-standing bug where SVG images in
the scene `files` map fail to load on initial render (see
https://github.com/excalidraw/excalidraw/issues/7886) — the same SVG
displays as a placeholder on file open but works fine after manual paste.
PNG bypasses Excalidraw's `normalizeSVG` path entirely and loads
reliably.

Edges are flat polylines via Excalidraw's `arrow` type. They are NOT
bound to source/destination elements (`startBinding` / `endBinding` left
null) — bindings would auto-reroute on drag, but require stable element
ids that survive re-renders. Trade-off: arrows stay put on first load
but won't follow components when the user drags them in Excalidraw.
"""
from __future__ import annotations

import base64
import hashlib
import json

import cairosvg

from .icons import ICONS
from .model import SHAPE_HALF, Component, Diagram, Edge, Region
from .to_svg import route_edge


# ── Palette (Excalidraw uses CSS hex strings) ─────────────────────────
ACCENTS: dict[str, str] = {
    "green":  "#76b900",    # NVIDIA
    "orange": "#ea580c",
    "blue":   "#3b82f6",
    "red":    "#dc2626",
    "purple": "#7c3aed",
}

REGION_OUTER_STROKE = "#232f3e"
REGION_INNER_STROKE = "#7c3aed"
TEXT_PRIMARY        = "#0f172a"
TEXT_MUTED          = "#64748b"
EDGE_STROKE_GRAY    = "#64748b"
EDGE_STROKE_ORANGE  = "#ea580c"
BG_FILL             = "#fafafa"
TRANSPARENT         = "transparent"


# ── Icon embedding ────────────────────────────────────────────────────
# Per-icon natural bounding box in the icon's local coordinate space
# (centred at 0,0). Used to size the Excalidraw `image` element. Falls
# back to 2×SHAPE_HALF, then 76×76, when an icon key isn't listed.
_ICON_SIZE: dict[str, tuple[int, int]] = {
    # Cubes (80) + halo'd cube (124)
    "notebook":  (80, 80),
    "boxes":     (80, 80),
    "neural-sm": (80, 80),
    "neural":    (124, 124),
    # Boxes (70)
    "send":      (70, 70),
    "zap":       (70, 70),
    "archive":   (70, 70),
    "cloud":     (70, 70),
    "gear":      (70, 70),
    "folder":    (70, 70),
    "files":     (70, 70),
    "checklist": (70, 70),
    "magnifier": (70, 70),
    # Cylinder, key
    "cylinder":  (70, 80),
    "key":       (40, 20),
    # Hexagon agent
    "hex-agent": (64, 68),
    # Circle actors
    "user":            (76, 76),
    "customer-person": (68, 68),
    "internet-cloud":  (60, 50),
    # AWS tiles (64 / hero 80)
    "aws-amplify":  (64, 64),
    "aws-lex":      (64, 64),
    "aws-lambda":   (80, 80),
    "aws-connect":  (64, 64),
    "aws-dynamodb": (64, 64),
    "aws-bedrock":  (64, 64),
    "aws-s3":       (64, 64),
    "aws-kendra":   (64, 64),
    # Badges / annotations
    "slack":  (32, 32),
    "plus":   (16, 16),
    "step-1": (28, 28),
    "step-2": (28, 28),
    "step-3": (28, 28),
    # Region top-left badges
    "aws-logo":   (36, 40),
    "site-globe": (20, 20),
}

# Padding around the icon's natural bbox so the drop-shadow filter
# (which extends ~20% beyond the bbox) isn't clipped by the viewBox.
_ICON_PAD = 12

# All `<defs>` referenced by any icon in `ICONS` — gradients used by
# cube faces / boxes / cylinders / user circles, and the drop-shadow
# filter applied via `class="icon-shadow"`. Copied from `to_svg.DEFS`.
_ICON_DEFS = """
<defs>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.18"/>
  </filter>
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
</defs>
<style>.icon-shadow { filter: url(#shadow); }</style>
"""


def _icon_natural_size(icon_key: str, shape: str | None = None) -> tuple[int, int]:
    if icon_key in _ICON_SIZE:
        return _ICON_SIZE[icon_key]
    if shape and shape in SHAPE_HALF:
        hw, hh = SHAPE_HALF[shape]
        return (hw * 2, hh * 2)
    return (76, 76)


def _icon_svg_doc(icon_key: str, w: int, h: int) -> str:
    """Wrap the ICONS fragment in a self-contained SVG document. The icon
    is authored centred at (0,0), so we set the viewBox accordingly and
    pad it for the drop-shadow."""
    pad = _ICON_PAD
    vb_x = -(w / 2 + pad)
    vb_y = -(h / 2 + pad)
    vb_w = w + 2 * pad
    vb_h = h + 2 * pad
    fragment = ICONS.get(icon_key, "")
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{vb_x} {vb_y} {vb_w} {vb_h}" '
        f'width="{vb_w}" height="{vb_h}">'
        f'{_ICON_DEFS}'
        f'{fragment}'
        f'</svg>'
    )


_files: dict[str, dict] = {}

# Rasterise icons at 2× their display size so they stay crisp on
# retina/HiDPI screens without ballooning the scene file.
_ICON_PNG_SCALE = 2


def _register_icon(icon_key: str, shape: str | None = None) -> tuple[str, float, float]:
    """Rasterise the icon to PNG (via cairosvg) and register it as an
    entry in the scene `files` map. Returns (fileId, display_w, display_h)
    — the display size includes shadow padding so positioning code can
    shift the image's top-left."""
    w, h = _icon_natural_size(icon_key, shape)
    display_w = w + 2 * _ICON_PAD
    display_h = h + 2 * _ICON_PAD
    svg = _icon_svg_doc(icon_key, w, h)
    # SHA-1 of (key+svg) — non-cryptographic, just a stable content hash.
    file_id = hashlib.sha1(f"{icon_key}::{svg}".encode()).hexdigest()
    if file_id not in _files:
        png_bytes = cairosvg.svg2png(
            bytestring=svg.encode("utf-8"),
            output_width=int(display_w * _ICON_PNG_SCALE),
            output_height=int(display_h * _ICON_PNG_SCALE),
        )
        b64 = base64.b64encode(png_bytes).decode("ascii")
        _files[file_id] = {
            "mimeType": "image/png",
            "id": file_id,
            "dataURL": f"data:image/png;base64,{b64}",
            "created": 1,
            "lastRetrieved": 1,
        }
    return file_id, display_w, display_h


# ── Deterministic id / seed counters (reset per render) ───────────────
_ids = [0]
_seeds = [1000]

# Maps a Component/Region id → the Excalidraw element id that an edge
# should anchor to (the image element for components, the rectangle for
# regions). Populated as components/regions are built; consumed by
# edge_to_excalidraw to wire `startBinding`/`endBinding`.
_anchor_eid: dict[str, str] = {}

# Inverse: target Excalidraw element id → list of arrow ids that bind
# to it. Used after all edges are built to populate each anchor's
# `boundElements` field (Excalidraw needs this for hover/drag wiring).
_bound_arrows: dict[str, list[str]] = {}


def _eid() -> str:
    _ids[0] += 1
    return f"kymo-{_ids[0]}"


def _seed() -> int:
    _seeds[0] += 1
    return _seeds[0]


def _bind_arrow_to(anchor_eid: str, arrow_eid: str) -> None:
    """Record that `arrow_eid` is bound to `anchor_eid`. Called by
    edge_to_excalidraw; the IDs are stitched into the anchor element's
    `boundElements` list at the end of render()."""
    _bound_arrows.setdefault(anchor_eid, []).append(arrow_eid)


def _base(
    type_: str,
    x: float,
    y: float,
    width: float,
    height: float,
    *,
    stroke: str = "#1e1e1e",
    fill: str = TRANSPARENT,
    fill_style: str = "solid",
    stroke_width: float = 1.5,
    stroke_style: str = "solid",
    roughness: int = 0,
    opacity: int = 100,
    group_ids: list[str] | None = None,
    rounded: bool = False,
) -> dict:
    """Common Excalidraw element fields. Excalidraw refuses to load a
    scene missing any of `id`/`seed`/`version`/`versionNonce`/`isDeleted`
    so all of them are always set."""
    return {
        "id": _eid(),
        "type": type_,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "angle": 0,
        "strokeColor": stroke,
        "backgroundColor": fill,
        "fillStyle": fill_style,
        "strokeWidth": stroke_width,
        "strokeStyle": stroke_style,
        "roughness": roughness,
        "opacity": opacity,
        "groupIds": group_ids or [],
        "frameId": None,
        "roundness": {"type": 3} if rounded else None,
        "seed": _seed(),
        "version": 1,
        "versionNonce": _seed(),
        "isDeleted": False,
        "boundElements": None,
        "updated": 1,
        "link": None,
        "locked": False,
    }


def _text(
    x: float,
    y: float,
    width: float,
    height: float,
    text: str,
    *,
    color: str,
    size: int = 14,
    align: str = "center",
    bold: bool = False,
    group_ids: list[str] | None = None,
) -> dict:
    """Excalidraw text element. `fontFamily=5` is Excalifont (default in
    v2 scenes); falls back to Helvetica if the font isn't installed.
    There's no `bold` toggle — bump fontSize slightly for emphasis."""
    el = _base("text", x, y, width, height, stroke=color, group_ids=group_ids)
    el.update({
        "text": text,
        "fontSize": size + (1 if bold else 0),
        "fontFamily": 5,
        "textAlign": align,
        "verticalAlign": "top",
        "baseline": int(size * 0.85),
        "containerId": None,
        "originalText": text,
        "lineHeight": 1.25,
        "autoResize": True,
    })
    return el


def _image(
    x: float,
    y: float,
    width: float,
    height: float,
    file_id: str,
    *,
    group_ids: list[str] | None = None,
) -> dict:
    """Excalidraw image element. References a `files[fileId]` entry. We
    leave stroke/fill defaults (Excalidraw ignores them for images)."""
    el = _base(
        "image", x, y, width, height,
        stroke=TRANSPARENT,
        fill=TRANSPARENT,
        stroke_width=0,
        group_ids=group_ids,
    )
    el.update({
        "fileId": file_id,
        "status": "saved",
        "scale": [1, 1],
        "crop": None,
    })
    return el


# ── Per-element converters (mirror to_figma.* / to_svg.render_*) ──────
def region_to_excalidraw(r: Region) -> list[dict]:
    """Dashed rectangle for the region's border, plus an optional icon
    image at the top-left corner. Label is rendered in a separate pass."""
    if not getattr(r, "visible", True):
        return []
    x, y, w, h = r.bounds
    is_inner = getattr(r, "style", "outer") == "inner"
    stroke = REGION_INNER_STROKE if is_inner else REGION_OUTER_STROKE
    rect = _base(
        "rectangle", x, y, w, h,
        stroke=stroke,
        fill=TRANSPARENT,
        stroke_width=1.5 if not is_inner else 1.4,
        stroke_style="dashed",
        rounded=True,
    )
    # Edges anchored to this region bind to the rectangle.
    _anchor_eid[r.id] = rect["id"]
    out: list[dict] = [rect]

    icon_key = getattr(r, "icon", None)
    if icon_key and icon_key in ICONS:
        # Mirrors `to_svg.render_region_rect`: icon centred at (x+18, y).
        file_id, iw, ih = _register_icon(icon_key)
        out.append(_image(
            (x + 18) - iw / 2, y - ih / 2, iw, ih, file_id,
        ))
    return out


def region_label_to_excalidraw(r: Region) -> dict | None:
    """Region's text label — above the rect for outer, inside for inner.
    If the region has an icon badge at top-left, the label sits beside it."""
    if not getattr(r, "visible", True) or not r.label:
        return None
    x, y, w, h = r.bounds
    is_inner = getattr(r, "style", "outer") == "inner"
    color = REGION_INNER_STROKE if is_inner else REGION_OUTER_STROKE

    if getattr(r, "icon", None):
        # Top-left next to badge (matches to_svg).
        return _text(
            x + 42, y - 6, max(40, w - 60), 18,
            r.label.upper(), color=color, size=13, align="left", bold=True,
        )

    pos = getattr(r, "label_position", None) or ("inside" if is_inner else "above")
    label_y = (y + 6) if pos == "inside" else (y - 22)
    anchor = getattr(r, "label_anchor", "middle")
    text_align = {"start": "left", "middle": "center", "end": "right"}[anchor]
    return _text(
        x + 18, label_y, max(40, w - 36), 18,
        r.label.upper(), color=color, size=13, align=text_align, bold=True,
    )


def component_to_excalidraw(c: Component) -> list[dict]:
    """Returns 1–3 elements (icon image + optional name + optional subtitle).
    All share one group id so the user can move them together in Excalidraw."""
    cx, cy = c.pos
    hw, hh = c.half
    gid = f"g-{c.id}"

    # Icon as an embedded SVG image — centred on (cx, cy).
    file_id, iw, ih = _register_icon(c.icon, c.shape)
    icon = _image(
        cx - iw / 2, cy - ih / 2, iw, ih, file_id,
        group_ids=[gid],
    )
    # Edges anchored to this component bind to the icon image.
    _anchor_eid[c.id] = icon["id"]
    out: list[dict] = [icon]

    if c.shape == "badge":
        # Icon-only — no labels.
        return out

    if c.shape == "annotation":
        # Annotation: 2-line text under the small icon (matches to_svg).
        out.append(_text(
            cx - 80, cy + 4, 160, 18,
            c.name, color=TEXT_PRIMARY, size=13, align="center", bold=True,
            group_ids=[gid],
        ))
        if c.subtitle:
            out.append(_text(
                cx - 80, cy + 22, 160, 18,
                c.subtitle, color=TEXT_MUTED, size=11, align="center",
                group_ids=[gid],
            ))
        return out

    # Standard: name + subtitle stacked under the icon, using the same
    # per-shape offsets as `to_svg.render_component`.
    if c.shape == "cube-big":
        name_y_offset, name_size = 73 - hh, 15
    elif c.shape == "cube":
        name_y_offset, name_size = 60 - hh, 14
    elif c.shape == "aws-tile-hero":
        name_y_offset, name_size = 58 - hh, 14
    elif c.shape == "aws-tile":
        name_y_offset, name_size = 50 - hh, 14
    else:
        name_y_offset, name_size = 55 - hh, 14

    if c.name:
        out.append(_text(
            cx - 80, cy + hh + name_y_offset - 10, 160, 20,
            c.name, color=TEXT_PRIMARY, size=name_size, align="center", bold=True,
            group_ids=[gid],
        ))
    if c.subtitle:
        out.append(_text(
            cx - 80, cy + hh + name_y_offset + 9, 160, 18,
            c.subtitle, color=TEXT_MUTED, size=12, align="center",
            group_ids=[gid],
        ))
    return out


def edge_to_excalidraw(e: Edge, d: Diagram) -> list[dict]:
    """An arrow element following `route_edge`'s polyline waypoints, plus
    a text element when the edge has a label (both share a group id)."""
    pts = route_edge(e, d)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    w = max(1, max_x - min_x)
    h = max(1, max_y - min_y)

    # Excalidraw arrow `points` are relative to the element origin.
    rel_points = [[float(x - min_x), float(y - min_y)] for x, y in pts]
    stroke = EDGE_STROKE_ORANGE if e.style == "orange" else EDGE_STROKE_GRAY
    gid = f"g-edge-{e.src}-{e.dst}-{_seed()}"

    arrow = _base(
        "arrow", min_x, min_y, w, h,
        stroke=stroke,
        fill=TRANSPARENT,
        stroke_width=1.8,
        stroke_style="dashed" if getattr(e, "dashed", False) else "solid",
        group_ids=[gid],
    )
    # Bind arrow endpoints to the src/dst node's anchor element (image
    # for components, rect for regions) so Excalidraw treats the arrow as
    # a connector: dragging a node moves the arrow with it. `focus: 0`
    # attaches at the centre of the closest edge; `gap: 1` keeps a 1-px
    # breathing room so the arrowhead doesn't overlap the icon.
    src_eid = _anchor_eid.get(e.src)
    dst_eid = _anchor_eid.get(e.dst)
    start_binding = (
        {"elementId": src_eid, "focus": 0.0, "gap": 1} if src_eid else None
    )
    end_binding = (
        {"elementId": dst_eid, "focus": 0.0, "gap": 1} if dst_eid else None
    )
    arrow.update({
        "points": rel_points,
        "lastCommittedPoint": None,
        "startBinding": start_binding,
        "endBinding": end_binding,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "elbowed": False,
    })
    # Record the binding on the anchor side so we can populate each
    # anchor element's `boundElements` list in render() after all edges
    # are built.
    if src_eid:
        _bind_arrow_to(src_eid, arrow["id"])
    if dst_eid:
        _bind_arrow_to(dst_eid, arrow["id"])

    out: list[dict] = [arrow]
    if e.label:
        # Sit the label at the polyline's bbox midpoint — close enough to
        # `to_svg.edge_label_pos` for the static-export use case.
        mid_x = (min_x + max_x) / 2
        mid_y = (min_y + max_y) / 2
        size = 11 if e.label_small else 12
        out.append(_text(
            mid_x - 60, mid_y - (size + 6), 120, size + 6,
            e.label,
            color=EDGE_STROKE_ORANGE if e.style == "orange" else TEXT_MUTED,
            size=size,
            align="center",
            group_ids=[gid],
        ))
    return out


# ── Top-level render ──────────────────────────────────────────────────
def render(d: Diagram) -> str:
    """Render a Diagram to an Excalidraw scene JSON string.

    Output shape (Excalidraw scene v2):

        {
          "type": "excalidraw",
          "version": 2,
          "source": "https://excalidraw.com",
          "elements": [<region rects + icons>, <edges>, <components>, <region labels>],
          "appState": {"viewBackgroundColor": "#fafafa", "gridSize": null},
          "files": {<fileId>: {<dataURL of icon SVG>}}
        }

    Element order matches `to_svg.render`: region rects below, then
    edges, then components (with embedded icons), then region labels on
    top — Excalidraw paints elements in array order so later wins.

    Build order is different from array order: regions + components are
    built FIRST so each one can register its anchor element id in
    `_anchor_eid`. Edges built second can then look those ids up to wire
    `startBinding`/`endBinding`. After everything is built, each anchor
    element's `boundElements` field is populated from `_bound_arrows`."""
    _ids[0] = 0
    _seeds[0] = 1000
    _files.clear()
    _anchor_eid.clear()
    _bound_arrows.clear()

    # Build order: anchors (regions + components) first, then edges,
    # then region labels. This lets edges reference anchor element ids
    # that don't exist yet in the array order.
    region_rects: list[dict] = [el for r in d.regions for el in region_to_excalidraw(r)]
    components: list[dict] = [el for c in d.components for el in component_to_excalidraw(c)]
    edges: list[dict] = [el for e in d.edges for el in edge_to_excalidraw(e, d)]
    region_labels: list[dict] = [n for r in d.regions if (n := region_label_to_excalidraw(r))]

    # Stitch boundElements onto each anchor: Excalidraw needs both ends
    # of the binding to know about each other (arrow → element via
    # startBinding/endBinding, element → arrow via boundElements).
    by_id = {el["id"]: el for el in region_rects + components}
    for anchor_eid, arrow_ids in _bound_arrows.items():
        el = by_id.get(anchor_eid)
        if el is not None:
            el["boundElements"] = [
                {"id": aid, "type": "arrow"} for aid in arrow_ids
            ]

    # Array order (z-order): regions below, then edges, then components,
    # then region labels on top.
    elements = region_rects + edges + components + region_labels

    scene = {
        "type": "excalidraw",
        "version": 2,
        "source": "https://excalidraw.com",
        "elements": elements,
        "appState": {
            "viewBackgroundColor": BG_FILL,
            "gridSize": None,
        },
        "files": dict(_files),
    }
    return json.dumps(scene, indent=2, ensure_ascii=False)

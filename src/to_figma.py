"""Figma Plugin API JavaScript renderer.

Takes a `Diagram` and emits a single JS string that uses the Figma
Plugin API to construct the diagram. The output is intended to be:

  - passed as the `code` argument to the `use_figma` MCP tool, OR
  - pasted into Figma's plugin dev console
    (Plugins menu → Development → Open console)

Two render paths:

  1. **Hybrid auto-layout (preferred)** — used when the source `.diagram`
     declared one or more `layout { … }` blocks. Walks each tree and
     emits nested Figma auto-layout frames (`layoutMode`,
     `itemSpacing`, `counterAxisAlignItems`) mirroring the user's
     `|`/`,` grouping. Each leaf component is imported into Figma as a
     standalone SVG snippet via `figma.createNodeFromSvg(...)` — this
     preserves the full glyph fidelity (hex outline + head + glasses +
     body + collar V for `hex-agent`, etc) rather than reducing to a
     coloured primitive. Edges remain as top-level absolute vectors;
     they connect correctly because Python's `apply_layout_tree` and
     Figma's auto-layout use identical spacing + alignment, so
     component positions match.

  2. **Flat absolute (fallback)** — used when no `layout { … }` blocks
     exist. Components placed at their resolved `.pos`, icons reduced
     to single-shape primitives (ELLIPSE/POLYGON/RECTANGLE). Same
     per-element converters as before this refactor.
"""
from __future__ import annotations

import json

from model import Component, Diagram, Edge, Region
from to_svg import component_svg_snippet, route_edge


# ── Palette (Figma 0..1 normalised RGB) ────────────────────────────────
ACCENTS: dict[str, tuple[float, float, float]] = {
    "green":  (0.463, 0.725, 0.000),
    "orange": (0.918, 0.345, 0.047),
    "blue":   (0.231, 0.510, 0.965),
    "red":    (0.863, 0.149, 0.149),
    "purple": (0.486, 0.227, 0.929),
}

REGION_OUTER_STROKE = (0.137, 0.184, 0.243)
REGION_INNER_STROKE = (0.486, 0.227, 0.929)
TEXT_PRIMARY        = (0.059, 0.090, 0.165)
TEXT_MUTED          = (0.392, 0.455, 0.545)
EDGE_GRAY           = (0.392, 0.455, 0.545)
EDGE_ORANGE         = (0.918, 0.345, 0.047)
BG_FILL             = (0.980, 0.980, 0.980)

DEFAULT_GAP = 40


def _rgb(c: tuple[float, float, float]) -> str:
    r, g, b = c
    return f"{{r: {r}, g: {g}, b: {b}}}"


def _solid(c: tuple[float, float, float]) -> str:
    return f"[{{type: 'SOLID', color: {_rgb(c)}}}]"


def _esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")


def _jstr(s: str) -> str:
    """JSON-safe JS string literal (handles all escapes, multi-line)."""
    return json.dumps(s, ensure_ascii=False)


# ── Edge (always emitted as absolute vector, both render paths) ───────
def edge_to_js(e: Edge, d: Diagram, var: str, parent: str) -> str:
    pts = route_edge(e, d)
    deduped: list[tuple[int, int]] = []
    for p in pts:
        if not deduped or deduped[-1] != p:
            deduped.append(p)
    pts = deduped

    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    w = max(1, max_x - min_x)
    h = max(1, max_y - min_y)

    vertices = ", ".join(f"{{x: {p[0] - min_x}, y: {p[1] - min_y}}}" for p in pts)
    segments = ", ".join(f"{{start: {i}, end: {i + 1}}}" for i in range(len(pts) - 1))
    stroke = EDGE_ORANGE if e.style == "orange" else EDGE_GRAY

    parts = [f"""
const {var} = figma.createVector()
{var}.name = 'edge:{_esc(e.src)}->{_esc(e.dst)}'
{var}.x = {min_x}; {var}.y = {min_y}
{var}.resize({w}, {h})
{var}.strokes = {_solid(stroke)}
{var}.strokeWeight = 1.8
{var}.strokeCap = 'ARROW_LINES'
{var}.strokeJoin = 'ROUND'
await {var}.setVectorNetworkAsync({{
  vertices: [{vertices}],
  segments: [{segments}],
  regions: []
}})
{parent}.appendChild({var})"""]

    if getattr(e, "dashed", False):
        parts.append(f"\n{var}.dashPattern = [6, 4]")

    if e.label:
        mid_x = (min_x + max_x) // 2
        mid_y = (min_y + max_y) // 2
        label_color = EDGE_ORANGE if e.style == "orange" else (0.200, 0.255, 0.333)
        label_size = 10.5 if e.label_small else 11.5
        parts.append(f"""
const {var}_label = figma.createText()
{var}_label.name = 'edge-label:{_esc(e.src)}->{_esc(e.dst)}'
{var}_label.fontName = {{family: 'Inter', style: 'Medium'}}
{var}_label.fontSize = {label_size}
{var}_label.characters = '{_esc(e.label)}'
{var}_label.x = {mid_x - 60}; {var}_label.y = {mid_y - 14}
{var}_label.resize(120, 14)
{var}_label.textAlignHorizontal = 'CENTER'
{var}_label.fills = {_solid(label_color)}
{parent}.appendChild({var}_label)""")

    return "".join(parts)


# ── HYBRID PATH: auto-layout frames + SVG glyph imports ───────────────
def _tree_bbox(tree, by_id: dict[str, Component]) -> tuple[int, int, int, int]:
    """Top-left (x, y) and (w, h) bounding box of every leaf component
    in `tree` — used to anchor the Figma auto-layout root frame at the
    exact coords where Python's `apply_layout_tree` placed things."""
    leaves = _collect_leaves(tree)
    xs, ys, rights, bottoms = [], [], [], []
    for cid in leaves:
        c = by_id[cid]
        hw, hh = c.half
        xs.append(c.pos[0] - hw)
        ys.append(c.pos[1] - hh)
        rights.append(c.pos[0] + hw)
        bottoms.append(c.pos[1] + hh)
    x0, y0 = min(xs), min(ys)
    return x0, y0, max(rights) - x0, max(bottoms) - y0


def _collect_leaves(tree) -> list[str]:
    if tree[0] == "id":
        return [tree[1]]
    out: list[str] = []
    for ch in tree[2]:
        out.extend(_collect_leaves(ch))
    return out


def _tree_to_js(tree, by_id: dict[str, Component], var: str, parent: str,
                gap: int = DEFAULT_GAP) -> str:
    if tree[0] == "id":
        cid = tree[1]
        c = by_id[cid]
        hw, hh = c.half
        # Import per-component SVG → preserves glyph fidelity (head/eyes/
        # body for hex-agent, etc). The imported FRAME's size matches
        # the SVG viewBox, so Figma auto-layout slots it correctly.
        snippet = component_svg_snippet(c)
        return f"""
const {var} = figma.createNodeFromSvg({_jstr(snippet)})
{var}.name = 'component:{_esc(cid)}'
{var}.resize({2 * hw}, {2 * hh + (44 if (c.name or c.subtitle) else 0)})
{parent}.appendChild({var})"""

    _, direction, children = tree
    layout_mode = "HORIZONTAL" if direction == "horizontal" else "VERTICAL"
    parts = [f"""
const {var} = figma.createFrame()
{var}.name = 'group:{direction}'
{var}.layoutMode = '{layout_mode}'
{var}.itemSpacing = {gap}
{var}.paddingLeft = {var}.paddingRight = 0
{var}.paddingTop = {var}.paddingBottom = 0
{var}.primaryAxisSizingMode = 'AUTO'
{var}.counterAxisSizingMode = 'AUTO'
{var}.primaryAxisAlignItems = 'MIN'
{var}.counterAxisAlignItems = 'CENTER'
{var}.fills = []
{var}.clipsContent = false
{parent}.appendChild({var})"""]

    for i, child in enumerate(children):
        parts.append(_tree_to_js(child, by_id, f"{var}_{i}", var, gap))
    return "".join(parts)


def _render_hybrid(d: Diagram) -> str:
    by_id = {c.id: c for c in d.components}
    tree_leaves: set[str] = set()
    for t in d.layout_trees:
        tree_leaves.update(_collect_leaves(t))

    out: list[str] = []
    title_lit = repr(d.title or "axo-diagram")
    out.append(f"""// axo diagram → Figma Plugin API (hybrid auto-layout)
// Pass as `code` to the use_figma MCP tool, OR paste into
// Figma → Plugins menu → Development → Open console.

await Promise.all([
  figma.loadFontAsync({{family: 'Inter', style: 'Regular'}}),
  figma.loadFontAsync({{family: 'Inter', style: 'Medium'}}),
  figma.loadFontAsync({{family: 'Inter', style: 'Bold'}}),
])

const root = figma.createFrame()
root.name = {title_lit}
root.x = 0; root.y = 0
root.resize({d.width}, {d.height})
root.fills = {_solid(BG_FILL)}
root.clipsContent = false
const createdNodeIds = [root.id]
""")

    # 1. Edges first (bottom layer), so components render on top.
    for i, e in enumerate(d.edges, 1):
        out.append(edge_to_js(e, d, f"e{i}", "root"))
        out.append(f"\ncreatedNodeIds.push(e{i}.id)")

    # 2. Each layout tree → nested auto-layout frame, anchored to the
    # bbox of its leaves so absolute edge waypoints still connect.
    for i, tree in enumerate(d.layout_trees, 1):
        x, y, w, h = _tree_bbox(tree, by_id)
        out.append(f"""

// layout tree #{i} — anchored at ({x}, {y}), {w}×{h}
const t{i}_anchor = figma.createFrame()
t{i}_anchor.name = 'layout-tree-{i}'
t{i}_anchor.x = {x}; t{i}_anchor.y = {y}
t{i}_anchor.layoutMode = 'HORIZONTAL'
t{i}_anchor.primaryAxisSizingMode = 'AUTO'
t{i}_anchor.counterAxisSizingMode = 'AUTO'
t{i}_anchor.fills = []
t{i}_anchor.clipsContent = false
root.appendChild(t{i}_anchor)""")
        out.append(_tree_to_js(tree, by_id, f"t{i}_root", f"t{i}_anchor"))
        out.append(f"\ncreatedNodeIds.push(t{i}_anchor.id)")

    # 3. Orphan components (not referenced by any tree) → flat absolute.
    orphans = [c for c in d.components if c.id not in tree_leaves]
    for i, c in enumerate(orphans, 1):
        out.append(_component_flat_js(c, f"o{i}", "root"))
        out.append(f"\ncreatedNodeIds.push(o{i}.id)")

    out.append("\n\nreturn {createdNodeIds, frameId: root.id}\n")
    return "".join(out)


# ── FLAT PATH: per-component primitive (for diagrams without layout {}) ─
def _component_flat_js(c: Component, var: str, parent: str) -> str:
    """Single-shape primitive at absolute pos. Used for orphan components
    (no enclosing layout tree) and as the fallback render path."""
    cx, cy = c.pos
    hw, hh = c.half
    # Import the full SVG snippet so even flat-path components get the
    # detailed glyph (head/eyes/body for hex-agent, etc).
    snippet = component_svg_snippet(c)
    label_h = 44 if (c.name or c.subtitle) else 0
    return f"""
const {var} = figma.createNodeFromSvg({_jstr(snippet)})
{var}.name = 'component:{_esc(c.id)}'
{var}.x = {cx - hw}; {var}.y = {cy - hh}
{var}.resize({2 * hw}, {2 * hh + label_h})
{parent}.appendChild({var})"""


def _render_flat(d: Diagram) -> str:
    out: list[str] = []
    title_lit = repr(d.title or "axo-diagram")
    out.append(f"""// axo diagram → Figma Plugin API (flat)
// Pass as `code` to the use_figma MCP tool, OR paste into
// Figma → Plugins menu → Development → Open console.

await Promise.all([
  figma.loadFontAsync({{family: 'Inter', style: 'Regular'}}),
  figma.loadFontAsync({{family: 'Inter', style: 'Medium'}}),
  figma.loadFontAsync({{family: 'Inter', style: 'Bold'}}),
])

const root = figma.createFrame()
root.name = {title_lit}
root.x = 0; root.y = 0
root.resize({d.width}, {d.height})
root.fills = {_solid(BG_FILL)}
root.clipsContent = false
const createdNodeIds = [root.id]
""")

    for i, e in enumerate(d.edges, 1):
        out.append(edge_to_js(e, d, f"e{i}", "root"))
        out.append(f"\ncreatedNodeIds.push(e{i}.id)")

    for i, c in enumerate(d.components, 1):
        out.append(_component_flat_js(c, f"c{i}", "root"))
        out.append(f"\ncreatedNodeIds.push(c{i}.id)")

    out.append("\n\nreturn {createdNodeIds, frameId: root.id}\n")
    return "".join(out)


# ── Top-level render (dispatch on layout_trees presence) ───────────────
def render(d: Diagram) -> str:
    """Hybrid path when the diagram has layout trees; flat path otherwise.

    See module docstring for the trade-offs between the two paths."""
    if d.layout_trees:
        return _render_hybrid(d)
    return _render_flat(d)

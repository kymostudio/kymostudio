"""D2-style DSL parser for diagrams.

Line-based, brace-delimited surface for `model.Diagram`. There is no
`component` or `region` keyword — the parser disambiguates by line
shape (see `docs/DSL.md` §6):

  • line ending in `{` and second token ∈ outer|inner → region container
  • line ending in `{` and second token ∈ horizontal|vertical → layout container
  • `id arrow id …`                                    → edge
  • `id shape/icon/accent "Name" "Sub" [@ ...]`        → leaf component
  • bare ids (only inside a container body)            → membership refs
  • `row id1 id2 …` (only inside a region body)        → grid row

Containers nest — a region's body may contain inline leaves, bare-id
references, AND nested containers. Leaves declared transitively inside
a nested container are also appended to the outer container's
`contains` so auto-bounds enclose them.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from .model import Component, Diagram, Edge, Region

# ── Top-level directives (file scope only) ────────────────────────────
# `:` is optional on `canvas:` for back-compat; title/subtitle require it.
CANVAS_RE   = re.compile(r'^canvas\s*:?\s+(\d+)\s*x\s*(\d+)\s*$')
TITLE_RE    = re.compile(r'^title\s*:\s*"([^"]*)"\s*$')
SUBTITLE_RE = re.compile(r'^subtitle\s*:\s*"([^"]*)"\s*$')

# external <id> above <parent> [gap N] — pushes canvas margin to leave
# room for a component placed above a grid cell (only "above" implemented).
EXTERNAL_RE = re.compile(
    r'^external\s+(\w+)\s+above\s+(\w+)(?:\s+gap\s+(\d+))?\s*$'
)

# ── Containers (region or layout) ─────────────────────────────────────
# Region:  <id> (outer|inner) "Label" [opts ...] {
# Layout:  <id> (horizontal|vertical) pos (X,Y) gap N [align ...] {
# The label is required for regions, omitted for layouts.
REGION_RE = re.compile(
    r'^(\w+)\s+(outer|inner|cluster)\s+"([^"]*)"'
    r'(?:\s+(.+?))?'                               # trailing opts blob
    r'\s*\{\s*$'
)
LAYOUT_RE = re.compile(
    r'^(\w+)\s+(horizontal|vertical)\s+'
    r'pos\s+\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s+'
    r'gap\s+(\d+)'
    r'(?:\s+align\s+(start|center|end))?'
    r'\s*\{\s*$'
)
CLOSE_RE = re.compile(r'^\s*\}\s*$')

# Anonymous layout tree:  layout { EXPR }
# EXPR := ATOM ((`|` | `,`) ATOM)*    — `|` = horizontal, `,` = vertical
# ATOM := ID | `{` EXPR `}`           — can't mix separators at same level
LAYOUT_TREE_RE = re.compile(r'^layout\s*\{(.+)\}\s*$')

# Region option tokens (any order, each ≤ 1 occurrence).
PADDING_OPT_RE     = re.compile(r'\bpadding\s+\(\s*(\d+)\s*,\s*(\d+)\s*\)')
PADDING_BOT_OPT_RE = re.compile(r'\bpadding-bottom\s+(\d+)')
DASH_OPT_RE        = re.compile(r'\bdash\s+\(\s*(\d+)\s*,\s*(\d+)\s*\)')
STROKE_OPT_RE      = re.compile(r'\bstroke\s+(#[0-9a-fA-F]{3,8})')
LABEL_ANCHOR_RE    = re.compile(r'\blabel-anchor\s+(start|middle|end)')
LABEL_POS_RE       = re.compile(r'\blabel-position\s+(above|inside)')
ICON_OPT_RE        = re.compile(r'\bicon\s+([\w-]+)')
DIRECTION_OPT_RE   = re.compile(r'\b(horizontal|vertical)\b')

# ── Leaf component ────────────────────────────────────────────────────
# <id> <shape>/<icon>/<accent> ["Name" ["Subtitle"]] [@ <pos|parent-ref>]
LEAF_RE = re.compile(
    r'^(\w+)\s+'
    r'([\w-]+)/([\w-]+)/(\w+)'
    r'(?:\s+"([^"]*)")?'
    r'(?:\s+"([^"]*)")?'
    r'(?:\s+@\s+(.+?))?'
    r'\s*$'
)
POS_LITERAL_RE = re.compile(r'^\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$')
PARENT_REF_RE  = re.compile(
    r'^(\w+)\s+(top|right|bottom|left)(?:\s+(-?\d+))?$'
)

# ── Edge ──────────────────────────────────────────────────────────────
EDGE_RE = re.compile(
    r'^(\w+)\s+(-->|==>|---)\s+(\w+)'
    r'(?:\s+:\s+"([^"]*)")?'
    r'(?:\s+\{(.*)\})?'
    r'\s*$'
)
ANCHOR_SPEC_RE = re.compile(
    r'^(top|right|bottom|left|center)'
    r'(?:\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\))?$'
)
TUPLE_RE  = re.compile(r'^\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$')
VIA_PT_RE = re.compile(r'\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)')

# ── Grid rows (region body only) ──────────────────────────────────────
ROW_RE = re.compile(r'^row(?:\s+(.+))?$')

# Bare-id reference list (whitespace-separated identifiers) — only valid
# inside a container body. Used to declare membership without redefining.
BARE_IDS_RE = re.compile(r'^[A-Za-z_]\w*(?:\s+[A-Za-z_]\w*)*\s*$')


# ── BPMN block (`bpmn { … }`) ─────────────────────────────────────────
# A file-scope block authoring BPMN as typed nodes + flows. Parsing is
# positionless: it builds a `BpmnBlock` AST (declarations + connections).
# Layout into positioned components/edges is done later by `bpmn_layout`
# (not yet wired) — until then, rendering a diagram that still carries a
# block raises (see `to_svg.render` / `cli`).

@dataclass
class BpmnNode:
    id: str
    kind: str                 # start|end|end!|task|xor|and|or|event|subprocess|note|data|store
    label: str
    shape: str                # resolved bpmn-* glyph (FR-3)
    marker: str               # resolved event/task/gateway marker key (FR-3/FR-4)
    pin: tuple[int, int] | None = None   # `@ (x,y)` — parsed now, honoured in P2 (FR-9)


@dataclass
class BpmnFlow:
    src: str
    dst: str
    flow: str                 # sequence|message|association (FR-6)
    label: str = ""


@dataclass
class BpmnBlock:
    nodes: list[BpmnNode]
    flows: list[BpmnFlow]


# kind → (shape, default marker) — mirrors `from_bpmn` classification (FR-3).
_BPMN_KIND: dict[str, tuple[str, str]] = {
    "start":      ("bpmn-start",        ""),
    "end":        ("bpmn-end",          ""),
    "end!":       ("bpmn-end",          "terminate"),
    "task":       ("bpmn-task",         ""),
    "xor":        ("bpmn-gateway",      "exclusive"),
    "and":        ("bpmn-gateway",      "parallel"),
    "or":         ("bpmn-gateway",      "inclusive"),
    "event":      ("bpmn-intermediate", ""),
    "subprocess": ("bpmn-subprocess",   ""),
    "note":       ("bpmn-annotation",   ""),
    "data":       ("bpmn-data-object",  ""),
    "store":      ("bpmn-data-store",   ""),
}
# arrow → flow kind (FR-6).
_BPMN_ARROW: dict[str, str] = {"->": "sequence", "~>": "message", "..>": "association"}

BPMN_OPEN_RE = re.compile(r'^bpmn\s*\{\s*$')
# <kind> <id> ["Label"] [type=<subtype>] [@ (x,y)]   (`end!` before `end`)
BPMN_NODE_RE = re.compile(
    r'^(start|end!|end|task|xor|and|or|event|subprocess|note|data|store)\s+'
    r'(\w+)'
    r'(?:\s+"([^"]*)")?'
    r'(?:\s+type=(\w+))?'
    r'(?:\s+@\s*(\(\s*-?\d+\s*,\s*-?\d+\s*\)))?'
    r'\s*$'
)
BPMN_ARROW_SPLIT = re.compile(r'\s*(->|\.\.>|~>)\s*')
BPMN_LABEL_RE    = re.compile(r'\s*:\s*"([^"]*)"\s*$')


def _make_bpmn_node(m: re.Match, line_no: int) -> BpmnNode:
    kind, nid, label, subtype, pin_s = m.groups()
    shape, marker = _BPMN_KIND[kind]
    if subtype:                       # FR-4: type= refines/sets the marker
        marker = subtype              # passed through unvalidated (parser validates nothing)
    pin = None
    if pin_s:
        pm = POS_LITERAL_RE.match(pin_s.strip())
        if not pm:
            raise SyntaxError(f"line {line_no}: bad bpmn pin {pin_s!r}")
        pin = (int(pm.group(1)), int(pm.group(2)))
    return BpmnNode(id=nid, kind=kind, label=label or "",
                    shape=shape, marker=marker, pin=pin)


def _split_bpmn_statements(line: str) -> list[str]:
    """Split a connection line on `;` outside double quotes (FR-7)."""
    out: list[str] = []
    buf: list[str] = []
    in_q = False
    for ch in line:
        if ch == '"':
            in_q = not in_q
            buf.append(ch)
        elif ch == ';' and not in_q:
            out.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    out.append("".join(buf))
    return [s.strip() for s in out if s.strip()]


def _parse_bpmn_connections(stmt: str, line_no: int) -> list[BpmnFlow]:
    """Parse one connection statement (a chain) into BpmnFlows (FR-6/FR-7)."""
    label = ""
    if (lm := BPMN_LABEL_RE.search(stmt)):
        label = lm.group(1)
        stmt = stmt[:lm.start()]
    parts = BPMN_ARROW_SPLIT.split(stmt.strip())
    # parts = [id, arrow, id, arrow, id, …]
    ids = [p.strip() for p in parts[0::2]]
    arrows = parts[1::2]
    if len(parts) < 3 or len(parts) % 2 == 0 or any(not x for x in ids):
        raise SyntaxError(f"line {line_no}: bad bpmn connection — {stmt!r}")
    flows = [BpmnFlow(src=ids[k], dst=ids[k + 1], flow=_BPMN_ARROW[arrow])
             for k, arrow in enumerate(arrows)]
    if label:                         # FR-7: label sits on the (last) segment
        flows[-1].label = label
    return flows


def _consume_bpmn_block(state: _State, lines: list[str], i: int) -> int:
    """Parse a `bpmn { … }` block opening at `lines[i]` into a positionless
    `BpmnBlock` AST and append it to `state.bpmn_blocks`. Returns the index
    AFTER the closing `}`. Positions are computed later (bpmn_layout, P2)."""
    nodes: list[BpmnNode] = []
    flows: list[BpmnFlow] = []
    j = i + 1
    while j < len(lines):
        line = _strip_comment(lines[j]).strip()
        if not line:
            j += 1
            continue
        if CLOSE_RE.match(line):
            state.bpmn_blocks.append(BpmnBlock(nodes=nodes, flows=flows))
            return j + 1
        if (m := BPMN_NODE_RE.match(line)):
            nodes.append(_make_bpmn_node(m, line_no=j + 1))
        else:
            for stmt in _split_bpmn_statements(line):
                flows.extend(_parse_bpmn_connections(stmt, line_no=j + 1))
        j += 1
    raise SyntaxError(f"line {i + 1}: unclosed `bpmn {{` block (no matching `}}`)")


# ── Public API ────────────────────────────────────────────────────────
def parse(dsl: str) -> tuple[Diagram, dict | None, dict | None]:
    """Parse a D2-style diagram DSL.

    Returns `(diagram, layout, external)`:
      - `layout`   — `{region_id: [[cell_id, ...], ...]}` for regions using
        grid-style `row …` syntax; `None` if no region uses grid mode.
      - `external` — `{component_id: {"above": parent_id, "gap": N}}` for
        any `external …` directive; `None` otherwise.

    Both flow into `layout.layout(diagram, layout, external)` in the CLI
    pipeline; when both are None the layout pass is skipped.
    """
    state = _State()
    lines = dsl.splitlines()
    consumed = _parse_block(state, lines, 0, parent=None)
    if consumed != len(lines):
        # _parse_block returned before EOF without a parent — that means
        # it hit a stray `}`. Surface the line number.
        raise SyntaxError(f"line {consumed + 1}: unexpected `}}` at file scope")
    return state.finalize()


# ── Internal state ────────────────────────────────────────────────────
class _State:
    def __init__(self) -> None:
        self.components: list[Component] = []
        self.regions:    list[Region]    = []
        self.edges:      list[Edge]      = []
        self.layout_dict: dict[str, list[list[str]]] = {}
        self.external_dict: dict[str, dict] = {}
        self.layout_trees: list = []        # anonymous `layout { … }` blocks
        # (0, 0) sentinel → render-time auto-sizing (alignment._auto_size_canvas).
        self.canvas: tuple[int, int] = (0, 0)
        self.title: str = ""
        self.subtitle: str = ""
        self.bpmn_blocks: list = []          # positionless `bpmn { … }` ASTs

    def finalize(self) -> tuple[Diagram, dict | None, dict | None]:
        diagram = Diagram(
            width=self.canvas[0], height=self.canvas[1],
            title=self.title, subtitle=self.subtitle,
            components=self.components, regions=self.regions, edges=self.edges,
            layout_trees=self.layout_trees,
            bpmn_blocks=self.bpmn_blocks,
        )
        if self.layout_trees:
            from .layout import apply_layout_tree, minimize_crossings
            by_id = {c.id: c for c in self.components}
            regions_by_id = {r.id: r for r in self.regions}
            edge_pairs = [(e.src, e.dst) for e in self.edges]
            cursor_y = 0
            for tree in self.layout_trees:
                inlined = _inline_region_leaves(tree, regions_by_id)
                # Barycenter reorder *before* positioning so children land
                # in a crossing-minimised order (ELK-style p3order).
                # We re-wrap the result because the tree variable is a
                # local mutable but minimize_crossings expects to mutate
                # `node[2]` lists in place, which our 4-tuple inlined
                # tree allows.
                if isinstance(inlined, tuple) and inlined[0] == "group":
                    minimize_crossings(inlined, edge_pairs)
                _, h = apply_layout_tree(by_id, inlined, origin=(0, cursor_y))
                cursor_y += h + 40
        return (
            diagram,
            self.layout_dict or None,
            self.external_dict or None,
        )


# ── Block parser (recursive: file scope + each container body) ────────
def _parse_block(
    state: _State, lines: list[str], start: int, parent: Region | None,
) -> int:
    """Parse lines from `start`. If `parent` is set, stop at the matching `}`
    and return the index AFTER the `}`. If `parent` is None, parse to EOF.

    Inside a container body, every leaf created here AND every leaf created
    transitively by nested containers is appended to `parent.contains` so
    `_resolve_region_bounds` envelops the lot.

    Returns the index of the first line NOT consumed by this block."""
    grid_rows: list[list[str]] | None = None
    i = start
    while i < len(lines):
        raw = lines[i]
        line = _strip_comment(raw).strip()
        if not line:
            i += 1
            continue

        # Closing brace ends a container body.
        if CLOSE_RE.match(line):
            if parent is None:
                return i        # caller will report the unexpected `}`
            if grid_rows is not None:
                state.layout_dict[parent.id] = grid_rows
                # Grid mode: layout.layout() owns bounds — leave contains
                # empty so _resolve_region_bounds skips this region.
                parent.contains = []
            return i + 1

        # File-scope-only directives.
        if parent is None:
            if (m := CANVAS_RE.match(line)):
                state.canvas = (int(m.group(1)), int(m.group(2)))
                i += 1
                continue
            if (m := TITLE_RE.match(line)):
                state.title = m.group(1)
                i += 1
                continue
            if (m := SUBTITLE_RE.match(line)):
                state.subtitle = m.group(1)
                i += 1
                continue
            if (m := EXTERNAL_RE.match(line)):
                eid, par, gap = m.groups()
                state.external_dict[eid] = {
                    "above": par, "gap": int(gap) if gap else 60,
                }
                i += 1
                continue
            if (m := LAYOUT_TREE_RE.match(line)):
                state.layout_trees.append(
                    _parse_layout_tree(m.group(1), line_no=i + 1)
                )
                i += 1
                continue
            if BPMN_OPEN_RE.match(line):
                i = _consume_bpmn_block(state, lines, i)
                continue

        # Edges (file scope only — nesting an edge inside a container is
        # not meaningful; edges connect arbitrary IDs regardless of scope).
        if (m := EDGE_RE.match(line)):
            if parent is not None:
                raise SyntaxError(
                    f"line {i + 1}: edges must live at file scope, "
                    f"not inside container {parent.id!r}",
                )
            state.edges.append(_make_edge(m, line_no=i + 1))
            i += 1
            continue

        # Grid row — region body only, not layout body.
        if (m := ROW_RE.match(line)):
            if parent is None:
                raise SyntaxError(
                    f"line {i + 1}: `row` only valid inside a region body",
                )
            if parent.layout is not None:
                raise SyntaxError(
                    f"line {i + 1}: `row` not allowed in layout body "
                    f"({parent.id!r} is a {parent.layout} layout)",
                )
            if grid_rows is None:
                grid_rows = []
            grid_rows.append((m.group(1) or "").split())
            i += 1
            continue

        # Container (region or layout). Must come before LEAF_RE — a region
        # opening line never matches LEAF_RE (no shape/icon/accent triple),
        # but we check explicit `{` ending first for clarity.
        if line.endswith("{"):
            i = _consume_container(state, lines, i, parent, grid_rows)
            continue

        # Leaf component definition (file scope OR container body).
        if (m := LEAF_RE.match(line)):
            comp = _make_component(m, line_no=i + 1)
            state.components.append(comp)
            if parent is not None:
                if parent.layout is not None:
                    raise SyntaxError(
                        f"line {i + 1}: inline leaf definitions not allowed "
                        f"in layout body — define {comp.id!r} at file scope "
                        f"or in a region body, then reference by bare id",
                    )
                parent.contains.append(comp.id)
            i += 1
            continue

        # Bare-id reference list — only inside a container body.
        if parent is not None and BARE_IDS_RE.match(line):
            if grid_rows is not None:
                raise SyntaxError(
                    f"line {i + 1}: region {parent.id!r} mixes `row` and bare ids — pick one",
                )
            parent.contains.extend(line.split())
            i += 1
            continue

        raise SyntaxError(f"line {i + 1}: unrecognised — {line!r}")

    if parent is not None:
        raise SyntaxError(f"line {start}: unclosed block (no matching `}}`)")
    return i


def _consume_container(
    state: _State, lines: list[str], i: int,
    parent: Region | None, parent_grid: list[list[str]] | None,
) -> int:
    """Parse a region/layout opening line at `lines[i]`, recurse into its
    body, then thread the new container's leaf IDs back into `parent.contains`
    so outer-region bounds enclose nested leaves.

    Returns the index of the first line after the closing `}`."""
    line = _strip_comment(lines[i]).strip()

    if (rm := REGION_RE.match(line)):
        region = _make_region(rm)
    elif (lm := LAYOUT_RE.match(line)):
        region = _make_layout(lm)
    else:
        raise SyntaxError(f"line {i + 1}: bad container header — {line!r}")

    state.regions.append(region)
    next_i = _parse_block(state, lines, i + 1, parent=region)

    # Propagate this container's leaves up so the outer region's bounds
    # envelop nested leaves. Layouts don't propagate — they aren't part
    # of any outer container's visual bounds.
    if parent is not None and region.layout is None:
        if parent_grid is not None:
            raise SyntaxError(
                f"line {i + 1}: region {parent.id!r} mixes `row` and nested "
                f"containers — pick one",
            )
        parent.contains.extend(region.contains)
    return next_i


# ── Per-kind builders ─────────────────────────────────────────────────
def _make_region(m: re.Match) -> Region:
    rid, style, label, opts = m.group(1), m.group(2), m.group(3), m.group(4)
    padding = (24, 24)
    padding_bottom: int | None = None
    border_dash: tuple[int, int] | None = None
    border_stroke: str | None = None
    label_anchor = "middle"
    label_position: str | None = None
    icon: str | None = None
    direction: str | None = None
    if opts:
        if (pm := PADDING_OPT_RE.search(opts)):
            padding = (int(pm.group(1)), int(pm.group(2)))
        if (pbm := PADDING_BOT_OPT_RE.search(opts)):
            padding_bottom = int(pbm.group(1))
        if (dm := DASH_OPT_RE.search(opts)):
            border_dash = (int(dm.group(1)), int(dm.group(2)))
        if (sm := STROKE_OPT_RE.search(opts)):
            border_stroke = sm.group(1)
        if (lam := LABEL_ANCHOR_RE.search(opts)):
            label_anchor = lam.group(1)
        if (lpm := LABEL_POS_RE.search(opts)):
            label_position = lpm.group(1)
        if (im := ICON_OPT_RE.search(opts)):
            icon = im.group(1)
        if (dirm := DIRECTION_OPT_RE.search(opts)):
            direction = dirm.group(1)
    return Region(
        id=rid, label=label, style=style,
        padding=padding, padding_bottom=padding_bottom,
        border_dash=border_dash, border_stroke=border_stroke,
        label_anchor=label_anchor, label_position=label_position,
        icon=icon, contains=[], layout=direction,
    )


def _make_layout(m: re.Match) -> Region:
    lid, direction, x, y, gap, align = m.groups()
    return Region(
        id=lid, label="",
        pos=(int(x), int(y)), layout=direction, gap=int(gap),
        align=align or "center",
        padding=(0, 0), visible=False, contains=[],
    )


def _make_component(m: re.Match, line_no: int) -> Component:
    cid, shape, icon, accent, name, subtitle, ref = m.groups()
    pos = (0, 0)
    parent = align = None
    align_gap = 24
    if ref:
        ref = ref.strip()
        if (pm := POS_LITERAL_RE.match(ref)):
            pos = (int(pm.group(1)), int(pm.group(2)))
        elif (pm := PARENT_REF_RE.match(ref)):
            parent = pm.group(1)
            align = pm.group(2)
            if pm.group(3):
                align_gap = int(pm.group(3))
        else:
            raise SyntaxError(f"line {line_no}: bad @-ref {ref!r}")
    return Component(
        id=cid, name=name or "", subtitle=subtitle or "",
        icon=icon, shape=shape, accent=accent,
        pos=pos, parent=parent, align=align, align_gap=align_gap,
    )


def _make_edge(m: re.Match, line_no: int) -> Edge:
    src, arrow, dst, label, opts = m.groups()
    style = "orange" if arrow == "==>" else "gray"
    kw: dict = {
        "src_anchor": None,    # None → resolve_anchors picks from geometry
        "dst_anchor": None,
        "src_offset": (0, 0),
        "dst_offset": (0, 0),
        "label_offset": (0, 0),
        "label_small": False,
        "label_pos": None,
        "label_anchor": "mid",
        "via": [],
        "route": "auto",
        "dashed": False,
        "no_arrow": arrow == "---",        # `---` = undirected sibling link
    }
    if opts:
        _parse_edge_options(opts.strip(), kw, line_no)
    return Edge(src=src, dst=dst, label=label or "", style=style, **kw)


# ── Helpers ───────────────────────────────────────────────────────────
def _strip_comment(line: str) -> str:
    """Strip `#` comments outside of double-quoted strings.

    A `#` immediately followed by a hex digit (`#76b900`, `#abc`) is treated
    as a colour literal, not a comment — so `stroke #94a3b8` works inline.
    To start a colour token at a line position that *would* otherwise be a
    comment, ensure the `#` is followed by a hex digit (all real CSS colours
    do anyway)."""
    out, in_quote, i = [], False, 0
    while i < len(line):
        ch = line[i]
        if ch == '"':
            in_quote = not in_quote
            out.append(ch)
        elif ch == '#' and not in_quote:
            nxt = line[i + 1] if i + 1 < len(line) else ''
            if nxt and nxt in '0123456789abcdefABCDEF':
                out.append(ch)                      # hex colour, not a comment
            else:
                break                                # actual comment — stop here
        else:
            out.append(ch)
        i += 1
    return "".join(out)


def _parse_edge_options(s: str, kw: dict, line_no: int) -> None:
    for tok in _split_outside_parens(s, sep=','):
        tok = tok.strip()
        if not tok:
            continue
        if '=' in tok:
            key, _, value = tok.partition('=')
            _set_kv_option(kw, key.strip(), value.strip(), line_no)
        else:
            _set_flag(kw, tok, line_no)


def _split_outside_parens(s: str, sep: str) -> list[str]:
    out, cur, depth = [], [], 0
    for ch in s:
        if ch == '(':
            depth += 1
            cur.append(ch)
        elif ch == ')':
            depth -= 1
            cur.append(ch)
        elif ch == sep and depth == 0:
            out.append(''.join(cur))
            cur = []
        else:
            cur.append(ch)
    if cur:
        out.append(''.join(cur))
    return out


def _set_kv_option(kw: dict, key: str, value: str, line_no: int) -> None:
    if key in ("src", "dst"):
        am = ANCHOR_SPEC_RE.match(value)
        if not am:
            raise SyntaxError(f"line {line_no}: bad {key} anchor {value!r}")
        kw[f"{key}_anchor"] = am.group(1)
        if am.group(2):
            kw[f"{key}_offset"] = (int(am.group(2)), int(am.group(3)))
        return
    if key == "via":
        kw["via"] = [(int(p.group(1)), int(p.group(2)))
                     for p in VIA_PT_RE.finditer(value)]
        if not kw["via"]:
            raise SyntaxError(f"line {line_no}: via needs ≥1 point — got {value!r}")
        return
    if key in ("label_offset", "label_pos"):
        tm = TUPLE_RE.match(value)
        if not tm:
            raise SyntaxError(f"line {line_no}: {key} expects (x, y) — got {value!r}")
        kw[key] = (int(tm.group(1)), int(tm.group(2)))
        return
    if key == "route":
        if value not in ("auto", "over", "under", "curve"):
            raise SyntaxError(f"line {line_no}: bad route {value!r}")
        kw["route"] = value
        return
    if key == "label_at":
        if value not in ("src", "dst", "mid"):
            raise SyntaxError(f"line {line_no}: label_at expects src|dst|mid — got {value!r}")
        kw["label_anchor"] = value
        return
    raise SyntaxError(f"line {line_no}: unknown edge option {key!r}")


def _set_flag(kw: dict, flag: str, line_no: int) -> None:
    if flag == "small":
        kw["label_small"] = True
    elif flag == "dashed":
        kw["dashed"] = True
    elif flag == "shared":
        # Keep src anchor at the centre port — opt out of fan-out
        # stagger so multiple edges share one departure point (good
        # for star-fan from a single source with straight lines).
        kw["shared_port"] = True
    elif flag in ("curve", "over", "under", "straight", "elbow"):
        # `elbow` is the auto default — accept it explicitly so the
        # three "line shape" toggles read symmetrically in source.
        kw["route"] = "auto" if flag == "elbow" else flag
    else:
        raise SyntaxError(f"line {line_no}: unknown edge flag {flag!r}")


# ── Layout tree (Figma-style auto-layout) ─────────────────────────────
# Tokens: `{` `}` `|` `,` IDENT. Tree node:
#   ("id", "<id>")
#   ("group", "horizontal"|"vertical", [child, …])
def _parse_layout_tree(expr: str, line_no: int):
    tokens = _tokenize_layout(expr, line_no)
    pos = [0]
    node = _parse_layout_node(tokens, pos, line_no)
    if pos[0] < len(tokens):
        raise SyntaxError(f"line {line_no}: trailing token {tokens[pos[0]]!r} in layout")
    return node


def _tokenize_layout(s: str, line_no: int) -> list[str]:
    out: list[str] = []
    i = 0
    while i < len(s):
        ch = s[i]
        if ch in "{}|,":
            out.append(ch)
            i += 1
        elif ch.isspace():
            i += 1
        elif ch.isalnum() or ch == "_":
            j = i
            while j < len(s) and (s[j].isalnum() or s[j] == "_"):
                j += 1
            out.append(s[i:j])
            i = j
        else:
            raise SyntaxError(f"line {line_no}: bad char {ch!r} in layout expr")
    return out


def _parse_layout_node(tokens: list[str], pos: list[int], line_no: int):
    items = [_parse_layout_atom(tokens, pos, line_no)]
    sep: str | None = None
    while pos[0] < len(tokens) and tokens[pos[0]] in "|,":
        cur = tokens[pos[0]]
        if sep is None:
            sep = cur
        elif sep != cur:
            raise SyntaxError(
                f"line {line_no}: cannot mix `|` and `,` at same level — use {{}} to group"
            )
        pos[0] += 1
        items.append(_parse_layout_atom(tokens, pos, line_no))
    if sep is None:
        return items[0]
    direction = "horizontal" if sep == "|" else "vertical"
    return ("group", direction, items)


def _parse_layout_atom(tokens: list[str], pos: list[int], line_no: int):
    if pos[0] >= len(tokens):
        raise SyntaxError(f"line {line_no}: expected id or `{{` in layout expr")
    tok = tokens[pos[0]]
    if tok == "{":
        pos[0] += 1
        node = _parse_layout_node(tokens, pos, line_no)
        if pos[0] >= len(tokens) or tokens[pos[0]] != "}":
            raise SyntaxError(f"line {line_no}: missing `}}` in layout expr")
        pos[0] += 1
        return node
    if tok in "|,}":
        raise SyntaxError(f"line {line_no}: unexpected {tok!r} in layout expr")
    pos[0] += 1
    return ("id", tok)


def _inline_region_leaves(tree, regions_by_id: dict):
    """Replace leaves whose id matches a region with a sub-tree built
    from the region's `contains` list and its declared `layout`
    direction. Lets the layout DSL stay flat — write
    `layout { dns | lb | services_box | … }` instead of repeating every
    component already listed inside `services_box`.

    Tree node shape:
      ("id", "<id>")                                — leaf component
      ("group", direction, [children])              — basic group
      ("group", direction, [children], (px, py))    — group with padding
                                                     (4-tuple variant —
                                                     extra outer space
                                                     accounting for a
                                                     cluster region's
                                                     padding so adjacent
                                                     clusters don't
                                                     overlap)
    Regions without a direction stay opaque (treated as a single leaf —
    apply_layout_tree will fail on them, signalling the missing direction)."""
    if tree[0] == "id":
        cid = tree[1]
        r = regions_by_id.get(cid)
        if r is not None and r.layout and r.contains:
            children = [_inline_region_leaves(("id", ch), regions_by_id)
                        for ch in r.contains]
            return ("group", r.layout, children, r.padding)
        return tree
    direction, children = tree[1], tree[2]
    padding = tree[3] if len(tree) > 3 else None
    new_children = [_inline_region_leaves(c, regions_by_id) for c in children]
    if padding is not None:
        return ("group", direction, new_children, padding)
    return ("group", direction, new_children)

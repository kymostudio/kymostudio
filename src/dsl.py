"""Mermaid-like DSL parser for diagrams.

A textual surface for `model.Diagram`. Same expressive power as the
Python dataclass form (Components, Regions, Auto-layouts, Edges with
anchors/offsets/waypoints) but line-based and brace-delimited so it
reads like Mermaid.

See ../docs/BEST_PRACTICE_DIAGRAMS.md §5.5 for the language grammar.
"""
from __future__ import annotations

import re

from model import Component, Diagram, Edge, Region


# ── Line patterns ─────────────────────────────────────────────────────
# Metadata directives use `key:` style (yaml-like). `:` is optional on
# `canvas:` for backward compat; `title:`/`subtitle:` require it.
# The output file path is NOT a diagram property — it's a render config
# in cli.py's TARGETS dict.
CANVAS_RE   = re.compile(r'^canvas\s*:?\s+(\d+)\s*x\s*(\d+)\s*$')
TITLE_RE    = re.compile(r'^title\s*:\s*"([^"]*)"\s*$')
SUBTITLE_RE = re.compile(r'^subtitle\s*:\s*"([^"]*)"\s*$')

# component <id> <shape>/<icon>/<accent> "Name" "Subtitle" [@ <pos|parent-ref>]
COMP_RE = re.compile(
    r'^component\s+(\w+)\s+'
    r'([\w-]+)/([\w-]+)/(\w+)\s+'
    r'"([^"]*)"\s+'
    r'"([^"]*)"'
    r'(?:\s+@\s+(.+?))?'
    r'\s*$'
)
POS_LITERAL_RE = re.compile(r'^\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$')
PARENT_REF_RE  = re.compile(
    r'^(\w+)\s+(top|right|bottom|left)(?:\s+(-?\d+))?$'
)

# region <id> <style> "Label" [opt opt opt …] {
#
# Trailing options are parsed individually so they can appear in any order
# and the set is open for extension. Currently recognised:
#   padding (h, v)           — region inner padding
#   dash    (X, Y)           — stroke-dasharray override; (0, 0) = solid
#   stroke  #hex             — stroke colour override
REGION_RE = re.compile(
    r'^region\s+(\w+)\s+(outer|inner)\s+"([^"]*)"'
    r'(?:\s+(.+?))?'                               # trailing options blob
    r'\s*\{\s*$'
)

PADDING_OPT_RE     = re.compile(r'\bpadding\s+\(\s*(\d+)\s*,\s*(\d+)\s*\)')
PADDING_BOT_OPT_RE = re.compile(r'\bpadding-bottom\s+(\d+)')
DASH_OPT_RE        = re.compile(r'\bdash\s+\(\s*(\d+)\s*,\s*(\d+)\s*\)')
STROKE_OPT_RE      = re.compile(r'\bstroke\s+(#[0-9a-fA-F]{3,8})')
LABEL_ANCHOR_RE    = re.compile(r'\blabel-anchor\s+(start|middle|end)')
LABEL_POS_RE       = re.compile(r'\blabel-position\s+(above|inside)')
ICON_OPT_RE        = re.compile(r'\bicon\s+([\w-]+)')

# layout <id> <horizontal|vertical> pos (x, y) gap N [align <start|center|end>] {
LAYOUT_RE = re.compile(
    r'^layout\s+(\w+)\s+(horizontal|vertical)\s+'
    r'pos\s+\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s+'
    r'gap\s+(\d+)'
    r'(?:\s+align\s+(start|center|end))?'
    r'\s*\{\s*$'
)

CLOSE_RE = re.compile(r'^\s*\}\s*$')

# external <id> above <parent> [gap N]
# Pushes the canvas top-margin down to leave room for an external component
# placed above a grid cell. Only "above" is implemented (matches layout.py).
EXTERNAL_RE = re.compile(
    r'^external\s+(\w+)\s+above\s+(\w+)(?:\s+gap\s+(\d+))?\s*$'
)

# `row id1 id2 …` inside a region body switches that region to GRID mode:
# children flow across rows that align horizontally ACROSS all grid regions
# (row 0 of every region shares one Y, row 1 another, etc — that's the
# whole point of `LAYOUT` in layout.py).
ROW_RE = re.compile(r'^row(?:\s+(.+))?$')

# Edge: <src> --> <dst> [: "label"] [{ options }]
#       <src> ==> <dst> [: "label"] [{ options }]    ← orange style
EDGE_RE = re.compile(
    r'^(\w+)\s+(-->|==>)\s+(\w+)'
    r'(?:\s+:\s+"([^"]*)")?'
    r'(?:\s+\{(.*)\})?'
    r'\s*$'
)

# Anchor with optional offset: right, right(0,-10)
ANCHOR_SPEC_RE = re.compile(
    r'^(top|right|bottom|left|center)'
    r'(?:\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\))?$'
)
TUPLE_RE = re.compile(r'^\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$')
VIA_PT_RE = re.compile(r'\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)')


# ── Public API ────────────────────────────────────────────────────────
def parse(dsl: str) -> tuple[Diagram, dict | None, dict | None]:
    """Parse a Mermaid-like diagram DSL.

    Returns `(diagram, layout, external)`:
      - `layout` is a `{region_id: [[cell_id, ...], ...]}` dict when any
        region uses grid-style `row …` syntax; `None` otherwise.
      - `external` is `{component_id: {"above": parent_id, "gap": N}}` when
        any `external …` directive appears; `None` otherwise.

    `layout` and `external` flow into `layout.layout(diagram, layout, external)`
    in the CLI pipeline; when both are None the layout pass is skipped.
    """
    components: list[Component] = []
    regions:    list[Region]    = []
    edges:      list[Edge]      = []
    layout_dict: dict[str, list[list[str]]] = {}
    external_dict: dict[str, dict] = {}
    # (0, 0) sentinel → render-time auto-sizing kicks in (see
    # alignment._auto_size_canvas). Explicit `canvas W x H` overrides.
    canvas: tuple[int, int] = (0, 0)
    title: str = ""
    subtitle: str = ""

    lines = dsl.splitlines()
    i = 0
    while i < len(lines):
        line = _strip_comment(lines[i]).strip()
        if not line:
            i += 1
            continue

        if (m := CANVAS_RE.match(line)):
            canvas = (int(m.group(1)), int(m.group(2)))
            i += 1
            continue

        if (m := TITLE_RE.match(line)):
            title = m.group(1)
            i += 1
            continue

        if (m := SUBTITLE_RE.match(line)):
            subtitle = m.group(1)
            i += 1
            continue

        if (m := EXTERNAL_RE.match(line)):
            eid, parent, gap = m.groups()
            external_dict[eid] = {"above": parent, "gap": int(gap) if gap else 60}
            i += 1
            continue

        if (m := COMP_RE.match(line)):
            components.append(_make_component(m, line_no=i + 1))
            i += 1
            continue

        if (m := REGION_RE.match(line)):
            region, rows, consumed = _make_region(m, lines, i)
            regions.append(region)
            if rows is not None:
                layout_dict[region.id] = rows
            i += consumed
            continue

        if (m := LAYOUT_RE.match(line)):
            region, consumed = _make_layout(m, lines, i)
            regions.append(region)
            i += consumed
            continue

        if (m := EDGE_RE.match(line)):
            edges.append(_make_edge(m, line_no=i + 1))
            i += 1
            continue

        raise SyntaxError(f"line {i + 1}: unrecognised — {line!r}")

    diagram = Diagram(
        width=canvas[0], height=canvas[1],
        title=title, subtitle=subtitle,
        components=components, regions=regions, edges=edges,
    )
    return (
        diagram,
        layout_dict or None,
        external_dict or None,
    )


# ── Helpers ───────────────────────────────────────────────────────────
def _strip_comment(line: str) -> str:
    """Strip `#` comments outside of double-quoted strings.

    A `#` immediately followed by a hex digit (`#76b900`, `#abc`) is treated
    as a colour literal, not a comment — so `stroke #94a3b8` works inline.
    To start a colour token at a line position that *would* otherwise be a
    comment, ensure the `#` is followed by a hex digit (which all real CSS
    colours do anyway)."""
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
        id=cid, name=name, subtitle=subtitle,
        icon=icon, shape=shape, accent=accent,
        pos=pos, parent=parent, align=align, align_gap=align_gap,
    )


def _make_region(
    m: re.Match, lines: list[str], i: int,
) -> tuple[Region, list[list[str]] | None, int]:
    """Return `(region, rows, consumed)`. `rows` is non-None only when the
    body uses grid-style `row …` lines — caller registers it in the
    top-level LAYOUT dict so `layout.layout()` can run."""
    rid, style, label, opts = m.group(1), m.group(2), m.group(3), m.group(4)
    padding = (24, 24)
    padding_bottom: int | None = None
    border_dash: tuple[int, int] | None = None
    border_stroke: str | None = None
    label_anchor = "middle"
    label_position: str | None = None
    icon: str | None = None
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

    body, consumed = _read_body(lines, i + 1)
    rows = _parse_rows(body, rid, line_no=i + 1)
    if rows is not None:
        # Grid mode: bounds + positions are computed by layout.layout() from
        # the rows. Leave `contains=[]` so _resolve_region_bounds skips this
        # region (it would otherwise recompute bounds and clobber layout's).
        contains: list[str] = []
    else:
        contains = [tok for line in body for tok in line.split()]

    return (
        Region(id=rid, label=label, style=style,
               padding=padding, padding_bottom=padding_bottom,
               border_dash=border_dash, border_stroke=border_stroke,
               label_anchor=label_anchor, label_position=label_position,
               icon=icon, contains=contains),
        rows,
        consumed + 1,                              # +1 for the opening line
    )


def _read_body(lines: list[str], start: int) -> tuple[list[str], int]:
    """Read non-empty, comment-stripped body lines until the matching `}`.
    Returns (lines, lines_consumed including the closing brace)."""
    body: list[str] = []
    j = start
    while j < len(lines):
        if CLOSE_RE.match(lines[j]):
            return body, j - start + 1
        text = _strip_comment(lines[j]).strip()
        if text:
            body.append(text)
        j += 1
    raise SyntaxError(f"line {start}: unclosed block (no matching `}}`)")


def _parse_rows(body: list[str], rid: str, line_no: int) -> list[list[str]] | None:
    """If any body line starts with `row`, parse the whole body as grid
    rows. An all-flat body returns None (caller treats it as a `contains` list)."""
    if not any(ROW_RE.match(line) for line in body):
        return None
    rows: list[list[str]] = []
    for line in body:
        rm = ROW_RE.match(line)
        if not rm:
            raise SyntaxError(
                f"line {line_no}: region {rid!r} mixes `row` and bare ids — pick one"
            )
        ids = (rm.group(1) or "").split()
        rows.append(ids)
    return rows


def _make_layout(m: re.Match, lines: list[str], i: int) -> tuple[Region, int]:
    lid, direction, x, y, gap, align = m.groups()
    contains, consumed = _read_id_block(lines, i + 1)
    return (
        Region(id=lid, label="",
               pos=(int(x), int(y)), layout=direction, gap=int(gap),
               align=align or "center",
               padding=(0, 0), visible=False,
               contains=contains),
        consumed + 1,
    )


def _read_id_block(lines: list[str], start: int) -> tuple[list[str], int]:
    """Read space-separated component ids until the matching `}`.
    Returns (ids, lines_consumed including the closing brace)."""
    ids: list[str] = []
    j = start
    while j < len(lines):
        if CLOSE_RE.match(lines[j]):
            return ids, j - start + 1            # incl. closing brace
        text = _strip_comment(lines[j]).strip()
        if text:
            ids.extend(text.split())
        j += 1
    raise SyntaxError(f"line {start}: unclosed block (no matching `}}`)")


def _make_edge(m: re.Match, line_no: int) -> Edge:
    src, arrow, dst, label, opts = m.groups()
    style = "orange" if arrow == "==>" else "gray"
    kw: dict = {
        "src_anchor": "right",
        "dst_anchor": "left",
        "src_offset": (0, 0),
        "dst_offset": (0, 0),
        "label_offset": (0, 0),
        "label_small": False,
        "label_pos": None,
        "label_anchor": "mid",
        "via": [],
        "route": "auto",
        "dashed": False,
    }
    if opts:
        _parse_edge_options(opts.strip(), kw, line_no)
    return Edge(src=src, dst=dst, label=label or "", style=style, **kw)


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
    elif flag in ("curve", "over", "under"):
        kw["route"] = flag
    else:
        raise SyntaxError(f"line {line_no}: unknown edge flag {flag!r}")

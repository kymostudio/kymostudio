"""BPMN 2.0 glyph renderer.

`to_svg.render_component` delegates here for any component whose `shape`
starts with ``bpmn-``. Each function returns a self-contained SVG fragment
positioned in absolute canvas coordinates — `Component.pos` is the glyph
*centre* and `Component.size` is its (width, height) box, both taken from
the source file's Diagram-Interchange bounds (see `from_bpmn.py`).

The element's BPMN sub-type marker (event-definition / task-type /
gateway-type) is carried in `Component.icon`; this module turns that key
into the small symbol drawn inside the glyph.

Kept separate from `to_svg.py` so the architecture-diagram renderer stays
lean. This module imports nothing from `to_svg` (one-way dependency).
"""
from __future__ import annotations

from html import escape as _xml_escape

from .model import Component

# ── Palette ───────────────────────────────────────────────────────────
# Monochrome, matching the bpmn.io default look: a single dark ink for
# every glyph outline (the ring colour passed into event markers must
# match the `.bpmn-event*` strokes in BPMN_STYLE below).
_INK         = "#4b5563"
_START = _END = _INTERMED = _INK


def _esc(text: str) -> str:
    return _xml_escape(text, quote=False)


def _f(v: float) -> str:
    """Compact number formatting (drop trailing zeros)."""
    return f"{v:.2f}".rstrip("0").rstrip(".")


# ── DEFS (flow markers) ────────────────────────────────────────────────
# Appended to the document <defs> by to_svg.render(). markerUnits in user
# space keeps the head a constant size regardless of the path stroke.
BPMN_DEFS = """
<!-- BPMN sequence-flow head: filled solid triangle -->
<marker id="bpmn-seq-end" viewBox="0 0 12 12" refX="10.5" refY="6"
        markerWidth="12" markerHeight="12" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M1,1.5 L11,6 L1,10.5 Z" fill="#374151"/>
</marker>
<!-- BPMN message-flow head: open (hollow) triangle -->
<marker id="bpmn-msg-end" viewBox="0 0 14 14" refX="12" refY="7"
        markerWidth="13" markerHeight="13" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M1.5,2 L12,7 L1.5,12 Z" fill="#ffffff" stroke="#374151" stroke-width="1.2"/>
</marker>
<!-- BPMN message-flow tail: small hollow circle -->
<marker id="bpmn-msg-start" viewBox="0 0 12 12" refX="6" refY="6"
        markerWidth="11" markerHeight="11" orient="auto" markerUnits="userSpaceOnUse">
  <circle cx="6" cy="6" r="3.6" fill="#ffffff" stroke="#374151" stroke-width="1.2"/>
</marker>
<!-- BPMN association head: thin open V -->
<marker id="bpmn-assoc-end" viewBox="0 0 12 10" refX="10" refY="5"
        markerWidth="11" markerHeight="11" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M2,1 L11,5 L2,9" fill="none" stroke="#6b7280" stroke-width="1.3"
        stroke-linecap="round" stroke-linejoin="round"/>
</marker>
"""

# ── CSS ─────────────────────────────────────────────────────────────────
BPMN_STYLE = """
.bpmn-event       { fill: #ffffff; }
.bpmn-event--start{ stroke: #4b5563; stroke-width: 1.6; }
.bpmn-event--end  { stroke: #4b5563; stroke-width: 3.4; }
.bpmn-event--ring { stroke: #4b5563; stroke-width: 1.5; }
.bpmn-task        { fill: #ffffff; stroke: #4b5563; stroke-width: 1.6; }
.bpmn-gateway     { fill: #ffffff; stroke: #4b5563; stroke-width: 1.6; }
.bpmn-data        { fill: #ffffff; stroke: #6b7280; stroke-width: 1.4; }
.bpmn-marker      { fill: none; stroke: #374151; stroke-width: 1.7;
                    stroke-linecap: round; stroke-linejoin: round; }
.bpmn-marker--fill{ fill: #374151; stroke: none; }
.bpmn-label       { font-size: 12.5px; fill: #1f2937; text-anchor: middle; }
.bpmn-label--out  { font-size: 11.5px; fill: #374151; text-anchor: middle;
                    paint-order: stroke; stroke: #fafafa; stroke-width: 3;
                    stroke-linejoin: round; }
.bpmn-anno-text   { font-size: 12px; fill: #374151; }
.bpmn-flow        { fill: none; stroke: #374151; stroke-width: 1.6;
                    stroke-linejoin: round; stroke-linecap: round; }
.bpmn-flow--message { stroke-dasharray: 7 5; }
.bpmn-flow--assoc { stroke: #6b7280; stroke-width: 1.3; stroke-dasharray: 1.5 4; }
.bpmn-flow-label  { font-size: 11px; fill: #334155; text-anchor: middle;
                    paint-order: stroke; stroke: #fafafa; stroke-width: 3.5;
                    stroke-linejoin: round; }
.region-rect--pool{ fill: rgba(248,250,252,0.5); stroke: #94a3b8;
                    stroke-width: 1.4; stroke-dasharray: none; }
.region-rect--lane{ fill: none; stroke: #cbd5e1; stroke-width: 1.1;
                    stroke-dasharray: none; }
.bpmn-pool-band   { stroke: #94a3b8; stroke-width: 1.4; }
.bpmn-lane-band   { stroke: #cbd5e1; stroke-width: 1.1; }
.bpmn-pool-label  { font-size: 12.5px; font-weight: 600; fill: #475569;
                    letter-spacing: 0.02em; }
"""


# ── Text wrapping (greedy, char-width estimate) ─────────────────────────
def _wrap(text: str, width_px: float, font_px: float, max_lines: int) -> list[str]:
    if not text:
        return []
    max_chars = max(3, int((width_px - 8) / (font_px * 0.55)))
    words, lines, cur = text.split(), [], ""
    for w in words:
        cand = f"{cur} {w}".strip()
        if len(cand) <= max_chars or not cur:
            cur = cand
        else:
            lines.append(cur)
            cur = w
        if len(lines) == max_lines:
            break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    if len(lines) == max_lines and (cur != lines[-1] or len(" ".join(words)) > sum(len(x) for x in lines) + len(lines)):
        # text was truncated — add an ellipsis to the last line
        last = lines[-1]
        if len(last) > max_chars - 1:
            last = last[: max_chars - 1].rstrip()
        lines[-1] = last + "…"
    return lines


def _centered_lines(lines: list[str], cx: float, cy: float, font_px: float,
                    cls: str = "bpmn-label") -> str:
    if not lines:
        return ""
    lh = font_px + 2.5
    top = cy - (len(lines) - 1) * lh / 2 + font_px * 0.35
    out = []
    for i, ln in enumerate(lines):
        y = top + i * lh
        out.append(f'<text class="{cls}" x="{_f(cx)}" y="{_f(y)}">{_esc(ln)}</text>')
    return "".join(out)


# ── Event-definition marker glyphs ──────────────────────────────────────
# Each returns an SVG fragment centred on (0,0); the caller translates it to
# the event centre and scales it to fit. `s` is the half-extent target.
def _event_marker(kind: str, s: float, color: str) -> str:
    cls = f'class="bpmn-marker" stroke="{color}"'
    fillcls = f'class="bpmn-marker--fill" fill="{color}"'
    if kind in ("", "none"):
        return ""
    if kind == "message":
        w, h = s * 1.5, s * 1.05
        return (
            f'<g {cls}>'
            f'<rect x="{_f(-w)}" y="{_f(-h)}" width="{_f(2*w)}" height="{_f(2*h)}" rx="1"/>'
            f'<path d="M{_f(-w)},{_f(-h)} L0,{_f(h*0.15)} L{_f(w)},{_f(-h)}"/>'
            f'</g>'
        )
    if kind == "timer":
        r = s * 1.25
        ticks = "".join(
            f'<line x1="{_f(r*0.78*_cos(a))}" y1="{_f(r*0.78*_sin(a))}"'
            f' x2="{_f(r*0.98*_cos(a))}" y2="{_f(r*0.98*_sin(a))}"/>'
            for a in range(0, 360, 30)
        )
        return (
            f'<g {cls}>'
            f'<circle cx="0" cy="0" r="{_f(r)}"/>'
            f'{ticks}'
            f'<path d="M0,{_f(-r*0.55)} L0,0 L{_f(r*0.45)},{_f(r*0.2)}"/>'
            f'</g>'
        )
    if kind == "error":
        return (
            f'<g {cls}><path d="M{_f(-s)},{_f(s)} L{_f(-s*0.25)},{_f(-s*0.4)}'
            f' L{_f(s*0.3)},{_f(s*0.35)} L{_f(s)},{_f(-s)}"/></g>'
        )
    if kind in ("escalation",):
        return (
            f'<g {fillcls}><path d="M0,{_f(-s)} L{_f(s*0.7)},{_f(s*0.6)}'
            f' L0,{_f(s*0.05)} L{_f(-s*0.7)},{_f(s*0.6)} Z"/></g>'
        )
    if kind == "signal":
        return (
            f'<g {cls}><path d="M0,{_f(-s)} L{_f(s)},{_f(s*0.7)}'
            f' L{_f(-s)},{_f(s*0.7)} Z"/></g>'
        )
    if kind == "terminate":
        return f'<g {fillcls}><circle cx="0" cy="0" r="{_f(s*1.15)}"/></g>'
    if kind == "conditional":
        w, h = s * 1.1, s * 1.1
        rows = "".join(
            f'<line x1="{_f(-w*0.7)}" y1="{_f(y)}" x2="{_f(w*0.7)}" y2="{_f(y)}"/>'
            for y in (-h*0.55, -h*0.18, h*0.18, h*0.55)
        )
        return (
            f'<g {cls}><rect x="{_f(-w)}" y="{_f(-h)}" width="{_f(2*w)}"'
            f' height="{_f(2*h)}" rx="1"/>{rows}</g>'
        )
    if kind == "link":
        return (
            f'<g {cls}><path d="M{_f(-s)},{_f(-s*0.45)} L{_f(s*0.3)},{_f(-s*0.45)}'
            f' L{_f(s*0.3)},{_f(-s)} L{_f(s)},0 L{_f(s*0.3)},{_f(s)}'
            f' L{_f(s*0.3)},{_f(s*0.45)} L{_f(-s)},{_f(s*0.45)} Z"/></g>'
        )
    if kind == "compensation":
        return (
            f'<g {fillcls}><path d="M0,{_f(-s)} L{_f(-s)},0 L0,{_f(s)} Z"/>'
            f'<path d="M{_f(s)},{_f(-s)} L0,0 L{_f(s)},{_f(s)} Z"/></g>'
        )
    return ""


# tiny trig without importing math everywhere (degrees)
def _cos(deg: float) -> float:
    import math
    return math.cos(math.radians(deg))


def _sin(deg: float) -> float:
    import math
    return math.sin(math.radians(deg))


# ── Task-type marker glyphs (top-left corner, ~16px) ────────────────────
def _task_marker(kind: str, x: float, y: float) -> str:
    """Small task-type symbol anchored at top-left (x, y) of the task box."""
    if kind in ("", "none", "task"):
        return ""
    g = f'<g class="bpmn-marker" transform="translate({_f(x + 4)}, {_f(y + 4)})">'
    e = "</g>"
    if kind == "user":
        return (g +
            '<circle cx="7" cy="4.5" r="3"/>'
            '<path d="M1.5,14 C1.5,9.5 12.5,9.5 12.5,14"/>' + e)
    if kind == "service":
        # gear (octagon ring) + hub
        return (g +
            '<path d="M7,1 L9,2 L11,1.5 L12,3.5 L13.5,5 L13,7 L13.5,9'
            ' L12,10.5 L11,12.5 L9,12 L7,13 L5,12 L3,12.5 L2,10.5 L0.5,9'
            ' L1,7 L0.5,5 L2,3.5 L3,1.5 L5,2 Z" />'
            '<circle cx="7" cy="7" r="2.6"/>' + e)
    if kind == "script":
        return (g +
            '<path d="M3,1 C1,1 1,4 3,4 L11,4 C13,4 13,1 11,1 Z"/>'
            '<line x1="3.5" y1="7" x2="10" y2="7"/>'
            '<line x1="3.5" y1="10" x2="10" y2="10"/>'
            '<line x1="3.5" y1="13" x2="8" y2="13"/>' + e)
    if kind in ("send",):
        return (g.replace('class="bpmn-marker"', 'class="bpmn-marker--fill"') +
            '<path d="M0,1 L14,1 L14,11 L0,11 Z"/>'
            '<path d="M0,1 L7,7 L14,1" fill="none" stroke="#ffffff" stroke-width="1"/>' + e)
    if kind in ("receive",):
        return (g +
            '<rect x="0.5" y="1.5" width="13" height="10" rx="0.5"/>'
            '<path d="M0.5,1.5 L7,7 L13.5,1.5"/>' + e)
    if kind == "manual":
        # stylised hand: four fingers + palm U + thumb
        return (g +
            '<path d="M3,7 L3,4.2 M5.5,7 L5.5,3 M8,7 L8,3 M10.5,7 L10.5,4.2"/>'
            '<path d="M3,7 L3,10 C3,13.5 11,13.5 11,10 L11,6"/>'
            '<path d="M3,8 L1.3,9.6"/>' + e)
    if kind in ("rule", "businessrule"):
        return (g +
            '<rect x="0.5" y="1.5" width="13" height="11" rx="0.5"/>'
            '<line x1="0.5" y1="4.5" x2="13.5" y2="4.5"/>'
            '<line x1="4" y1="1.5" x2="4" y2="12.5"/>' + e)
    return ""


# ── Gateway-type marker glyphs (centred on (cx,cy)) ─────────────────────
def _gateway_marker(kind: str, cx: float, cy: float, s: float) -> str:
    cls = 'class="bpmn-marker" stroke-width="2.4"'
    if kind in ("", "none"):
        # empty diamond — exclusive gateway with isMarkerVisible off
        # (bpmn.io's default), or an untyped gateway.
        return ""
    if kind == "exclusive":
        # bold X
        return (
            f'<g {cls}>'
            f'<line x1="{_f(cx-s)}" y1="{_f(cy-s)}" x2="{_f(cx+s)}" y2="{_f(cy+s)}"/>'
            f'<line x1="{_f(cx+s)}" y1="{_f(cy-s)}" x2="{_f(cx-s)}" y2="{_f(cy+s)}"/>'
            f'</g>'
        )
    if kind == "parallel":
        return (
            f'<g {cls}>'
            f'<line x1="{_f(cx)}" y1="{_f(cy-s)}" x2="{_f(cx)}" y2="{_f(cy+s)}"/>'
            f'<line x1="{_f(cx-s)}" y1="{_f(cy)}" x2="{_f(cx+s)}" y2="{_f(cy)}"/>'
            f'</g>'
        )
    if kind == "inclusive":
        return (f'<circle class="bpmn-marker" stroke-width="2.4" cx="{_f(cx)}"'
                f' cy="{_f(cy)}" r="{_f(s*0.85)}"/>')
    if kind == "complex":
        d = s * 0.72
        return (
            f'<g {cls}>'
            f'<line x1="{_f(cx)}" y1="{_f(cy-s)}" x2="{_f(cx)}" y2="{_f(cy+s)}"/>'
            f'<line x1="{_f(cx-s)}" y1="{_f(cy)}" x2="{_f(cx+s)}" y2="{_f(cy)}"/>'
            f'<line x1="{_f(cx-d)}" y1="{_f(cy-d)}" x2="{_f(cx+d)}" y2="{_f(cy+d)}"/>'
            f'<line x1="{_f(cx+d)}" y1="{_f(cy-d)}" x2="{_f(cx-d)}" y2="{_f(cy+d)}"/>'
            f'</g>'
        )
    if kind in ("event", "eventbased"):
        # double circle + pentagon
        pent = " ".join(
            f"{_f(cx + s*0.6*_sin(72*i))},{_f(cy - s*0.6*_cos(72*i))}"
            for i in range(5)
        )
        return (
            f'<g class="bpmn-marker">'
            f'<circle cx="{_f(cx)}" cy="{_f(cy)}" r="{_f(s)}"/>'
            f'<circle cx="{_f(cx)}" cy="{_f(cy)}" r="{_f(s*0.78)}"/>'
            f'<polygon points="{pent}"/>'
            f'</g>'
        )
    return ""


# ── Glyph dispatch ──────────────────────────────────────────────────────
def render_component(c: Component) -> str:
    cx, cy = c.pos
    hw, hh = c.half
    shape = c.shape
    marker = c.icon or ""

    if shape in ("bpmn-start", "bpmn-end", "bpmn-intermediate", "bpmn-boundary"):
        return _render_event(c, cx, cy, min(hw, hh), shape, marker)
    if shape in ("bpmn-task", "bpmn-subprocess"):
        return _render_task(c, cx, cy, hw, hh, marker, collapsed=(shape == "bpmn-subprocess"))
    if shape == "bpmn-gateway":
        return _render_gateway(c, cx, cy, hw, hh, marker)
    if shape == "bpmn-data-object":
        return _render_data_object(c, cx, cy, hw, hh)
    if shape == "bpmn-data-store":
        return _render_data_store(c, cx, cy, hw, hh)
    if shape == "bpmn-annotation":
        return _render_annotation(c, cx, cy, hw, hh)
    return ""


def _render_event(c: Component, cx: float, cy: float, r: float,
                  shape: str, marker: str) -> str:
    if shape == "bpmn-start":
        ring_cls, color = "bpmn-event bpmn-event--start", _START
        rings = f'<circle class="{ring_cls}" cx="{_f(cx)}" cy="{_f(cy)}" r="{_f(r)}"/>'
    elif shape == "bpmn-end":
        ring_cls, color = "bpmn-event bpmn-event--end", _END
        rings = f'<circle class="{ring_cls}" cx="{_f(cx)}" cy="{_f(cy)}" r="{_f(r)}"/>'
    else:  # intermediate / boundary — double ring
        color = _INTERMED
        rings = (
            f'<circle class="bpmn-event bpmn-event--ring" cx="{_f(cx)}" cy="{_f(cy)}" r="{_f(r)}"/>'
            f'<circle class="bpmn-event bpmn-event--ring" cx="{_f(cx)}" cy="{_f(cy)}" r="{_f(r-3.2)}"/>'
        )
    glyph = _event_marker(marker, r * 0.42, color)
    glyph_g = f'<g transform="translate({_f(cx)}, {_f(cy)})">{glyph}</g>' if glyph else ""
    label = ""
    if c.name:
        lines = _wrap(c.name, max(70, 2 * r + 40), 11.5, 2)
        label = _centered_lines(lines, cx, cy + r + 13, 11.5, "bpmn-label--out")
    return f'{rings}{glyph_g}{label}'


def _render_task(c: Component, cx: float, cy: float, hw: float, hh: float,
                 marker: str, collapsed: bool) -> str:
    x, y, w, h = cx - hw, cy - hh, 2 * hw, 2 * hh
    box = (f'<rect class="bpmn-task" x="{_f(x)}" y="{_f(y)}" width="{_f(w)}"'
           f' height="{_f(h)}" rx="9"/>')
    mk = _task_marker(marker, x, y)
    lines = _wrap(c.name, w - 12, 12.5, 4)
    label = _centered_lines(lines, cx, cy + (4 if mk else 0), 12.5, "bpmn-label")
    plus = ""
    if collapsed:
        # collapsed sub-process expand marker: + in a small box, bottom-centre
        bx, by = cx - 6, y + h - 14
        plus = (
            f'<g class="bpmn-marker">'
            f'<rect x="{_f(bx)}" y="{_f(by)}" width="12" height="12" rx="1"/>'
            f'<line x1="{_f(bx+6)}" y1="{_f(by+2.5)}" x2="{_f(bx+6)}" y2="{_f(by+9.5)}"/>'
            f'<line x1="{_f(bx+2.5)}" y1="{_f(by+6)}" x2="{_f(bx+9.5)}" y2="{_f(by+6)}"/>'
            f'</g>'
        )
    return f'{box}{mk}{label}{plus}'


def _render_gateway(c: Component, cx: float, cy: float, hw: float, hh: float,
                    marker: str) -> str:
    pts = f"{_f(cx)},{_f(cy-hh)} {_f(cx+hw)},{_f(cy)} {_f(cx)},{_f(cy+hh)} {_f(cx-hw)},{_f(cy)}"
    diamond = f'<polygon class="bpmn-gateway" points="{pts}"/>'
    mk = _gateway_marker(marker, cx, cy, min(hw, hh) * 0.42)
    label = ""
    if c.name:
        lines = _wrap(c.name, max(90, 2 * hw + 60), 11.5, 2)
        label = _centered_lines(lines, cx, cy + hh + 13, 11.5, "bpmn-label--out")
    return f'{diamond}{mk}{label}'


def _render_data_object(c: Component, cx: float, cy: float, hw: float, hh: float) -> str:
    x, y, w, h = cx - hw, cy - hh, 2 * hw, 2 * hh
    fold = min(w, h) * 0.32
    page = (
        f'<path class="bpmn-data" d="M{_f(x)},{_f(y)} L{_f(x+w-fold)},{_f(y)}'
        f' L{_f(x+w)},{_f(y+fold)} L{_f(x+w)},{_f(y+h)} L{_f(x)},{_f(y+h)} Z"/>'
        f'<path class="bpmn-data" d="M{_f(x+w-fold)},{_f(y)} L{_f(x+w-fold)},{_f(y+fold)}'
        f' L{_f(x+w)},{_f(y+fold)}"/>'
    )
    label = ""
    if c.name:
        lines = _wrap(c.name, max(90, w + 50), 11.5, 2)
        label = _centered_lines(lines, cx, cy + hh + 13, 11.5, "bpmn-label--out")
    return f'{page}{label}'


def _render_data_store(c: Component, cx: float, cy: float, hw: float, hh: float) -> str:
    x, w = cx - hw, 2 * hw
    top, bot = cy - hh, cy + hh
    ry = min(hh * 0.45, hw * 0.4)
    body = (
        f'<path class="bpmn-data" d="M{_f(x)},{_f(top+ry)} '
        f'A{_f(hw)},{_f(ry)} 0 0 0 {_f(x+w)},{_f(top+ry)} '
        f'L{_f(x+w)},{_f(bot-ry)} '
        f'A{_f(hw)},{_f(ry)} 0 0 1 {_f(x)},{_f(bot-ry)} Z"/>'
        f'<path class="bpmn-data" fill="none" d="M{_f(x)},{_f(top+ry)} '
        f'A{_f(hw)},{_f(ry)} 0 0 0 {_f(x+w)},{_f(top+ry)}"/>'
    )
    label = ""
    if c.name:
        lines = _wrap(c.name, max(90, w + 50), 11.5, 2)
        label = _centered_lines(lines, cx, cy + hh + 13, 11.5, "bpmn-label--out")
    return f'{body}{label}'


def _render_annotation(c: Component, cx: float, cy: float, hw: float, hh: float) -> str:
    x, y, h = cx - hw, cy - hh, 2 * hh
    tick = min(8.0, hw * 0.5)
    bracket = (
        f'<path class="bpmn-marker" stroke="#6b7280" d="M{_f(x+tick)},{_f(y)} '
        f'L{_f(x)},{_f(y)} L{_f(x)},{_f(y+h)} L{_f(x+tick)},{_f(y+h)}"/>'
    )
    lines = _wrap(c.name, 2 * hw - tick - 6, 12, 4)
    lh = 14.5
    parts = []
    for i, ln in enumerate(lines):
        parts.append(
            f'<text class="bpmn-anno-text" x="{_f(x+tick+5)}" '
            f'y="{_f(y + 12 + i*lh)}">{_esc(ln)}</text>'
        )
    return bracket + "".join(parts)

#!/usr/bin/env python3
"""Regenerate docs/brand/wordmark.svg with the wordmark + tagline OUTLINED to
vector paths — so the brand lockup renders identically in every browser, with no
font dependency (the same reason favicon.svg is outlined).

The kymo wordmark is SF Pro Rounded (Black 900 / Medium 500). A live <text> SVG
falls back to a non-rounded face off Apple platforms (Chrome ignores ui-rounded),
so we bake the glyphs to <path> here instead.

Requires (run on macOS, where the rounded system font lives):
    python3 -m venv .venv && .venv/bin/pip install fonttools uharfbuzz
    .venv/bin/python tools/outline_wordmark.py
Edit text/geometry/weights below, then re-run.
"""
import io
import os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import uharfbuzz as hb

SRC = "/System/Library/Fonts/SFNSRounded.ttf"  # macOS "SF …Rounded" variable font
BRAND = os.path.join(os.path.dirname(__file__), "..", "docs", "brand")

# layout (matches the github-hero geometry): baseline + size per run
WX, WY, WSZ = 316, 158, 92   # wordmark, Black 900
TX, TY, TSZ = 320, 216, 32   # tagline,  Medium 500
# two themes (kymo / studio / tagline fills) for the README <picture> light+dark
VARIANTS = [
    ("wordmark.svg",      "#242131", "#e0095f", "#6b6878"),  # light: navy primary
    ("wordmark-dark.svg", "#ffffff", "#e0095f", "#DDECEE"),  # dark:  white primary
]


def instanced(wght):
    f = TTFont(SRC)
    instancer.instantiateVariableFont(f, {"wght": wght, "GRAD": 400}, inplace=True)
    buf = io.BytesIO(); f.save(buf)
    return f, buf.getvalue()


def run_path(tt, raw, text, x, baseline, size):
    """HarfBuzz-shape `text`, outline each glyph; return (path_d, end_x)."""
    upm = tt["head"].unitsPerEm
    s = size / upm
    gset = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    hbf = hb.Font(hb.Face(raw))
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(hbf, buf)
    pen = SVGPathPen(gset)
    penx = x
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        tp = TransformPen(pen, (s, 0, 0, -s, penx + pos.x_offset * s, baseline - pos.y_offset * s))
        gset[order[info.codepoint]].draw(tp)
        penx += pos.x_advance * s
    return pen.getCommands(), penx


ttB, rawB = instanced(900)
ttM, rawM = instanced(500)
d_kymo, x_mid = run_path(ttB, rawB, "kymo", WX, WY, WSZ)
d_studio, x_end = run_path(ttB, rawB, "studio", x_mid, WY, WSZ)
d_tag, t_end = run_path(ttM, rawM, "Diagram superpowers", TX, TY, TSZ)

vb_x, vb_y, vb_h = 80, 44, 192
vb_w = round(max(x_end, t_end) + 22 - vb_x)

TILE = '''  <g transform="translate(96 50) scale(1.8)">
    <rect width="100" height="100" rx="18" fill="#e0095f"/>
    <g transform="translate(50 50) scale(0.98) translate(-50 -50)">
      <line x1="33" y1="26.5" x2="33" y2="73.5" stroke="#fff" stroke-width="11.5" stroke-linecap="round"/>
      <line x1="65.5" y1="27" x2="34" y2="58.5" stroke="#fff" stroke-width="11.5" stroke-linecap="round"/>
      <line x1="48" y1="49.5" x2="67" y2="73" stroke="#fff" stroke-width="11.5" stroke-linecap="round"/>
      <circle cx="33" cy="26.5" r="5.8" fill="#fff"/><circle cx="33" cy="26.5" r="2.44" fill="#e0095f"/>
      <circle cx="65.5" cy="27" r="5.8" fill="#fff"/><circle cx="65.5" cy="27" r="2.44" fill="#e0095f"/>
      <circle cx="33" cy="73.5" r="5.8" fill="#fff"/><circle cx="33" cy="73.5" r="2.44" fill="#e0095f"/>
      <circle cx="34" cy="58.5" r="5.8" fill="#fff"/><circle cx="34" cy="58.5" r="2.44" fill="#e0095f"/>
      <circle cx="48" cy="49.5" r="5.8" fill="#fff"/><circle cx="48" cy="49.5" r="2.44" fill="#e0095f"/>
      <circle cx="67" cy="73" r="5.8" fill="#fff"/><circle cx="67" cy="73" r="2.44" fill="#e0095f"/>
    </g>
  </g>'''

for name, kymo_fill, studio_fill, tag_fill in VARIANTS:
    svg = f'''<svg viewBox="{vb_x} {vb_y} {vb_w} {vb_h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="kymostudio — Diagram superpowers">
  <!-- Reusable horizontal brand lockup: tile + two-tone wordmark + tagline.
       Wordmark/tagline are OUTLINED paths (SF Pro Rounded, Black 900 / Medium 500) so
       the lockup renders identically in any browser / on GitHub — no font dependency.
       Regenerate (both light + dark) with tools/outline_wordmark.py. -->
{TILE}
  <path fill="{kymo_fill}" d="{d_kymo}"/>
  <path fill="{studio_fill}" d="{d_studio}"/>
  <path fill="{tag_fill}" d="{d_tag}"/>
</svg>
'''
    with open(os.path.join(BRAND, name), "w") as fh:
        fh.write(svg)
    print("wrote", name, "viewBox", vb_x, vb_y, vb_w, vb_h)

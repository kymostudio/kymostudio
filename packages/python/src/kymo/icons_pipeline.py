"""SVG normalize pipeline (P4 / CR-ICONS-005, FR-3/FR-6/FR-8).

`cleanup_svg → parse_colors(currentColor) → minify → validate`, plus
`to_record()` (→ sparse `{body, width, height}`) and `make_ids_safe()` for
`id`/`defs`-safe inlining (FR-7). Regex-based, stdlib-only — no SVGO/lxml
dependency (the JS mirror is `scripts/icons-pipeline.mjs`).

This is the machinery vectorization rides on; sourcing the vector originals
for the ~2,400 raster PNGs is the external prerequisite (RES-ICONS-001 §7.1),
so the catalogue migrates per set as originals land. `download --from iconify`
already runs `normalize()` on fetched art.
"""
from __future__ import annotations

import re

_DROP_BLOCKS = re.compile(
    r"<\?xml.*?\?>|<!DOCTYPE.*?>|<!--.*?-->|"
    r"<(script|style|metadata|title|desc)\b.*?</\1>",
    re.IGNORECASE | re.DOTALL,
)
_COLOR_ATTR = re.compile(r'\b(fill|stroke)\s*=\s*"(?!none|currentColor|url\()[^"]*"', re.IGNORECASE)
_WS = re.compile(r">\s+<")
_SVG_OPEN = re.compile(r"<svg\b[^>]*>", re.IGNORECASE | re.DOTALL)
_VIEWBOX = re.compile(r'viewBox\s*=\s*"([^"]+)"', re.IGNORECASE)
_WH = re.compile(r'\b(width|height)\s*=\s*"([0-9.]+)', re.IGNORECASE)


def cleanup_svg(text: str) -> str:
    """Strip XML decl / doctype / comments / scripts / styles / editor cruft."""
    return _DROP_BLOCKS.sub("", text).strip()


def parse_colors(text: str) -> str:
    """Recolour concrete fill/stroke to `currentColor` (themeable, FR-6).
    Leaves `none`, existing `currentColor`, and `url(...)` refs untouched."""
    return _COLOR_ATTR.sub(lambda m: f'{m.group(1)}="currentColor"', text)


def minify(text: str) -> str:
    """Collapse inter-tag whitespace."""
    return _WS.sub("><", text).strip()


def normalize(text: str) -> str:
    """Full pipeline returning a cleaned, recoloured SVG document."""
    return minify(parse_colors(cleanup_svg(text)))


def _dims(open_tag: str) -> tuple[int, int]:
    vb = _VIEWBOX.search(open_tag)
    if vb:
        parts = vb.group(1).replace(",", " ").split()
        if len(parts) == 4:
            return round(float(parts[2])), round(float(parts[3]))
    wh = dict((m.group(1).lower(), float(m.group(2))) for m in _WH.finditer(open_tag))
    return round(wh.get("width", 24)), round(wh.get("height", 24))


def to_record(text: str) -> dict:
    """Normalize, then return the sparse IconifyJSON record `{body, width,
    height}` — the inner body only, no `<svg>` wrapper (FR-3)."""
    doc = normalize(text)
    m = _SVG_OPEN.search(doc)
    if m:
        body = doc[m.end():]
        body = re.sub(r"</svg>\s*$", "", body, flags=re.IGNORECASE).strip()
        width, height = _dims(m.group(0))
    else:                              # already a bare body
        body, (width, height) = doc, (24, 24)
    return {"body": body, "width": width, "height": height}


_ID_DEF = re.compile(r'\bid\s*=\s*"([^"]+)"')


def make_ids_safe(body: str, suffix: str) -> str:
    """Suffix every element `id` (and its `url(#id)` / `href="#id"` refs) so
    the same icon inlined N times in one document never collides (FR-7)."""
    ids = set(_ID_DEF.findall(body))
    for old in ids:
        new = f"{old}-{suffix}"
        body = re.sub(rf'(\bid\s*=\s*")({re.escape(old)})(")', rf"\g<1>{new}\g<3>", body)
        body = body.replace(f"url(#{old})", f"url(#{new})")
        body = re.sub(rf'((?:xlink:)?href\s*=\s*")#{re.escape(old)}(")', rf"\g<1>#{new}\g<2>", body)
    return body

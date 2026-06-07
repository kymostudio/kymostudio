#!/usr/bin/env python3
"""Accuracy dataset — vendored web-platform-tests SVGs + Chrome ground truth.

The fidelity bench (`quality.py`) scores engines against *kymo's own* PDF, so it
answers "who reproduces kymo", not "who is correct". This module backs the
**accuracy** bench (`accuracy.py`): a vendored, self-contained subset of the
[web-platform-tests](https://github.com/web-platform-tests/wpt) `svg/` suite — the
cross-browser conformance corpus — each paired with a **headless-Chrome reference
PNG** (`refs/`). Chrome is an independent ground truth (the de-facto SVG
renderer), so *every* engine, kymo included, is measured against it.

Scope: self-contained SVGs only — anything pulling external resources (`<image>`,
`href` to another file, `@import`, web fonts, `<script>`) or under the
font/animation/interaction-dependent dirs (`text/`, `fonts/`, `animations/`,
`scripted/`, …) is excluded, exactly as the svg2png bench drops `text`/`image`:
those confound a *converter*'s accuracy and can't resolve through the string-based
engine API. Oversized canvases (> 1000 px either dim) are dropped too, to keep the
committed reference PNGs small. See `datasets/wpt-svg/PROVENANCE.md`.

`normalize_svg` pins every SVG to its viewBox pixel size (many suite SVGs ship
`viewBox`-only), so Chrome and all engines rasterize the *same* canvas and
differences are the renderer's, not intrinsic-size guesswork.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATASET_DIR = HERE / "datasets" / "wpt-svg"
TESTS_DIR = DATASET_DIR / "tests"
REFS_DIR = DATASET_DIR / "refs"

_SVG_TAG = re.compile(r"<svg\b[^>]*>", re.IGNORECASE | re.DOTALL)
_VIEWBOX = re.compile(
    r'viewBox\s*=\s*["\']\s*([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)\s*["\']',
    re.IGNORECASE,
)
_WH_ATTR = re.compile(r'\s(?:width|height)\s*=\s*["\'][^"\']*["\']', re.IGNORECASE)


def normalize_svg(svg: str, default: int = 200) -> tuple[str, int, int]:
    """Force the root <svg> to its viewBox pixel size → (svg, width, height).

    The suite's SVGs often carry a `viewBox` but no `width`/`height`, so every
    renderer would otherwise apply its own intrinsic-size default. We strip any
    existing width/height and inject the viewBox extent, so the canvas is
    identical for Chrome and every engine.
    """
    m = _SVG_TAG.search(svg)
    if not m:
        return svg, default, default
    tag = m.group(0)
    vb = _VIEWBOX.search(tag)
    if vb:
        w = max(1, round(float(vb.group(3))))
        h = max(1, round(float(vb.group(4))))
    else:
        w = h = default
    new_tag = _WH_ATTR.sub("", tag)
    new_tag = new_tag[:-1].rstrip() + f' width="{w}" height="{h}">'
    return svg[: m.start()] + new_tag + svg[m.end():], w, h


@dataclass
class Sample:
    name: str          # "<category>/<file>" stable id
    category: str
    svg_path: Path
    ref_path: Path     # the Chrome reference PNG (may not exist until gen_refs)
    svg: str           # normalized SVG string (identical input for every engine)
    svg_bytes: bytes
    width: int
    height: int


def _iter_svgs():
    for cat_dir in sorted(p for p in TESTS_DIR.iterdir() if p.is_dir()):
        for svg_path in sorted(cat_dir.glob("*.svg")):
            yield cat_dir.name, svg_path


def categories() -> list[str]:
    return sorted({cat for cat, _ in _iter_svgs()})


def load(require_refs: bool = True) -> list[Sample]:
    """Load every dataset SVG (normalized). With require_refs, only samples whose
    Chrome reference PNG exists are returned (the accuracy bench needs them)."""
    out: list[Sample] = []
    for cat, svg_path in _iter_svgs():
        raw = svg_path.read_text(encoding="utf-8", errors="replace")
        svg, w, h = normalize_svg(raw)
        ref = REFS_DIR / cat / (svg_path.stem + ".png")
        if require_refs and not ref.exists():
            continue
        out.append(Sample(
            name=f"{cat}/{svg_path.stem}",
            category=cat,
            svg_path=svg_path,
            ref_path=ref,
            svg=svg,
            svg_bytes=svg.encode("utf-8"),
            width=w,
            height=h,
        ))
    return out

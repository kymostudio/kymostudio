#!/usr/bin/env python3
"""The bench corpus — real kymo SVGs, generated from `.kymo` sources.

Identical in spirit to `svg2png/corpus.py`: the fairest input for *"which engine
reproduces kymo's PDF output"* is the SVG kymo actually emits, so the corpus is
produced by running the public kymo pipeline (parse → layout → resolve_alignments
→ render) over committed `.kymo` sources — never a hand-rolled SVG. It spans the
two ends of kymo's output:

  • ``samples/*.kymo``            — large, icon-rich architecture diagrams
  • ``conformance/corpus/*.kymo`` — small, geometry-focused graphs

Every engine in the bench converts the *identical* SVG string for a given item,
so timing and fidelity differences are the engine's, not the input's.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from kymo import layout, parse, render, resolve_alignments

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

# Curated source set: every architecture sample + the full conformance corpus.
# Sorted, so the corpus order is deterministic across runs and hosts.
SAMPLE_DIR = ROOT / "samples"
CONFORMANCE_DIR = ROOT / "conformance" / "corpus"

_SVG_TAG = re.compile(r"<svg\b[^>]*>", re.IGNORECASE | re.DOTALL)
_WIDTH = re.compile(r'\bwidth\s*=\s*["\']\s*([\d.]+)', re.IGNORECASE)
_HEIGHT = re.compile(r'\bheight\s*=\s*["\']\s*([\d.]+)', re.IGNORECASE)


@dataclass
class Item:
    name: str       # stable id, e.g. "samples/aiq" or "conformance/bipartite"
    svg: str        # the rendered SVG string (identical input for every engine)
    svg_bytes: bytes  # UTF-8 pre-encoding (so no adapter re-encodes per rep)
    width: float    # intrinsic SVG width in px (== PDF points at 72 dpi)
    height: float   # intrinsic SVG height in px


def _intrinsic_size(svg: str) -> tuple[float, float]:
    """Parse the root <svg> width/height (px). 0.0 when absent/non-numeric."""
    m = _SVG_TAG.search(svg)
    tag = m.group(0) if m else svg[:512]
    w = _WIDTH.search(tag)
    h = _HEIGHT.search(tag)
    return (float(w.group(1)) if w else 0.0, float(h.group(1)) if h else 0.0)


def _render_kymo(src: Path) -> str:
    """Mirror the kymo `.kymo` → SVG back-end (the `kymo file.kymo` flow)."""
    diagram, layout_spec, external = parse(src.read_text(encoding="utf-8"))
    if layout_spec:
        layout(diagram, layout_spec, external)
    resolve_alignments(diagram)
    return render(diagram)


def _sources() -> list[tuple[str, Path]]:
    out: list[tuple[str, Path]] = []
    for p in sorted(SAMPLE_DIR.glob("*.kymo")):
        out.append((f"samples/{p.stem}", p))
    for p in sorted(CONFORMANCE_DIR.glob("*.kymo")):
        out.append((f"conformance/{p.stem}", p))
    return out


def build() -> list[Item]:
    """Render every source to SVG once; skip any that fail to render (rare)."""
    items: list[Item] = []
    for name, path in _sources():
        try:
            svg = _render_kymo(path)
        except Exception as exc:  # a broken source shouldn't sink the whole bench
            print(f"  ! skip {name}: render failed ({type(exc).__name__}: {exc})")
            continue
        w, h = _intrinsic_size(svg)
        items.append(Item(name=name, svg=svg, svg_bytes=svg.encode("utf-8"), width=w, height=h))
    if not items:
        raise SystemExit("corpus is empty — no .kymo source rendered")
    return items

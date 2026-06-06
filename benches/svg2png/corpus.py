#!/usr/bin/env python3
"""The bench corpus — real kymo SVGs, generated from `.kymo` sources.

The fairest input for *"which rasterizer reproduces kymo's PNG output"* is the
SVG kymo actually emits, so the corpus is produced by running the public kymo
pipeline (parse → layout → resolve_alignments → render) over committed `.kymo`
sources — never a hand-rolled SVG. It spans the two ends of kymo's output:

  • ``samples/*.kymo``            — large, icon-rich architecture diagrams
  • ``conformance/corpus/*.kymo`` — small, geometry-focused graphs

Every engine in the bench rasterizes the *identical* SVG string for a given
item, so timing and fidelity differences are the engine's, not the input's.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from kymo import layout, parse, render, resolve_alignments

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

# Curated source set: every architecture sample + the full conformance corpus.
# Sorted, so the corpus order is deterministic across runs and hosts.
SAMPLE_DIR = ROOT / "samples"
CONFORMANCE_DIR = ROOT / "conformance" / "corpus"


@dataclass
class Item:
    name: str       # stable id, e.g. "samples/aiq" or "conformance/bipartite"
    svg: str        # the rendered SVG string (identical input for every engine)
    svg_bytes: bytes  # UTF-8 pre-encoding (so no adapter re-encodes per rep)


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
        items.append(Item(name=name, svg=svg, svg_bytes=svg.encode("utf-8")))
    if not items:
        raise SystemExit("corpus is empty — no .kymo source rendered")
    return items

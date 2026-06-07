#!/usr/bin/env python3
"""SVG → PDF engine registry — the contenders this bench puts side by side.

Each engine is a thin adapter that takes one SVG (as ``str`` and pre-encoded
``bytes``) and returns **PDF** ``bytes`` — or raises. They all wrap a *different*
SVG→PDF converter so the bench can answer one question honestly: **for the SVGs
kymo itself emits, which converters reproduce them as a faithful vector PDF, and
how fast?**

The reference is ``kymo`` — the `kymo … out.pdf` back-end, which is `svg2pdf`
(the usvg-lineage vector converter by typst) running inside `kymostudio-core`.
The field of comparison engines, widest reasonable set of well-known FOSS
SVG→PDF tools reachable from Python:

  • ``rsvg-convert`` — librsvg (GNOME), via its CLI. A separate, high-fidelity
                       vector engine — the closest thing to an independent
                       reference (it, like kymo, embeds the diagram icons).
  • ``cairosvg``     — Cairo's `svg2pdf`. Pure-Python + Cairo; widely used.
  • ``svglib``       — svglib + reportlab's `renderPDF` (ReportLab graphics).
  • ``fpdf2``        — fpdf2's `fpdf.svg` (pure-Python, zero native deps).

Unlike the svg2png bench there is **no same-engine control**: `resvg-py` has no
PDF path (resvg rasterizes; only `svg2pdf` in the core emits PDF), so the kymo
row stands alone as the reference. That is an honest limitation, called out in
the report.

The kymo engine needs ``kymostudio-core >= 0.4`` (the release that added
``svg_to_pdf``); on an older core `kymo.to_pdf` raises ``ModuleNotFoundError``
and the engine reports as missing like any absent package. Likewise
``rsvg-convert`` is skipped when the binary is not on ``PATH``.

Engines whose package/binary is unavailable are skipped — the bench degrades
gracefully rather than crashing.
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
import warnings
from dataclasses import dataclass
from importlib.metadata import PackageNotFoundError, version
from typing import Callable

# The engine that authored the SVGs — its PDF is the fidelity reference.
REFERENCE_KEY = "kymo"

# Every engine the bench knows about (for reporting which were skipped).
ALL_KEYS = {"kymo", "rsvg-convert", "cairosvg", "svglib", "fpdf2"}


def _pkg_version(dist: str) -> str:
    try:
        return version(dist)
    except PackageNotFoundError:
        return "?"


@dataclass
class Engine:
    key: str           # short stable id used in JSON / tables
    label: str         # human label
    backend: str       # the underlying converter + version
    render: Callable[[str, bytes], bytes]  # (svg_str, svg_bytes) -> pdf bytes


# --- adapters -------------------------------------------------------------
# Each builder imports its package lazily and returns an Engine, or None if the
# package/binary is missing. The render callable takes BOTH the str and the
# pre-encoded bytes so every engine gets the exact same SVG and no adapter
# re-encodes per rep.


def _kymo() -> Engine | None:
    # `to_pdf` raises ModuleNotFoundError when the installed core predates 0.4
    # (no `svg_to_pdf`) — treat that exactly like a missing package.
    try:
        from kymo.to_pdf import render_pdf
    except ModuleNotFoundError:
        return None
    backend = f"svg2pdf (kymostudio-core {_pkg_version('kymostudio-core')})"

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        return render_pdf(svg_str)

    return Engine(REFERENCE_KEY, "kymo", backend, render)


def _rsvg() -> Engine | None:
    exe = shutil.which("rsvg-convert")
    if not exe:
        return None
    # Best-effort version string from `rsvg-convert --version`.
    try:
        out = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=10)
        backend = out.stdout.strip().splitlines()[0] if out.stdout else "librsvg (rsvg-convert)"
    except Exception:
        backend = "librsvg (rsvg-convert)"

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        r = subprocess.run([exe, "-f", "pdf"], input=svg_bytes, capture_output=True)
        if r.returncode != 0:
            msg = (r.stderr.decode("utf-8", "replace") or "rsvg-convert failed").strip()
            raise RuntimeError(msg[:200])
        if not r.stdout.startswith(b"%PDF"):
            raise RuntimeError("rsvg-convert produced no PDF")
        return r.stdout

    return Engine("rsvg-convert", "rsvg-convert", backend, render)


def _cairosvg() -> Engine | None:
    try:
        import cairosvg
    except (ModuleNotFoundError, OSError):
        return None

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        return cairosvg.svg2pdf(bytestring=svg_bytes)

    return Engine("cairosvg", "cairosvg", f"Cairo ({_pkg_version('cairosvg')})", render)


def _svglib() -> Engine | None:
    try:
        from reportlab.graphics import renderPDF
        from svglib.svglib import svg2rlg
    except ModuleNotFoundError:
        return None
    # svglib logs per unsupported `url(#…)` fill (warning) and per ambiguous
    # length (error) on its way to a result — non-fatal noise. Silence below
    # CRITICAL; real failures still raise and are recorded as data.
    logging.getLogger("svglib.svglib").setLevel(logging.CRITICAL)
    backend = f"reportlab renderPDF ({_pkg_version('reportlab')}, svglib {_pkg_version('svglib')})"

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        # svg2rlg wants a path/file; lxml rejects a unicode str that carries an
        # encoding declaration, so hand it bytes via a temp file.
        fd, path = tempfile.mkstemp(suffix=".svg")
        try:
            with os.fdopen(fd, "wb") as fh:
                fh.write(svg_bytes)
            drawing = svg2rlg(path)
            if drawing is None:
                raise ValueError("svg2rlg returned no drawing (unparsable SVG)")
            return renderPDF.drawToString(drawing)
        finally:
            os.unlink(path)

    return Engine("svglib", "svglib", backend, render)


def _fpdf2() -> Engine | None:
    try:
        from fpdf import FPDF
        from fpdf.svg import SVGObject
    except ModuleNotFoundError:
        return None
    # fpdf2 warns (stderr/logging) per unsupported tag (<marker>, <filter>,
    # <pattern>, …). Silence the noise; genuine failures still raise.
    logging.getLogger("fpdf").setLevel(logging.CRITICAL)
    backend = f"fpdf2 ({_pkg_version('fpdf2')})"

    def _num(v, default: float) -> float:
        try:
            return float(v) or default
        except (TypeError, ValueError):
            return default

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            obj = SVGObject(svg_str)
            pdf = FPDF(unit="pt", format=(_num(obj.width, 800.0), _num(obj.height, 600.0)))
            pdf.add_page()
            obj.draw_to_page(pdf)
            return bytes(pdf.output())

    return Engine("fpdf2", "fpdf2", backend, render)


# Display order: reference first, then the independent high-fidelity engine,
# then the pure-Python field.
_BUILDERS = (_kymo, _rsvg, _cairosvg, _svglib, _fpdf2)


def available_engines() -> list[Engine]:
    """All engines whose backing package/binary is present, in display order."""
    return [e for e in (build() for build in _BUILDERS) if e is not None]


def missing_engines() -> list[str]:
    """Keys of engines whose package/binary is unavailable (reported skipped)."""
    present = {e.key for e in available_engines()}
    return sorted(ALL_KEYS - present)

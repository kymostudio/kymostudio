#!/usr/bin/env python3
"""SVG → PNG engine registry — the contenders this bench puts side by side.

Each engine is a thin adapter that takes one SVG (as ``str`` and pre-encoded
``bytes``) and returns PNG ``bytes`` — or raises. They all wrap a *different*
rasterizer so the bench can answer one question honestly: **for the SVGs kymo
itself emits, which rasterizers reproduce them, and how fast?**

The reference is ``kymo`` (the resvg core that backs the `kymo … out.png` CLI).
The others:

  • ``resvg-py``  — the standalone resvg binding. Same engine as kymo, different
                    build/wrapper; expected to be pixel-identical — it is the
                    control that validates the fidelity method.
  • ``pyvips``    — libvips' SVG loader (librsvg under the hood). A separate,
                    high-fidelity engine.
  • ``cairosvg``  — pure-Python + Cairo.
  • ``svglib``    — svglib + reportlab's renderPM (ReportLab graphics backend).

Engines whose package is not importable are reported as ``available=False`` and
skipped — the bench degrades gracefully rather than crashing.
"""
from __future__ import annotations

import io
import os
import tempfile
from dataclasses import dataclass
from importlib.metadata import PackageNotFoundError, version
from typing import Callable

# The engine that authored the SVGs — its output is the fidelity reference.
REFERENCE_KEY = "kymo"


def _pkg_version(dist: str) -> str:
    try:
        return version(dist)
    except PackageNotFoundError:
        return "?"


@dataclass
class Engine:
    key: str           # short stable id used in JSON / tables
    label: str         # human label
    backend: str       # the underlying rasterizer + version
    render: Callable[[str, bytes], bytes]  # (svg_str, svg_bytes) -> png bytes


# --- adapters -------------------------------------------------------------
# Each builder imports its package lazily and returns an Engine, or None if the
# package is missing. The render callable takes BOTH the str and the pre-encoded
# bytes so every engine gets the exact same SVG and no adapter re-encodes.


def _kymo() -> Engine | None:
    try:
        from kymo.to_png import render_png
    except ModuleNotFoundError:
        return None
    backend = f"resvg (kymostudio-core {_pkg_version('kymostudio-core')})"

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        return render_png(svg_str, 1.0)

    return Engine(REFERENCE_KEY, "kymo", backend, render)


def _resvg_py() -> Engine | None:
    try:
        import resvg_py
    except ModuleNotFoundError:
        return None

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        return bytes(resvg_py.svg_to_bytes(svg_string=svg_str))

    return Engine("resvg-py", "resvg-py", f"resvg ({_pkg_version('resvg-py')})", render)


def _pyvips() -> Engine | None:
    try:
        import pyvips
    except (ModuleNotFoundError, OSError):
        # OSError: the libvips shared lib is absent even though the binding imports.
        return None
    libvips = ".".join(str(pyvips.version(i)) for i in range(3))

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        img = pyvips.Image.svgload_buffer(svg_bytes)
        return img.write_to_buffer(".png")

    return Engine("pyvips", "pyvips", f"librsvg (via libvips {libvips})", render)


def _cairosvg() -> Engine | None:
    try:
        import cairosvg
    except (ModuleNotFoundError, OSError):
        return None

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        return cairosvg.svg2png(bytestring=svg_bytes)

    return Engine("cairosvg", "cairosvg", f"Cairo ({_pkg_version('cairosvg')})", render)


def _svglib() -> Engine | None:
    try:
        import logging

        from reportlab.graphics import renderPM
        from svglib.svglib import svg2rlg
    except ModuleNotFoundError:
        return None
    # svglib logs per unsupported `url(#…)` fill (warning) and per ambiguous
    # length (error) on its way to a result — non-fatal noise. Silence below
    # CRITICAL; real failures still raise and are recorded as data.
    logging.getLogger("svglib.svglib").setLevel(logging.CRITICAL)
    backend = f"reportlab renderPM ({_pkg_version('reportlab')}, svglib {_pkg_version('svglib')})"

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
            return renderPM.drawToString(drawing, fmt="PNG")
        finally:
            os.unlink(path)

    return Engine("svglib", "svglib", backend, render)


_BUILDERS = (_kymo, _resvg_py, _pyvips, _cairosvg, _svglib)


def available_engines() -> list[Engine]:
    """All engines whose backing package imports, in a stable display order."""
    return [e for e in (build() for build in _BUILDERS) if e is not None]


def missing_engines() -> list[str]:
    """Keys of engines whose package is not importable (reported as skipped)."""
    keys = {"kymo", "resvg-py", "pyvips", "cairosvg", "svglib"}
    present = {e.key for e in available_engines()}
    return sorted(keys - present)

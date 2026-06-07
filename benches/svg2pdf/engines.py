#!/usr/bin/env python3
"""SVG → PDF engine registry — the contenders this bench puts side by side.

Each engine is a thin adapter that takes one SVG (as ``str`` and pre-encoded
``bytes``) and returns **PDF** ``bytes`` — or raises. They all wrap a *different*
SVG→PDF converter so the bench can answer one question honestly: **for the SVGs
kymo itself emits, which converters reproduce them as a faithful vector PDF, and
how fast?**

The reference is ``kymo`` — the `kymo … out.pdf` back-end, which is `svg2pdf`
(the usvg-lineage vector converter by typst) running inside `kymostudio-core`.
The field is the widest reasonable set of well-known FOSS SVG→PDF tools reachable
from Python — converters *and* famous general-purpose software that can print SVG:

  • ``chrome``       — headless Google Chrome `--print-to-pdf` (the de-facto SVG
                       renderer). SVG inlined in a sized HTML page.
  • ``rsvg-convert`` — librsvg (GNOME), via its CLI.
  • ``inkscape``     — the Inkscape vector editor, headless export.
  • ``libreoffice``  — LibreOffice headless `--convert-to pdf`.
  • ``vl-convert``   — vl-convert (`vl_convert.svg_to_pdf`); built on the *same*
                       `svg2pdf` as kymo, so it doubles as a same-engine control.
  • ``cairosvg``     — Cairo's `svg2pdf`.
  • ``svglib``       — svglib + reportlab's `renderPDF`.
  • ``fpdf2``        — fpdf2's `fpdf.svg` (pure-Python, zero native deps).

The kymo engine needs ``kymostudio-core >= 0.4`` (the release that added
``svg_to_pdf``). The CLI engines (`chrome`, `rsvg-convert`, `inkscape`,
`libreoffice`) are skipped when their binary is not on ``PATH``; the Python ones
when their package is not importable. The bench degrades gracefully rather than
crashing.
"""
from __future__ import annotations

import logging
import os
import re
import shutil
import subprocess
import tempfile
import warnings
from dataclasses import dataclass
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path
from typing import Callable

# The engine that authored the SVGs — its PDF is the fidelity reference.
REFERENCE_KEY = "kymo"

# Every engine the bench knows about (for reporting which were skipped).
ALL_KEYS = {
    "kymo", "chrome", "rsvg-convert", "inkscape", "libreoffice",
    "vl-convert", "cairosvg", "svglib", "fpdf2",
}

_CHROME_CANDIDATES = ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser")
_WH = re.compile(r'width\s*=\s*["\']\s*([\d.]+).*?height\s*=\s*["\']\s*([\d.]+)', re.IGNORECASE | re.DOTALL)


def _pkg_version(dist: str) -> str:
    try:
        return version(dist)
    except PackageNotFoundError:
        return "?"


def _svg_size(svg: str, default: tuple[float, float] = (800.0, 600.0)) -> tuple[float, float]:
    """Intrinsic px size from the root <svg> width/height, else `default`."""
    m = _WH.search(svg[:600])
    if not m:
        return default
    try:
        return float(m.group(1)), float(m.group(2))
    except ValueError:
        return default


@dataclass
class Engine:
    key: str           # short stable id used in JSON / tables
    label: str         # human label
    backend: str       # the underlying converter + version
    render: Callable[[str, bytes], bytes]  # (svg_str, svg_bytes) -> pdf bytes


# --- adapters -------------------------------------------------------------
# Each builder imports its package / locates its binary lazily and returns an
# Engine, or None if unavailable. The render callable takes BOTH the str and the
# pre-encoded bytes so every engine gets the exact same SVG and no adapter
# re-encodes per rep.


def _kymo() -> Engine | None:
    try:
        from kymo.to_pdf import render_pdf
    except ModuleNotFoundError:
        return None
    backend = f"svg2pdf (kymostudio-core {_pkg_version('kymostudio-core')})"

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        return render_pdf(svg_str)

    return Engine(REFERENCE_KEY, "kymo", backend, render)


# Minimal white HTML page sized to the SVG. `svg{display:block}` + `line-height:0`
# kill the inline-element descender gap that otherwise overflows onto a 2nd page.
_CHROME_HTML = (
    "<!DOCTYPE html><html><head><meta charset='utf-8'><style>"
    "@page{{size:{w}px {h}px;margin:0}}*{{margin:0;padding:0;border:0}}"
    "html,body{{background:#fff;line-height:0}}svg{{display:block}}"
    "</style></head><body>{svg}</body></html>"
)


def _chrome() -> Engine | None:
    exe = next((shutil.which(c) for c in _CHROME_CANDIDATES if shutil.which(c)), None)
    if not exe:
        return None
    try:
        out = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=10)
        backend = out.stdout.strip() or "Chrome (headless print-to-pdf)"
    except Exception:
        backend = "Chrome (headless print-to-pdf)"

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        w, h = _svg_size(svg_str)
        html = _CHROME_HTML.format(w=f"{w:g}", h=f"{h:g}", svg=svg_str)
        with tempfile.TemporaryDirectory() as td:
            hp = Path(td) / "page.html"
            op = Path(td) / "out.pdf"
            hp.write_text(html, encoding="utf-8")
            r = subprocess.run(
                [exe, "--headless=new", "--disable-gpu", "--no-sandbox",
                 "--no-pdf-header-footer", f"--user-data-dir={Path(td) / 'ud'}",
                 "--virtual-time-budget=3000", f"--print-to-pdf={op}", str(hp)],
                capture_output=True, timeout=120,
            )
            if not op.exists() or op.stat().st_size == 0:
                raise RuntimeError((r.stderr.decode("utf-8", "replace") or "chrome produced no PDF").strip()[:200])
            return op.read_bytes()

    return Engine("chrome", "chrome", backend, render)


def _rsvg() -> Engine | None:
    exe = shutil.which("rsvg-convert")
    if not exe:
        return None
    try:
        out = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=10)
        backend = out.stdout.strip().splitlines()[0] if out.stdout else "librsvg (rsvg-convert)"
    except Exception:
        backend = "librsvg (rsvg-convert)"

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        r = subprocess.run([exe, "-f", "pdf"], input=svg_bytes, capture_output=True)
        if r.returncode != 0:
            raise RuntimeError((r.stderr.decode("utf-8", "replace") or "rsvg-convert failed").strip()[:200])
        if not r.stdout.startswith(b"%PDF"):
            raise RuntimeError("rsvg-convert produced no PDF")
        return r.stdout

    return Engine("rsvg-convert", "rsvg-convert", backend, render)


def _inkscape() -> Engine | None:
    exe = shutil.which("inkscape")
    if not exe:
        return None
    try:
        out = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=30)
        backend = (out.stdout.strip().splitlines()[0] if out.stdout else "Inkscape")
    except Exception:
        backend = "Inkscape"

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        with tempfile.TemporaryDirectory() as td:
            ip = Path(td) / "in.svg"
            op = Path(td) / "out.pdf"
            ip.write_bytes(svg_bytes)
            r = subprocess.run(
                [exe, str(ip), "--export-type=pdf", f"--export-filename={op}"],
                capture_output=True, timeout=120, env={**os.environ, "HOME": td},
            )
            if not op.exists() or op.stat().st_size == 0:
                raise RuntimeError((r.stderr.decode("utf-8", "replace") or "inkscape produced no PDF").strip()[:200])
            return op.read_bytes()

    return Engine("inkscape", "inkscape", backend, render)


def _libreoffice() -> Engine | None:
    exe = shutil.which("soffice") or shutil.which("libreoffice")
    if not exe:
        return None
    try:
        out = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=60)
        backend = out.stdout.strip().splitlines()[0] if out.stdout else "LibreOffice"
    except Exception:
        backend = "LibreOffice"

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        with tempfile.TemporaryDirectory() as td:
            ip = Path(td) / "doc.svg"
            op = Path(td) / "doc.pdf"
            ip.write_bytes(svg_bytes)
            r = subprocess.run(
                [exe, "--headless", "--convert-to", "pdf", "--outdir", td, str(ip),
                 f"-env:UserInstallation=file://{Path(td) / 'profile'}"],
                capture_output=True, timeout=180,
            )
            if not op.exists() or op.stat().st_size == 0:
                raise RuntimeError((r.stderr.decode("utf-8", "replace") or "soffice produced no PDF").strip()[:200])
            return op.read_bytes()

    return Engine("libreoffice", "libreoffice", backend, render)


def _vlconvert() -> Engine | None:
    try:
        import vl_convert as vlc
    except ModuleNotFoundError:
        return None
    backend = f"svg2pdf (vl-convert {_pkg_version('vl-convert-python')})"

    def render(svg_str: str, svg_bytes: bytes) -> bytes:
        return vlc.svg_to_pdf(svg_str)

    return Engine("vl-convert", "vl-convert", backend, render)


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


# Display order: reference first, then the famous renderers / independent vector
# engines, then the same-engine control and the pure-Python field.
_BUILDERS = (
    _kymo, _chrome, _rsvg, _inkscape, _libreoffice,
    _vlconvert, _cairosvg, _svglib, _fpdf2,
)


def available_engines() -> list[Engine]:
    """All engines whose backing package/binary is present, in display order."""
    return [e for e in (build() for build in _BUILDERS) if e is not None]


def missing_engines() -> list[str]:
    """Keys of engines whose package/binary is unavailable (reported skipped)."""
    present = {e.key for e in available_engines()}
    return sorted(ALL_KEYS - present)

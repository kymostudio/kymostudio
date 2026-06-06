"""SVG → PDF conversion (the `kymo … out.pdf` back-end).

Vector PDF via the in-repo Rust core (`packages/rust/kymostudio-core`,
importable as `_kymostudio_core`). Unlike `to_png.py` there is **no `resvg_py`
fallback** — resvg-py has no PDF path — so PDF output requires the native core
(`kymostudio-core>=0.4`). The CLI catches the missing import and prints how to
install it; importing this module without the core raises `ModuleNotFoundError`.
"""
from __future__ import annotations

import _kymostudio_core as _kcore

# `svg_to_pdf` landed in kymostudio-core 0.4. On an older 0.3.x engine the module
# imports fine but the symbol is missing — surface that as a ModuleNotFoundError
# so the CLI prints the same "needs kymostudio-core" hint it uses for PNG.
if not hasattr(_kcore, "svg_to_pdf"):
    raise ModuleNotFoundError(
        "kymostudio-core >= 0.4 is required for PDF output (svg_to_pdf missing)"
    )


def render_pdf(svg_str: str) -> bytes:
    """Convert an SVG string to vector PDF bytes (one page, intrinsic size)."""
    return _kcore.svg_to_pdf(svg_str.encode("utf-8"))

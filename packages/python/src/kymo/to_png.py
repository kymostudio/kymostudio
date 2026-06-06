"""SVG → PNG rasterization (the `kymo … out.png` back-end).

Dependency-light sibling of `to_webp.py`: it needs only the resvg binding (no
Pillow), so plain PNG output works with just the rasterizer installed.

Rasterizer backend. Prefer the in-repo Rust core (packages/rust/kymostudio-core,
importable as `_kymostudio_core` once its wheel is installed); fall back to the
external `resvg-py`. Both wrap the same resvg engine, so output is equivalent —
and matches the Rust `kymo` CLI and the JS/wasm build (all one resvg core).
"""
from __future__ import annotations

try:
    import _kymostudio_core as _kcore

    def _svg_to_png(svg_str: str, scale: float = 1.0) -> bytes:
        return _kcore.svg_to_png(svg_str.encode("utf-8"), scale)
except ModuleNotFoundError:
    import resvg_py

    def _svg_to_png(svg_str: str, scale: float = 1.0) -> bytes:
        # resvg-py's `zoom` is integer-only; the native core handles fractional
        # scale. Pass zoom only when scaling, and require a whole-number factor.
        if scale == 1.0:
            return bytes(resvg_py.svg_to_bytes(svg_string=svg_str))
        if scale != int(scale):
            raise ValueError(
                "fractional --scale needs the native kymostudio-core backend; "
                "the resvg-py fallback supports integer scale only"
            )
        return bytes(resvg_py.svg_to_bytes(svg_string=svg_str, zoom=int(scale)))


def render_png(svg_str: str, scale: float = 1.0) -> bytes:
    """Rasterize an SVG string to PNG bytes via resvg (scale 1.0 = intrinsic)."""
    return _svg_to_png(svg_str, scale)

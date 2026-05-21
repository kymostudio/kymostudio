# /// script
# requires-python = ">=3.13"
# dependencies = [
#   "resvg-py",
#   "pillow",
# ]
# ///
"""Convert an animated SVG (`stroke-dashoffset` keyframe animation) to an
animated WebP — purely in Python, no headless browser.

Strategy: rather than rasterise the animated SVG in a browser, parse the
animation parameters out of the CSS, then for each output frame:

    1. Compute the current `stroke-dashoffset` for each animated class
    2. Synthesise a STATIC SVG with the offset hard-coded (animation: none)
    3. Render that static SVG to PNG via resvg (Rust binding via PyO3)
    4. Append the PNG to a Pillow frame list

Pillow saves all frames as an animated WebP. Output works in any modern
image viewer that supports WebP animation (browsers, macOS Preview,
modern Markdown previews, Figma, …).

Renderer note: cairosvg has poor CSS-class support and outputs blank
images for our SVGs; resvg (the same engine inside Figma's renderer)
handles inline `<style>` rules correctly.

Usage:
    uv run to_webp.py <input.svg> [output.webp] [--frames N] [--width W]
                      [--quality Q]

Defaults: 30 frames over the 1.2-s flow cycle (≈ 25 fps), width matches
the SVG's viewBox, quality 85.
"""
from __future__ import annotations

import math
import re
import sys
from io import BytesIO
from pathlib import Path

import resvg_py
from PIL import Image

# Match the constants in to_svg.py ANIM_PRESETS["flow"].
DASH_LEN           = 16          # @keyframes edge-flow { from: 16 → to: 0 }
GRAY_PERIOD_MS     = 1200        # .edge-path animation-duration
ORANGE_PERIOD_MS   = 800         # .edge-path--orange animation-duration
BREATH_PERIOD_MS   = 2400        # .icon-shadow animation-duration
BREATH_MIN_OPACITY = 0.92        # 50% keyframe of component-breath


def offset_at(t_ms: float, period_ms: float) -> float:
    """Current stroke-dashoffset at time t (ms). Linear interpolation
    matches `animation-timing-function: linear`."""
    phase = (t_ms % period_ms) / period_ms      # 0..1 within cycle
    return DASH_LEN * (1 - phase)               # 16 → 0


def opacity_at(t_ms: float, period_ms: float = BREATH_PERIOD_MS,
               min_op: float = BREATH_MIN_OPACITY) -> float:
    """Component opacity at time t. Matches the `ease-in-out` smoothing
    of CSS @keyframes (sinusoidal: 1 → min → 1 each period)."""
    phase = (t_ms % period_ms) / period_ms      # 0..1
    # ease-in-out maps to a cosine wave: (1 + cos(2pi * phase)) / 2 goes
    # 1 → 0 → 1, then we rescale to (1 → min_op → 1).
    wave = (1 + math.cos(2 * math.pi * phase)) / 2      # 1..0..1
    return min_op + (1 - min_op) * wave                  # min..1..min


def hue_at(t_ms: float, period_ms: float = BREATH_PERIOD_MS) -> float:
    """Hue-rotate degrees for `.alert-pulse` at time t. Mirrors the
    CSS keyframes:
        0%, 70%, 100% → 0deg
        35%           → -130deg
    Returns 0 outside the [0%, 70%] interpolation window; smooth
    triangle ramp inside, peaked at 35%."""
    phase = (t_ms % period_ms) / period_ms      # 0..1
    if phase >= 0.70:
        return 0.0                              # held at 0 from 70% to 100%
    # Triangle ramp 0 → -130 → 0 over [0, 0.70], peak at 0.35
    if phase <= 0.35:
        ratio = phase / 0.35                    # 0..1
    else:
        ratio = (0.70 - phase) / 0.35           # 1..0
    return -130.0 * ratio


def make_frame_svg(animated_svg: str, t_ms: float) -> str:
    """Take the live animated SVG and inject static values for time `t`.
    Returns a STATIC SVG with no animations (`animation: none` everywhere)."""
    gray_off   = offset_at(t_ms, GRAY_PERIOD_MS)
    orange_off = offset_at(t_ms, ORANGE_PERIOD_MS)
    opacity    = opacity_at(t_ms)
    hue_deg    = hue_at(t_ms)
    static_css = (
        "\n.edge-path { stroke-dasharray: 8 4; animation: none;"
        f" stroke-dashoffset: {gray_off:.2f}; }}\n"
        f".edge-path--orange {{ stroke-dashoffset: {orange_off:.2f}; }}\n"
        f".icon-shadow {{ animation: none; opacity: {opacity:.3f}; }}\n"
        f".alert-pulse {{ animation: none; filter: hue-rotate({hue_deg:.1f}deg); }}\n"
    )
    # Inject just before the closing </style>. The latest rule wins,
    # overriding the animated `animation:` and `stroke-dashoffset`.
    return re.sub(r'</style>', static_css + r'</style>', animated_svg, count=1)


def render_frame(svg_str: str, width: int | None) -> Image.Image:
    # resvg-py accepts a string and returns a list of bytes (RGBA-encoded
    # PNG). Width override via `resolution_scale` (1.0 = native viewBox).
    kwargs: dict = {"svg_string": svg_str}
    png_bytes = bytes(resvg_py.svg_to_bytes(**kwargs))
    img = Image.open(BytesIO(png_bytes)).convert("RGBA")
    if width and img.width != width:
        h = round(img.height * width / img.width)
        img = img.resize((width, h), Image.LANCZOS)
    return img


def svg_to_webp(svg_path: Path, webp_path: Path, *,
                n_frames: int = 60,
                # LCM(gray=1200, orange=800, breath=2400) = 2400 — one
                # WebP cycle = one full breath cycle = 2 edge cycles =
                # 3 orange-edge cycles. Loop is perfectly seamless.
                cycle_ms: int = BREATH_PERIOD_MS,
                width: int | None = None,
                quality: int = 85) -> None:
    svg_text = svg_path.read_text(encoding="utf-8")

    frames: list[Image.Image] = []
    for i in range(n_frames):
        t_ms = i * cycle_ms / n_frames
        frame_svg = make_frame_svg(svg_text, t_ms)
        frames.append(render_frame(frame_svg, width=width))

    frame_duration_ms = max(1, cycle_ms // n_frames)
    frames[0].save(
        webp_path,
        format="WebP",
        save_all=True,
        append_images=frames[1:],
        duration=frame_duration_ms,
        loop=0,
        lossless=False,
        quality=quality,
        method=6,                     # slowest = best compression
    )


# ── CLI ────────────────────────────────────────────────────────────────
def main() -> None:
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0 if argv else 1)

    src = Path(argv[0])
    if not src.exists():
        print(f"input not found: {src}")
        sys.exit(1)

    # Parse remaining args
    dst: Path | None = None
    n_frames = 60                  # 60 frames over 2.4 s cycle = 25 fps
    width: int | None = None
    quality = 85
    i = 1
    while i < len(argv):
        a = argv[i]
        if a == "--frames":
            n_frames = int(argv[i + 1])
            i += 2
        elif a == "--width":
            width = int(argv[i + 1])
            i += 2
        elif a == "--quality":
            quality = int(argv[i + 1])
            i += 2
        elif not a.startswith("--") and dst is None:
            dst = Path(a)
            i += 1
        else:
            print(f"unknown arg: {a}")
            sys.exit(1)

    if dst is None:
        dst = src.with_suffix(".webp")

    svg_to_webp(src, dst, n_frames=n_frames, width=width, quality=quality)
    size_kb = dst.stat().st_size / 1024
    print(f"✓ wrote {dst}  ({n_frames} frames, {size_kb:.1f} KB)")


if __name__ == "__main__":
    main()

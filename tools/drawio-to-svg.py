#!/usr/bin/env python3
"""Convert `.drawio` → SVG with the **draw.io desktop** app (ad-hoc tool).

Unlike `kymo`'s own pure-Rust flowchart renderer (`kymo flow.d2 flow.svg`), this
shells out to the real **draw.io desktop CLI** (the Electron app's headless
`--export`), so the SVG is byte-for-byte what draw.io itself produces — full
fidelity for *any* `.drawio` (not just kymo flowcharts). It is a maintenance
utility, NOT part of the published `kymostudio` packages: it needs draw.io
desktop installed, so it never ships in the engine.

    # one file (→ alongside, .svg)
    python tools/drawio-to-svg.py diagram.drawio
    python tools/drawio-to-svg.py diagram.drawio -o out.svg

    # a whole directory (batch every *.drawio → <out>/<name>.svg)
    python tools/drawio-to-svg.py ./diagrams -o ./svgs

    # pass-through export options
    python tools/drawio-to-svg.py d.drawio --crop --transparent --scale 2 --all-pages

Install draw.io desktop:  `brew install --cask drawio`  (or https://drawio.com).
Stdlib-only; run straight from the repo root.
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

# Where the draw.io desktop binary tends to live when it is not already on PATH.
_FALLBACK_BINS = [
    "/Applications/draw.io.app/Contents/MacOS/draw.io",          # macOS cask
    "/Applications/draw.io.app/Contents/MacOS/drawio",
    "/opt/drawio/drawio",                                        # Linux tarball
    "C:/Program Files/draw.io/draw.io.exe",                     # Windows
]


def find_drawio(explicit: str | None) -> str:
    """Resolve the draw.io desktop binary, or exit with an install hint."""
    if explicit:
        if Path(explicit).is_file():
            return explicit
        sys.exit(f"draw.io binary not found at {explicit!r}")
    found = shutil.which("drawio") or shutil.which("draw.io")
    if found:
        return found
    for cand in _FALLBACK_BINS:
        if Path(cand).is_file():
            return cand
    sys.exit(
        "draw.io desktop not found. Install it (`brew install --cask drawio`, "
        "or https://drawio.com), or pass --drawio-bin <path>."
    )


def add_background(dst: Path, color: str) -> None:
    """Give a transparent draw.io SVG a solid background — and force the *light*
    variant of its `light-dark()` palette so it's readable everywhere (draw.io
    exports a transparent canvas with theme-reactive colours, which look washed
    out / invisible on dark or transparent viewers)."""
    svg = dst.read_text(encoding="utf-8")
    svg = svg.replace("color-scheme: light dark;", "color-scheme: light;")
    # Flatten draw.io's `light-dark(light, dark)` to the light colour so plain
    # rasterizers (resvg, rsvg-convert) — which don't evaluate that CSS function
    # and otherwise fall back to black — render the intended fills/strokes.
    # (allow one level of nested parens so `light-dark(rgb(…), rgb(…))` flattens too)
    svg = re.sub(
        r"light-dark\(\s*((?:[^,()]|\([^()]*\))+?)\s*,\s*(?:[^()]|\([^()]*\))+?\)",
        r"\1",
        svg,
    )
    m = re.search(r'viewBox="([\d.\- ]+)"', svg)
    if m:
        x, y, w, h = m.group(1).split()
    else:  # fall back to width/height (strip a trailing "px")
        gw = re.search(r'width="([\d.]+)', svg)
        gh = re.search(r'height="([\d.]+)', svg)
        x, y = "0", "0"
        w, h = (gw.group(1) if gw else "100%"), (gh.group(1) if gh else "100%")
    rect = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{color}"/>'
    svg = re.sub(r"(<svg\b[^>]*>)", lambda mm: mm.group(1) + rect, svg, count=1)
    dst.write_text(svg, encoding="utf-8")


def export_one(drawio: str, src: Path, dst: Path, opts: list[str], background: str | None) -> None:
    """Export a single `.drawio` → SVG via the desktop CLI; raise on failure."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        drawio, "--export", "--format", "svg",
        "--no-sandbox",                     # required headless / when run as root
        "--output", str(dst), *opts, str(src),
    ]
    # draw.io is Electron — it prints GPU/sandbox noise to stderr even on success,
    # so only surface it when the export actually fails.
    env = {**os.environ, "ELECTRON_DISABLE_SECURITY_WARNINGS": "1"}
    proc = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if proc.returncode != 0 or not dst.is_file() or dst.stat().st_size == 0:
        detail = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(
            f"draw.io export failed for {src} (exit {proc.returncode})"
            + (f"\n  {detail.splitlines()[-1]}" if detail else "")
        )
    if background:
        add_background(dst, background)
    print(f"{src} -> {dst} ({dst.stat().st_size:,} bytes)")


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        prog="drawio-to-svg.py",
        description="Convert .drawio → SVG using the draw.io desktop app.",
    )
    ap.add_argument("input", help="a .drawio file, or a directory of them")
    ap.add_argument("-o", "--output", help="output .svg file (single input) or directory (dir input)")
    ap.add_argument("--drawio-bin", help="path to the draw.io desktop binary")
    ap.add_argument("--all-pages", action="store_true", help="export every page")
    ap.add_argument("--crop", action="store_true", help="crop the SVG to the diagram")
    ap.add_argument("--transparent", action="store_true", help="transparent background")
    ap.add_argument(
        "--background", "--bg", metavar="COLOR", nargs="?", const="#ffffff",
        help="add a solid background + force the light colour scheme "
             "(default #ffffff when the flag is given with no value) — fixes the "
             "hard-to-read transparent/dark-mode export",
    )
    ap.add_argument("--scale", help="scale factor (e.g. 2)")
    ap.add_argument("--margin", "-m", type=int, metavar="PX",
                    help="whitespace margin around the diagram (draw.io --border)")
    args = ap.parse_args(argv)

    drawio = find_drawio(args.drawio_bin)
    opts: list[str] = []
    if args.all_pages:
        opts.append("--all-pages")
    if args.crop:
        opts.append("--crop")
    if args.transparent:
        opts.append("--transparent")
    if args.scale:
        opts += ["--scale", args.scale]
    if args.margin is not None:
        opts += ["--border", str(args.margin)]

    src = Path(args.input)
    if not src.exists():
        sys.exit(f"not found: {src}")

    try:
        if src.is_dir():
            files = sorted(src.glob("*.drawio"))
            if not files:
                sys.exit(f"no .drawio files in {src}")
            out_dir = Path(args.output) if args.output else src
            for f in files:
                export_one(drawio, f, out_dir / f"{f.stem}.svg", opts, args.background)
        else:
            dst = Path(args.output) if args.output else src.with_suffix(".svg")
            export_one(drawio, src, dst, opts, args.background)
    except RuntimeError as exc:
        sys.exit(str(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

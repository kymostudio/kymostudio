#!/usr/bin/env python3
"""Generate the headless-Chrome ground-truth PNGs for the accuracy dataset.

For every vendored SVG (`datasets.load(require_refs=False)`), render it with
headless Google Chrome — the de-facto SVG renderer — at its normalized viewBox
size and commit the result as `datasets/wpt-svg/refs/<category>/<name>.png`. These
are the ground truth the accuracy bench scores every engine against (kymo
included), so they are committed and Chrome is only needed to *regenerate* them.

Each SVG is inlined into a minimal white-background HTML page sized to the SVG,
then screenshotted at a 1.0 device-scale factor so the PNG is exactly W×H.

Run:  uv run python svg2pdf/gen_refs.py [--chrome /path/to/chrome] [--limit N]
"""
from __future__ import annotations

import argparse
import shutil
import struct
import subprocess
import tempfile
from pathlib import Path

import datasets

CHROME_CANDIDATES = (
    "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
)

_HTML = (
    "<!DOCTYPE html><html><head><meta charset='utf-8'><style>"
    "*{{margin:0;padding:0;border:0}}html,body{{width:{w}px;height:{h}px;"
    "background:#fff;overflow:hidden}}svg{{display:block}}</style></head><body>{svg}</body></html>"
)


def _find_chrome(explicit: str | None) -> str:
    if explicit:
        return explicit
    for c in CHROME_CANDIDATES:
        if shutil.which(c):
            return c
    raise SystemExit("no Chrome/Chromium found — pass --chrome /path/to/chrome")


def _png_dims(p: Path) -> tuple[int, int]:
    d = p.read_bytes()[:24]
    return struct.unpack(">II", d[16:24]) if len(d) >= 24 else (0, 0)


def _render_one(chrome: str, sample: datasets.Sample, out: Path, workdir: Path) -> bool:
    html = _HTML.format(w=sample.width, h=sample.height, svg=sample.svg)
    html_path = workdir / "page.html"
    html_path.write_text(html, encoding="utf-8")
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        chrome, "--headless=new", "--disable-gpu", "--no-sandbox",
        "--hide-scrollbars", "--force-device-scale-factor=1",
        "--default-background-color=FFFFFFFF",
        f"--user-data-dir={workdir / 'ud'}",
        f"--window-size={sample.width},{sample.height}",
        "--virtual-time-budget=2500",
        f"--screenshot={out}",
        str(html_path),
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    if not out.exists() or out.stat().st_size == 0:
        print(f"  ! {sample.name}: chrome produced no output ({res.stderr.strip()[:120]})")
        return False
    w, h = _png_dims(out)
    if (w, h) != (sample.width, sample.height):
        print(f"  ! {sample.name}: got {w}x{h}, expected {sample.width}x{sample.height}")
    return True


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--chrome", default=None)
    ap.add_argument("--limit", type=int, default=0, help="only first N (debug)")
    args = ap.parse_args()

    chrome = _find_chrome(args.chrome)
    samples = datasets.load(require_refs=False)
    if args.limit:
        samples = samples[: args.limit]
    print(f"rendering {len(samples)} refs with {chrome}")

    ok = 0
    with tempfile.TemporaryDirectory() as td:
        workdir = Path(td)
        for s in samples:
            out = datasets.REFS_DIR / s.category / (s.svg_path.stem + ".png")
            if _render_one(chrome, s, out, workdir):
                ok += 1
    print(f"done: {ok}/{len(samples)} reference PNGs in {datasets.REFS_DIR}")


if __name__ == "__main__":
    main()

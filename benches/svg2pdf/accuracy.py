#!/usr/bin/env python3
"""SVG→PDF bench — ACCURACY vs an independent ground truth (headless Chrome).

`quality.py` scores engines against *kymo's* PDF (agreement); this scores them
against **headless Google Chrome** — the de-facto SVG renderer — over a vendored
subset of the web-platform-tests `svg/` suite (`datasets/wpt-svg/`). Chrome is
independent of every engine, so this measures *correctness*, and **kymo is graded
too** (it is no longer the reference). It is the PDF analogue of the svg2png
accuracy pass.

PDFs aren't pixels, so per (engine, sample) we convert the normalized SVG to PDF,
**rasterize page 1 with PyMuPDF**, composite over white, and compare to the
committed Chrome reference PNG:

  • ``mean_abs_diff``   — mean per-channel |Δ| (0…255), the headline accuracy number
  • ``pct_pixels_diff`` — % pixels off by > 1 luminance
  • a sample "matches Chrome" if ``mean_abs_diff < MATCH_TOL`` (lenient — absorbs
    antialiasing/gamma/page-pipeline differences a correct converter still shows)

`chrome` (print-to-PDF) is in the field too: it routes the *same* renderer as the
ground truth, so it reads near-baseline and validates the method (the role
`resvg-py` plays in the svg2png accuracy pass).

Run standalone:  uv run python svg2pdf/accuracy.py
Or import:       from accuracy import collect
"""
from __future__ import annotations

import io
import json
import statistics
from pathlib import Path

import datasets
import engines

try:
    import fitz  # PyMuPDF
except ModuleNotFoundError as exc:  # pragma: no cover
    raise SystemExit(
        "svg2pdf accuracy needs PyMuPDF — `cd benches && uv sync --extra svg2pdf`"
    ) from exc
from PIL import Image, ImageChops

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RESULTS = HERE / "results"

DIFF_THRESHOLD = 1      # luminance Δ above which a pixel "differs"
MATCH_TOL = 10.0        # mean_abs_diff below which a sample "matches Chrome"
RASTER_ZOOM = 2.0       # zoom when rasterizing a PDF page (resized to ref before diff)


def _on_white(png_or_path) -> Image.Image:
    data = png_or_path if isinstance(png_or_path, (bytes, bytearray)) else Path(png_or_path).read_bytes()
    im = Image.open(io.BytesIO(data)).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    return Image.alpha_composite(bg, im).convert("RGB")


def _pdf_to_img(pdf: bytes) -> Image.Image:
    """Rasterize page 1 of a PDF → RGB on white (the engine output under test)."""
    doc = fitz.open(stream=pdf, filetype="pdf")
    if doc.page_count < 1:
        raise ValueError("PDF has no pages")
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(RASTER_ZOOM, RASTER_ZOOM), alpha=True)
    return _on_white(pix.tobytes("png"))


def _diff(ref: Image.Image, other: Image.Image) -> tuple[float, float]:
    if other.size != ref.size:
        other = other.resize(ref.size)
    hist = ImageChops.difference(ref, other).convert("L").histogram()
    total = sum(hist) or 1
    mean = sum(i * h for i, h in enumerate(hist)) / total
    differ = sum(h for i, h in enumerate(hist) if i > DIFF_THRESHOLD)
    return mean, 100 * differ / total


def collect() -> dict:
    samples = datasets.load(require_refs=True)
    if not samples:
        raise SystemExit("no dataset samples with Chrome refs — run gen_refs.py first")
    cats = sorted({s.category for s in samples})
    ref_imgs = {s.name: _on_white(s.ref_path) for s in samples}

    rows = []
    for e in engines.available_engines():
        rendered = 0
        means: list[float] = []
        pcts: list[float] = []
        matches = 0
        per_cat: dict[str, list[float]] = {c: [] for c in cats}
        failures: list[dict] = []
        for s in samples:
            try:
                img = _pdf_to_img(e.render(s.svg, s.svg_bytes))
            except Exception as exc:
                failures.append({"item": s.name, "error": f"{type(exc).__name__}: {exc}"})
                continue
            rendered += 1
            mean, pct = _diff(ref_imgs[s.name], img)
            means.append(mean)
            pcts.append(pct)
            per_cat[s.category].append(mean)
            if mean < MATCH_TOL:
                matches += 1

        n = len(samples)
        rows.append({
            "key": e.key,
            "label": e.label,
            "backend": e.backend,
            "renders": f"{rendered}/{n}",
            "matches_chrome": f"{matches}/{n}",
            "match_rate": round(matches / n, 4) if n else 0.0,
            "mean_abs_diff_avg": round(statistics.mean(means), 2) if means else None,
            "mean_abs_diff_median": round(statistics.median(means), 2) if means else None,
            "pct_pixels_diff_avg": round(statistics.mean(pcts), 2) if pcts else None,
            "per_category_mean_diff": {
                c: round(statistics.mean(v), 2) if v else None for c, v in per_cat.items()
            },
            "failures": failures[:5],
            "failure_count": len(failures),
        })

    # Rank by closeness to Chrome (lower mean diff first; non-renderers last).
    rows.sort(key=lambda r: (r["mean_abs_diff_avg"] is None, r["mean_abs_diff_avg"] or 1e9))

    return {
        "generated_by": "benches/svg2pdf/accuracy.py",
        "ground_truth": "headless Google Chrome",
        "diff_threshold": DIFF_THRESHOLD,
        "match_tolerance": MATCH_TOL,
        "raster_zoom": RASTER_ZOOM,
        "dataset": {
            "source": "web-platform-tests svg/ (BSD-3-Clause / W3C)",
            "samples": len(samples),
            "categories": {c: sum(1 for s in samples if s.category == c) for c in cats},
        },
        "missing_engines": engines.missing_engines(),
        "engines": rows,
    }


def main() -> None:
    RESULTS.mkdir(parents=True, exist_ok=True)
    data = collect()
    (RESULTS / "accuracy.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    d = data["dataset"]
    print(f"dataset : {d['samples']} SVGs vs {data['ground_truth']} "
          f"({', '.join(f'{c}:{n}' for c, n in d['categories'].items())})")
    for r in data["engines"]:
        print(f"  {r['label']:13} {r['renders']:>6} render  "
              f"meanΔ {str(r['mean_abs_diff_avg']):>6}  "
              f"matches {r['matches_chrome']:>6} ({r['match_rate']:.0%})")
    print(f"wrote   : {(RESULTS / 'accuracy.json').relative_to(ROOT)}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""SVG→PDF bench — QUALITY: does the engine reproduce kymo's PDF?

Timing tells you how *fast* a converter is; it says nothing about whether the
PDF is right. This module converts every corpus SVG with every engine and scores
the output against the ``kymo`` reference (the `svg2pdf` core that authored the
SVG → PDF path), on four axes:

  • renders     — produced a parseable, non-empty PDF without raising
  • page        — page geometry: size in points and the scale vs the SVG's own
                  px size (exposes the engines' 72-dpi vs 96-dpi disagreement)
  • structure   — vector drawings + embedded images on page 1 (is it real vector
                  content, or an empty/near-empty page?)
  • fidelity    — how close the *rendered* page looks to kymo's

PDFs aren't pixels, so fidelity is measured by **rasterizing page 1 of each PDF
with PyMuPDF** (MuPDF) at a fixed zoom, compositing over white (neutralises alpha
conventions), and comparing to kymo's rasterized page. This is *agreement with
kymo*, framed honestly — kymo is the system under test, not an absolute ground
truth. There is no same-engine control here (resvg has no PDF path), so the
independent `rsvg-convert` (librsvg) row is the closest cross-check.

This pass necessarily imports PyMuPDF (`fitz`) and Pillow — rasterizing and
comparing PDFs *is* the measurement.

Run standalone:  uv run python svg2pdf/quality.py
Or import:       from quality import collect
"""
from __future__ import annotations

import io
import json
from pathlib import Path

import corpus
import engines

try:
    import fitz  # PyMuPDF
except ModuleNotFoundError as exc:  # pragma: no cover
    raise SystemExit(
        "svg2pdf quality needs PyMuPDF — `cd benches && uv sync --extra svg2pdf`"
    ) from exc
from PIL import Image, ImageChops

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RESULTS = HERE / "results"

# Luminance-difference threshold (0..255) above which a pixel "differs". 1 keeps
# us from counting pure rounding noise while still catching antialiasing.
DIFF_THRESHOLD = 1
# Zoom applied when rasterizing a PDF page for the visual comparison. The number
# is arbitrary (pages are resized to the reference before diffing); 2× gives a
# detailed canvas without blowing up memory on the large samples.
RASTER_ZOOM = 2.0


class PdfRender:
    """A rasterized + introspected PDF page-1: image plus structural facts."""

    __slots__ = ("image", "page_w", "page_h", "pages", "drawings", "images", "text_len")

    def __init__(self, pdf: bytes):
        doc = fitz.open(stream=pdf, filetype="pdf")
        if doc.page_count < 1:
            raise ValueError("PDF has no pages")
        page = doc[0]
        self.pages = doc.page_count
        self.page_w = float(page.rect.width)
        self.page_h = float(page.rect.height)
        self.drawings = len(page.get_drawings())
        self.images = len(page.get_images())
        # Selectable text: chars extractable from page 1. Converters that embed
        # real text (svg2pdf/Cairo/Chrome) report > 0; those that rasterize or
        # path-ify text report ~0. A reported axis, not part of the verdict.
        self.text_len = len(page.get_text().strip())
        pix = page.get_pixmap(matrix=fitz.Matrix(RASTER_ZOOM, RASTER_ZOOM), alpha=True)
        self.image = _on_white(pix.tobytes("png"))


def _on_white(png: bytes) -> Image.Image:
    """Decode PNG → RGB composited over white (neutralises alpha conventions)."""
    im = Image.open(io.BytesIO(png)).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    return Image.alpha_composite(bg, im).convert("RGB")


def _fidelity(ref: Image.Image, other: Image.Image) -> tuple[float, float]:
    """(mean_abs_diff, pct_pixels_diff) of `other` vs `ref` (resized to match)."""
    if other.size != ref.size:
        other = other.resize(ref.size)
    diff = ImageChops.difference(ref, other)
    hist = diff.convert("L").histogram()  # 256 buckets of luminance |Δ|
    total = sum(hist) or 1
    mean = sum(i * h for i, h in enumerate(hist)) / total
    differ = sum(h for i, h in enumerate(hist) if i > DIFF_THRESHOLD)
    return round(mean, 2), round(100 * differ / total, 2)


def collect() -> dict:
    items = corpus.build()
    engs = engines.available_engines()

    ref_engine = next((e for e in engs if e.key == engines.REFERENCE_KEY), None)
    if ref_engine is None:
        raise SystemExit(f"reference engine '{engines.REFERENCE_KEY}' unavailable")

    # Reference renders (one per item) — every engine is scored against these.
    ref_imgs: dict[str, Image.Image] = {}
    for item in items:
        ref_imgs[item.name] = PdfRender(ref_engine.render(item.svg, item.svg_bytes)).image

    rows = []
    for e in engs:
        rendered = single_page = nonempty = 0
        scales: list[float] = []
        draws: list[int] = []
        imgs: list[int] = []
        texts: list[int] = []
        mean_diffs: list[float] = []
        pct_diffs: list[float] = []
        failures: list[dict] = []
        for item in items:
            try:
                pdf = e.render(item.svg, item.svg_bytes)
                r = PdfRender(pdf)
            except Exception as exc:
                failures.append({"item": item.name, "error": f"{type(exc).__name__}: {exc}"})
                continue
            rendered += 1
            if r.pages == 1:
                single_page += 1
            if r.drawings > 0 or r.images > 0:
                nonempty += 1
            if item.width > 0:
                scales.append(r.page_w / item.width)
            draws.append(r.drawings)
            imgs.append(r.images)
            texts.append(r.text_len)
            mean, pct = _fidelity(ref_imgs[item.name], r.image)
            mean_diffs.append(mean)
            pct_diffs.append(pct)

        n = len(items)
        rows.append({
            "key": e.key,
            "label": e.label,
            "backend": e.backend,
            "is_reference": e.key == engines.REFERENCE_KEY,
            "renders": f"{rendered}/{n}",
            "render_rate": round(rendered / n, 4) if n else 0.0,
            "single_page": f"{single_page}/{rendered}" if rendered else "0/0",
            "nonempty": f"{nonempty}/{rendered}" if rendered else "0/0",
            # Page scale vs the SVG's own px size — kymo/fpdf2 keep 1px→1pt (×1.0),
            # Cairo/librsvg apply the CSS 96-dpi conversion 1px→0.75pt (×0.75).
            "page_scale_avg": round(sum(scales) / len(scales), 3) if scales else None,
            "avg_drawings": round(sum(draws) / len(draws), 1) if draws else None,
            "avg_images": round(sum(imgs) / len(imgs), 1) if imgs else None,
            # Selectable-text axis: avg extractable chars per page, and whether
            # any rendered page carried text at all.
            "avg_text_chars": round(sum(texts) / len(texts)) if texts else None,
            "has_text": any(t > 0 for t in texts),
            # Fidelity averaged over the files this engine rendered. For the
            # reference these are 0 by construction (it's compared to itself).
            "mean_abs_diff_avg": round(sum(mean_diffs) / len(mean_diffs), 2) if mean_diffs else None,
            "pct_pixels_diff_avg": round(sum(pct_diffs) / len(pct_diffs), 2) if pct_diffs else None,
            "verdict": _verdict(e.key, rendered, nonempty, n, mean_diffs, pct_diffs),
            "failures": failures[:5],  # first few, for the report's honesty section
            "failure_count": len(failures),
        })

    return {
        "generated_by": "benches/svg2pdf/quality.py",
        "reference_engine": ref_engine.key,
        "diff_threshold": DIFF_THRESHOLD,
        "raster_zoom": RASTER_ZOOM,
        "rasterizer": f"PyMuPDF {_pdf_lib_version()}",
        "corpus": {"items": len(items)},
        "missing_engines": engines.missing_engines(),
        "engines": rows,
    }


def _pdf_lib_version() -> str:
    try:
        return fitz.pymupdf_version  # type: ignore[attr-defined]
    except AttributeError:
        return getattr(fitz, "VersionBind", "?")


def _verdict(key, rendered, nonempty, n, mean_diffs, pct) -> str:
    if key == engines.REFERENCE_KEY:
        return "reference"
    if rendered == 0:
        return "fails to convert"
    if nonempty == 0:
        return "empty pages"
    avg_mean = sum(mean_diffs) / len(mean_diffs) if mean_diffs else 255.0
    avg_pct = sum(pct) / len(pct) if pct else 100.0
    partial = f" (only {rendered}/{n})" if rendered < n else ""
    if avg_mean < 0.5 and avg_pct < 1.0:
        return "pixel-identical" + partial
    if avg_mean < 5.0 and avg_pct < 20.0:
        return "high fidelity" + partial
    if avg_mean < 20.0:
        return "low fidelity" + partial
    return "wrong output" + partial


def main() -> None:
    RESULTS.mkdir(parents=True, exist_ok=True)
    data = collect()
    (RESULTS / "quality.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"corpus  : {data['corpus']['items']} SVGs, reference '{data['reference_engine']}' "
          f"(rasterizer {data['rasterizer']})")
    for r in data["engines"]:
        print(f"  {r['label']:13} {r['renders']:>6} render  "
              f"diff {str(r['mean_abs_diff_avg']):>6}  "
              f"scale {str(r['page_scale_avg']):>5}  → {r['verdict']}")
    if data["missing_engines"]:
        print(f"missing : {', '.join(data['missing_engines'])} (package/binary unavailable)")
    print(f"wrote   : {(RESULTS / 'quality.json').relative_to(ROOT)}")


if __name__ == "__main__":
    main()

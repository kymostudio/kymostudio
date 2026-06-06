#!/usr/bin/env python3
"""SVG→PNG bench — QUALITY: does the engine reproduce kymo's PNG?

Timing tells you how *fast* a rasterizer is; it says nothing about whether the
pixels are right. This module rasterizes every corpus SVG with every engine and
scores the output against the ``kymo`` reference (the resvg core that authored
the SVG), on three axes:

  • renders        — produced a decodable PNG without raising
  • dimensions     — output W×H equals kymo's (intrinsic size honoured)
  • fidelity       — how close the pixels are to kymo's

Fidelity is measured on the image **composited over white**, so an engine that
defaults to a transparent background instead of white isn't unfairly penalised
for the alpha convention — only real drawing differences count. We report:

  • ``mean_abs_diff``   — mean per-channel |Δ| over RGB, 0 (identical) … 255
  • ``pct_pixels_diff`` — % of pixels whose luminance differs by > 1 (ignores
                          sub-LSB rounding; catches antialiasing & missing art)

This is *agreement with kymo*, framed honestly — kymo is the system under test,
not an absolute ground truth. The ``resvg-py`` row is the control: same engine
as kymo, so it should read ~0 diff and validate the method.

Unlike the BPMN bench's stdlib-only ``quality.py``, this one necessarily imports
the rasterizers and Pillow — comparing engines *is* the measurement.

Run standalone:  uv run python svg2png/quality.py
Or import:       from quality import collect
"""
from __future__ import annotations

import io
import json
from pathlib import Path

import corpus
import engines
from PIL import Image, ImageChops

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RESULTS = HERE / "results"

# Luminance-difference threshold (0..255) above which a pixel "differs". 1 keeps
# us from counting pure rounding noise while still catching antialiasing.
DIFF_THRESHOLD = 1


def _decode_on_white(png: bytes) -> Image.Image:
    """Decode PNG → RGB composited over white (neutralises alpha conventions)."""
    im = Image.open(io.BytesIO(png)).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    return Image.alpha_composite(bg, im).convert("RGB")


def _fidelity(ref: Image.Image, other: Image.Image) -> tuple[float, float, bool]:
    """(mean_abs_diff, pct_pixels_diff, same_dimensions) of `other` vs `ref`."""
    same_dims = other.size == ref.size
    if not same_dims:
        other = other.resize(ref.size)
    diff = ImageChops.difference(ref, other)
    hist = diff.convert("L").histogram()  # 256 buckets of luminance |Δ|
    total = sum(hist) or 1
    mean = sum(i * h for i, h in enumerate(hist)) / total
    differ = sum(h for i, h in enumerate(hist) if i > DIFF_THRESHOLD)
    return round(mean, 2), round(100 * differ / total, 2), same_dims


def collect() -> dict:
    items = corpus.build()
    engs = engines.available_engines()

    ref_engine = next((e for e in engs if e.key == engines.REFERENCE_KEY), None)
    if ref_engine is None:
        raise SystemExit(f"reference engine '{engines.REFERENCE_KEY}' unavailable")

    # Reference renders (one per item) — every engine is scored against these.
    ref_imgs: dict[str, Image.Image] = {}
    for item in items:
        ref_imgs[item.name] = _decode_on_white(ref_engine.render(item.svg, item.svg_bytes))

    rows = []
    for e in engs:
        rendered = 0
        dims_ok = 0
        mean_diffs: list[float] = []
        pct_diffs: list[float] = []
        failures: list[dict] = []
        for item in items:
            try:
                png = e.render(item.svg, item.svg_bytes)
                img = _decode_on_white(png)
            except Exception as exc:
                failures.append({"item": item.name, "error": f"{type(exc).__name__}: {exc}"})
                continue
            rendered += 1
            mean, pct, same = _fidelity(ref_imgs[item.name], img)
            if same:
                dims_ok += 1
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
            "dims_match": f"{dims_ok}/{rendered}" if rendered else "0/0",
            # Fidelity averaged over the files this engine rendered. For the
            # reference these are 0 by construction (it's compared to itself).
            "mean_abs_diff_avg": round(sum(mean_diffs) / len(mean_diffs), 2) if mean_diffs else None,
            "pct_pixels_diff_avg": round(sum(pct_diffs) / len(pct_diffs), 2) if pct_diffs else None,
            # A coarse verdict so the table reads at a glance.
            "verdict": _verdict(e.key, rendered, n, mean_diffs, pct_diffs),
            "failures": failures[:5],  # first few, for the report's honesty section
            "failure_count": len(failures),
        })

    return {
        "generated_by": "bench/svg2png/quality.py",
        "reference_engine": ref_engine.key,
        "diff_threshold": DIFF_THRESHOLD,
        "corpus": {"items": len(items)},
        "missing_engines": engines.missing_engines(),
        "engines": rows,
    }


def _verdict(key: str, rendered: int, n: int, mean_diffs: list[float], pct: list[float]) -> str:
    if key == engines.REFERENCE_KEY:
        return "reference"
    if rendered == 0:
        return "fails to render"
    avg_mean = sum(mean_diffs) / len(mean_diffs) if mean_diffs else 255.0
    avg_pct = sum(pct) / len(pct) if pct else 100.0
    if rendered < n:
        partial = f" (only {rendered}/{n})"
    else:
        partial = ""
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
    print(f"corpus  : {data['corpus']['items']} SVGs, reference '{data['reference_engine']}'")
    for r in data["engines"]:
        print(f"  {r['label']:10} {r['renders']:>6} render  "
              f"diff {str(r['mean_abs_diff_avg']):>6}  "
              f"differ {str(r['pct_pixels_diff_avg']):>6}%  → {r['verdict']}")
    if data["missing_engines"]:
        print(f"missing : {', '.join(data['missing_engines'])} (package not importable)")
    print(f"wrote   : {(RESULTS / 'quality.json').relative_to(ROOT)}")


if __name__ == "__main__":
    main()

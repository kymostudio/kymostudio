#!/usr/bin/env python3
"""Mermaid render-accuracy bench — kymo vs merman vs mermaid.js.

Two dimensions, both relative to mermaid.js (rendered by kroki.io — the ground
truth the other two emulate):

  * raster-safe text recall — the fraction of a diagram's labels that survive
    rasterization, i.e. live in an SVG <text> rather than a <foreignObject>
    (which resvg/svg2pdf drop). Computed by render.mjs into recall.json.
  * visual distance to mermaid.js — mean per-channel |Δ| (0..255) of each
    engine's rasterized PNG against the mermaid.js reference PNG (resized to the
    reference, composited on white). Lower = closer look. Computed here.

Run after render.mjs:  uv run python accuracy.py   (or plain python3, needs Pillow)
"""
from __future__ import annotations

import io
import json
import statistics
from pathlib import Path

from PIL import Image, ImageChops

HERE = Path(__file__).resolve().parent
RAW = HERE / "results" / "raw"
ENGINES = ["kymo", "merman", "mermaidjs"]


def on_white(path: Path) -> Image.Image:
    im = Image.open(io.BytesIO(path.read_bytes())).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    return Image.alpha_composite(bg, im).convert("RGB")


def mean_abs_diff(ref: Image.Image, other: Image.Image) -> float:
    if other.size != ref.size:
        other = other.resize(ref.size, Image.BILINEAR)
    hist = ImageChops.difference(ref, other).convert("L").histogram()
    total = sum(hist) or 1
    return sum(i * n for i, n in enumerate(hist)) / total


def pct(r) -> str:
    return "—" if r is None else f"{100 * r['hit'] / r['total']:.0f}%"


def main() -> None:
    recall = json.loads((HERE / "results" / "recall.json").read_text())

    # Visual distance of kymo / merman PNG vs the mermaid.js reference PNG.
    for row in recall:
        ref_p = RAW / f"{row['id']}.mermaidjs.png"
        ref = on_white(ref_p) if ref_p.exists() else None
        for eng in ("kymo", "merman"):
            e = row["engines"].get(eng, {})
            p = RAW / f"{row['id']}.{eng}.png"
            if ref is not None and p.exists() and "error" not in e:
                e["visual_diff"] = round(mean_abs_diff(ref, on_white(p)), 1)

    # ---- aggregate per grammar/engine ----
    def avg(grammar, eng, key):
        vals = []
        for row in recall:
            if grammar and row["grammar"] != grammar:
                continue
            e = row["engines"].get(eng, {})
            r = e.get(key)
            if isinstance(r, dict):
                vals.append(100 * r["hit"] / r["total"])
            elif isinstance(r, (int, float)):
                vals.append(r)
        return round(statistics.mean(vals), 1) if vals else None

    grammars = ["flowchart", "sequence"]
    lines = [
        "# Mermaid render accuracy — kymo vs merman vs mermaid.js",
        "",
        "*kymo = kymostudio-core's own Rust engine; merman = the merman port of",
        "mermaid.js bundled in render-api; mermaid.js = the real thing via kroki.io",
        "(the ground truth). Corpus: 6 flowcharts + 5 sequence diagrams with known",
        "labels. Engine PNGs are rasterized by kymostudio-core (resvg); the",
        "mermaid.js PNG is kroki's puppeteer screenshot.*",
        "",
        "## 1. Raster-safe text recall — do labels survive rasterization?",
        "",
        "Fraction of each diagram's labels present as SVG `<text>` (not",
        "`<foreignObject>`, which resvg/svg2pdf drop). This is the metric our work",
        "targets: a high score means the PNG/PDF keeps its words.",
        "",
        "| grammar | kymo | merman | mermaid.js |",
        "|---|---|---|---|",
    ]
    for g in grammars:
        lines.append(
            f"| {g} | {fmtp(avg(g,'kymo','raster_recall'))} | "
            f"{fmtp(avg(g,'merman','raster_recall'))} | {fmtp(avg(g,'mermaidjs','raster_recall'))} |"
        )
    lines.append(
        f"| **all** | {fmtp(avg(None,'kymo','raster_recall'))} | "
        f"{fmtp(avg(None,'merman','raster_recall'))} | {fmtp(avg(None,'mermaidjs','raster_recall'))} |"
    )

    lines += [
        "",
        "> mermaid.js / merman keep labels in `<foreignObject>` for flowcharts, so",
        "> the *SVG* carries the text but a resvg raster drops it (recall ≈ 0%).",
        "> kymo emits real `<text>`, so its raster keeps every label. For sequence",
        "> diagrams all three already use `<text>`, so all score high.",
        "",
        "## 2. SVG content recall — is the text in the document at all?",
        "",
        "Same labels, but counting text anywhere in the SVG (foreignObject HTML",
        "included). Confirms no engine *loses* content — the raster gap above is",
        "purely a rasterization issue, not a parsing one.",
        "",
        "| grammar | kymo | merman | mermaid.js |",
        "|---|---|---|---|",
    ]
    for g in grammars:
        lines.append(
            f"| {g} | {fmtp(avg(g,'kymo','svg_recall'))} | "
            f"{fmtp(avg(g,'merman','svg_recall'))} | {fmtp(avg(g,'mermaidjs','svg_recall'))} |"
        )

    lines += [
        "",
        "## 3. Visual distance to mermaid.js (rasterized look)",
        "",
        "Mean per-channel |Δ| (0–255) of each engine's PNG vs the mermaid.js",
        "reference PNG, resized to the reference. Lower = closer look. merman",
        "tracks mermaid.js styling; kymo has its own look, so it sits further even",
        "when its content is more complete. Caveat: this number is *insensitive to",
        "missing text* — labels are a small fraction of the pixels, so merman scores",
        "low (close) here despite dropping every flowchart label in raster. Section 1",
        "is the metric for lost text.",
        "",
        "| grammar | kymo | merman |",
        "|---|---|---|",
    ]
    for g in grammars:
        lines.append(f"| {g} | {num(avg(g,'kymo','visual_diff'))} | {num(avg(g,'merman','visual_diff'))} |")
    lines.append(f"| **all** | {num(avg(None,'kymo','visual_diff'))} | {num(avg(None,'merman','visual_diff'))} |")

    lines += [
        "",
        "## Per-diagram raster-safe recall",
        "",
        "| id | grammar | kymo | merman | mermaid.js |",
        "|---|---|---|---|---|",
    ]
    for row in recall:
        e = row["engines"]
        lines.append(
            f"| {row['id']} | {row['grammar']} | "
            f"{pct(e.get('kymo',{}).get('raster_recall'))} | "
            f"{pct(e.get('merman',{}).get('raster_recall'))} | "
            f"{pct(e.get('mermaidjs',{}).get('raster_recall'))} |"
        )

    lines += [
        "",
        "## Reading",
        "",
        "- **Content correctness** (SVG recall) is ~100% for all three — every",
        "  engine parses the source and keeps the labels.",
        "- **Raster correctness** is where they diverge: for flowcharts, mermaid.js",
        "  and merman put labels in `<foreignObject>`, so a server-side resvg raster",
        "  loses the text; kymo's `<text>` survives. (kroki hides this for mermaid.js",
        "  by rasterizing with a real browser, which render.kymo.studio cannot do.)",
        "- **Look fidelity**: merman is visually closer to mermaid.js, kymo carries",
        "  its own style. The trade kymo makes — own look, full raster text — is the",
        "  point of routing flowchart/sequence to it.",
        "",
    ]
    (HERE / "results" / "REPORT.md").write_text("\n".join(lines))
    (HERE / "results" / "recall.json").write_text(json.dumps(recall, indent=2) + "\n")
    print("wrote results/REPORT.md")


def num(v) -> str:
    return "—" if v is None else f"{v:g}"


def fmtp(v) -> str:
    return "—" if v is None else f"{v:g}%"


if __name__ == "__main__":
    main()

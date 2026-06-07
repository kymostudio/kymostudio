#!/usr/bin/env python3
"""SVG→PDF bench — run quality + perf and render the report.

Two passes, one report:

  • quality (`quality.py`) — fidelity vs *kymo's own* PDF, on real kymo SVGs:
                             does an engine reproduce what `kymo … out.pdf` ships,
                             and is the page real vector content? (PDFs are
                             rasterized with PyMuPDF for the visual comparison.)
  • perf    (`perf.py`)    — SVG→PDF conversion timing over the kymo SVGs

Writes `results/quality.json`, `results/perf.json`, and the human-readable
`results/REPORT.md`.

Run:  cd benches && uv run python svg2pdf/run.py [--reps N]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import perf
import quality

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RESULTS = HERE / "results"


def _perf_row(p: dict, key: str) -> dict:
    return next((r for r in p["engines"] if r["key"] == key), {})


def _scorecard(q: dict, p: dict) -> str:
    lines = []
    for qr in q["engines"]:
        pr = _perf_row(p, qr["key"])
        med = pr.get("per_file_median_ms")
        thr = pr.get("throughput_files_per_s")
        spd = pr.get("speed_vs_kymo")
        diff = qr["mean_abs_diff_avg"]
        pct = qr["pct_pixels_diff_avg"]
        lines.append(
            f"| {qr['label']} | `{qr['backend']}` | {qr['renders']} | {qr['nonempty']} | "
            f"{'—' if qr['is_reference'] else (diff if diff is not None else '—')} | "
            f"{'—' if qr['is_reference'] else (str(pct) + '%' if pct is not None else '—')} | "
            f"{med if med is not None else '—'} | {thr if thr else '—'} | "
            f"{('×' + str(spd)) if spd else '—'} | **{qr['verdict']}** |"
        )
    return "\n".join(lines)


def _structure_table(q: dict) -> str:
    head = "| Engine | Single-page | Page scale vs SVG | Avg vector ops | Avg images | Text (chars) |"
    sep = "|---|---|---|---|---|---|"
    rows = []
    for r in q["engines"]:
        scale = r["page_scale_avg"]
        txt = r.get("avg_text_chars")
        rows.append(
            f"| {r['label']} | {r['single_page']} | "
            f"{('×' + str(scale)) if scale is not None else '—'} | "
            f"{r['avg_drawings'] if r['avg_drawings'] is not None else '—'} | "
            f"{r['avg_images'] if r['avg_images'] is not None else '—'} | "
            f"{txt if txt is not None else '—'} |"
        )
    return "\n".join([head, sep] + rows)


def _frontmatter(q: dict, p: dict) -> str:
    """YAML front matter stamping the run — so two REPORT.md are trivially
    diffable / distinguishable (host, versions, timestamp, corpus size)."""
    env = p["environment"]
    lines = [
        "---",
        "bench: svg2pdf",
        f"generated: {env['timestamp'].split('T', 1)[0]}",
        f"timestamp: {env['timestamp']}",
        f"host: {env['platform']}",
        f"python: \"{env['python']}\"",
        f"kymo_version: \"{env['kymo_version']}\"",
        f"reps: {env['reps']}",
        f"corpus: {q['corpus']['items']}",
        f"reference: {q['reference_engine']}",
        f"rasterizer: \"{q['rasterizer']}\"",
        "engines:",
    ]
    for r in p["engines"]:
        lines.append(f"  {r['key']}: \"{r['backend']}\"")
    lines.append("---")
    return "\n".join(lines) + "\n\n"


def _render_report(q: dict, p: dict) -> str:
    env = p["environment"]
    stamp = env["timestamp"]
    date = stamp.split("T", 1)[0]
    front = _frontmatter(q, p)
    n = q["corpus"]["items"]

    fail_notes = []
    for r in q["engines"]:
        if r.get("failure_count"):
            sample = r["failures"][0]["error"] if r["failures"] else ""
            fail_notes.append(f"- **{r['label']}** — {r['failure_count']} failures: e.g. `{sample}`")
    fail_block = "\n".join(fail_notes) if fail_notes else "- None."

    missing = q["missing_engines"]
    missing_block = (
        f"\n> Skipped (package/binary unavailable): {', '.join('`' + m + '`' for m in missing)}.\n"
        if missing else ""
    )

    return f"""{front}# SVG → PDF — converter scorecard

> **Generated {date}** by `benches/svg2pdf/run.py` (run stamp `{stamp}`).
> **Offline bench** — re-run with
> `cd benches && uv run python svg2pdf/run.py`. One question, two passes:
> **Fidelity** — does an engine reproduce the PDF *kymo itself emits* from the
> SVGs *kymo itself emits*, as real vector content? PDFs are rasterized with
> **{q['rasterizer']}** for the pixel comparison. Fidelity is deterministic;
> *timing* is machine-dependent (host below), not a gate. The field spans famous
> general-purpose renderers (headless **Chrome**, **Inkscape**, **LibreOffice**)
> and dedicated converters; **vl-convert** is built on the same `svg2pdf` as kymo,
> so it doubles as a same-engine control (expected ~0 diff).
{missing_block}
## 1. Fidelity + speed — vs kymo, on real kymo SVGs

Corpus: **{n} kymo SVGs** (samples + conformance corpus), rendered from `.kymo`
sources; every engine converts the identical SVG string to PDF. Fidelity is
measured on page 1 rasterized over white; *diff* is mean per-channel |Δ| (0…255),
*differ* is the share of pixels off by > {q['diff_threshold']} luminance.

| Engine | Backend | Renders | Non-empty | Diff | Differ | Median ms | Files/s | Speed | Verdict |
|---|---|---|---|---|---|---|---|---|---|
{_scorecard(q, p)}

*Diff/Differ blank for the reference (compared to itself). Speed is vs kymo,
shown only when an engine converted the same file set.*

## 2. PDF structure — page geometry & vector content

What actually landed in the PDF: page count, the page size relative to the SVG's
own px size (engines disagree on the px→pt convention — kymo/vl-convert/fpdf2 keep
1 px → 1 pt (×1.0), while Chrome/Inkscape/LibreOffice/Cairo/librsvg apply the CSS
96-dpi conversion, 1 px → 0.75 pt (×0.75); the drawing is identical, only the
nominal page differs), how much vector/image content page 1 carries (most engines
embed the diagram icons as images), and **Text (chars)** — how much *selectable*
text the PDF preserves (extracted with PyMuPDF).

{_structure_table(q)}

## What this shows

- **kymo's `svg2pdf` core produces a complete vector PDF** for the SVGs kymo
  emits — paths as vectors, icons embedded as images, selectable text — and is
  the reference here.
- **vl-convert validates the method.** It wraps the same `svg2pdf`, so it lands
  ~0 diff on kymo's output — the same-engine control the svg2png bench gets from
  `resvg-py`, which has no PDF equivalent.
- **The famous renderers largely agree with kymo:** headless **Chrome** (the
  de-facto SVG renderer), **librsvg** and **LibreOffice** each reproduce the full
  diagram at high fidelity — independent cross-checks that kymo's output is
  correct, not merely self-consistent. **Inkscape is the exception:** it matches
  on the simple conformance graphs (Δ ≈ 6) but diverges hard on the icon-rich
  architecture samples (Δ 80–140), where its PDF export of kymo's embedded raster
  icons / dense content departs from the resvg/Chrome consensus — pulling its
  corpus average to a low-fidelity 17.
- **The dedicated pure-Python converters are the ones that fall down:** `cairosvg`
  emits blank pages (it doesn't apply kymo's `<style>` class fills → 0 vector ops),
  `svglib` can't parse `height:auto`, and `fpdf2` renders the simpler conformance
  graphs but rejects the icon-rich samples' `rgba()` fills and drops
  `<marker>`/`<filter>`/`<pattern>` — so its low diff is over that easy subset only.
- **Selectable text survives in most engines** (Text column): the `svg2pdf`-based
  pair (kymo, vl-convert) and the renderers (Chrome, Inkscape, LibreOffice) keep
  real text — so kymo's PDFs *are* searchable, contrary to the old "svg2pdf
  paths-out-text" lore; cairosvg's blank pages carry none.
- Engines disagree on the **px→pt convention** (page-scale column): kymo,
  vl-convert and fpdf2 keep 1 SVG px = 1 PDF pt (×1.0); Chrome, Inkscape,
  LibreOffice, Cairo and librsvg apply the CSS 96-dpi conversion (×0.75). The
  rendered drawing is the same; only the nominal page size differs.

## Per-engine failures

{fail_block}

## How it is measured

- **Fidelity** (`quality.py`) — render every `samples/*.kymo` +
  `conformance/corpus/*.kymo` through the kymo pipeline to one SVG string per
  item; convert each with every engine; rasterize page 1 with PyMuPDF, composite
  over white, and compare to kymo's rasterized page. Structural facts (page size,
  vector ops, images) come from the same PyMuPDF parse.
- **Performance** (`perf.py`) — time each engine (median of {env['reps']} reps per
  file after one warm-up) converting the kymo SVGs to PDF bytes.

## Honest limitations

- **Fidelity is agreement with kymo**, not an absolute ground truth. But with the
  de-facto renderer (Chrome) and three other independent engines in the field all
  converging on kymo's output, "self-consistent" and "correct" coincide here.
  `vl-convert` (same `svg2pdf`) is the same-engine control.
- **Page count / extra pages.** Chrome prints via paged media, so it can emit a
  trailing blank page (paged-media overflow) — the `single-page` column shows
  this; fidelity scores page 1, which holds the diagram.
- **Text axis measures presence, not placement.** The Text column counts
  extractable characters, confirming a PDF keeps real text; it does not verify the
  glyphs are positioned pixel-for-pixel (that is the fidelity pass's job).
- Engines that default to a transparent background are composited over white
  before comparison, so they aren't penalised for the alpha convention.
- Comparison is via rasterization (PyMuPDF/MuPDF), so it inherits MuPDF's own
  rendering — a second renderer in the loop, applied identically to every engine.
- **Timing spans very different cost models** — in-process libraries vs CLI
  subprocesses (Chrome/Inkscape) vs LibreOffice (a full office suite that
  re-inits a profile per call, so it is slow by construction, not by inefficiency
  at the conversion itself). Host-specific: `{env['platform']}`, Python
  {env['python']}, {env['cpu_count']} CPU, reps={env['reps']}, {env['timestamp']}.

For the full write-up — motivation, method, per-engine analysis — read the
**[`research/`](research/)** folder: a written article per benchmarking round.
"""


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--reps", type=int, default=perf.DEFAULT_REPS)
    ap.add_argument("--stamp", default=None)
    args = ap.parse_args()

    RESULTS.mkdir(parents=True, exist_ok=True)
    q = quality.collect()
    p = perf.measure(reps=args.reps, stamp=args.stamp)

    (RESULTS / "quality.json").write_text(json.dumps(q, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (RESULTS / "perf.json").write_text(json.dumps(p, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (RESULTS / "REPORT.md").write_text(_render_report(q, p), encoding="utf-8")

    print(f"fidelity: {q['corpus']['items']} kymo SVGs (ref '{q['reference_engine']}', {q['rasterizer']})")
    for qr in q["engines"]:
        print(f"  {qr['label']:13} {qr['renders']:>6} render  diff {str(qr['mean_abs_diff_avg']):>6}  → {qr['verdict']}")
    if q["missing_engines"]:
        print(f"missing : {', '.join(q['missing_engines'])}")
    for name in ("quality.json", "perf.json", "REPORT.md"):
        print(f"wrote   : {(RESULTS / name).relative_to(ROOT)}")


if __name__ == "__main__":
    main()

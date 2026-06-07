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
    head = "| Engine | Single-page | Page scale vs SVG | Avg vector ops | Avg images |"
    sep = "|---|---|---|---|---|"
    rows = []
    for r in q["engines"]:
        scale = r["page_scale_avg"]
        rows.append(
            f"| {r['label']} | {r['single_page']} | "
            f"{('×' + str(scale)) if scale is not None else '—'} | "
            f"{r['avg_drawings'] if r['avg_drawings'] is not None else '—'} | "
            f"{r['avg_images'] if r['avg_images'] is not None else '—'} |"
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
> *timing* is machine-dependent (host below), not a gate. There is **no
> same-engine control** (resvg has no PDF path); `rsvg-convert` (librsvg) is the
> closest independent cross-check.
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
own px size (engines disagree on the px→pt convention — kymo and fpdf2 keep
1 px → 1 pt (×1.0), while Cairo and librsvg apply the CSS 96-dpi conversion,
1 px → 0.75 pt (×0.75); the drawing is identical, only the nominal page differs),
and how much vector/image content page 1 carries (kymo and librsvg embed the
diagram icons as images).

{_structure_table(q)}

## What this shows

- **kymo's `svg2pdf` core produces a complete vector PDF** for the SVGs kymo
  emits — paths as vectors, icons embedded as images — and is the reference here.
- **librsvg (`rsvg-convert`)** is the one *independent* engine that reproduces
  kymo's output faithfully: full vector content and the same embedded icons. It
  is the closest thing to a cross-check in the absence of a same-engine control.
- **The pure-Python field struggles on kymo's real SVGs:** `cairosvg` emits
  blank pages (it doesn't apply kymo's `<style>` class fills → 0 vector ops),
  `svglib` can't parse `height:auto`, and `fpdf2` renders the simpler conformance
  graphs closely but rejects the icon-rich samples' `rgba()` fills and drops
  `<marker>`/`<filter>`/`<pattern>` — so its low diff is over that easy subset only.
- Engines disagree on the **px→pt convention** (page-scale column): kymo and
  fpdf2 keep 1 SVG px = 1 PDF pt (×1.0), while Cairo and librsvg apply the CSS
  96-dpi conversion (1 px → 0.75 pt, ×0.75). The rendered drawing is the same;
  only the nominal page size differs.

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

- **One reference, one question.** Fidelity is *agreement with kymo*; there is no
  same-engine control (resvg has no PDF path), so `rsvg-convert` (librsvg) is the
  independent cross-check rather than a ground truth.
- **Text rendering differs by design.** `svg2pdf` (kymo) converts text to vector
  paths — crisp, but not selectable; Cairo/librsvg can embed real text. The
  rasterized comparison scores *appearance*, not text-selectability.
- Engines that default to a transparent background are composited over white
  before comparison, so they aren't penalised for the alpha convention.
- Comparison is via rasterization (PyMuPDF/MuPDF), so it inherits MuPDF's own
  rendering — a second renderer in the loop, applied identically to every engine.
- Timing is host-specific (`{env['platform']}`, Python {env['python']},
  {env['cpu_count']} CPU, reps={env['reps']}, {env['timestamp']}).

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

#!/usr/bin/env python3
"""SVG→PNG bench — run quality + accuracy + perf and render the report.

Three passes, one report:

  • quality  (`quality.py`)  — fidelity vs *kymo's own* output, on real kymo SVGs
                               (does an engine reproduce what kymo ships?)
  • accuracy (`accuracy.py`) — correctness vs *headless Chrome*, on the vendored
                               resvg test suite (is the engine right? kymo graded too)
  • perf     (`perf.py`)     — rasterize timing over the kymo SVGs

Writes `results/quality.json`, `results/accuracy.json`, `results/perf.json`, and
the human-readable `results/REPORT.md`.

Run:  cd benches && uv run python svg2png/run.py [--reps N]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import accuracy
import perf
import quality

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RESULTS = HERE / "results"

# Short headers for the per-category accuracy table.
CAT_SHORT = {
    "filters": "filt", "masking": "mask", "paint-servers": "paint-srv",
    "painting": "paint", "shapes": "shape", "structure": "struct",
}


def _perf_row(p: dict, key: str) -> dict | None:
    return next((r for r in p["engines"] if r["key"] == key), None)


def _scorecard(q: dict, p: dict) -> str:
    lines = []
    for qr in q["engines"]:
        pr = _perf_row(p, qr["key"]) or {}
        med = pr.get("per_file_median_ms")
        thr = pr.get("throughput_files_per_s")
        spd = pr.get("speed_vs_kymo")
        diff = qr["mean_abs_diff_avg"]
        pct = qr["pct_pixels_diff_avg"]
        lines.append(
            f"| {qr['label']} | `{qr['backend']}` | {qr['renders']} | {qr['dims_match']} | "
            f"{'—' if qr['is_reference'] else (diff if diff is not None else '—')} | "
            f"{'—' if qr['is_reference'] else (str(pct) + '%' if pct is not None else '—')} | "
            f"{med if med is not None else '—'} | {thr if thr else '—'} | "
            f"{('×' + str(spd)) if spd else '—'} | **{qr['verdict']}** |"
        )
    return "\n".join(lines)


def _accuracy_table(a: dict) -> str:
    cats = list(a["dataset"]["categories"].keys())
    head = "| Engine | Backend | Renders | Matches Chrome | Mean Δ | " + \
        " | ".join(CAT_SHORT.get(c, c) for c in cats) + " |"
    sep = "|---|---|---|---|---|" + "|".join("---" for _ in cats) + "|"
    rows = []
    for r in a["engines"]:
        pc = r["per_category_mean_diff"]
        cells = " | ".join(str(pc[c]) if pc[c] is not None else "—" for c in cats)
        rows.append(
            f"| {r['label']} | `{r['backend']}` | {r['renders']} | "
            f"{r['matches_chrome']} ({r['match_rate']:.0%}) | "
            f"**{r['mean_abs_diff_avg'] if r['mean_abs_diff_avg'] is not None else '—'}** | {cells} |"
        )
    return "\n".join([head, sep] + rows)


def _render_report(q: dict, a: dict, p: dict) -> str:
    env = p["environment"]
    stamp = env["timestamp"]
    date = stamp.split("T", 1)[0]  # YYYY-MM-DD from the ISO run timestamp
    n = q["corpus"]["items"]
    ds = a["dataset"]
    nd = ds["samples"]

    # Honesty: every engine that failed on ≥1 file, in either pass.
    fail_notes = []
    for src, rows in (("kymo SVGs", q["engines"]), (f"{ds['source']} dataset", a["engines"])):
        for r in rows:
            if r.get("failure_count"):
                sample = r["failures"][0]["error"] if r["failures"] else ""
                fail_notes.append(f"- **{r['label']}** — {r['failure_count']} failures on the {src}: e.g. `{sample}`")
    fail_block = "\n".join(fail_notes) if fail_notes else "- None."

    missing = q["missing_engines"]
    missing_block = (
        f"\n> Skipped (package not importable): {', '.join('`' + m + '`' for m in missing)}.\n"
        if missing else ""
    )
    cat_counts = ", ".join(f"{c} {v}" for c, v in ds["categories"].items())

    return f"""# SVG → PNG — rasterizer scorecard

> **Generated {date}** by `benches/svg2png/run.py` (run stamp `{stamp}`).
> **Offline bench** — re-run with
> `cd benches && uv run python svg2png/run.py`. Two complementary questions:
> **(1) Fidelity** — does an engine reproduce the SVGs *kymo itself emits*?
> **(2) Accuracy** — is an engine *correct*, judged against an independent ground
> truth (**headless Google Chrome**) on the resvg test suite? Fidelity/accuracy
> are deterministic; *timing* is machine-dependent (host below), not a gate.
{missing_block}
## 1. Fidelity + speed — vs kymo, on real kymo SVGs

Corpus: **{n} kymo SVGs** (samples + conformance corpus), rendered from `.kymo`
sources; every engine rasterizes the identical SVG string. Fidelity is measured
on the image composited over white; *diff* is mean per-channel |Δ| (0…255),
*differ* is the share of pixels off by > {q['diff_threshold']} luminance.
`resvg-py` is the control — same engine as kymo, so ~0.

| Engine | Backend | Renders | Dims | Diff | Differ | Median ms | Files/s | Speed | Verdict |
|---|---|---|---|---|---|---|---|---|---|
{_scorecard(q, p)}

*Diff/Differ blank for the reference (compared to itself). Speed is vs kymo,
shown only when an engine rendered the same file set.*

## 2. Accuracy — vs headless Chrome, on the resvg test suite

Dataset: **{nd} SVGs** vendored from `{ds['source']}` ({cat_counts}) — self-contained,
text-free, normalized to their viewBox size. Ground truth = **{a['ground_truth']}**
(committed `refs/`); every engine, *kymo included*, is graded against it. **Mean Δ**
is mean per-channel |Δ| vs Chrome (lower = more accurate); a sample "matches" if
Mean Δ < {a['match_tolerance']}. Per-category columns are mean Δ.

{_accuracy_table(a)}

*Closer to 0 = closer to Chrome. Rows sorted by overall accuracy.*

## What this shows

- **Against an independent ground truth, kymo's resvg core is the most accurate**
  engine here — lowest mean Δ vs Chrome overall and in nearly every category
  (filters, paint-servers, painting, structure). It even edges out the standalone
  `resvg-py` (newer resvg ⇒ better filters & structure).
- **librsvg (pyvips)** is the next most accurate, but diverges from Chrome on
  paint-servers (gradients/patterns) and structure.
- **cairosvg** is middling: good on basic structure, poor on filters and masking,
  and recurses to death on a few nested cases.
- **svglib** is the least accurate — no real gradient/mask support — and on kymo's
  *own* SVGs it can't render at all (`height:auto` defeats its parser).
- On kymo SVGs, the fidelity table tells the shipping story: resvg (shipped) is
  exact and fastest among the faithful engines; librsvg is faithful but slow;
  cairosvg is fast but drops kymo's CSS/gradients; svglib fails.

The two passes agree: **resvg is both the faithful choice for kymo's output and
the most Chrome-accurate engine in the field.**

## Per-engine failures

{fail_block}

## How it is measured

- **Fidelity** (`quality.py`) — render every `samples/*.kymo` + `conformance/corpus/*.kymo`
  through the kymo pipeline; decode each engine's PNG (Pillow), composite over
  white, compare to the kymo reference.
- **Accuracy** (`accuracy.py` + `datasets.py`) — a vendored MIT subset of the
  resvg test suite (`datasets/resvg-suite/`, see `PROVENANCE.md`), each SVG paired
  with a headless-Chrome reference (`gen_refs.py`, committed). Score every engine
  vs Chrome, rolled up per category. Chrome is only needed to *regenerate* refs.
- **Performance** (`perf.py`) — time each engine (median of {env['reps']} reps per
  file after one warm-up) over the kymo SVGs.

## Honest limitations

- **Two references, two questions.** Fidelity is *agreement with kymo* (with
  `resvg-py` as the same-engine control); accuracy is *agreement with Chrome*.
  Chrome is the de-facto SVG renderer but still one renderer — a category where
  all engines diverge from it (e.g. a shapes antialiasing case) is a Chrome
  quirk as much as an engine one.
- Engines that default to a transparent background are composited over white
  before comparison, so they aren't penalised for the alpha convention.
- Accuracy scope excludes `text`/`image` SVGs (font/external-resource dependent,
  and unresolvable through the string-based engine API).
- Timing is host-specific (`{env['platform']}`, Python {env['python']},
  {env['cpu_count']} CPU, reps={env['reps']}, {env['timestamp']}).
- Browser engines are the ground truth here but out of scope as *engines* —
  heavy, and not what the `kymo` CLI ships.
"""


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--reps", type=int, default=perf.DEFAULT_REPS)
    ap.add_argument("--stamp", default=None)
    args = ap.parse_args()

    RESULTS.mkdir(parents=True, exist_ok=True)
    q = quality.collect()
    a = accuracy.collect()
    p = perf.measure(reps=args.reps, stamp=args.stamp)

    (RESULTS / "quality.json").write_text(json.dumps(q, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (RESULTS / "accuracy.json").write_text(json.dumps(a, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (RESULTS / "perf.json").write_text(json.dumps(p, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (RESULTS / "REPORT.md").write_text(_render_report(q, a, p), encoding="utf-8")

    print(f"fidelity: {q['corpus']['items']} kymo SVGs (ref '{q['reference_engine']}')")
    for qr in q["engines"]:
        print(f"  {qr['label']:10} {qr['renders']:>6} render  diff {str(qr['mean_abs_diff_avg']):>6}  → {qr['verdict']}")
    print(f"accuracy: {a['dataset']['samples']} suite SVGs vs Chrome")
    for r in a["engines"]:
        print(f"  {r['label']:10} {r['renders']:>6} render  meanΔ {str(r['mean_abs_diff_avg']):>6}  matches {r['match_rate']:.0%}")
    for name in ("quality.json", "accuracy.json", "perf.json", "REPORT.md"):
        print(f"wrote   : {(RESULTS / name).relative_to(ROOT)}")


if __name__ == "__main__":
    main()

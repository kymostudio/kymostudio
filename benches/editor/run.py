#!/usr/bin/env python3
"""editor bench — run quality + perf and render the report.

Two passes, one report:

  • quality (`quality.py`) — does a cold first load CONTAIN the right things:
                             diagram present, every label survives the SVG
                             sanitizer, wasm engine chunk fetched only for the
                             kymo DSL, early kroki kick-off adopted
  • perf    (`perf.py`)    — how fast that load is on throttled Fast 4G:
                             time to first diagram, kroki request window, bytes

Writes `results/quality.json`, `results/perf.json`, and the human-readable
`results/REPORT.md`.

This bench is ONLINE (deployed editor + live kroki.io) — run it after an
editor deploy, then write up the round in `research/` if anything moved.

Run:  cd benches && uv run python editor/run.py [--reps N] [--base-url U] [--channel chrome]
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

import perf
import quality
import scenarios

HERE = Path(__file__).resolve().parent
RESULTS = HERE / "results"
REPORTS = HERE / "reports"


def _fmt(v) -> str:
    return "—" if v is None else f"{v:,}"


_MARK = {"good": " 🟢", "needs-improvement": " 🟡", "poor": " 🔴"}


def _graded(metric: str, value) -> str:
    return _fmt(value) + _MARK.get(scenarios.grade(metric, value) or "", "")


def _report(q: dict, p: dict) -> str:
    m = p["meta"]
    lines = [
        "# editor bench — share-link first load",
        "",
        f"*{m['timestamp']} · {m['base_url']} · {m['host']} ({m['platform']}) · "
        f"{m['browser_channel']} · Fast 4G throttle ({m['throttle']['latency']} ms RTT, "
        f"{m['throttle']['downloadThroughput'] * 8 // 1000:,} kbit/s down)*",
        "",
        "Snapshot, not a gate: the editor is deployed software and kroki.io is a live",
        "third-party renderer — timing varies with the network and with kroki's queue.",
        "",
        "## Quality — what a cold load contains",
        "",
        "| Scenario | OK | Diagram | Labels | Engine chunk | Notes |",
        "|---|---|---|---|---|---|",
    ]
    for r in q["scenarios"]:
        c = r["checks"]
        notes = []
        if r["missing_labels"]:
            notes.append("missing: " + ", ".join(r["missing_labels"][:3]))
        if r["infra_error"]:
            notes.append("kroki infra error: " + r["status"][:60])
        if "early_adopted" in c:
            notes.append("early kick-off " + ("adopted" if c["early_adopted"] else "NOT adopted"))
        lines.append(
            f"| {r['key']} | {'✅' if r['ok'] else ('⚠️ infra' if r['infra_error'] else '❌')} "
            f"| {'✅' if c['rendered'] else '❌'} | {'✅' if c['labels'] else '❌'} "
            f"| {'fetched' if r['engine_fetched'] else 'not fetched'} {'✅' if c['engine_chunk'] else '❌'} "
            f"| {'; '.join(notes) or '—'} |"
        )
    lines += [
        "",
        "## Performance — cold load on Fast 4G (medians)",
        "",
        "| Scenario | reps (failed) | TTFB_MS | FCP_MS | KROKI_SENT_MS | KROKI_DONE_MS | **DIAGRAM_VISIBLE_MS** | WIRE_TOTAL_KB (WIRE_ENGINE_KB) |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for r in p["scenarios"]:
        md = r["median"]
        lines.append(
            f"| {r['key']} | {r['reps']} ({r['failed_reps']}) | {_graded('TTFB_MS', md['TTFB_MS'])} ms | {_graded('FCP_MS', md['FCP_MS'])} ms "
            f"| {_graded('KROKI_SENT_MS', md['KROKI_SENT_MS'])} ms | {_fmt(md['KROKI_DONE_MS'])} ms | **{_graded('DIAGRAM_VISIBLE_MS', md['DIAGRAM_VISIBLE_MS'])} ms** "
            f"| {_graded('WIRE_TOTAL_KB', md['WIRE_TOTAL_KB'])} ({_fmt(md['WIRE_ENGINE_KB'])}) |"
        )
    lines += [
        "",
        "Metric of record is **DIAGRAM_VISIBLE_MS** — first SVG in the preview pane.",
        "`KROKI_DONE_MS − KROKI_SENT_MS` is kroki.io's own server-side render; the",
        "editor controls everything to the left of it (see `research/` for the analyses).",
        "",
        "## Baselines",
        "",
        "Medians are graded 🟢 good / 🟡 needs improvement / 🔴 poor against:",
        "",
        "| Metric | 🟢 ≤ | 🔴 > | Source |",
        "|---|---|---|---|",
    ]
    for m, (good_max, poor_min) in scenarios.BASELINES.items():
        unit = "KB" if m.endswith("_KB") else "ms"
        src = {
            "TTFB_MS": "[web.dev/ttfb](https://web.dev/articles/ttfb)",
            "FCP_MS": "[web.dev/fcp](https://web.dev/articles/fcp)",
            "DIAGRAM_VISIBLE_MS": "LCP budget, [web.dev/lcp](https://web.dev/articles/lcp) — the diagram is the page's largest contentful element",
            "KROKI_SENT_MS": "house: under 1 s = the inline kick-off beat the bundle (no public standard)",
            "WIRE_TOTAL_KB": "house, anchored to the ~2.4 MB median page — [HTTP Archive Web Almanac 2025](https://almanac.httparchive.org/en/2025/page-weight)",
        }[m]
        lines.append(f"| {m} | {good_max:,} {unit} | {poor_min:,} {unit} | {src} |")
    lines += [
        "",
        "KROKI_DONE_MS is ungraded (kroki.io's server-side render — a third party's",
        "number); WIRE_ENGINE_KB is pass/fail per scenario in the quality pass. Google",
        "defines its buckets on the 75th percentile of *field* data; this bench grades",
        "the median of N *throttled lab* loads — a stricter network than typical field",
        "traffic, so a 🟡 here is not a CrUX 🟡.",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--reps", type=int, default=perf.DEFAULT_REPS)
    ap.add_argument("--base-url", default=scenarios.DEFAULT_BASE_URL)
    ap.add_argument("--channel", default="chrome", help="Playwright browser channel ('' = bundled chromium)")
    args = ap.parse_args()

    RESULTS.mkdir(exist_ok=True)
    q = quality.measure(args.base_url, args.channel)
    (RESULTS / "quality.json").write_text(json.dumps(q, indent=2, ensure_ascii=False) + "\n")
    p = perf.measure(args.base_url, args.channel, args.reps)
    (RESULTS / "perf.json").write_text(json.dumps(p, indent=2) + "\n")
    report = _report(q, p)
    (RESULTS / "REPORT.md").write_text(report)

    # results/ is overwritten every run — archive each run under reports/ so
    # rounds stay comparable. Named by the run's UTC timestamp; rename to an
    # rN-<slug> folder (and index it in reports/README.md) when the run earns
    # a research article.
    stamp = p["meta"]["timestamp"].replace(":", "").replace("+0000", "Z")
    archive = REPORTS / stamp
    archive.mkdir(parents=True, exist_ok=True)
    for f in ("REPORT.md", "perf.json", "quality.json"):
        shutil.copy2(RESULTS / f, archive / f)
    print(f"\narchived -> reports/{stamp}/")
    print(report)


if __name__ == "__main__":
    main()

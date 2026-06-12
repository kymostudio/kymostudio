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
from pathlib import Path

import perf
import quality
import scenarios

HERE = Path(__file__).resolve().parent
RESULTS = HERE / "results"


def _fmt(v) -> str:
    return "—" if v is None else f"{v:,}"


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
        "| Scenario | reps (failed) | TTFB | FCP | kroki sent | kroki done | **diagram visible** | wire KB (engine KB) |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for r in p["scenarios"]:
        md = r["median"]
        lines.append(
            f"| {r['key']} | {r['reps']} ({r['failed_reps']}) | {_fmt(md['ttfb_ms'])} ms | {_fmt(md['fcp_ms'])} ms "
            f"| {_fmt(md['kroki_start_ms'])} ms | {_fmt(md['kroki_end_ms'])} ms | **{_fmt(md['diagram_ms'])} ms** "
            f"| {_fmt(md['transfer_kb_total'])} ({_fmt(md['engine_transfer_kb'])}) |"
        )
    lines += [
        "",
        "Metric of record is **diagram visible** — first SVG in the preview pane.",
        "`kroki done − kroki sent` is kroki.io's own server-side render; the editor",
        "controls everything to the left of it (see `research/` for the analyses).",
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
    print(report)


if __name__ == "__main__":
    main()

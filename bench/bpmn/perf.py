#!/usr/bin/env python3
"""BPMN bench — PERFORMANCE timing (Rust-criterion-style, informational).

Times the BPMN front-end of the kymo pipeline over the vendored MIWG corpus
(`packages/python/tests/corpus_bpmn/*.bpmn`, ~120 real tool exports, read in
place — the same files the corpus-regression test uses):

  • parse   — from_bpmn.parse(text)  → resolved Diagram (DI geometry, no layout)
  • render  — to_svg.render(diagram) → SVG bytes

Per file we take the median of N reps (one warm-up pass first). Aggregate stats
are median / p95 per-file and total-pass throughput.

These numbers are MACHINE-DEPENDENT — the committed `results/perf.json` is a
reference snapshot stamped with the host environment, NOT a pass/fail gate (the
correctness gate lives in `quality.py` + the test suites). Compare runs on the
same host to spot regressions.

Run standalone:  python bpmn/perf.py [--reps N]   # writes results/perf.json
Or import:       from perf import measure          # returns the metrics dict
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path

from kymo import __version__ as KYMO_VERSION
from kymo import parse_bpmn, render

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RESULTS = HERE / "results"
CORPUS = ROOT / "packages/python/tests/corpus_bpmn"

DEFAULT_REPS = 5


def _p95(values: list[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = max(0, min(len(ordered) - 1, round(0.95 * (len(ordered) - 1))))
    return ordered[idx]


def _time_file(text: str, reps: int) -> tuple[float, float, bool]:
    """Return (median parse_ms, median render_ms, rendered?) for one file.

    Mirrors the corpus-regression rule: a file that imports to an empty model
    (no components and no edges) has nothing to render, so render is skipped.
    """
    parse_ms: list[float] = []
    render_ms: list[float] = []
    rendered = False
    for _ in range(reps):
        t0 = time.perf_counter_ns()
        diagram = parse_bpmn(text)
        t1 = time.perf_counter_ns()
        parse_ms.append((t1 - t0) / 1e6)
        if diagram.components or diagram.edges:
            rendered = True
            r0 = time.perf_counter_ns()
            render(diagram)
            r1 = time.perf_counter_ns()
            render_ms.append((r1 - r0) / 1e6)
    return (
        statistics.median(parse_ms),
        statistics.median(render_ms) if render_ms else 0.0,
        rendered,
    )


def measure(reps: int = DEFAULT_REPS, stamp: str | None = None) -> dict:
    files = sorted(CORPUS.glob("*.bpmn"))
    if not files:
        raise SystemExit(f"no .bpmn files under {CORPUS}")

    # Warm-up pass (prime caches, import-time icon loads) — not measured.
    for path in files:
        _time_file(path.read_text(encoding="utf-8", errors="replace"), reps=1)

    per_total: list[float] = []
    parse_total = render_total = 0.0
    n_rendered = 0
    for path in files:
        text = path.read_text(encoding="utf-8", errors="replace")
        p_ms, r_ms, rendered = _time_file(text, reps)
        per_total.append(p_ms + r_ms)
        parse_total += p_ms
        render_total += r_ms
        n_rendered += int(rendered)

    total_pass = parse_total + render_total
    return {
        "generated_by": "bench/bpmn/perf.py",
        "environment": {
            "platform": platform.platform(),
            "python": platform.python_version(),
            "kymo_version": KYMO_VERSION,
            "cpu_count": os.cpu_count(),
            "reps": reps,
            "timestamp": stamp or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
        "corpus": {
            "dir": str(CORPUS.relative_to(ROOT)),
            "files": len(files),
            "rendered": n_rendered,
        },
        "timing_ms": {
            "total_pass": round(total_pass, 2),
            "parse_total": round(parse_total, 2),
            "render_total": round(render_total, 2),
            "per_file_median": round(statistics.median(per_total), 3),
            "per_file_p95": round(_p95(per_total), 3),
        },
        "throughput_files_per_s": round(len(files) / (total_pass / 1000), 1) if total_pass else 0.0,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--reps", type=int, default=DEFAULT_REPS, help="median over N reps per file")
    ap.add_argument("--stamp", default=None, help="override the timestamp (ISO 8601)")
    args = ap.parse_args()

    RESULTS.mkdir(parents=True, exist_ok=True)
    data = measure(reps=args.reps, stamp=args.stamp)
    (RESULTS / "perf.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    t, c = data["timing_ms"], data["corpus"]
    print(f"corpus    : {c['files']} files ({c['rendered']} rendered), reps={data['environment']['reps']}")
    print(f"per-file  : median {t['per_file_median']} ms, p95 {t['per_file_p95']} ms")
    print(f"full pass : {t['total_pass']} ms "
          f"(parse {t['parse_total']} + render {t['render_total']}), "
          f"{data['throughput_files_per_s']} files/s")
    print(f"wrote     : {(RESULTS / 'perf.json').relative_to(ROOT)}")


if __name__ == "__main__":
    main()

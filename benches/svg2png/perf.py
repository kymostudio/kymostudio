#!/usr/bin/env python3
"""SVG→PNG bench — PERFORMANCE timing across rasterizer engines.

Times every available engine (see ``engines.py``) rasterizing every corpus SVG
(see ``corpus.py``). Per (engine, SVG) we take the median of N reps after one
un-timed warm-up; an engine that *raises* on an SVG contributes no timing for
that file (its failures are the quality bench's story, not the perf bench's).

Aggregate, per engine: median & p95 per-file ms, total wall over the files it
rendered, throughput in files/s and megapixels/s, and speed relative to the
``kymo`` reference. These numbers are MACHINE-DEPENDENT — the committed
``results/perf.json`` is a reference snapshot stamped with the host, NOT a gate.

Run standalone:  uv run python svg2png/perf.py [--reps N]
Or import:       from perf import measure
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import statistics
import struct
import time
from datetime import datetime, timezone
from pathlib import Path

import corpus
import engines

from kymo import __version__ as KYMO_VERSION

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RESULTS = HERE / "results"

DEFAULT_REPS = 7


def _png_pixels(png: bytes) -> int:
    """Pixel count from the PNG IHDR (width·height at bytes 16..24)."""
    if len(png) < 24 or png[:8] != b"\x89PNG\r\n\x1a\n":
        return 0
    w, h = struct.unpack(">II", png[16:24])
    return w * h


def _p95(values: list[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = max(0, min(len(ordered) - 1, round(0.95 * (len(ordered) - 1))))
    return ordered[idx]


def _time_engine(engine: engines.Engine, items: list[corpus.Item], reps: int) -> dict:
    per_file: list[float] = []       # median ms per successfully-rendered file
    pixels = 0
    ok = 0
    fail = 0
    for item in items:
        # Warm-up (prime caches / one-time loads) — not measured. A failure here
        # means the engine can't render this file: count it and move on.
        try:
            engine.render(item.svg, item.svg_bytes)
        except Exception:
            fail += 1
            continue
        samples: list[float] = []
        for _ in range(reps):
            t0 = time.perf_counter_ns()
            png = engine.render(item.svg, item.svg_bytes)
            t1 = time.perf_counter_ns()
            samples.append((t1 - t0) / 1e6)
        per_file.append(statistics.median(samples))
        pixels += _png_pixels(png)
        ok += 1

    total_ms = sum(per_file)
    return {
        "key": engine.key,
        "label": engine.label,
        "backend": engine.backend,
        "rendered": ok,
        "failed": fail,
        "total_ms": round(total_ms, 2),
        "per_file_median_ms": round(statistics.median(per_file), 3) if per_file else None,
        "per_file_p95_ms": round(_p95(per_file), 3) if per_file else None,
        "throughput_files_per_s": round(ok / (total_ms / 1000), 1) if total_ms else 0.0,
        "throughput_mpix_per_s": round((pixels / 1e6) / (total_ms / 1000), 1) if total_ms else 0.0,
        "_total_ms": total_ms,  # kept for relative-speed math; stripped before write
    }


def measure(reps: int = DEFAULT_REPS, stamp: str | None = None) -> dict:
    items = corpus.build()
    engs = engines.available_engines()

    rows = [_time_engine(e, items, reps) for e in engs]

    # Relative speed vs the reference, computed over the files BOTH rendered so
    # the ratio isn't skewed by an engine that simply rendered fewer files.
    ref = next((r for r in rows if r["key"] == engines.REFERENCE_KEY), None)
    for r in rows:
        if ref and r["_total_ms"] and ref["_total_ms"] and r["rendered"] == ref["rendered"]:
            r["speed_vs_kymo"] = round(ref["_total_ms"] / r["_total_ms"], 2)
        else:
            r["speed_vs_kymo"] = None
    for r in rows:
        r.pop("_total_ms", None)

    return {
        "generated_by": "benches/svg2png/perf.py",
        "environment": {
            "platform": platform.platform(),
            "python": platform.python_version(),
            "kymo_version": KYMO_VERSION,
            "cpu_count": os.cpu_count(),
            "reps": reps,
            "timestamp": stamp or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
        "corpus": {"items": len(items)},
        "engines": rows,
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
    print(f"corpus  : {data['corpus']['items']} SVGs, reps={data['environment']['reps']}")
    for r in data["engines"]:
        med = r["per_file_median_ms"]
        spd = r["speed_vs_kymo"]
        print(f"  {r['label']:10} {r['rendered']:>2}/{r['rendered']+r['failed']:<2} ok  "
              f"median {med if med is not None else '-':>7} ms  "
              f"{r['throughput_files_per_s']:>6} files/s  "
              f"{('×'+str(spd)) if spd else '—':>7} vs kymo")
    print(f"wrote   : {(RESULTS / 'perf.json').relative_to(ROOT)}")


if __name__ == "__main__":
    main()

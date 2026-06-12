#!/usr/bin/env python3
"""editor bench — PERFORMANCE of a cold first load on throttled Fast 4G.

Per scenario, N cold loads (fresh browser context each — no HTTP cache, no
storage) under the Chrome DevTools "Fast 4G" network conditions, then medians
over the loads that settled successfully:

  • ttfb_ms          — navigation responseStart
  • fcp_ms           — first contentful paint (the editor chrome, not the diagram)
  • kroki_start_ms   — when the render POST left the browser; the early-kick-off
                       work (PR #282) exists to pull this number down
  • kroki_end_ms     — when kroki's SVG finished arriving (includes kroki's own
                       server-side render — out of our control)
  • diagram_ms       — first SVG visible in the preview pane: the number a
                       share-link visitor actually feels
  • transfer_kb      — total bytes on the wire (engine chunk counted separately)

These numbers are MACHINE- and NETWORK-DEPENDENT, and kroki.io's queue adds
real variance — the committed ``results/perf.json`` is a snapshot stamped with
the host, NOT a gate. Failed loads (kroki 5xx etc.) are dropped from the
medians and reported as ``failed_reps``.

Run standalone:  cd benches && uv run python editor/perf.py [--reps N] [--base-url U] [--channel chrome]
Or import:       from perf import measure
"""
from __future__ import annotations

import argparse
import json
import platform
import statistics
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

import scenarios

HERE = Path(__file__).resolve().parent
RESULTS = HERE / "results"

DEFAULT_REPS = 5
METRICS = ["ttfb_ms", "fcp_ms", "kroki_start_ms", "kroki_end_ms", "diagram_ms", "transfer_kb_total", "engine_transfer_kb"]


def _median(rows: list[dict], key: str) -> int | None:
    vals = [r[key] for r in rows if r.get(key) is not None]
    return round(statistics.median(vals)) if vals else None


def measure(base_url: str, channel: str | None, reps: int) -> dict:
    out: list[dict] = []
    with sync_playwright() as pw:
        browser = scenarios.launch_browser(pw, channel)
        try:
            for scn in scenarios.SCENARIOS:
                runs = [scenarios.load_once(browser, base_url, scn, throttle=True) for _ in range(reps)]
                good = [r for r in runs if r["ok"]]
                out.append({
                    "key": scn["key"],
                    "title": scn["title"],
                    "reps": reps,
                    "failed_reps": reps - len(good),
                    "median": {m: _median(good, m) for m in METRICS},
                    "engine_fetched": any(r["engine_fetched"] for r in runs),
                    "runs": [{m: r.get(m) for m in METRICS + ["ok"]} for r in runs],
                })
        finally:
            browser.close()
    return {
        "meta": {
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "base_url": base_url,
            "host": platform.node(),
            "platform": platform.platform(),
            "python": platform.python_version(),
            "browser_channel": channel or "chromium (bundled)",
            "throttle": scenarios.THROTTLE,
        },
        "scenarios": out,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--reps", type=int, default=DEFAULT_REPS)
    ap.add_argument("--base-url", default=scenarios.DEFAULT_BASE_URL)
    ap.add_argument("--channel", default="chrome", help="Playwright browser channel ('' = bundled chromium)")
    args = ap.parse_args()
    result = measure(args.base_url, args.channel, args.reps)
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "perf.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

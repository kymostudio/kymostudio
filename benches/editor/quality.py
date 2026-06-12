#!/usr/bin/env python3
"""editor bench — CORRECTNESS of a cold first load.

One throttle-free cold load per scenario (correctness shouldn't wait out the
modem simulation), graded on what the load *contains* rather than how fast it
was:

  • rendered      — a diagram SVG actually appeared in the preview pane
  • labels        — every expected node/edge label survived into the preview.
                    This is the regression probe for the kroki SVG sanitizer:
                    DOMPurify used to strip <foreignObject>, which silently
                    deleted every mermaid label while still "rendering fine"
                    (fixed 2026-06-12, PR #279).
  • engine chunk  — the ~2.5 MB wasm chunk is fetched for the kymo DSL and ONLY
                    for the kymo DSL; a kroki share link paying for it is the
                    first-load regression fixed in PR #282.
  • early adopt   — on share links, index.html's inline kroki kick-off fired
                    and renderKroki() consumed it (window.__earlyKroki is gone).

kroki.io is a live third-party service; a scenario that fails with a kroki
server error is reported as ``infra_error`` rather than a quality failure, and
retried once.

Run standalone:  cd benches && uv run python editor/quality.py [--base-url U] [--channel chrome]
Or import:       from quality import measure
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

import scenarios

HERE = Path(__file__).resolve().parent
RESULTS = HERE / "results"

RETRIES = 1  # re-run a scenario once if it failed on a kroki server error


def _grade(scn: dict, obs: dict) -> dict:
    missing = [l for l in scn["expect_labels"] if l not in obs["preview_text"]]
    checks = {
        "rendered": obs["diagram_ms"] is not None,
        "labels": not missing,
        "engine_chunk": obs["engine_fetched"] == scn["expect_engine_chunk"],
    }
    if scn["expect_early_adopted"] is True:
        checks["early_adopted"] = obs["early_kroki"] == "undefined" and obs["diagram_ms"] is not None
    return {
        "key": scn["key"],
        "title": scn["title"],
        "ok": all(checks.values()),
        "checks": checks,
        "missing_labels": missing,
        "engine_fetched": obs["engine_fetched"],
        "status": obs["status"],
        "share_error": obs["share_error"],
        "infra_error": bool(obs["status_error"]) and obs["diagram_ms"] is None,
    }


def measure(base_url: str, channel: str | None) -> dict:
    rows = []
    with sync_playwright() as pw:
        browser = scenarios.launch_browser(pw, channel)
        try:
            for scn in scenarios.SCENARIOS:
                for attempt in range(RETRIES + 1):
                    obs = scenarios.load_once(browser, base_url, scn, throttle=False)
                    row = _grade(scn, obs)
                    if not row["infra_error"] or attempt == RETRIES:
                        break
                rows.append(row)
        finally:
            browser.close()
    return {"base_url": base_url, "scenarios": rows, "ok": all(r["ok"] or r["infra_error"] for r in rows)}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base-url", default=scenarios.DEFAULT_BASE_URL)
    ap.add_argument("--channel", default="chrome", help="Playwright browser channel ('' = bundled chromium)")
    args = ap.parse_args()
    result = measure(args.base_url, args.channel)
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "quality.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

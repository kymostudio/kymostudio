#!/usr/bin/env python3
"""editor tab-switch bench — perceived OPEN latency per file.

For each file open, the thing a user actually feels — measured from the click:

  • code_ms   — until the SOURCE is visible in the editor pane (CodeMirror shows
                this file's text, replacing whatever was there).
  • image_ms  — until the DIAGRAM first appears in the preview (first SVG paint —
                the moment the user sees the picture / the entry animation starts).
  • anim_ms   — until the diagram is fully settled INCLUDING its animation
                (all CSS/SMIL/Web animations under the preview SVG have finished).
                For static kinds (kroki/mermaid) this ≈ image_ms; for animated
                kymo SVGs it's image_ms + the entry-animation duration.

Two phases per target: COLD (first open, from the Explorer) and WARM (switch back
to it after visiting the others). Medians over --reps sessions.

ONLINE + AUTHENTICATED: drives the DEPLOYED editor signed in as the real owner via
a Playwright storageState (.auth/state.json — a real ~1h Google id_token,
gitignored, never committed; re-capture when it expires). Numbers move with the
network + render.kymo.studio's edge cache, so results/ is a dated snapshot.

Run:  cd benches/editor/tab-switch && uv run python bench.py [--reps N]
"""
from __future__ import annotations

import argparse
import json
import platform
import statistics
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
STATE = HERE / ".auth" / "state.json"
RESULTS = HERE / "results"

BASE_URL = "https://editor.kymo.studio"
PROJECT = "63b6cc41"
METRICS = ["code_ms", "image_ms", "anim_ms"]

# Distinct, unambiguously-named diagrams in the owner's prod project — one per
# render path. kymo emits an animated SVG (anim_ms > image_ms); kroki/mermaid are
# static (anim_ms ≈ image_ms).
TARGETS = [
    {"name": "C4 System Context", "kind": "c4plantuml"},
    {"name": "MCP live-sync sequence", "kind": "mermaid"},
    {"name": "React OK", "kind": "kymo"},
]

# Measures one open of `name` from the click. Captures a baseline of the current
# code/preview first, so it waits for THIS file's content (not the outgoing tab's
# leftovers) to appear, then for its animation to settle.
_MEASURE_JS = """
async (timeout) => {
  const t0 = window.__t0, base = window.__base, deadline = t0 + timeout;
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const codeNow = () => (document.querySelector('.cm-content')?.textContent || '');
  const svgLen  = () => (document.querySelector('#preview svg')?.outerHTML.length || 0);
  const waitFor = async (cond) => {
    while (performance.now() < deadline) { if (cond()) return Math.round(performance.now() - t0); await raf(); }
    return null;
  };
  // New file's code shown = cm-content non-empty AND different from the outgoing tab.
  const code_ms  = await waitFor(() => { const c = codeNow(); return c.trim().length > 0 && c !== base.code; });
  // New diagram painted = a preview <svg> whose markup differs from the outgoing one.
  const image_ms = await waitFor(() => { const l = svgLen(); return l > 0 && l !== base.svg; });
  // Animation settled = every animation under the preview SVG has finished.
  let anim_ms = image_ms, anim_count = 0;
  try {
    const svg = document.querySelector('#preview svg');
    const anims = svg && svg.getAnimations ? svg.getAnimations({ subtree: true }) : [];
    anim_count = anims.length;
    if (anims.length) {
      await Promise.race([
        Promise.all(anims.map(a => a.finished.catch(() => {}))),
        new Promise(r => setTimeout(r, Math.max(0, deadline - performance.now()))),
      ]);
      anim_ms = Math.round(performance.now() - t0);
    }
  } catch (e) {}
  return { code_ms, image_ms, anim_ms, anim_count };
}
"""


def _activate(page, name: str):
    """Open/switch to a diagram: its tab if already open, else its Explorer row."""
    tab = page.get_by_role("tab", name=name)
    if tab.count():
        tab.first.click()
    else:
        page.locator(".sb-file", has_text=name).first.click()


def _measure(page, name: str, timeout_ms: int = 15000) -> dict:
    base = page.evaluate(
        "() => ({ code: (document.querySelector('.cm-content')?.textContent || ''),"
        "         svg: (document.querySelector('#preview svg')?.outerHTML.length || 0) })"
    )
    page.evaluate("(b) => { window.__t0 = performance.now(); window.__base = b; }", base)
    _activate(page, name)
    return page.evaluate(_MEASURE_JS, timeout_ms)


def run_session(browser) -> list[dict]:
    ctx = browser.new_context(storage_state=str(STATE))
    page = ctx.new_page()
    try:
        page.goto(f"{BASE_URL}/?p={PROJECT}", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector(".sb-file", timeout=30000)  # Explorer populated → signed in
        rows = []
        for t in TARGETS:  # COLD: first open of each (via Explorer)
            rows.append({"name": t["name"], "kind": t["kind"], "phase": "cold", **_measure(page, t["name"])})
        for t in TARGETS:  # WARM: switch back to each (now an open tab)
            rows.append({"name": t["name"], "kind": t["kind"], "phase": "warm", **_measure(page, t["name"])})
        return rows
    finally:
        ctx.close()


def _med(rows, key):
    vals = [r[key] for r in rows if r.get(key) is not None]
    return round(statistics.median(vals)) if vals else None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--reps", type=int, default=3)
    ap.add_argument("--channel", default="chrome", help="Playwright channel ('' = bundled chromium)")
    args = ap.parse_args()

    if not STATE.exists():
        raise SystemExit(f"missing {STATE} — capture a logged-in storageState first (see README).")

    all_rows: list[dict] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel=args.channel or None, headless=True)
        try:
            for _ in range(args.reps):
                all_rows.extend(run_session(browser))
        finally:
            browser.close()

    agg = []
    for t in TARGETS:
        for phase in ("cold", "warm"):
            rs = [r for r in all_rows if r["name"] == t["name"] and r["phase"] == phase]
            agg.append({"name": t["name"], "kind": t["kind"], "phase": phase,
                        **{m: _med(rs, m) for m in METRICS}})

    result = {
        "meta": {
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "base_url": BASE_URL, "project": PROJECT, "reps": args.reps,
            "host": platform.node(), "platform": platform.platform(),
            "metrics": {"code_ms": "click → source visible", "image_ms": "click → first diagram paint",
                        "anim_ms": "click → animation settled"},
        },
        "aggregate": agg, "runs": all_rows,
    }
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "perf.json").write_text(json.dumps(result, indent=2) + "\n")

    print(f"\ntab-switch open-latency · {BASE_URL}/?p={PROJECT} · reps={args.reps} · medians (ms)\n")
    print(f"{'diagram':<26} {'kind':<12} {'phase':<5} {'code_ms':>8} {'image_ms':>9} {'anim_ms':>8}")
    print("-" * 72)
    for a in agg:
        print(f"{a['name'][:25]:<26} {a['kind']:<12} {a['phase']:<5} "
              f"{str(a['code_ms']):>8} {str(a['image_ms']):>9} {str(a['anim_ms']):>8}")
    print("\ncode_ms = until user sees code · image_ms = until diagram appears · "
          "anim_ms = until animation settled")


if __name__ == "__main__":
    main()

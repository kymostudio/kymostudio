#!/usr/bin/env python3
"""editor multi-open bench — what opening N files "at once" costs.

The sibling tab-switch bench measures ONE open/switch. This one measures the
burst a user feels when they open a handful of files back-to-back (and the cold
load when a project restores that many tabs). Two phases, N files (default 5):

  • BURST   — from an empty strip, open the first N Explorer files back-to-back
              (one click per file, each in its own tick — the editor's openDiagram
              folds the new id into the open-tab list off a render-time closure,
              so genuinely-separate ticks are what accumulate N tabs; firing all
              clicks in one synchronous tick would clobber to a single tab and is
              NOT what a real user does). Metrics, from the first click:
                – tabs_ms   : until all N tab chips exist in the strip.
                – image_ms  : until the ACTIVE (last-opened) diagram first paints.
                – ready_ms  : until that diagram is fully settled incl. animation.

  • RESTORE — reload the project with those N tabs persisted (localStorage + the
              /api/tabs backend). The literal "N files open at once" cold load.
              Same three metrics, measured from navigation start.

A per-file `cascade` ([{n, t}] — when each chip appeared, ms from t0) is recorded
for BURST so you can see the strip fill up. Medians over --reps sessions.

ONLINE + AUTHENTICATED: drives the DEPLOYED editor signed in as the real owner via
a Playwright storageState (.auth/state.json — a real ~1h Google id_token,
gitignored, never committed; re-capture when it expires). Numbers move with the
network + render.kymo.studio's edge cache, so results/ is a dated snapshot.

Run:  cd benches/editor/multi-open && uv run python bench.py [--files N] [--reps N]
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
METRICS = ["tabs_ms", "image_ms", "ready_ms"]

# Arm a probe just before the burst: stamp t0, snapshot the outgoing preview, and
# watch the tab strip so every chip's arrival is timestamped relative to t0.
_ARM_JS = """
() => {
  window.__t0 = performance.now();
  window.__base = document.querySelector('#preview svg')?.outerHTML.length || 0;
  window.__events = [];
  const count = () => document.querySelectorAll('.tabs-bar .file-tab').length;
  window.__last = count();
  const obs = new MutationObserver(() => {
    const c = count();
    if (c !== window.__last) { window.__last = c; window.__events.push({ n: c, t: Math.round(performance.now() - window.__t0) }); }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  window.__obs = obs;
}
"""

# After the clicks are issued, wait for the strip to reach N, then for the active
# diagram to paint and settle. All times are ms from the armed t0.
_COLLECT_JS = """
async ({ n, timeout }) => {
  const t0 = window.__t0, base = window.__base, deadline = t0 + timeout;
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const tabCount = () => document.querySelectorAll(".tabs-bar .file-tab").length;
  const svgLen = () => (document.querySelector('#preview svg')?.outerHTML.length || 0);
  const waitFor = async (cond) => {
    while (performance.now() < deadline) { if (cond()) return Math.round(performance.now() - t0); await raf(); }
    return null;
  };
  const tabs_ms  = await waitFor(() => tabCount() >= n);
  const image_ms = await waitFor(() => { const l = svgLen(); return l > 0 && l !== base; });
  let ready_ms = image_ms, anim_count = 0;
  try {
    const svg = document.querySelector('#preview svg');
    const anims = svg && svg.getAnimations ? svg.getAnimations({ subtree: true }) : [];
    anim_count = anims.length;
    if (anims.length) {
      await Promise.race([
        Promise.all(anims.map(a => a.finished.catch(() => {}))),
        new Promise(r => setTimeout(r, Math.max(0, deadline - performance.now()))),
      ]);
      ready_ms = Math.round(performance.now() - t0);
    }
  } catch (e) {}
  if (window.__obs) window.__obs.disconnect();
  const tabs = tabCount();
  return { tabs_ms, image_ms, ready_ms, anim_count, tabs, cascade: window.__events };
}
"""

# Restore: performance.now() is ms since this document's navigation start, so the
# raw values already measure "from cold load" — no t0 offset needed.
_RESTORE_JS = """
async ({ n, timeout }) => {
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const tabCount = () => document.querySelectorAll(".tabs-bar .file-tab").length;
  const svgLen = () => (document.querySelector('#preview svg')?.outerHTML.length || 0);
  const waitFor = async (cond) => {
    while (performance.now() < timeout) { if (cond()) return Math.round(performance.now()); await raf(); }
    return null;
  };
  const tabs_ms  = await waitFor(() => tabCount() >= n);
  const image_ms = await waitFor(() => svgLen() > 0);
  let ready_ms = image_ms, anim_count = 0;
  try {
    const svg = document.querySelector('#preview svg');
    const anims = svg && svg.getAnimations ? svg.getAnimations({ subtree: true }) : [];
    anim_count = anims.length;
    if (anims.length) {
      await Promise.race([
        Promise.all(anims.map(a => a.finished.catch(() => {}))),
        new Promise(r => setTimeout(r, Math.max(0, timeout - performance.now()))),
      ]);
      ready_ms = Math.round(performance.now());
    }
  } catch (e) {}
  return { tabs_ms, image_ms, ready_ms, anim_count, tabs: tabCount() };
}
"""


def _ensure_explorer(page) -> None:
    """Explorer is the default desktop panel; click its activity icon if collapsed."""
    if page.locator(".sb-file").count() == 0:
        btn = page.get_by_role("button", name="Explorer")
        if btn.count():
            btn.first.click()
            page.wait_for_timeout(150)


def _close_all_tabs(page) -> None:
    """Empty the strip so BURST starts clean (closing the last tab → No file open).

    The project's open-tab set is restored from the /api/tabs backend on load, and
    that reconciliation can land a beat AFTER the page settles — so closing once
    can race a re-add. Let the reconciliation land first, then close, then re-check
    a couple of times to absorb a late re-populate."""
    page.wait_for_timeout(1500)  # let the initial /api/tabs reconciliation land
    for _ in range(3):
        for _ in range(60):
            tabs = page.get_by_role("tab")
            if tabs.count() == 0:
                break
            tabs.first.get_by_role("button", name="Close tab").click()
            page.wait_for_timeout(60)
        page.wait_for_timeout(600)  # catch a late reconciliation re-add
        if page.get_by_role("tab").count() == 0:
            return


def run_session(browser, n: int, timeout_ms: int = 25000) -> list[dict]:
    ctx = browser.new_context(storage_state=str(STATE))
    page = ctx.new_page()
    rows: list[dict] = []
    try:
        page.goto(f"{BASE_URL}/?p={PROJECT}", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector(".sb-file", timeout=30000)  # Explorer populated → signed in
        _ensure_explorer(page)
        _close_all_tabs(page)
        _ensure_explorer(page)

        avail = page.locator(".sb-file").count()
        k = min(n, avail)

        # BURST — one click per file, each its own CDP round-trip (= its own tick),
        # so openDiagram folds each id in off fresh state and the strip reaches k.
        page.evaluate(_ARM_JS)
        for i in range(k):
            page.locator(".sb-file").nth(i).click()
        res = page.evaluate(_COLLECT_JS, {"n": k, "timeout": timeout_ms})
        rows.append({"phase": "burst", "n": k, **res})

        # Let the debounced /api/tabs PUT land before reloading: on load the backend
        # reconciliation overwrites the local tab cache, so a stale backend (PUT not
        # yet flushed) would make RESTORE restore the OLD set, not these k.
        page.wait_for_timeout(2500)
        # RESTORE — the k tabs are now persisted; a fresh load restores them at once.
        page.goto(f"{BASE_URL}/?p={PROJECT}", wait_until="domcontentloaded", timeout=60000)
        res = page.evaluate(_RESTORE_JS, {"n": k, "timeout": timeout_ms})
        rows.append({"phase": "restore", "n": k, **res})
        return rows
    finally:
        ctx.close()


def _med(rows, key):
    vals = [r[key] for r in rows if r.get(key) is not None]
    return round(statistics.median(vals)) if vals else None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--files", type=int, default=5, help="how many files to open at once (default 5)")
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
                all_rows.extend(run_session(browser, args.files))
        finally:
            browser.close()

    n = max((r["n"] for r in all_rows), default=args.files)
    agg = {}
    for phase in ("burst", "restore"):
        rs = [r for r in all_rows if r["phase"] == phase]
        agg[phase] = {"n": n, **{m: _med(rs, m) for m in METRICS}}

    result = {
        "meta": {
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "base_url": BASE_URL, "project": PROJECT, "files": n, "reps": args.reps,
            "host": platform.node(), "platform": platform.platform(),
            "metrics": {"tabs_ms": "first click → all N tab chips present",
                        "image_ms": "first click → active diagram first paint",
                        "ready_ms": "first click → active diagram settled (incl. animation)"},
        },
        "aggregate": agg, "runs": all_rows,
    }
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "perf.json").write_text(json.dumps(result, indent=2) + "\n")

    print(f"\nmulti-open · {BASE_URL}/?p={PROJECT} · {n} files · reps={args.reps} · medians (ms)\n")
    print(f"{'phase':<9} {'files':>5} {'tabs_ms':>8} {'image_ms':>9} {'ready_ms':>9}")
    print("-" * 44)
    for phase in ("burst", "restore"):
        a = agg[phase]
        print(f"{phase:<9} {a['n']:>5} {str(a['tabs_ms']):>8} {str(a['image_ms']):>9} {str(a['ready_ms']):>9}")
    print("\ntabs_ms = whole strip open · image_ms = active diagram paints · "
          "ready_ms = active diagram settled")


if __name__ == "__main__":
    main()

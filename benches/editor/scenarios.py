#!/usr/bin/env python3
"""editor bench — scenarios and the cold-load harness.

A scenario is one editor URL plus what a correct first load of it looks like.
``load_once`` drives a real browser (Playwright) through one COLD load — fresh
browser context per load, so no HTTP cache, no storage — under a fixed network
throttle, and returns the raw observations. quality.py and perf.py both build
on it; neither talks to the browser directly.

Unlike the other benches this one is ONLINE: it loads the deployed editor and
the live kroki.io render API. Numbers depend on the network and on kroki's
server-side queue — the committed results are a snapshot, not a gate.
"""
from __future__ import annotations

import base64
import uuid
import zlib
from typing import Any

# ── canonical share payload ──────────────────────────────────────────────────
# The Vietnamese API-integration flowchart from the 2026-06-12 round (23 lines,
# 19 nodes, foreignObject-heavy when rendered by kroki's mermaid). Vietnamese
# diacritics + <br/> labels make it a sharp regression probe for the SVG
# sanitizer: if foreignObject handling regresses, every label disappears while
# the bench still gets a "successful" render.
MERMAID_SHARE_S = (
    "eJxlUz9r20AU3_sp3lQSqHFK062kxHLiuHYTx_YQODzIsuwTtu9c6dQomE4ZOhWaqVMhJoS2AZOUZpLIdCbfQ9-k755k7LRaTty"
    "935_37nf9kTx1uO0raJefAX67G6yUxrcKFhdp_CPsbEKhsAMltvi6OBcDGOoHUPrSgyGXaXwl3nT94s5zUGk8k5Amv7CklybXYt"
    "AhthKhLXbI03guYLdRhZp7BkWCWSPPFQos3-3h6tmjIANZBCqjZJp8cTK5kZcmn0NDkCs6HA8FuKI3kZ5QGbJMyD3W1nOHA1ZcT"
    "UD5-kbAWN97-Pt4lybfxYA4WrbodWUERWi7ARIQwx4x7LNKmsw98N0PIZ5R-VD_HEOkZ2gIiX87meI-1VemJ6sDqs60R2j67Scq"
    "rGAh1Li-xwkZyAFr-zhAU_LNg-2tl8XtrVcErWGr52M0a4OzNprM2IrL0n9oqzptrrn8T7f6j-67p7pRlM0C27XRvz2GIE0u1sW"
    "q62I11nL9j64PEQJgpB-W90-cvhtMpAjcfJY1gtTRX7ZNtYrrS8HBMYZyi3WjUCc_r6OIQO9Z01U-BgVKtjOU_X6uM-AYBTlY90"
    "fo9hornR2yk9yhyeNtnh9imXCNvToUvtzpIWGO2HL03GAxWgUlC7jk4sue4dTtcimHWQKOCNuYYlrjmQLl6ZsQ06nnhBLoGJUNZ"
    "5i326CB8sc7O0vrajOnMLvHzOLhGboRENh5YJ9mGBq-7IWO8qTIjBwTsMkqnp7hNeqZemFmNfByOL4Z82I5dPVMZpAmQVob7EDi"
    "_Mwrvladzb_Y54Ez"
)

DEFAULT_BASE_URL = "https://editor.kymo.studio"

SCENARIOS: list[dict[str, Any]] = [
    {
        "key": "mermaid-share",
        "title": "kroki share link (mermaid, 19-node Vietnamese flowchart)",
        "path": f"/?k=mermaid&s={MERMAID_SHARE_S}",
        # Node labels, edge labels and <br/> halves that must survive the
        # sanitizer — diacritics included on purpose.
        "expect_labels": ["Bắt đầu", "Đăng ký tài khoản", "Xác thực", "Sửa tham số", "Không", "Có", "Hoàn tất"],
        # The 2.5 MB wasm engine chunk is for the kymo DSL only; a kroki-rendered
        # share link downloading it is the regression this bench exists to catch.
        "expect_engine_chunk": False,
        # index.html's inline kick-off must have fired and been adopted
        # (renderKroki consumes window.__earlyKroki on a source match).
        "expect_early_adopted": True,
    },
    {
        # A NEVER-CACHED diagram — load_once swaps {nonce} per load, so every
        # rep is a guaranteed edge-cache miss. This measures the round-4 local
        # mermaid.js path: the first visitor of a diagram nobody shared before
        # (the early kroki warm-up fires but loses the 900 ms race).
        "key": "mermaid-fresh",
        "title": "never-cached mermaid share link (local mermaid.js render)",
        "source_template": "flowchart TD\n    %% bench nonce {nonce}\n"
            "    A[Bắt đầu] --> B{cache miss?}\n"
            "    B -->|Có| C[mermaid.js render local<br/>không chờ kroki]\n"
            "    C --> D([Hoàn tất])\n",
        "kind": "mermaid",
        "path": None,  # built per load from source_template
        "expect_labels": ["Bắt đầu", "cache miss?", "không chờ kroki", "Hoàn tất"],
        "expect_engine_chunk": False,
        "expect_early_adopted": None,  # the warm-up fires but loses the race — not asserted
    },
    {
        "key": "kymo-default",
        "title": "signed-out editor root (kymo sample, wasm engine)",
        "path": "/",
        "expect_labels": ["Receive order", "In stock?", "Ship order"],
        "expect_engine_chunk": True,
        "expect_early_adopted": None,  # no ?s= → the kick-off must not run at all
    },
]

# Chrome DevTools "Fast 4G" preset, including DevTools' own adjustment factors
# (×0.9 on throughput, ×2.75 on latency) so numbers line up with what a dev
# sees in the Network panel.
THROTTLE = {
    "offline": False,
    "downloadThroughput": 1_061_683,  # 9216 kbit/s × 0.9, in bytes/s
    "uploadThroughput": 354_240,      # 3075 kbit/s × 0.9, in bytes/s
    "latency": 165,                   # 60 ms × 2.75
}

# The measured metrics, by canonical name. DIAGRAM_VISIBLE_MS is the metric of
# record; everything else exists to explain it (what's ours vs what's kroki's).
METRICS = [
    "TTFB_MS",             # navigation responseStart
    "FCP_MS",              # first contentful paint (editor chrome, not the diagram)
    "KROKI_SENT_MS",       # render POST left the browser (early kick-off pulls this down)
    "KROKI_DONE_MS",       # kroki's SVG fully arrived (gap to SENT = kroki's server render)
    "DIAGRAM_VISIBLE_MS",  # first SVG in the preview pane — the metric of record
    "WIRE_TOTAL_KB",       # total transfer over the load
    "WIRE_ENGINE_KB",      # of which the wasm engine chunk (must be 0 on kroki kinds)
]

# Grading thresholds per metric: (good_max, poor_min) in the metric's own unit;
# between the two = "needs improvement" — Google's three-bucket scheme. Sources:
#
#   TTFB_MS              ≤800 / >1800 ms   — https://web.dev/articles/ttfb
#   FCP_MS               ≤1800 / >3000 ms  — https://web.dev/articles/fcp
#   DIAGRAM_VISIBLE_MS   ≤2500 / >4000 ms  — the LCP budget
#                          (https://web.dev/articles/lcp): the diagram IS this
#                          page's largest contentful element, so the LCP
#                          thresholds are the honest stand-in even though we
#                          stamp it with a MutationObserver, not the LCP API.
#   KROKI_SENT_MS        ≤1000 / >2000 ms  — house budget, no public standard:
#                          under 1 s means the inline kick-off beat the bundle
#                          (a bundle-initiated POST can't leave before FCP).
#   WIRE_TOTAL_KB        ≤600 / >2400 KB   — house budget anchored to the HTTP
#                          Archive Web Almanac 2025 median home page (~2.4 MB
#                          desktop): a diagram share page outweighing the median
#                          web page is poor; good is a quarter of that.
#
# Ungraded: KROKI_DONE_MS (kroki.io's server-side render — a third party's
# number, tracked but not ours to budget) and WIRE_ENGINE_KB (pass/fail per
# scenario in quality.py, not a gradient).
#
# Caveat: Google defines its buckets on the 75th percentile of *field* data;
# this bench grades the MEDIAN of N *throttled lab* loads — a stricter network
# than typical field traffic, so a 🟡 here is not a CrUX 🟡.
BASELINES: dict[str, tuple[int, int]] = {
    "TTFB_MS": (800, 1800),
    "FCP_MS": (1800, 3000),
    "DIAGRAM_VISIBLE_MS": (2500, 4000),
    "KROKI_SENT_MS": (1000, 2000),
    "WIRE_TOTAL_KB": (600, 2400),
}


def grade(metric: str, value) -> str | None:
    """'good' | 'needs-improvement' | 'poor' for a baselined metric, else None."""
    b = BASELINES.get(metric)
    if b is None or value is None:
        return None
    good_max, poor_min = b
    return "good" if value <= good_max else ("poor" if value > poor_min else "needs-improvement")


# Installed before any document script: stamps the moment the first diagram SVG
# lands in the preview pane — the metric a share-link visitor actually feels.
_INIT_JS = """
window.__diagramAt = null;
new MutationObserver((muts, mo) => {
  if (!window.__diagramAt && document.querySelector("#preview svg")) {
    window.__diagramAt = performance.now();
    mo.disconnect();
  }
}).observe(document, { childList: true, subtree: true });
"""

# A load is "settled" when the diagram landed, the renderer errored (kroki.io
# has bad days — ENOSPC was live while this bench was written), or the share
# payload was rejected.
_SETTLED_JS = """
() => window.__diagramAt !== null
   || document.querySelector(".status.error") !== null
   || document.querySelector(".share-error") !== null
"""

_COLLECT_JS = """
() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const res = performance.getEntriesByType("resource");
  // Renders go through the mcp worker's caching proxy since PR #294 (kroki.io
  // direct is only the fallback path) — match either for the request window.
  const kroki = res.find((r) => r.name.includes("/api/render/") || r.name.includes("kroki.io"));
  // The engine is two assets since PR #294: the JS glue chunk plus the .wasm
  // shipped as its own streaming-compiled file. Sum them for the wire cost.
  const engineRes = res.filter((r) => r.name.includes("/chunks/engine-") || r.name.endsWith(".wasm"));
  const engineKB = Math.round(engineRes.reduce((s, r) => s + r.transferSize, 0) / 1024);
  const fcp = performance.getEntriesByType("paint").find((p) => p.name === "first-contentful-paint");
  return {
    TTFB_MS: Math.round(nav.responseStart),
    FCP_MS: fcp ? Math.round(fcp.startTime) : null,
    DIAGRAM_VISIBLE_MS: window.__diagramAt === null ? null : Math.round(window.__diagramAt),
    KROKI_SENT_MS: kroki ? Math.round(kroki.startTime) : null,
    KROKI_DONE_MS: kroki ? Math.round(kroki.responseEnd) : null,
    WIRE_ENGINE_KB: engineKB,
    WIRE_TOTAL_KB: Math.round(res.reduce((s, r) => s + r.transferSize, 0) / 1024),
    engine_fetched: engineRes.length > 0,
    early_kroki: typeof window.__earlyKroki,
    status: (document.querySelector(".status")?.textContent || "").slice(0, 200),
    status_error: !!document.querySelector(".status.error"),
    share_error: (document.querySelector(".share-error")?.textContent || "").slice(0, 200) || null,
    preview_text: (document.querySelector("#preview")?.textContent || ""),
  };
}
"""


def share_payload(source: str) -> str:
    """kroki-style deflate+base64url — the ?s= encoding share.ts uses."""
    return base64.urlsafe_b64encode(zlib.compress(source.encode())).decode().rstrip("=")


def scenario_path(scenario: dict) -> str:
    if scenario.get("source_template"):
        src = scenario["source_template"].replace("{nonce}", uuid.uuid4().hex[:10])
        return f"/?k={scenario['kind']}&s={share_payload(src)}"
    return scenario["path"]


def launch_browser(pw, channel: str | None):
    """One browser process per bench run; cold-ness comes from fresh contexts."""
    return pw.chromium.launch(channel=channel or None, headless=True)


def load_once(browser, base_url: str, scenario: dict, *, throttle: bool = True, timeout_s: float = 90.0) -> dict:
    """One cold load of a scenario. Returns the _COLLECT_JS observations plus ``ok``."""
    context = browser.new_context()
    try:
        page = context.new_page()
        page.add_init_script(_INIT_JS)
        if throttle:
            cdp = context.new_cdp_session(page)
            cdp.send("Network.enable")
            cdp.send("Network.emulateNetworkConditions", THROTTLE)
        page.goto(base_url + scenario_path(scenario), timeout=timeout_s * 1000)
        try:
            page.wait_for_function(_SETTLED_JS, timeout=timeout_s * 1000)
        except Exception:
            pass  # timed out — collect what we can; ok will be False
        obs = page.evaluate(_COLLECT_JS)
        obs["ok"] = obs["DIAGRAM_VISIBLE_MS"] is not None and not obs["status_error"] and not obs["share_error"]
        return obs
    finally:
        context.close()

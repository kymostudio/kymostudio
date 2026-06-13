# editor — share-link first-load bench

Measures the thing a share-link visitor actually feels: open a
`https://editor.kymo.studio/?k=…&s=…` URL on a cold browser profile and wait
for the diagram. Two axes, same harness (Playwright driving headless Chrome):

- **Quality** — does the cold load *contain* the right things?
  - the diagram SVG appears in the preview pane;
  - **every expected label survives** — the regression probe for the kroki SVG
    sanitizer (DOMPurify used to strip `<foreignObject>`, silently deleting all
    mermaid labels while the page still looked "successfully rendered";
    fixed 2026-06-12, PR #279);
  - the **~2.5 MB wasm engine chunk** is fetched for the kymo DSL and *only*
    for the kymo DSL (a kroki share link paying for it was the headline
    first-load regression, fixed in PR #282);
  - `index.html`'s inline **early kroki kick-off** fired and was adopted by
    `renderKroki()`.
- **Performance** — how fast, on the Chrome DevTools **Fast 4G** throttle
  (165 ms RTT, ~8.3 Mbit/s down), median over N cold loads: TTFB, FCP, the
  kroki request window, **time to first diagram**, and bytes on the wire.
  Medians are graded 🟢/🟡/🔴 against published baselines —
  [web.dev](https://web.dev/articles/ttfb) thresholds for `TTFB_MS`/`FCP_MS`,
  the [LCP budget](https://web.dev/articles/lcp) for `DIAGRAM_VISIBLE_MS` (the
  diagram is the page's largest contentful element), and house budgets for
  `KROKI_SENT_MS` (the kick-off must beat the bundle) and `WIRE_TOTAL_KB`
  (anchored to the [HTTP Archive 2025](https://almanac.httparchive.org/en/2025/page-weight)
  ~2.4 MB median page). Thresholds + sources live in `scenarios.BASELINES`;
  the REPORT prints the full table.

## Unlike the other benches, this one is ONLINE

It loads the **deployed** editor and the **live** kroki.io render API. That is
the point — it measures what users get, including Cloudflare Pages and kroki's
server-side mermaid render — but it means the numbers move with the network and
with kroki's queue (kroki 5xx days happen; failed reps are dropped and
reported). Treat `results/` as a dated snapshot, never a gate.

## Run

```bash
cd benches/editor
uv sync                         # playwright (pip) — uses your installed Chrome
uv run python run.py            # quality + perf → results/
# Options: --reps N · --base-url http://localhost:8794 · --channel '' (bundled
# chromium — needs `uv run playwright install chromium` first)
```

`--base-url` accepts a locally served `packages/editor/dist/` to bench a build
before it ships (the kroki calls still go to the live service).

## Files

| File | Role |
|---|---|
| `scenarios.py` | the canonical share URL + expectations, throttle constants, the cold-load harness |
| `quality.py`   | correctness grading (1 unthrottled load per scenario, kroki-infra retries) |
| `perf.py`      | N throttled cold loads per scenario → medians |
| `run.py`       | both → `results/quality.json`, `results/perf.json`, `results/REPORT.md` (+ a timestamped copy under `reports/`) |
| `reports/`     | archive of every run's snapshot (+ the [2026-06-12 day summary](reports/2026-06-12-SUMMARY.md)) — `results/` only ever holds the latest |
| `research/`    | hand-written analysis per benchmarking round |

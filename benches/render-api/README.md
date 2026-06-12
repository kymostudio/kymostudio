# render-api — render latency vs kroki.io

Measures what a render-api consumer actually feels: POST a diagram source to
`https://render.kymo.studio/{kind}/{format}` and wait for the bytes, side by
side with the same request against `https://kroki.io`. One harness
(`run.py`, stdlib only), two passes:

- **cache-busted** — a per-language comment with a random token is appended to
  the source on every repetition, so each one is a *real* render. This is the
  worker's wasm engine (mermaid/graphviz/kymo: `(self)`) racing kroki's
  server-side engines — for mermaid that's a puppeteer-driven headless Chrome,
  which is the headline gap. `plantuml (self-less)` is the **proxied control**:
  render.kymo.studio forwards it to kroki.io, so its delta prices the extra
  hop a cache miss pays.
- **cache hit** — the identical source every repetition (after one warm-up),
  measuring the repeat-visitor path: one round-trip to the nearest Cloudflare
  PoP, confirmed by the `x-render-cache: hit` header.

Medians over N reps (default 10), min–max in parentheses, failed reps dropped
and reported.

## Unlike most benches, this one is ONLINE

It hits the **deployed** worker and the **live** kroki.io. That is the point —
it measures what users get, including the edge cache and kroki's queue — but it
means numbers move with the network and **with the vantage point**: the gap is
much larger far from kroki's (European) servers than next to them, because the
worker renders at the nearest PoP while kroki is a single origin. Always note
where a snapshot was taken; treat `results/` as a dated snapshot, never a gate.

## Run

```bash
cd benches && uv run python render-api/run.py            # or plain python3
uv run python render-api/run.py --reps 20                # steadier medians
uv run python render-api/run.py --mine http://127.0.0.1:8787   # wrangler dev
```

Writes `results/perf.json` + `results/REPORT.md`. If a round moved anything,
write it up in `research/` (hand-written, dated, one article per round).

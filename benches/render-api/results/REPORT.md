# render-api bench — render latency vs kroki.io

*2026-06-12T23:53:46+00:00 · https://render.kymo.studio vs https://kroki.io · code-server (Linux-6.8.0-124-generic-x86_64-with-glibc2.39) · 10 reps/case, medians*

Snapshot, not a gate: both endpoints are live deployed software — numbers
move with the network, the vantage point and kroki's queue.

## Real renders (cache-busted every repetition)

| Case | render.kymo.studio | kroki.io | × kroki |
|---|---|---|---|
| mermaid/svg (self) | **45 ms** (40–74) | **295 ms** (284–329) | 6.6× |
| graphviz/svg (self) | **36 ms** (33–52) | **50 ms** (46–68) | 1.4× |
| graphviz/png (self) | **106 ms** (59–160) | **56 ms** (47–89) | 0.5× |
| kymo/svg (self) | **50 ms** (41–77) | — | — |
| plantuml/svg (proxy) | **83 ms** (67–102) | **61 ms** (54–72) | 0.7× |

`(self)` renders inside the worker (kymostudio JS engine + kymostudio-core
wasm); `(proxy)` is forwarded to kroki.io, so its busted row prices the
extra hop a cache miss pays.

## Edge cache hits (identical source every repetition)

| Case | render.kymo.studio | hit rate |
|---|---|---|
| mermaid/svg | **45 ms** (37–48) | 10/10 |
| plantuml/svg | **40 ms** (35–66) | 10/10 |

Hits are content-addressed (SHA-256 of kind+format+scale+source) with an
immutable 1-year TTL — a repeat render costs one round-trip to the nearest
Cloudflare PoP, independent of diagram kind or engine.

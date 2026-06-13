# render-api bench — render latency vs kroki.io

*2026-06-13T00:26:52+00:00 · https://render.kymo.studio vs https://kroki.io · code-server (Linux-6.8.0-124-generic-x86_64-with-glibc2.39) · 10 reps/case, medians*

Snapshot, not a gate: both endpoints are live deployed software — numbers
move with the network, the vantage point and kroki's queue.

## Real renders (cache-busted every repetition)

| Case | render.kymo.studio | kroki.io | × kroki |
|---|---|---|---|
| mermaid/svg (self) | **93 ms** (34–131) | **297 ms** (283–349) | 3.2× |
| graphviz/svg (self) | **50 ms** (36–113) | **58 ms** (47–68) | 1.2× |
| graphviz/png (self) | **93 ms** (61–152) | **59 ms** (54–71) | 0.6× |
| kymo/svg (self) | **52 ms** (49–114) | — | — |
| plantuml/svg (proxy) | **94 ms** (79–1,364) | **59 ms** (53–81) | 0.6× |

`(self)` renders inside the worker (kymostudio JS engine + kymostudio-core
wasm); `(proxy)` is forwarded to kroki.io, so its busted row prices the
extra hop a cache miss pays.

## Share-embed GET — first fetch of a Copy-Markdown-image URL

| Case | render.kymo.studio | hit rate |
|---|---|---|
| mermaid/svg GET (cold) | **46 ms** (38–67) | 0/10 |
| mermaid/svg GET (pre-warmed) | **38 ms** (34–55) | 10/10 |

Fresh content per repetition. `(pre-warmed)` runs the editor's
warm-on-share POST first (untimed): opening the Share menu renders the
diagram into the content-addressed cache, so the embed's first fetch is
already a hit.

## Edge cache hits (identical source every repetition)

| Case | render.kymo.studio | hit rate |
|---|---|---|
| mermaid/svg | **44 ms** (31–51) | 10/10 |
| plantuml/svg | **38 ms** (33–52) | 10/10 |

Hits are content-addressed (SHA-256 of kind+format+scale+source) with an
immutable 1-year TTL — a repeat render costs one round-trip to the nearest
Cloudflare PoP, independent of diagram kind or engine.

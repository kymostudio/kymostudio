# render-api bench — render latency vs kroki.io

*2026-06-13T01:08:31+00:00 · https://render.kymo.studio vs https://kroki.io · code-server (Linux-6.8.0-124-generic-x86_64-with-glibc2.39) · 10 reps/case, medians*

Snapshot, not a gate: both endpoints are live deployed software — numbers
move with the network, the vantage point and kroki's queue.

## Real renders (cache-busted every repetition)

| Case | render.kymo.studio | kroki.io | × kroki |
|---|---|---|---|
| mermaid/svg (self) | **40 ms** (34–50) | **315 ms** (275–432) | 7.9× |
| graphviz/svg (self) | **36 ms** (29–139) | **53 ms** (47–66) | 1.5× |
| graphviz/png (self) | **72 ms** (55–168) | **60 ms** (53–77) | 0.8× |
| kymo/svg (self) | **48 ms** (37–66) | — | — |
| nomnoml/svg (self) | **48 ms** (35–74) | **90 ms** (78–120) | 1.9× |
| bytefield/svg (self) | **71 ms** (48–1,854) | **197 ms** (149–733) | 2.8× |
| wavedrom/svg (self) | **43 ms** (35–50) | **99 ms** (96–111) | 2.3× |
| vegalite/svg (self) | **88 ms** (52–134) | **320 ms** (264–421) | 3.6× |
| svgbob/svg (self) | **47 ms** (37–108) | **47 ms** (39–62) | 1.0× |
| pikchr/svg (self) | **40 ms** (32–480) | **36 ms** (29–51) | 0.9× |
| plantuml/svg (proxy) | **85 ms** (68–228) | **62 ms** (57–80) | 0.7× |

`(self)` renders inside the worker (kymostudio JS engine + kymostudio-core
wasm); `(proxy)` is forwarded to kroki.io, so its busted row prices the
extra hop a cache miss pays.

## Share-embed GET — first fetch of a Copy-Markdown-image URL

| Case | render.kymo.studio | hit rate |
|---|---|---|
| mermaid/svg GET (cold) | **39 ms** (32–47) | 0/10 |
| mermaid/svg GET (pre-warmed) | **39 ms** (33–48) | 10/10 |

Fresh content per repetition. `(pre-warmed)` runs the editor's
warm-on-share POST first (untimed): opening the Share menu renders the
diagram into the content-addressed cache, so the embed's first fetch is
already a hit.

## Edge cache hits (identical source every repetition)

| Case | render.kymo.studio | hit rate |
|---|---|---|
| mermaid/svg | **38 ms** (34–49) | 10/10 |
| plantuml/svg | **36 ms** (31–42) | 10/10 |

Hits are content-addressed (SHA-256 of kind+format+scale+source) with an
immutable 1-year TTL — a repeat render costs one round-trip to the nearest
Cloudflare PoP, independent of diagram kind or engine.

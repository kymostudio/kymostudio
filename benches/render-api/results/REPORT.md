# render-api bench — render latency vs kroki.io

*2026-06-13T01:44:21+00:00 · https://render.kymo.studio vs https://kroki.io · code-server (Linux-6.8.0-124-generic-x86_64-with-glibc2.39) · 10 reps/case, medians*

Snapshot, not a gate: both endpoints are live deployed software — numbers
move with the network, the vantage point and kroki's queue.

## Real renders (cache-busted every repetition)

| Case | render.kymo.studio | kroki.io | × kroki |
|---|---|---|---|
| mermaid/svg (self) | **45 ms** (35–394) | **306 ms** (286–401) | 6.8× |
| mermaid-seq/svg (self) | **38 ms** (33–55) | **243 ms** (230–334) | 6.4× |
| dbml/svg (self) | **43 ms** (36–1,380) | **255 ms** (241–595) | 5.9× |
| graphviz/svg (self) | **38 ms** (31–512) | **53 ms** (48–537) | 1.4× |
| graphviz/png (self) | **50 ms** (38–107) | **59 ms** (50–114) | 1.2× |
| kymo/svg (self) | **46 ms** (35–67) | — | — |
| nomnoml/svg (self) | **48 ms** (37–1,830) | **88 ms** (75–833) | 1.8× |
| bytefield/svg (self) | **57 ms** (45–100) | **169 ms** (154–772) | 3.0× |
| wavedrom/svg (self) | **41 ms** (35–50) | **153 ms** (103–1,176) | 3.7× |
| vegalite/svg (self) | **95 ms** (55–131) | **294 ms** (266–792) | 3.1× |
| svgbob/svg (self) | **45 ms** (34–107) | **45 ms** (39–50) | 1.0× |
| pikchr/svg (self) | **42 ms** (35–576) | **35 ms** (32–42) | 0.8× |
| plantuml/svg (proxy) | **81 ms** (75–93) | **61 ms** (50–77) | 0.8× |

`(self)` renders inside the worker (kymostudio JS engine + kymostudio-core
wasm); `(proxy)` is forwarded to kroki.io, so its busted row prices the
extra hop a cache miss pays.

## Share-embed GET — first fetch of a Copy-Markdown-image URL

| Case | render.kymo.studio | hit rate |
|---|---|---|
| mermaid/svg GET (cold) | **38 ms** (35–47) | 0/10 |
| mermaid/svg GET (pre-warmed) | **38 ms** (32–48) | 10/10 |

Fresh content per repetition. `(pre-warmed)` runs the editor's
warm-on-share POST first (untimed): opening the Share menu renders the
diagram into the content-addressed cache, so the embed's first fetch is
already a hit.

## Edge cache hits (identical source every repetition)

| Case | render.kymo.studio | hit rate |
|---|---|---|
| mermaid/svg | **38 ms** (34–50) | 10/10 |
| plantuml/svg | **39 ms** (33–46) | 10/10 |

Hits are content-addressed (SHA-256 of kind+format+scale+source) with an
immutable 1-year TTL — a repeat render costs one round-trip to the nearest
Cloudflare PoP, independent of diagram kind or engine.

# Round 4: every mermaid grammar, and graphviz stops being a subset

*Follow-up to [bundling kroki's engines](2026-06-13-bundling-krokis-engines.md).
Written 2026-06-13 — the round behind PRs #333 (merman full) and #334
(@viz-js/viz graphviz + dbml). The committed
[`../results/REPORT.md`](../results/REPORT.md) is this round's warm snapshot.*

## What changed

**mermaid** stopped meaning "flowcharts, fall through to kroki for the rest":
kymo-mermaid grew a `full` feature exposing merman's whole dispatch
(`mermaidRenderSvg`, 5.6 MB raw / ~1.9 MB gzip), built only for the worker —
the editor keeps the 473 KB flowchart slice. sequenceDiagram, class, state,
er, gantt, pie, mindmap … all render at the PoP now: **38 ms vs kroki's
243 ms** (its puppeteer), 6.4× on the busted median.

**graphviz** stopped meaning "the flowchart-subset DOT importer": the real
graphviz 14 (emscripten, from @viz-js/viz) handles records, ports, clusters,
every layout attribute — and becomes authoritative. The workerd trick: the
package embeds its wasm and runtime-compiles it (forbidden), exposes no
instantiateWasm hook, so init briefly swaps the **global**
WebAssembly.instantiate — byte-array calls get the deploy-time-compiled
module (extract.mjs captures matching bytes from the same package version at
build time), then the original is restored. 980 KB of wasm, zero forks.

**dbml** unblocked as a corollary: dbml-renderer emits DOT, real graphviz lays
it out (43 ms vs 255 ms, 5.9×). Its legacy viz.js sync path — 1.9 MB of
runtime-compiling dead weight — is aliased to a one-line stub.

## The cost, and the next knob

Bundle: 3.1 → **5.93 MB gzip** (merman ~1.9 MB, graphviz ~0.4 MB, glue).
Paid-plan headroom remains (10 MB). The visible price is the **cold isolate**:
ensure() now instantiates ~12 MB raw of wasm, and the first post-deploy bench
run showed it (mermaid 647 ms, dbml 322 ms medians; warm run: 45/43 ms). If
cold tails start mattering, the knob is lazy per-engine init — merman only on
mermaid requests, viz only on graphviz/dbml — at the cost of three ensure()
paths instead of one.

15 of 29 kinds now render in the worker; the remainder is exactly the
JVM/Python/TeX tail (plantuml, ditaa, blockdiag-family, tikz, erd,
structurizr, symbolator, umlet, wireviz, excalidraw) behind the cached proxy.

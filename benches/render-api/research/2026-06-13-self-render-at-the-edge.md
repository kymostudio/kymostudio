# Self-rendering at the edge: what a worker buys over a render farm

*The study behind `benches/render-api/`. Written 2026-06-13 — the round behind
PR #321, which shipped `packages/render-api` (kroki-compatible API on a
Cloudflare Worker at `render.kymo.studio`) and `registerFont` in
`kymostudio-core`. The committed [`../results/REPORT.md`](../results/REPORT.md)
is this round's snapshot from the fsn1 dev box; the Vietnam numbers below were
taken the same hour with curl from a consumer connection in VN.*

## Abstract

kroki.io is a single European origin that renders some diagram kinds with
heavyweight machinery — mermaid goes through a puppeteer-driven headless
Chrome. render.kymo.studio moves the five kinds the kymostudio engine covers
(kymo, mermaid-flowchart, d2, graphviz, bpmn) **into the worker itself**: the
JS engine plus the 6 MB raw / 2.2 MB gzip `kymostudio-core` wasm, instantiated
once per isolate, rendering at whichever Cloudflare PoP the request lands on.
Everything else proxies to kroki behind a content-addressed edge cache. Two
findings, one per vantage point. Next to kroki (Germany): self-rendering wins
where kroki's engine is heavy (**mermaid 45 ms vs 295 ms** median busted,
6.6×) and roughly ties where it is not (graphviz 36 vs 50 ms). Far from kroki (Vietnam):
*distance dominates engine choice* — every self-rendered kind wins by the
width of the ocean (**mermaid 184 ms vs 1,718 ms, ~9×; graphviz 126 vs
502 ms, ~4×**), because the worker renders ~30 ms from the user while kroki is
~250 ms of RTT away before it does any work. The proxied control (plantuml)
prices the pattern's cost honestly: a cache **miss** through the proxy is one
hop slower than calling kroki directly (Germany: 83 vs 61 ms; VN: 622 vs
417 ms) — and a cache **hit** beats everything everywhere (~40–45 ms Germany,
~139 ms VN, header-confirmed, 10/10). One measured regression to own: PNG.
kroki rasterizes natively in ~56 ms; the worker's resvg-in-wasm takes ~106 ms
median (and registers Roboto first — see §3). Raster at the edge costs about
2× kroki's native raster; SVG remains the format the architecture is built
around.

## 1. Two vantage points, two different stories

The busted medians (real render every repetition, per-language comment with a
random token appended):

| Case | DE: mine | DE: kroki | VN: mine | VN: kroki |
|---|---|---|---|---|
| mermaid/svg (self) | **45 ms** | 295 ms | **184 ms** | 1,718 ms |
| graphviz/svg (self) | **36 ms** | 50 ms | **126 ms** | 502 ms |
| graphviz/png (self) | 106 ms | **56 ms** | — | — |
| kymo/svg (self) | **50 ms** | n/a | — | — |
| plantuml/svg (proxy) | 83 ms | **61 ms** | 622 ms | **417 ms** |
| mermaid/svg (cache hit) | **45 ms** | n/a | **139 ms** | n/a |

From Germany the comparison is engine vs engine: the dev box sits in the same
region as both kroki's origin and the PoP, so RTT cancels out. Self-rendered
mermaid wins 6.6× because the worker's flowchart renderer is a Rust layout
pass, not a headless browser (and an earlier curl round saw a kroki max of
1,568 ms — its queue has bad moments even on a good day). Graphviz is nearly a tie: kroki's native `dot` is
fast, and at 36 vs 50 ms both are under perception thresholds.

From Vietnam the comparison is geography vs geography, and geography wins.
kroki's *floor* from VN is the ~400 ms round trip to Europe; mermaid adds the
puppeteer render on top for a 1.7 s median. The worker's floor is the ~120 ms
round trip to the nearest PoP — and the render happens *there*. This is the
number that matters for kymostudio's actual audience: share links and embeds
opened from anywhere, not from a datacenter next to kroki.

## 2. The proxy hop is priced, and the cache pays for it

plantuml is the control: render.kymo.studio doesn't render it, it forwards to
kroki (same wire format) and caches the answer by SHA-256(kind + format +
scale + source), immutable, one year. The busted rows show the miss penalty —
user → PoP → kroki → back, one extra hop, +20 ms from Germany and +200 ms from
VN. The hit rows show why that trade is taken: a repeat render of *any* kind —
including the ones kroki renders — returns from the nearest PoP in ~40 ms
(DE) / ~139 ms (VN), header-confirmed (`x-render-cache: hit`, 10/10). Diagram
sources are immutable-by-construction in every consumer we have (share links
encode the source in the URL), so the cache never serves a stale render; the
same argument that justified the mcp proxy cache
([editor round 2](../../editor/research/2026-06-12-cache-proxy-and-wasm-diet.md))
holds here unchanged.

## 3. PNG: the regression we ship anyway, and the font that almost wasn't

kroki rasterizes graphviz PNG in 56 ms median (native cairo on its origin).
The worker takes 106 ms: resvg compiled to wasm, a pixmap allocation, a PNG
encode — all CPU time on the PoP. Two reasons to accept it. First, the
absolute number is fine: 106 ms for a *busted* PNG render is well under any
interactive budget, and cache hits don't re-rasterize. Second, the worker's
PNG is the only one whose text we control: the wasm build has **no system
fonts** and resvg ignores `@font-face`, so before this round `svgToPng` /
`svgToPdf` silently dropped every `<text>` element — diagrams rasterized as
boxes and arrows with no words. PR #321 added `registerFont(bytes)` to the
core (fonts load into the fontdb on each render and become the generic-family
fallbacks); the worker registers Roboto Regular/Bold at init. The bench's PNG
rows double as the regression probe: a text-less PNG is byte-noticeably
smaller, and the pixel-variety check in the PR run caught exactly that failure
mode before it shipped.

## 4. What this round did not measure

Cold isolate starts (the wasm instantiates once per isolate; the first request
on a fresh PoP pays it — anecdotally tens of ms, wrangler reports 1 ms startup,
but no controlled series yet). PDF latency (shipped, spot-checked `%PDF-1.7`,
not benched). bpmn and d2 self-render latency (no kroki-comparable corpus in
hand). And kroki's bad days: every kroki number here is from a *good* hour;
the editor bench's history shows 3-of-5 failure windows. A follow-up round
should add a cold-start series and a d2/bpmn corpus.

## Verdict

Self-rendering at the edge is not about beating kroki's engines — graphviz
ties, PNG loses. It is about **rendering where the user is**: from the
audience's side of the planet every self-rendered kind wins 4–9×, the cache
makes repeats fast for *all* kinds everywhere, and the one regression (PNG,
2× slower, ~106 ms absolute) buys text that actually renders. The
architecture's bet — one wasm, many PoPs, content-addressed cache — is
confirmed by the numbers it was made for.

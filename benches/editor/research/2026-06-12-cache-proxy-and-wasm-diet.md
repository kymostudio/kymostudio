# Round 2, same day: an edge cache for kroki and a wasm that travels alone

*An offline study behind `benches/editor/`. Written 2026-06-12 — the round
behind PR #291 (mcp render proxy), #294 (editor: proxy + wasm split), following
[the morning's round](2026-06-12-share-link-first-load.md). The committed
[`../results/REPORT.md`](../results/REPORT.md) is this round's snapshot.*

## Abstract

The morning round ended with a clean division of blame: everything left of
`KROKI_SENT_MS` was ours and fast (~750 ms throttled); everything right of it
was kroki.io's server-side puppeteer (~2.6 s when it worked, 3-of-5 failures
when it didn't), and `kymo-default` carried a 2.5 MB wasm tax (🔴 twice over).
This round attacks both, with one deliberate goal: move the graded medians
toward 🟢 without bending a single baseline. Two changes shipped. First, a
**caching render proxy** on the existing mcp worker: renders POST to
`/api/render/<kind>/svg`, the SVG is cached at the edge keyed by
SHA-256(kind+source) for a year — safe because share links are
immutable-by-construction — and every visitor after the first gets the diagram
in one round-trip (**~60–300 ms measured** vs ~2.5 s). Second, the **wasm
stopped traveling inside JavaScript**: esbuild's file loader now emits it as
its own immutable asset, fetched in parallel and compiled while downloading;
the engine JS chunk fell from 8.4 MB to 363 KB and the engine's wire cost from
~2.4 MB to ~1.4 MB. We also report a measured negative result: **`wasm-opt
-Oz` makes the wire size worse** (−21 % raw, +70 KB brotli), so it stays out
of CI despite the Cargo.toml comment promising savings.

## 1. The cache argument

kroki renders mermaid server-side with puppeteer. No client work changes that
~2.5 s; the morning round had already pulled the *start* of that wait as early
as physics allows (inline kick-off at ~750 ms throttled). The only remaining
lever on the client side of the contract is *not asking kroki twice for the
same answer* — and a share link is the perfect cache key, because the source
travels inside the URL: same `?s=`, same bytes, forever. New content is a new
key. That makes a 1-year immutable TTL not an optimization gamble but a
property of the encoding.

The proxy is ~70 lines on the worker that already serves the editor's
workspace API (`packages/mcp/src/index.ts`): hash the body, try
`caches.default`, on miss relay to kroki and cache only 200s. kroki errors
pass through uncached, `x-render-cache: hit|miss` makes the path observable,
and the editor keeps a **direct-kroki fallback** (proxy unreachable or 5xx →
one retry against kroki.io), so the worker is a shortcut, not a new single
point of failure. A second-order win came free: cached diagrams keep rendering
*through* kroki outages — the same outages that killed 3 of 5 bench reps in
the morning round.

What the cache does **not** fix: the first visitor of a never-seen diagram
still pays full kroki price, per edge colo. The bench's median (reps 2–5 hit
the cache warmed by rep 1) honestly reflects the *repeat-visitor* experience —
which for share links is the dominant one, since sharing means several people
opening the same URL.

## 2. The wasm that traveled in costume

The engine chunk was 8.4 MB of JavaScript because the 6.1 MB wasm rode inside
it, encoded as JS bytes (`--loader:.wasm=binary`). That costume costs twice:
the encoding inflates what brotli sees (~2.4 MB on the wire vs ~1.4 MB for the
naked binary), and a wasm inside JS can't start compiling until the JS chunk
has fully arrived and executed (`initSync`). Switching the loader to `file`
and handing `init()` a URL gets all three wins at once: the binary travels
uncompressed-by-base64 (**~1 MB less wire**), the browser fetches it **in
parallel** with the 363 KB glue chunk, and `instantiateStreaming` compiles it
**while it downloads**. It also caches independently: a future JS-only change
no longer re-downloads 6 MB of unchanged engine.

### The wasm-opt negative result

`Cargo.toml` carries a comment promising ~2.4 MB from re-enabling `wasm-opt`
once a pinned binary lands in CI. Measured (binaryen 130, `-Oz -all`): raw
6.14 → 4.85 MB (−21 %), **but brotli 1,392 → 1,460 KB (+70 KB)** — the
optimizer's output is denser per byte and less compressible, and with
streaming compilation the raw-size win (compile time) overlaps the download
anyway. On a wire-dominated budget, `wasm-opt` is a regression. It stays out
of CI; the Cargo comment's number was a raw-size figure, not a wire figure,
and the two disagree in sign. Lab note for future rounds: always grade size
work in the unit the user pays — transfer bytes, not file bytes.

## 3. Bench changes

Two matchers in `scenarios.py` had this round's changes built into their
assumptions: the kroki request window now matches `/api/render/` (proxy)
*or* `kroki.io` (fallback), and `WIRE_ENGINE_KB`/`engine_fetched` sum **two**
engine assets (glue chunk + `.wasm`) instead of one. Metric names are
unchanged — `KROKI_SENT_MS` still means "the render request left the browser",
whoever answers it.

## 4. Results

Same harness, same baselines, same host as the morning round — 5 throttled
Fast-4G cold loads per scenario, medians:

| | morning round | this round |
|---|---|---|
| mermaid DIAGRAM_VISIBLE_MS | 3,408 🟡 | **1,232 🟢** |
| mermaid failed reps (kroki 5xx) | 3 / 5 | **0 / 5** |
| mermaid render window (DONE−SENT) | ~2,650 ms | **~525 ms** (edge hit) |
| kymo DIAGRAM_VISIBLE_MS | 4,465 🔴 | **3,517 🟡** |
| kymo FCP_MS | 1,616 🟢 | **880 🟢** |
| kymo WIRE_TOTAL_KB | 2,677 🔴 | **1,823 🟡** |

`mermaid-share` is now **all-green across every graded metric**, and — the
quieter headline — **zero failed reps**: the same kroki instability that ate
3 of 5 loads in the morning never reached the visitor, because the edge had
the answer. `kymo-default` shed both its reds; its FCP nearly halved as a side
effect of the wasm leaving the JS chunk (the glue parses in milliseconds, and
6 MB of bytes no longer compete with the app for bandwidth before first
paint). Its remaining 🟡 pair is the honest cost of shipping a full SVG
renderer to the browser, stated by the baselines rather than hidden from them.

## 5. What's left

`kymo-default`'s wire is ~1.4 MB of resvg+svg2pdf compiled to wasm — under
half of where it started, but a 🟢 of 600 KB is not reachable while the
renderer ships whole. The named next candidates, in order: render **mermaid
client-side** behind a per-kind lazy chunk (kills even the first-visitor kroki
penalty and works offline — the promise carried over from the morning round),
and a **leaner editor wasm feature set** (the editor calls three of the
sixteen exports; svg2pdf alone drags a second usvg tree in). Both are
wire-graded now: the wasm-opt lesson says neither ships without a brotli
number attached.

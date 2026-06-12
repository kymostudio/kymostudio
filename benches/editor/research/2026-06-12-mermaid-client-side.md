# Round 4: mermaid moves in-browser — and the waterfall the bench caught

*An offline study behind `benches/editor/`. Written 2026-06-12 — the round
behind PR #305 (local mermaid + the warm-up race), #307 (the single-chunk
hotfix), with a new third scenario. Follows
[round 3](2026-06-12-lean-editor-wasm.md). The committed
[`../results/REPORT.md`](../results/REPORT.md) is this round's snapshot.*

## Abstract

The carry-over promise from rounds 1–3 was client-side mermaid. The design
constraint, set by round 2's own numbers: mermaid.js must **beat the edge
cache, not replace it** — a cached share link renders off the proxy in ~300 ms
and must keep costing zero extra bytes. The shipped shape is a **race**: a
pristine share link's early warm-up gets 900 ms (a cache hit wins long before
that; mermaid.js never downloads); a cache miss, a kroki outage, or any later
render — typing, above all — goes local. The round's real story, though, is a
trap the bench caught before the snapshot landed: bundled naively, mermaid's
per-grammar lazy-loading became a **~25-chunk nested request waterfall** that
took **5–14 s** on Fast 4G — *worse than the kroki path it replaced* — while
localhost testing (RTT ≈ 0) showed a lovely 989 ms and hid it completely. The
fix (#307) pre-bundles mermaid into one self-contained file: a single ~760 KB
brotli request, fresh-link medians at **3.2 s** with low variance. Typing no
longer touches the network at all — previously every debounced edit was a
guaranteed cache miss hammering kroki's puppeteer.

## 1. The race, and who wins when

`renderMermaid()` (web/mermaid.ts) races the share link's early proxy warm-up
against a 900 ms timer:

| situation | winner | cost |
|---|---|---|
| share link, edge cache hit | warm-up (~300 ms) | zero extra bytes — mermaid.js never downloads |
| share link, cache miss | timer → local render | one ~760 KB chunk (immutable-cached) |
| kroki outage | timer → local render | same — the outage is invisible |
| typing / room diagrams | local immediately (no warm-up to race) | zero render requests on the wire |

The typing row is the biggest unbenchmarked win of the day: the content hash
that makes share links perfectly cacheable makes *editing* perfectly
**un**cacheable — every keystroke is new content, so before this round every
debounced edit was a proxy miss riding kroki's ~2.5 s server render. Now the
first keystroke pulls the chunk once and every render after that is local and
effectively instant. The kind badge says what's true now: *renders
in-browser*.

## 2. The waterfall: a negative result the bench caught in the act

The first implementation did the obvious thing — `import("mermaid")`. mermaid
v11 lazy-loads each grammar via nested dynamic imports; esbuild faithfully
splits that into ~25 chunks, each wave gated on executing the previous one.
On localhost: 989 ms, everything green, ship it. On the bench's Fast 4G
throttle (165 ms RTT per wave): **5,571–14,257 ms** across reps — a 🔴 worse
than the kroki dependency this feature exists to remove.

Two lessons worth their own paragraph. First, **localhost cannot see
waterfalls** — RTT ≈ 0 collapses any request chain; only the throttled bench
exposed the shape. Second, the new `mermaid-fresh` scenario had to outsmart
the cache it was measuring: the warm-up of rep 1 *populates* the edge cache
for rep 2, so the scenario embeds a **fresh nonce per load**, making every rep
a guaranteed first visitor.

The fix: `build.sh` pre-bundles `mermaid.esm.min.mjs` **without
`--splitting`** (every grammar inlined) into a vendor file the main build
emits as one lazy chunk. One request, ~760 KB brotli, all grammars. The UMD
`mermaid.min.js` was tried first and rejected — it is script-tag-scoped
(top-level `var` + a `globalThis` chain) and breaks under module bundling.

## 3. Results

Three scenarios now; same baselines. This run's network was visibly worse
than round 3's (TTFB 291–368 ms vs 175–278 ms — exactly the cross-round noise
TTFB exists to flag), so read columns within this run, not against round 3's
absolute numbers:

| | this run | note |
|---|---|---|
| mermaid-share DIAGRAM_VISIBLE_MS | **1,492 🟢** | cache hit wins the race; 0 mermaid bytes |
| mermaid-fresh DIAGRAM_VISIBLE_MS | **3,239 🟡** | was 5,571–14,257 🔴 pre-#307; kroki-miss path it replaces measured ~3.4 s — now outage-proof |
| mermaid-fresh WIRE_TOTAL_KB | 1,042 🟡 | the honest price of the bundle, paid only by a diagram's first-ever visitor |
| kymo-default DIAGRAM_VISIBLE_MS | 3,438 🟡 | 1,526 🟢 in round 3 — same build, degraded network this run (see TTFB) |

`mermaid-fresh` 🟡 is the right grade for what it measures: the **first
visitor of a diagram nobody has opened before**, who now pays a bundle
download instead of a kroki render — about the same wall-clock on a good
kroki day, dramatically better on a bad one, and every visitor after them
inherits a warm edge cache (the share row) or a warm HTTP cache.

## 4. What's left

The 900 ms race window is dead time on the fresh path; a smarter scheme
(speculative chunk prefetch on race start) would trade hit-case bytes for
miss-case latency — measure before believing. The icons-manifest JSON still
rides the engine chunk. And the day's standing caveat: this bench is two
share-link scenarios and a sample; nothing here measures the *second* edit,
collaborative rooms, or mobile CPUs (mermaid parse on a phone is not 300 ms).
Next bench extension candidates more than next optimization candidates.

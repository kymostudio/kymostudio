# What a share link costs: anatomy of the editor's first load

*An offline study behind `benches/editor/`. Written 2026-06-12 — the round that
produced PR #279 (sanitizer labels) and PR #282 (first-load waterfall), and the
round this bench was born in. The committed [`../results/REPORT.md`](../results/REPORT.md)
is the post-fix snapshot.*

## Abstract

A kroki share link (`?k=mermaid&s=…`) is the editor's most outward-facing
surface: it lands on cold caches, on phones, in front of people who never chose
the tool. We profiled a cold load of a real 19-node Vietnamese flowchart on
Chrome's Fast 4G throttle and found the page serving its own purpose last:
**~60 % of the bytes downloaded were a wasm engine the link never uses**, and
the render request to kroki.io — the one thing the visitor is waiting on —
left the browser only at **~1.9 s**, after the bundle, React, and a typing
debounce that had no typing to debounce. Two structural fixes (load the engine
only for the kymo DSL; fire the kroki request from an inline script while the
bundle is still downloading) plus three small ones (first render skips the
debounce, `modulepreload` for the shared chunk, content-hash cache busting)
took time-to-diagram from **~4.3 s to ~2.4 s** with **~2.5 MB less on the
wire**. The same round surfaced a correctness bug worth its own probe: the SVG
sanitizer was stripping `<foreignObject>`, which deletes *every* mermaid label
while the page still reports a successful render. The bench guards both.

## 1. Two bugs, one page

The round started with a user-visible defect: the flowchart rendered as empty
boxes. Kroki renders mermaid with `htmlLabels`, so every node and edge label is
HTML inside a `<foreignObject>` — and `sanitizeSvg()`'s DOMPurify profile
dropped `foreignObject` wholesale. The fix (PR #279) keeps the element and
sanitizes its *content* with the `html` profile instead; the non-obvious part
is that DOMPurify also has to be told `foreignobject` is an
`HTML_INTEGRATION_POINTS` entry, or it rejects the SVG→HTML namespace
transition and deletes the label `<div>`s anyway. The rendered SVG for our
probe diagram contains **41 foreignObjects and zero `<text>` elements** — when
this regresses, nothing errors; the page just goes quietly blank. That is
exactly the kind of failure a bench should assert on, hence the
diacritics-heavy `expect_labels` in `scenarios.py`.

With labels back, the question became *when* they show up.

## 2. The pre-fix waterfall, criticized

Cold load, production, Chrome DevTools Fast 4G (165 ms RTT, ~8.3 Mbit/s):

| ms | event |
|---|---|
| 278 | TTFB |
| 569 → 1 207 | `main.js` (201 KB wire, 593 KB parsed) |
| 1 209 → 1 381 | shared chunk — **serial**: discovered only after main.js parsed |
| 1 445 → 4 284 | **engine chunk, 2 466 KB wire / 8 197 KB parsed — never used by this page** |
| 1 456 | FCP (editor chrome, not the diagram) |
| 1 912 → 4 331 | kroki POST — *after* React mount + **450 ms typing debounce** |
| ~4 300 | diagram visible |

Three observations, in descending order of indefensibility:

1. **The engine tax.** `EditorPage` dynamically imported the wasm engine on
   every mount, unconditionally. For a kroki-rendered kind that chunk is dead
   weight — and worse than dead, because it *competes with the kroki response
   for downlink* during exactly the seconds the visitor is staring at an empty
   pane. The fix is one level of indirection: seed `kind`/`source` from the
   share URL at mount (so no render cycle ever touches the kymo sample), and
   import the engine inside the first *kymo* render instead of inside mount.
2. **The late POST.** Everything the kroki request needs is in the URL —
   payload and kind — yet it waited for the full client boot. An inline script
   in `index.html` now inflates `?s=` (native `DecompressionStream`, the same
   codec `share.ts` uses) and fires the POST before `main.js` has finished
   downloading; `renderKroki()` adopts the in-flight response if kind+source
   match, single-use, falling back to a fresh request on any mismatch or
   error. A `preconnect` to kroki.io shaves the TLS setup. This is the same
   trick server-rendered apps get for free — start the slow dependency at the
   edge of the request — recovered inside a static SPA.
3. **Self-inflicted serialization.** The 450 ms debounce exists to absorb
   keystrokes; a pristine share link has none (first render now skips it). The
   shared chunk needed a second round-trip after main.js parsed
   (`modulepreload`, injected by `build.sh`, starts it with the HTML). And
   cache busting used a per-deploy timestamp, invalidating every client's
   `main.js`/`styles.css` on every deploy even when unchanged — now a content
   hash, with hashed `/chunks/*` served `immutable`.

## 3. After

Same conditions, post-PR #282 build (local dist + live kroki.io):

| ms | event |
|---|---|
| 546 → 2 332 | kroki POST — fired by the inline script, **main.js still downloading** |
| 1 140 | main.js done |
| — | engine chunk: **not requested** |
| ~2 400 | diagram visible |

On production after the deploy (unthrottled cold context): kroki at
1 101 → 3 724 ms with the POST leaving before React mounts, shared chunk
fetched in parallel with `main.js`, engine absent. The app-measured render time
roughly halves because the request had a head start the app never sees.

The committed [`../results/REPORT.md`](../results/REPORT.md) snapshot — taken
the same day, while kroki.io was actively degraded — makes the dependency
argument better than any prose: the editor's side held its shape (POST leaving
at ~750 ms throttled, 211 KB total wire, engine absent, labels intact), but
**3 of 5 throttled reps died on kroki server errors**, and on the reps that
survived kroki spent ~2.6 s rendering, putting the median diagram at ~3.4 s.
Everything left of "kroki sent" is now ours and fast; everything right of it
is somebody else's puppeteer.

| | before | after |
|---|---|---|
| engine chunk on a mermaid link | 2 466 KB | **0** |
| kroki POST leaves at | ~1 900 ms | **~550 ms** |
| diagram visible (Fast 4G, cold) | ~4 300 ms | **~2 400 ms** |

## 4. What's left, and whose problem it is

The remaining ~1.8–2.6 s is `kroki done − kroki sent`: kroki.io renders mermaid
**server-side with puppeteer**, and during this round its workers were
intermittently failing with `ENOSPC` — a reminder that the free shared service
is both the editor's biggest latency item and its least reliable dependency.
The client now starts that clock as early as physics allows; going materially
below ~1 s therefore means removing kroki from the mermaid path, not polishing
the editor further. The candidates, in order of appeal: render mermaid
**client-side** behind a lazy chunk (mermaid.js is ~1.5–2 MB — the engine-tax
lesson says it must be per-kind lazy, and it would also make share links work
offline and immune to kroki outages), or self-host kroki. Honourable mentions
that didn't make this round's cut: `main.js` is still a 593 KB monolith
(CodeMirror dominates; a guest viewing a diagram doesn't need an editor pane
compiled and parsed before the preview), and Google Sign-In + fonts CSS still
load ahead of the content for visitors who will never sign in.

## 5. Why a bench

Both failure modes of this round are *silent*: labels vanish with a green
status bar; the engine tax costs seconds without breaking anything. Neither
shows up in unit tests, both show up instantly in a cold-load probe with
assertions on content (`expect_labels`) and on traffic
(`expect_engine_chunk`). The bench is online by design — it measures the
deployed site through the real CDN and the real kroki — so its numbers are a
dated snapshot, not a gate; the next deploy that touches the editor's loading
path should re-run it and, if anything moves, earn its own article here.

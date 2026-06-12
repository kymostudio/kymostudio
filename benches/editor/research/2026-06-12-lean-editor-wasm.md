# Round 3: the editor stops shipping a rasterizer it never calls

*An offline study behind `benches/editor/`. Written 2026-06-12 — the round
behind PR #298, closing the day that started with
[invisible labels](2026-06-12-share-link-first-load.md) and continued with
[the edge cache](2026-06-12-cache-proxy-and-wasm-diet.md). The committed
[`../results/REPORT.md`](../results/REPORT.md) is this round's snapshot.*

## Abstract

After round 2, `kymo-default` still wore two 🟡: ~1.6 MB of engine on the wire
and ~3.5 s to first diagram. Profiling what the editor actually *calls* in the
wasm dissolved most of it: of sixteen exports, the editor uses three — layout,
flowchart resolution, BPMN render — all of which emit SVG **as text**. The two
exports it never touches, `svgToPng` and `svgToPdf`, anchor resvg's rasterizer
and svg2pdf's second usvg tree: **~85 % of the module** (the editor's own PNG
export has always rasterized via a browser canvas). Moving those two exports
behind the existing `pdf` cargo feature and building the editor's wasm without
it shrank the module from 6.14 MB raw / 1,392 KB brotli to **0.90 MB / 210
KB** — a one-line feature change, no JS edits, published npm/vscode artifacts
unchanged (they build `wasm,pdf`). With it, the bench reaches the goal the day
was named after: **every graded metric in both scenarios is 🟢**, with
`kymo-default` at 1,615 ms to first diagram and 502 KB total wire — lighter
than many pages' JavaScript alone.

## 1. Reading the call graph instead of the file size

Rounds 1–2 treated the wasm as an opaque tax to be deferred (round 1) and
shipped in a cheaper container (round 2). The next question was finally the
right one: *what of it does this page execute?* The editor's render path is
`parseDiagram → renderSVG` in the JS engine, which crosses into wasm exactly
three times — `bpmnLayout`, `mermaidToKymoJson`, `bpmnRender` — and every one
of them returns a string of SVG. Rasterization never happens in wasm on this
page: the Export → PNG button draws the SVG onto a `<canvas>` and calls
`toBlob`. Meanwhile `svgToPng` (resvg: tiny-skia, fontdb, image decoding) and
`svgToPdf` (svg2pdf, which cannot share resvg 0.47's usvg and brings its own
0.45 tree) sat in the export table unconditionally — and an export is an
anchor: the linker must keep everything reachable from it, LTO notwithstanding.

The fix is almost embarrassingly small. The crate already had the right
feature seam (`pdf`); the two exports just weren't behind it. Gate them,
drop `pdf` from the `wasm` feature's defaults, and pick per consumer:

| build | features | module |
|---|---|---|
| editor (`deploy-editor.yml`) | `wasm` | 0.90 MB raw / **210 KB** brotli |
| npm / vscode artifacts, CI tests | `wasm,pdf` | 6.14 MB raw / 1,392 KB brotli — surface unchanged |

`packages/js` needed zero changes: its `src/` never imports the two functions
statically, and the Node CLI reaches them dynamically behind a `typeof` guard
that already existed for older cores. The one CI subtlety worth recording:
`test.yml` deliberately builds `wasm,pdf`, because the CLI's PDF tests carry a
skip-guard — built lean, they would *pass by silently skipping*, which is how
coverage rots.

## 2. Results

Same harness, baselines and host as rounds 1–2; 5 throttled Fast-4G cold
loads per scenario, medians:

| | round 1 (morning) | round 2 (cache + split) | **round 3 (lean)** |
|---|---|---|---|
| kymo DIAGRAM_VISIBLE_MS | 4,465 🔴 | 3,517 🟡 | **1,615 🟢** |
| kymo WIRE_TOTAL_KB (engine) | 2,677 🔴 (2,465) | 1,823 🟡 (1,612) | **502 🟢 (290)** |
| kymo FCP_MS | 1,616 🟢 | 880 🟢 | **792 🟢** |
| mermaid DIAGRAM_VISIBLE_MS | 3,408 🟡 | 1,232 🟢 | **1,049 🟢** |
| mermaid failed reps | 3/5 | 0/5 | **0/5** |

**Every graded metric in both scenarios is now 🟢** — the day's goal, reached
without loosening a baseline. The kymo timeline is worth a second look: first
diagram at 1,615 ms means the editor now boots, fetches a 210 KB wasm in
parallel, streaming-compiles it and renders — all in about the time round 1
spent just *waiting for bytes* of the old engine chunk. `kymo-default`'s 502
KB total is below the bench's own 600 KB "good" budget, a line we called
unreachable two rounds ago while resvg was riding along.

## 3. What this says about wasm "splitting"

The question that started this round was "can the wasm be split?" The honest
answer: wasm has no code-splitting the way JS bundlers mean it — but it
doesn't need it when the feature seams are right. **Splitting by cargo
feature at build time** (one lean module per consumer) costs nothing at
runtime and got 85 % here. The heavier alternative — two separate wasm
modules loaded on demand (core now, rasterizer when Export → PDF is clicked)
— buys nothing for this editor *today* because nothing in it wants the
rasterizer at all; it becomes relevant only if a wasm-rendered PDF/PNG export
ever lands in the UI, and then the lean/full split made here is exactly the
boundary such a lazy second module would load along.

## 4. What's left

`mermaid-share`'s first-visitor path still pays kroki's server render once per
diagram per edge colo — **client-side mermaid** behind a per-kind lazy chunk
remains the named next round, now with a sharpened constraint from this one:
mermaid.js is ~2 MB minified, so it ships only if its brotli number beats the
proxy's hit-rate math for real share-link traffic. The remaining fat in the
lean module itself (~0.9 MB raw) is mostly the mermaid/d2/dot converter
matrix and serde — diminishing returns; the wire number now sits below the
icons-manifest JSON the engine chunk has carried all along, which would be
the next thing to question.

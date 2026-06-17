# kymo Mermaid pipeline fidelity — end-to-end + per-stage vs mermaid.js

*2026-06-17. Hand-written. A bench across kymo's **whole flowchart pipeline** —
`parse → layout → render` — measured against mermaid.js. It reports the **end-to-end**
result (pixel-Δ, the `2026-06-16-flowchart-mermaid-style.md` metric) **and** a number
for each **intermediate stage**, all per file in one run. Measuring e2e + stages
together is the point: it shows which stage's error actually reaches the pixels.
Harness: `layout-accuracy.mjs` (`node layout-accuracy.mjs --all`).*

> **Update (same day) — parse stage now 100%.** This note's headline finding was that
> the parse stage (topology) was kymo's one real divergence (84%, 16 files). It has
> since been **fixed**: kymo's renderer now routes flowchart parsing through **merman's**
> grammar-faithful parser, translating merman's render model into kymo's `Flowchart` IR
> (`katex_layout::flowchart_from_merman`) before its raster-safe render. Topology is now
> **102/102 = 100%** (verified both here and in `2026-06-17-engine-comparison.md`). The
> numbers below are kept as the *pre-fix* snapshot that motivated the change; the
> "fix the 16 parse cases" next-step is **done**.
>
> **Update 2 — id-matching corrects the "subgraph tail" diagnosis.** §"Where the stages
> diverge" below calls the large-position subgraph files a *matching artifact*. With kymo
> now emitting `data-id`, the harness pairs nodes **by id** (not nearest-neighbour) — and
> the tail **does not collapse**: for nested-subgraph files (e.g. `flowchart-v2_070`) the
> *same-id* nodes sit 60–400 px apart (scattered, not a uniform offset), while pixel-Δ
> stays ~0.5% because the canvases are large and sparse. So the tail is a **real
> nested-subgraph layout divergence** (kymo's `build_geom` doesn't place nested-subgraph
> members exactly where merman/mermaid do — merman itself scores pos 0.0), which the
> pixel metric *under-reports*. The earlier "artifact" claim was wrong; id-matching
> turned an ambiguous tail into a confirmed, if pixel-minor, layout gap. Post-fix pos:
> **median 1.2 px, p90 122 px, max 309 px** (the tail = nested subgraphs only).

## The pipeline and its metrics

Both engines run the same shape of pipeline; we extract a comparable number at the
output of each stage, plus the final raster:

```
.mmd ─parse─▶ graph ─layout─▶ positioned ─render─▶ SVG ─raster─▶ PNG
        │                │                    │                  │
     topology      position + size         edge              pixel-Δ  (end-to-end)
   (counts match)  (centers, w/h)       (routing poly)    (mean per-channel |Δ|)
```

| Stage | Metric | What it isolates |
|---|---|---|
| **parse** | **topology** | node + edge **counts** match — does kymo's parser build the same graph? |
| **layout** | **position** | node-center error after frame alignment — dagre/dugong fidelity |
| **layout** | **size** | node `w,h` error — text measurement (`getBBox` vs kymo metrics) |
| **render** | **edge** | edge-polyline distance (symmetric mean/max, beziers sampled) — routing |
| **render (e2e)** | **pixel-Δ** | mean per-channel \|Δ\| of the two PNGs — the whole pipeline's output |

**Method.** mermaid.js reference via `mmdc` (`forceLegacyMathML` + zeroed
`.katex-display` margin — the reproducible config). kymo via `mermaidToSvgDagre` (the
`katex-layout` build → its own parser, merman/**dugong** positions, kymo raster-safe
SVG). Stage geometry is read from each engine's SVG; a **centroid translation**
removes the global frame offset before comparison. kymo carries **no node ids**, so
nodes pair by **nearest-neighbour** — a limitation that matters below. Pixel-Δ
rasterises *both* SVGs through the same Chromium pipeline (DSF 2,
`text-rendering:geometricPrecision`, no hinting), so it is pure render difference, not
rasteriser asymmetry.

## Corpus result (115 plain `flowchart*` files)

101 produced data (14 are mermaid.js's *own* `mmdc` render failures — directives/elk).
Reading the pipeline stage by stage:

| Stage · metric | result (over 101 / 85 topo-✓) | reading |
|---|---|---|
| **parse · topology** | **85 / 101 ✓ (84%)**, 16 ✗ | 84% of files parse to the same graph |
| **layout · position** | median **0.82 px · 0.18% of diagonal**; 52% ≤1px, 76% ≤5px | typical node lands sub-px from mermaid.js |
| · position p90 / max | 92.9 px / 308 px | a tail — a *matching* artifact, see below |
| **layout · size** | Δw / Δh median **1.87 px / 0.0 px** | text measurement faithful (line height exact) |
| **render · edge** | mean / max median **1.23 px / 4.84 px** | routing sub-pixel at the median |
| **render · pixel-Δ (e2e, topo-✓)** | median **1.05%**, p90 3.08%, **max 5.29%** | 49% ≤1%, 74% ≤2%, 99% ≤5% — bounded once parse matches |
| · pixel-Δ (e2e, topo-✗) | median **2.53%**, max 25.3% | a parse mismatch ≈ 2.4× the e2e error |

**The pipeline is faithful end-to-end at the median** — node centers within 0.18% of
the diagonal, heights exact (Δh=0), edges sub-pixel, and the final raster within ~1%.
The render fidelity rests on real parse + layout fidelity, not coincidence.

## Where the stages diverge — and whether it reaches the e2e output

Splitting the 85 topo-✓ files by whether they use `subgraph`:

| subset | n | pos median | pos p90 | pos ≤5px | **pixel-Δ median** |
|---|---|---|---|---|---|
| **no subgraph** | 51 | 0.93 px (0.2%) | **10.9 px** | **88%** | 1.28% |
| **has subgraph** | 34 | 0.72 px | **164 px (22%)** | 59% | **0.76%** |

1. **The layout position tail is a *measurement* artifact, and the e2e pixel proves
   it.** Every large-position file uses **subgraphs** (or a self-loop). Their canvas
   sizes agree — e.g. `flowchart-v2_070` mermaid `1059×915` vs kymo `1067×915` — and
   decisively, the subgraph subset's **e2e pixel-Δ is the *lowest* of the corpus
   (0.76%)** despite a 164 px position p90. If layout genuinely diverged the pixels
   would too; they don't. The 164–308 px "errors" are the **id-less nearest-neighbour
   matching mispairing** nodes across subgraph nesting — fixed by node-id matching,
   not a layout change.

2. **The parse stage (topology-✗) is the real divergence — and it is what reaches the
   pixels.** 16 files where kymo's hand-written parser produced a different node/edge
   **count** than mermaid.js (`flowchart_013/020/024/025/031/041`,
   `flowchart-v2_012/027/030/045`, …). Three (`flowchart_013/020/025`) are also the
   pixel-bench worst-10 — i.e. their pixel-Δ is a *parse* difference, not styling.

## Correlation: which stage's error actually drives the e2e pixel

Because every metric is measured in the same run, we can decompose the e2e pixel-Δ:

- **Parse dominates.** topo-✓ pixel median **1.05%** vs topo-✗ **2.53%** (≈ 2.4×), and
  topo-✗ owns the entire worst tail: `flowchart-v2_030` 25.3%, `flowchart-v2_024`
  6.2%, `flowchart_011` 5.9%, `flowchart-v2_045` 5.6%, `flowchart_020` 4.8%. A parser
  count mismatch is what blows up the render.
- **Layout position is invisible at the pixel level once parse matches.** Within
  no-subgraph topo-✓ files, pos ≤2 px → pixel **1.12%** vs pos >2 px → pixel **1.28%**
  (flat); and the high-position subgraph subset has the *lowest* pixel-Δ. Sub-5 px
  positioning differences don't reach the output.
- **The residual e2e pixel-Δ is the raster/glyph/styling floor**, not a pipeline
  error — bounded ≤5.29% on every topo-✓ file.

So the e2e and per-stage numbers agree: the only stage whose error reaches the pixels
is **parse** (the topo-✗ set), which is exactly the pixel worst-cases. Everything
downstream — layout, routing, raster — is within the floor or a matching artifact.

## Next steps

1. ~~**Fix the 16 parse (topology-✗) cases**~~ — **DONE**: parsing routed through
   merman's grammar parser → topology **100%** (see the Update note above).
2. ~~**Expose node ids** in kymo's SVG~~ — **DONE**: kymo now wraps each node in
   `<g class="fc-node" data-id>` (`dagre_svg.rs`). The harness still matches by
   nearest-neighbour, so the subgraph position p90 tail remains a *measurement*
   artifact; switching the harness to id-matching would collapse it (now possible).
3. Add a **size** drill on math nodes (`katex_*`): Δh=0 holds for ASCII labels; math
   measurement (kymo-tex vs KaTeX-HTML) is the open question there.

*Bench: `layout-accuracy.mjs` (5 metrics across parse→layout→render: topology /
position / size / edge / e2e pixel-Δ), reference = mermaid.js 11.15 via `mmdc`. Data
snapshot: `assets/2026-06-17-pipeline-accuracy/corpus.json`. Sister note:
`2026-06-16-flowchart-mermaid-style.md` (pixel-Δ deep-dive + the reproducible
KaTeX-HTML math reference).*

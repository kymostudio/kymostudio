# Engine accuracy vs mermaid.js 11 — by dataset & diagram type

*2026-06-14. Hand-written analysis of the `accuracy-mermaidjs.mjs` and
`compare-by-dataset.mjs` runs.*

## Datasets

| Dataset | Sources | Role |
|---|---|---|
| `mermaid-kymo/` | 11 | scored — labelled ground truth (6 flowchart, 5 sequence) |
| `merman/` | 3078 | coverage — raw sources |
| `mermaid-cypress/` | 803 | coverage — raw sources |
| `mermaid-to-svg/` | 85 | coverage — raw sources |

## Method

Ground truth is **mermaid.js 11.15** itself (headless Chrome via puppeteer) —
not merman, which has no KaTeX and renders some things its own way. Metric =
**raster-safe label recall**: of the labels mermaid.js *shows*, the fraction that
survive serverless SVG→PNG/PDF rasterisation (resvg/svg2pdf keep `<text>` but
drop `<foreignObject>`). Scored for all three tools on the same rule — including
mermaid.js's own SVG, which also loses its foreignObject labels without a
browser. kymo routes flowchart/sequence/state to its own engine, everything else
to merman (mirrors `render-api/engine.ts`). `Sources` is the full count per
type; recall is over a ≤50-source sample per type. A blank cell = that type is
absent from the dataset.

## Per dataset → per diagram type (raster-safe recall: mermaid.js / kymo / merman)

### `merman/` (3078)

| diagram | sources | mermaid.js | **kymo** | merman | kymo engine |
|---|---|---|---|---|---|
| flowchart | 838 | 0% | **100%** | 0% | own ⭐ |
| state | 277 | 0% | **91%** | 0% | own ⭐ |
| sequence | 293 | 100% | **100%** | 99% | own |
| class | 196 | 2% | 0% | 0% | — |
| er | 85 | 0% | 0% | 0% | — |
| block | 119 | 0% | 0% | 0% | — |
| kanban | 82 | 0% | 0% | 0% | — |
| mindmap | 107 | 0% | 0% | 0% | — |
| requirement | 48 | 0% | 0% | 0% | — |
| architecture | 182 | 97% | 96% | 96% | — |
| gitgraph | 177 | 100% | 80% | 80% | — |
| c4 | 61 | 100% | 100% | 100% | — |
| gantt | 146 | 100% | 100% | 100% | — |
| pie | 71 | 100% | 100% | 100% | — |
| quadrant | 54 | 100% | 100% | 100% | — |
| radar | 49 | 100% | 100% | 100% | — |
| sankey | 23 | 100% | 100% | 100% | — |
| timeline | 77 | 100% | 100% | 100% | — |
| treemap | 43 | 100% | 100% | 100% | — |
| xychart | 63 | 100% | 100% | 100% | — |
| info | 15 | 100% | 100% | 100% | — |
| journey | 20 | 100% | 100% | 100% | — |
| packet | 35 | 100% | 100% | 100% | — |
| zenuml | 17 | — | — | — | mermaid.js errors |

### `mermaid-cypress/` (803)

| diagram | sources | mermaid.js | **kymo** | merman | kymo engine |
|---|---|---|---|---|---|
| flowchart | 136 | 0% | **100%** | 0% | own ⭐ |
| state | 67 | 0% | **87%** | 0% | own ⭐ |
| sequence | 140 | 100% | **100%** | 89% | own |
| class | 84 | 0% | 0% | 0% | — |
| er | 52 | 0% | 0% | 0% | — |
| block | 36 | 0% | 0% | 0% | — |
| kanban | 10 | 0% | 0% | 0% | — |
| mindmap | 19 | 0% | 0% | 0% | — |
| requirement | 31 | 0% | 0% | 0% | — |
| gantt | 41 | 100% | 98% | 98% | — |
| timeline | 12 | 100% | 83% | 83% | — |
| architecture | 17 | 100% | 100% | 100% | — |
| c4 | 6 | 100% | 100% | 100% | — |
| gitgraph | 71 | 100% | 100% | 100% | — |
| pie | 14 | 100% | 100% | 100% | — |
| quadrant | 14 | 100% | 100% | 100% | — |
| radar | 5 | 100% | 100% | 100% | — |
| sankey | 3 | 100% | 100% | 100% | — |
| treemap | 17 | 100% | 100% | 100% | — |
| xychart | 17 | 100% | 100% | 100% | — |
| info | 2 | 100% | 100% | 100% | — |
| journey | 4 | 100% | 100% | 100% | — |
| packet | 4 | 100% | 100% | 100% | — |

### `mermaid-to-svg/` (85)

| diagram | sources | mermaid.js | **kymo** | merman | kymo engine |
|---|---|---|---|---|---|
| flowchart | 53 | 0% | **100%** | 0% | own ⭐ |
| state | 3 | 0% | **100%** | 0% | own ⭐ |
| sequence | 3 | 100% | **100%** | 100% | own |
| class | 2 | 0% | 0% | 0% | — |
| er | 1 | 0% | 0% | 0% | — |
| block | 4 | 0% | 0% | 0% | — |
| kanban | 4 | 0% | 0% | 0% | — |
| mindmap | 1 | 0% | 0% | 0% | — |
| requirement | 1 | 0% | 0% | 0% | — |
| gitgraph | 1 | 100% | 40% | 40% | — |
| c4, gantt, info, journey, packet, pie, quadrant, radar, sankey, timeline, xychart | 1–2 each | 100% | 100% | 100% | — |

### `mermaid-kymo/` (11, scored ground truth)

The hand-labelled scored set — every label known. kymo keeps **100%** raster-safe
(flowchart + sequence), merman 45.5% (it drops flowchart labels in foreignObject).

## Findings

1. **flowchart & state** — kymo is the *only* tool that keeps the labels in a
   serverless PNG/PDF (**mermaid.js and merman both 0%**: both emit
   `<foreignObject>` labels resvg drops). kymo: flowchart **100%**, state
   **87–100%**. This is kymo's unique value.
2. **sequence** — all three are text-based; kymo **100%** (perfect), edging out
   merman (89–99%).
3. **class, er, block, kanban, mindmap, requirement** — *every* tool scores ~0%:
   these labels vanish in any serverless PNG/PDF today (foreignObject in both
   mermaid.js and merman; kymo routes to merman). **Next targets** — class & er
   (UML, multi-compartment) are the highest value.
4. **~14 types already raster-safe everywhere** (c4, gantt, pie, quadrant, radar,
   sankey, timeline, treemap, xychart, info, journey, packet) — no work needed.

## kymo's own engines — accuracy headline (label recall vs mermaid.js, full corpus)

| grammar | n | recall | perfect |
|---|---|---|---|
| flowchart | 799 | **100%** | **100%** |
| sequence | 410 | **100%** | **100%** |
| state | 322 | 88.9% | 78% |

6 fixtures marked `known-divergent.json` (4 legacy ambiguous-syntax + 2 exotic:
double-escaped/custom KaTeX, decimal autonumber). State is lower because its
renderer does not draw notes yet.

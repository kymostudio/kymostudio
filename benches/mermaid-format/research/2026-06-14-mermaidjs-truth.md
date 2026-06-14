# Engine accuracy vs mermaid.js 11 — by dataset & diagram type

*2026-06-14. Hand-written analysis of `accuracy-mermaidjs.mjs` and
`compare-by-dataset.mjs`.*

## Datasets

| Dataset | Sources | Role |
|---|---|---|
| `mermaid-kymo/` | 11 | scored — labelled ground truth (6 flowchart, 5 sequence) |
| `merman/` | 3078 | coverage — raw sources |
| `mermaid-cypress/` | 803 | coverage — raw sources |
| `mermaid-to-svg/` | 85 | coverage — raw sources |

> **Note on names.** A dataset folder is named after where its `.mmd` *sources*
> were collected (e.g. `merman/` = the merman project's test corpus). It is **not**
> the renderer — every tool renders every dataset. The `merman` *engine* scoring
> 0% on the `merman` *dataset* is not circular: the two are unrelated.

## Method

Ground truth = mermaid.js 11.15 itself (headless Chrome via puppeteer). Metric =
label recall: of the labels mermaid.js *shows*, the fraction present in each
tool's output, reported in **two modes**:

- **browser** — labels in `<text>` *or* `<foreignObject>` (what a browser PNG
  shows; foreignObject HTML is rendered).
- **raster** — labels in `<text>` only (what a **serverless** SVG→PNG/PDF via
  resvg/svg2pdf keeps; foreignObject is dropped — kymo's deploy target:
  render.kymo.studio, the editor's wasm export).

So a `100/0` cell means "all labels render in a browser, none survive a
serverless raster". kymo routes flowchart/sequence/state to its own engine, the
rest to merman (mirrors `render-api/engine.ts`). `Sources` is the full per-type
count; recall is over a ≤50-source sample.

## Per dataset → per diagram type — recall as **browser / raster**

### `merman/` (3078)

| diagram | sources | mermaid.js | **kymo** | merman | engine |
|---|---|---|---|---|---|
| flowchart | 838 | 100/**0** | 100/**100** | 100/**0** | own ⭐ |
| state | 277 | 100/**0** | 91/**91** | 100/**0** | own ⭐ |
| sequence | 293 | 100/100 | 100/**100** | 99/99 | own |
| class | 196 | 100/2 | 98/**0** | 98/**0** | — |
| er | 85 | 100/0 | 100/**0** | 100/**0** | — |
| block | 119 | 100/0 | 100/**0** | 100/**0** | — |
| kanban | 82 | 100/0 | 100/**0** | 100/**0** | — |
| mindmap | 107 | 100/0 | 100/**0** | 100/**0** | — |
| requirement | 48 | 100/0 | 100/**0** | 100/**0** | — |
| architecture | 182 | 100/97 | 99/96 | 99/96 | — |
| gitgraph | 177 | 100/100 | 80/80 | 80/80 | — |
| c4 61, gantt 146, info 15, journey 20, packet 35, pie 71, quadrant 54, radar 49, sankey 23, timeline 77, treemap 43, xychart 63 | — | 100/100 | 100/100 | 100/100 | — |

### `mermaid-cypress/` (803)

| diagram | sources | mermaid.js | **kymo** | merman | engine |
|---|---|---|---|---|---|
| flowchart | 136 | 100/**0** | 100/**100** | 100/**0** | own ⭐ |
| state | 67 | 100/**0** | 87/**87** | 94/**0** | own ⭐ |
| sequence | 140 | 100/100 | 100/**100** | 89/89 | own |
| class | 84 | 100/0 | 100/**0** | 100/**0** | — |
| er | 52 | 100/0 | 90/**0** | 90/**0** | — |
| block | 36 | 100/0 | 100/**0** | 100/**0** | — |
| kanban | 10 | 100/0 | 100/**0** | 100/**0** | — |
| mindmap | 19 | 100/0 | 100/**0** | 100/**0** | — |
| requirement | 31 | 100/0 | 100/**0** | 100/**0** | — |
| gantt | 41 | 100/100 | 98/98 | 98/98 | — |
| timeline | 12 | 100/100 | 83/83 | 83/83 | — |
| architecture 17, c4 6, gitgraph 71, info 2, journey 4, packet 4, pie 14, quadrant 14, radar 5, sankey 3, treemap 17, xychart 17 | — | 100/100 | 100/100 | 100/100 | — |

### `mermaid-to-svg/` (85)

| diagram | sources | mermaid.js | **kymo** | merman | engine |
|---|---|---|---|---|---|
| flowchart | 53 | 100/**0** | 100/**100** | 100/**0** | own ⭐ |
| state | 3 | 100/**0** | 100/**100** | 100/**0** | own ⭐ |
| sequence | 3 | 100/100 | 100/**100** | 100/100 | own |
| class 2, er 1, block 4, kanban 4, mindmap 1, requirement 1 | — | 100/0 | 100/**0** | 100/**0** | — |
| gitgraph | 1 | 100/100 | 40/40 | 40/40 | — |
| c4, gantt, info, journey, packet, pie, quadrant, radar, sankey, timeline, xychart | 1–2 | 100/100 | 100/100 | 100/100 | — |

## Findings

1. **In a browser, every tool shows the labels** (~100 across the board). The
   difference is entirely in **serverless rasterisation**.
2. **flowchart & state**: kymo is the *only* tool whose labels survive a
   serverless PNG/PDF — **mermaid.js and merman both 0/raster** (both emit
   `<foreignObject>`). kymo: flowchart **100**, state **87–100**.
3. **sequence**: all three are text-based (100/100); kymo perfect, edges out
   merman (89–99).
4. **class, er, block, kanban, mindmap, requirement**: **100 browser, 0 raster**
   for *every* tool — these labels vanish in any serverless PNG/PDF today (kymo
   routes to merman). **Next targets** — class & er (UML) are the highest value.
5. **~14 types are 100/100 everywhere** — already raster-safe, no work needed.

## kymo's own engines — accuracy headline (label recall vs mermaid.js, full corpus)

| grammar | n | recall | perfect |
|---|---|---|---|
| flowchart | 799 | **100%** | **100%** |
| sequence | 410 | **100%** | **100%** |
| state | 322 | 88.9% | 78% |

State is lower because its renderer does not draw notes yet (visible in its
browser column too: 87–91 vs merman's 94–100). 6 fixtures are marked
`known-divergent.json` (4 legacy ambiguous-syntax + 2 exotic: double-escaped
KaTeX, decimal autonumber).

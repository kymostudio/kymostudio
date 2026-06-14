# Three-way raster-safety comparison — kymo vs merman vs mermaid.js, by dataset & type

*2026-06-14. Hand-written analysis of `compare-by-dataset.mjs`.*

## Question

For every Mermaid diagram type, how many of the labels mermaid.js shows survive
**serverless rasterisation** (SVG → PNG/PDF via resvg/svg2pdf, no browser)? This
is kymo's deployment target (render.kymo.studio, the editor's wasm export) — and
the reason kymo renders text instead of `<foreignObject>`.

## Method

Ground truth = mermaid.js 11 **visible labels** (foreignObject + text tokens).
Metric = raster-safe recall: fraction of those tokens present in each tool's
`<text>` after dropping `<foreignObject>` (what resvg keeps). Measured for all
three tools on the **same** rule — including mermaid.js's own SVG, which also
loses its foreignObject labels without a browser. kymo routes
flowchart/sequence/state/**class/er/block** to its own engines, everything else
to merman (mirrors `render-api/engine.ts`). ~50 sources per type per dataset.

## Result (consistent across merman / mermaid-cypress / mermaid-to-svg)

| group | types | mermaid.js | kymo | merman |
|---|---|---|---|---|
| **kymo's own engines** | flowchart, state, **class, er, block** | **0%** | **~100%** | 0% |
| | sequence | 100% | **100%** | 89–100% |
| **lost by everyone** | kanban, mindmap, requirement | ~0% | ~0% | ~0% |
| **already raster-safe** | c4, gantt, info, journey, packet, pie, quadrant, radar, sankey, timeline, treemap, xychart | 100% | 100% | 100% |
| | architecture, gitgraph | ~97/100% | ~88/100% | ~88/100% |

## Findings

1. **flowchart, state, class, er, block: kymo is the *only* tool that keeps the
   labels** when rasterised serverside — mermaid.js *and* merman both score 0%
   (both emit `<foreignObject>` HTML labels resvg drops). kymo: flowchart/er/block
   **100%**, class **100%** (modulo a text-wrapping stress fixture), state
   **87–100%**.
2. **sequence**: all three are text-based (~100%); kymo edges out merman.
3. **kanban, mindmap, requirement**: *every* tool still scores ~0% — these labels
   vanish in any serverless PNG/PDF today. They are the next kymo targets.
4. **~14 types are already raster-safe everywhere** — reimplementing them buys
   nothing.

## Takeaway

kymo now has its own text engine for **six** diagram types (flowchart, sequence,
state, class, er, block) and is the only serverless-raster-safe renderer for the
five that mermaid.js/merman lose to foreignObject. The remaining foreignObject
gap is **kanban, mindmap, requirement** — where, like the others before them,
kymo could go from 0% to ~100% by emitting `<text>`.

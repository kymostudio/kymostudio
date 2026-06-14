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
three tools on the **same** SVG-rasterisation rule — including mermaid.js's own
SVG, which also loses its foreignObject labels without a browser. kymo routes
flowchart/sequence/state to its own engine, everything else to merman (mirrors
`render-api/engine.ts`). ~50 sources sampled per type per dataset.

## Result (consistent across merman / mermaid-cypress / mermaid-to-svg)

| group | types | mermaid.js | kymo | merman |
|---|---|---|---|---|
| **kymo's own engines** | flowchart, **state** | **0%** | **87–100%** | 0% |
| | sequence | 100% | **100%** | 89–99% |
| **lost by everyone** | class, er, block, kanban, mindmap, requirement | ~0% | ~0% | ~0% |
| **already raster-safe** | c4, gantt, info, journey, packet, pie, quadrant, radar, sankey, timeline, treemap, xychart | 100% | 100% | 100% |
| | architecture, gitgraph | ~97/100% | ~88/100% | ~88/100% |

## Findings

1. **flowchart & state: kymo is the *only* tool that keeps the labels** when
   rasterised serverside — mermaid.js *and* merman both score 0% (both emit
   `<foreignObject>` HTML labels resvg drops). This is kymo's unique value.
2. **sequence**: all three are text-based (~100%); kymo edges out merman.
3. **class, er, block, kanban, mindmap, requirement**: *every* tool scores ~0%
   — these labels vanish in any serverless PNG/PDF today. They are the next
   targets for a kymo text engine; class & er (UML, multi-compartment boxes)
   are the highest value.
4. **~14 types are already raster-safe everywhere** — reimplementing them buys
   nothing.

## Takeaway

The flowchart/sequence/state work made kymo the only raster-safe renderer for
those types. The remaining gap is the foreignObject UML/structural types
(class, er, block, kanban, mindmap, requirement) — where, like flowchart before
it, kymo could go from 0% to ~100% by emitting `<text>`.

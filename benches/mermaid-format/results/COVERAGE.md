# Mermaid engine coverage — kymo & merman over the raw corpora

*Renders every source in the `merman`, `mermaid-cypress` and `mermaid-to-svg`
datasets (3,977 diagrams, 24 grammars) through merman (all grammars) and,
where kymo has its own engine (flowchart, sequence), through kymo too. Offline —
kymo + merman wasm only. Measures render success and whether the SVG is
raster-safe: real `<text>` survives PNG/PDF; `<foreignObject>` (HTML labels) does
not.*

## By grammar (all datasets)

| grammar | sources | merman renders | merman uses foreignObject | kymo engine | kymo renders |
|---|---|---|---|---|---|
| flowchart | 1,033 | 98% | 98% | ✓ | 61% |
| sequence | 441 | 91% | 0% | ✓ | 100% |
| state | 347 | 99% | 97% |  | — |
| class | 282 | 96% | 99% |  | — |
| gitgraph | 249 | 91% | 0% |  | — |
| architecture | 199 | 98% | 9% |  | — |
| gantt | 188 | 100% | 0% |  | — |
| block | 159 | 100% | 100% |  | — |
| er | 138 | 94% | 99% |  | — |
| mindmap | 127 | 99% | 100% |  | — |
| kanban | 96 | 100% | 100% |  | — |
| timeline | 90 | 98% | 0% |  | — |
| pie | 86 | 97% | 0% |  | — |
| xychart | 81 | 73% | 0% |  | — |
| requirement | 80 | 96% | 99% |  | — |
| quadrant | 69 | 100% | 0% |  | — |
| c4 | 68 | 97% | 0% |  | — |
| treemap | 60 | 90% | 0% |  | — |
| radar | 55 | 67% | 0% |  | — |
| packet | 40 | 75% | 0% |  | — |
| sankey | 27 | 85% | 0% |  | — |
| journey | 26 | 100% | 62% |  | — |
| info | 18 | 94% | 0% |  | — |
| zenuml | 18 | 94% | 0% |  | — |
| **all** | 3,977 | 95% | 58% | | |

- **merman renders** — fraction of real sources merman parses+renders without
  error (its robustness on the upstream corpus).
- **merman uses foreignObject** — fraction of *rendered* SVGs that wrap labels in
  `<foreignObject>`; a server-side resvg/svg2pdf raster drops those labels. High =
  the grammar's PNG/PDF loses its text on render.kymo.studio (kroki hides this with
  a real browser).
- **kymo renders** — for the two grammars kymo has its own `<text>` engine, the
  fraction it parses (the rest fall back to merman).

## Per dataset

| dataset | sources | merman renders | foreignObject grammars |
|---|---|---|---|
| mermaid-kymo | 11 | 100% | 1/2 |
| merman | 3,078 | 97% | 9/24 |
| mermaid-cypress | 803 | 90% | 9/24 |
| mermaid-to-svg | 85 | 100% | 9/21 |

## By dataset, by grammar

### mermaid-kymo (11 sources)

| grammar | sources | merman renders | foreignObject | kymo |
|---|---|---|---|---|
| flowchart | 6 | 100% | 100% | 100% |
| sequence | 5 | 100% | 0% | 100% |

### merman (3,078 sources)

| grammar | sources | merman renders | foreignObject | kymo |
|---|---|---|---|---|
| flowchart | 838 (+2 timeout) | 99% | 97% | 56% |
| sequence | 293 | 100% | 0% | 99% |
| state | 277 | 99% | 97% | — |
| class | 196 | 100% | 98% | — |
| architecture | 182 | 99% | 10% | — |
| gitgraph | 177 | 88% | 0% | — |
| gantt | 146 | 100% | 0% | — |
| block | 119 | 100% | 100% | — |
| mindmap | 107 | 100% | 100% | — |
| er | 85 | 100% | 99% | — |
| kanban | 82 | 100% | 100% | — |
| timeline | 77 | 100% | 0% | — |
| pie | 71 | 96% | 0% | — |
| xychart | 63 | 71% | 0% | — |
| c4 | 61 | 97% | 0% | — |
| quadrant | 54 | 100% | 0% | — |
| radar | 49 | 63% | 0% | — |
| requirement | 48 | 94% | 98% | — |
| treemap | 43 | 86% | 0% | — |
| packet | 35 | 71% | 0% | — |
| sankey | 23 | 83% | 0% | — |
| journey | 20 | 100% | 55% | — |
| zenuml | 17 | 100% | 0% | — |
| info | 15 | 93% | 0% | — |

### mermaid-cypress (803 sources)

| grammar | sources | merman renders | foreignObject | kymo |
|---|---|---|---|---|
| sequence | 140 | 73% | 0% | 100% |
| flowchart | 136 (+3 timeout) | 88% | 100% | 79% |
| class | 84 | 87% | 100% | — |
| gitgraph | 71 | 100% | 0% | — |
| state | 67 | 100% | 100% | — |
| er | 52 | 85% | 100% | — |
| gantt | 41 | 100% | 0% | — |
| block | 36 | 100% | 100% | — |
| requirement | 31 | 100% | 100% | — |
| mindmap | 19 | 95% | 100% | — |
| architecture | 17 | 82% | 0% | — |
| treemap | 17 | 100% | 0% | — |
| xychart | 17 | 76% | 0% | — |
| pie | 14 | 100% | 0% | — |
| quadrant | 14 | 100% | 0% | — |
| timeline | 12 | 83% | 0% | — |
| kanban | 10 | 100% | 100% | — |
| c4 | 6 | 100% | 0% | — |
| radar | 5 | 100% | 0% | — |
| journey | 4 | 100% | 75% | — |
| packet | 4 | 100% | 0% | — |
| sankey | 3 | 100% | 0% | — |
| info | 2 | 100% | 0% | — |
| zenuml | 1 | 0% | — | — |

### mermaid-to-svg (85 sources)

| grammar | sources | merman renders | foreignObject | kymo |
|---|---|---|---|---|
| flowchart | 53 | 100% | 100% | 98% |
| block | 4 | 100% | 100% | — |
| kanban | 4 | 100% | 100% | — |
| sequence | 3 | 100% | 0% | 100% |
| state | 3 | 100% | 100% | — |
| class | 2 | 100% | 100% | — |
| journey | 2 | 100% | 100% | — |
| c4 | 1 | 100% | 0% | — |
| er | 1 | 100% | 100% | — |
| gantt | 1 | 100% | 0% | — |
| gitgraph | 1 | 100% | 0% | — |
| info | 1 | 100% | 0% | — |
| mindmap | 1 | 100% | 100% | — |
| packet | 1 | 100% | 0% | — |
| pie | 1 | 100% | 0% | — |
| quadrant | 1 | 100% | 0% | — |
| radar | 1 | 100% | 0% | — |
| requirement | 1 | 100% | 100% | — |
| sankey | 1 | 100% | 0% | — |
| timeline | 1 | 100% | 0% | — |
| xychart | 1 | 100% | 0% | — |


## Reading

- merman is robust across the upstream corpus — most grammars render near-fully;
  failures are stress/edge fixtures and a few not-yet-ported features.
- The **foreignObject** column is the raster-text problem at scale: the grammars
  that score high there (flowchart, class, state, er, mindmap, …) lose their labels
  in a server-side PNG/PDF. The grammars near 0% (sequence, gantt, pie, …) are
  raster-safe already.
- kymo's own engine covers the bulk of real flowchart and sequence sources; what
  it can't parse falls back to merman, so output is never worse — only the raster
  text and the look change.

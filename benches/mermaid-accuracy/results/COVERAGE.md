# Mermaid engine coverage — kymo & merman over the raw corpora

*Renders every source in the `merman`, `mermaid-cypress` and `mermaid-to-svg`
datasets (3,966 diagrams, 24 grammars) through merman (all grammars) and,
where kymo has its own engine (flowchart, sequence), through kymo too. Offline —
kymo + merman wasm only. Measures render success and whether the SVG is
raster-safe: real `<text>` survives PNG/PDF; `<foreignObject>` (HTML labels) does
not.*

## By grammar (all datasets)

| grammar | sources | merman renders | merman uses foreignObject | kymo engine | kymo renders |
|---|---|---|---|---|---|
| flowchart | 1,027 | 98% | 98% | ✓ | 44% |
| sequence | 436 | 91% | 0% | ✓ | 100% |
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
| **all** | 3,966 | 95% | 58% | | |

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
| merman | 3,078 | 97% | 9/24 |
| mermaid-cypress | 803 | 90% | 9/24 |
| mermaid-to-svg | 85 | 100% | 9/21 |

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

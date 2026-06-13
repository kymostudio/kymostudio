# Engine coverage at corpus scale: where raster text breaks, and how far kymo reaches

*The study behind `benches/mermaid-format/` (`coverage.mjs` / `COVERAGE.md`).
Written 2026-06-13. Renders all 3,966 raw sources (merman + mermaid-cypress +
mermaid-to-svg datasets) through merman and, for flowchart/sequence, kymo. Each
render runs in a worker with a 4 s timeout — four sources (self-referential
flowcharts) drive a renderer into a non-terminating layout loop and are recorded
as timeouts rather than hanging the run.*

## Two numbers that matter

**merman is robust (95% render) but raster-lossy on 9 of 24 grammars.** Across
the upstream corpus merman parses and renders 95% of real sources; the failures
are stress fixtures and a few unported features (xychart 73%, radar 67%, packet
75%). But **58% of all rendered SVGs wrap their labels in `<foreignObject>`** —
HTML labels a server-side resvg/svg2pdf raster silently drops. Split by grammar
the corpus draws a hard line:

| raster-safe (`<text>`, ~0% foreignObject) | raster-lossy (foreignObject) |
|---|---|
| sequence, gantt, pie, gitgraph, timeline, xychart, quadrant, c4, treemap, radar, packet, sankey, info, zenuml | flowchart 98%, class 99%, state 97%, er 99%, mindmap 100%, block 100%, kanban 100%, requirement 99%, journey 62%, architecture 9% |

So on render.kymo.studio a PNG/PDF of any flowchart/class/state/er/mindmap/
block/kanban/requirement loses its text through merman — exactly the nine
grammars the kymo-owns-mermaid work targets. kroki hides this for mermaid.js by
rasterizing in a real browser; an edge worker cannot.

**kymo's own engine covers every real sequence diagram but only 44% of real
flowcharts.** Sequence: 436/436 parse through kymo's renderer. Flowchart: only
**44%** of the 1,027 real flowchart sources parse through kymo's `mermaidToSvg`
— the corpus is full of syntax the hand-written kymo flowchart engine does not
yet handle (icon/image shapes, the `A --> B & C` fan, markdown/`htmlLabels`
variants, ELK directives, class/style blocks). The other 56% fall back to merman:
output is never *worse* (it still renders), but it reverts to foreignObject, so
the raster text is lost again. The earlier hand-picked corpus (basic flowcharts)
hid this; the upstream corpus exposes it.

## What it means for the roadmap

- The raster-text win from routing flowchart to kymo is real but **partial** —
  it only helps the 44% kymo can parse. Closing the gap means growing the kymo
  flowchart parser toward mermaid's real surface, the single highest-leverage
  task since flowchart is also the largest grammar (1,027 sources).
- sequence is effectively done (100% coverage, raster-safe).
- The other eight foreignObject grammars (class, state, er, mindmap, block,
  kanban, requirement, journey) have no kymo engine at all — each is a fresh
  renderer, and these coverage numbers are the baseline to beat.

## Caveats

Coverage = *parses without error*, not *renders correctly*. A source kymo
"covers" may still lay out differently from mermaid.js (the accuracy bench, on
the labelled `mermaid-kymo` set, is where look/recall is scored). Four timeout
sources are excluded from the success counts. merman numbers are its bundled
build, not upstream mermaid.js itself.

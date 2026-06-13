# Mermaid render accuracy — kymo vs merman vs mermaid.js

*kymo = kymostudio-core's own Rust engine; merman = the merman port of
mermaid.js bundled in render-api; mermaid.js = the real thing via kroki.io
(the ground truth). Corpus: 6 flowcharts + 5 sequence diagrams with known
labels. Engine PNGs are rasterized by kymostudio-core (resvg); the
mermaid.js PNG is kroki's puppeteer screenshot.*

## 1. Raster-safe text recall — do labels survive rasterization?

Fraction of each diagram's labels present as SVG `<text>` (not
`<foreignObject>`, which resvg/svg2pdf drop). This is the metric our work
targets: a high score means the PNG/PDF keeps its words.

| grammar | kymo | merman | mermaid.js |
|---|---|---|---|
| flowchart | 100% | 0% | 0% |
| sequence | 100% | 100% | 100% |
| **all** | 100% | 45.5% | 45.5% |

> mermaid.js / merman keep labels in `<foreignObject>` for flowcharts, so
> the *SVG* carries the text but a resvg raster drops it (recall ≈ 0%).
> kymo emits real `<text>`, so its raster keeps every label. For sequence
> diagrams all three already use `<text>`, so all score high.

## 2. SVG content recall — is the text in the document at all?

Same labels, but counting text anywhere in the SVG (foreignObject HTML
included). Confirms no engine *loses* content — the raster gap above is
purely a rasterization issue, not a parsing one.

| grammar | kymo | merman | mermaid.js |
|---|---|---|---|
| flowchart | 100% | 100% | 100% |
| sequence | 100% | 100% | 100% |

## 3. Visual distance to mermaid.js (rasterized look)

Mean per-channel |Δ| (0–255) of each engine's PNG vs the mermaid.js
reference PNG, resized to the reference. Lower = closer look. merman
tracks mermaid.js styling; kymo has its own look, so it sits further even
when its content is more complete. Caveat: this number is *insensitive to
missing text* — labels are a small fraction of the pixels, so merman scores
low (close) here despite dropping every flowchart label in raster. Section 1
is the metric for lost text.

| grammar | kymo | merman |
|---|---|---|
| flowchart | 16.3 | 3.7 |
| sequence | 15.8 | 6 |
| **all** | 16.1 | 4.7 |

## Per-diagram raster-safe recall

| id | grammar | kymo | merman | mermaid.js |
|---|---|---|---|---|
| fc-basic | flowchart | 100% | 0% | 0% |
| fc-lr | flowchart | 100% | 0% | 0% |
| fc-shapes | flowchart | 100% | 0% | 0% |
| fc-subgraph | flowchart | 100% | 0% | 0% |
| fc-decision | flowchart | 100% | 0% | 0% |
| fc-long | flowchart | 100% | 0% | 0% |
| seq-basic | sequence | 100% | 100% | 100% |
| seq-three | sequence | 100% | 100% | 100% |
| seq-loop | sequence | 100% | 100% | 100% |
| seq-alt | sequence | 100% | 100% | 100% |
| seq-async | sequence | 100% | 100% | 100% |

## Reading

- **Content correctness** (SVG recall) is ~100% for all three — every
  engine parses the source and keeps the labels.
- **Raster correctness** is where they diverge: for flowcharts, mermaid.js
  and merman put labels in `<foreignObject>`, so a server-side resvg raster
  loses the text; kymo's `<text>` survives. (kroki hides this for mermaid.js
  by rasterizing with a real browser, which render.kymo.studio cannot do.)
- **Look fidelity**: merman is visually closer to mermaid.js, kymo carries
  its own style. The trade kymo makes — own look, full raster text — is the
  point of routing flowchart/sequence to it.

# mermaid-accuracy — kymo vs merman vs mermaid.js

Measures how faithfully render.kymo.studio's two mermaid engines reproduce a
diagram, against **mermaid.js itself** (rendered by kroki.io) as the ground
truth the others emulate:

- **kymo** — kymostudio-core's own Rust engine (`mermaidToSvg`,
  `mermaidSequenceToSvg`); covers flowchart + sequence.
- **merman** — the merman port of mermaid.js bundled in render-api
  (`mermaidRenderSvg`); covers every grammar.
- **mermaid.js** — the real engine via `kroki.io/mermaid` (SVG + a puppeteer PNG).

Two dimensions:

1. **Raster-safe text recall** — the fraction of a diagram's labels that survive
   rasterization (live in an SVG `<text>`, not a `<foreignObject>`, which
   resvg/svg2pdf drop). This is what the kymo engines are for: a server-side
   PNG/PDF that keeps its words.
2. **Visual distance to mermaid.js** — mean per-channel |Δ| of each engine's
   rasterized PNG vs the mermaid.js reference PNG (resized, on white). Lower =
   closer look. *Insensitive to missing text* — read it alongside (1).

The headline finding: for flowcharts, mermaid.js and merman put labels in
`<foreignObject>`, so a server-side resvg raster loses the text (recall 0%);
kymo emits real `<text>` and keeps 100%. kroki hides this for mermaid.js by
rasterizing in a real browser — which render.kymo.studio cannot do. For
sequence diagrams all three already use `<text>`. The trade kymo makes is its
own visual style for complete raster text.

## Run

```bash
cd benches/mermaid-accuracy
uv sync                    # one-time: Pillow + numpy

# 1. render all engines + score recall (needs render-api's wasm engines built)
node render.mjs            # writes results/raw/*.{svg,png} + results/recall.json

# 2. pixel-diff vs mermaid.js + assemble the report
uv run python accuracy.py  # writes results/REPORT.md
```

`render.mjs` resolves the wasm engines from `packages/render-api/node_modules`
(set `RENDER_API_DIR` to override) and fetches the mermaid.js reference from
kroki.io, so it is **online** — numbers move with kroki. The scored corpus lives in `datasets/corpus.json` (each entry: id, grammar,
source, expected labels). `datasets/<grammar>/` additionally holds ~3,970 raw
mermaid sources split by diagram type, gathered from three public test suites
(merman, warpdotdev/mermaid-to-svg, mermaid-js cypress) — see
`datasets/PROVENANCE.md`; those are raw inputs for coverage, not part of the
scored run. `results/raw/` (the
rendered images) is git-ignored; `recall.json` and `REPORT.md` are committed as
a dated snapshot.

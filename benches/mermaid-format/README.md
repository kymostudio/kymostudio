# mermaid-format — kymo vs merman vs mermaid.js

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
cd benches/mermaid-format
uv sync                    # one-time: Pillow + numpy

# 1. render all engines + score recall (needs render-api's wasm engines built)
node render.mjs            # writes results/raw/*.{svg,png} + results/recall.json

# 2. pixel-diff vs mermaid.js + assemble the report
uv run python accuracy.py  # writes results/REPORT.md
```

# coverage over the raw datasets (merman/cypress/warp) — render every source
# through merman + kymo, score raster-safety per grammar. Offline (no kroki).
node coverage.mjs          # writes results/coverage/*.json
uv run python coverage_report.py  # writes results/COVERAGE.md
```

`render.mjs` resolves the wasm engines from `packages/render-api/node_modules`
(set `RENDER_API_DIR` to override) and fetches the mermaid.js reference from
kroki.io, so it is **online** — numbers move with kroki. `datasets/` holds one folder per dataset, each with a card (`README.md`). The
scored set is `datasets/mermaid-kymo/corpus.json` (hand-written, each entry
`{id, grammar, source, labels}`). The other datasets — `merman/`,
`mermaid-cypress/`, `mermaid-to-svg/` — are ~3,970 raw mermaid sources split
by diagram type, for render/convert coverage (not scored). See
`datasets/README.md`. `results/raw/` (the
rendered images) is git-ignored; `recall.json` and `REPORT.md` are committed as
a dated snapshot.

## accuracy-mermaidjs.mjs — truth is mermaid.js itself

`accuracy-mermaidjs.mjs` is the canonical accuracy bench. The ground truth is
**mermaid.js 11** (rendered in headless Chrome via puppeteer), **not merman** —
merman lacks KaTeX and has render quirks, so using it as the reference unfairly
penalises kymo. Metric: raster-safe label recall (fraction of mermaid.js's
*visible* word-tokens that appear in kymo's `<text>`, the text that survives to
PNG/PDF). Non-visible reference text is excluded — KaTeX MathML `<annotation>`,
accessibility `<title>`/`<desc>`, and hidden actor-link menus.

```
npm i                              # once — installs puppeteer-core
CHROME=/usr/bin/google-chrome-stable N=200 node accuracy-mermaidjs.mjs
```

`CHROME` points at a Chrome/Chromium; `MERMAID` overrides the mermaid bundle
(default: the editor package's dist). Reference tokens are cached under
`results/mermaidjs-cache/` (git-ignored). Latest (sampled): flowchart ~98%
recall / ~99% perfect, sequence ~100% / ~99% perfect.

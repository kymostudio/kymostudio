# Pixel-overlay diff — kymo vs mermaid.js 11.15

*2026-06-14. Hand-written. Third axis alongside `2026-06-14-mermaidjs-truth.md`
(label recall) and `2026-06-14-render-correctness.md` (glyph correctness): a
single **visual** number for "how close does kymo's picture sit on top of
mermaid's?" Script: `benches/mermaid-format/pixel-diff.mjs`.*

## Question

Render the same source with **both** kymo and mermaid.js, stack the two PNGs on
top of each other, and measure the fraction of pixels that differ. Inspired by
the BPMN conformance bench — but where BPMN compares two of kymo's *own*
back-ends (Rust vs Python) that are designed to be **byte-identical** (SHA256
exact match), kymo and mermaid.js emit completely different markup and layout,
so an exact match is impossible. The pixel overlay is the cross-renderer analogue:
a *deviation* score rather than a pass/fail.

## Method

- **kymo SVG** via `kymostudio-core` wasm (`mermaidToSvg`, …, dispatched per
  grammar). **mermaid.js 11.15 SVG** via `mermaid.render()` in headless Chrome.
- **Both** SVGs rasterised through **the same Chrome** (`<img>` at its natural
  `viewBox` size, `deviceScaleFactor: 1`) — one rasteriser, so font/anti-alias
  noise cancels. kymo is text-based, so Chrome ≡ its resvg deploy path.
- **Overlay (as agreed): keep both PNGs as-is** — no resize, no re-scale. Paste
  each at the top-left of a shared `max(w₁,w₂) × max(h₁,h₂)` white canvas, then
  `pixelmatch(threshold 0.1)`. `diff% = differing-pixels / total-pixels`.
- **Self-test:** feeding the *same* SVG to both sides gives **diff = 0.000%**,
  so the pipeline (raster → pad → match) is sound.

## What the metric actually measures — read this before trusting a number

The overlay is dominated by **two things, neither of which is "correctness":**

1. **Ink density.** Most of a flowchart canvas is white. A diagram drawn in thin
   outlines differs in few pixels even when wrong; a diagram with filled fills
   (subgraph backgrounds, `classDef` colours) differs in many even when right.
2. **Layout offset.** kymo and mermaid lay nodes out at different positions and
   sizes. Two *structurally identical* diagrams still fail to overlap, so the
   number reflects layout divergence more than shape correctness.

So the absolute % is **not** a similarity score. It is useful for **ranking**
(which grammars/sources sit far from mermaid) and **catching outliers**, not as a
"% correct". The three regimes below make this concrete.

## Trial — first 5 flowcharts (mermaid-cypress)

| # | source | diff% | regime |
|---|---|---|---|
| 1 | `appli_001` | **2.5%** | sparse outlines — low *despite* a totally different layout |
| 2 | `conf-and-directives_000` | 6.0% | typical: same structure, slight position offset |
| 3 | `conf-and-directives_001` | 5.8% | typical |
| 4 | `conf-and-directives_002` | **49.8%** | filled `classDef` colours + an unsupported shape |
| 5 | `conf-and-directives_003` | 6.5% | typical |

`n=5 · mean 14.1% · median 6.0% · p90 49.8% · self-test 0.000%`

## Examples

### Typical (~6%) — `conf-and-directives_000`

Same graph (`Default → section{End, /Another/}`), default theme. Outlines nearly
overlap but are offset, so the diff is a thin red tracing — low because the
canvas is mostly white.

| kymo | mermaid.js | overlay diff |
|---|---|---|
| ![](assets/2026-06-14-pixel/typical.kymo.png) | ![](assets/2026-06-14-pixel/typical.mermaid.png) | ![](assets/2026-06-14-pixel/typical.diff.png) |

### Lowest (2.5%) — `appli_001` — why low ≠ aligned

kymo stacks the subgraphs vertically on the left; mermaid nests them on the
right. The layouts barely overlap — yet because everything is thin outline on
white, the score is the *lowest* of the five. This is the metric's blind spot:
sparse art hides layout divergence.

| kymo | mermaid.js | overlay diff |
|---|---|---|
| ![](assets/2026-06-14-pixel/sparse.kymo.png) | ![](assets/2026-06-14-pixel/sparse.mermaid.png) | ![](assets/2026-06-14-pixel/sparse.diff.png) |

### Highest (49.8%) — `conf-and-directives_002` — a real gap surfaced

mermaid applies the source's `classDef` (cyan subgraph, red nodes) and draws
`[/Another/]` as a **parallelogram**. kymo keeps its default blue theme, adds a
dotted-grid background, and — the genuine finding — **does not parse the
`[/…/]` lean shape**, rendering a rounded box with the literal text `/Another/`.
The filled areas push the overlay to ~50%.

| kymo | mermaid.js | overlay diff |
|---|---|---|
| ![](assets/2026-06-14-pixel/styled.kymo.png) | ![](assets/2026-06-14-pixel/styled.mermaid.png) | ![](assets/2026-06-14-pixel/styled.diff.png) |

## What the trial surfaced

- **Genuine kymo gaps** (the high-diff outlier): the `[/…/]` parallelogram (and by
  extension `[\…\]`, `[/…\]`, `[\…/]` trapezoids) is not parsed, and `classDef` /
  inline `style` colours are ignored.
- **Confirmed metric character:** default-theme flowcharts cluster at ~5–7%
  (structure matches, layout offset); filled/styled diagrams jump to ~50%; sparse
  diagrams stay low regardless of layout — so the number ranks divergence, it does
  not grade correctness.

## Status / next

Validated end-to-end on a 5-source flowchart sample (self-test 0%, natural-size
rasterisation, overlay + pixelmatch). The script is parameterised to scale to all
nine own-engine grammars (sampling from `mermaid-cypress` → `merman`, excluding
`known-divergent.json`, caching the mermaid PNG). Run it wide once the sample
size and whether to report raw-vs-cropped are settled — for now it is a
divergence-ranking and outlier-catching tool, complementing the label-recall and
glyph-correctness passes.

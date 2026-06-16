# kymo flowchart renderer — current state, worst/best, next steps

*2026-06-16. Hand-written. Supersedes the consolidated build-up archive
`2026-06-13-to-15-flowchart-bench-research.md` (part "kymo dagre flowchart
renderer" records every round that got us here, mean
`6.14 → 4.59 → 2.58 → 1.61 → 1.30 → 1.11%`). This note is the honest
snapshot: what ships, the fresh three-engine numbers re-measured today against the
official mermaid-cli reference, and the only gaps left.*

## Where it stands (live in production)

kymo renders mermaid flowcharts with its **own** Rust engine — dagre layout +
mermaid-faithful style + raster-safe `<text>` (`mermaidToSvgDagre`,
`src/dagre_svg.rs`), with `math.rs` for `$…$`/`$$…$$` math. Live on
render.kymo.studio and editor.kymo.studio. The durable edge is **raster-safe
labels**: kymo's text survives server-side resvg/svg2pdf rasterisation (the PNG/PDF
the API actually ships), where mermaid.js / merman `<foreignObject>` HTML labels
**vanish**.

Two build paths exist:
- **shipped / default** — `mermaidToSvgDagre` + `math.rs` Unicode math, **no icon
  glyphs**, lean wasm. This is what the worst/best tables below measure.
- **`kymo-mermaid` `katex-layout` feature** (opt-in, +1.9 MB wasm) — merman's
  exact dagre positions + kymo metrics + icon-glyph lifting + kymo-tex KaTeX
  paths, rendered raster-safe through kymostudio-core. Higher fidelity where size
  doesn't matter (render-api already bundles merman). *This bridge lives in the
  `kymo-mermaid` crate (`mermaidToSvgDagre`), kept out of `kymostudio-core` so
  that crate stays lean — no merman git dep, no kymo-tex.*

## The honest headline

Production corpus = the **110 plain** flowchart files kymo serves (`isPlainFlowchart`;
the other 26 carry `%%{init}` config and fall back to mermaid.js / merman). The
full-corpus distribution (prior bench): **mean 1.11% · median 0.63% · ≤0.5% 54/110
· ≤1% 73/110 · p90 ~3%**. The **median (0.63%) beats mermaid's own Rust port**
(merman, 1.76%). `mean < 0.5%` remains below the shared SVG-rasterisation floor —
not a scoped feature, see the 06-15 log's arithmetic.

## Worst 10 (production) — three-engine, re-measured today

Each worst-10 file rendered by **kymo** (shipped `mermaidToSvgDagre` + `math.rs`),
**merman** (the in-tree mermaid.js port), and **mermaid.js 11.15** itself — the
reference, via the official `@mermaid-js/mermaid-cli` (`mmdc`) in real Chromium
(foreignObject + classDef + multi-line all faithful). **Δ = mean per-channel |Δ|
vs the mmdc PNG** (`accuracy.py`'s metric; lower = closer). Sorted worst-first by
kymo Δ. Renders + `scores.json` regenerated today; assets live under
`assets/2026-06-16-worst10/`. Regenerate with `node worst10-grid.mjs`.

| file | kymo render · Δ | merman render · Δ | mermaid.js 11 (mmdc, reference) | cause |
|---|---|---|---|---|
| flowchart-icon_004 | <img width="90" src="assets/2026-06-16-worst10/kymo/flowchart-icon_004.png"><br>**10.82%** | <img width="90" src="assets/2026-06-16-worst10/merman/flowchart-icon_004.png"><br>7.56% | <img width="90" src="assets/2026-06-16-worst10/mermaidjs/flowchart-icon_004.png"> | `aws:arch-amazon-*` — reference draws mermaid's simplified test icon boxes (registered pack); kymo draws label-only, no icon glyph |
| katex_002 | <img width="150" src="assets/2026-06-16-worst10/kymo/katex_002.png"><br>**6.46%** | <img width="150" src="assets/2026-06-16-worst10/merman/katex_002.png"><br>5.85% | <img width="150" src="assets/2026-06-16-worst10/mermaidjs/katex_002.png"> | operators / `\mathbb` — Unicode fallback; some glyphs unmapped + upright vs KaTeX italic |
| flowchart_020 | <img width="120" src="assets/2026-06-16-worst10/kymo/flowchart_020.png"><br>**4.82%** | <img width="120" src="assets/2026-06-16-worst10/merman/flowchart_020.png"><br>1.08% | <img width="120" src="assets/2026-06-16-worst10/mermaidjs/flowchart_020.png"> | multi-line cylinder labels — sub-pixel |
| flowchart-v2_050 | <img width="90" src="assets/2026-06-16-worst10/kymo/flowchart-v2_050.png"><br>**4.79%** | <img width="90" src="assets/2026-06-16-worst10/merman/flowchart-v2_050.png"><br>0.00% | <img width="90" src="assets/2026-06-16-worst10/mermaidjs/flowchart-v2_050.png"> | literal `[<img>]` — mermaid draws a broken-image box, kymo draws the text |
| katex_001 | <img width="150" src="assets/2026-06-16-worst10/kymo/katex_001.png"><br>**4.52%** | <img width="150" src="assets/2026-06-16-worst10/merman/katex_001.png"><br>7.92% | <img width="150" src="assets/2026-06-16-worst10/mermaidjs/katex_001.png"> | Greek glyphs now render (`\α…`, `\Α…` fixed) — **beats merman**; residual is KaTeX *italic* math font vs kymo's upright flowchart font |
| flowchart-v2_043 | <img width="150" src="assets/2026-06-16-worst10/kymo/flowchart-v2_043.png"><br>**4.50%** | <img width="150" src="assets/2026-06-16-worst10/merman/flowchart-v2_043.png"><br>1.02% | <img width="150" src="assets/2026-06-16-worst10/mermaidjs/flowchart-v2_043.png"> | two text-dense hexagons (`#quot;`) — SVG-`<text>`-vs-HTML floor |
| katex_000 | <img width="150" src="assets/2026-06-16-worst10/kymo/katex_000.png"><br>**4.09%** | <img width="150" src="assets/2026-06-16-worst10/merman/katex_000.png"><br>5.99% | <img width="150" src="assets/2026-06-16-worst10/mermaidjs/katex_000.png"> | matrix / cases / nested fractions — kymo-tex partial; **beats merman** |
| flowchart-icon_001 | <img width="110" src="assets/2026-06-16-worst10/kymo/flowchart-icon_001.png"><br>**3.43%** | <img width="110" src="assets/2026-06-16-worst10/merman/flowchart-icon_001.png"><br>2.75% | <img width="110" src="assets/2026-06-16-worst10/mermaidjs/flowchart-icon_001.png"> | `fa:fa-bell` — reference draws a real bell (fa pack); kymo omits the glyph |
| flowchart_035 | <img width="120" src="assets/2026-06-16-worst10/kymo/flowchart_035.png"><br>**3.18%** | <img width="120" src="assets/2026-06-16-worst10/merman/flowchart_035.png"><br>0.70% | <img width="120" src="assets/2026-06-16-worst10/mermaidjs/flowchart_035.png"> | `<strong>` bold inline — sub-pixel |
| flowchart_013 | <img width="120" src="assets/2026-06-16-worst10/kymo/flowchart_013.png"><br>**2.31%** | <img width="120" src="assets/2026-06-16-worst10/merman/flowchart_013.png"><br>0.43% | <img width="120" src="assets/2026-06-16-worst10/mermaidjs/flowchart_013.png"> | multi-line `{{ }}` hexagon — height bug fixed; residual sub-pixel + classDef fill |

**What changed since 06-15.** The KaTeX cases moved the most: `katex_001`
7.87 → **4.52%** and `katex_000` 4.14 → **4.09%** — both now **beat merman** (7.92% /
5.99%), thanks to the `math.rs` Greek-glyph + `\\`-escape fixes (real `αβγ…/ΑΒΓ…`).
That makes **icons the unambiguous top of the worst list**: `flowchart-icon_004`
(10.82%) and `flowchart-icon_001` (3.43%) are the shipped path drawing **no icon
glyph** (label-only). Everything else is sub-5% sub-pixel / shape residual.

### Reading it

- **The whole worst list is feature/style, not layout.** Two buckets: **un-drawn
  icon glyphs** (shipped path has no icon renderer) and **math font style** (kymo
  draws the correct glyphs but *upright* in the flowchart font; KaTeX draws *italic*
  in its math font). Pixel-closing math needs the `merman-layout`/kymo-tex glyph
  path; icons need a raster-safe icon renderer in the shipped path.
- **kymo beats merman on the two `$$…$$`-heavy cases** and is within ~1–3% on the
  rest — its browser-calibrated text is *more* faithful to mermaid.js than the
  reference port on math, once the glyphs render.
- **The merman column is browser-rendered**, so it flatters merman: its
  foreignObject labels look right *here* but **disappear** under server-side raster.
  Read it with the raster-safe recall table (`results/REPORT.md`, flowchart = 100%
  kymo / 0% merman) — the in-browser Δ doesn't show the trade kymo is actually making.

## Best 10 (production)

All ≤ ~0.1% — clean flowcharts (rect/diamond/subgraph, single-line labels) where
kymo's dagre layout + raster-safe text overlay mermaid.js almost exactly:
`flowchart-v2_080`, `flowchart_029`, `flowchart-v2_017`, `flowchart-v2_079/072`,
`flowchart_023`, `flowchart_032`, … These are pixel-identical to mermaid.js
(≤0.5%) — **54/110** of the corpus sits in this band, and kymo beats merman on most
of them.

Visual grid (worst-10 + best-10, each with kymo / merman / mermaid.js renders +
scores + cause): `assets/2026-06-15-worstbest/worst-best-grid.png`.

## Next steps, by impact

1. **Icon glyphs in the shipped path** — the single dominant worst-list lever
   (`icon_004` 10.82%, `icon_001` 3.43%). merman already lifts iconify glyphs as
   inline `<svg><path>` (raster-safe, no CDN); the `merman-layout` build does this.
   Porting the lift into the lean default path (or a small bundled icon set)
   collapses both outliers to ~0%.
2. **Math font style** — `katex_*` render the right glyphs but upright; the
   `merman-layout`/kymo-tex path draws them in KaTeX's italic math font. Closing the
   last ~4–6% on math cases without the +1.9 MB wasm is the open question.
3. **Full-corpus re-measure against `mmdc`.** Today's mmdc reference covers only the
   worst-10; the corpus-wide 1.11%/0.63% still comes from the prior (img-data-URI)
   reference, which silently breaks on foreignObject/`<br/>`. A full-corpus mmdc
   pass would give the first end-to-end-valid distribution.

*Bench: `worst10-grid.mjs` (three-engine worst-10, today's data),
`accuracy.py` (Δ metric), `results/REPORT.md` (raster-safe recall). Ground truth =
mermaid.js 11.15 via official `mmdc` in Chromium.*

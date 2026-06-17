# kymo flowchart renderer — current state, worst/best, next steps

*2026-06-16. Hand-written. Supersedes the consolidated build-up archive
`2026-06-13-to-15-flowchart-bench-research.md` (part "kymo dagre flowchart
renderer" records every round that got us here, mean
`6.14 → 4.59 → 2.58 → 1.61 → 1.30 → 1.11%`). This note is the honest
snapshot: what ships, the fresh three-engine numbers re-measured today against the
official mermaid-cli reference, and the only gaps left.*

> **Revised later 2026-06-16 (math reference).** The worst-10 math numbers and the
> katex deep-dive below were re-measured after a finding that overturns the earlier
> same-day "MathML cross-engine floor" conclusion: mermaid's **default** math
> reference (`output:"mathml"`) is rendered by the browser's *native MathML engine*,
> which resolves `font-family:math` to an **OS font** — so the reference is **not
> reproducible across machines** (macOS→STIX Two Math; Linux→broken). The bench now
> renders the reference with mermaid `forceLegacyMathML:true` (KaTeX's own HTML +
> bundled webfonts — the same engine kymo implements), and kymo was recalibrated to
> that target. See "Deep-dive: the math reference is not portable" at the end.

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
(foreignObject + classDef + multi-line all faithful). **The reference now renders
math with `forceLegacyMathML:true`** (KaTeX's own HTML + bundled webfonts, the only
OS-reproducible math render — see the deep-dive) `+ themeCSS` zeroing the
`.katex-display` margin. **Δ = mean per-channel |Δ| vs the mmdc PNG**
(`accuracy.py`'s metric; lower = closer). Sorted worst-first by kymo Δ. Renders +
`scores.json` regenerated today; assets under `assets/2026-06-16-worst10/`.
Regenerate with `node worst10-grid.mjs`.

| file | kymo render · Δ | merman render · Δ | mermaid.js 11 (mmdc, reference) | cause |
|---|---|---|---|---|
| flowchart-icon_004 | <img width="90" src="assets/2026-06-16-worst10/kymo/flowchart-icon_004.png"><br>**10.82%** | <img width="90" src="assets/2026-06-16-worst10/merman/flowchart-icon_004.png"><br>7.56% | <img width="90" src="assets/2026-06-16-worst10/mermaidjs/flowchart-icon_004.png"> | `aws:arch-amazon-*` — reference draws mermaid's simplified test icon boxes (registered pack); kymo draws label-only, no icon glyph |
| katex_001 | <img width="150" src="assets/2026-06-16-worst10/kymo/katex_001.png"><br>**6.22%** | <img width="150" src="assets/2026-06-16-worst10/merman/katex_001.png"><br>6.34% | <img width="150" src="assets/2026-06-16-worst10/mermaidjs/katex_001.png"> | densest case (24 Greek glyphs/line) — **raster-floor × max glyph density**: text spans + positions match KaTeX exactly (ink span 725≈729px, no drift), residual is path-fill vs font-render edge AA, ∝ glyph density. merman 6.34% = it renders **raw LaTeX** (4304px wide), not a real match |
| flowchart_020 | <img width="120" src="assets/2026-06-16-worst10/kymo/flowchart_020.png"><br>**4.82%** | <img width="120" src="assets/2026-06-16-worst10/merman/flowchart_020.png"><br>1.08% | <img width="120" src="assets/2026-06-16-worst10/mermaidjs/flowchart_020.png"> | multi-line cylinder labels — sub-pixel |
| flowchart-v2_050 | <img width="90" src="assets/2026-06-16-worst10/kymo/flowchart-v2_050.png"><br>**4.79%** | <img width="90" src="assets/2026-06-16-worst10/merman/flowchart-v2_050.png"><br>0.00% | <img width="90" src="assets/2026-06-16-worst10/mermaidjs/flowchart-v2_050.png"> | literal `[<img>]` — mermaid draws a broken-image box, kymo draws the text |
| katex_002 | <img width="150" src="assets/2026-06-16-worst10/kymo/katex_002.png"><br>**4.68%** | <img width="150" src="assets/2026-06-16-worst10/merman/katex_002.png"><br>4.54% | <img width="150" src="assets/2026-06-16-worst10/mermaidjs/katex_002.png"> | logic / `\mathbb` symbols — raster-floor × glyph density (2.6% dark); was 6.46% vs the old macOS-MathML/STIX reference, 4.68% vs reproducible KaTeX-HTML |
| flowchart-v2_043 | <img width="150" src="assets/2026-06-16-worst10/kymo/flowchart-v2_043.png"><br>**4.50%** | <img width="150" src="assets/2026-06-16-worst10/merman/flowchart-v2_043.png"><br>1.02% | <img width="150" src="assets/2026-06-16-worst10/mermaidjs/flowchart-v2_043.png"> | two text-dense hexagons (`#quot;`) — SVG-`<text>`-vs-HTML floor |
| flowchart-icon_001 | <img width="110" src="assets/2026-06-16-worst10/kymo/flowchart-icon_001.png"><br>**3.43%** | <img width="110" src="assets/2026-06-16-worst10/merman/flowchart-icon_001.png"><br>2.75% | <img width="110" src="assets/2026-06-16-worst10/mermaidjs/flowchart-icon_001.png"> | `fa:fa-bell` — reference draws a real bell (fa pack); kymo omits the glyph |
| flowchart_035 | <img width="120" src="assets/2026-06-16-worst10/kymo/flowchart_035.png"><br>**3.18%** | <img width="120" src="assets/2026-06-16-worst10/merman/flowchart_035.png"><br>0.70% | <img width="120" src="assets/2026-06-16-worst10/mermaidjs/flowchart_035.png"> | `<strong>` bold inline — sub-pixel |
| katex_000 | <img width="150" src="assets/2026-06-16-worst10/kymo/katex_000.png"><br>**2.44%** | <img width="150" src="assets/2026-06-16-worst10/merman/katex_000.png"><br>5.97% | <img width="150" src="assets/2026-06-16-worst10/mermaidjs/katex_000.png"> | node + edge math, real KaTeX — **2.44% vs the reproducible KaTeX-HTML reference, essentially at the raster floor (~2.26%)**, beats merman 5.97% (raw LaTeX). Recalibrated to KaTeX-HTML: `MathStyle::Display` + keep `\phase` (the ∠ phasor) — both were earlier overfit to the macOS-MathML artifact (3.12% then) |
| flowchart_013 | <img width="120" src="assets/2026-06-16-worst10/kymo/flowchart_013.png"><br>**2.31%** | <img width="120" src="assets/2026-06-16-worst10/merman/flowchart_013.png"><br>0.43% | <img width="120" src="assets/2026-06-16-worst10/mermaidjs/flowchart_013.png"> | multi-line `{{ }}` hexagon — height bug fixed; residual sub-pixel + classDef fill |

**What changed.** Against the new **reproducible** reference (KaTeX-HTML, OS-independent),
the math residual collapses to a pure **raster-floor-×-glyph-density** signal:
`katex_000` **2.44%** (near the ~2.26% raster floor; beats merman 5.97%), `katex_002`
**4.68%** (was 6.46% vs the old macOS-only MathML/STIX reference), `katex_001` **6.22%**
(the densest line — most glyph pixels → most floor). Δ tracks glyph density almost
linearly (000: 1.7% dark→2.44%, 002: 2.6%→4.68%, 001: 3.7%→6.22%). **Icons are the unambiguous
top of the worst list**: `flowchart-icon_004` (10.82%) and `flowchart-icon_001` (3.43%)
draw **no icon glyph** (label-only). Everything else is sub-5% sub-pixel / shape /
raster-floor residual — no layout error anywhere.

### Reading it

- **The whole worst list is feature/raster-floor, not layout.** Two buckets:
  **un-drawn icon glyphs** (shipped path has no icon renderer) and **math raster
  floor** (kymo draws the correct KaTeX glyphs as `<path>` outlines; the reference
  font-renders the same KaTeX webfonts — the path-fill-vs-font-render edge difference
  is irreducible and scales with glyph density). Icons need a raster-safe icon
  renderer in the shipped path; math is already at its floor.
- **kymo renders the math correctly cross-OS — the other two don't.** merman emits
  **raw LaTeX** for `$$…$$` (e.g. katex_001 4304px of source text); mermaid's default
  MathML render **breaks on Linux** (italic variables vanish). kymo's KaTeX glyph
  paths are the only engine that renders this math correctly on the server target.
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
2. **Math is at its floor — don't chase it.** Against the reproducible KaTeX-HTML
   reference, `katex_*` Δ is purely raster-floor × glyph density (katex_000 2.44% ≈
   the 2.26% floor). The only sub-floor lever left is embedding the exact KaTeX
   0.16.47 font *outlines* in kymo-tex (the ~40% non-edge residual on bold uppercase),
   low ROI. kymo already renders this math correctly cross-OS; merman/MathML do not.
3. **Full-corpus re-measure against `mmdc` (with `forceLegacyMathML`).** Today's
   reference covers only the worst-10; the corpus-wide 1.11%/0.63% still comes from
   the prior (img-data-URI) reference, which silently breaks on foreignObject/`<br/>`.
   A full-corpus mmdc pass — **using the reproducible KaTeX-HTML reference** — would
   give the first end-to-end-valid, OS-independent distribution.

*Bench: `worst10-grid.mjs` (three-engine worst-10, today's data),
`accuracy.py` (Δ metric), `results/REPORT.md` (raster-safe recall). Ground truth =
mermaid.js 11.15 via official `mmdc` in Chromium.*

## Deep-dive: the math reference is not portable — switch to KaTeX-HTML (2026-06-16, revised)

This **supersedes** the earlier same-day "MathML cross-engine floor / 3.12%"
conclusion (kept in git history). Two real fixes from that pass still stand; the
*conclusion* was measured against an OS-dependent reference and is corrected here.

**Still-valid fixes (real bugs, kept):**
1. **HTML-entity decode in the math measurer** — merman HTML-encodes label chars
   (`=` → `&#61;`), so kymo-tex failed to parse math nodes containing `=`/`<`/`>` →
   oversized plain-text sizing. Decoding before measuring fixed node dims (A 260×126
   → ~254×73, D 230×102 → 131×84, E 320×102 → 249×73).
2. **Edge-label math rendering** — `$$…$$` edge labels render real KaTeX glyphs, plus
   a `\\`-in-math protector (merman splits `\\ `/`\\,` as line breaks inside `$$`,
   which mermaid.js does not).

**The overturning finding — the MathML reference is OS-dependent.** mermaid's default
math path is `katex.renderToString(…, output:"mathml")` (`common.ts`), so the browser's
**native MathML engine** renders it, resolving `font-family:math` to an **OS font**:
- **macOS** (the bench machine): Chrome → **STIX Two Math** (a system font in
  `/System/Library/Fonts/Supplemental`). Confirmed via CDP `getPlatformFontsForNode`.
- **Linux** (Chrome 149, the real server/CI target): no math font installed → Chrome
  falls back to **Liberation Serif** (no OpenType MATH table) → **every italic variable
  vanishes** (math-italic maps to Mathematical-Alphanumeric U+1D400, unmapped → glyph
  suppressed), no stretchy delimiters, no large operators. Validated by rendering
  `katex_000` via mmdc on a Linux box — visibly broken.
- Chrome source: the `math` generic font default is hardcoded to "Latin Modern Math"
  (commit `2103612e`); absent → OS fallback; **no bundled math font, no Firefox-style
  fallback list**.

So the earlier **3.12%** was kymo-KaTeX measured against **macOS-Chrome-MathML-STIX** — a
target that **changes per OS** and is **broken on the Linux server kymo actually ships to**.

**The fix — a reproducible reference.** `forceLegacyMathML:true` makes mermaid call KaTeX
with `output:"htmlAndMathml"` → it renders via **KaTeX's own HTML + bundled webfonts**:
self-contained, identical on every OS, and the **same engine kymo-tex implements**.
`themeCSS:".katex-display{margin:0}"` zeroes the 1em display margin that otherwise bakes
~2× node-rect height (an HTML artifact, not geometry). The bench now uses this.

**kymo recalibrated to the correct target** (`katex.rs`) — two earlier "fixes" were
overfit to the macOS-MathML artifact and reverted:
- `MathStyle::Text` → **`Display`** (Text had been chosen because it matched Chrome-MathML's
  `displaystyle=false`; KaTeX-HTML is genuinely display-style).
- **dropped the `\phase`-strip** — Chrome-MathML can't draw `<menclose notation="phasorangle">`
  so the macOS reference showed only `−78°`; KaTeX-HTML draws the full `∠−78°` phasor.

**New numbers (vs the reproducible KaTeX-HTML reference):**
- `katex_000` 3.12% (macOS artifact) → **2.44%** — essentially at the raster floor
  (~2.26%); beats merman 5.97% (raw LaTeX).
- `katex_002` 6.46% → **4.68%**.
- `katex_001` 4.52% → **6.22%** — the densest case.

**The residual is now a pure raster-floor-×-density signal.** Δ tracks glyph-pixel density
almost linearly — katex_000 1.7% dark→2.44%, katex_002 2.6%→4.68%, katex_001 3.7%→6.22%
(Δ/density ≈ 1.4–1.8, ~constant). Dissecting `katex_001` (the apparent "anomaly"): text
ink-span matches (725≈729px → no scale drift), band energy doesn't grow across the line
(no advance accumulation), a σ=3 blur removes ~60% of Δ (edge/AA), uppercase glyphs carry
2× lowercase error (bigger → more edge pixels). I.e. it is the **path-fill vs font-render**
edge difference (kymo emits `<path>` outlines; the reference font-renders the *same* KaTeX
glyphs), maximally exposed by glyph density — **not a layout or correctness bug**.

**Two floors stack, neither a kymo bug:**
1. **Raster glyph floor (~2.26%)** — path-fill ≠ font-render, irreducible while staying
   raster-safe; scales with glyph density.
2. **Font-outline residual** (~40% of the non-edge part, bold uppercase) — kymo-tex's
   bundled KaTeX outlines vs katex 0.16.47's exact webfonts. The only sub-floor lever
   (embed the exact outlines), low ROI.

**Conclusion.** Against a reproducible, OS-independent, *same-engine* reference, kymo's math
residual is the raster-safe glyph floor × glyph density — `katex_000` **2.44%** ≈ the floor.
kymo is the **only** engine that renders this math correctly cross-OS: merman emits raw
LaTeX, and mermaid's default MathML **breaks on the Linux server target**. The earlier
"overfit toward one browser's MathML" worry was right but understated — the real target was
one **OS's system font**. Don't chase math further; the dominant worst-list lever is icons.

**Reproduce / harnesses** (`benches/mermaid-format/`):
- `katex-font-probe.mjs` — CDP `getPlatformFontsForNode`: which font Chrome resolves for
  MathML (macOS STIX Two Math vs Linux Liberation Serif).
- `katex-legacy-rescore.mjs` — kymo Δ vs *both* references (default MathML vs
  `forceLegacyMathML`), proving the reproducible target lowers Δ.
- `katex-construct-diff.mjs` — per-construct kymo-vs-reference box ratios.
- `layout-accuracy.mjs` — **coordinate** (not pixel) accuracy: node position/size + edge
  polyline vs mermaid.js (positions match to ~0.1–5 px → dugong is a faithful dagre port).
- Cross-engine parse/render context for all three renderers: `docs/research/mermaid-tools/`.

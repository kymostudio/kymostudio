# kymo vs merman vs mmdr — multi-engine fidelity bench

*2026-06-17. Hand-written. Scores the three native Mermaid renderers against the
**mermaid.js (mmdc) reference** with the pixel-Δ metric, across the corpus:
**kymo** (`mermaidToSvgDagre`), **merman** (`mermaidRenderSvg`, the faithful Rust
port), and **mmdr** (`mermaid-rs-renderer` v0.2.2, the independent pure-Rust
renderer). All four SVGs rasterised through the *same* Chromium pipeline (DSF 2,
`geometricPrecision`, no hinting) so the number is pure render difference. The
twist is in §2 — the in-browser ranking inverts once you account for raster-safety.
Harness: `engine-bench.mjs` (`node engine-bench.mjs --all`).*

## 1. All metrics vs the mermaid.js reference (102 plain `flowchart*` files)

Every metric, every engine — not just the headline pixel-Δ. The four coordinate
metrics map to the pipeline stages (`2026-06-17-pipeline-accuracy.md`); pixel-Δ is the
end-to-end raster. All vs the mmdc reference; lower = closer.

| engine | **topology** ✓ (parse) | **pos** med / p90 (layout) | **size** med | **edge** med | **pixel-Δ** med / p90 / max (e2e) |
|---|---|---|---|---|---|
| **merman** | **102/102 (100%)** | **0.0 / 0.0 px** | **0.0 px** | **0.0 px** | **0.00% / 0.54% / 3.17%** |
| **kymo** | **102/102 (100%)** | 1.2 / 105 px | 1.9 px | 1.3 px | 1.12% / 3.18% / 6.32% |
| **mmdr** | 46/102 (45%) | 86 / 261 px | 56 px | 51 px | 5.47% / 11.75% / 43.97% |

pixel-Δ ≤1% / ≤2% / ≤5%: **merman 97/99/100%**, **kymo ~45/66/95%**, **mmdr 0/0/38%**.
Per-file winner (lowest pixel-Δ): merman ≫ kymo ≫ mmdr. kymo beats mmdr on **97%** of
files; loses to merman on 99% (§2 explains why that inverts).

- **merman is the ceiling on *every* metric** — topology 100%, geometry exactly 0.0 px,
  pixel 0.00%. It is mermaid.js ported (LALRPOP grammar + dugong dagre + the same
  `<foreignObject>` labels, rasterised in the same browser), so it *is* the reference.
  Useful as the oracle, not interesting as a result.
- **kymo** — now **topology 100%** (its renderer parses via merman's grammar-faithful
  parser, translated to kymo's IR — see below), geometry **~1 px** at the median
  (merman/dugong layout), pixel **1.15%** raster-safe. The 105 px pos p90 is a **real**
  nested-subgraph layout divergence (kymo's `build_geom` places nested members unlike
  merman; pixel under-reports it on sparse canvases — see `2026-06-17-pipeline-accuracy.md`),
  confirmed by id-matching. Pixel **max 6.32%** now — the old 41% themed outlier
  (`flowchart-v2_030`) dropped to **0.71%** after kymo lifts merman's computed theme
  palette (see below); the worst is `flowchart-v2_050` (`[<img>]`: mermaid draws a
  broken-image box, kymo draws the text — a reference quirk, not a defect).
- **mmdr** — divergent on *every* stage: topology only **45%** (it parses/structures a
  different graph), geometry an order of magnitude off (pos median **86 px** vs kymo's
  1.2, size 56 px, edge 51 px), pixel **5.47%**. Its independent custom layout is its
  own geometry, not mermaid.js's. *(mmdr's coordinate numbers are best-effort — no node
  ids, id-less-matched — but at 70× kymo's error the divergence is unambiguously real.)*

**The topology row was the tell — and kymo closed it.** merman parses mermaid's grammar
verbatim (100%); kymo's *own* hand-written parser used to hit 84%, with that 16% gap
producing its pixel-worst cases. kymo now **routes parsing through merman** (translating
merman's render model into kymo's `Flowchart` IR before its raster-safe render), so it
inherits the 100% parse while keeping raster-safety. mmdr remains a different renderer
end to end (45%).

## 2. The ranking inverts under raster-safety (the metric that matters)

§1 rasterises in a **browser**, which renders `<foreignObject>` HTML. But kymo's
product target is **server-side resvg/svg2pdf** (the PNG/PDF the API ships), and
**resvg does not render foreignObject** — so merman's and mermaid.js's labels
**vanish** there. The raster-safe label recall (`results/REPORT.md`): **kymo 100%**
of mermaid.js's visible flowchart labels survive resvg; **merman drops them all**.

So the §1 win is a browser-only artifact. Re-read on the deployment axis:

| engine | in-browser fidelity | raster-safe (server resvg) | both? |
|---|---|---|---|
| **merman** | ★★★ (0.00%) | ✗ — foreignObject labels vanish (≈0% recall) | no |
| **kymo** | ★★ (1.10%) | ✓ — `<text>` paths, **100% recall** | **yes** |
| **mmdr** | ✗ (5.47%) | ✓ — own resvg, `<text>` | no |

**kymo is the only engine that is both faithful *and* raster-safe.** merman is the
most faithful but **browser-only** (useless for headless PNG/PDF); mmdr is raster-safe
but **5× less faithful** (its own layout). On a Linux server rendering to PNG, merman
produces blank-label diagrams and mermaid.js's native MathML also breaks
(`2026-06-16-flowchart-mermaid-style.md`) — kymo is the one that renders correctly.

## 3. Read-out per engine

- **merman** — the fidelity *ceiling* (it IS mermaid.js, ported). Use it as the
  in-browser oracle, not as a shippable server renderer. kymo borrows its dugong
  layout precisely to inherit this fidelity while swapping the label layer for a
  raster-safe one.
- **kymo** — ~1% from the ceiling *and* raster-safe (median 1.12%, max 6.32%). It now
  inherits two things from merman by *lifting*, not re-implementing: the **parser**
  (→ topology 100%) and the **theme palette**. On `%%{init themeVariables}%%`, merman
  already runs mermaid's khroma color engine, so kymo lifts its computed colours
  (node fill/stroke, text, edge, cluster) onto its raster-safe shapes as a CSS
  override — `flowchart-v2_030` went 41% → 0.71% with **no khroma port and no
  gradient** (merman flat-fills themed nodes; the gradient it defines is unused).

**Gradient note (the comparison question).** Gradient is a **`look:neo`-only** feature
(the `[data-look="neo"]` CSS rules) — *no classic/themed diagram renders one*, so every
themed corpus file (v2_030 included) is flat and kymo already matches it exactly. On
`look:neo`: **mmdc** gradient-strokes nodes + drop-shadow; **merman defines the gradient
but flat-fills** (`url(#…)` refs = 0 — it doesn't implement neo); **mmdr emits none**.
kymo **now implements it** — lifting merman's `<linearGradient>` def (theme-derived
stops, byte-identical to mermaid) + applying `stroke:url(#fc-theme-gradient)` + the
drop-shadow filter when `look:neo`, making kymo the **only Rust engine** with neo
gradient (raster-safe — resvg renders `linearGradient`). On a neo diagram kymo (6.54%)
edges merman (6.57%); the gradient itself is exact but pixel-neutral here (the stops are
low-saturation ≈ flat, and the residual is neo node *sizing/shape*, not the stroke).
- **mmdr** — fast and broad (23 diagram types) but its independent layout is its own
  geometry; median 5.5% and 0% of files within 2% of mermaid.js. Good where "a
  diagram" matters more than "mermaid-faithful"; not a fidelity target.

## Conclusion

On the **in-browser** pixel metric: merman ≫ kymo ≫ mmdr. On the **raster-safe**
metric that matches the actual product (server PNG/PDF): only **kymo** is both
faithful and safe — merman's foreignObject vanishes, mmdr's layout diverges. The
right way to read §1 is "kymo is ~1% from the mermaid.js ceiling and **keeps that
fidelity through server rasterisation**, which neither alternative does."

*Bench: `engine-bench.mjs` (3 engines × all 5 metrics — topology/pos/size/edge/pixel-Δ
— vs mermaid.js 11.15 via `mmdc`, `forceLegacyMathML`; mmdr's coordinate metrics are
id-less best-effort). Data snapshot: `assets/2026-06-17-engine-comparison/corpus.json`.
Raster-safe recall: `results/REPORT.md`. Sisters:
`2026-06-17-pipeline-accuracy.md` (kymo per-stage), `2026-06-16-flowchart-mermaid-style.md`
(pixel-Δ + math reference), `docs/research/mermaid-tools/` (how each engine works).*

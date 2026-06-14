# kymo dagre flowchart renderer — state, problems, next steps

*2026-06-15. Hand-written. Supersedes `2026-06-14-flowchart-mermaid-style.md` (the
build-up log: the `FlowStyle` switch, the float-precision dagre path, and the
0.86 % → 0.19 % overlay story — now history, kept in git + commit messages).
This note is forward-looking: where the renderer stands, what's still wrong, and
what to do next.*

## Where it stands (2026-06-15)

kymo renders mermaid flowcharts with **its own** Rust engine — dagre layout
(`dagre` crate) + a mermaid-faithful style + raster-safe `<text>` labels
(`mermaidToSvgDagre`, `src/dagre_svg.rs`). It is **live in production on both
surfaces**:

- **render.kymo.studio** (render-api) — flowchart/graph sources route through
  `mermaidToSvgDagre`; PNG/PDF keep their labels (text-based SVG, no
  `foreignObject` for resvg/svg2pdf to drop).
- **editor.kymo.studio** — in-browser flowcharts render through the same engine,
  reusing the core wasm already loaded for kymo diagrams; the **~470 KB merman
  wasm is no longer bundled**.

Fidelity, measured by pixel-overlay vs mermaid.js 11.15 (both rasterised in
Chrome) on a 7-case set: **mean 0.19 %, every case ≤ 0.45 %** — vs the merman
port at 1.96 %. Verified live in a real browser on complex inputs (cycles,
nested back-edges, a subgraph cluster, mixed shapes, 8 edge labels).

### Visual proof (same source, five renders)

| kymo native | kymo **mermaid-style** | kymo **dagre** (live) | merman | mermaid.js 11.15 |
|---|---|---|---|---|
| ![](assets/2026-06-14-style/kymo-native.png) | ![](assets/2026-06-14-style/kymo-mermaid-style.png) | ![](assets/2026-06-14-style/kymo-dagre.png) | ![](assets/2026-06-14-style/merman.png) | ![](assets/2026-06-14-style/mermaidjs.png) |

The **kymo dagre** column (the shipped path) is visually indistinguishable from
merman and mermaid.js. Style follows the source: a mermaid source renders
mermaid-style; kymo sources are untouched.

---

## Problems (open)

### P1 — Serverless font: resvg has no Trebuchet *(highest impact)*
render-api registers **only Roboto** (`packages/render-api/fonts/`); the
mermaid-style stack is `'trebuchet ms', verdana, arial, sans-serif`, so resvg
falls back to Roboto. Node sizes are computed from **Trebuchet** metrics
(`CHAR_W_MERMAID`) but the glyphs are **drawn in Roboto** → a metric mismatch.
Short labels still fit (padding absorbs it — see the live resvg PNG), but long /
dense labels can sit slightly off-centre or crowd the box edge. **The 0.19 %
bench never sees this**: it rasterises kymo via Chrome (real Trebuchet), not
resvg. So the serverless path's true fidelity is unmeasured and < in-browser.

### P2 — Bench coverage is tiny (7 of 136)
The overlay bench runs ~7 hand-picked cases; the `mermaid-cypress/flowchart`
corpus has **136 `.mmd` files** unused. The `'w'` glyph bug (11.55 → 10.67) was
found only because one label happened to contain a `w`. Other glyphs (capitals,
digits, punctuation, accented/CJK) are **calibrated by eye, not measured** — the
same class of bug almost certainly hides elsewhere, invisible at this coverage.

### P3 — Direction + nesting barely tested
The `rankdir` fix (LR/RL/BT were silently TB) and the `'w'` fix together took LR
to 0.07 %, but on **one 4-node LR case**. RL/BT, LR-with-labels, and **nested
subgraphs** / `direction` inside a subgraph have no overlay numbers — only
single-level TB subgraphs are measured (and that case is the worst passing one at
0.45 %).

### P4 — Unsupported syntax silently falls back
kymo-dagre only handles "plain" flowcharts. Stadium `([…])`, double-circle,
hexagon variants, the `A --> B & C` fan, leading `---` front-matter and
`%%{init}%%` directives route **away** from kymo (to mermaid.js in the editor,
merman in render-api). That's safe (never a broken diagram) but means an
unknown fraction of real-world flowcharts never reach the kymo engine — and we
don't track which, or how big that fraction is.

### P5 — No regression guard, no CI for the prod paths
The 0.19 % is a manual bench run on the box; nothing in CI gates it, so a future
layout/sizing change can regress fidelity unnoticed. Separately, the render-api
and editor **TypeScript** changes have **no CI coverage** at all (the JS test
workflows skip these paths) — the production wiring rests on local verification.

### P6 — Loose ends
- `kymo-mermaid` is still a **declared-but-unused** dependency in
  `packages/editor/package.json` (pruning deferred to avoid lockfile churn; the
  bundle already excludes it).
- `mermaidToSvgDagre` is **hardcoded to `FlowStyle::Mermaid`**. There is no
  kymo-branded dagre variant, so "kymo layout via dagre, kymo colours" is not
  available even though the layout work would support it.

---

## Next steps (prioritised)

1. **Ship a Trebuchet-metric font to resvg (P1).** Bundle a metric-compatible
   face (e.g. a Trebuchet-equivalent or DejaVu/Liberation tuned to the
   `CHAR_W_MERMAID` advances) and register it in `engine.ts ensure()`, or
   recalibrate `CHAR_W_MERMAID` to the *actually-registered* font. Then add a
   **resvg-side** overlay measurement so the serverless path has a real number.

2. **Run the full 136-file corpus through the overlay bench (P2).** kymo-dagre vs
   mermaid.js, both via Chrome. Rank by per-file diff; mine the worst for
   glyph/shape/layout deltas. Do a **full-ASCII width sweep** against measured
   mermaid advances and replace the hand-tuned `CHAR_W_MERMAID` wholesale (the
   `'w'` fix proved the table is approximate).

3. **Add a fidelity gate to CI (P5).** A small headless bench (a handful of
   representative cases) that fails if the mean overlay exceeds a threshold
   (e.g. 0.5 %). Plus a minimal typecheck/smoke job for `render-api` + `editor`
   so the prod wiring stops being untested.

4. **Expand direction + nesting coverage (P3).** Add RL/BT, LR-with-labels, and
   nested-subgraph cases to the bench; chase any sub-pixel drift the way the
   `'w'`/LR drift was chased (pin per-node width/position deltas before blaming
   the layout library).

5. **Catalogue the fall-back set (P4).** Instrument or sample which flowchart
   syntaxes route away from kymo and how often; decide a parser-coverage roadmap
   (stadium, hexagon, the `&` fan, front-matter/`%%{init}%%` config) vs. accepting
   the merman/mermaid.js fallback.

6. **Loose ends (P6).** Prune the unused `kymo-mermaid` editor dep in a dedicated
   cleanup PR (clean lock regen). If kymo-branded dagre flowcharts are wanted,
   give `mermaidToSvgDagre` a style parameter (the renderer already supports
   `FlowStyle::Kymo`).

---

*Bench + scratch live in `~/mjs-bench` on the box (`cmp7.mjs` = the 7-case
overlay, `style-overlay.mjs` = the 5-file corpus run, `gen_assets.mjs` =
visual-proof PNGs). Ground truth is always mermaid.js via Chrome, never merman.*

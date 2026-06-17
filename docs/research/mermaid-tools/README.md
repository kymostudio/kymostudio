# Mermaid rendering tools — parsing & render pipelines (Research)

A research note on **three Mermaid renderers** and how each turns Mermaid source
into pixels: **mermaid.js** (the upstream TypeScript reference), **merman** (a Rust
port), and **mmdr** / `mermaid-rs-renderer` (an independent Rust renderer). It is
prior-art analysis, not a spec of kymo. kymo is not a fourth peer here — it **builds
on** merman (merman's dagre layout + kymo's raster-safe text + kymo-tex KaTeX); where
that matters it is flagged in §6, but the focus is the three external tools.

Captured 2026-06-17 against: mermaid.js `mermaid@11.15.0`, merman
`Latias94/merman` (rev `89641493`, v0.7.0), mmdr `1jehuang/mermaid-rs-renderer`
v0.2.2. Stage names and file paths are from those sources.

## 1. At a glance

| | **mermaid.js** | **merman** | **mmdr** (mermaid-rs-renderer) |
|---|---|---|---|
| Language / runtime | TypeScript, **browser/Node** | Rust | Rust |
| Parser tech | **Jison** grammars (+ Langium for newer) | **LALRPOP** grammars + hand lexers | hand-written recursive parser |
| Layout | **dagre** (own fork) / ELK | **dugong** (dagre re-impl) / ELK | **custom per-diagram** (no dagre) |
| Text measurement | browser DOM `getBBox` | dugong text metrics | `fontdb` + `ttf-parser` (+ disk cache) |
| Label output | **HTML in `<foreignObject>`** | **HTML in `<foreignObject>`** (faithful port) | SVG **`<text>`** |
| Rasteriser | headless Chromium (mermaid-cli) | — (emits SVG) | **resvg / usvg / tiny-skia** |
| Raster-safe (survives resvg/svg2pdf) | ❌ foreignObject vanishes | ❌ foreignObject vanishes | ✅ (`<text>` + fontdb) |
| Math / KaTeX | ✅ KaTeX → MathML (default) / HTML | partial (raw in the slice kymo uses) | ❌ none |
| Diagram types | full (~30) | large subset | 23 |
| Relationship | upstream reference | Rust port of mermaid.js | independent re-implementation |

The deep divide is the **render target**: mermaid.js and merman emit **HTML labels
inside `<foreignObject>`** (faithful to a browser), while mmdr emits **native SVG
`<text>` + `<path>`**. The first two need a browser (or break under headless raster);
the third runs anywhere resvg runs. See §5.

## 2. mermaid.js (upstream reference)

The canonical implementation. Source: `packages/mermaid/src/`. Pipeline:

```
.mmd → flow.jison (Jison) / Langium → flowDb.ts (diagram DB)
     → dagre layout (sizes via DOM getBBox) → flowRenderer-v3-unified.ts (D3)
     → SVG (<foreignObject> HTML labels; KaTeX renderToString → MathML)
     → [mermaid-cli] headless Chromium → PNG
```

**Parse.** Each diagram type has its own grammar. Most are **Jison** (`*.jison`,
e.g. `diagrams/flowchart/parser/flow.jison`, `sequence/parser/sequenceDiagram.jison`);
newer ones are migrating to **Langium** (`.build/generateLangium.ts`). The parser
doesn't build a generic AST — it drives side-effecting actions that populate a
per-diagram **database** object (`flowDb.ts`: `addVertex`, `addLink`, `addSubGraph`…).
So "parse" = grammar → mutate the diagram DB.

**Layout.** The DB is handed to a renderer (`flowRenderer-v3-unified.ts`) that runs a
layout algorithm — **dagre** by default
(`rendering-util/layout-algorithms/dagre`), ELK optional. Crucially, **node sizes
are measured by inserting the real HTML label into the live DOM and reading
`getBBox()`** — layout depends on the browser.

**Render.** D3 draws the laid-out graph into **SVG**. Node/edge labels are **HTML
placed inside `<foreignObject>`** (so CSS, `<br/>`, `<strong>`, classDef fills all
work). Math is rendered with **KaTeX `renderToString`** (`diagrams/common/common.ts`,
`renderKatex`): the default is `output:"mathml"` — KaTeX emits **MathML only**, which
the browser renders with its **native MathML engine**. `forceLegacyMathML:true` (or
the no-MathML fallback) switches to `output:"htmlAndMathml"`, i.e. KaTeX's own HTML +
bundled webfonts. PNG/SVG export goes through `@mermaid-js/mermaid-cli` (`mmdc`),
which drives **headless Chromium** (Puppeteer) — the 2–3 s/diagram browser cost.

**Consequence (measured here).** Because the default math path is native MathML, the
reference math render depends on the **OS math font** Chrome resolves for
`font-family:math` (Chrome hardcodes the default to "Latin Modern Math", absent →
OS fallback; no bundled math font). On macOS that's **STIX Two Math**; on Linux with
no math font installed, Chrome falls back to a text font (Liberation Serif) and
**every italic-variable / stretchy / large operator breaks**. So mermaid.js's default
math output is **not reproducible across machines** — see `benches/mermaid-format`.

## 3. merman (Rust port — `Latias94/merman`)

A faithful headless **Rust port of mermaid.js**. Source: `crates/merman-core`,
`crates/merman-render`, `crates/dugong`. Pipeline:

```
.mmd → *_grammar.lalrpop (LALRPOP) + lexer.rs → model (parse_pipeline.rs)
     → dugong dagreish.rs (dagre re-impl) / ELK → merman-render
     → SVG (<foreignObject> HTML labels) → [browser/host to rasterise]
```

**Parse.** Per-diagram grammars written in **LALRPOP** (`flowchart_grammar.lalrpop`,
`class_grammar.lalrpop`, `er_grammar.lalrpop`, `sequence_grammar.lalrpop`,
`state_grammar.lalrpop`) with hand-written lexers (`flowchart/lexer.rs`,
`lexer_iter.rs`); a few diagrams use hand parsers (`gantt/parse.rs`,
`mindmap/parse.rs`). Driven by `parse_pipeline.rs`. The intent is mermaid.js
semantic parity, re-expressed in a Rust parser-generator instead of Jison.

**Layout.** **dugong** (`crates/dugong/src/pipeline/dagreish.rs`) is a Rust
re-implementation of **dagre** — same ranking / ordering / coordinate-assignment
shape as mermaid's layout, so positions track mermaid.js closely. An **ELK** backend
also exists (`crates/merman-layout-elk`). Per-diagram layout glue in
`merman-render/src/<type>/layout.rs`.

**Render.** Emits **SVG that mirrors mermaid.js**, including **HTML labels in
`<foreignObject>`** — which is what makes merman a faithful browser render *and* what
makes it **not raster-safe**: under server-side resvg/svg2pdf the foreignObject HTML
labels vanish. In the math-heavy slice kymo benchmarks, merman emits the **raw LaTeX
source** for `$$…$$` rather than rendered glyphs.

**Why kymo uses it.** kymo takes merman's **dagre layout positions** (the hard,
fidelity-critical part) and replaces the label layer with raster-safe SVG + kymo-tex
KaTeX paths. merman is a git dependency pinned by rev; it develops extremely fast
(~30 commits/day), so kymo pins and bumps deliberately.

## 4. mmdr (`1jehuang/mermaid-rs-renderer`)

An **independent** pure-Rust renderer (not a port). Source: `src/`. Pipeline:

```
.mmd → parser.rs → ir.rs → layout/ → render.rs → SVG → usvg/resvg/tiny-skia → PNG
```

Public API (`lib.rs`): `parse_mermaid()` → `compute_layout()` → `render_svg()` /
`write_output_png()`.

**Parse.** A hand-written `parser.rs` produces an intermediate representation
(`ir.rs`: nodes, edges, shapes, subgraphs); `validator.rs` checks it. No
parser-generator — direct recursive parsing.

**Layout.** **Custom layout per diagram type** — 23 modules under `src/layout/`
(`flowchart/`, `sequence`, `gantt`, `sankey`, `c4`, `mindmap`, …), **not dagre**. The
flowchart layout is its own multi-stage pipeline
(`analysis → ranking → plan → edge_pipeline → route_labels → post_route →
path_cleanup`) with its own edge routing. Fast, but its own geometry — the README
notes it "may not yet match mermaid-cli."

**Text measurement (the no-browser core).** `text_metrics.rs` replaces the browser's
`getBBox`: it loads the real font via **`fontdb`** + **`ttf-parser`** and sums true
glyph advances (`glyph_hor_advance`). A **disk font cache** precomputes an ASCII
advance table (`ascii_advances: [u16;128]`) so warm runs skip font-DB load
(500–900×); `--fastText` uses calibrated fallback ASCII widths and skips fonts
entirely (1600×+).

**Render.** `render.rs` builds the SVG by string concatenation — `<defs>` markers,
shapes/arrows as **`<path>`**, and labels as native **SVG `<text>`** (no
foreignObject, no HTML). PNG via `write_output_png`: `usvg::Tree::from_str` →
`resvg::render` → `tiny_skia::Pixmap` — the same resvg stack kymo's `kymostudio-core`
uses.

**Math.** **None.** `katex` appears only in the JS benchmark `package-lock.json`; no
`mathml`/`renderToString`/math module exists in the Rust renderer. `$$…$$` is not
rendered as math.

## 5. The two structural splits

**Split A — label render target (raster-safety).**
- mermaid.js & merman: **HTML in `<foreignObject>`**. Renders perfectly *in a
  browser*; **disappears** under server-side resvg/svg2pdf rasterisation (no HTML/CSS
  engine). This is why mermaid-cli must spawn Chromium, and why merman labels don't
  survive headless PNG/PDF.
- mmdr: native **SVG `<text>`** drawn by resvg via fontdb — survives headless raster,
  *provided the font is present at raster time* (fontdb at render == fontdb at raster).

**Split B — text measurement.**
- mermaid.js: **browser DOM `getBBox`** (exact, but requires a browser).
- merman: dugong's own text metrics (port-faithful).
- mmdr: **`fontdb` + `ttf-parser`** advances, cached — no browser, but OS/font-set
  dependent (mitigated by bundling fonts).

**Math is a third axis** and the sharpest divider: mermaid.js renders KaTeX (default
via **native MathML** → OS-font-dependent, not reproducible; `forceLegacyMathML` →
KaTeX HTML + bundled webfonts → reproducible). merman emits raw LaTeX in the measured
path. mmdr has no math at all.

## 6. How kymo relates (brief)

kymo's flowchart renderer = **merman's dagre layout** (§3) + a **raster-safe label
layer** (SVG, like mmdr's split, §5-A) + **kymo-tex KaTeX rendered as `<path>`
outlines**. Two consequences from the same analysis that produced this note:
- For **math**, kymo embeds glyph **outline paths** (zero font dependency at raster
  time) — a stronger raster-safety guarantee than mmdr's `<text>` (which needs the
  font in resvg's fontdb) and than mermaid.js/merman (which need a browser). It is the
  only one of these that renders Mermaid math correctly **and** reproducibly on a
  headless Linux server.
- For the **bench reference**, the reproducible mermaid.js math target is
  `forceLegacyMathML:true` (KaTeX HTML + bundled webfonts), **not** the default
  native-MathML output (which silently changes per OS). See
  `benches/mermaid-format/research/2026-06-16-flowchart-mermaid-style.md`.

## Sources

- mermaid.js — `github.com/mermaid-js/mermaid` (`flow.jison`, `flowDb.ts`,
  `flowRenderer-v3-unified.ts`, `rendering-util/layout-algorithms/dagre`,
  `diagrams/common/common.ts` `renderKatex`); `@mermaid-js/mermaid-cli` (`mmdc`).
- merman — `github.com/Latias94/merman` (`merman-core` LALRPOP grammars + lexers,
  `crates/dugong` `dagreish.rs`, `merman-layout-elk`, `merman-render`).
- mmdr — `github.com/1jehuang/mermaid-rs-renderer` (`parser.rs`, `ir.rs`,
  `layout/`, `render.rs`, `text_metrics.rs`).
- KaTeX→MathML / OS-font findings — `benches/mermaid-format/` (`katex-font-probe.mjs`,
  `katex-legacy-rescore.mjs`) and the flowchart-style research note.

---
title: Mermaid Format — Design (umbrella)
document_id: DESIGN-MERMAID-001
version: "0.5"
issue_date: 2026-06-17
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers implementing the Mermaid importer in the Rust core
review_cycle: On family-scope or engine-architecture change
supersedes: null
related_documents:
  - FEAT-MERMAID-001
  - TEST-MERMAID-001
  - PLAN-MERMAID-001
  - DESIGN-MERMAID-FLOWCHART-001
  - MERMAID-MAP-001
  - KYMOJSON-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - mermaid
  - design
  - rust
  - engine
---

# Mermaid Format — Design (umbrella)

## 1. Architecture: the engine moves into Rust

The importer is the first piece of the kymo *engine* (model + parsing + layout) to
live in `packages/rust/kymostudio-core`. Today the crate only rasterizes SVG→PNG/PDF;
this feature adds, always-on (no feature gate, compiles bare and on wasm):

```
src/
  model.rs        Component / Region / Edge / Diagram + enums (incl. new Shape::Diamond)
                  + py_round (half-to-even, matches CPython round())
  kymojson.rs     hand-rolled serializer → .kymo.json (matches to_kymojson.model_dict)
  mermaid/
    mod.rs        MermaidError, Direction, Flow* types, parse() + diagram-type dispatch
    lexer.rs      Scanner: node ids, shape wrappers, edge operators, |labels|
    parser.rs     statement grammar: Node (Edge Node)*
  layout.rs       layered (Sugiyama) layout → positioned Diagram
```

Top-level entry `lib::mermaid_to_kymojson(&str) -> Result<String, MermaidError>`
chains parse → layout → export. Surfaced to Python (`python.rs`, PyO3
`mermaid_to_kymojson`), JS (`wasm.rs`, `mermaidToKymoJson`), and the `kymo` CLI.

## 2. Why kymojson as the output contract

`.kymo.json` (KYMOJSON-MAP-001) is the resolved-model interchange both back-ends
already load (`from_kymojson` / `parseKymoJson`) and render with no further layout
— exactly like a `.bpmn` import. Emitting it means the Rust engine did not need a
renderer at first, and Python/JS need only call the binding. (The parity phase since
shipped the Python/JS render path; the core's **own** pure-Rust flowchart renderer
`crate::flowchart_svg` — so `mermaid_to_svg` / `d2_to_svg` / `dot_to_svg` render without
the front-ends at all — is owned by the flowchart hub `FEAT-FLOWCHART-001`, not this feature;
this feature stops at the `.kymo.json` it feeds in.)

## 3. Hand-rolled JSON, not serde

The serializer reproduces CPython `json.dumps(payload, indent=2,
ensure_ascii=False) + "\n"` exactly: snake_case keys in the `to_kymojson` field
order, points as arrays, integral floats collapsed to ints, `-0`→`0`, control-char
escaping, non-ASCII left raw. Meeting these byte-conventions with serde_json would
require a custom serializer anyway; a ~150-line `JsonWriter` is simpler, auditable,
and adds nothing to the wasm bundle (NFR-2). All emitted coordinates are integers
(rounded at emit), so the writer only handles int/string/bool/null/array/object.

## 4. Layout: a port of bpmn_layout.py (positions only)

`layout.rs` ports the node-positioning half of
`packages/python/src/kymo/bpmn_layout.py` — longest-path Kahn ranking with
back-edge reversal, dummy nodes for long edges, barycenter ordering
(`ORDER_SWEEPS=6`), side assignment around a straight trunk, coordinate assignment
with priority-aware `place_layer` (`ALIGN_SWEEPS=8`), constants `H_GAP=80`,
`V_GAP=50`, `MARGIN=40`. It deliberately does **not** port edge routing: kymo's
`to_svg.render_edge` routes a point-less edge from anchors at render time, and only
that path honours `dashed`/`no_arrow` (see MERMAID-MAP-001 §4).

**Direction handling.** The algorithm runs in an abstract `(main, cross)` space
(main = along flow, cross = perpendicular), using each node's main/cross extent
(width/height swapped for vertical flows). Final screen coordinates map per
direction (`LR`: (m,c); `TB`: (c,m); `RL`/`BT` mirror the main axis), so node boxes
stay upright. Coordinates normalize so the content's top-left sits at `MARGIN`.

**Determinism (NFR-1).** Every sort carries the declaration index as a stable
secondary key; sweep counts are fixed and even; `py_round` is half-to-even to match
Python; map/insertion order never feeds an order-sensitive sort. A determinism test
asserts two runs are byte-equal.

## 5. Diagram-type dispatch & extensibility

`mermaid::parse` reads the header keyword and dispatches. Only `graph`/`flowchart`
is implemented; the other arms return `MermaidError::Unsupported(type)`. Adding a
type = a new `mermaid/<type>.rs` producing the same `Diagram` (reusing `layout.rs`
where the type is node-edge shaped, e.g. state) plus a dispatch arm.

## 6. New `diamond` shape

Mermaid decisions (`{}`) map to a new `Shape::Diamond` (kymo had no diamond). The
Rust model defines it and its layout footprint; the SVG glyph in Python `to_svg`
and JS `render` is part of the parity phase (PLAN-MERMAID-001).

## 7. Render pipeline: Mermaid → SVG → PNG

Beyond the `.kymo.json` import contract (§2), the core renders a Mermaid source all
the way to a raster image **without a browser or Node** — the chain stays inside the
`kymostudio-core` crate:

```
.mmd ──parse──▶  IR  ──layout──▶ positioned ──render──▶ SVG ──rasterize──▶ PNG
      mermaid::*   Flow/Seq/…   layout*.rs    geometry   *_svg.rs   <text>   svg_to_png
```

1. **Parse** — `mermaid::parse` (flowchart family) or a per-grammar parser
   (`mermaid/{sequence,state,classdiagram,erdiagram,blockdiagram,mindmap,kanban,
   requirement}.rs`) → a typed IR (`Flowchart` / `Sequence` / `ClassDiagram` / …).
2. **Layout** — `layout.rs` (layered / Sugiyama, §4) for the kymo style, or
   `layout_dagre.rs` (which calls the external **`dagre`** crate, a Rust port of
   dagre-d3-es) for mermaid-faithful positions; sequence/class carry their own
   intrinsic layout.
3. **Render SVG** — `flowchart_svg.rs` / `dagre_svg.rs` / `sequence/svg.rs` /
   `classdiagram/svg.rs` emit a **self-contained** SVG: a `<style>` block, `<defs>`
   (arrowhead marker, dot-grid pattern), and the glyphs. Labels are **real `<text>`
   elements**, never `<foreignObject>`/HTML. Entry points: `mermaid_to_svg`,
   `mermaid_to_svg_dagre`, `mermaid_<type>_to_svg` (wasm exposes all; PyO3 a flowchart
   subset).
4. **Rasterize PNG** — `svg_to_png(svg, scale)` → **resvg** (the crate's bundled
   rasterizer; `svg_to_pdf` is the vector path). Fonts come from the system on native
   builds, or via `register_font` on wasm.

**Why `<text>`, not `<foreignObject>` — the design rationale for an own renderer.**
mermaid.js (and *merman*, its faithful Rust port) place node labels in
`<foreignObject>` HTML; **resvg does not render foreignObject**, so rasterizing their
SVG drops every label — a blank PNG/PDF/WebP. kymo's renderers draw plain `<text>`, so
the **same** `svg_to_png` yields labels-intact rasters. The raster-safe SVG is thus the
contract that makes Mermaid → PNG/WebP/PDF (and the animated SVG) work end-to-end; it is
why the core renders Mermaid itself rather than embedding mermaid.js output.

**Pipeline dependencies (Rust crates).** Parse → layout(Sugiyama) → render-SVG are
**dependency-free pure Rust** (hand-rolled lexer/parser/serializer + the layered
layout of §4); only the dagre layout path and the raster stage pull external crates:

| Stage | Crate(s) | Notes |
|---|---|---|
| Parse | — | hand-rolled lexer/parser; `$…$` in labels is an internal TeX→Unicode pass (no KaTeX dep), wasm-clean |
| Layout — Sugiyama | — | internal port of `bpmn_layout.py` (§4) |
| Layout — dagre | **`dagre` 0.1.1** | Rust port of dagre-d3-es for mermaid-faithful positions (`layout_dagre.rs`) |
| Render SVG | — | SVG assembled as a plain string |
| Rasterize PNG | **`resvg` 0.47** (`text`, `raster-images`, `default-features=false`) | the SVG→PNG engine; `raster-images` pulls `image` for embedded bitmaps |
| ↳ fonts | resvg `text` + `system-fonts`/`memmap-fonts` (native) **or** `register_font` (wasm) | `<text>` only paints once a font is available |
| Rasterize PDF | **`svg2pdf` 0.13** (optional, `pdf` feature) | vector path; ships its **own** usvg/resvg 0.45 — a 2nd SVG engine |
| Surface bindings | `pyo3` 0.28 (Python) · `wasm-bindgen` 0.2 (JS) | expose `mermaid_*` + `svg_to_png`/`svg_to_pdf` |

**Feature gating (keeps the wasm bundle small).** `default = ["system-fonts", "pdf"]`
on native (CLI / Python wheel) so labels render and PDF works. The **wasm** build
enables neither: no `system-fonts` (no fs/mmap on wasm — the host calls
`register_font` first) and no `pdf` by default (svg2pdf's second usvg ~doubles the
module). So a browser/edge `.mmd → PNG` is one engine (`resvg`) + a registered font;
PDF is opt-in. `resvg` is taken `default-features = false` to keep only `text` +
`raster-images`.

**External fallback renderers (NOT in this pipeline).** Grammars or syntax the core
can't render fall back to engines that are **not** part of the chain above and not
deps of `kymostudio-core`:

| Engine | What / where | Raster-safe? |
|---|---|---|
| **`merman`** | third-party Rust port of mermaid.js (`github.com/Latias94/merman`, pinned git rev; full build ~5.2 MB wasm), packaged as `packages/rust/kymo-mermaid` and called **only by render-api** (`engine.ts` → `mermaidRenderSvg`) when a per-grammar kymo renderer throws | ✗ `<foreignObject>` |
| **mermaid.js** | the **editor's** fallback for non-flowchart grammars (~760 KB) | ✗ `<foreignObject>` |
| **kroki** | the final **remote** fallback (`render.kymo.studio` proxy) | n/a (remote) |

**When each fallback fires (exact triggers).**

- **render-api is tiered** (`engine.ts` → `dispatch.ts`). `mermaidGrammar(src)` reads
  the header keyword (after stripping `---` front-matter and `%%` comments) and picks a
  kymo per-grammar renderer. Control falls to **merman** (`mermaidRenderSvg`) when
  **(a)** the grammar is none of the 9 covered (no arm matches → the trailing
  `return mermaidRenderSvg(source)`), **or (b)** a covered renderer *throws* on syntax
  kymo can't parse (e.g. the `A-->B&C` fan) — caught, then merman. If **merman also
  throws**, `dispatch.ts` routes mermaid (it is in `PROXY_KINDS`, not `AUTHORITATIVE`)
  to **kroki**. Net chain: **kymo → merman → kroki**.
- **editor never uses merman** (`mermaid.ts`). A pristine share link may be answered
  from a **kroki** edge-cache by the warm-up race (≤ 900 ms); otherwise
  `isPlainFlowchart(src)` (header `flowchart`/`graph`, **no** `%%{init}` directive or
  `---` front-matter) → core `mermaidToSvgDagre`, and it falls to **mermaid.js** when
  **(a)** the source isn't a plain flowchart (any other grammar, or a flowchart that
  carries directives) **or (b)** the core renderer throws. Net chain: **core-flowchart
  → mermaid.js**.
- **Python / CLI have no fallback** — only the native renderers (flowchart import via
  PyO3); unsupported input errors out, it never reaches merman/kroki.

Because merman / mermaid.js emit `<foreignObject>` labels, their PNG/PDF is **not
raster-safe** — exactly the reason the core `<text>` pipeline above exists. The core
chain (parse → layout → SVG → PNG) **never loads merman**; editor/Python/CLI don't
either — only the render-api worker does, as a coverage net for the grammars kymo
doesn't yet render natively.

> **Ownership boundary.** The SVG renderer (`crate::flowchart_svg`, `mermaid_to_svg`)
> and the SVG→PNG/PDF rasterizer are **shared engine** parts owned by
> `FEAT-FLOWCHART-001` / the crate; this section documents how a *Mermaid* source flows
> through them, not the renderer's internals. The chain runs identically on every
> surface: editor / render-api do `.mmd → SVG` in wasm then the same `svg_to_png` for
> raster downloads; the `kymo` CLI does `.mmd → .svg`/`.png` natively. One renderer, one
> rasterizer, every surface.

## 8. Dependency map (which lib does each stage of each path use)

Since the `e5cebae3` refactor the Mermaid code lives in **two Rust crates over one
shared substrate** — `kymo-graph` (the IR + Sugiyama layout + the raster-safe `<text>`
SVG renderer + the format engines, the base both crates build on). The parser and the
raster-safe renderer are **kymo's own**; the only thing that varies between paths is the
**layout** dependency.

```
                         kymo-graph  (shared substrate)
                         · mermaid parser  (hand-rolled lexer/parser — kymo's own)
                         · Sugiyama layout (layout.rs, internal)  +  layout_dagre.rs
                         · raster-safe SVG (<text>, flowchart_svg/dagre_svg)
                              │
        ┌─────────────────────┴───────────────────────────┐
   kymostudio-core                                    kymo-mermaid
   (editor wasm · Python · CLI)                       (render-api worker · the bench)
   parse  = kymo own                                  parse  = kymo own
   layout = Sugiyama  OR  `dagre` crate               layout = `dagre` crate (default, lean)
   math   = TeX→Unicode (math.rs, no KaTeX)                    OR  merman → dugong  (feature katex-layout)
   render = kymo <text> SVG                           math   = kymo-tex KaTeX → <path> outlines
   raster = resvg                                     render = kymo <text> SVG (+ kymo-tex math paths)
```

**The bench (`worst10-grid.mjs`) builds `kymo-mermaid` with `katex-layout`**, so its
geometry comes from **merman → dugong** and its math from **kymo-tex** — that is why the
layout-accuracy harness measures node positions ~0.1–5 px from mermaid.js (dugong is a
faithful dagre port).

**External crates, by identity (the dependency lineage).**

| Dependency | Version / pin | What it is | Used by (path) |
|---|---|---|---|
| **`dagre`** | 0.1.1 (crates.io) | `github.com/kookyleo/dagre-rs` — independent Rust port of dagre (Sugiyama) | both crates' *default* `layout_dagre.rs` |
| **`merman`** (`merman-core` / `-render` / `-bindings-core`) | git `Latias94/merman`, pinned rev `89641493` | faithful Rust **port of mermaid.js** (full engine) | `kymo-mermaid` features `merman` / `full` / `katex-layout` |
| ↳ **`dugong`** | inside merman (also on crates.io) | *"Dagre-compatible graph layout (port of dagrejs/dagre)"* | merman's `layout_flowchart_v2` → kymo `katex-layout` |
| ↳ **`dugong-graphlib`** | inside merman | *"graph data-structure APIs (port of dagrejs/graphlib)"* | used by dugong |
| **`kymo-tex`** (`kymo-types` / `-parser` / `-layout` / `-svg`, of 9 crates) | path `../kymo-tex` | kymo's own **KaTeX engine** (fork of RaTeX); renders `$$…$$` as `<path>` outlines | `kymo-mermaid` feature `katex-layout` |
| **`resvg`** | 0.47 (`text`,`raster-images`) | SVG→PNG rasteriser | `kymostudio-core` (`svg_to_png`) |
| **`svg2pdf`** | 0.13 (opt, `pdf`) | SVG→PDF (ships its own usvg/resvg 0.45) | `kymostudio-core` (`svg_to_pdf`) |

**Three different "dagre" implementations are in play** — don't conflate them:

| dagre | implementation | who uses it |
|---|---|---|
| `dagre` 0.1.1 crate | `kookyleo/dagre-rs` (independent) | kymo's **default** lean path |
| **dugong** | merman's own port of dagrejs/dagre (+ dugong-graphlib) | kymo's **katex-layout** path (via merman) |
| dagre-d3-es (JS) | mermaid.js's bundled fork | mermaid.js itself (the reference) |

So kymo does **not** write its own dagre — it borrows one (`kookyleo/dagre-rs` for the
lean build, or `dugong` via merman for fidelity). Everything else in the Mermaid path —
the parser, the raster-safe `<text>` renderer, and the KaTeX math (`kymo-tex`) — is
kymo's own code. Cross-engine context for these external renderers lives in the research
note `docs/research/mermaid-tools/`.

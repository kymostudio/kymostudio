---
title: Mermaid vs. kymo — Comparison
document_id: REF-MERMAID-CMP-001
version: "1.0"
issue_date: 2026-06-03
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream Mermaid major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - REF-MERMAID-001
  - REF-D2-CMP-001
  - REF-PLANTUML-CMP-001
  - REF-KROKI-CMP-001
  - BPD-DGM-001
authors:
  - Vũ Anh
language: en
keywords:
  - mermaid
  - kymo
  - comparison
  - prior-art
  - dsl-tradeoffs
  - diagram-as-code
  - markdown
upstream:
  project: mermaid-js/mermaid
  homepage: https://mermaid.js.org/
  repository: https://github.com/mermaid-js/mermaid
  license: MIT
  access_date: 2026-06-03
---

# Mermaid vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-MERMAID-CMP-001                                           |
| Version           | 1.0                                                          |
| Issue Date        | 2026-06-03                                                   |
| Status            | Released                                                     |
| Classification    | Internal                                                    |
| Owner             | `diagrams/` project                                          |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline  |
| Access Date       | 2026-06-03                                                   |
| Parent Reference  | [`mermaid.md`](./a.mermaid.md)                               |
| Related Documents | [`d2.comparision.md`](./b.d2.comparision.md), [`plantuml.comparision.md`](./a.plantuml.comparision.md), [`kroki.comparision.md`](./b.kroki.comparision.md), `kymo-dsl/`, [`best-practices.md`](../diagrams/best-practices.md) |

This document isolates the **prior-art comparison** between [Mermaid](https://mermaid.js.org/) and kymo. The factual reference (syntax, diagram catalog, rendering model, output formats) lives in [`mermaid.md`](./a.mermaid.md); read that first if you need ground truth on how Mermaid actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream Mermaid does not. Mermaid is a **same-category peer** to kymo — both are text-to-diagram languages — so this is a like-for-like comparison (unlike the BPMN engines or WYSIWYG editors). The key difference in kind: Mermaid is a **client-side renderer** ubiquitous inside Markdown, while kymo is an **ahead-of-time compiler** that owns its image pipeline.

## 1. At-a-glance matrix

| Axis | Mermaid | kymo |
|------|---------|------|
| Primary purpose | Render diagrams from text inside Markdown | Render static architecture diagrams |
| Implementation language | JavaScript / TypeScript | Python 3 (+ JS/TS data-model port) |
| License | MIT | Apache-2.0 |
| DSL style | Per-type keyword grammars (`flowchart`, `sequenceDiagram`, …) | Declarative blocks — `region { ... }`, `component`, `→` |
| Container model | `subgraph` (untyped) | Explicit, via named `region` blocks with padding / outer label |
| Layout | Embedded per-type (dagre / cytoscape / opt-in ELK) | Single algorithm: grid pack + per-row height sync |
| Rendering model | Client-side in browser (view-time) | Ahead-of-time compiler (file output) |
| Diagram types | ~24 (flow, sequence, class, state, ER, Gantt, charts, mindmap, …) | Block / architecture diagrams only |
| Animation | None (host CSS only) | Animated SVG + frame-synthesized WebP |
| Output | SVG (native); PNG/PDF via CLI | SVG, animated SVG, animated WebP, Figma, Excalidraw |
| Themes | Built-in (default/dark/forest/neutral/base) + `themeVariables` | None — accents hand-coded |
| Icons | FontAwesome shorthand + Iconify packs (external) | Bundled SVG library |
| Interactivity | `click` callbacks/links (browser) | None (static output) |
| Embedding | JS lib; native in GitHub/GitLab/Notion/Obsidian | Python module (CLI entry) + JS port |
| Styling form | `classDef`/`class`/`style`/`linkStyle` (index) | YAML-like keys per component |

## 2. Headline tradeoffs

### 2.1 Same category, opposite delivery model

Mermaid and kymo are both external text-to-diagram DSLs (the same foundational bet D2 made, and the opposite of the host-language API `mingrammer/diagrams` chose — see [`diagrams.mingrammer.comparision.md` §2.1](./b.diagrams.mingrammer.comparision.md)). The divergence is *when and where rendering happens*: Mermaid renders **client-side, at view time**, which is exactly why it is ubiquitous inside Markdown — GitHub, GitLab, Notion, and Obsidian render a fenced block with no build step. kymo is an **ahead-of-time compiler**: the artefact (SVG / animated SVG / WebP / Figma / Excalidraw) is produced by `packages/python/src/kymo/` and is the deliverable. Mermaid optimises for *frictionless inline authoring*; kymo optimises for a *finished, owned image*.

### 2.2 Breadth of diagram types as Mermaid's moat

Mermaid reaches ~24 diagram families from one fence — flowchart, sequence, class, state, ER, Gantt, user journey, mindmap, plus genuine **charts** (pie, xy, sankey, radar). kymo draws block/architecture diagrams only. As with D2, this is a breadth advantage that rewards accumulated work, not a capability kymo can close cheaply. The honest stance is unchanged: don't chase Mermaid's type breadth; stay excellent at the one diagram class kymo targets.

### 2.3 Layout: auto-only vs owned

Mermaid is overwhelmingly **auto-layout** — you pick a direction and the embedded engine decides the rest; user control is thin (flowcharts can opt into an ELK renderer, but there is no general layout-engine abstraction like D2's). kymo hardcodes one algorithm (grid pack + per-row height sync in `packages/python/src/kymo/layout.py`) *and* exposes a first-class layout-tree DSL, and it owns the H-V-H midpoint Z edge default ([[feedback-kymo-edge-routing]]) that no generic engine produces. kymo trades Mermaid's "it just lays out" convenience for control and a specific routing aesthetic.

### 2.4 Ecosystem ubiquity as the real gap

Mermaid's defining strength is not language power but **reach**: native rendering in the tools developers already write Markdown in, ≈82k GitHub stars, a hosted Live Editor, and a commercial arm (Mermaid Chart) funding maintenance. This is the same age/adoption gap kymo has against D2 and `diagrams`, but wider — Mermaid is arguably the single most-deployed diagram-as-code tool in existence. kymo's counter-strengths are animation (animated SVG **and** a frame-synthesized WebP via `packages/python/src/kymo/to_webp.py`) and its export bridges — neither of which Mermaid offers.

### 2.5 Theming present, animation absent

Mermaid has a real theme system (built-in themes + `themeVariables` + `themeCSS`) that kymo lacks — a borrowable idea (see §4). Conversely Mermaid has no animation model at all, where kymo ships two. The two tools are not strictly ranked; they lead on different axes.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension, using the same five categories as [`d2.comparision.md`](./b.d2.comparision.md) (Mermaid is the same tool class, so the rubric transfers directly). The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats.** Scores for `kymo` reflect what is observable in this repo as of 2026-06-03 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the layout-tree + Figma/Excalidraw exporters) and are held **identical to the kymo column in [`d2.comparision.md`](./b.d2.comparision.md) and [`diagrams.mingrammer.comparision.md`](./b.diagrams.mingrammer.comparision.md)** so the same-category (diagram-as-code) comparisons stay consistent. Scores for `Mermaid` reflect upstream 11.13.0 as documented at <https://mermaid.js.org/> on 2026-06-03. The **Why** column is load-bearing; numbers without it are worthless — do not strip.

### 3.1 Category A — DSL & Syntax

| # | Criterion | Mermaid | kymo | Why |
|---|-----------|:--:|:----:|-----|
| A1 | Concision on small diagrams | 8 | 7 | Mermaid's `A-->B` flow syntax is about as terse as a diagram language gets; kymo's `region { ... }` blocks are clean but more verbose. |
| A2 | Safety (no precedence/parse footguns) | 6 | 9 | Both own their grammar, but Mermaid is a family of per-type sub-grammars with historical keyword/whitespace sensitivity and **index-addressed** `linkStyle`; kymo's single block grammar is less ambiguous. |
| A3 | Extensibility (vars, imports, reuse) | 3 | 3 | Neither has variables/imports/repeat. Mermaid offers front-matter config and `classDef` reuse; kymo has none today. A wash at the low end. |
| A4 | Grouping/container semantics | 6 | 7 | Mermaid `subgraph` groups nodes but is untyped; kymo's typed `region` containers drive layout/styling decisions. |
| | **Category total / 40** | **23** | **26** | **kymo +3** — kymo's grammar safety and typed containers outweigh Mermaid's concision. |

### 3.2 Category B — Layout & Edges

| # | Criterion | Mermaid | kymo | Why |
|---|-----------|:--:|:----:|-----|
| B1 | Default layout quality | 7 | 8 | Mermaid's embedded dagre is decent but degrades on large/dense flowcharts; kymo's first-party engine is tuned for architecture diagrams. |
| B2 | User layout control | 4 | 8 | Mermaid is overwhelmingly auto-layout (direction + optional ELK renderer); kymo exposes a first-class layout-tree DSL. |
| B3 | Edge routing aesthetic | 6 | 10 | Mermaid routing is engine-default, not the H-V-H midpoint Z the team wants ([[feedback-kymo-edge-routing]]); kymo defaults to exactly that. |
| B4 | Edge styling | 6 | 5 | Mermaid has `linkStyle`/`classDef` for edges (but index-addressed); kymo has labels and a smaller per-edge styling surface. |
| | **Category total / 40** | **23** | **31** | **kymo +8** — control and owned Z-routing dominate Mermaid's auto-only model. |

### 3.3 Category C — Icons & Catalog

| # | Criterion | Mermaid | kymo | Why |
|---|-----------|:--:|:----:|-----|
| C1 | Catalog breadth | 5 | 3 | Mermaid ships no self-contained set but integrates the Iconify registry (~200k icons) in newer diagrams; kymo has a single curated project `icons/`. |
| C2 | Icon escape hatch (arbitrary asset) | 6 | 3 | Mermaid can pull FontAwesome/Iconify icons by name (host CSS/registry permitting); kymo has no documented arbitrary-asset hatch yet. |
| | **Category total / 20** | **11** | **6** | **Mermaid +5** — Iconify access plus FA shorthand beats kymo's curated-only set. |

### 3.4 Category D — Output & Interop

| # | Criterion | Mermaid | kymo | Why |
|---|-----------|:--:|:----:|-----|
| D1 | Output format breadth | 7 | 6 | Mermaid is SVG-native plus PNG/PDF via the CLI; kymo is SVG-first plus animated WebP and Figma/Excalidraw exporters (no PNG/PDF yet). |
| D2 | Round-trip with editors | 3 | 6 | Mermaid is source-to-image (Mermaid Chart adds a visual editor, but core is one-way); kymo's Figma/Excalidraw exporters are one-way today but provide a real bridge. |
| D3 | Cross-language portability | 7 | 8 | Mermaid runs anywhere JS runs (community ports exist), but the source of truth is JS and *file* output needs headless Chromium; kymo ships a Python source-of-truth **and** a JS/TS port with no browser dependency. |
| | **Category total / 30** | **17** | **20** | **kymo +3** — kymo's exporter bridge and browser-free pipeline edge out Mermaid's raster CLI. |

### 3.5 Category E — Tooling & Ecosystem

| # | Criterion | Mermaid | kymo | Why |
|---|-----------|:--:|:----:|-----|
| E1 | LSP / IDE / formatter / pkg | 9 | 3 | Mermaid has the Live Editor, mermaid-cli, VS Code extensions, and **native rendering in GitHub/GitLab/Notion/Obsidian**; kymo's tooling is early (CLI only). |
| E2 | Maintenance / community gravity | 10 | 3 | Mermaid has ≈82k stars and is the de-facto Markdown diagram standard; kymo is an early in-house tool. |
| | **Category total / 20** | **19** | **6** | **Mermaid +13** — the widest gap; Mermaid is the most-deployed DaC tool there is. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `Mermaid` | **93** | **6.20** | **62 %** |
| `kymo`    | **89** | **5.93** | **59 %** |
| Gap (Mermaid − kymo) | 4 | 0.27 | 3 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | Mermaid | kymo | Δ (kymo − Mermaid) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — DSL & Syntax        | 4 | 40 | 23 | 26 | **+3**  |
| B — Layout & Edges      | 4 | 40 | 23 | 31 | **+8**  |
| C — Icons & Catalog     | 2 | 20 | 11 | 6  | **−5**  |
| D — Output & Interop    | 3 | 30 | 17 | 20 | **+3**  |
| E — Tooling & Ecosystem | 2 | 20 | 19 | 6  | **−13** |
| **Overall**             | **15** | **150** | **93** | **89** | **−4** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Mermaid` | 5.75 | 5.75 | 5.50 | 5.67 | 9.50 | **6.43** | **64 %** |
| `kymo`    | 6.50 | 7.75 | 3.00 | 6.67 | 3.00 | **5.38** | **54 %** |
| Gap | | | | | | 1.05 | **10 pp** |

Equal-per-category *widens* the gap (3 pp → 10 pp) because Mermaid's dominant lead in the small E category (9.5 vs 3.0) gets the same say as the larger ones. Use this only if you believe "tooling/ecosystem" matters as much as "DSL" or "layout" wholesale — for most kymo readers the per-criterion number (§3.6.1) is the honest one.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): Mermaid 6.20/10 vs kymo 5.93/10 — a 0.27-point / 3-pp gap.** Far closer than D2 (14 pp): Mermaid's huge ecosystem lead is nearly cancelled by kymo's edge on layout/edges.
- **Where kymo holds its own:** B (layout control + Z-routing, +8) and A/D (+3 each). All come from things kymo *owns* — the same pattern as against D2 and `diagrams`.
- **Where kymo trails:** C (−5, icon breadth/escape-hatch) and E (−13, ecosystem). E rewards adoption-years, not a single fix; C is addressable.
- **Cheapest move on the board:** criterion C2 — an icon escape hatch (load arbitrary SVG/PNG by path), worth ≈ +3 in that cell. It is the same top recommendation as the D2 and `diagrams` comparisons — a strong signal it is the real gap.
- **Don't chase diagram-type breadth or Markdown ubiquity.** Mermaid's reach is a function of being a client-side renderer baked into GitHub; kymo's value is a tight, finished architecture-diagram look with an owned image pipeline (B3 Z-routing, animation).

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo lands an icon escape hatch (C2) or expands the in-tree catalog meaningfully (C1).
2. kymo adds variables/imports/repeat or host-language interop (A3).
3. kymo ships an LSP, formatter, or VS Code extension (E1), or gains native rendering in a Markdown host.
4. kymo's exporters become bidirectional (D2), or kymo gains PNG/PDF output (D1).
5. kymo gains a theme system (would add new criteria / shift A4, B4).
6. Upstream Mermaid changes its default layout engine, adds a general layout abstraction, or ships an animation model (B1–B3, D, E).

## 4. Open questions for kymo

These follow from the comparison and the borrowable ideas catalogued in [`mermaid.md`](./a.mermaid.md):

1. **A theme primitive?** Even two or three named themes (light / dark / print) would close the most visible gap vs Mermaid's `themeVariables`, and maps cleanly onto the Figma "variable modes" idea (see [`figma.comparision.md`](./a.figma.comparision.md)).
2. **An icon escape hatch?** Mermaid's FontAwesome/Iconify-by-name model shows users expect to reach beyond the curated set (C1/C2) — the cheapest scoring win on the board.
3. **A Markdown-embed story?** Mermaid's whole moat is "fenced block renders in GitHub." kymo is a compiler, but a documented `kymo`-block convention (pre-rendered SVG committed next to source) could capture some of that ergonomics without becoming a client-side renderer.
4. **`click`/link interactivity?** Cheap additions to SVG output that Mermaid already has; useful when the diagram is read in a browser.
5. **Stay narrow.** Mermaid's ~24 diagram types are its breadth play; resist scope creep and keep kymo excellent at architecture diagrams.

## 5. Provenance

- Comparison subject: mermaid-js/mermaid 11.13.0 as documented at <https://mermaid.js.org/> on 2026-06-03.
- Factual basis for the Mermaid column: [`mermaid.md`](./a.mermaid.md).
- Factual basis for the kymo column: this repository's `kymo-dsl/`, [`best-practices.md`](../diagrams/best-practices.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]]). The kymo cell scores are held identical to [`d2.comparision.md`](./b.d2.comparision.md) §3 and [`diagrams.mingrammer.comparision.md`](./b.diagrams.mingrammer.comparision.md) §3 so the same-category comparisons stay consistent.
- Edits should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds.

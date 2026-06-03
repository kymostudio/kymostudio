---
title: PlantUML vs. kymo — Comparison
document_id: REF-PLANTUML-CMP-001
version: "1.0"
issue_date: 2026-06-03
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream PlantUML major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - a.plantuml.md
  - b.d2.comparision.md
  - a.mermaid.comparision.md
  - b.kroki.comparision.md
  - ../formats/kymo-dsl/README.md
  - ../diagrams/best-practices.md
authors:
  - Vũ Anh
language: en
keywords:
  - plantuml
  - kymo
  - comparison
  - prior-art
  - dsl-tradeoffs
  - diagram-as-code
  - uml
upstream:
  project: plantuml/plantuml
  homepage: https://plantuml.com/
  repository: https://github.com/plantuml/plantuml
  license: GPL-3.0 (with LGPL/Apache/MIT/EPL variants)
  access_date: 2026-06-03
---

# PlantUML vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-PLANTUML-CMP-001                                          |
| Version           | 1.0                                                          |
| Issue Date        | 2026-06-03                                                   |
| Status            | Released                                                     |
| Classification    | Internal                                                    |
| Owner             | `diagrams/` project                                          |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline  |
| Access Date       | 2026-06-03                                                   |
| Parent Reference  | [`plantuml.md`](./a.plantuml.md)                            |
| Related Documents | [`d2.comparision.md`](./b.d2.comparision.md), [`mermaid.comparision.md`](./a.mermaid.comparision.md), [`kroki.comparision.md`](./b.kroki.comparision.md), [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`best-practices.md`](../diagrams/best-practices.md) |

This document isolates the **prior-art comparison** between [PlantUML](https://plantuml.com/) and kymo. The factual reference (syntax, diagram catalog, preprocessor, rendering model, output formats) lives in [`plantuml.md`](./a.plantuml.md); read that first if you need ground truth on how PlantUML actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream PlantUML does not. PlantUML is a **same-category peer** to kymo — both are text-to-diagram languages with an owned, ahead-of-time render pipeline — so this is a like-for-like comparison (unlike the BPMN engines or WYSIWYG editors). The differences in kind: PlantUML is **UML-first**, depends on **GraphViz** for layout, and has a real **preprocessor**, where kymo is architecture-diagram-only with self-owned layout and no textual reuse.

## 1. At-a-glance matrix

| Axis | PlantUML | kymo |
|------|----------|------|
| Primary purpose | UML + general text-to-diagram | Render static architecture diagrams |
| Implementation language | Java | Python 3 (+ JS/TS data-model port) |
| License | GPL-3.0 (LGPL/Apache/MIT/EPL variants) | Apache-2.0 |
| DSL style | `@startuml` markers + per-type grammars | Declarative blocks — `region { ... }`, `component`, `→` |
| Container model | `package`/`namespace`/`rectangle` | Explicit, via named `region` blocks with padding / outer label |
| Layout | GraphViz `dot` (most types); bespoke for sequence/Gantt/mindmap | Single algorithm: grid pack + per-row height sync |
| Textual reuse | Full preprocessor (`!define`/`!function`/`!include`) | None |
| Diagram types | Deep UML + ER, ArchiMate, network, salt, Gantt, mindmap, JSON/YAML | Block / architecture diagrams only |
| Animation | None | Animated SVG + frame-synthesized WebP |
| Output | PNG, SVG, EPS, PDF, LaTeX, ASCII | SVG, animated SVG, animated WebP, Figma, Excalidraw |
| Themes | `skinparam` + `<style>` + bundled `!theme`s | None — accents hand-coded |
| Icons | Sprites + stdlib `!include` (AWS/Azure/GCP/C4/FA) | Bundled SVG library |
| Runtime deps | JVM + GraphViz (full build) | Dependency-light Python; no GraphViz/JVM |
| Embedding | JAR/CLI, HTTP server (text-encoded URLs) | Python module (CLI entry) + JS port |

## 2. Headline tradeoffs

### 2.1 Same category, different heritage

PlantUML and kymo are both external text-to-diagram DSLs with an owned, ahead-of-time render pipeline — the same foundational bet D2 made (and the opposite of the host-language API `mingrammer/diagrams` chose; see [`diagrams.mingrammer.comparision.md` §2.1](./b.diagrams.mingrammer.comparision.md)). The divergence is *heritage and scope*: PlantUML is **UML-first** and has spent a decade-plus accreting diagram families and integrations, while kymo is deliberately narrow (architecture diagrams with an opinionated icon set). PlantUML optimises for breadth and reuse; kymo optimises for a tight, finished look in one domain.

### 2.2 The preprocessor — PlantUML's real lead in the DSL

Where D2 has `vars`/imports/wildcards, PlantUML goes further: a genuine **preprocessor** with `!define`, `!function`/`!procedure`, variables, conditionals, and `!include`/`!includeurl`. This is the strongest textual-reuse story of any DaC tool surveyed, and the main reason PlantUML scores well on extensibility (A3) where kymo scores at the floor — kymo has no variable/include construct today. If kymo ever adds reuse, PlantUML's preprocessor is the prior art to study (and the cautionary tale on complexity).

### 2.3 Layout: GraphViz dependency vs owned engine

PlantUML delegates most layout to **GraphViz `dot`** — decades-tuned, robust, but notoriously hard to coax into tidy architecture diagrams, and an external native dependency that drives the GPL licensing of the bundled build. kymo hardcodes one algorithm (grid pack + per-row height sync in `packages/python/src/kymo/layout.py`), owns the H-V-H midpoint Z edge default the team wants ([[feedback-kymo-edge-routing]]), and carries **no GraphViz/JVM dependency**. kymo trades GraphViz's generality for control, a specific routing aesthetic, and a light runtime.

### 2.4 Output breadth and catalog vs animation and bridges

PlantUML leads on raw output formats (PNG/SVG/EPS/PDF/LaTeX/ASCII) and on its bundled icon stdlib (AWS/Azure/GCP/k8s/C4 via `!include`). kymo counters with animation (animated SVG **and** a frame-synthesized WebP via `packages/python/src/kymo/to_webp.py`) and its Figma/Excalidraw export bridges — neither of which PlantUML offers. Different output ambitions, not a strict ranking.

### 2.5 Ecosystem age

PlantUML (≈13k stars, IntelliJ/VS Code/Eclipse plugins, Confluence/Asciidoctor/Sphinx integration, a hosted server) carries deep enterprise/Java entrenchment; kymo is early. As with D2 and `diagrams`, this is a fact of project age, not a design defect — but it compounds with the catalog and output-breadth gaps to make PlantUML the more "complete" tool today.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension, using the same five categories as [`d2.comparision.md`](./b.d2.comparision.md) (PlantUML is the same tool class, so the rubric transfers directly). The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats.** Scores for `kymo` reflect what is observable in this repo as of 2026-06-03 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the layout-tree + Figma/Excalidraw exporters) and are held **identical to the kymo column in [`d2.comparision.md`](./b.d2.comparision.md) and [`diagrams.mingrammer.comparision.md`](./b.diagrams.mingrammer.comparision.md)** so the same-category (diagram-as-code) comparisons stay consistent. Scores for `PlantUML` reflect upstream 1.2026.5 as documented at <https://plantuml.com/> on 2026-06-03. The **Why** column is load-bearing; numbers without it are worthless — do not strip.

### 3.1 Category A — DSL & Syntax

| # | Criterion | PlantUML | kymo | Why |
|---|-----------|:--:|:----:|-----|
| A1 | Concision on small diagrams | 7 | 7 | PlantUML's `A -> B` is terse but carries `@startuml/@enduml` boilerplate and grows verbose once styled; kymo's `region { ... }` blocks are comparably clean. A wash. |
| A2 | Safety (no precedence/parse footguns) | 7 | 9 | PlantUML is mature but a confederation of per-type mini-grammars plus a preprocessor — more surface to trip on; kymo's single block grammar is marginally less ambiguous. |
| A3 | Extensibility (vars, imports, reuse) | 7 | 3 | PlantUML has a real preprocessor (`!define`/`!function`/`!include`/conditionals) — the strongest textual reuse of any DaC tool; kymo has no variable/import construct today. |
| A4 | Grouping/container semantics | 6 | 7 | PlantUML `package`/`namespace`/`rectangle` group elements but semantics vary by diagram type; kymo's typed `region` containers drive layout/styling decisions. |
| | **Category total / 40** | **27** | **26** | **PlantUML +1** — the preprocessor (A3) just outweighs kymo's safety/container edge. |

### 3.2 Category B — Layout & Edges

| # | Criterion | PlantUML | kymo | Why |
|---|-----------|:--:|:----:|-----|
| B1 | Default layout quality | 6 | 8 | PlantUML leans on GraphViz `dot` — robust but notoriously hard to make tidy for architecture-style diagrams; kymo's first-party engine is tuned for exactly that. |
| B2 | User layout control | 5 | 8 | PlantUML control is indirect (`-[hidden]->`, `together`, rank hints); kymo exposes a first-class layout-tree DSL. |
| B3 | Edge routing aesthetic | 5 | 10 | PlantUML routing is GraphViz splines, not the H-V-H midpoint Z the team wants ([[feedback-kymo-edge-routing]]); kymo defaults to exactly that. |
| B4 | Edge styling | 6 | 5 | PlantUML has arrow styles/colours via `skinparam`/`<style>`; kymo has labels and a smaller per-edge styling surface. |
| | **Category total / 40** | **22** | **31** | **kymo +9** — owned layout + Z-routing dominate a GraphViz-driven backend. |

### 3.3 Category C — Icons & Catalog

| # | Criterion | PlantUML | kymo | Why |
|---|-----------|:--:|:----:|-----|
| C1 | Catalog breadth | 7 | 3 | PlantUML's stdlib bundles AWS/Azure/GCP/k8s/C4/Office/FontAwesome via `!include`; kymo has a single curated project `icons/`. |
| C2 | Icon escape hatch (arbitrary asset) | 6 | 3 | PlantUML supports sprites and `!includeurl` arbitrary collections; kymo has no documented arbitrary-asset hatch yet. |
| | **Category total / 20** | **13** | **6** | **PlantUML +7** — the bundled stdlib icon catalog is a clear lead. |

### 3.4 Category D — Output & Interop

| # | Criterion | PlantUML | kymo | Why |
|---|-----------|:--:|:----:|-----|
| D1 | Output format breadth | 8 | 6 | PlantUML emits PNG/SVG/EPS/PDF/LaTeX/ASCII; kymo is SVG-first plus animated WebP and Figma/Excalidraw exporters (no PNG/PDF yet). |
| D2 | Round-trip with editors | 3 | 6 | PlantUML is source-to-image only; kymo's Figma/Excalidraw exporters are one-way today but provide a real bridge. |
| D3 | Cross-language portability | 6 | 8 | PlantUML is a Java jar reachable via server/wrappers but carries a JVM+GraphViz dependency; kymo ships a Python source-of-truth **and** a JS/TS port with no heavyweight runtime. |
| | **Category total / 30** | **17** | **20** | **kymo +3** — the exporter bridge and light runtime edge out PlantUML's wider raster/print formats. |

### 3.5 Category E — Tooling & Ecosystem

| # | Criterion | PlantUML | kymo | Why |
|---|-----------|:--:|:----:|-----|
| E1 | LSP / IDE / formatter / pkg | 8 | 3 | PlantUML has IntelliJ/VS Code/Eclipse plugins, a hosted server, and broad doc-tool integration (Confluence, Asciidoctor, Sphinx); kymo's tooling is early (CLI only). |
| E2 | Maintenance / community gravity | 8 | 3 | PlantUML is mature (≈13k stars) and entrenched in enterprise/Java workflows; kymo is an early in-house tool. |
| | **Category total / 20** | **16** | **6** | **PlantUML +10** — a function of project age and deep integration footprint. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `PlantUML` | **95** | **6.33** | **63 %** |
| `kymo`     | **89** | **5.93** | **59 %** |
| Gap (PlantUML − kymo) | 6 | 0.40 | 4 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | PlantUML | kymo | Δ (kymo − PlantUML) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — DSL & Syntax        | 4 | 40 | 27 | 26 | **−1**  |
| B — Layout & Edges      | 4 | 40 | 22 | 31 | **+9**  |
| C — Icons & Catalog     | 2 | 20 | 13 | 6  | **−7**  |
| D — Output & Interop    | 3 | 30 | 17 | 20 | **+3**  |
| E — Tooling & Ecosystem | 2 | 20 | 16 | 6  | **−10** |
| **Overall**             | **15** | **150** | **95** | **89** | **−6** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `PlantUML` | 6.75 | 5.50 | 6.50 | 5.67 | 8.00 | **6.48** | **65 %** |
| `kymo`     | 6.50 | 7.75 | 3.00 | 6.67 | 3.00 | **5.38** | **54 %** |
| Gap | | | | | | 1.10 | **11 pp** |

Equal-per-category *widens* the gap (4 pp → 11 pp) because the two small categories where PlantUML leads (C and E) get the same say as the larger ones. Use this only if you believe "catalog" and "tooling" each matter as much as "DSL" or "layout" wholesale — for most kymo readers the per-criterion number (§3.6.1) is the honest one.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): PlantUML 6.33/10 vs kymo 5.93/10 — a 0.40-point / 4-pp gap.** Close: PlantUML's preprocessor, catalog, and ecosystem leads are largely offset by kymo's commanding edge on layout/edges.
- **Where kymo holds its own:** B (layout control + Z-routing, +9) and D (exporter bridge + light runtime, +3). Both come from things kymo *owns* — the same pattern as against D2 and `diagrams`.
- **Where kymo trails:** A3 (preprocessor), C (−7, icon catalog), and E (−10, ecosystem). E rewards age; A3/C are addressable.
- **Cheapest move on the board:** criterion C2 — an icon escape hatch (load arbitrary SVG/PNG by path), worth ≈ +3 in that cell. It is the same top recommendation as the D2 and `diagrams` comparisons — a strong signal it is the real gap.
- **The preprocessor is the interesting lead.** Unlike ecosystem (age) or catalog (accumulation), PlantUML's reuse story (A3) is a *design* idea kymo could choose to adopt — see §4 — without abandoning its design centre.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo lands an icon escape hatch (C2) or expands the in-tree catalog meaningfully (C1).
2. kymo adds variables/imports/repeat or a preprocessor-like reuse construct (A3).
3. kymo ships an LSP, formatter, or VS Code extension (E1).
4. kymo's exporters become bidirectional (D2), or kymo gains PNG/PDF/LaTeX output (D1).
5. kymo gains a theme system (would add new criteria / shift A4, B4).
6. Upstream PlantUML drops the GraphViz dependency, changes its default layout, or relicenses (B1–B3, D, licensing nuance in [`plantuml.md` §9](./a.plantuml.md)).

## 4. Open questions for kymo

These follow from the comparison and the borrowable ideas catalogued in [`plantuml.md`](./a.plantuml.md):

1. **A reuse construct?** PlantUML's preprocessor (`!define`/`!include`/variables) is the clearest DSL feature kymo lacks (A3). Even a minimal `!include` for shared component definitions would cut duplication across `samples/` — but study PlantUML's complexity as the cautionary tale.
2. **An icon escape hatch + catalog story?** PlantUML's stdlib (`!include <awslib/...>`) shows the appetite for large pluggable icon sets (C1/C2) — and C2 is the cheapest scoring win on the board.
3. **A theme primitive?** PlantUML's `<style>`/`!theme` system closes a visible gap; even light/dark/print themes map cleanly onto the Figma "variable modes" idea (see [`figma.comparision.md`](./a.figma.comparision.md)).
4. **More output formats?** PlantUML's PNG/PDF/LaTeX breadth (D1) is borrowable; PNG via the existing `resvg` path is the obvious first step.
5. **Stay off UML.** PlantUML's UML depth is its moat and its scope; resist it — kymo's value is a tight, finished architecture-diagram look.

## 5. Provenance

- Comparison subject: plantuml/plantuml 1.2026.5 as documented at <https://plantuml.com/> on 2026-06-03.
- Factual basis for the PlantUML column: [`plantuml.md`](./a.plantuml.md).
- Factual basis for the kymo column: this repository's [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`best-practices.md`](../diagrams/best-practices.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]]). The kymo cell scores are held identical to [`d2.comparision.md`](./b.d2.comparision.md) §3 and [`diagrams.mingrammer.comparision.md`](./b.diagrams.mingrammer.comparision.md) §3 so the same-category comparisons stay consistent.
- Edits should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds.

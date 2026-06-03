---
title: Kroki vs. kymo — Comparison
document_id: REF-KROKI-CMP-001
version: "1.0"
issue_date: 2026-05-28
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream Kroki major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - REF-KROKI-001
  - REF-D2-CMP-001
  - REF-MERMAID-CMP-001
  - REF-PLANTUML-CMP-001
  - BPD-DGM-001
authors:
  - Vũ Anh
language: en
keywords:
  - kroki
  - yuzutech
  - kymo
  - comparison
  - prior-art
  - api-gateway
  - distribution
upstream:
  project: yuzutech/kroki
  homepage: https://kroki.io/
  repository: https://github.com/yuzutech/kroki
  license: MIT
  access_date: 2026-05-28
---

# Kroki vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-KROKI-CMP-001                                              |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-28                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline    |
| Access Date       | 2026-05-28                                                     |
| Parent Reference  | [REF-KROKI-001](b.kroki.md)                                      |
| Related Documents | [REF-D2-CMP-001](b.d2.comparision.md), [BPD-DGM-001](../diagrams/best-practices.md) |

This document isolates the **prior-art comparison** between [Kroki](https://kroki.io/) and kymo. The factual reference (architecture, API encoding, supported types, output formats, deployment) lives in [REF-KROKI-001](b.kroki.md); read that first if you need ground truth on how Kroki actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream Kroki does not.

**Read the frame first.** Kroki is **not a rival renderer and not a DSL peer** (unlike [REF-D2-CMP-001](b.d2.comparision.md), which *is* a same-class contest). Kroki is an **aggregating API gateway** with no notation of its own — it delegates to ~28 bundled engines, several of which are kymo's neighbours: it ships **D2** (a documented kymo peer) and renders **BPMN** + **Excalidraw** (both kymo interop targets). So the right way to read this whole document is **two relationships at once** — (a) a *landscape census* of the tools kymo sits among, and (b) a possible *distribution channel* for kymo (`.kymo`→SVG is exactly the contract a Kroki backend needs). The numeric scores in §3 are run only because they keep this doc comparable to the rest of the corpus; the headline tradeoffs in §2 and the open questions in §4 carry the real signal.

## 1. At-a-glance matrix

| Axis | Kroki | kymo |
|------|-------|------|
| Primary purpose | Unified render gateway for ~28 diagram engines | Render static architecture diagrams |
| Tool class | API gateway / aggregator (no notation) | Single text-to-diagram language + renderer |
| Native DSL | **None** — passthrough to the chosen engine | `.kymo` declarative DSL |
| Implementation | JVM/Vert.x gateway + Node companion services | Python 3 (+ JS/TS data-model port) |
| License | MIT | Apache-2.0 |
| Diagram types | ~28 (PlantUML, GraphViz, Mermaid, D2, BPMN, Excalidraw, …) | Block / architecture diagrams only |
| Layout | Whatever the chosen engine does | Single algorithm: grid pack + per-row height sync |
| Edge routing | Engine-dependent | Bespoke orthogonal Z-router with rounded corners |
| Animation | None (delegates to engines; none animate) | Animated SVG + frame-synthesized WebP |
| Output | SVG, PNG, PDF, JPEG, base64, txt (varies by type) | SVG, animated SVG, animated WebP, Figma, Excalidraw |
| Icons | Engine-dependent (e.g. PlantUML stdlib, D2 `icon:`) | Bundled SVG library |
| Interface | HTTP API (GET-encoded / POST) + Go CLI/lib | Python module (CLI entry) |
| Sharing model | Self-contained deflate+base64 URL | File-based; no URL-share scheme |
| Deployment | Docker / docker-compose / free public instance | pip/uv install; run locally |
| Relationship | Bundles kymo's peer (D2) + interop targets (BPMN/Excalidraw); potential kymo backend host | — |

## 2. Headline tradeoffs

### 2.1 Aggregator vs single opinionated renderer

The foundational difference is **class, not degree**. Kroki's strategy is *delegation*: it owns no diagram language and no renderer — it owns the **front door** (one API, one encoding, one deployment) and forwards to whichever of ~28 engines you name. kymo's strategy is *ownership*: one notation, one layout, one render pipeline, tuned end-to-end for a single diagram class. Kroki maximises **breadth at zero per-engine learning cost to the operator**; kymo maximises **a finished, consistent look in one domain**. Neither is "better" — they answer different questions ("how do I render anything?" vs "how do I make *this* look right?").

### 2.2 Kroki is the census of kymo's neighbourhood

Kroki's catalogue is a useful map of the "text → diagram" world, and kymo lives inside it: Kroki bundles **D2** (kymo's closest documented peer — see [REF-D2-CMP-001](b.d2.comparision.md)) and renders **BPMN** and **Excalidraw**, both of which kymo already touches (BPMN import; an Excalidraw exporter; see [REF-BPMNIO-001](b.bpmn-io.md)). This means the question "where does kymo fit?" can be answered concretely: it would be *one more diagram type* alongside D2 and Mermaid in the same gateway — a focused, opinionated architecture-diagram renderer where the others are general-purpose.

### 2.3 The integration opportunity (the real headline)

kymo already speaks the exact contract a Kroki backend requires: **source text in, SVG out** (`packages/python/src/kymo/`, `cli.py`). Two concrete paths follow:

1. **`kroki-kymo` companion service** — wrap the kymo CLI in the same tiny HTTP shape Kroki's Node companions use, and register it via a `KROKI_KYMO_HOST` env var.
2. **Upstream `kymo` as a Kroki diagram type** — contribute it so `/kymo/svg/{encoded}` works on any Kroki instance.

Either path puts kymo behind the **one-URL API** and inherits Kroki's whole integration surface for free — `asciidoctor-kroki`, Antora, MkDocs, the native GitLab integration. For an early tool whose biggest gap is *distribution/ecosystem* (the E category, where kymo scores lowest against every peer), this is the cheapest distribution lever on the board. It is a **handoff relationship**, not a contest — the same shape as kymo→Figma.

### 2.4 What Kroki structurally cannot give you

Delegation has a ceiling: Kroki can only emit what its engines emit. **None of its ~28 engines produces kymo's owned aesthetic** — the H-V-H midpoint Z edge routing the team specifically wants ([[feedback-kymo-edge-routing]]) or the animated-SVG-plus-WebP output (`packages/python/src/kymo/to_webp.py`). Kroki could *host* kymo to gain that look; it cannot *reproduce* it from another engine. Depth is kymo's moat; breadth is Kroki's. This is why the scoring below shows kymo holding its own exactly where ownership pays (B — layout/edges) and trailing exactly where accumulation pays (C/E — catalog and ecosystem).

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension, using the same five categories and 15 criteria as [REF-D2-CMP-001](b.d2.comparision.md) so the corpus stays comparable. The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats — read before trusting a number.** Kroki **has no notation, layout, or icon set of its own**, so Categories A (DSL), C (Icons), and parts of B (Layout) **score the aggregate of the bundled engines as reached through Kroki**, not native capability — and that aggregate carries a real penalty: you commit to *one* engine per diagram, so you cannot mix D2's terseness with PlantUML's icon stdlib in the same drawing. Where Kroki adds genuine value (D — output breadth, E — integrations/deployment), the scores are about Kroki itself. Scores for `kymo` reflect what is observable in this repo as of 2026-05-28 and are **held identical to the kymo column in [REF-D2-CMP-001](b.d2.comparision.md)** so the same-rubric comparisons stay consistent. The **Why** column is load-bearing; numbers without it are worthless — do not strip.

### 3.1 Category A — DSL & Syntax

| # | Criterion | Kroki | kymo | Why |
|---|-----------|:--:|:----:|-----|
| A1 | Concision on small diagrams | 7 | 7 | Kroki has no language; concision is whatever engine you pick — choose D2/Mermaid and it's terse, choose PlantUML and it's not. It adds nothing of its own and you commit per-diagram. kymo's `region { ... }` blocks are consistently clean. |
| A2 | Safety (no precedence/parse footguns) | 6 | 9 | Kroki inherits each engine's parse footguns with no unifying validation; kymo owns one low-ambiguity block grammar. |
| A3 | Extensibility (vars, imports, reuse) | 6 | 3 | Some bundled engines bring reuse (D2 `vars`/imports, PlantUML `!include`/preprocessor); Kroki adds no cross-engine variable or include layer. kymo has none today. |
| A4 | Grouping/container semantics | 6 | 7 | Containers exist in most engines (D2 dot-paths, PlantUML packages) but quality/semantics vary and Kroki is neutral; kymo's typed `region` drives layout/styling decisions. |
| | **Category total / 40** | **25** | **26** | **kymo +1** — a wash: Kroki can borrow a strong engine's reuse (A3) but pays in safety/consistency (A2) for having no language of its own. |

### 3.2 Category B — Layout & Edges

| # | Criterion | Kroki | kymo | Why |
|---|-----------|:--:|:----:|-----|
| B1 | Default layout quality | 8 | 8 | Best-of-breed reachable (GraphViz/D2/Mermaid all lay out well); kymo's first-party engine is tuned for architecture diagrams. A wash. |
| B2 | User layout control | 7 | 8 | Engine-dependent (D2 grid, GraphViz attrs) and inconsistent across types; kymo exposes a first-class layout-tree DSL. |
| B3 | Edge routing aesthetic | 6 | 10 | Whatever the chosen engine yields — never kymo's H-V-H midpoint Z ([[feedback-kymo-edge-routing]]), which kymo defaults to. |
| B4 | Edge styling | 7 | 5 | Strong engines (D2/PlantUML) carry rich per-edge styling; kymo has labels but a smaller per-edge surface. |
| | **Category total / 40** | **28** | **31** | **kymo +3** — kymo's *owned* Z-routing (B3) is the difference; you cannot get it through any Kroki engine. |

### 3.3 Category C — Icons & Catalog

| # | Criterion | Kroki | kymo | Why |
|---|-----------|:--:|:----:|-----|
| C1 | Catalog breadth | 7 | 3 | In aggregate the bundled engines reach huge icon coverage (PlantUML stdlib AWS/Azure/GCP/k8s sprites, C4, D2's hosted catalog); kymo has a single project-managed `icons/`. |
| C2 | Icon escape hatch (arbitrary asset) | 6 | 3 | Available but non-uniform (D2 `icon:` any URL, PlantUML sprites); kymo has no documented arbitrary-asset hatch yet. |
| | **Category total / 20** | **13** | **6** | **Kroki +7** — breadth-by-aggregation is a real lead, with the caveat that it's spread across engines you can't combine in one diagram. |

### 3.4 Category D — Output & Interop

| # | Criterion | Kroki | kymo | Why |
|---|-----------|:--:|:----:|-----|
| D1 | Output format breadth | 9 | 6 | SVG/PNG/PDF/JPEG/base64/txt across the catalogue — Kroki's core strength; kymo is SVG-first plus animated WebP and Figma/Excalidraw exporters (no PNG/PDF yet). |
| D2 | Round-trip with editors | 4 | 6 | Kroki is render-only (source→image), strictly one-way; kymo's Figma/Excalidraw exporters are one-way today but provide a real bridge. |
| D3 | Cross-language portability | 9 | 8 | An HTTP API is language-agnostic by construction, with an official Go CLI/lib and many SDKs; kymo ships a Python source-of-truth **and** a JS/TS port. |
| | **Category total / 30** | **22** | **20** | **Kroki +2** — raster/format breadth and the universal HTTP surface edge out kymo's exporter bridge. |

### 3.5 Category E — Tooling & Ecosystem

| # | Criterion | Kroki | kymo | Why |
|---|-----------|:--:|:----:|-----|
| E1 | LSP / IDE / formatter / pkg | 7 | 3 | No Kroki-native LSP (it's not a language), but a deep *integration* layer — asciidoctor-kroki, Antora, MkDocs, native GitLab, the Go CLI; kymo's tooling is early (CLI only). |
| E2 | Maintenance / community gravity | 8 | 3 | ≈4.2k stars, sponsor-backed, mature, embedded in GitLab; kymo is an early in-house tool. |
| | **Category total / 20** | **15** | **6** | **Kroki +9** — the widest gap; a function of project age, sponsorship, and being plumbed into big platforms. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `Kroki` | **103** | **6.87** | **69 %** |
| `kymo`  | **89**  | **5.93** | **59 %** |
| Gap (Kroki − kymo) | 14 | 0.93 | 10 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | Kroki | kymo | Δ (kymo − Kroki) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — DSL & Syntax        | 4 | 40 | 25 | 26 | **+1**  |
| B — Layout & Edges      | 4 | 40 | 28 | 31 | **+3**  |
| C — Icons & Catalog     | 2 | 20 | 13 | 6  | **−7**  |
| D — Output & Interop    | 3 | 30 | 22 | 20 | **−2**  |
| E — Tooling & Ecosystem | 2 | 20 | 15 | 6  | **−9**  |
| **Overall**             | **15** | **150** | **103** | **89** | **−14** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Kroki` | 6.25 | 7.00 | 6.50 | 7.33 | 7.50 | **6.92** | **69 %** |
| `kymo`  | 6.50 | 7.75 | 3.00 | 6.67 | 3.00 | **5.38** | **54 %** |
| Gap | | | | | | 1.54 | **15 pp** |

Equal-per-category *widens* the gap (10 pp → 15 pp) because the two small categories where Kroki leads hardest (C and E) get the same say as the larger ones. Use this only if you believe "catalog" and "tooling" each matter as much as "DSL" wholesale.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): Kroki 6.87/10 vs kymo 5.93/10 — a 0.9-point / 10-pp gap.** But the number is misleading on its own: Kroki "wins" by *aggregating other people's engines*, not by being a better renderer than kymo. It scores highest exactly where it does no diagram work (D output plumbing, E integrations).
- **Where kymo holds its own or leads:** A (wash, +1), B (+3, the owned Z-routing). Both come from things kymo *owns* — and crucially, **no Kroki engine can reproduce them.**
- **Where kymo trails:** C (−7) and E (−9) — icon-catalogue breadth and ecosystem/integration maturity. These reward accumulation (catalog content, platform integrations, community-years), not a single fix.
- **The real takeaway is not the score — it's §2.3.** kymo's weakest category (E) is *precisely* what becoming a Kroki backend would buy cheaply. Don't try to out-aggregate Kroki; consider *joining* it.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo ships an HTTP render endpoint or a `kroki-kymo` companion service (E1, D3, and reframes §2.3 from opportunity to fact).
2. kymo lands an icon escape hatch (C2) or expands the in-tree catalog meaningfully (C1).
3. kymo adds variables/imports/repeat (A3), or gains PNG/PDF output (D1).
4. kymo's exporters become bidirectional (D2), or it ships an LSP/formatter/VS Code extension (E1).
5. Upstream Kroki adds/removes diagram types, changes the encoding, or relicenses (A, C, D).

## 4. Open questions for kymo

These follow from the comparison, especially §2.3:

1. **Should kymo become a Kroki backend?** A `kroki-kymo` companion service (or upstreaming `kymo` as a Kroki diagram type) is the cheapest distribution lever available — it inherits asciidoctor-kroki, Antora, MkDocs, and GitLab for free, directly attacking kymo's weakest category (E). What is the maintenance cost of tracking Kroki's companion-service contract?
2. **Adopt deflate+base64 URL sharing?** Kroki's self-contained shareable-URL scheme (zlib level 9 + URL-safe base64) is a clean model for a kymo playground or "share this diagram" link. Worth borrowing independently of any Kroki integration.
3. **Should kymo expose an HTTP render API at all,** or stay CLI/library-only? Becoming a Kroki backend implies a small HTTP surface; is that a direction kymo wants regardless of Kroki?
4. **Align importers/exporters with Kroki's companions?** Kroki renders BPMN and Excalidraw — the same formats kymo imports/exports. Is there value in matching the exact dialects Kroki's `kroki-bpmn`/`kroki-excalidraw` accept, so a kymo↔Kroki round-trip is lossless?

## 5. Provenance

- Comparison subject: yuzutech/kroki 0.30.1 as documented at <https://kroki.io/> and <https://docs.kroki.io/> on 2026-05-28.
- Factual basis for the Kroki column: [REF-KROKI-001](b.kroki.md).
- Factual basis for the kymo column: this repository's [BPD-DGM-001](../diagrams/best-practices.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]]). The kymo cell scores are held identical to the kymo column in [REF-D2-CMP-001](b.d2.comparision.md) so the same-rubric comparisons stay consistent.
- **Scoring caveat (do not strip):** Kroki has no native notation, layout, or icon set; its A/C cells (and part of B) score the *aggregate of the bundled engines as reached through Kroki*, with a penalty for single-engine-per-diagram commitment. The honest signal of this document is in §2 and §4, not the §3 numbers.
- Edits should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds.

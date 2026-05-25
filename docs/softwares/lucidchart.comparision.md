---
title: Lucidchart vs. kymo — Comparison
document_id: REF-LUCIDCHART-CMP-001
version: "1.0"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream Lucidchart major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - lucidchart.md
  - ../formats/kymo-dsl/README.md
  - ../diagrams/best-practices.md
authors:
  - Vũ Anh
language: en
keywords:
  - lucidchart
  - lucid-software
  - kymo
  - comparison
  - prior-art
  - collaborative-diagramming
  - saas
upstream:
  project: Lucidchart (Lucid Software)
  homepage: https://www.lucidchart.com/
  developer_site: https://www.lucidchart.com/pages/tutorial/bpmn-symbols-explained
  license: Proprietary SaaS (freemium)
  access_date: 2026-05-20
---

# Lucidchart vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-LUCIDCHART-CMP-001                                        |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-21                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline    |
| Access Date       | 2026-05-20                                                     |
| Parent Reference  | [`lucidchart.md`](lucidchart.md)                              |
| Related Documents | [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`best-practices.md`](../diagrams/best-practices.md) |

This document isolates the **prior-art comparison** between [Lucidchart](https://www.lucidchart.com/) and kymo. The factual reference (editions, capabilities, BPMN support) lives in [`lucidchart.md`](lucidchart.md); read that first if you need ground truth on how Lucidchart actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream Lucidchart does not. Lucidchart is a **general-purpose collaborative diagramming SaaS** (BPMN is one shape set) in a comparable category to kymo's diagramming role, so several axes below are genuinely like-for-like — but they are different authoring models (real-time WYSIWYG canvas vs a text DSL), so read §2 and §4 before the scores.

## 1. At-a-glance matrix

| Axis | Lucidchart | kymo |
|------|------------|------|
| Primary purpose | General collaborative diagramming | Render static architecture diagrams |
| Authoring | WYSIWYG, browser, real-time multi-user | Local text DSL, single author |
| Scope | Many types (BPMN one library) | Architecture, opinionated |
| BPMN | Shapes, no semantics | Not a BPMN tool |
| Deployment | Proprietary SaaS, cloud | Local CLI / library |
| Cost / License | Freemium subscription | Apache-2.0, free |

## 2. Headline tradeoffs

### 2.1 Real-time SaaS canvas vs local text source

Lucidchart is a browser canvas built around **real-time multi-user collaboration**: many people edit the same diagram at once, with presence and comments. kymo is a local text DSL: the `.kymo` source records *intent*, the layout engine computes positions, and a single author commits it to a repo. This cascades through almost every axis. Lucidchart wins approachability (no syntax) and live collaboration; kymo wins everything that flows from plain-text source — diffs, code review, git history, regenerate-from-source automation. Real-time collaboration is a SaaS moat, not a library feature; kymo deliberately trades it for git-friendliness. Neither is "better" — they serve different needs.

### 2.2 Diagram-from-data — input need not be hand-written

Lucidchart can generate diagrams from imported structured data — conceptually adjacent to kymo's "text in, diagram out" model. It is a useful reminder that the input to a diagram need not always be hand-written DSL; a structured source (CSV, an inventory file, an API dump) could in principle drive kymo just as it drives Lucidchart's data-linked diagrams. kymo's text DSL is one front-end; nothing forces it to be the only one.

### 2.3 Approachable shape libraries

Lucidchart's enable-a-shape-set UX (shared with [draw.io](drawio.md)) is a clean model for organising kymo's icon families: a user toggles on the library they need rather than hunting a flat catalog. kymo's file-backed `icons/` set could borrow this mental model for how families are surfaced and grouped — an organisational idea, not a rendering one.

### 2.4 Catalog breadth is Lucidchart's lead

Lucidchart ships a broad template/shape catalogue across many diagram domains; kymo's icon set is respectable but narrower and tuned to architecture diagrams. This is an accumulation gap — the same shape kymo has against draw.io, `diagrams`, and D2 — not worth chasing in-tree; lean on the Figma/Excalidraw exporters to borrow iconography from environments that already have it.

### 2.5 Symbols without semantics — a shared honesty

Lucidchart draws BPMN symbols but enforces no BPMN semantics (no execution model, no validation). kymo is likewise a *visual* tool — it renders architecture diagrams, it does not validate an architecture. Lucidchart is a useful reminder to be explicit about that boundary so users don't mistake a nice picture for a checked model.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension. Because Lucidchart is a WYSIWYG SaaS editor rather than a diagram-as-code language, the rubric is the **general-tool** adaptation of the five categories used in [`diagrams.mingrammer.comparision.md`](diagrams.mingrammer.comparision.md): A Authoring & Source, B Layout & Rendering, C Scope & Iconography, D Output & Interop, E Cost/Deployment & Ecosystem. The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats.** Scores for `kymo` reflect what is observable in this repo as of 2026-05-21 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the layout-tree + Figma/Excalidraw exporters) and are held **consistent across every general-tool comparison in `docs/softwares/`** so kymo is judged the same way each time. Scores for `Lucidchart` reflect the Lucidchart cloud product as documented in [`lucidchart.md`](lucidchart.md) on 2026-05-20. The comparison is cross-model (collaborative canvas vs DSL), so the **Why** column is load-bearing — read it, not the bare number.

### 3.1 Category A — Authoring & Source

| # | Criterion | Lucidchart | kymo | Why |
|---|-----------|:----------:|:----:|-----|
| A1 | Text / diff / git-friendliness of source | 3 | 9 | Lucidchart stores a cloud canvas of hand-placed shapes — not diffable or reviewable as text; kymo's `.kymo` is plain declarative text built for git. |
| A2 | Reproducibility & automation | 5 | 8 | Lucidchart can generate from imported data and export via API, but diagrams are hand-drawn cloud artefacts; kymo regenerates SVG/WebP from source, ideal for CI. |
| A3 | Approachability / learning curve | 9 | 6 | Lucidchart is drag-and-drop in the browser with zero syntax and live collaboration; kymo asks the user to learn a small DSL. |
| A4 | Grouping / container semantics | 6 | 7 | Lucidchart has generic containers/groups (no kind); kymo's typed `region` containers carry layout/styling meaning. |
| | **Category total / 40** | **23** | **30** | **kymo +7** — everything that flows from plain-text source. |

### 3.2 Category B — Layout & Rendering

| # | Criterion | Lucidchart | kymo | Why |
|---|-----------|:----------:|:----:|-----|
| B1 | Default layout quality | 7 | 8 | Lucidchart has competent auto-layout and tidy defaults, but placement is largely manual; kymo's first-party engine is tuned for architecture diagrams. |
| B2 | User layout control | 8 | 8 | Lucidchart gives fine browser-based manual control; kymo's layout-tree DSL is expressive but computed, not hand-placed — a wash. |
| B3 | Edge / flow routing aesthetic | 7 | 10 | Lucidchart's orthogonal routing is good and manually tweakable; kymo defaults to the H-V-H midpoint Z the team specified ([[feedback-kymo-edge-routing]]). |
| B4 | Styling / themes / animation | 6 | 6 | Lucidchart has rich per-shape styling and themes but no animation; kymo has animated SVG/WebP but no theme system — a wash. |
| | **Category total / 40** | **28** | **32** | **kymo +4** — owned routing + tuned auto-layout vs Lucidchart's manual control. |

### 3.3 Category C — Scope & Iconography

| # | Criterion | Lucidchart | kymo | Why |
|---|-----------|:----------:|:----:|-----|
| C1 | Scope / notation breadth | 9 | 4 | Lucidchart draws "anything" (flowcharts, UML, network, BPMN, mind maps); kymo draws architecture/block diagrams only. |
| C2 | Icon / shape catalog | 8 | 5 | Lucidchart has a large built-in catalogue plus enable-a-library shape sets; kymo's file-backed `icons/` set is sizable but narrower and architecture-tuned. |
| | **Category total / 20** | **17** | **9** | **Lucidchart +8** — breadth is the moat; an accumulation gap, not a capability kymo should chase in-tree. |

### 3.4 Category D — Output & Interop

| # | Criterion | Lucidchart | kymo | Why |
|---|-----------|:----------:|:----:|-----|
| D1 | Output-format breadth | 7 | 6 | Lucidchart exports PNG/PDF/SVG/Visio and embeds widely; kymo is SVG-first plus animated WebP and Figma/Excalidraw (no PNG/PDF yet). |
| D2 | Round-trip / data interchange | 6 | 5 | Lucidchart round-trips within its suite and imports/exports Visio; kymo's exporters are one-way and there is no standard interchange format. |
| D3 | Embeddability / API | 6 | 6 | Lucidchart embeds via iframe and has REST/import APIs behind paid tiers; kymo is a Python module + JS port (no service/API) — a wash. |
| | **Category total / 30** | **19** | **17** | **Lucidchart +2** — wider raster formats and an embeddable editor, narrowly. |

### 3.5 Category E — Cost, Deployment & Ecosystem

| # | Criterion | Lucidchart | kymo | Why |
|---|-----------|:----------:|:----:|-----|
| E1 | License, cost & self-host/offline | 3 | 9 | Lucidchart is proprietary SaaS, cloud-only, freemium-with-paid-tiers, no self-host/offline; kymo is Apache-2.0 and fully local/offline. |
| E2 | Community / maturity | 8 | 3 | Lucidchart is a widely used, mature commercial platform with a large user base; kymo is an early in-house tool. |
| | **Category total / 20** | **11** | **12** | **kymo +1** — kymo's licensing/offline strength edges out Lucidchart's maturity. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `Lucidchart` | **98** | **6.53** | **65 %** |
| `kymo`       | **100** | **6.67** | **67 %** |
| Gap (kymo − Lucidchart) | 2 | 0.13 | 2 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | Lucidchart | kymo | Δ (kymo − Lucidchart) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — Authoring & Source        | 4 | 40 | 23 | 30 | **+7**  |
| B — Layout & Rendering        | 4 | 40 | 28 | 32 | **+4**  |
| C — Scope & Iconography       | 2 | 20 | 17 | 9  | **−8**  |
| D — Output & Interop          | 3 | 30 | 19 | 17 | **−2**  |
| E — Cost, Deployment & Ecosys | 2 | 20 | 11 | 12 | **+1**  |
| **Overall**                   | **15** | **150** | **98** | **100** | **+2** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Lucidchart` | 5.75 | 7.00 | 8.50 | 6.33 | 5.50 | **6.62** | **66 %** |
| `kymo`       | 7.50 | 8.00 | 4.50 | 5.67 | 6.00 | **6.33** | **63 %** |
| Gap | | | | | | 0.29 | **3 pp** |

**FLIP.** Note the direction reverses between the two weightings. Under equal-per-criterion (§3.6.1) **kymo leads** (67 % vs 65 %), but under equal-per-category Lucidchart edges ahead (6.62 vs 6.33) because it dominates the small 2-criterion C category (scope/shape catalog), which gets upweighted relative to its per-criterion contribution. Use the per-category number only if you believe "scope/iconography" matters as much wholesale as "authoring" — for kymo's target user (an engineer in a repo) the per-criterion number (§3.6.1) is the honest one, and it puts kymo narrowly ahead.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): kymo 6.67/10 vs Lucidchart 6.53/10 — a 0.13-point / 2-pp gap in kymo's favour.** Effectively a tie; category-level shape matters more than the single number.
- **Strategic shape.** kymo leads on what it *owns* (text source, layout/routing); Lucidchart leads on what it *accumulates* (shape catalog, community/maturity). Same asymmetry as every other comparison in this folder — invest in owned surface, borrow the rest.
- **The flip is the headline insight.** Whether kymo "wins" depends entirely on the weighting: equal-per-criterion favours kymo, equal-per-category favours Lucidchart. Be explicit about which lens you are using before quoting a verdict.
- **Cheapest moves on the board:** PNG/PDF export (D1, ≈ +1) is low-cost since SVG/WebP already exist; an icon escape hatch (helps C2) is the recurring top recommendation across these comparisons.
- **Don't chase scope breadth (C1) or live collaboration.** Lucidchart's "draw anything, together, in the cloud" is a different product. kymo's value is a tight, finished architecture-diagram look from git-friendly text — protect that.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo gains PNG/PDF output (D1) or its exporters become bidirectional (D2).
2. kymo's icon catalog or an arbitrary-asset escape hatch expands meaningfully (C2).
3. kymo gains a theme system (B4) or an interactive/embeddable target (D3).
4. kymo ships authoring aids — an LSP, formatter, or visual editor (would shift A3, E).
5. Upstream Lucidchart changes its export formats, data-import model, or pricing/licensing (D1, C, E1).

## 4. Open questions for kymo

These follow from the comparison and the borrowable ideas catalogued in [`lucidchart.md`](lucidchart.md):

1. **A non-DSL input front-end (diagram-from-data)?** Lucidchart shows the input need not be hand-written. Could a structured source (CSV, inventory file) drive kymo as a second front-end alongside the `.kymo` DSL?
2. **An enable-a-library / icon-family organisation?** Lucidchart's enable-a-shape-set UX is a clean mental model for how kymo's icon families could be surfaced and grouped.
3. **An icon escape hatch (arbitrary SVG/PNG by path)?** The recurring gap across every comparison in this folder; without it, every catalog miss reads as "kymo can't draw that".
4. **How explicit should the "visual, not validated" boundary be?** Lucidchart shows the cost of symbols-without-semantics; kymo's docs should keep that boundary honest so a clean picture isn't mistaken for a checked architecture.

## 5. Provenance

- Comparison subject: Lucidchart cloud as documented in [`lucidchart.md`](lucidchart.md) on 2026-05-20.
- Factual basis for the Lucidchart column: [`lucidchart.md`](lucidchart.md).
- Factual basis for the kymo column: this repository's [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`best-practices.md`](../diagrams/best-practices.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]] at B3). The kymo cell scores follow the shared general-tool kymo column used across `docs/softwares/*.comparision.md` so kymo is judged consistently.
- Edits should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds.

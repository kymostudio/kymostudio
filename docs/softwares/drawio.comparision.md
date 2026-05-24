---
title: draw.io / diagrams.net vs. kymo — Comparison
document_id: REF-DRAWIO-CMP-001
version: "1.0"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream draw.io major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - drawio.md
  - lucidchart.comparision.md
  - ../formats/kymo-dsl/README.md
  - ../BEST_PRACTICE_DIAGRAMS.md
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - diagrams-net
  - kymo
  - comparison
  - prior-art
  - wysiwyg
  - diagramming
upstream:
  project: draw.io / diagrams.net
  homepage: https://www.drawio.com/
  repository: https://github.com/jgraph/drawio
  license: Apache-2.0 (icon/stencil/template sets carry extra Atlassian-related terms)
  access_date: 2026-05-20
---

# draw.io / diagrams.net vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-DRAWIO-CMP-001                                             |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-21                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline    |
| Access Date       | 2026-05-20                                                     |
| Parent Reference  | [`drawio.md`](drawio.md)                                       |
| Related Documents | [`lucidchart.comparision.md`](lucidchart.comparision.md), [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md) |

This document isolates the **prior-art comparison** between [draw.io / diagrams.net](https://www.drawio.com/) and kymo. The factual reference (architecture, file format, BPMN support, capabilities) lives in [`drawio.md`](drawio.md); read that first if you need ground truth on how draw.io actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream draw.io does not. draw.io and kymo are **different authoring models** (WYSIWYG drag-and-drop vs a text DSL), so several axes below are not strictly like-for-like — read §2 and §4 before the scores.

## 1. At-a-glance matrix

| Axis | draw.io | kymo |
|------|---------|------|
| Primary purpose | General-purpose diagram editor | Render static architecture diagrams |
| Authoring model | WYSIWYG drag-and-drop | Text DSL (`.kymo`) compiled to SVG |
| Scope | General (BPMN is one of many shape libraries) | Architecture diagrams, opinionated icon set |
| Implementation | JavaScript, client-side | Python renderer + JS data-model port |
| File format | mxGraph XML (`.drawio`) | `.kymo` DSL source |
| BPMN | Shape library, no semantics | Not a BPMN tool |
| Layout | Manual placement (+ optional auto-layout) | Computed by kymo's layout engine |
| Output | SVG, PNG, PDF, HTML | SVG, animated SVG, animated WebP, Figma, Excalidraw |
| Licence | Apache-2.0 (stencil/template caveats) | Apache-2.0 |
| Hosting | Self-hostable, offline desktop build | CLI / library, local |

## 2. Headline tradeoffs

### 2.1 WYSIWYG vs text source — the defining split

draw.io is a canvas: you place shapes by hand and the file (`.drawio`, mxGraph XML) records *positions*, not intent. kymo is a text DSL: the `.kymo` source records *intent* and the layout engine computes positions. This single difference cascades through almost every axis. draw.io wins approachability (no syntax to learn) and fine-grained manual control; kymo wins everything that flows from plain-text source — diffs, code review, git history, regenerate-from-source automation. Neither is "better"; they serve different workflows (a designer at a canvas vs an engineer in a repo).

### 2.2 Layout ownership

Because draw.io stores hand-placed coordinates, its layout is whatever the author dragged (with optional auto-layout as a convenience). kymo computes layout from the source every time and owns the H-V-H midpoint Z edge routing the team wants ([[feedback-kymo-edge-routing]]). The tradeoff: draw.io gives total manual control at the cost of every diagram being hand-maintained; kymo gives consistent, regenerable layout at the cost of less pixel-level control.

### 2.3 Catalog breadth is draw.io's moat

draw.io ships a large built-in shape catalogue across many domains plus custom shape libraries — its single biggest lead. kymo's icon set (file-backed icons under the repo-root `icons/`) is respectable but narrower and tuned to architecture diagrams. This is an accumulation gap, the same shape kymo has against `diagrams` and D2: not worth chasing in-tree; lean on the Figma/Excalidraw exporters to borrow iconography from environments that already have it.

### 2.4 Symbols without semantics — a shared honesty

draw.io draws BPMN symbols but enforces no BPMN semantics (no token model, no validation). kymo is likewise a *visual* tool — it renders architecture diagrams, it does not validate an architecture. draw.io is a useful reminder to be explicit about that boundary (as the BPMN-specialised tools are) so users don't mistake a nice picture for a checked model.

### 2.5 Self-hosting / offline as a shared value

Both are Apache-2.0 and both run fully locally — draw.io as an offline Electron build, kymo as a local CLI/library. "Your data never leaves the device" is a stance kymo already embodies; draw.io is the proof that it is a durable, attractive default.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension. Because draw.io is a WYSIWYG editor rather than a diagram-as-code language, the rubric is the **general-tool** adaptation of the five categories used in [`diagrams.mingrammer.comparision.md`](diagrams.mingrammer.comparision.md): A Authoring & Source, B Layout & Rendering, C Scope & Iconography, D Output & Interop, E Cost/Deployment & Ecosystem. The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats.** Scores for `kymo` reflect what is observable in this repo as of 2026-05-21 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the layout-tree + Figma/Excalidraw exporters) and are held **consistent across every general-tool comparison in `docs/softwares/`** so kymo is judged the same way each time. Scores for `draw.io` reflect upstream 30.0.2 as documented at <https://www.drawio.com/> on 2026-05-20. The comparison is cross-model (canvas vs DSL), so the **Why** column is load-bearing — read it, not the bare number.

### 3.1 Category A — Authoring & Source

| # | Criterion | draw.io | kymo | Why |
|---|-----------|:------:|:----:|-----|
| A1 | Text / diff / git-friendliness of source | 3 | 9 | `.drawio` is mxGraph XML recording coordinates — not meaningfully diffable or reviewable; kymo's `.kymo` is plain declarative text built for git. |
| A2 | Reproducibility & automation | 4 | 8 | draw.io can export via CLI but diagrams are hand-drawn artefacts; kymo regenerates SVG/WebP from source, ideal for CI. |
| A3 | Approachability / learning curve | 9 | 6 | draw.io is drag-and-drop with zero syntax; kymo asks the user to learn a small DSL. |
| A4 | Grouping / container semantics | 6 | 7 | draw.io has generic containers/groups (no kind); kymo's typed `region` containers carry layout/styling meaning. |
| | **Category total / 40** | **22** | **30** | **kymo +8** — everything that flows from plain-text source. |

### 3.2 Category B — Layout & Rendering

| # | Criterion | draw.io | kymo | Why |
|---|-----------|:------:|:----:|-----|
| B1 | Default layout quality | 6 | 8 | draw.io defaults to manual placement; auto-layout is a convenience, not a strength. kymo's first-party engine is tuned for architecture diagrams. |
| B2 | User layout control | 9 | 8 | draw.io gives total pixel-level manual control; kymo's layout-tree DSL is expressive but computed, not hand-placed. |
| B3 | Edge / flow routing aesthetic | 7 | 10 | draw.io's orthogonal routing is good and manually tweakable; kymo defaults to the H-V-H midpoint Z the team specified ([[feedback-kymo-edge-routing]]). |
| B4 | Styling / themes / animation | 7 | 6 | draw.io has rich per-shape styling but no animation; kymo has animated SVG/WebP but no theme system. |
| | **Category total / 40** | **29** | **32** | **kymo +3** — owned routing + auto-layout vs draw.io's manual control. |

### 3.3 Category C — Scope & Iconography

| # | Criterion | draw.io | kymo | Why |
|---|-----------|:------:|:----:|-----|
| C1 | Scope / notation breadth | 9 | 4 | draw.io draws "anything" (flowcharts, UML, network, BPMN, mind maps); kymo draws architecture/block diagrams only. |
| C2 | Icon / shape catalog | 9 | 5 | draw.io has a huge built-in catalogue plus custom libraries; kymo's file-backed `icons/` set is sizable but narrower and architecture-tuned. |
| | **Category total / 20** | **18** | **9** | **draw.io +9** — breadth is the moat; an accumulation gap, not a capability kymo should chase in-tree. |

### 3.4 Category D — Output & Interop

| # | Criterion | draw.io | kymo | Why |
|---|-----------|:------:|:----:|-----|
| D1 | Output-format breadth | 8 | 6 | draw.io emits SVG/PNG/PDF/HTML; kymo is SVG-first plus animated WebP and Figma/Excalidraw (no PNG/PDF yet). |
| D2 | Round-trip / data interchange | 6 | 5 | `.drawio` round-trips within the draw.io/Confluence ecosystem; kymo's exporters are one-way and there is no standard interchange format. |
| D3 | Embeddability / API | 7 | 6 | draw.io embeds as an editor with Confluence/Jira integrations and self-host; kymo is a Python module + JS port (no service/API). |
| | **Category total / 30** | **21** | **17** | **draw.io +4** — wider raster formats and an embeddable editor. |

### 3.5 Category E — Cost, Deployment & Ecosystem

| # | Criterion | draw.io | kymo | Why |
|---|-----------|:------:|:----:|-----|
| E1 | License, cost & self-host/offline | 9 | 9 | Both Apache-2.0 and fully local/offline (draw.io has an Electron build; kymo is a local CLI/library). A wash. |
| E2 | Community / maturity | 9 | 3 | draw.io is among the most widely used diagram editors in existence; kymo is an early in-house tool. |
| | **Category total / 20** | **18** | **12** | **draw.io +6** — maturity and ubiquity, offset partly by the shared licensing strength. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `draw.io` | **108** | **7.20** | **72 %** |
| `kymo`    | **100** | **6.67** | **67 %** |
| Gap (draw.io − kymo) | 8 | 0.53 | 5 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | draw.io | kymo | Δ (kymo − draw.io) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — Authoring & Source        | 4 | 40 | 22 | 30 | **+8**  |
| B — Layout & Rendering        | 4 | 40 | 29 | 32 | **+3**  |
| C — Scope & Iconography       | 2 | 20 | 18 | 9  | **−9**  |
| D — Output & Interop          | 3 | 30 | 21 | 17 | **−4**  |
| E — Cost, Deployment & Ecosys | 2 | 20 | 18 | 12 | **−6**  |
| **Overall**                   | **15** | **150** | **108** | **100** | **−8** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `draw.io` | 5.50 | 7.25 | 9.00 | 7.00 | 9.00 | **7.55** | **76 %** |
| `kymo`    | 7.50 | 8.00 | 4.50 | 5.67 | 6.00 | **6.33** | **63 %** |
| Gap | | | | | | 1.22 | **12 pp** |

Equal-per-category *widens* the gap (5 pp → 12 pp) because the two small categories where draw.io dominates (C and E) get the same say as the larger ones. Use this only if you believe "catalog" and "ecosystem" each matter as much as "authoring" wholesale — for kymo's target user (an engineer in a repo) the per-criterion number (§3.6.1) is the honest one.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): draw.io 7.20/10 vs kymo 6.67/10 — a 0.5-point / 5-pp gap.** Closer than it looks, because kymo's authoring-model wins (A) nearly offset draw.io's catalog/ecosystem wins (C, E).
- **Strategic shape.** kymo leads on what it *owns* (text source, layout/routing); draw.io leads on what it *accumulates* (shape catalog, community-years). Same asymmetry as every other comparison in this folder — invest in owned surface, borrow the rest.
- **Cheapest moves on the board:** PNG/PDF export (D1, ≈ +2) is low-cost since SVG/WebP already exist; an icon escape hatch (helps C2) is the recurring top recommendation across these comparisons.
- **Don't chase scope breadth (C1).** draw.io's "draw anything" is a different product. kymo's value is a tight, finished architecture-diagram look from text — protect that.
- **Cross-model caveat:** A2 (reproducibility) and A1 (diffability) are where kymo's text source genuinely changes the workflow; if your team works in a repo, weight A higher than the equal-weight headline implies.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo gains PNG/PDF output (D1) or its exporters become bidirectional (D2).
2. kymo's icon catalog or an arbitrary-asset escape hatch expands meaningfully (C2).
3. kymo gains a theme system (B4) or an interactive/embeddable target (D3).
4. kymo ships authoring aids — an LSP, formatter, or visual editor (would shift A3, E).
5. Upstream draw.io changes its default layout, licensing, or shape-library model (B1, C, E1).

## 4. Open questions for kymo

These follow from the comparison and the borrowable ideas catalogued in [`drawio.md`](drawio.md):

1. **PNG/PDF from the same model?** kymo already emits SVG/WebP; rasterising to PNG and writing PDF from the existing render is a natural, low-cost addition that closes most of D1.
2. **A pluggable shape-library panel / icon-family organisation?** draw.io's enable-a-library UX is a clean mental model for how kymo's icon families could be surfaced and grouped.
3. **An icon escape hatch (arbitrary SVG/PNG by path)?** The recurring gap across every comparison in this folder; without it, every catalog miss reads as "kymo can't draw that".
4. **How explicit should the "visual, not validated" boundary be?** draw.io shows the cost of symbols-without-semantics; kymo's docs should keep that boundary honest so a clean picture isn't mistaken for a checked architecture.

## 5. Provenance

- Comparison subject: draw.io / diagrams.net 30.0.2 as documented at <https://www.drawio.com/> on 2026-05-20.
- Factual basis for the draw.io column: [`drawio.md`](drawio.md).
- Factual basis for the kymo column: this repository's [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]]). The kymo cell scores follow the shared general-tool kymo column used across `docs/softwares/*.comparision.md` so kymo is judged consistently.
- Edits should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds.

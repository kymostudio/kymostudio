---
title: Visual Paradigm vs. kymo — Comparison
document_id: REF-VISUAL-PARADIGM-CMP-001
version: "1.0"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream Visual Paradigm major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - REF-VISUAL-PARADIGM-001
  - BPD-DGM-001
authors:
  - Vũ Anh
language: en
keywords:
  - visual-paradigm
  - kymo
  - comparison
  - prior-art
  - multi-notation
  - round-trip-engineering
  - modeling-tool
upstream:
  project: Visual Paradigm
  homepage: https://www.visual-paradigm.com/
  developer_site: https://www.visual-paradigm.com/features/bpmn-tool/
  license: Commercial (per-edition); free non-commercial Community Edition
  access_date: 2026-05-20
---

# Visual Paradigm vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-VISUAL-PARADIGM-CMP-001                                   |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-21                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline    |
| Access Date       | 2026-05-20                                                     |
| Parent Reference  | [`visual-paradigm.md`](a.visual-paradigm.md)                    |
| Related Documents | `kymo-dsl/`, [`best-practices.md`](../diagrams/best-practices.md) |

This document isolates the **prior-art comparison** between [Visual Paradigm](https://www.visual-paradigm.com/) and kymo. The factual reference (editions, multi-notation support, round-trip engineering, BPMN conformance) lives in [`visual-paradigm.md`](a.visual-paradigm.md); read that first if you need ground truth on how Visual Paradigm actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream Visual Paradigm does not. VP and kymo are both **diagram-authoring tools**, but at opposite ends of a spectrum (a heavyweight multi-notation modelling toolset with round-trip engineering vs a lightweight single-purpose text DSL), so several axes below are not strictly like-for-like — read §2 and §4 before the scores.

## 1. At-a-glance matrix

| Axis | Visual Paradigm | kymo |
|------|-----------------|------|
| Primary purpose | Multi-notation + round-trip engineering | Render static architecture diagrams |
| Notations | BPMN, UML, ArchiMate, ERD … | kymo `.kymo` DSL |
| Authoring | WYSIWYG desktop/web, repository | Local text DSL |
| Code link | Round-trip model ↔ code | None |
| Cost/License | Commercial (+ free Community) | Apache-2.0, free |

## 2. Headline tradeoffs

### 2.1 Weight vs approachability — the defining spectrum

Visual Paradigm and kymo sit at opposite ends of one axis: capability-weight. VP is a heavyweight, multi-notation modelling toolset (BPMN, UML, ArchiMate, ERD, and more) with team collaboration, a model repository, and round-trip engineering between model and code, sold across an edition matrix (Modeler → Standard → Professional → Enterprise) plus a free non-commercial Community Edition. kymo is a lightweight, single-purpose text DSL that draws architecture diagrams and nothing else. VP wins on raw breadth and cross-discipline power; kymo wins on terseness, immediacy, and the things that flow from plain-text source. The right reading of every score below is "a full modelling toolset vs a focused tool" — they are not competing for the same job.

### 2.2 Guidance embedded with the tool

VP couples authoring with **teaching content** — much of the widely cited online BPMN tutorial material (gateway types, orchestration vs choreography) comes from VP's integrated guides. kymo's docs (`kymo-dsl/`, `best-practices.md`) play that role and benefit from staying close to the tool's actual behaviour, so guidance and implementation don't drift apart.

### 2.3 Round-trip thinking

VP's distinctive capability is **round-trip engineering**: a model and its source code kept in sync, each regenerable from the other. That is out of scope for kymo, but the *idea* — a representation regenerated rather than hand-maintained — directly supports kymo's discipline of keeping the `.kymo` source as the single source of truth and never hand-editing generated SVG. The principle is borrowable even though the feature is not.

### 2.4 Tiered editions vs one free tool

VP's commercial reach comes with an edition matrix and a Community-Edition carve-out for non-commercial use — a real source of complexity for users deciding what they're allowed to do. kymo's single Apache-2.0 surface avoids that entirely: one tool, one license, every use permitted. The lesson is that the simplicity of "one free tool" is itself a feature worth protecting against future tiering pressure.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension. Because Visual Paradigm is a WYSIWYG multi-notation modeller rather than a diagram-as-code language, the rubric is the **general-tool** adaptation of the five categories used in [`diagrams.mingrammer.comparision.md`](b.diagrams.mingrammer.comparision.md): A Authoring & Source, B Layout & Rendering, C Scope & Iconography, D Output & Interop, E Cost/Deployment & Ecosystem. The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats.** Scores for `kymo` reflect what is observable in this repo as of 2026-05-21 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the layout-tree + Figma/Excalidraw exporters) and are held **consistent across every general-tool comparison in `docs/softwares/`** so kymo is judged the same way each time. Scores for `Visual Paradigm` reflect the VP 17 line as documented at <https://www.visual-paradigm.com/> on 2026-05-20. The comparison is cross-model (heavyweight multi-notation modeller vs DSL), so the **Why** column is load-bearing — read it, not the bare number.

### 3.1 Category A — Authoring & Source

| # | Criterion | Visual Paradigm | kymo | Why |
|---|-----------|:------:|:----:|-----|
| A1 | Text / diff / git-friendliness of source | 3 | 9 | VP's model lives in a binary/repository format, not a diffable text file; kymo's `.kymo` is plain declarative text built for git. |
| A2 | Reproducibility & automation | 5 | 8 | VP has automation and round-trip code generation but diagrams are hand-built repository artefacts; kymo regenerates SVG/WebP from source, ideal for CI. |
| A3 | Approachability / learning curve | 5 | 6 | VP is a multi-notation toolset with embedded guidance to soften the ramp, but it is still a heavyweight app; kymo asks the user to learn a small DSL — narrower but quicker to start. |
| A4 | Grouping / container semantics | 8 | 7 | VP has rich cross-notation containment and packaging; kymo's typed `region` containers carry layout/styling meaning but no cross-diagram links. |
| | **Category total / 40** | **21** | **30** | **kymo +9** — text source and a gentle ramp vs VP's repository weight. |

### 3.2 Category B — Layout & Rendering

| # | Criterion | Visual Paradigm | kymo | Why |
|---|-----------|:------:|:----:|-----|
| B1 | Default layout quality | 6 | 8 | VP offers manual placement with auto-layout helpers across notations; kymo's first-party engine is tuned specifically for architecture diagrams. |
| B2 | User layout control | 8 | 8 | VP gives near-total manual control on the canvas; kymo's layout-tree DSL is expressive but computed, not hand-placed. A wash. |
| B3 | Edge / flow routing aesthetic | 6 | 10 | VP's connector routing is general-purpose and manually tweakable; kymo defaults to the H-V-H midpoint Z the team specified ([[feedback-kymo-edge-routing]]). |
| B4 | Styling / themes / animation | 6 | 6 | VP has rich per-element styling but no animation; kymo has animated SVG/WebP but no theme system. A wash from opposite ends. |
| | **Category total / 40** | **26** | **32** | **kymo +6** — owned routing + tuned auto-layout vs VP's general manual control. |

### 3.3 Category C — Scope & Iconography

| # | Criterion | Visual Paradigm | kymo | Why |
|---|-----------|:------:|:----:|-----|
| C1 | Scope / notation breadth | 9 | 4 | VP spans BPMN, UML, ArchiMate, ERD and more from one toolset; kymo draws architecture/block diagrams only. VP's breadth is its moat. |
| C2 | Icon / shape catalog | 7 | 5 | VP ships large standardised symbol sets across every notation it supports; kymo's file-backed `icons/` set is sizable but narrower and architecture-tuned. |
| | **Category total / 20** | **16** | **9** | **VP +7** — multi-notation breadth is the moat; an accumulation/scope gap, not one kymo should chase in-tree. |

### 3.4 Category D — Output & Interop

| # | Criterion | Visual Paradigm | kymo | Why |
|---|-----------|:------:|:----:|-----|
| D1 | Output-format breadth | 8 | 6 | VP emits images, documents, and structured reports across notations, plus generated code; kymo is SVG-first plus animated WebP and Figma/Excalidraw (no PNG/PDF yet). |
| D2 | Round-trip / data interchange | 7 | 5 | VP round-trips standard BPMN/UML/XMI and model↔code; kymo's exporters are one-way with no standard interchange format. |
| D3 | Embeddability / API | 6 | 6 | VP exposes APIs/plugins but is a desktop/web app; kymo is a Python module + JS port. A wash, different shapes. |
| | **Category total / 30** | **21** | **17** | **VP +4** — wider report/interchange surface plus round-trip code generation. |

### 3.5 Category E — Cost, Deployment & Ecosystem

| # | Criterion | Visual Paradigm | kymo | Why |
|---|-----------|:------:|:----:|-----|
| E1 | License, cost & self-host/offline | 4 | 9 | VP is commercial across an edition matrix (with a non-commercial Community Edition carve-out); kymo is Apache-2.0, free, and fully local with no licensing friction. |
| E2 | Community / maturity | 7 | 3 | VP is an established multi-notation toolset with broad adoption and widely cited tutorials; kymo is an early in-house tool. |
| | **Category total / 20** | **11** | **12** | **kymo +1** — kymo's free/open licensing narrowly outweighs VP's maturity. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `Visual Paradigm` | **95** | **6.33** | **63 %** |
| `kymo`    | **100** | **6.67** | **67 %** |
| Gap (kymo − VP) | 5 | 0.33 | 4 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | Visual Paradigm | kymo | Δ (kymo − VP) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — Authoring & Source        | 4 | 40 | 21 | 30 | **+9**  |
| B — Layout & Rendering        | 4 | 40 | 26 | 32 | **+6**  |
| C — Scope & Iconography       | 2 | 20 | 16 | 9  | **−7**  |
| D — Output & Interop          | 3 | 30 | 21 | 17 | **−4**  |
| E — Cost, Deployment & Ecosys | 2 | 20 | 11 | 12 | **+1**  |
| **Overall**                   | **15** | **150** | **95** | **100** | **+5** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Visual Paradigm` | 5.25 | 6.50 | 8.00 | 7.00 | 5.50 | **6.45** | **65 %** |
| `kymo`    | 7.50 | 8.00 | 4.50 | 5.67 | 6.00 | **6.33** | **63 %** |
| Gap | | | | | | 0.12 | **2 pp** |

**This is a flip.** Under equal-per-criterion (§3.6.1) kymo leads (6.67 vs 6.33, 67 % vs 63 %). Under equal-per-category the result *reverses*: VP edges ahead (6.45 vs 6.33). The mechanism is structural, not a scoring error: VP's standout strength — its multi-notation breadth (C) — sits in the **small** two-criterion category, so giving every category an equal one-fifth say **upweights** exactly where VP is strongest, while diluting kymo's big four-criterion authoring/layout wins (A, B) to the same one-fifth. Which number you trust depends on whether you think "scope & iconography" deserves as much say as "authoring" wholesale; for kymo's target user (an engineer in a repo) the per-criterion number (§3.6.1) is the honest one.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): kymo 6.67/10 vs VP 6.33/10 — a 0.33-point / 4-pp lead for kymo.** Under equal-per-category (§3.6.3) it flips — VP's notation breadth carries it just ahead.
- **Strategic shape.** kymo leads on what it *owns* (text source, layout/routing, free licensing); VP leads on what it *accumulates* (multi-notation breadth, round-trip engineering, broad adoption). Same asymmetry as every other comparison in this folder — invest in owned surface, borrow the rest.
- **Cheapest moves on the board:** keeping docs glued to tool behaviour (the embedded-guidance lesson) costs nothing; PNG/PDF export (D1, ≈ +2 since SVG/WebP already exist) is the low-cost output win.
- **Don't chase notation breadth (C1).** VP's "model everything across disciplines" is a different product. kymo's value is a tight architecture-diagram look from text — protect that, and resist the weight that comes with breadth.
- **Cross-model caveat:** A1 (diffability), A2 (reproducibility), and E1 (free/open) are where kymo's text source and license genuinely change the workflow; if your team works in a repo, weight A and E higher than the equal-weight headline implies.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo gains PNG/PDF output (D1) or its exporters become bidirectional (D2).
2. kymo's icon catalog or an arbitrary-asset escape hatch expands meaningfully (C2).
3. kymo gains a theme system (B4) or an interactive/embeddable target (D3).
4. kymo ships authoring aids — an LSP, formatter, or visual editor (would shift A3, E).
5. Upstream VP changes its edition matrix, licensing, round-trip surface, or notation breadth (C, D, E1).

## 4. Open questions for kymo

These follow from the comparison and the borrowable ideas catalogued in [`visual-paradigm.md`](a.visual-paradigm.md):

1. **How tightly should guidance track behaviour?** VP's strength is guidance embedded with the tool; kymo's `kymo-dsl/` and `best-practices.md` should stay close enough to implementation that they never drift into aspiration.
2. **Is "regenerated, not hand-maintained" enforced?** VP's round-trip thinking supports keeping `.kymo` the single source of truth — does anything in kymo's workflow tempt users to hand-edit generated SVG, and should that be guarded against?
3. **An icon escape hatch (arbitrary SVG/PNG by path)?** The recurring gap across every comparison in this folder; without it, every catalog miss reads as "kymo can't draw that".
4. **Is one free tool a protected invariant?** VP's edition matrix is the cautionary example; kymo's single Apache-2.0 surface is a simplicity asset — worth stating explicitly as a non-goal to tier it.

## 5. Provenance

- Comparison subject: Visual Paradigm (17 line, 2026) as documented at <https://www.visual-paradigm.com/> on 2026-05-20.
- Factual basis for the Visual Paradigm column: [`visual-paradigm.md`](a.visual-paradigm.md).
- Factual basis for the kymo column: this repository's `kymo-dsl/`, [`best-practices.md`](../diagrams/best-practices.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]]). The kymo cell scores follow the shared general-tool kymo column used across `docs/softwares/*.comparision.md` so kymo is judged consistently.
- Edits should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds.

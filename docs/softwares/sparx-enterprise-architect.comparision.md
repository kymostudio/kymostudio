---
title: Sparx Enterprise Architect vs. kymo — Comparison
document_id: REF-SPARX-EA-CMP-001
version: "1.0"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream Sparx Enterprise Architect major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - sparx-enterprise-architect.md
  - ../KYMO_DSL.md
  - ../BEST_PRACTICE_DIAGRAMS.md
authors:
  - Vũ Anh
language: en
keywords:
  - sparx-systems
  - enterprise-architect
  - kymo
  - comparison
  - prior-art
  - multi-notation
  - enterprise-modelling
upstream:
  project: Sparx Systems Enterprise Architect
  homepage: https://sparxsystems.com/
  developer_site: https://sparxsystems.com/platforms/business_process_modeling.html
  license: Commercial proprietary (per-seat editions)
  access_date: 2026-05-20
---

# Sparx Enterprise Architect vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-SPARX-EA-CMP-001                                          |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-21                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline    |
| Access Date       | 2026-05-20                                                     |
| Parent Reference  | [`sparx-enterprise-architect.md`](sparx-enterprise-architect.md) |
| Related Documents | [`KYMO_DSL.md`](../KYMO_DSL.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md) |

This document isolates the **prior-art comparison** between [Sparx Systems Enterprise Architect](https://sparxsystems.com/) and kymo. The factual reference (editions, repository model, multi-notation support, BPMN conformance) lives in [`sparx-enterprise-architect.md`](sparx-enterprise-architect.md); read that first if you need ground truth on how Enterprise Architect actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream Enterprise Architect does not. EA and kymo are both **diagram-authoring tools**, but at opposite ends of a spectrum (a heavyweight repository-based multi-notation enterprise modeller vs a lightweight single-purpose text DSL), so several axes below are not strictly like-for-like — read §2 and §4 before the scores.

## 1. At-a-glance matrix

| Axis | Enterprise Architect | kymo |
|------|----------------------|------|
| Primary purpose | Multi-notation enterprise/systems modelling | Render static architecture diagrams |
| Notations | UML, SysML, ArchiMate, BPMN | kymo `.kymo` DSL |
| Model | Shared repository, cross-model traceability | Single-file `.kymo` |
| Authoring | WYSIWYG desktop, repository | Local text DSL |
| Scope | Heavyweight, enterprise | Lightweight, single-purpose |
| Cost/License | Commercial per-seat | Apache-2.0, free |

## 2. Headline tradeoffs

### 2.1 Weight vs approachability — the defining spectrum

Enterprise Architect and kymo sit at opposite ends of one axis: capability-weight. EA is a heavyweight, repository-based, multi-notation modelling platform (UML, SysML, ArchiMate, BPMN) sold per seat to ~1,000,000+ users; it can model almost anything an enterprise architect needs, at the cost of a steep learning curve and a thick application. kymo is a lightweight, single-purpose text DSL that draws architecture diagrams and nothing else. EA wins on raw breadth and cross-notation power; kymo wins on terseness, immediacy, and the things that flow from plain-text source. The right reading of every score below is "an enterprise platform vs a focused tool" — they are not competing for the same job.

### 2.2 Traceability across many diagrams

EA's distinctive value is **traceability**: many diagrams over a shared underlying model, with links between elements across notations (a business process linked to the system and architecture models that realise it). kymo is single-file today — each `.kymo` stands alone. Even a lightweight notion of "the same component appears in diagram A and B" could help large doc sets stay consistent without adopting EA's full repository machinery.

### 2.3 A shared model behind many views

EA renders many diagram *types* from one repository — the model is the asset, the diagrams are views. kymo already has the right shape here: a clean `model.Diagram` is the asset, and additional renderers (Figma, Excalidraw today) are cheap views over it. EA is the proof that the model-as-asset bet pays off at scale, and a reminder to keep kymo's core model clean enough that new renderers stay cheap.

### 2.4 A caution on weight

EA shows the opposite end of the spectrum from kymo: enormous capability bought with approachability. The edition matrix (Professional → Corporate → Unified → Ultimate), the repository setup, and the multi-notation surface are all costs a new user pays before drawing anything. kymo's terseness — text in, diagram out, no setup — is a feature to protect, not a limitation to apologise for. The lesson is to resist scope creep that would erode it.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension. Because Enterprise Architect is a WYSIWYG repository-based modeller rather than a diagram-as-code language, the rubric is the **general-tool** adaptation of the five categories used in [`diagrams.mingrammer.comparision.md`](diagrams.mingrammer.comparision.md): A Authoring & Source, B Layout & Rendering, C Scope & Iconography, D Output & Interop, E Cost/Deployment & Ecosystem. The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats.** Scores for `kymo` reflect what is observable in this repo as of 2026-05-21 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the layout-tree + Figma/Excalidraw exporters) and are held **consistent across every general-tool comparison in `docs/softwares/`** so kymo is judged the same way each time. Scores for `Enterprise Architect` reflect the EA 16/17 line as documented at <https://sparxsystems.com/> on 2026-05-20. The comparison is cross-model (heavyweight repository modeller vs DSL), so the **Why** column is load-bearing — read it, not the bare number.

### 3.1 Category A — Authoring & Source

| # | Criterion | Enterprise Architect | kymo | Why |
|---|-----------|:------:|:----:|-----|
| A1 | Text / diff / git-friendliness of source | 3 | 9 | EA's model lives in a binary/database repository, not a diffable text file; kymo's `.kymo` is plain declarative text built for git. |
| A2 | Reproducibility & automation | 5 | 8 | EA has scripting/automation APIs but diagrams are hand-built repository artefacts; kymo regenerates SVG/WebP from source, ideal for CI. |
| A3 | Approachability / learning curve | 4 | 6 | EA is a heavyweight multi-notation platform with a steep ramp; kymo asks the user to learn a small DSL — narrower but far quicker to start. |
| A4 | Grouping / container semantics | 8 | 7 | EA has rich, traceable, cross-notation containment and packaging; kymo's typed `region` containers carry layout/styling meaning but no cross-diagram links. |
| | **Category total / 40** | **20** | **30** | **kymo +10** — text source and a gentle ramp vs EA's repository weight. |

### 3.2 Category B — Layout & Rendering

| # | Criterion | Enterprise Architect | kymo | Why |
|---|-----------|:------:|:----:|-----|
| B1 | Default layout quality | 6 | 8 | EA offers manual placement with auto-layout helpers across notations; kymo's first-party engine is tuned specifically for architecture diagrams. |
| B2 | User layout control | 8 | 8 | EA gives near-total manual control on the canvas; kymo's layout-tree DSL is expressive but computed, not hand-placed. A wash. |
| B3 | Edge / flow routing aesthetic | 6 | 10 | EA's connector routing is general-purpose and manually tweakable; kymo defaults to the H-V-H midpoint Z the team specified ([[feedback-kymo-edge-routing]]). |
| B4 | Styling / themes / animation | 6 | 6 | EA has rich per-element styling but no animation; kymo has animated SVG/WebP but no theme system. A wash from opposite ends. |
| | **Category total / 40** | **26** | **32** | **kymo +6** — owned routing + tuned auto-layout vs EA's general manual control. |

### 3.3 Category C — Scope & Iconography

| # | Criterion | Enterprise Architect | kymo | Why |
|---|-----------|:------:|:----:|-----|
| C1 | Scope / notation breadth | 9 | 4 | EA spans UML, SysML, ArchiMate, BPMN and more from one repository; kymo draws architecture/block diagrams only. EA's breadth is its moat. |
| C2 | Icon / shape catalog | 7 | 5 | EA ships large standardised symbol sets across every notation it supports; kymo's file-backed `icons/` set is sizable but narrower and architecture-tuned. |
| | **Category total / 20** | **16** | **9** | **EA +7** — multi-notation breadth is the moat; an accumulation/scope gap, not one kymo should chase in-tree. |

### 3.4 Category D — Output & Interop

| # | Criterion | Enterprise Architect | kymo | Why |
|---|-----------|:------:|:----:|-----|
| D1 | Output-format breadth | 8 | 6 | EA emits images, documents, and structured reports across notations; kymo is SVG-first plus animated WebP and Figma/Excalidraw (no PNG/PDF yet). |
| D2 | Round-trip / data interchange | 7 | 5 | EA round-trips standard BPMN/UML/XMI and links across models; kymo's exporters are one-way with no standard interchange format. |
| D3 | Embeddability / API | 6 | 6 | EA exposes an automation/scripting API but is a desktop app; kymo is a Python module + JS port. A wash, different shapes. |
| | **Category total / 30** | **21** | **17** | **EA +4** — wider report/interchange surface and cross-model XMI. |

### 3.5 Category E — Cost, Deployment & Ecosystem

| # | Criterion | Enterprise Architect | kymo | Why |
|---|-----------|:------:|:----:|-----|
| E1 | License, cost & self-host/offline | 3 | 9 | EA is commercial per-seat across an edition matrix; kymo is Apache-2.0, free, and fully local with no licensing friction. |
| E2 | Community / maturity | 7 | 3 | EA is an established platform with ~1,000,000+ users and decades of adoption; kymo is an early in-house tool. |
| | **Category total / 20** | **10** | **12** | **kymo +2** — kymo's free/open licensing outweighs EA's maturity here. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `Enterprise Architect` | **93** | **6.20** | **62 %** |
| `kymo`    | **100** | **6.67** | **67 %** |
| Gap (kymo − EA) | 7 | 0.47 | 5 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | Enterprise Architect | kymo | Δ (kymo − EA) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — Authoring & Source        | 4 | 40 | 20 | 30 | **+10** |
| B — Layout & Rendering        | 4 | 40 | 26 | 32 | **+6**  |
| C — Scope & Iconography       | 2 | 20 | 16 | 9  | **−7**  |
| D — Output & Interop          | 3 | 30 | 21 | 17 | **−4**  |
| E — Cost, Deployment & Ecosys | 2 | 20 | 10 | 12 | **+2**  |
| **Overall**                   | **15** | **150** | **93** | **100** | **+7** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Enterprise Architect` | 5.00 | 6.50 | 8.00 | 7.00 | 5.00 | **6.30** | **63 %** |
| `kymo`    | 7.50 | 8.00 | 4.50 | 5.67 | 6.00 | **6.33** | **63 %** |
| Gap | | | | | | 0.03 | **0 pp** |

**This is essentially a tie** (kymo +0.03, both round to 63 %), a near-reversal of the 5-pp per-criterion lead. The mechanism is structural: EA's standout strength — its multi-notation breadth (C) — sits in the **small** two-criterion category, so giving every category an equal one-fifth say **upweights** exactly where EA is strongest, while diluting kymo's big four-criterion authoring/layout wins (A, B). Which number you trust depends on whether you think "scope & iconography" deserves as much say as "authoring" wholesale; for kymo's target user (an engineer in a repo) the per-criterion number (§3.6.1) is the honest one.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): kymo 6.67/10 vs EA 6.20/10 — a 0.47-point / 5-pp lead for kymo.** Under equal-per-category (§3.6.3) it collapses to a tie — EA's notation breadth carries it back level.
- **Strategic shape.** kymo leads on what it *owns* (text source, layout/routing, free licensing); EA leads on what it *accumulates* (multi-notation breadth, decades of adoption). Same asymmetry as every other comparison in this folder — invest in owned surface, borrow the rest.
- **Cheapest moves on the board:** a cross-diagram "same component" notion (helps the traceability gap, A4) and PNG/PDF export (D1, ≈ +2 since SVG/WebP already exist) are the low-cost wins.
- **Don't chase notation breadth (C1).** EA's "model everything" is a different product. kymo's value is a tight architecture-diagram look from text — protect that, and resist the weight that comes with breadth.
- **Cross-model caveat:** A1 (diffability), A2 (reproducibility), and E1 (free/open) are where kymo's text source and license genuinely change the workflow; if your team works in a repo, weight A and E higher than the equal-weight headline implies.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo gains a cross-diagram "same component" / traceability notion (A4).
2. kymo gains PNG/PDF output (D1) or its exporters become bidirectional (D2).
3. kymo's icon catalog or an arbitrary-asset escape hatch expands meaningfully (C2).
4. kymo gains a theme system (B4) or an interactive/embeddable target (D3).
5. Upstream EA changes its edition matrix, licensing, or notation/interchange surface (C, D, E1).

## 4. Open questions for kymo

These follow from the comparison and the borrowable ideas catalogued in [`sparx-enterprise-architect.md`](sparx-enterprise-architect.md):

1. **A lightweight cross-diagram identity?** EA's traceability is heavyweight, but a minimal "the same component appears in diagram A and B" notion could keep large doc sets consistent without adopting a repository.
2. **How cheap can a new renderer stay?** EA renders many views from one model; kymo's `model.Diagram` is the asset — keeping it clean is what keeps Figma/Excalidraw/future exporters cheap.
3. **An icon escape hatch (arbitrary SVG/PNG by path)?** The recurring gap across every comparison in this folder; without it, every catalog miss reads as "kymo can't draw that".
4. **Where is the line on scope?** EA is the cautionary example of capability bought with approachability; kymo's terseness is the feature — which additions are worth the weight they add?

## 5. Provenance

- Comparison subject: Sparx Systems Enterprise Architect (16/17 line, 2026) as documented at <https://sparxsystems.com/> on 2026-05-20.
- Factual basis for the Enterprise Architect column: [`sparx-enterprise-architect.md`](sparx-enterprise-architect.md).
- Factual basis for the kymo column: this repository's [`KYMO_DSL.md`](../KYMO_DSL.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]]). The kymo cell scores follow the shared general-tool kymo column used across `docs/softwares/*.comparision.md` so kymo is judged consistently.
- Edits should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds.

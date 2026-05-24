---
title: Bizagi Modeler vs. kymo — Comparison
document_id: REF-BIZAGI-CMP-001
version: "1.0"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream Bizagi Modeler major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - bizagi.md
  - ../formats/kymo-dsl/README.md
  - ../BEST_PRACTICE_DIAGRAMS.md
authors:
  - Vũ Anh
language: en
keywords:
  - bizagi
  - bizagi-modeler
  - kymo
  - comparison
  - prior-art
  - bpmn
  - free-modeler
upstream:
  project: Bizagi Modeler
  homepage: https://www.bizagi.com/en/platform/modeler
  developer_site: https://help.bizagi.com/process-modeler/
  license: Free (proprietary freeware); broader Bizagi platform is commercial
  access_date: 2026-05-20
---

# Bizagi Modeler vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-BIZAGI-CMP-001                                            |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-21                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline    |
| Access Date       | 2026-05-20                                                     |
| Parent Reference  | [`bizagi.md`](bizagi.md)                                       |
| Related Documents | [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md) |

This document isolates the **prior-art comparison** between [Bizagi Modeler](https://www.bizagi.com/en/platform/modeler) and kymo. The factual reference (editions, capabilities, BPMN support, documentation export) lives in [`bizagi.md`](bizagi.md); read that first if you need ground truth on how Bizagi Modeler actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream Bizagi Modeler does not. Bizagi and kymo are both **diagram-authoring tools**, but with different authoring models (a free WYSIWYG BPMN desktop editor vs a text DSL), so several axes below are not strictly like-for-like — read §2 and §4 before the scores.

## 1. At-a-glance matrix

| Axis | Bizagi Modeler | kymo |
|------|----------------|------|
| Primary purpose | Free BPMN modelling + documentation | Render static architecture diagrams |
| Notation | BPMN 2.0 | kymo `.kymo` DSL |
| Authoring | WYSIWYG desktop editor | Local text DSL |
| Standout feature | One-click process documentation export | Animated SVG / WebP output |
| License/Cost | Free (freeware); commercial upsell platform | Apache-2.0, free |

## 2. Headline tradeoffs

### 2.1 WYSIWYG BPMN editor vs text source

Bizagi Modeler is a polished desktop canvas: you place BPMN symbols by hand and the model records *positions and properties*, not regenerable intent. kymo is a text DSL: the `.kymo` source records *intent* and the layout engine computes positions. Bizagi wins approachability (no syntax, full descriptive/analytical palette, genuinely free) and fine-grained manual control; kymo wins everything that flows from plain-text source — diffs, code review, git history, regenerate-from-source automation. Neither is "better"; they serve different workflows (a process analyst at a canvas vs an engineer in a repo).

### 2.2 Documentation as a first-class output

Bizagi's standout is one-click **documentation export** — Word/PDF/web spec generated directly from the model. That treats the diagram as a source for a *structured description*, not just a picture. kymo today emits the picture (SVG/WebP) but no companion description. This is the most directly borrowable idea below (§4): a structured dump of components, edges, and regions alongside the SVG would serve accessibility and review.

### 2.3 Free tool as an on-ramp

Bizagi Modeler is proprietary freeware with no time limit or user cap — a frictionless free core that funnels users toward the commercial Bizagi automation platform. The lesson for an Apache-2.0 project is subtler than the funnel itself: a frictionless free core *is* the audience-building mechanism, and kymo already has that property without the upsell.

### 2.4 Symbols without execution — a shared honesty

Bizagi Modeler draws BPMN and can simulate, but execution lives in the separate (commercial) Bizagi platform; the Modeler itself is a modelling/documentation tool. kymo is likewise a *visual* tool — it renders architecture diagrams, it does not validate or execute an architecture. Both are honest about that boundary, and kymo's docs should keep it so.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension. Because Bizagi Modeler is a WYSIWYG editor rather than a diagram-as-code language, the rubric is the **general-tool** adaptation of the five categories used in [`diagrams.mingrammer.comparision.md`](diagrams.mingrammer.comparision.md): A Authoring & Source, B Layout & Rendering, C Scope & Iconography, D Output & Interop, E Cost/Deployment & Ecosystem. The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats.** Scores for `kymo` reflect what is observable in this repo as of 2026-05-21 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the layout-tree + Figma/Excalidraw exporters) and are held **consistent across every general-tool comparison in `docs/softwares/`** so kymo is judged the same way each time. Scores for `Bizagi Modeler` reflect the desktop product as documented at <https://www.bizagi.com/en/platform/modeler> on 2026-05-20. The comparison is cross-model (canvas vs DSL), so the **Why** column is load-bearing — read it, not the bare number.

### 3.1 Category A — Authoring & Source

| # | Criterion | Bizagi Modeler | kymo | Why |
|---|-----------|:------:|:----:|-----|
| A1 | Text / diff / git-friendliness of source | 3 | 9 | Bizagi's model file is a binary/structured artefact tied to the editor — not meaningfully diffable or reviewable; kymo's `.kymo` is plain declarative text built for git. |
| A2 | Reproducibility & automation | 4 | 8 | Bizagi diagrams are hand-drawn artefacts (BPMN XML export aside); kymo regenerates SVG/WebP from source, ideal for CI. |
| A3 | Approachability / learning curve | 9 | 6 | Bizagi is drag-and-drop with a guided BPMN palette and zero syntax; kymo asks the user to learn a small DSL. |
| A4 | Grouping / container semantics | 7 | 7 | Bizagi's pools/lanes/sub-processes carry standardised BPMN semantics; kymo's typed `region` containers carry layout/styling meaning. A wash on expressiveness, different vocabularies. |
| | **Category total / 40** | **23** | **30** | **kymo +7** — everything that flows from plain-text source. |

### 3.2 Category B — Layout & Rendering

| # | Criterion | Bizagi Modeler | kymo | Why |
|---|-----------|:------:|:----:|-----|
| B1 | Default layout quality | 6 | 8 | Bizagi defaults to manual placement with light snapping; kymo's first-party engine is tuned for architecture diagrams. |
| B2 | User layout control | 8 | 8 | Bizagi gives near-total manual control on the canvas; kymo's layout-tree DSL is expressive but computed, not hand-placed. A wash. |
| B3 | Edge / flow routing aesthetic | 7 | 10 | Bizagi's sequence-flow routing is clean and manually tweakable; kymo defaults to the H-V-H midpoint Z the team specified ([[feedback-kymo-edge-routing]]). |
| B4 | Styling / themes / animation | 6 | 6 | Bizagi has standardised BPMN styling but no animation; kymo has animated SVG/WebP but no theme system. A wash from opposite ends. |
| | **Category total / 40** | **27** | **32** | **kymo +5** — owned routing + auto-layout vs Bizagi's manual control. |

### 3.3 Category C — Scope & Iconography

| # | Criterion | Bizagi Modeler | kymo | Why |
|---|-----------|:------:|:----:|-----|
| C1 | Scope / notation breadth | 5 | 4 | Bizagi covers the full BPMN 2.0 notation but only BPMN; kymo draws architecture/block diagrams only. Both are single-purpose, narrow tools. |
| C2 | Icon / shape catalog | 5 | 5 | Bizagi ships the complete BPMN symbol set (events/gateways/tasks); kymo's file-backed `icons/` set is architecture-tuned. Comparable breadth in their respective domains. |
| | **Category total / 20** | **10** | **9** | **Bizagi +1** — a near-tie; both are narrow by design, just aimed at different notations. |

### 3.4 Category D — Output & Interop

| # | Criterion | Bizagi Modeler | kymo | Why |
|---|-----------|:------:|:----:|-----|
| D1 | Output-format breadth | 7 | 6 | Bizagi emits images plus Word/PDF/web documentation; kymo is SVG-first plus animated WebP and Figma/Excalidraw (no PNG/PDF yet). |
| D2 | Round-trip / data interchange | 6 | 5 | Bizagi round-trips standard BPMN 2.0 XML to engines/other tools; kymo's exporters are one-way and there is no standard interchange format. |
| D3 | Embeddability / API | 4 | 6 | Bizagi Modeler is a desktop app with limited embedding; kymo is a Python module + JS port consumable in pipelines. |
| | **Category total / 30** | **17** | **17** | **tie** — Bizagi's BPMN-XML interchange offsets kymo's library embeddability. |

### 3.5 Category E — Cost, Deployment & Ecosystem

| # | Criterion | Bizagi Modeler | kymo | Why |
|---|-----------|:------:|:----:|-----|
| E1 | License, cost & self-host/offline | 6 | 9 | Bizagi Modeler is free freeware and runs offline, but it is proprietary and funnels to a commercial platform; kymo is Apache-2.0, fully local, with no upsell. |
| E2 | Community / maturity | 7 | 3 | Bizagi is a mature, widely used BPMN training/documentation tool; kymo is an early in-house tool. |
| | **Category total / 20** | **13** | **12** | **Bizagi +1** — maturity edges out kymo's licensing strength. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `Bizagi Modeler` | **90** | **6.00** | **60 %** |
| `kymo`    | **100** | **6.67** | **67 %** |
| Gap (kymo − Bizagi) | 10 | 0.67 | 7 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | Bizagi | kymo | Δ (kymo − Bizagi) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — Authoring & Source        | 4 | 40 | 23 | 30 | **+7**  |
| B — Layout & Rendering        | 4 | 40 | 27 | 32 | **+5**  |
| C — Scope & Iconography       | 2 | 20 | 10 | 9  | **−1**  |
| D — Output & Interop          | 3 | 30 | 17 | 17 | **0**   |
| E — Cost, Deployment & Ecosys | 2 | 20 | 13 | 12 | **−1**  |
| **Overall**                   | **15** | **150** | **90** | **100** | **+10** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Bizagi Modeler` | 5.75 | 6.75 | 5.00 | 5.67 | 6.50 | **5.93** | **59 %** |
| `kymo`    | 7.50 | 8.00 | 4.50 | 5.67 | 6.00 | **6.33** | **63 %** |
| Gap | | | | | | 0.40 | **4 pp** |

Equal-per-category *narrows* the gap slightly (7 pp → 4 pp): Bizagi's relative strengths (C, E) sit in small categories that get upweighted, while kymo's big authoring lead (A) is diluted to one-fifth. kymo still leads either way. For kymo's target user (an engineer in a repo) the per-criterion number (§3.6.1) is the honest one.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): kymo 6.67/10 vs Bizagi 6.00/10 — a 0.67-point / 7-pp lead for kymo.** kymo's authoring-model wins (A, B) outweigh Bizagi's slim edges in catalog and maturity (C, E).
- **Strategic shape.** kymo leads on what it *owns* (text source, layout/routing); Bizagi leads narrowly on what it *accumulates* (BPMN training maturity). Same asymmetry as every other comparison in this folder — invest in owned surface, borrow the rest.
- **Cheapest moves on the board:** a structured-description emit (helps D, accessibility) is the standout Bizagi-inspired idea; PNG/PDF export (D1, ≈ +1) is low-cost since SVG/WebP already exist.
- **Don't chase BPMN scope (C1).** Bizagi's full BPMN palette is a different product. kymo's value is a tight architecture-diagram look from text — protect that.
- **Cross-model caveat:** A1 (diffability) and A2 (reproducibility) are where kymo's text source genuinely changes the workflow; if your team works in a repo, weight A higher than the equal-weight headline implies.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo gains PNG/PDF output (D1) or a structured-description emit (D, accessibility).
2. kymo's icon catalog or an arbitrary-asset escape hatch expands meaningfully (C2).
3. kymo gains a theme system (B4) or an interactive/embeddable target (D3).
4. kymo ships authoring aids — an LSP, formatter, or visual editor (would shift A3, E).
5. Upstream Bizagi changes its Modeler licensing, documentation export, or BPMN-XML interchange (D, E1).

## 4. Open questions for kymo

These follow from the comparison and the borrowable ideas catalogued in [`bizagi.md`](bizagi.md):

1. **A structured description alongside the SVG?** Bizagi's documentation export shows the value of treating the model as a source for a written spec; kymo could emit a component/edge/region listing for accessibility and review without leaving the `.kymo` source.
2. **What is the right "frictionless free core" story?** Bizagi's freeware funnels to a paid platform; kymo's Apache-2.0 core has no upsell, so the audience-building benefit must come from the docs and the exporter ergonomics, not a funnel.
3. **An icon escape hatch (arbitrary SVG/PNG by path)?** The recurring gap across every comparison in this folder; without it, every catalog miss reads as "kymo can't draw that".
4. **How explicit should the "visual, not executed" boundary be?** Bizagi keeps modelling and execution in separate products; kymo's docs should keep the visual-only boundary honest so a clean picture isn't mistaken for a checked architecture.

## 5. Provenance

- Comparison subject: Bizagi Modeler (desktop, 2026) as documented at <https://www.bizagi.com/en/platform/modeler> on 2026-05-20.
- Factual basis for the Bizagi column: [`bizagi.md`](bizagi.md).
- Factual basis for the kymo column: this repository's [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]]). The kymo cell scores follow the shared general-tool kymo column used across `docs/softwares/*.comparision.md` so kymo is judged consistently.
- Edits should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds.

---
title: SAP Signavio vs. kymo — Comparison
document_id: REF-SIGNAVIO-CMP-001
version: "1.0"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream SAP Signavio major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - signavio.md
  - ../formats/kymo-dsl/README.md
  - ../diagrams/best-practices.md
authors:
  - Vũ Anh
language: en
keywords:
  - signavio
  - sap
  - kymo
  - comparison
  - prior-art
  - process-management
  - cross-category
upstream:
  project: SAP Signavio (Process Manager / Modeler)
  homepage: https://www.signavio.com/
  developer_site: https://help.sap.com/docs/signavio-process-manager
  license: Commercial SaaS (30-day trial)
  access_date: 2026-05-20
---

# SAP Signavio vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-SIGNAVIO-CMP-001                                          |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-21                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline    |
| Access Date       | 2026-05-20                                                     |
| Parent Reference  | [`signavio.md`](signavio.md)                                 |
| Related Documents | [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`best-practices.md`](../diagrams/best-practices.md) |

This document isolates the **prior-art comparison** between [SAP Signavio](https://www.signavio.com/) and kymo. The factual reference (editions, capabilities beyond drawing, BPMN conformance) lives in [`signavio.md`](signavio.md); read that first if you need ground truth on how Signavio actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream Signavio does not. Signavio is an enterprise **process-management suite** (modelling + governance + simulation + mining), not a diagram renderer — so this is a **cross-category** comparison and the numbers below must be read with the caveat in §2.1 and §3 firmly in mind. Read §2 and §4 before the scores.

## 1. At-a-glance matrix

| Axis | SAP Signavio | kymo |
|------|--------------|------|
| Primary purpose | Enterprise process modelling, governance, mining | Render static architecture diagrams |
| Notation | BPMN 2.0 + EPC + DMN | kymo `.kymo` DSL |
| Authoring | Browser, collaborative, governed repository | Local text DSL, single-file |
| Deployment | Commercial SaaS | Local CLI / library |
| Extras | Simulation, mining, approvals | None — rendering only |
| License / cost | Commercial subscription | Apache-2.0, free |

## 2. Headline tradeoffs

### 2.1 Different category — read this first

Signavio and kymo are **not in the same product category**, and the §3 matrix should not be read as "kymo beats Signavio". Signavio is an enterprise process-governance suite: it models BPMN 2.0 / EPC / DMN, governs a shared repository with review and release workflows, **simulates** processes to estimate cost/time/resource, and **mines** event logs to compare modelled "to-be" against observed "as-is". kymo renders static architecture diagrams from a text DSL. The scoring matrix views Signavio *through kymo's diagram-rendering + authoring lens* — and a high kymo number on that lens does **not** mean kymo is "better than" Signavio. It means kymo is a better fit for *kymo's job*. Almost all of Signavio's value — governance, simulation, mining — lives in dimensions this matrix does not even have columns for. The real signal is in §2 and §4, not the headline number.

### 2.2 Governed repository vs local text source

Signavio is a browser-based, collaborative, **governed** repository: processes live in a shared store with review workflows, approval/release states, and a dictionary of reusable elements. kymo is a local text DSL: the `.kymo` source records *intent*, the layout engine computes positions, and a single author commits it to a repo. kymo wins everything that flows from plain-text source — diffs, code review, git history, regenerate-from-source automation — but Signavio's governance layer (release states, approvals, shared dictionary) is something kymo only gestures at via the frontmatter `status:` field. These are different disciplines at very different scales.

### 2.3 A dictionary of reusable elements

Signavio's shared element dictionary lets a modelled element be defined once and reused across processes. That echoes a long-standing wish on the kymo side: **shared component definitions across `samples/`** to reduce duplication, so a `hex-agent` or a named subsystem is defined once and referenced rather than re-declared per diagram. The dictionary is a clean precedent for what that could look like.

### 2.4 The model is more valuable when it can be analysed

Signavio's simulation and mining only work because the process model is **structured data**, not just a picture. kymo's diagrams are visual, but keeping the underlying model clean leaves room for analyses — the cheapest being a linter for disconnected nodes, dangling edges, or unreachable regions. The lesson is not "kymo should simulate"; it is "a clean structured model is what *enables* any future analysis at all".

### 2.5 Governance states (draft/released)

Signavio shows how far a release-state discipline can be taken: draft → review → approved → released, with the repository enforcing transitions. kymo's frontmatter `status:` field already gestures at this lightweight version of the same idea. It is a reminder that diagram artefacts, like documents, have a lifecycle worth modelling — even if kymo only ever does the lightweight version.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension. Because Signavio is an enterprise process-management suite rather than a diagram-as-code language, the rubric is the **general-tool** adaptation of the five categories used in [`diagrams.mingrammer.comparision.md`](diagrams.mingrammer.comparision.md): A Authoring & Source, B Layout & Rendering, C Scope & Iconography, D Output & Interop, E Cost/Deployment & Ecosystem. The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats — cross-category.** This is the most important caveat in any comparison in this folder: the matrix grades Signavio **only on kymo's diagram-rendering + authoring lens**, which is a narrow slice of what Signavio does. A high kymo number (or a large "kymo +N" gap) **does not** mean kymo replaces Signavio — they are different categories: Signavio governs, simulates, and mines processes at enterprise scale; kymo only renders diagrams. The headline gap reflects kymo's lens, not relative product value. Scores for `kymo` reflect what is observable in this repo as of 2026-05-21 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the layout-tree + Figma/Excalidraw exporters) and are held **consistent across every general-tool comparison in `docs/softwares/`**. Scores for `Signavio` reflect the SAP Signavio cloud product as documented in [`signavio.md`](signavio.md) on 2026-05-20. The **Why** column is load-bearing — read it, not the bare number.

### 3.1 Category A — Authoring & Source

| # | Criterion | Signavio | kymo | Why |
|---|-----------|:--------:|:----:|-----|
| A1 | Text / diff / git-friendliness of source | 3 | 9 | Signavio stores models in a governed cloud repository — not diffable or reviewable as text; kymo's `.kymo` is plain declarative text built for git. |
| A2 | Reproducibility & automation | 5 | 8 | Signavio exports BPMN 2.0 XML and has APIs, but models are authored in a browser; kymo regenerates SVG/WebP from source, ideal for CI. |
| A3 | Approachability / learning curve | 6 | 6 | Signavio is collaborative and browser-based but carries enterprise BPMN/governance complexity; kymo asks the user to learn a small DSL — a wash. |
| A4 | Grouping / container semantics | 7 | 7 | Signavio has BPMN pools/lanes/sub-processes with rich semantics; kymo's typed `region` containers carry layout/styling meaning — a wash. |
| | **Category total / 40** | **21** | **30** | **kymo +9** — everything that flows from plain-text source (read the cross-category caveat). |

### 3.2 Category B — Layout & Rendering

| # | Criterion | Signavio | kymo | Why |
|---|-----------|:--------:|:----:|-----|
| B1 | Default layout quality | 6 | 8 | Signavio's BPMN layout is competent but largely manual placement on a canvas; kymo's first-party engine is tuned for architecture diagrams. |
| B2 | User layout control | 7 | 8 | Signavio gives manual BPMN canvas control; kymo's layout-tree DSL is expressive but computed, not hand-placed. |
| B3 | Edge / flow routing aesthetic | 6 | 10 | Signavio's sequence-flow routing follows BPMN conventions; kymo defaults to the H-V-H midpoint Z the team specified ([[feedback-kymo-edge-routing]]). |
| B4 | Styling / themes / animation | 5 | 6 | Signavio's styling is constrained by BPMN notation rules and has no animation; kymo has animated SVG/WebP (but no theme system), edging it out. |
| | **Category total / 40** | **24** | **32** | **kymo +8** — owned routing + tuned auto-layout (within kymo's narrow lens). |

### 3.3 Category C — Scope & Iconography

| # | Criterion | Signavio | kymo | Why |
|---|-----------|:--------:|:----:|-----|
| C1 | Scope / notation breadth | 7 | 4 | Signavio covers BPMN 2.0 + EPC + DMN with full conformance; kymo draws architecture/block diagrams only. Signavio is deep in process notation but not "draw anything". |
| C2 | Icon / shape catalog | 5 | 5 | Signavio's catalog is the standardised BPMN/EPC/DMN symbol set (deep, not broad); kymo's file-backed `icons/` set is architecture-tuned — a wash. |
| | **Category total / 20** | **12** | **9** | **Signavio +3** — process-notation depth; narrowest of the category gaps. |

### 3.4 Category D — Output & Interop

| # | Criterion | Signavio | kymo | Why |
|---|-----------|:--------:|:----:|-----|
| D1 | Output-format breadth | 7 | 6 | Signavio exports BPMN 2.0 XML, PDF, and images; kymo is SVG-first plus animated WebP and Figma/Excalidraw (no PNG/PDF yet). |
| D2 | Round-trip / data interchange | 7 | 5 | Signavio's standard BPMN 2.0 XML round-trips with engines and other modellers — a real interchange story; kymo's exporters are one-way with no standard format. |
| D3 | Embeddability / API | 6 | 6 | Signavio has enterprise integration APIs and SAP-suite hooks; kymo is a Python module + JS port (no service/API) — a wash. |
| | **Category total / 30** | **20** | **17** | **Signavio +3** — standard BPMN-XML interchange is its genuine output strength. |

### 3.5 Category E — Cost, Deployment & Ecosystem

| # | Criterion | Signavio | kymo | Why |
|---|-----------|:--------:|:----:|-----|
| E1 | License, cost & self-host/offline | 2 | 9 | Signavio is commercial enterprise SaaS (30-day trial only), cloud-only, no self-host/offline; kymo is Apache-2.0 and fully local/offline. |
| E2 | Community / maturity | 7 | 3 | Signavio is a mature, SAP-backed enterprise platform with a large install base; kymo is an early in-house tool. |
| | **Category total / 20** | **9** | **12** | **kymo +3** — kymo's licensing/offline strength outweighs Signavio's enterprise maturity *on this axis* (not on capability). |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `Signavio` | **86**  | **5.73** | **57 %** |
| `kymo`     | **100** | **6.67** | **67 %** |
| Gap (kymo − Signavio) | 14 | 0.93 | 10 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | Signavio | kymo | Δ (kymo − Signavio) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — Authoring & Source        | 4 | 40 | 21 | 30 | **+9**  |
| B — Layout & Rendering        | 4 | 40 | 24 | 32 | **+8**  |
| C — Scope & Iconography       | 2 | 20 | 12 | 9  | **−3**  |
| D — Output & Interop          | 3 | 30 | 20 | 17 | **−3**  |
| E — Cost, Deployment & Ecosys | 2 | 20 | 9  | 12 | **+3**  |
| **Overall**                   | **15** | **150** | **86** | **100** | **+14** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Signavio` | 5.25 | 6.00 | 6.00 | 6.67 | 4.50 | **5.68** | **57 %** |
| `kymo`     | 7.50 | 8.00 | 4.50 | 5.67 | 6.00 | **6.33** | **63 %** |
| Gap | | | | | | 0.65 | **7 pp** |

Equal-per-category **narrows** the gap slightly (10 pp → 7 pp) because Signavio's relatively stronger small categories (C scope/notation, D interop) get the same say as the larger ones where kymo leads. But the **cross-category caveat dominates either reading**: the headline gap reflects kymo's diagram/authoring lens, not that kymo replaces an enterprise process-governance suite. Neither number is a verdict on relative product value.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): kymo 6.67/10 vs Signavio 5.73/10 — a 0.93-point / 10-pp gap.** But this is the most misleading headline in the folder: it scores a process-governance suite on a diagram-rendering lens. **It does not mean kymo replaces Signavio.**
- **Strategic shape.** kymo leads on what it *owns* (text source, layout/routing) and on licensing/offline; Signavio leads on process-notation depth (C) and standard BPMN-XML interchange (D). Most of Signavio's actual value — governance, simulation, mining — is off this matrix entirely.
- **Cross-category caveat (the real point).** Signavio governs, simulates, and mines processes at enterprise scale; kymo renders diagrams. A "kymo +14" gap is an artefact of the lens, not evidence that kymo competes with — let alone beats — Signavio. The borrowable ideas in §4 are the genuine takeaway.
- **Cheapest moves on the board:** a model-cleanliness linter (disconnected nodes/dangling edges) leans into the "structured model enables analysis" lesson; PNG/PDF export (D1) is low-cost since SVG/WebP already exist.
- **Don't chase scope or governance breadth.** Signavio's process-governance suite is a different product at a different price point. kymo's value is a tight, finished architecture-diagram look from git-friendly text — protect that.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo gains PNG/PDF output (D1) or its exporters become bidirectional / gain a standard interchange format (D2).
2. kymo's icon catalog or an arbitrary-asset escape hatch expands meaningfully (C2).
3. kymo gains a shared component dictionary across `samples/` or a model linter (A4, A2).
4. kymo formalises governance/release states beyond the frontmatter `status:` field (A, E).
5. Upstream Signavio changes its modelling notations, interchange formats, or pricing/licensing (C, D, E1).

## 4. Open questions for kymo

These follow from the comparison and the borrowable ideas catalogued in [`signavio.md`](signavio.md):

1. **A shared dictionary of reusable elements across `samples/`?** Signavio's element dictionary is a clean precedent for defining a component (a `hex-agent`, a named subsystem) once and referencing it, rather than re-declaring it per diagram.
2. **What analyses does a clean structured model unlock?** Signavio's simulation/mining work because the model is structured data. kymo won't simulate, but a linter for disconnected nodes, dangling edges, or unreachable regions is the low-cost first step in the same spirit.
3. **How far should governance/release states go?** The frontmatter `status:` field already gestures at draft/released; Signavio shows how far a release-state discipline can be taken — worth deciding how lightweight kymo wants to keep it.
4. **How explicit should the "diagram, not governed model" boundary be?** Signavio is the clearest reminder that a rendered diagram is not a governed, analysable process model; kymo's docs should keep that boundary honest.

## 5. Provenance

- Comparison subject: SAP Signavio cloud as documented in [`signavio.md`](signavio.md) on 2026-05-20.
- Factual basis for the Signavio column: [`signavio.md`](signavio.md).
- Factual basis for the kymo column: this repository's [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`best-practices.md`](../diagrams/best-practices.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]] at B3). The kymo cell scores follow the shared general-tool kymo column used across `docs/softwares/*.comparision.md` so kymo is judged consistently.
- This is a **cross-category** comparison: the matrix views an enterprise process-governance suite through kymo's diagram-rendering + authoring lens. Edits should restate that caveat and the underlying tradeoff, not just the conclusion — a future reader needs the *why* to avoid mistaking a lens artefact for a verdict.

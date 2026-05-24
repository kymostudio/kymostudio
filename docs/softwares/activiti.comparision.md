---
title: Activiti vs. kymo — Comparison
document_id: REF-ACTIVITI-CMP-001
version: "1.0"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream Activiti major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - activiti.md
  - ../KYMO_DSL.md
  - ../BEST_PRACTICE_DIAGRAMS.md
authors:
  - Vũ Anh
language: en
keywords:
  - activiti
  - bpmn-engine
  - kymo
  - comparison
  - prior-art
  - process-execution
  - diagram-as-code
upstream:
  project: Activiti
  homepage: https://www.activiti.org/
  repository: https://github.com/Activiti/Activiti
  license: Apache-2.0
  access_date: 2026-05-20
---

# Activiti vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-ACTIVITI-CMP-001                                          |
| Version           | 1.0                                                           |
| Issue Date        | 2026-05-21                                                    |
| Status            | Released                                                      |
| Classification    | Internal                                                      |
| Owner             | `diagrams/` project                                          |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline   |
| Access Date       | 2026-05-20                                                    |
| Parent Reference  | [`activiti.md`](activiti.md)                                 |
| Related Documents | [`KYMO_DSL.md`](../KYMO_DSL.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md) |

This document isolates the **prior-art comparison** between [Activiti](https://www.activiti.org/) and kymo. The factual reference (lineage, architecture, BPMN conformance) lives in [`activiti.md`](activiti.md); read that first if you need ground truth on how Activiti actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream Activiti does not. Note up front that Activiti and kymo are in **different categories** — Activiti *executes* BPMN processes; kymo *renders* static diagrams — so most axes below are not strictly like-for-like; read §2 and §4 before the scores.

## 1. At-a-glance matrix

| Axis | Activiti | kymo |
|------|----------|------|
| Primary purpose | Lightweight BPMN **execution** engine | Render static architecture diagrams |
| Notation | BPMN 2.0 | kymo `.kymo` DSL |
| Implementation | Java | Python renderer + JS data-model port |
| Semantics | Full execution semantics | None — visual only |
| Output | Running process instances, audit history | SVG / animated SVG / WebP |
| Historical role | Ancestor of Camunda & Flowable | — |
| License | Apache-2.0 | Apache-2.0 |

## 2. Headline tradeoffs

### 2.1 Different category: execution vs rendering

Activiti is a **process-execution engine**: a BPMN 2.0 model is deployed and *run* — tasks dispatch to workers, gateways route tokens, the engine tracks each live instance and its audit history. kymo is a **diagram renderer**: a `.kymo` source compiles to an SVG and nothing executes. They are not competitors on a single axis; they sit in different product categories that happen to share the word "BPMN" only because Activiti's notation is sometimes drawn before it is run. Everything below scores Activiti *through kymo's diagram-rendering-and-authoring lens*, which deliberately ignores the entire half of Activiti — execution — that is its actual reason to exist. Keep that asymmetry in mind: the matrix measures overlap on visualisation/authoring, not which tool is "better".

### 2.2 "Lightweight and embeddable" is a durable value

Activiti's original pitch — a small engine you embed rather than a platform you adopt — has aged well; the fork tree it spawned (Camunda, Flowable) inherited the same instinct. kymo's small-surface library/CLI shares that spirit: it is something you import or invoke, not a service you stand up. The lesson is to protect that smallness — resist turning kymo's renderer into a platform when a library is what the value rests on.

### 2.3 A standard interchange is what enabled the ecosystem

The whole Activiti→Camunda/Flowable lineage only works because **BPMN 2.0 XML is standardised**: a model authored against one engine is legible to the others. kymo has no such interchange today — its `.kymo` source is the only representation and the exporters are one-way. This is the strongest argument for kymo eventually documenting a stable model/serialisation if third-party tooling is ever wanted: a healthy data format is the precondition for an ecosystem, and Activiti's fork history is the proof.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension. Because Activiti is a process-execution engine rather than a diagram-as-code language, the rubric is the **general-tool** adaptation of the five categories used in [`diagrams.mingrammer.comparision.md`](diagrams.mingrammer.comparision.md): A Authoring & Source, B Layout & Rendering, C Scope & Iconography, D Output & Interop, E Cost/Deployment & Ecosystem. The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats.** This matrix views a process-**execution** engine through kymo's diagram-**rendering**-and-authoring lens, so a high kymo number does **not** mean kymo is "better than" Activiti — they are different categories (Activiti executes BPMN processes with full token semantics; kymo only renders static diagrams and cannot execute anything). The single number reflects overlap on visualisation/authoring only; the real signal is §2 and §4, where Activiti's notation/interchange/execution strengths live (which kymo lacks). Scores for `kymo` reflect what is observable in this repo as of 2026-05-21 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the layout-tree + Figma/Excalidraw exporters) and are held **consistent across every general-tool comparison in `docs/softwares/`** so kymo is judged the same way each time. Scores for `Activiti` reflect Activiti 7.x / Activiti Cloud as documented at <https://www.activiti.org/> on 2026-05-20. The comparison is cross-category, so the **Why** column is load-bearing — read it, not the bare number.

### 3.1 Category A — Authoring & Source

| # | Criterion | Activiti | kymo | Why |
|---|-----------|:-------:|:----:|-----|
| A1 | Text / diff / git-friendliness of source | 4 | 9 | Activiti's source is BPMN XML — diffable in principle but coordinate-heavy DI noise and tool-generated layout make review painful; kymo's `.kymo` is plain declarative text built for git. |
| A2 | Reproducibility & automation | 6 | 8 | Activiti deployments are scriptable and the model is data, but the artefact is a running process, not a regenerable picture; kymo regenerates SVG/WebP from source, ideal for CI. |
| A3 | Approachability / learning curve | 5 | 6 | Activiti asks the user to learn BPMN execution semantics and a Java/Spring runtime; kymo asks for a small DSL only. |
| A4 | Grouping / container semantics | 7 | 7 | Activiti's pools/lanes/sub-processes carry execution meaning; kymo's typed `region` containers carry layout/styling meaning — different purposes, comparable expressiveness. |
| | **Category total / 40** | **22** | **30** | **kymo +8** — everything that flows from plain-text source. |

### 3.2 Category B — Layout & Rendering

| # | Criterion | Activiti | kymo | Why |
|---|-----------|:-------:|:----:|-----|
| B1 | Default layout quality | 5 | 8 | Activiti renders the BPMN DI it is handed (layout authored elsewhere); kymo's first-party engine is tuned for architecture diagrams. |
| B2 | User layout control | 5 | 8 | Activiti's layout lives in the modeler that produced the XML, not the engine; kymo exposes a first-class layout-tree DSL. |
| B3 | Edge / flow routing aesthetic | 5 | 10 | Activiti draws sequence flows as authored, no opinion of its own; kymo defaults to the H-V-H midpoint Z the team specified ([[feedback-kymo-edge-routing]]). |
| B4 | Styling / themes / animation | 3 | 6 | Activiti has essentially no styling/animation surface — it executes, it doesn't decorate; kymo has animated SVG/WebP. |
| | **Category total / 40** | **18** | **32** | **kymo +14** — kymo owns layout and routing; Activiti renders only what a modeler handed it. |

### 3.3 Category C — Scope & Iconography

| # | Criterion | Activiti | kymo | Why |
|---|-----------|:-------:|:----:|-----|
| C1 | Scope / notation breadth | 5 | 4 | Activiti speaks BPMN 2.0 (the executable subset) — one rich, standardised notation; kymo draws architecture/block diagrams only, neither broader nor a standard. |
| C2 | Icon / shape catalog | 4 | 5 | Activiti's "catalog" is the fixed BPMN symbol set; kymo's file-backed `icons/` set is larger and architecture-tuned but bespoke. |
| | **Category total / 20** | **9** | **9** | **tie** — Activiti's standardised notation balances kymo's broader-but-bespoke icon set. |

### 3.4 Category D — Output & Interop

| # | Criterion | Activiti | kymo | Why |
|---|-----------|:-------:|:----:|-----|
| D1 | Output-format breadth | 4 | 6 | Activiti's "output" is process instances and audit history, not picture formats; kymo is SVG-first plus animated WebP and Figma/Excalidraw. |
| D2 | Round-trip / data interchange | 8 | 5 | Activiti consumes/produces standard BPMN 2.0 XML — genuine round-trip across the whole engine family; kymo's exporters are one-way with no standard interchange. |
| D3 | Embeddability / API | 8 | 6 | Activiti is an embeddable Java engine with REST + Java APIs; kymo is a Python module + JS port (no service/API). |
| | **Category total / 30** | **20** | **17** | **Activiti +3** — standardised interchange and a real embeddable API. |

### 3.5 Category E — Cost, Deployment & Ecosystem

| # | Criterion | Activiti | kymo | Why |
|---|-----------|:-------:|:----:|-----|
| E1 | License, cost & self-host/offline | 9 | 9 | Both Apache-2.0 and fully self-hostable/local (Activiti embeds in your JVM app; kymo is a local CLI/library). A wash. |
| E2 | Community / maturity | 5 | 3 | Activiti is mature and historically pivotal but its mindshare has migrated to Camunda/Flowable; kymo is an early in-house tool. |
| | **Category total / 20** | **14** | **12** | **Activiti +2** — maturity and lineage, offset partly by the shared licensing strength. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `Activiti` | **83**  | **5.53** | **55 %** |
| `kymo`     | **100** | **6.67** | **67 %** |
| Gap (kymo − Activiti) | 17 | 1.14 | 12 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | Activiti | kymo | Δ (kymo − Activiti) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — Authoring & Source        | 4 | 40 | 22 | 30 | **+8**  |
| B — Layout & Rendering        | 4 | 40 | 18 | 32 | **+14** |
| C — Scope & Iconography       | 2 | 20 | 9  | 9  | **0**   |
| D — Output & Interop          | 3 | 30 | 20 | 17 | **−3**  |
| E — Cost, Deployment & Ecosys | 2 | 20 | 14 | 12 | **−2**  |
| **Overall**                   | **15** | **150** | **83** | **100** | **+17** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Activiti` | 5.50 | 4.50 | 4.50 | 6.67 | 7.00 | **5.63** | **56 %** |
| `kymo`     | 7.50 | 8.00 | 4.50 | 5.67 | 6.00 | **6.33** | **63 %** |
| Gap | | | | | | 0.70 | **7 pp** |

Equal-per-category *narrows* the gap (12 pp → 7 pp) because the engine's relative strengths (D interop / E ecosystem) sit in the smaller categories that get upweighted. Use this only if you believe "interop" and "ecosystem" each matter as much as "authoring" wholesale.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): kymo 6.67/10 vs Activiti 5.53/10 — a 1.1-point / 12-pp gap *on the rendering/authoring lens only*.** It is not a verdict on Activiti as a whole.
- **Cross-category caveat.** This matrix views a process-**execution** engine through kymo's diagram-rendering-and-authoring lens; a high kymo number does **not** mean kymo is "better than" Activiti — Activiti executes BPMN processes with full token semantics, kymo only renders static diagrams and cannot execute anything. The single number reflects overlap on visualisation/authoring only; the real signal lives in §2 and §4.
- **Strategic shape.** kymo leads on what it *owns* (text source, layout/routing); Activiti leads on what a standard *enables* (BPMN interchange, embeddable API). Invest in owned surface, study the interchange story for ideas (§4).
- **Don't read the C tie as parity of scope.** Activiti's 5 is a *standardised executable notation*; kymo's matching 9-total comes from a broader-but-bespoke icon set. Different kinds of breadth.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo gains PNG/PDF output (D1) or its exporters become bidirectional (D2).
2. kymo documents a stable model/serialisation or interchange format (D2, D3).
3. kymo's icon catalog or an arbitrary-asset escape hatch expands meaningfully (C2).
4. kymo ships authoring aids — an LSP, formatter, or visual editor (would shift A3, E).
5. Upstream Activiti changes its licensing, engine model, or Cloud direction (E1, D3).

## 4. Open questions for kymo

These follow from the comparison and the borrowable ideas catalogued in [`activiti.md`](activiti.md):

1. **Should kymo document a stable model/serialisation?** Activiti's fork tree proves an ecosystem needs a legible data format. A documented kymo model would de-risk third-party tooling — worth a write-up before any external integration is attempted.
2. **How small should the core stay?** Activiti's durable value was being an *embeddable* engine, not a platform. kymo's library/CLI shares that; the open question is what (if anything) should ever push it toward a service.
3. **Where does interchange beat export?** kymo's one-way Figma/Excalidraw exporters are useful but not interchange. Is a round-trippable representation (D2) worth the cost, given Activiti's lineage only worked because BPMN XML round-trips?

## 5. Provenance

- Comparison subject: Activiti 7.x / Activiti Cloud as documented at <https://www.activiti.org/> on 2026-05-20.
- Factual basis for the Activiti column: [`activiti.md`](activiti.md).
- Factual basis for the kymo column: this repository's [`KYMO_DSL.md`](../KYMO_DSL.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]], cited where B3 is scored). The kymo cell scores follow the shared general-tool kymo column used across `docs/softwares/*.comparision.md` so kymo is judged consistently.
- Edits should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds.

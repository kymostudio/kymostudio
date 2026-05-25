---
title: Flowable vs. kymo — Comparison
document_id: REF-FLOWABLE-CMP-001
version: "1.0"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream Flowable major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - flowable.md
  - ../formats/kymo-dsl/README.md
  - ../diagrams/best-practices.md
authors:
  - Vũ Anh
language: en
keywords:
  - flowable
  - bpmn-engine
  - cmmn
  - dmn
  - kymo
  - comparison
  - prior-art
  - process-execution
upstream:
  project: Flowable
  homepage: https://www.flowable.com/open-source
  repository: https://github.com/flowable/flowable-engine
  license: Apache-2.0 (Flowable Open Source) + commercial Flowable Enterprise
  access_date: 2026-05-20
---

# Flowable vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-FLOWABLE-CMP-001                                         |
| Version           | 1.0                                                          |
| Issue Date        | 2026-05-21                                                   |
| Status            | Released                                                     |
| Classification    | Internal                                                     |
| Owner             | `diagrams/` project                                         |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline  |
| Access Date       | 2026-05-20                                                   |
| Parent Reference  | [`flowable.md`](flowable.md)                                |
| Related Documents | [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`best-practices.md`](../diagrams/best-practices.md) |

This document isolates the **prior-art comparison** between [Flowable](https://www.flowable.com/open-source) and kymo. The factual reference (lineage as an Activiti fork, BPMN/CMMN/DMN coverage, architecture) lives in [`flowable.md`](flowable.md); read that first if you need ground truth on how Flowable actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream Flowable does not. Note up front that Flowable and kymo are in **different categories** — Flowable *executes* BPMN/CMMN/DMN processes; kymo *renders* static diagrams — so most axes below are not strictly like-for-like; read §2 and §4 before the scores.

## 1. At-a-glance matrix

| Axis | Flowable | kymo |
|------|----------|------|
| Primary purpose | Embeddable BPMN/CMMN/DMN **execution** | Render static architecture diagrams |
| Notation | BPMN 2.0 (+ CMMN, DMN) | kymo `.kymo` DSL |
| Implementation | Java (Spring-friendly) | Python + JS |
| Semantics | Full execution | None — visual only |
| Output | Running instances, history | SVG / animated SVG / WebP |
| License | Apache-2.0 (+ commercial) | Apache-2.0 |

## 2. Headline tradeoffs

### 2.1 Different category: execution vs rendering

Flowable is a **process-execution engine**: a BPMN/CMMN/DMN model is deployed and *run* — tasks dispatch, gateways route tokens, cases and decisions evaluate, and the engine tracks each live instance with full history. kymo is a **diagram renderer**: a `.kymo` source compiles to an SVG and nothing executes. They are not competitors on a single axis; they sit in different product categories. Everything below scores Flowable *through kymo's diagram-rendering-and-authoring lens*, which deliberately ignores the entire half of Flowable — execution — that is its actual reason to exist. Keep that asymmetry in mind: the matrix measures overlap on visualisation/authoring, not which tool is "better".

### 2.2 Embeddability as a design goal

Flowable's defining ethos is "drop the engine into your app" — a clean library you embed in a JVM/Spring service, not a platform you stand up. That parallels kymo's "import the library or call the CLI" model exactly. The lesson is to keep the core a clean library, not a service: the value in both tools comes from being a small thing other code calls, and that is a property to guard rather than grow out of.

### 2.3 One core, several notations

Flowable runs BPMN, CMMN, and DMN on **one engine** — a single neutral core with notation-specific behaviour layered thinly on top. kymo's analogue is serving several output targets (SVG / WebP / Figma / Excalidraw) from **one model**. The shared lesson is to keep the model neutral and the back-ends thin: the moment notation- or target-specific logic leaks into the core, the "one core, many consumers" property — the thing that made Flowable's multi-notation story cheap — starts to erode.

### 2.4 Healthy forks signal a healthy data format

That Activiti could be cleanly forked into both Camunda and Flowable is largely because **BPMN 2.0 XML is standardised**: each fork inherited a legible, interoperable model. kymo has no such interchange today. A stable, documented kymo model/format would similarly de-risk downstream tooling — it is the precondition for the kind of healthy fork/extension ecosystem the BPMN engine family enjoys.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension. Because Flowable is a process-execution engine rather than a diagram-as-code language, the rubric is the **general-tool** adaptation of the five categories used in [`diagrams.mingrammer.comparision.md`](diagrams.mingrammer.comparision.md): A Authoring & Source, B Layout & Rendering, C Scope & Iconography, D Output & Interop, E Cost/Deployment & Ecosystem. The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats.** This matrix views a process-**execution** engine through kymo's diagram-**rendering**-and-authoring lens, so a high kymo number does **not** mean kymo is "better than" Flowable — they are different categories (Flowable executes BPMN/CMMN/DMN processes with full token semantics; kymo only renders static diagrams and cannot execute anything). The single number reflects overlap on visualisation/authoring only; the real signal is §2 and §4, where Flowable's notation/interchange/execution strengths live (which kymo lacks). Scores for `kymo` reflect what is observable in this repo as of 2026-05-21 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the layout-tree + Figma/Excalidraw exporters) and are held **consistent across every general-tool comparison in `docs/softwares/`** so kymo is judged the same way each time. Scores for `Flowable` reflect the Flowable 7.x line as documented at <https://www.flowable.com/open-source> on 2026-05-20. The comparison is cross-category, so the **Why** column is load-bearing — read it, not the bare number.

### 3.1 Category A — Authoring & Source

| # | Criterion | Flowable | kymo | Why |
|---|-----------|:-------:|:----:|-----|
| A1 | Text / diff / git-friendliness of source | 4 | 9 | Flowable's source is BPMN/CMMN/DMN XML with DI — diffable in principle but coordinate-heavy and tool-generated; kymo's `.kymo` is plain declarative text built for git. |
| A2 | Reproducibility & automation | 6 | 8 | Flowable deployment is scriptable and the model is data, but the artefact is a running process, not a regenerable picture; kymo regenerates SVG/WebP from source, ideal for CI. |
| A3 | Approachability / learning curve | 5 | 6 | Flowable asks the user to learn execution semantics across three notations plus a Java/Spring runtime; kymo asks for a small DSL only. |
| A4 | Grouping / container semantics | 7 | 7 | Flowable's pools/lanes/sub-processes (and CMMN stages) carry execution meaning; kymo's typed `region` containers carry layout/styling meaning — different purposes, comparable expressiveness. |
| | **Category total / 40** | **22** | **30** | **kymo +8** — everything that flows from plain-text source. |

### 3.2 Category B — Layout & Rendering

| # | Criterion | Flowable | kymo | Why |
|---|-----------|:-------:|:----:|-----|
| B1 | Default layout quality | 5 | 8 | Flowable renders the BPMN DI it is handed (layout authored in a modeler); kymo's first-party engine is tuned for architecture diagrams. |
| B2 | User layout control | 5 | 8 | Flowable's layout lives in its web modeler, not the engine; kymo exposes a first-class layout-tree DSL. |
| B3 | Edge / flow routing aesthetic | 5 | 10 | Flowable draws sequence flows as authored, with no routing opinion of its own; kymo defaults to the H-V-H midpoint Z the team specified ([[feedback-kymo-edge-routing]]). |
| B4 | Styling / themes / animation | 3 | 6 | Flowable has essentially no authoring-time styling/animation surface — it executes, it doesn't decorate; kymo has animated SVG/WebP. |
| | **Category total / 40** | **18** | **32** | **kymo +14** — kymo owns layout and routing; Flowable renders only what a modeler handed it. |

### 3.3 Category C — Scope & Iconography

| # | Criterion | Flowable | kymo | Why |
|---|-----------|:-------:|:----:|-----|
| C1 | Scope / notation breadth | 6 | 4 | Flowable speaks BPMN + CMMN + DMN — unusually broad, standardised, executable notation in one engine; kymo draws architecture/block diagrams only. |
| C2 | Icon / shape catalog | 4 | 5 | Flowable's "catalog" is the fixed BPMN/CMMN/DMN symbol set; kymo's file-backed `icons/` set is larger and architecture-tuned but bespoke. |
| | **Category total / 20** | **10** | **9** | **Flowable +1** — three standardised notations narrowly edge out kymo's broader-but-bespoke icon set. |

### 3.4 Category D — Output & Interop

| # | Criterion | Flowable | kymo | Why |
|---|-----------|:-------:|:----:|-----|
| D1 | Output-format breadth | 4 | 6 | Flowable's "output" is process instances and history, not picture formats; kymo is SVG-first plus animated WebP and Figma/Excalidraw. |
| D2 | Round-trip / data interchange | 8 | 5 | Flowable consumes/produces standard BPMN/CMMN/DMN XML — genuine round-trip across the engine family; kymo's exporters are one-way with no standard interchange. |
| D3 | Embeddability / API | 8 | 6 | Flowable is an embeddable Java engine with REST + Java APIs and Spring Boot starters; kymo is a Python module + JS port (no service/API). |
| | **Category total / 30** | **20** | **17** | **Flowable +3** — standardised interchange and a clean embeddable API. |

### 3.5 Category E — Cost, Deployment & Ecosystem

| # | Criterion | Flowable | kymo | Why |
|---|-----------|:-------:|:----:|-----|
| E1 | License, cost & self-host/offline | 8 | 9 | Flowable Open Source is Apache-2.0 and embeddable, but the full platform is a paid commercial Enterprise tier; kymo is fully Apache-2.0 and local — a slight kymo edge on freedom-to-use. |
| E2 | Community / maturity | 6 | 3 | Flowable is mature with active commercial backing and a healthy OSS user base; kymo is an early in-house tool. |
| | **Category total / 20** | **14** | **12** | **Flowable +2** — maturity and backing, offset partly by kymo's fully-open licensing. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `Flowable` | **84**  | **5.60** | **56 %** |
| `kymo`     | **100** | **6.67** | **67 %** |
| Gap (kymo − Flowable) | 16 | 1.07 | 11 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | Flowable | kymo | Δ (kymo − Flowable) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — Authoring & Source        | 4 | 40 | 22 | 30 | **+8**  |
| B — Layout & Rendering        | 4 | 40 | 18 | 32 | **+14** |
| C — Scope & Iconography       | 2 | 20 | 10 | 9  | **−1**  |
| D — Output & Interop          | 3 | 30 | 20 | 17 | **−3**  |
| E — Cost, Deployment & Ecosys | 2 | 20 | 14 | 12 | **−2**  |
| **Overall**                   | **15** | **150** | **84** | **100** | **+16** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Flowable` | 5.50 | 4.50 | 5.00 | 6.67 | 7.00 | **5.73** | **57 %** |
| `kymo`     | 7.50 | 8.00 | 4.50 | 5.67 | 6.00 | **6.33** | **63 %** |
| Gap | | | | | | 0.60 | **6 pp** |

Equal-per-category *narrows* the gap (11 pp → 6 pp) because the engine's relative strengths (D interop / E ecosystem) sit in the smaller categories that get upweighted. Use this only if you believe "interop" and "ecosystem" each matter as much as "authoring" wholesale.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): kymo 6.67/10 vs Flowable 5.60/10 — a 1.1-point / 11-pp gap *on the rendering/authoring lens only*.** It is not a verdict on Flowable as a whole.
- **Cross-category caveat.** This matrix views a process-**execution** engine through kymo's diagram-rendering-and-authoring lens; a high kymo number does **not** mean kymo is "better than" Flowable — Flowable executes BPMN/CMMN/DMN processes with full token semantics, kymo only renders static diagrams and cannot execute anything. The single number reflects overlap on visualisation/authoring only; the real signal lives in §2 and §4.
- **Strategic shape.** kymo leads on what it *owns* (text source, layout/routing); Flowable leads on what a standard *enables* (multi-notation interchange, embeddable API). Invest in owned surface, study the one-core-many-notations discipline for ideas (§2.3).
- **Don't over-read the close C gap.** Flowable's 6 in C1 is *three standardised executable notations*; kymo's matching total comes from a broader-but-bespoke icon set. Different kinds of breadth.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo gains PNG/PDF output (D1) or its exporters become bidirectional (D2).
2. kymo documents a stable model/serialisation or interchange format (D2, D3).
3. kymo's icon catalog or an arbitrary-asset escape hatch expands meaningfully (C2).
4. kymo ships authoring aids — an LSP, formatter, or visual editor (would shift A3, E).
5. Upstream Flowable changes its licensing split, engine model, or notation coverage (E1, C1, D3).

## 4. Open questions for kymo

These follow from the comparison and the borrowable ideas catalogued in [`flowable.md`](flowable.md):

1. **Is kymo's core staying a clean library, not a service?** Flowable's embeddability is its defining value. The open question is keeping kymo importable/invokable and resisting the pull toward a hosted service.
2. **Is the model staying neutral with thin back-ends?** Flowable layers BPMN/CMMN/DMN thinly on one engine. kymo serves several targets from one model — are the SVG/WebP/Figma/Excalidraw back-ends staying thin, or is target-specific logic creeping into the core?
3. **Should kymo document a stable model/format?** Flowable inherited a legible model because BPMN XML is standardised. A documented kymo model would de-risk downstream tooling and any future fork/extension story.

## 5. Provenance

- Comparison subject: the Flowable 7.x line as documented at <https://www.flowable.com/open-source> on 2026-05-20.
- Factual basis for the Flowable column: [`flowable.md`](flowable.md).
- Factual basis for the kymo column: this repository's [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`best-practices.md`](../diagrams/best-practices.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]], cited where B3 is scored). The kymo cell scores follow the shared general-tool kymo column used across `docs/softwares/*.comparision.md` so kymo is judged consistently.
- Edits should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds.

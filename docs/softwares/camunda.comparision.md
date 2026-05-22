---
title: Camunda vs. kymo — Comparison
document_id: REF-CAMUNDA-CMP-001
version: "1.0"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream Camunda major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - camunda.md
  - ../DSL.md
  - ../BEST_PRACTICE_DIAGRAMS.md
authors:
  - Vũ Anh
language: en
keywords:
  - camunda
  - bpmn-engine
  - zeebe
  - bpmn-io
  - kymo
  - comparison
  - prior-art
  - process-execution
upstream:
  project: Camunda
  homepage: https://camunda.com/
  repository: https://github.com/camunda/camunda
  license: "Camunda 7 CE: Apache-2.0 (EoL). Camunda 8: source-available (Camunda License v1), proprietary compiled"
  access_date: 2026-05-20
---

# Camunda vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-CAMUNDA-CMP-001                                          |
| Version           | 1.0                                                           |
| Issue Date        | 2026-05-21                                                    |
| Status            | Released                                                      |
| Classification    | Internal                                                      |
| Owner             | `diagrams/` project                                          |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline   |
| Access Date       | 2026-05-20                                                    |
| Parent Reference  | [`camunda.md`](camunda.md)                                   |
| Related Documents | [`DSL.md`](../DSL.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md) |

This document isolates the **prior-art comparison** between [Camunda](https://camunda.com/) and kymo. The factual reference (the C7-vs-C8 split, architecture, BPMN conformance, bpmn.io) lives in [`camunda.md`](camunda.md); read that first if you need ground truth on how Camunda actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream Camunda does not. Note up front that Camunda and kymo are in **different categories** — Camunda *executes* BPMN processes; kymo *renders* static diagrams — so most axes below are not strictly like-for-like; read §2 and §4 before the scores.

## 1. At-a-glance matrix

| Axis | Camunda | kymo |
|------|---------|------|
| Primary purpose | **Execute** BPMN processes (orchestration runtime) | Render static architecture diagrams |
| Artifact | Executable BPMN 2.0 XML model | `.kymo` DSL source → SVG |
| Semantics | Full token/execution semantics | None — purely visual |
| Implementation | Java (C7) / Zeebe distributed (C8) | Python renderer + JS data-model port |
| Output | Running process instances, audit history | SVG / animated SVG / WebP |
| Relation | Author of bpmn.io (kymo's nearest renderer analogue) | — |
| License | C7 CE Apache-2.0 (EoL); C8 source-available + paid | Apache-2.0 |

## 2. Headline tradeoffs

### 2.1 Different category: execution vs rendering

Camunda is a **process-execution platform**: a BPMN 2.0 model is deployed to the engine and *run* — tasks dispatch to workers, gateways route tokens, timers fire, and the engine tracks every running instance. kymo is a **diagram renderer**: a `.kymo` source compiles to an SVG and nothing executes. They are not competitors on a single axis; they sit in different product categories. Everything below scores Camunda *through kymo's diagram-rendering-and-authoring lens*, which deliberately ignores the entire half of Camunda — execution — that is its actual reason to exist. The nearest genuine like-for-like to kymo inside Camunda's world is not the engine at all but **bpmn.io**, the web modeler Camunda authors. Keep that asymmetry in mind: the matrix measures overlap on visualisation/authoring, not which tool is "better".

### 2.2 Separate the model from the picture (BPMN DI)

Camunda's model is *executable data*; the diagram is one *view* of it (BPMN DI, authored in bpmn.io, round-tripping alongside the model). That separation is what lets the same process be run, re-rendered, and re-tooled independently. kymo's value is the picture, but the same discipline applies — a stable data model with rendering as one consumer keeps options open. kymo's `to_figma.py`/`to_excalidraw.py` already hint at treating the model as a source with several consumers; the lesson is to formalise that split rather than let the renderer become the model.

### 2.3 Licensing as a first-class decision

The Camunda 7 → Camunda 8 relicensing — from permissive, embeddable Apache-2.0 to a source-available commercial model with no free production edition — is a cautionary tale for anyone who builds on a tool. kymo's Apache-2.0 stance is an asset, and the lesson from Camunda is that it is an asset to **protect deliberately**: relicensing is cheap to do and expensive to undo for downstream users.

### 2.4 A modeler that teaches the notation

bpmn.io did more to spread BPMN literacy than Camunda's own customer base ever could — most online "what does this BPMN symbol mean" material is illustrated with it. The lesson for kymo: an approachable authoring surface is itself a distribution strategy. A clean DSL that is easy to read and pick up does for kymo what bpmn.io's modeler did for BPMN — it lowers the cost of the first diagram, which is where adoption is won or lost.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension. Because Camunda is a process-execution platform rather than a diagram-as-code language, the rubric is the **general-tool** adaptation of the five categories used in [`diagrams.mingrammer.comparision.md`](diagrams.mingrammer.comparision.md): A Authoring & Source, B Layout & Rendering, C Scope & Iconography, D Output & Interop, E Cost/Deployment & Ecosystem. The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats.** This matrix views a process-**execution** platform through kymo's diagram-**rendering**-and-authoring lens, so a high kymo number does **not** mean kymo is "better than" Camunda — they are different categories (Camunda executes BPMN processes with full token semantics; kymo only renders static diagrams and cannot execute anything). The single number reflects overlap on visualisation/authoring only; the real signal is §2 and §4, where Camunda's notation/interchange/execution strengths live (which kymo lacks). Scores for `kymo` reflect what is observable in this repo as of 2026-05-21 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the layout-tree + Figma/Excalidraw exporters) and are held **consistent across every general-tool comparison in `docs/softwares/`** so kymo is judged the same way each time. Scores for `Camunda` reflect Camunda 8 (current) and Camunda 7 CE (EoL) as documented at <https://camunda.com/> on 2026-05-20. The comparison is cross-category, so the **Why** column is load-bearing — read it, not the bare number.

### 3.1 Category A — Authoring & Source

| # | Criterion | Camunda | kymo | Why |
|---|-----------|:------:|:----:|-----|
| A1 | Text / diff / git-friendliness of source | 4 | 9 | Camunda's source is BPMN XML with embedded DI — diffable in principle but coordinate-heavy and modeler-generated; kymo's `.kymo` is plain declarative text built for git. |
| A2 | Reproducibility & automation | 7 | 8 | Camunda models are data and deployment is scriptable (CI pipelines deploy BPMN); but the artefact is a running process, not a regenerable picture. kymo regenerates SVG/WebP from source. |
| A3 | Approachability / learning curve | 6 | 6 | bpmn.io makes *drawing* BPMN approachable, but running it means BPMN execution semantics + a JVM/Zeebe runtime; kymo asks for a small DSL only. Roughly even on the authoring slice. |
| A4 | Grouping / container semantics | 7 | 7 | Camunda's pools/lanes/sub-processes carry execution meaning; kymo's typed `region` containers carry layout/styling meaning — different purposes, comparable expressiveness. |
| | **Category total / 40** | **24** | **30** | **kymo +6** — everything that flows from plain-text source, narrowed by bpmn.io's authoring polish. |

### 3.2 Category B — Layout & Rendering

| # | Criterion | Camunda | kymo | Why |
|---|-----------|:------:|:----:|-----|
| B1 | Default layout quality | 6 | 8 | bpmn.io renders clean BPMN DI but layout is hand-placed in the modeler, not computed; kymo's first-party engine is tuned for architecture diagrams. |
| B2 | User layout control | 6 | 8 | bpmn.io gives manual canvas control; kymo exposes a first-class layout-tree DSL that is expressive and computed. |
| B3 | Edge / flow routing aesthetic | 6 | 10 | bpmn.io's sequence-flow routing is decent and manually tweakable; kymo defaults to the H-V-H midpoint Z the team specified ([[feedback-kymo-edge-routing]]). |
| B4 | Styling / themes / animation | 4 | 6 | Camunda renders static BPMN with token overlays at runtime but no authoring-time styling/animation surface; kymo has animated SVG/WebP. |
| | **Category total / 40** | **22** | **32** | **kymo +10** — owned routing + auto-layout vs bpmn.io's manual canvas. |

### 3.3 Category C — Scope & Iconography

| # | Criterion | Camunda | kymo | Why |
|---|-----------|:------:|:----:|-----|
| C1 | Scope / notation breadth | 6 | 4 | Camunda speaks BPMN 2.0 + DMN (and historically CMMN) — rich, standardised, executable notations; kymo draws architecture/block diagrams only. |
| C2 | Icon / shape catalog | 5 | 5 | Camunda's catalog is the fixed BPMN/DMN symbol set rendered by bpmn.io; kymo's file-backed `icons/` set is broader but bespoke. A wash. |
| | **Category total / 20** | **11** | **9** | **Camunda +2** — standardised multi-notation breadth edges out kymo's bespoke icon set. |

### 3.4 Category D — Output & Interop

| # | Criterion | Camunda | kymo | Why |
|---|-----------|:------:|:----:|-----|
| D1 | Output-format breadth | 5 | 6 | Camunda's "output" is process instances and audit history; bpmn.io can export SVG/PNG of a diagram, but picture formats are a side feature. kymo is SVG-first plus WebP and Figma/Excalidraw. |
| D2 | Round-trip / data interchange | 8 | 5 | Camunda consumes/produces standard BPMN 2.0 XML with DI — genuine round-trip across the engine family and bpmn.io; kymo's exporters are one-way with no standard interchange. |
| D3 | Embeddability / API | 8 | 6 | Camunda offers REST/Java APIs and bpmn.io embeds as a JS modeler; kymo is a Python module + JS port (no service/API). |
| | **Category total / 30** | **21** | **17** | **Camunda +4** — standardised interchange and an embeddable modeler/engine API. |

### 3.5 Category E — Cost, Deployment & Ecosystem

| # | Criterion | Camunda | kymo | Why |
|---|-----------|:------:|:----:|-----|
| E1 | License, cost & self-host/offline | 5 | 9 | Camunda 7 CE was Apache-2.0 but is **EoL**; Camunda 8 is source-available, paid for production. kymo is Apache-2.0 and fully local — a clear kymo win on freedom-to-use. |
| E2 | Community / maturity | 9 | 3 | Camunda is among the most widely deployed BPMN platforms and bpmn.io has enormous reach; kymo is an early in-house tool. |
| | **Category total / 20** | **14** | **12** | **Camunda +2** — maturity/reach offset by kymo's stronger licensing/offline position. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `Camunda` | **92**  | **6.13** | **61 %** |
| `kymo`    | **100** | **6.67** | **67 %** |
| Gap (kymo − Camunda) | 8 | 0.53 | 6 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | Camunda | kymo | Δ (kymo − Camunda) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — Authoring & Source        | 4 | 40 | 24 | 30 | **+6**  |
| B — Layout & Rendering        | 4 | 40 | 22 | 32 | **+10** |
| C — Scope & Iconography       | 2 | 20 | 11 | 9  | **−2**  |
| D — Output & Interop          | 3 | 30 | 21 | 17 | **−4**  |
| E — Cost, Deployment & Ecosys | 2 | 20 | 14 | 12 | **−2**  |
| **Overall**                   | **15** | **150** | **92** | **100** | **+8** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Camunda` | 6.00 | 5.50 | 5.50 | 7.00 | 7.00 | **6.20** | **62 %** |
| `kymo`    | 7.50 | 8.00 | 4.50 | 5.67 | 6.00 | **6.33** | **63 %** |
| Gap | | | | | | 0.13 | **1 pp** |

Equal-per-category *nearly ties* the two (6 pp → 1 pp): Camunda's interchange/ecosystem strengths (D2, E2) sit in the smaller categories that get upweighted. Use this only if you believe "interop" and "ecosystem" each matter as much as "authoring" wholesale.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): kymo 6.67/10 vs Camunda 6.13/10 — a 0.5-point / 6-pp gap *on the rendering/authoring lens only*.** It is not a verdict on Camunda as a whole, and equal-per-category (§3.6.3) collapses it to a near-tie.
- **Cross-category caveat.** This matrix views a process-**execution** platform through kymo's diagram-rendering-and-authoring lens; a high kymo number does **not** mean kymo is "better than" Camunda — Camunda executes BPMN processes with full token semantics, kymo only renders static diagrams and cannot execute anything. The single number reflects overlap on visualisation/authoring only; the real signal lives in §2 and §4.
- **Strategic shape.** kymo leads on what it *owns* (text source, layout/routing); Camunda leads on what a standard and a long ecosystem *enable* (BPMN/DMN interchange, bpmn.io reach). Invest in owned surface, study bpmn.io and BPMN DI for the model-vs-picture lesson (§2.2).
- **The nearest like-for-like is bpmn.io, not the engine.** When borrowing ideas, compare kymo's renderer to bpmn.io's modeler, not to Zeebe.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo gains PNG/PDF output (D1) or its exporters become bidirectional (D2).
2. kymo documents a stable model/serialisation or interchange format (D2, D3).
3. kymo's icon catalog or an arbitrary-asset escape hatch expands meaningfully (C2).
4. kymo ships authoring aids — an LSP, formatter, or visual editor (would shift A3, E).
5. Upstream Camunda changes its licensing, engine model, or bpmn.io direction (E1, D3).

## 4. Open questions for kymo

These follow from the comparison and the borrowable ideas catalogued in [`camunda.md`](camunda.md):

1. **How explicit should kymo's model-vs-picture split be?** Camunda (BPMN DI) keeps the executable model and its rendered view distinct. kymo's exporters hint at the same shape — should the model become a documented, first-class artefact with the renderer as one consumer?
2. **Is kymo's Apache-2.0 stance written down as a deliberate commitment?** Camunda's C7→C8 relicensing shows the cost of leaving licensing implicit. Worth stating the intent explicitly.
3. **How approachable is the first diagram?** bpmn.io's reach came from teaching the notation. What is kymo's equivalent on-ramp — examples, a playground, an LSP — and is it prioritised as a distribution strategy?

## 5. Provenance

- Comparison subject: Camunda 8 (current) and Camunda 7 CE (EoL) as documented at <https://camunda.com/> on 2026-05-20.
- Factual basis for the Camunda column: [`camunda.md`](camunda.md).
- Factual basis for the kymo column: this repository's [`DSL.md`](../DSL.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]], cited where B3 is scored). The kymo cell scores follow the shared general-tool kymo column used across `docs/softwares/*.comparision.md` so kymo is judged consistently.
- Edits should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds.

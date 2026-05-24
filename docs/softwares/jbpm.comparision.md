---
title: jBPM vs. kymo — Comparison
document_id: REF-JBPM-CMP-001
version: "1.0"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream jBPM major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - jbpm.md
  - ../KYMO_DSL.md
  - ../BEST_PRACTICE_DIAGRAMS.md
authors:
  - Vũ Anh
language: en
keywords:
  - jbpm
  - bpmn-engine
  - drools
  - kie
  - red-hat
  - kymo
  - comparison
  - prior-art
  - process-execution
upstream:
  project: jBPM (KIE / Red Hat)
  homepage: https://www.jbpm.org/
  repository: https://github.com/kiegroup/jbpm
  license: Apache-2.0
  access_date: 2026-05-20
---

# jBPM vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-JBPM-CMP-001                                             |
| Version           | 1.0                                                          |
| Issue Date        | 2026-05-21                                                   |
| Status            | Released                                                     |
| Classification    | Internal                                                     |
| Owner             | `diagrams/` project                                         |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline  |
| Access Date       | 2026-05-20                                                   |
| Parent Reference  | [`jbpm.md`](jbpm.md)                                        |
| Related Documents | [`KYMO_DSL.md`](../KYMO_DSL.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md) |

This document isolates the **prior-art comparison** between [jBPM (KIE / Red Hat)](https://www.jbpm.org/) and kymo. The factual reference (history as the original OSS BPM, KIE/Drools integration, architecture) lives in [`jbpm.md`](jbpm.md); read that first if you need ground truth on how jBPM actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream jBPM does not. Note up front that jBPM and kymo are in **different categories** — jBPM *executes* BPMN processes and business rules; kymo *renders* static diagrams — so most axes below are not strictly like-for-like; read §2 and §4 before the scores.

## 1. At-a-glance matrix

| Axis | jBPM | kymo |
|------|------|------|
| Primary purpose | BPMN **execution** + rules (Drools) | Render static architecture diagrams |
| Notation | BPMN 2.0 (+ DMN/DRL) | kymo `.kymo` DSL |
| Implementation | Java (KIE platform) | Python + JS |
| Semantics | Full execution | None — visual only |
| Distinctive trait | Process + rules integration | Architecture diagram rendering |
| License | Apache-2.0 | Apache-2.0 |

## 2. Headline tradeoffs

### 2.1 Different category: execution vs rendering

jBPM is a **process-execution toolkit**: a BPMN 2.0 model is deployed and *run* — events fire, gateways route tokens, Business Rule tasks delegate to Drools, and the engine tracks each live instance. kymo is a **diagram renderer**: a `.kymo` source compiles to an SVG and nothing executes. They are not competitors on a single axis; they sit in different product categories. Everything below scores jBPM *through kymo's diagram-rendering-and-authoring lens*, which deliberately ignores the entire half of jBPM — execution plus rules — that is its actual reason to exist. Keep that asymmetry in mind: the matrix measures overlap on visualisation/authoring, not which tool is "better".

### 2.2 Separate concerns that change at different rates

jBPM's signature design is keeping *flow* (the process) and *decisions* (rules) in **distinct engines that share a session** — each evolves at its own pace without dragging the other along. kymo's analogue is keeping *structure* (the DSL/model) separate from *appearance* (the renderer) and *layout*. That separation already exists in kymo and is worth guarding: the moment appearance logic leaks into the model — or layout decisions into the parser — the independent-evolution property that jBPM has banked for 20+ years starts to erode.

### 2.3 Longevity through a stable core

jBPM survived 20+ years (the original OSS BPM, predating the Activiti fork tree) by keeping a **clean, stable engine** and letting tooling churn around it — web designers, KIE workbench, and now Kogito have all come and gone or evolved while the core stayed legible. The lesson for kymo is to keep `model.py` stable and let the back-ends (SVG / WebP / Figma / Excalidraw) evolve: a stable core is what lets the periphery move fast without breaking everything.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension. Because jBPM is a process-execution toolkit rather than a diagram-as-code language, the rubric is the **general-tool** adaptation of the five categories used in [`diagrams.mingrammer.comparision.md`](diagrams.mingrammer.comparision.md): A Authoring & Source, B Layout & Rendering, C Scope & Iconography, D Output & Interop, E Cost/Deployment & Ecosystem. The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats.** This matrix views a process-**execution** toolkit through kymo's diagram-**rendering**-and-authoring lens, so a high kymo number does **not** mean kymo is "better than" jBPM — they are different categories (jBPM executes BPMN processes and business rules with full token semantics; kymo only renders static diagrams and cannot execute anything). The single number reflects overlap on visualisation/authoring only; the real signal is §2 and §4, where jBPM's notation/interchange/execution strengths live (which kymo lacks). Scores for `kymo` reflect what is observable in this repo as of 2026-05-21 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the layout-tree + Figma/Excalidraw exporters) and are held **consistent across every general-tool comparison in `docs/softwares/`** so kymo is judged the same way each time. Scores for `jBPM` reflect jBPM 7.x (KIE) with Kogito as the cloud-native successor, as documented at <https://www.jbpm.org/> on 2026-05-20. The comparison is cross-category, so the **Why** column is load-bearing — read it, not the bare number.

### 3.1 Category A — Authoring & Source

| # | Criterion | jBPM | kymo | Why |
|---|-----------|:----:|:----:|-----|
| A1 | Text / diff / git-friendliness of source | 4 | 9 | jBPM's source is BPMN XML (plus DRL/DMN for rules) with DI — diffable in principle but coordinate-heavy and tool-generated; kymo's `.kymo` is plain declarative text built for git. |
| A2 | Reproducibility & automation | 6 | 8 | jBPM deployment is scriptable via the KIE platform and the model is data, but the artefact is a running process, not a regenerable picture; kymo regenerates SVG/WebP from source, ideal for CI. |
| A3 | Approachability / learning curve | 4 | 6 | jBPM asks the user to learn BPMN execution *and* the Drools rules model on the KIE platform — a notably steep surface; kymo asks for a small DSL only. |
| A4 | Grouping / container semantics | 7 | 7 | jBPM's pools/lanes/sub-processes carry execution meaning; kymo's typed `region` containers carry layout/styling meaning — different purposes, comparable expressiveness. |
| | **Category total / 40** | **21** | **30** | **kymo +9** — everything that flows from plain-text source, widened by jBPM's steeper learning curve. |

### 3.2 Category B — Layout & Rendering

| # | Criterion | jBPM | kymo | Why |
|---|-----------|:----:|:----:|-----|
| B1 | Default layout quality | 5 | 8 | jBPM renders the BPMN DI it is handed (layout authored in a designer); kymo's first-party engine is tuned for architecture diagrams. |
| B2 | User layout control | 5 | 8 | jBPM's layout lives in its web designer, not the engine; kymo exposes a first-class layout-tree DSL. |
| B3 | Edge / flow routing aesthetic | 5 | 10 | jBPM draws sequence flows as authored, with no routing opinion of its own; kymo defaults to the H-V-H midpoint Z the team specified ([[feedback-kymo-edge-routing]]). |
| B4 | Styling / themes / animation | 3 | 6 | jBPM has essentially no authoring-time styling/animation surface — it executes, it doesn't decorate; kymo has animated SVG/WebP. |
| | **Category total / 40** | **18** | **32** | **kymo +14** — kymo owns layout and routing; jBPM renders only what a designer handed it. |

### 3.3 Category C — Scope & Iconography

| # | Criterion | jBPM | kymo | Why |
|---|-----------|:----:|:----:|-----|
| C1 | Scope / notation breadth | 6 | 4 | jBPM speaks BPMN 2.0 plus DMN/DRL rules — rich, standardised, executable notation; kymo draws architecture/block diagrams only. |
| C2 | Icon / shape catalog | 4 | 5 | jBPM's "catalog" is the fixed BPMN symbol set; kymo's file-backed `icons/` set is larger and architecture-tuned but bespoke. |
| | **Category total / 20** | **10** | **9** | **jBPM +1** — standardised process-plus-rules notation narrowly edges out kymo's broader-but-bespoke icon set. |

### 3.4 Category D — Output & Interop

| # | Criterion | jBPM | kymo | Why |
|---|-----------|:----:|:----:|-----|
| D1 | Output-format breadth | 4 | 6 | jBPM's "output" is process instances and history, not picture formats; kymo is SVG-first plus animated WebP and Figma/Excalidraw. |
| D2 | Round-trip / data interchange | 7 | 5 | jBPM consumes/produces standard BPMN 2.0 XML (with DRL/DMN alongside), but the rules dimension is more KIE-specific than the pure-BPMN engines; kymo's exporters are one-way with no standard interchange. |
| D3 | Embeddability / API | 7 | 6 | jBPM embeds as a Java engine with KIE APIs, but the platform is heavier than the leaner BPMN-only engines; kymo is a Python module + JS port (no service/API). |
| | **Category total / 30** | **18** | **17** | **jBPM +1** — standardised interchange and an embeddable API, weighed down slightly by the heavier KIE platform. |

### 3.5 Category E — Cost, Deployment & Ecosystem

| # | Criterion | jBPM | kymo | Why |
|---|-----------|:----:|:----:|-----|
| E1 | License, cost & self-host/offline | 9 | 9 | Both Apache-2.0 and fully self-hostable/local (jBPM embeds in your JVM app, backed by Red Hat; kymo is a local CLI/library). A wash. |
| E2 | Community / maturity | 5 | 3 | jBPM is the longest-lived OSS BPM with Red Hat backing, though mindshare has shifted toward Camunda/Flowable and Kogito; kymo is an early in-house tool. |
| | **Category total / 20** | **14** | **12** | **jBPM +2** — two-decade maturity and Red Hat backing, offset partly by the shared licensing strength. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `jBPM` | **81**  | **5.40** | **54 %** |
| `kymo` | **100** | **6.67** | **67 %** |
| Gap (kymo − jBPM) | 19 | 1.27 | 13 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | jBPM | kymo | Δ (kymo − jBPM) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — Authoring & Source        | 4 | 40 | 21 | 30 | **+9**  |
| B — Layout & Rendering        | 4 | 40 | 18 | 32 | **+14** |
| C — Scope & Iconography       | 2 | 20 | 10 | 9  | **−1**  |
| D — Output & Interop          | 3 | 30 | 18 | 17 | **−1**  |
| E — Cost, Deployment & Ecosys | 2 | 20 | 14 | 12 | **−2**  |
| **Overall**                   | **15** | **150** | **81** | **100** | **+19** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `jBPM` | 5.25 | 4.50 | 5.00 | 6.00 | 7.00 | **5.55** | **56 %** |
| `kymo` | 7.50 | 8.00 | 4.50 | 5.67 | 6.00 | **6.33** | **63 %** |
| Gap | | | | | | 0.78 | **8 pp** |

Equal-per-category *narrows* the gap (13 pp → 8 pp) because the engine's relative strengths (D interop / E ecosystem) sit in the smaller categories that get upweighted. Use this only if you believe "interop" and "ecosystem" each matter as much as "authoring" wholesale.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): kymo 6.67/10 vs jBPM 5.40/10 — a 1.3-point / 13-pp gap *on the rendering/authoring lens only*.** It is not a verdict on jBPM as a whole.
- **Cross-category caveat.** This matrix views a process-**execution** toolkit through kymo's diagram-rendering-and-authoring lens; a high kymo number does **not** mean kymo is "better than" jBPM — jBPM executes BPMN processes and business rules with full token semantics, kymo only renders static diagrams and cannot execute anything. The single number reflects overlap on visualisation/authoring only; the real signal lives in §2 and §4.
- **Strategic shape.** kymo leads on what it *owns* (text source, layout/routing); jBPM leads on what a long-lived standard *enables* (BPMN+rules interchange, embeddable API) and on two decades of maturity. Invest in owned surface, study the separate-concerns and stable-core discipline for ideas (§2.2, §2.3).
- **Don't over-read the close C/D gaps.** jBPM's edges there come from a *standardised executable notation* and a real engine API; kymo's matching totals come from a broader-but-bespoke icon set and one-way exporters. Different kinds of capability.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo gains PNG/PDF output (D1) or its exporters become bidirectional (D2).
2. kymo documents a stable model/serialisation or interchange format (D2, D3).
3. kymo's icon catalog or an arbitrary-asset escape hatch expands meaningfully (C2).
4. kymo ships authoring aids — an LSP, formatter, or visual editor (would shift A3, E).
5. Upstream jBPM/KIE changes its platform model, licensing, or Kogito direction (E1, D3).

## 4. Open questions for kymo

These follow from the comparison and the borrowable ideas catalogued in [`jbpm.md`](jbpm.md):

1. **Are kymo's concerns staying cleanly separated?** jBPM keeps flow and decisions in distinct engines sharing a session. kymo's analogue — structure vs appearance vs layout — already exists; the open question is guarding that boundary as features land so the parts keep evolving independently.
2. **Is `model.py` being treated as the stable core?** jBPM's longevity came from a clean engine with churning tooling. Is kymo's model deliberately held stable while the SVG/WebP/Figma/Excalidraw back-ends are free to evolve?
3. **How heavy should the platform get?** jBPM's KIE platform is powerful but heavy — a cautionary point. kymo's value is being light; the question is what (if anything) should ever justify added platform weight.

## 5. Provenance

- Comparison subject: jBPM 7.x (KIE) with Kogito as the cloud-native successor, as documented at <https://www.jbpm.org/> on 2026-05-20.
- Factual basis for the jBPM column: [`jbpm.md`](jbpm.md).
- Factual basis for the kymo column: this repository's [`KYMO_DSL.md`](../KYMO_DSL.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]], cited where B3 is scored). The kymo cell scores follow the shared general-tool kymo column used across `docs/softwares/*.comparision.md` so kymo is judged consistently.
- Edits should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds.

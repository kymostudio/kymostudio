---
title: bpmn.io (bpmn-js) vs. kymo — Comparison
document_id: REF-BPMNIO-CMP-001
version: "1.0"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream bpmn.io (bpmn-js) major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - REF-BPMNIO-001
  - BPD-DGM-001
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn-io
  - bpmn-js
  - kymo
  - comparison
  - prior-art
  - svg-renderer
  - diagram-js
upstream:
  project: bpmn.io (bpmn-js)
  homepage: https://bpmn.io/
  repository: https://github.com/bpmn-io/bpmn-js
  license: bpmn.io license (core libraries MIT, with a "powered by bpmn.io" attribution)
  access_date: 2026-05-20
---

# bpmn.io (bpmn-js) vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-BPMNIO-CMP-001                                            |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-21                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline    |
| Access Date       | 2026-05-20                                                     |
| Parent Reference  | [`bpmn-io.md`](b.bpmn-io.md)                                     |
| Related Documents | `kymo-dsl/`, [`best-practices.md`](../diagrams/best-practices.md) |

This document isolates the **prior-art comparison** between [bpmn.io / bpmn-js](https://bpmn.io/) and kymo. The factual reference (architecture, the diagram-js/bpmn-moddle split, BPMN DI, embedding) lives in [`bpmn-io.md`](b.bpmn-io.md); read that first if you need ground truth on how bpmn-js actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream bpmn-js does not. Of all the BPMN tools surveyed, bpmn-js is the **closest analogue to kymo's renderer** — a client-side, SVG-based engine that turns a model into a diagram — so many axes below are unusually like-for-like (an interactive browser modeler vs a static text-to-SVG pipeline). Read §2 and §4 before the scores.

## 1. At-a-glance matrix

| Axis | bpmn-js | kymo |
|------|---------|------|
| Primary purpose | View **and edit** BPMN models in the browser | Render static architecture diagrams from a text DSL |
| Notation | BPMN 2.0 (fixed, standardised) | kymo's own `.kymo` DSL |
| Input | BPMN 2.0 XML (+ DI) | `.kymo` source text |
| Implementation | JavaScript (browser-first) | Python renderer + JS data-model port |
| Interactivity | Full: drag, edit, undo/redo, palette | None — static SVG / animated SVG / WebP |
| Layout | Manual (author-placed), preserved via DI | Computed by kymo's layout engine |
| Extensibility | DI module system (diagram-js) | Hand-coded renderer; no plugin surface |
| Model/diagram split | Explicit (bpmn-moddle + BPMN DI) | Single in-memory `model.Diagram`; layout derived |
| License | bpmn.io license (MIT + attribution) | Apache-2.0 |

## 2. Headline tradeoffs

### 2.1 The closest analogue to kymo's renderer

Both bpmn-js and kymo are, at heart, engines that turn a model into an SVG diagram — that is what makes this the most like-for-like comparison in the folder. The split is in *what surrounds* the engine. bpmn-js is interactive and browser-first: it edits in place, records hand-placed positions as BPMN DI, and ships a whole canvas (selection, snapping, palette, undo/redo). kymo is a static, headless pipeline: text in, SVG/WebP out, layout computed every time. Where draw.io or Bizagi differ from kymo by being WYSIWYG canvases, bpmn-js differs mainly by being *interactive and standardised* rather than *static and bespoke* — the renderer cores are siblings.

### 2.2 A notation-agnostic core (the diagram-js split)

bpmn-js's biggest architectural lesson is the **diagram-js / bpmn-moddle split**: a notation-agnostic "draw shapes + route edges on a canvas" core, with the BPMN-specific mapping layered on top. kymo's renderer mixes shape geometry, layout, and architecture semantics in one place. Isolating a kymo equivalent of diagram-js would make alternate front-ends (a future web editor) feasible without rewriting the renderer — and it is the precondition for several of the open questions in §4.

### 2.3 Model ↔ layout separation (BPMN DI)

bpmn-js keeps the *model* (elements, flows) distinct from the *diagram* (shape bounds, edge waypoints) via BPMN DI, exactly as the OMG spec prescribes. kymo derives layout every render and stores nothing. Storing computed layout as a sidecar would let users hand-tune positions without editing the DSL — the same payoff DI gives BPMN tools — at the cost of a second artefact to keep in sync. This is the cleanest path to "mostly automatic, occasionally hand-nudged" layout.

### 2.4 Headless SVG and extensibility

Because bpmn-js rendering is just SVG-in-DOM, it runs server-side with a DOM shim to snapshot diagrams in CI — a clean model for deterministic rendering that kymo already approximates by being headless from the start. Separately, bpmn-js's DI/module system (custom renderers per shape, viewer-vs-modeler entry points) lets the toolkit grow shape families and ship less code on the read-only path without forking the core. A modest hook system would let kymo grow shape families without renderer edits.

### 2.5 Interop and ecosystem are bpmn-js's lead

bpmn-js round-trips standard BPMN 2.0 XML losslessly (D2), embeds as a real editor with a mature module ecosystem and Camunda backing (D3, E2), and is the de-facto web BPMN renderer. These are the categories where it clearly leads kymo — and, as §3.6.3 shows, they are concentrated enough that the weighting choice flips the headline.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension. Because bpmn-js is an interactive browser modeler rather than a diagram-as-code language, the rubric is the **general-tool** adaptation of the five categories used in [`diagrams.mingrammer.comparision.md`](b.diagrams.mingrammer.comparision.md): A Authoring & Source, B Layout & Rendering, C Scope & Iconography, D Output & Interop, E Cost/Deployment & Ecosystem. The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats.** Scores for `kymo` reflect what is observable in this repo as of 2026-05-21 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the layout-tree + Figma/Excalidraw exporters) and are held **consistent across every general-tool comparison in `docs/tools/`** so kymo is judged the same way each time. Scores for `bpmn-js` reflect upstream bpmn-js 18.16.1 as documented at <https://bpmn.io/> on 2026-05-20. The comparison is cross-model (interactive modeler vs DSL), so the **Why** column is load-bearing — read it, not the bare number.

### 3.1 Category A — Authoring & Source

| # | Criterion | bpmn-js | kymo | Why |
|---|-----------|:------:|:----:|-----|
| A1 | Text / diff / git-friendliness of source | 5 | 9 | BPMN 2.0 XML is text and diffable, but it is verbose machine-generated XML with embedded DI — reviewable in principle, painful in practice; kymo's `.kymo` is plain declarative text built for git. |
| A2 | Reproducibility & automation | 6 | 8 | bpmn-js can render headlessly from XML in CI; kymo regenerates SVG/WebP from terse source, with less to template. |
| A3 | Approachability / learning curve | 8 | 6 | bpmn-js is drag-and-drop in the browser with a guided palette; kymo asks the user to learn a small DSL. |
| A4 | Grouping / container semantics | 7 | 7 | bpmn-js's pools/lanes carry standardised BPMN semantics; kymo's typed `region` containers carry layout/styling meaning. A wash, different vocabularies. |
| | **Category total / 40** | **26** | **30** | **kymo +4** — terser, more reviewable source despite bpmn-js's XML being technically text. |

### 3.2 Category B — Layout & Rendering

| # | Criterion | bpmn-js | kymo | Why |
|---|-----------|:------:|:----:|-----|
| B1 | Default layout quality | 6 | 8 | bpmn-js preserves author-placed positions (DI); there is no first-class auto-layout. kymo's first-party engine is tuned for architecture diagrams. |
| B2 | User layout control | 7 | 8 | bpmn-js gives interactive pixel-level control via the canvas; kymo's layout-tree DSL is expressive but computed, not hand-placed. |
| B3 | Edge / flow routing aesthetic | 7 | 10 | bpmn-js routes sequence flows cleanly and lets users re-waypoint; kymo defaults to the H-V-H midpoint Z the team specified ([[feedback-kymo-edge-routing]]). |
| B4 | Styling / themes / animation | 5 | 6 | bpmn-js renders standardised BPMN styling with custom-renderer hooks but no animation; kymo has animated SVG/WebP but no theme system. |
| | **Category total / 40** | **25** | **32** | **kymo +7** — owned routing + auto-layout vs bpmn-js's DI-preserved manual placement. |

### 3.3 Category C — Scope & Iconography

| # | Criterion | bpmn-js | kymo | Why |
|---|-----------|:------:|:----:|-----|
| C1 | Scope / notation breadth | 5 | 4 | bpmn-js covers the full BPMN 2.0 element set (and the family adds DMN/CMMN), but only those notations; kymo draws architecture/block diagrams only. Both narrow. |
| C2 | Icon / shape catalog | 4 | 5 | bpmn-js renders the standardised BPMN symbol set, not an extensible icon library; kymo's file-backed `icons/` set is architecture-tuned and slightly broader within its niche. |
| | **Category total / 20** | **9** | **9** | **tie** — both are deliberately narrow, single-notation tools. |

### 3.4 Category D — Output & Interop

| # | Criterion | bpmn-js | kymo | Why |
|---|-----------|:------:|:----:|-----|
| D1 | Output-format breadth | 6 | 6 | bpmn-js exports SVG and (headlessly) PNG; kymo is SVG-first plus animated WebP and Figma/Excalidraw (no PNG/PDF yet). A wash. |
| D2 | Round-trip / data interchange | 8 | 5 | bpmn-js round-trips standard BPMN 2.0 XML + DI losslessly — best-in-class interchange; kymo's exporters are one-way with no standard interchange format. |
| D3 | Embeddability / API | 9 | 6 | bpmn-js is purpose-built to embed as a browser viewer/editor with a rich module API; kymo is a Python module + JS port (no service/embeddable editor). |
| | **Category total / 30** | **23** | **17** | **bpmn-js +6** — lossless interchange and a first-class embeddable API are its core strengths. |

### 3.5 Category E — Cost, Deployment & Ecosystem

| # | Criterion | bpmn-js | kymo | Why |
|---|-----------|:------:|:----:|-----|
| E1 | License, cost & self-host/offline | 8 | 9 | bpmn-js is open (core MIT) and runs fully client-side, but carries a "powered by bpmn.io" attribution waivable only commercially; kymo is Apache-2.0 with no attribution string. |
| E2 | Community / maturity | 8 | 3 | bpmn-js is the de-facto web BPMN renderer with Camunda backing and a large ecosystem; kymo is an early in-house tool. |
| | **Category total / 20** | **16** | **12** | **bpmn-js +4** — maturity and ecosystem, lightly offset by kymo's cleaner license. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `bpmn-js` | **99** | **6.60** | **66 %** |
| `kymo`    | **100** | **6.67** | **67 %** |
| Gap (kymo − bpmn-js) | 1 | 0.07 | 1 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | bpmn-js | kymo | Δ (kymo − bpmn-js) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — Authoring & Source        | 4 | 40 | 26 | 30 | **+4**  |
| B — Layout & Rendering        | 4 | 40 | 25 | 32 | **+7**  |
| C — Scope & Iconography       | 2 | 20 | 9  | 9  | **0**   |
| D — Output & Interop          | 3 | 30 | 23 | 17 | **−6**  |
| E — Cost, Deployment & Ecosys | 2 | 20 | 16 | 12 | **−4**  |
| **Overall**                   | **15** | **150** | **99** | **100** | **+1** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `bpmn-js` | 6.50 | 6.25 | 4.50 | 7.67 | 8.00 | **6.58** | **66 %** |
| `kymo`    | 7.50 | 8.00 | 4.50 | 5.67 | 6.00 | **6.33** | **63 %** |
| Gap | | | | | | 0.25 | **3 pp** |

**This is a flip.** Under equal-per-criterion (§3.6.1) kymo leads by a hair (6.67 vs 6.60, 67 % vs 66 %). Under equal-per-category the result *reverses*: bpmn-js edges ahead (6.58 vs 6.33). The reason is structural, not a scoring error: bpmn-js's strengths — interop (D3 = 9) and ecosystem (E) — sit in the **small** categories (D has 3 criteria, E has 2), so giving every category an equal one-fifth say **upweights** exactly where bpmn-js is strongest, while diluting kymo's big four-criterion authoring/layout wins (A, B) to the same one-fifth. Which number you trust depends on whether you think "output & interop" and "ecosystem" each deserve as much say as "authoring" wholesale; for kymo's target user (an engineer in a repo) the per-criterion number (§3.6.1) is the honest one — and even there it is effectively a tie.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): kymo 6.67/10 vs bpmn-js 6.60/10 — a 0.07-point / 1-pp dead heat.** This is the most evenly matched comparison in the folder, fitting because the two renderer cores are siblings.
- **Strategic shape.** kymo leads on what it *owns* (text source, layout/routing); bpmn-js leads on what it has *built and accumulated* (lossless interchange, an embeddable API, a Camunda-backed ecosystem). The weighting flip (§3.6.3) is the cleanest illustration in the folder of why category-size matters.
- **Cheapest moves on the board:** the architectural lessons (a diagram-js-style core, a DI sidecar for layout, a per-shape renderer hook) cost design effort, not catalog accumulation, and unlock D3 and B over time.
- **Don't chase BPMN scope (C1).** bpmn-js's standardised notation is a different product. kymo's value is a tight architecture-diagram look from text — protect that.
- **Cross-model caveat:** D2 (interchange) and D3 (embeddable API) are real bpmn-js leads, but they are also the most decomposable into kymo lessons rather than features to copy wholesale.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo factors out a notation-agnostic rendering core or gains an interactive/embeddable target (D3, A3).
2. kymo stores layout as a DI-style sidecar so positions can be hand-tuned (B2) or its exporters become bidirectional (D2).
3. kymo adds a per-shape renderer hook / module system (B4, C2).
4. kymo gains PNG/PDF output (D1) or a theme system (B4).
5. Upstream bpmn-js changes its license/attribution terms, layout behaviour, or interchange surface (E1, B, D2).

## 4. Open questions for kymo

These follow from the comparison and the borrowable ideas catalogued in [`bpmn-io.md`](b.bpmn-io.md):

1. **Should kymo factor out a diagram-js-style core?** Isolating a notation-agnostic "draw shapes + route edges" layer from the kymo-specific mapping is the precondition for a future web editor and for per-shape extensibility.
2. **A viewer/modeler split?** If kymo ever gains an interactive web target, a read-only path that ships less code (bpmn-js's `NavigatedViewer` vs `Modeler`) is a clean shape to copy.
3. **Store layout as a sidecar (BPMN DI analogue)?** Persisting computed positions would let users hand-nudge a diagram without editing the DSL, at the cost of keeping a second artefact in sync.
4. **A headless rendering contract for CI.** kymo is already headless; documenting it as bpmn-js documents its DOM-shim snapshot path would make deterministic CI rendering a first-class promise.
5. **A modest module/hook system?** A custom-renderer-per-shape hook would let kymo grow shape families without renderer edits — the smallest slice of diagram-js's extensibility worth borrowing.

## 5. Provenance

- Comparison subject: bpmn.io / bpmn-js 18.16.1 as documented at <https://bpmn.io/> on 2026-05-20.
- Factual basis for the bpmn-js column: [`bpmn-io.md`](b.bpmn-io.md).
- Factual basis for the kymo column: this repository's `kymo-dsl/`, [`best-practices.md`](../diagrams/best-practices.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]]). The kymo cell scores follow the shared general-tool kymo column used across `docs/tools/*.comparision.md` so kymo is judged consistently.
- Edits should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds.

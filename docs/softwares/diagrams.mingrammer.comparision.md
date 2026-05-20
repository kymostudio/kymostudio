---
title: diagrams (mingrammer) vs. kymo — Comparison
document_id: REF-DIAGRAMS-MINGRAMMER-CMP-001
version: "1.1"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the `kymo` DSL, layout engine, or render pipeline
review_cycle: On upstream `diagrams` major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - diagrams.mingrammer.md
  - d2.md
  - figma.md
  - ../DSL.md
  - ../BEST_PRACTICE_DIAGRAMS.md
authors:
  - Vũ Anh
language: en
keywords:
  - diagrams
  - mingrammer
  - kymo
  - comparison
  - prior-art
  - dsl-tradeoffs
  - layout-engine
upstream:
  project: mingrammer/diagrams
  homepage: https://diagrams.mingrammer.com/
  repository: https://github.com/mingrammer/diagrams
  license: MIT
  access_date: 2026-05-18
---

# diagrams (mingrammer) vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-DIAGRAMS-MINGRAMMER-CMP-001                                |
| Version           | 1.1                                                            |
| Issue Date        | 2026-05-21                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the `kymo` DSL, layout, or render pipeline   |
| Access Date       | 2026-05-18                                                     |
| Parent Reference  | [`diagrams.mingrammer.md`](diagrams.mingrammer.md)             |
| Related Documents | [`d2.md`](d2.md), [`figma.md`](figma.md), [`DSL.md`](../DSL.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md) |

This document isolates the **prior-art comparison** between `mingrammer/diagrams` and kymo. The factual reference (overview, install, primitives, verbatim examples) lives in [`diagrams.mingrammer.md`](diagrams.mingrammer.md); read that first if you need ground truth on how `diagrams` actually behaves.

The comparison is here so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream `diagrams` does not.

## 1. At-a-glance matrix

| Dimension                | `mingrammer/diagrams`                                  | `kymo`                                                       |
|--------------------------|--------------------------------------------------------|-------------------------------------------------------------|
| DSL surface              | Host-language Python (classes + overloaded operators)  | External grammar with its own parser                        |
| Source file shape        | `.py`, executed by CPython                             | `.diagram`, parsed by kymo                       |
| Grouping primitive       | `Cluster` only (unlabeled-kind, unbounded nesting)     | Multiple container kinds (`region`, …) carrying semantics   |
| Edge routing             | Whatever Graphviz `dot` produces                       | Owned pipeline; default H-V-H midpoint Z-shape ([[feedback-kymo-edge-routing]]) |
| Edge styling             | `Edge(color=…, style=…, label=…)` sidecar in operator chain | Native to the DSL                                       |
| Icon catalog             | Wide first-party (AWS/GCP/Azure/K8s/OnPrem/…)          | Project-managed (`icons/`) + Figma/Excalidraw exporters     |
| Icon escape hatch        | `Custom("name", "path/to.png")`                        | TBD — see §3.3                                              |
| Output formats           | `png`, `jpg`, `svg`, `pdf`, `dot` (Graphviz-bound)     | SVG-first; Figma/Excalidraw exporters in tree               |
| Layout engine            | Outsourced to Graphviz `dot`                           | First-party                                                 |
| Round-trip with editor   | None (source is Python, output is an image)            | Figma/Excalidraw exporters provide a one-way bridge today   |
| Tooling beyond CPython   | None — Python is the only entry point                  | Possible, because the DSL is external                       |

## 2. Headline tradeoffs

### 2.1 Host-language DSL vs. external grammar

`diagrams` makes Python *be* the DSL. The wins are real: free `for` loops (used in [`diagrams.mingrammer.md` §4.6](diagrams.mingrammer.md#46-stateful-architecture-on-kubernetes) to generate per-replica pods), free conditionals, pip/poetry/uv for package management, and IDE completion via existing Python tooling.

The costs are equally real:

- **Operator-precedence footguns.** `-` binds tighter than `>>`/`<<`, so `a - b >> c` does not mean what it reads like. Upstream documents this and tells users to parenthesise; it is a permanent tax on every chain that mixes undirected and directed edges.
- **No list-to-list edges.** `[a, b] >> [c, d]` is a Python `TypeError` — list multiplication is not what the user wants, and the library can't override `list.__rshift__`. Users must thread through a singleton.
- **No non-Python tooling.** A linter, a formatter, a visual editor, a language server — none of them can exist without re-implementing a Python parser or shelling out to CPython.
- **No round-trip with visual editors.** The "source" is an imperative program; you cannot deterministically reconstruct it from a rendered image.

Kymo's external grammar inverts these tradeoffs: it pays for its own parser and tooling once, and in return gets a syntax it controls (no inherited precedence rules), the option of multiple front-ends, and the basis for round-tripping with editors like Figma/Excalidraw.

### 2.2 Layout outsourced vs. owned

`diagrams` does **no** layout. Everything is handed to Graphviz `dot`, which is why output is recognisable on sight and why edges take the orthogonal-but-non-Z paths Graphviz prefers. Kymo cannot adopt the H-V-H midpoint Z default ([[feedback-kymo-edge-routing]]) without owning the layout pipeline, which it does.

The implication for kymo: the layout engine is a load-bearing differentiator. If we ever consider replacing it with a generic engine (Graphviz, ELK, Dagre), the Z-shape default and any other routing/spacing decisions need to be re-justified against what the new engine can produce.

### 2.3 Catalog breadth as the actual product

Most `diagrams` adoption comes from the **node catalog**, not the language. AWS/Azure/GCP/IBM/OCI/OpenStack/AlibabaCloud/DigitalOcean/K8s/Firebase/Elastic/OnPrem/Generic/Programming/SaaS/C4/Custom/GIS — that breadth is the moat.

Kymo will not match that catalog on its own and should not try to. Two practical consequences:

1. **A `Custom`-equivalent is table stakes.** Without an icon escape hatch (load arbitrary PNG/SVG by path), every gap in the first-party catalog becomes a hard "kymo can't draw that" — which is the failure mode `diagrams` solved with [`Custom`](diagrams.mingrammer.md#35-custom).
2. **The Figma/Excalidraw exporters are the real catalog story.** They let users source iconography from environments that already have it, which is a different — and probably better — bet than building a competing catalog in tree.

### 2.4 `Cluster` minimalism vs. semantic containers

`Cluster` in `diagrams` is one thing: an unlimited-depth labeled box. No kind, no role, no semantics — it draws a rectangle around its contents. Simplicity is the feature.

Kymo's container vocabulary (`region`, …) trades that simplicity for **semantic precision**: the layout engine can choose spacing/styling decisions based on the container kind, which `Cluster` cannot. The cost is a larger learning surface; the upside is that the renderer can do more without per-call configuration.

### 2.5 Edge decoration via a sidecar object

`Edge(color=…, style=…, label=…)` injected mid-chain ([`diagrams.mingrammer.md` §4.8](diagrams.mingrammer.md#48-advanced-web-service-with-on-premises-colored)) is a clean way to attach attributes without bloating operators. If kymo grows per-edge styling, this is a strong shape to copy: keep the connection operator pure, attach attributes via an explicit object.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension. Scores are organised into five categories (`hạng mục`) so the strategic shape — *which* areas each tool dominates — reads at a glance. The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats.** Scores for `kymo` reflect what is observable in this repo as of 2026-05-21 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the recent layout-tree + Figma/Excalidraw exporter commits). Where a capability is not yet built, the score reflects today, not the design intent — rescore when the gap closes. Scores for `diagrams` reflect upstream as documented at <https://diagrams.mingrammer.com/> on the same date. The **Why** column is load-bearing; numbers without it are worthless — do not strip.

### 3.1 Category A — DSL & Syntax

How the user writes a diagram, how safe that writing is, and what the source can express. `diagrams` borrows Python wholesale, which is a strength for power and a weakness for safety. kymo controls its grammar, which inverts both.

| # | Criterion | diagrams | kymo | Why |
|---|-----------|:--------:|:---:|-----|
| A1 | Concision on small diagrams | 9 | 7 | `diagrams` chains like §4.5 of [diagrams.mingrammer.md](diagrams.mingrammer.md#45-exposed-pod-with-3-replicas-on-kubernetes) are hard to beat for line-count; kymo is clean but slightly more verbose. |
| A2 | Safety (no precedence footguns) | 4 | 9 | `diagrams` inherits Python's `-` vs `>>` precedence pitfall and forbids list-to-list (`TypeError`); kymo's external grammar designs around both. |
| A3 | Extensibility (loops, conditionals) | 10 | 3 | `for`/`if`/any-library come free in `diagrams` (§4.6); kymo has no host-language escape today. |
| A4 | Grouping/container semantics | 6 | 7 | `Cluster` is a labeled box with no kind; kymo's typed containers drive layout/styling decisions, though the surface is still settling (keyword cleanup in `d271d08`). |
| | **Category total / 40** | **29** | **26** | **diagrams +3** — narrow edge. `diagrams` wins on power and concision; kymo wins on safety and semantics. |

### 3.2 Category B — Layout & Edges

What the rendered diagram actually looks like, and how much control the user has over routing/styling. This is kymo's strongest category, by a clear margin.

| # | Criterion | diagrams | kymo | Why |
|---|-----------|:--------:|:---:|-----|
| B1 | Default layout quality | 6 | 8 | Graphviz `dot` is competent but generic; kymo's first-party engine tunes for architecture diagrams. |
| B2 | User layout control | 4 | 8 | `graph_attr`/`node_attr`/`edge_attr` are escape hatches into Graphviz; kymo exposes a first-class layout-tree DSL (`67f2c10`). |
| B3 | Edge routing aesthetic | 3 | 10 | Graphviz's orthogonal mode is not the H-V-H midpoint Z the team wants ([[feedback-kymo-edge-routing]]); kymo defaults to it. |
| B4 | Edge styling (color/style/label) | 7 | 5 | `Edge(color=…, style=…, label=…)` mid-chain is a clean idiom; kymo has labels but a smaller styling surface today. |
| | **Category total / 40** | **20** | **31** | **kymo +11** — clearest strategic moat. Owning the layout engine pays back here. |

### 3.3 Category C — Icons & Catalog

The single hardest category to close, and the main reason `diagrams` has the mainstream gravity it does.

| # | Criterion | diagrams | kymo | Why |
|---|-----------|:--------:|:---:|-----|
| C1 | First-party catalog breadth | 10 | 3 | AWS/Azure/GCP/IBM/OCI/OpenStack/AlibabaCloud/DigitalOcean/K8s/Firebase/Elastic/OnPrem/SaaS/Programming/C4/GIS vs. a single project-managed `icons/`. |
| C2 | Icon escape hatch (arbitrary asset) | 10 | 3 | `Custom("name", "path.png")` works today (§4.9); kymo has no documented equivalent yet — see §4 Open Questions. |
| | **Category total / 20** | **20** | **6** | **diagrams +14** — biggest deficit. C2 is the cheapest fix; C1 isn't worth chasing in-tree (lean on Figma/Excalidraw exporters instead). |

### 3.4 Category D — Output & Interop

What you can do with the rendered artefact and who else can read your source.

| # | Criterion | diagrams | kymo | Why |
|---|-----------|:--------:|:---:|-----|
| D1 | Output format breadth | 8 | 6 | `diagrams` emits `png`/`jpg`/`svg`/`pdf`/`dot` and supports multi-emit; kymo is SVG-first with Figma/Excalidraw exporters. |
| D2 | Round-trip with visual editors | 2 | 6 | `diagrams` is source-to-image only; kymo's Figma/Excalidraw exporters are one-way today but provide a real bridge. |
| D3 | Cross-language portability | 3 | 8 | `diagrams` is hard-bound to CPython; kymo's external grammar is consumable by any front-end that ships a parser. |
| | **Category total / 30** | **13** | **20** | **kymo +7** — pays back for owning the grammar and shipping exporters. Bidirectional exporters would push D2 toward 9. |

### 3.5 Category E — Tooling & Ecosystem

The unsexy category that decides adoption velocity. `diagrams` benefits from years of being a Python library; kymo is early.

| # | Criterion | diagrams | kymo | Why |
|---|-----------|:--------:|:---:|-----|
| E1 | LSP / IDE / formatter / pkg manager | 10 | 3 | `diagrams` inherits CPython tooling (LSP, pip/poetry/uv, formatters); kymo's bespoke chain is early. |
| E2 | Maintenance / community gravity | 10 | 3 | Years of adoption and catalog contributions vs. an early in-house tool — a fact of project age, not a knock. |
| | **Category total / 20** | **20** | **6** | **diagrams +14** — second-biggest deficit. Compounds with C1: a wide catalog without good tooling, or vice versa, is much less attractive. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals below are shown for *shape*, not for weighting — they have different maxima only because categories contain different numbers of criteria.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `diagrams` | **102** | **6.80** | **68 %** |
| `kymo`      | **89**  | **5.93** | **59 %** |
| Gap (diagrams − kymo) | 13 | 0.87 | 9 pp |

This is the headline number under the user-specified weighting: each criterion contributes the same. The arithmetic is the unweighted mean of the 15 cells per column.

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | diagrams | kymo | Δ (kymo − diagrams) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — DSL & Syntax        | 4 | 40 | 29 | 26 | **−3**  |
| B — Layout & Edges      | 4 | 40 | 20 | 31 | **+11** |
| C — Icons & Catalog     | 2 | 20 | 20 | 6  | **−14** |
| D — Output & Interop    | 3 | 30 | 13 | 20 | **+7**  |
| E — Tooling & Ecosystem | 2 | 20 | 20 | 6  | **−14** |
| **Overall**             | **15** | **150** | **102** | **89** | **−13** |

#### 3.6.3 Sensitivity: what if categories were weighted equally instead?

If each *category* — not each criterion — were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `diagrams` | 7.25 | 5.00 | 10.00 | 4.33 | 10.00 | **7.32** | **73 %** |
| `kymo`      | 6.50 | 7.75 | 3.00  | 6.67 | 3.00  | **5.38** | **54 %** |
| Gap | | | | | | 1.94 | **19 pp** |

Switching to equal-per-category roughly *doubles* the gap (9 pp → 19 pp) because the two small categories where `diagrams` dominates (C and E, 2 criteria each) get the same say as the larger ones. Use this number only if you genuinely believe "catalog" and "tooling" each matter as much as "DSL" as a whole — for most kymo readers, the per-criterion number (§3.6.1) is the honest one.

#### 3.6.4 Read it this way

- **Headline under equal-per-criterion weighting (§3.6.1): diagrams 6.80/10 vs kymo 5.93/10 — a 0.87-point / 9-pp gap.** Close enough that category-level shape matters more than the single number.
- **Strategic shape.** kymo's wins (B, D) come from things it *owns* (the layout engine and the grammar). kymo's losses (C, E) come from things you can only *accumulate* (catalog content and community-years). That asymmetry argues for: invest more in owned surface, lean on external surface for the rest.
- **Cheapest move on the board:** criterion C2 — ship a `Custom`-equivalent. Worth roughly **+0.3 points on the mean** (≈ +5 in the C2 cell, ÷ 15) and it removes the only category where kymo has a *capability* gap rather than an *accumulation* gap.
- **Hardest gaps:** C1 and E2 reward time more than effort. The right response is the Figma/Excalidraw exporter story (D2), which lets kymo borrow iconography and community rather than re-grow them in tree.
- **Category A is no longer a tie on the finer scale.** `diagrams` wins it 29–26 because Python's host-language extensibility (A3: 10 vs 3) outweighs kymo's safety + semantics edges. For the kinds of diagrams this repo targets, A2 and A4 matter more than A3 — adjust your interpretation accordingly even though the equal-weighting rule doesn't.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — partial updates are fine, but flag the date and which criteria moved:

1. kymo lands an icon escape hatch (C2) or expands the in-tree catalog meaningfully (C1).
2. kymo adds host-language interop — a macro/repeat construct or a Python binding (A3).
3. kymo ships an LSP, formatter, or VS Code extension (E1).
4. kymo's exporters become bidirectional, Figma/Excalidraw → kymo (D2).
5. Upstream `diagrams` swaps layout engines or grows a per-edge layout DSL (B1, B2, B3).
6. Upstream `diagrams` adds a non-Python front-end (D3).

## 4. Open questions for kymo

These follow directly from the comparison above and are not answered by current kymo docs:

1. **Does kymo need a Python binding façade?** A Python front-end would inherit `diagrams`'s operator-precedence pitfalls but pick up its tooling ecosystem. Worth a write-up before committing either way.
2. **What is kymo's `Custom` story?** Inline image path? Reference to an `icons/` entry? Both? See §2.3 — gating this much longer means every catalog gap reads as a tool limitation.
3. **Do we ever want to emit Graphviz `dot` as an output format?** It is the lowest-friction path to interoperate with the long tail of Graphviz-aware tooling, and would not commit us to using `dot` for layout.

## 5. Provenance

- Comparison subject: `mingrammer/diagrams` as documented at <https://diagrams.mingrammer.com/> on 2026-05-18.
- Factual basis for the `diagrams` column: [`diagrams.mingrammer.md`](diagrams.mingrammer.md).
- Factual basis for the `kymo` column: this repository's [`DSL.md`](../DSL.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md), the `packages/python/src/kymo/` tree, and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]]).
- Edits to this document should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds.

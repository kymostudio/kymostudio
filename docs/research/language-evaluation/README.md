---
title: Language Evaluation — Criteria & Methodology (Research)
document_id: RES-LANG-EVAL-001
version: "1.0"
issue_date: 2026-05-23
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evaluating any language / DSL / notation; authors of tool comparisons under docs/; engineers evolving kymo
review_cycle: On a change to the rubric, or annually (whichever first)
supersedes: null
related_documents:
  - RES-MERMAID-D2-001
  - REF-D2-CMP-001
  - REF-D2-001
  - KYMO-DSL-001
  - BPD-DGM-001
authors:
  - Vũ Anh
language: en
keywords:
  - language-evaluation
  - programming-languages
  - dsl
  - notation
  - cognitive-dimensions
  - iso-25010
  - rubric
  - methodology
  - diagram-as-code
references:
  - "Sebesta, R.W. Concepts of Programming Languages — language evaluation criteria (readability, writability, reliability, cost)."
  - "Green, T.R.G. & Petre, M. (1996). Usability analysis of visual programming environments: a 'cognitive dimensions' framework. J. Visual Languages & Computing 7(2): 131–174."
  - "Blackwell, A. & Green, T. (2000). A Cognitive Dimensions questionnaire optimised for users."
  - "Karsai, G. et al. (2009/2014). Design Guidelines for Domain Specific Languages. arXiv:1409.2378."
  - "Mernik, M., Heering, J. & Sloane, A.M. (2005). When and how to develop domain-specific languages. ACM Computing Surveys 37(4): 316–344."
  - "Kosar, T., Oliveira, N., Mernik, M. et al. (2010). Comparing general-purpose and domain-specific languages: an empirical study. ComSIS 7(2)."
  - "Fowler, M. (2010). Domain-Specific Languages. Addison-Wesley."
  - "ISO/IEC 25010:2011 (rev. 2023) — Systems and software Quality Requirements and Evaluation (SQuaRE)."
---

# Language Evaluation — Criteria & Methodology (Research)

| Field             | Value                                                                  |
|-------------------|------------------------------------------------------------------------|
| Document ID       | RES-LANG-EVAL-001                                                     |
| Version           | 1.0                                                                   |
| Issue Date        | 2026-05-23                                                            |
| Status            | Released                                                              |
| Classification    | Internal                                                             |
| Audience          | Anyone evaluating a language / DSL / notation; authors of tool comparisons under `docs/` |
| Related Documents | `RES-MERMAID-D2-001`, `REF-D2-CMP-001`, `REF-D2-001`, `KYMO-DSL-001`, `BPD-DGM-001` |

This is a **research note on evaluation methodology** — it defines *how* to judge a **language** (a programming language, a domain-specific language, or a notation), grounded in the published literature. It is **general first**: §2–§4 give a language-agnostic framework; §5 then shows the recipe for *specializing* it to a domain, worked through for the **diagram-as-code** languages this repo compares (Mermaid, D2, kymo, …). It is not a comparison of any specific tool, nor a spec of kymo. Its job is to give every comparison under `docs/` one defensible rubric so a score means the same thing across documents.

The existing per-tool comparisons (`REF-D2-CMP-001`, `RES-MERMAID-D2-001`) use ad-hoc category sets; this note is the **canonical rubric they should converge on**.

## 1. What "evaluating a language" means

A language is evaluated on how well it serves the people who **read**, **write**, and **maintain** artifacts in it, and on its qualities **as an implemented tool** (does it run everywhere, is it reliable, is there tooling). These split into two axes that recur throughout:

- **Notation axis** — properties of the language *as experienced by a human author*: readability, writability, error-proneness, the cost of changing what you wrote. Covered by classic PL criteria (§2.1) and the Cognitive Dimensions framework (§2.2).
- **Product axis** — properties of the language *as a piece of software*: implementation, portability, interoperability, performance, ecosystem. Covered by ISO/IEC 25010 (§2.4).

A recurring framing that decides which criteria bite: **internal vs external DSL** (Fowler 2010). An *internal* DSL rides a host language's syntax and inherits its tooling (e.g. a Python diagramming API); an *external* DSL has its own grammar and parser (Mermaid, D2, kymo) — it pays for its own tooling but controls its syntax, error messages, and portability. Mernik et al. (2005) is the standard reference on when an external DSL is worth that cost.

## 2. Foundations from the literature

### 2.1 Classic programming-language evaluation criteria

The traditional PL-design criteria (Sebesta and the broader PL-design tradition) give four top-level criteria and the language characteristics that drive them. They apply to *any* language, not just GPLs:

| Criterion | Driven by | Note |
|---|---|---|
| **Readability** | simplicity, orthogonality, expressive/​descriptive syntax, support for data types | How easily a reader understands an existing artifact. |
| **Writability** | simplicity & orthogonality, support for abstraction, expressivity | How easily an author expresses intent. |
| **Reliability** | type checking, exception/error handling, restricted aliasing, *and* readability + writability | Does the language prevent or invite faults. |
| **Cost** | training, authoring, compilation/render, execution, maintenance | Total cost of ownership across the lifecycle. |

A standing tension worth remembering: **readability and writability pull against each other** (terse, powerful constructs aid the writer but can hurt the reader), and reliability is partly *downstream* of both. A good rubric scores them separately rather than collapsing into "ergonomics".

### 2.2 Cognitive Dimensions of Notations (Green & Petre)

The **Cognitive Dimensions (CDs)** framework is the canonical lens for evaluating any notation — textual or visual — by how it supports the *activities* people perform (authoring, modifying, exploring, searching). It is descriptive: dimensions are trade-offs to reason about, not knobs to maximise. The 14 commonly-cited dimensions:

| Dimension | Meaning |
|---|---|
| **Viscosity** | Effort to make a small change. |
| **Visibility / juxtaposability** | Ability to view and compare relevant parts. |
| **Premature commitment** | Forced ordering of authoring decisions. |
| **Hidden dependencies** | Important links not visible where they matter. |
| **Role-expressiveness** | Whether an element's purpose is obvious. |
| **Error-proneness** | Whether the notation invites slips. |
| **Abstraction** | Availability of abstraction mechanisms. |
| **Secondary notation** | Meaning carried outside formal syntax (comments, layout). |
| **Closeness of mapping** | Distance from problem domain to notation. |
| **Consistency** | Similar things expressed similarly. |
| **Diffuseness / terseness** | Verbosity for a given meaning. |
| **Hard mental operations** | Cognitive load at the syntax level. |
| **Provisionality** | Freedom to sketch tentatively. |
| **Progressive evaluation** | Ability to check work-in-progress at any time. |

CDs ship with an **evaluation method**: an expert walkthrough or the *CD questionnaire* (Blackwell & Green 2000), run against representative authoring tasks.

### 2.3 DSL-specific design guidelines

For domain-specific languages, three references sharpen the general criteria:

- **Karsai et al. — "Design Guidelines for DSLs"**: ~26 guidelines in five categories — *Language Purpose*, *Language Realization*, *Language Content*, *Concrete Syntax*, *Abstract Syntax*. Load-bearing for a DSL review: "reflect only the necessary domain concepts", "adopt notations domain experts already use", "permit comments", "balance compactness and comprehensibility", "align abstract and concrete syntax".
- **Mernik et al. — "When and how to develop DSLs"**: the decision/analysis/design/implementation patterns — i.e. *whether* a DSL is justified, and which implementation route (embedding, preprocessing, compiler/interpreter) fits.
- **Kosar et al. (2010)** provide the *empirical* counterpart: controlled studies measuring that DSLs beat equivalent library/API code on comprehension and authoring effort — evidence that these criteria track real productivity, not just taste.

### 2.4 ISO/IEC 25010 product-quality model

For the language **as a software product**, ISO/IEC 25010 supplies eight characteristics. The ones that bear on a language/notation tool:

| ISO 25010 characteristic | Relevance |
|---|---|
| **Functional Suitability** | Can it express what users need, correctly and completely? |
| **Usability** | Author ergonomics; overlaps heavily with CDs and PL readability/writability. |
| **Compatibility** | Interoperability with other tools/formats. |
| **Portability** | Runs across environments; embeddable. |
| **Reliability** | Deterministic, reproducible behaviour from the same source. |
| **Maintainability** | Modularity; diff-friendly artifacts under version control. |
| **Performance Efficiency** | Throughput on large inputs. |
| **Security** | Relevant when an implementation fetches/executes remote content. |

ISO 25010 is the right vocabulary for the *product* axis that CDs and PL criteria deliberately ignore.

## 3. The general rubric (language-agnostic)

Seven categories that apply to **any** language. Each criterion names its **provenance**: `PL` = classic PL criterion (§2.1), `CD` = a Cognitive Dimension (§2.2), `K` = a Karsai category (§2.3), `ISO` = an ISO 25010 characteristic (§2.4).

### Category A — Readability & comprehension

| # | Criterion | Provenance |
|---|-----------|------------|
| A1 | Simplicity & minimal element count | PL, K (Content) |
| A2 | Orthogonality (features combine without special cases) | PL |
| A3 | Closeness of mapping to the domain | CD, K (Concrete Syntax) |
| A4 | Role-expressiveness (purpose of elements obvious) | CD |
| A5 | Consistency (similar things expressed similarly) | CD, PL |

### Category B — Writability & expressiveness

| # | Criterion | Provenance |
|---|-----------|------------|
| B1 | Expressivity (power per construct) | PL |
| B2 | Terseness / concision for a given meaning | CD (diffuseness) |
| B3 | Abstraction & reuse (variables, modules, includes) | CD (abstraction), PL, K |

### Category C — Authoring workflow (notation-in-use)

| # | Criterion | Provenance |
|---|-----------|------------|
| C1 | Viscosity — cost of small edits | CD |
| C2 | Premature commitment — forced authoring order | CD |
| C3 | Hidden dependencies — far-away effects | CD |
| C4 | Progressive evaluation / provisionality | CD, ISO (Usability) |
| C5 | Secondary notation (comments, layout, ordering) | CD, K |

### Category D — Domain fit & coverage

| # | Criterion | Provenance |
|---|-----------|------------|
| D1 | Coverage of the intended domain | K (Purpose), ISO (Functional Suitability) |
| D2 | Specialization depth vs unnecessary generality | K (Purpose/Content) |

### Category E — Reliability & safety

| # | Criterion | Provenance |
|---|-----------|------------|
| E1 | Error-proneness / parse & type safety | PL, CD |
| E2 | Error handling & diagnostics quality | PL, ISO (Reliability) |
| E3 | Determinism / reproducibility (same source → same result) | ISO (Reliability) |

### Category F — Implementation & product qualities

| # | Criterion | Provenance |
|---|-----------|------------|
| F1 | Portability / runs across environments | ISO (Portability) |
| F2 | Interoperability & output/format breadth | ISO (Compatibility) |
| F3 | Embeddability (library / SDK / host integration) | ISO (Portability), K (Realization) |
| F4 | Performance on large inputs | ISO (Performance) |
| F5 | Lifecycle cost (training, authoring, maintenance) | PL (cost) |

### Category G — Tooling & ecosystem

| # | Criterion | Provenance |
|---|-----------|------------|
| G1 | Editor support / LSP / formatter | ISO (Usability), K (Realization) |
| G2 | Community gravity & maintenance | ISO (proxy) |
| G3 | Documentation quality | ISO (Usability) |

## 4. Evaluation method

Score by **expert walkthrough against a fixed task set**, not by reading marketing pages. The recommended instruments:

1. **Fix a representative task set first** (e.g. for a query language: "join three tables with one aggregate and a filter"). Record it so re-scores are reproducible.
2. **Notation axis (A–C, E1):** run the CD questionnaire (Blackwell & Green 2000) or an expert heuristic walkthrough across the task set.
3. **Product axis (E2–F, G):** inspect the implementation, docs, and ecosystem against ISO 25010 characteristics.
4. **Where possible, corroborate empirically** (Kosar et al. style) — even an informal timing of two authors doing the same task beats opinion.
5. **Score on the 1–10 scale** in §6, equal weight per criterion by default, with an equal-weight-per-category sensitivity pass.
6. **Keep the `Why`.** A score without a one-line justification is not mergeable.

## 5. Specializing the rubric to a domain

The general rubric (§3) is the *base*. To evaluate a specific *kind* of language, **derive a domain rubric** by: (a) keeping the relevant base criteria, (b) adding domain-specific criteria the base misses, and (c) fixing a domain task set (§4.1). Below is that recipe worked through for the domain this repo cares about.

### 5.1 Applied specialization — diagram-as-code languages

A diagram-as-code tool is unusual because it is judged on **two surfaces at once**:

1. **The source language** — an external DSL the author reads/writes. Fully covered by §3.
2. **The rendered artifact** — a visual whose legibility, layout, and aesthetics decide whether it *communicates*. Crucially, this surface is often produced by a **layout engine separable from the language** (D2's Dagre/ELK/TALA; Mermaid's Dagre/ELK). **Output quality is therefore partly *not* a property of the language** — and must be scored separately and *attributed* to the engine that produced it.

The base rubric misses this output surface and a few as-code concerns. The **diagram-specific additions** (`★`):

| # | Criterion | Provenance |
|---|-----------|------------|
| H1 | Default layout quality | ★, ISO (Functional Suitability) |
| H2 | Layout controllability (engine choice, hints, grids) | ★ |
| H3 | Aesthetic consistency & edge-routing quality | ★ |
| H4 | Output-format breadth (SVG/PNG/PDF/animation) | ISO (Compatibility) |
| H5 | Native embedding / ubiquity (GitHub, Notion, …) | ★, ISO (Portability) |
| H6 | Diff-friendliness under version control | ★, ISO (Maintainability) |
| H7 | Output accessibility (ARIA / title / text-not-paths) | ★ |
| H8 | Round-trip / editor interop (Figma, Excalidraw, …) | ISO (Compatibility) |

> **Attribution rule for H1–H3.** When a score reflects a non-default engine, state which (e.g. "H1=8 via TALA"). A language must not be credited for an engine its users would not get by default. This is the precise sense in which the rendered surface is *partly not the language's*.

So the **diagram-as-code rubric = §3 categories A–G (collapsed as needed) + the H additions** above. The two existing comparisons are projections of exactly this:

- `RES-MERMAID-D2-001` §10 — six categories (DSL ergonomics, diagram-type breadth, layout quality, styling/theming, output/animation, embedding/ecosystem) = A+B+C, D, H1–H3, (B3/styling), H4, H5+G2 collapsed.
- `REF-D2-CMP-001` §3 — A–E (DSL & Syntax, Layout & Edges, Icons & Catalog, Output & Interop, Tooling & Ecosystem) = A+B+C, H1–H3, a kymo-relevant Icons specialization of D, H4/H8, G.

## 6. Scoring scale & weighting

Reuse the repo-wide 1–10 scale (identical to `REF-D2-CMP-001` §3) so numbers are comparable across documents:

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Weighting.** Default to **equal weight per criterion** (the honest baseline, as in `REF-D2-CMP-001` §3.6.1). Always also report an **equal-weight-per-category** sensitivity pass — small categories otherwise swing totals when a tool leads there. Report both; let the reader pick the lens.

## 7. How to use this (the methodology contract)

1. **Declare the rubric version.** A comparison should state "scored against `RES-LANG-EVAL-001` v1.0" so a later change is traceable.
2. **Pick base + specialization.** State which §3 categories apply and which domain additions (e.g. §5.1 `H*`) you included, and why any were dropped.
3. **Fix the task set first, then score** — and record it.
4. **Attribute engine-dependent scores** (Category H rule for diagrams; analogous for any language whose output depends on a separable backend).
5. **Separate notation from product.** Resist crediting a language for its ecosystem's reach (G2/H5) or a swappable backend (H1–H3).
6. **Keep the `Why`** — edits restate the trade-off, not just the conclusion.
7. **kymo's stance.** Evaluating prior art this way is not about chasing every high score: kymo deliberately optimises a *narrow* domain (animated architecture diagrams) — expect it to trail on D1/breadth and G2/ecosystem age by design, and lead on what it owns (edge routing H3, animation H4). See `REF-D2-CMP-001` §3.6.4 for the worked judgement.

## 8. References

Standard literature (the rubric's provenance):

- Sebesta, R.W. *Concepts of Programming Languages* — language evaluation criteria: readability, writability, reliability, cost, and their contributing characteristics.
- Green, T.R.G. & Petre, M. (1996). *Usability analysis of visual programming environments: a 'cognitive dimensions' framework.* Journal of Visual Languages & Computing 7(2): 131–174.
- Blackwell, A. & Green, T. (2000). *A Cognitive Dimensions questionnaire optimised for users.* — <https://www.cl.cam.ac.uk/~afb21/CognitiveDimensions/>
- Karsai, G., Krahn, H., Pinkernell, C., Rumpe, B., Schindler, M. & Völkel, S. (2009/2014). *Design Guidelines for Domain Specific Languages.* arXiv:1409.2378 — <https://arxiv.org/abs/1409.2378>
- Mernik, M., Heering, J. & Sloane, A.M. (2005). *When and how to develop domain-specific languages.* ACM Computing Surveys 37(4): 316–344.
- Kosar, T., Oliveira, N., Mernik, M. et al. (2010). *Comparing general-purpose and domain-specific languages: an empirical study.* Computer Science and Information Systems 7(2).
- Fowler, M. (2010). *Domain-Specific Languages.* Addison-Wesley. (internal vs external DSL; semantic model)
- ISO/IEC 25010:2011 (rev. 2023). *Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models.* — <https://iso25000.com/index.php/en/iso-25000-standards/iso-25010>

In-repo documents that apply this rubric (cite by `document_id`):

- `RES-MERMAID-D2-001` — Mermaid vs D2 language comparison (uses the §5.1 diagram specialization, collapsed).
- `REF-D2-CMP-001` — D2 vs kymo comparison (the reference scoring instance).
- `REF-D2-001` — D2 external reference (factual basis for D2 scores).
- `KYMO-DSL-001` — kymo DSL specification (factual basis for kymo's A/B-category scores).
- `BPD-DGM-001` — architecture-diagram best practices (informs D2 / H3 judgements).

---

*Maintenance: bump the version when a category or criterion changes, and note which comparison docs must re-declare their rubric version. Restate the* why *behind a criterion when editing — provenance (PL/CD/K/ISO/★) is load-bearing, not decoration.*

---
title: Kymo DSL Front-End — Requirements
document_id: FEAT-KYMO-DSL-001
version: "2.0"
issue_date: 2026-06-06
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the kymo DSL front-end
review_cycle: On phase completion, or on grammar change
supersedes: null
related_documents:
  - DESIGN-KYMO-DSL-001      # Design
  - TEST-KYMO-DSL-001        # Test documentation
  - PLAN-KYMO-DSL-001        # Plan
  - FEAT-BPMN-DSL-001        # bpmn { } block requirements (delegated subset)
  - KYMOJSON-MAP-001         # .kymo.json — serialization of the resolved model
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - dsl
  - requirements
  - traceability
  - parser
  - pipeline
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# kymo DSL — Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-KYMO-DSL-001` |
| Version           | 2.0 |
| Status            | Released |
| Issue Date        | 2026-06-06 |
| Owner             | `diagrams/` project |
| Related Documents | DESIGN-TEST-PLAN-KYMO-DSL-001; FEAT-BPMN-DSL-001; KYMOJSON-MAP-001 |

---

## Part A — Product context (ConOps & Stakeholder Requirements)

> This part owns the `SN-KYMO-DSL-NN` stakeholder needs; the SRS (Part C) derives
> `FR`/`NFR` from them.

### 1. Problem & motivation

kymostudio is a diagram-as-code product: an author writes a `.kymo` file and the toolchain compiles
it to animated SVG (plus Figma / Excalidraw / WebP). The `.kymo` DSL is the **primary, hand-authored
front-end** — the first thing a new user touches and the most-exercised code path in the toolchain.
The problem it solves is that an author should describe *what* the diagram contains — components,
containers, connectors, grouping — **without hand-computing layout coordinates**; the engine resolves
geometry deterministically. Its language reference (EBNF + statement semantics) already
exists; what this product description (and its sibling spec set) captures is the **engineering context**
the shipped front-end already satisfies.

### 2. Users & context of operations (ConOps)

- **Who:** authors of `.kymo` diagram source, and the engineers/maintainers of the parser, layout
  engine, alignment resolver, and Python/JS renderers.
- **How it operates:** the front-end is a **declarative pipeline** — parsing collects elements and
  validates nothing and computes no positions; later passes resolve geometry; the renderer is
  deliberately *dumb* and only turns resolved data into output. `parse()` → `layout()` →
  `resolve_alignments()` → renderer hand-off; `cli.py:load()` dispatches by file extension.
- **Substrate it builds on:** two implementations kept at functional parity — Python (`packages/python`,
  the reference) and JavaScript (`packages/js`, `parse`/`parseDiagram`, rendered by `renderSVG`) —
  enforced by a golden conformance suite.
- **Status:** the front-end is **shipped and in daily use**; this set is **descriptive** — it captures
  the requirements the implementation already meets.

### 3. Goals & non-goals

- **Goals:** a declarative, line-oriented `.kymo` language whose source compiles into a fully-resolved
  `Diagram` the renderers can draw; deterministic geometry resolution; functional parity across the
  Python and JavaScript implementations; the grammar dual-sourced with `KYMO-DSL-001`.
- **Non-goals (delegated):** the normative EBNF grammar and per-statement semantics;
  the `bpmn { … }` block and its auto-layout (`FEAT-BPMN-DSL-001`); the BPMN 2.0 XML
  importer/exporter (`BPMN-MAP-001` and the `bpmn-parser`/`bpmn-export` sets); the `.kymo.json`
  interchange format (`KYMOJSON-MAP-001`); and the canvas editor (`canvas-*` sets).

### 4. Stakeholder needs (`SN-KYMO-DSL`)

| ID | Need |
|----|------|
| `SN-KYMO-DSL-01` | An author SHALL describe *what* a diagram contains — components, containers, connectors, grouping — in declarative, line-oriented `.kymo` text, **without hand-computing layout coordinates**. |
| `SN-KYMO-DSL-02` | The source SHALL compile into a **fully-resolved `Diagram`** that the renderers can draw; the engine resolves geometry, so the author never positions anything by hand. |
| `SN-KYMO-DSL-03` | Geometry resolution SHALL be **deterministic** — the same source yields the same diagram every time (byte-stable golden output). |
| `SN-KYMO-DSL-04` | The front-end SHALL behave **identically across the Python and JavaScript implementations**, so a diagram authored once renders the same in either. |

### 5. Scope

**In scope (product level):** the file-scope grammar surface (metadata directives, leaf components,
region containers, layout containers, edges, anonymous layout trees, comments) and the **resolution
pipeline** — parse → `layout()` → `resolve_alignments()` → renderer hand-off — in both the Python and
JavaScript implementations. **Out of scope (delegated):** see §3 non-goals; Part C §4 carries the
detailed constraints/out-of-scope list and the `KYMO-DSL-001`/`FEAT-BPMN-DSL-001` delegations.

---

## Part B — Introduction

### 1. Purpose and scope

This document introduces the **kymo DSL front-end** — the `.kymo` source-to-model
pipeline that turns declarative diagram text into a fully-resolved `Diagram` the
renderers can draw. It is the entry point to the feature's document set: it states
the problem, the concept, and the terminology, and maps the reader to the
requirements (Part C of this document, FEAT-KYMO-DSL-001),
the design (DESIGN-KYMO-DSL-001), the test documentation (TEST-KYMO-DSL-001),
and the plan (PLAN-KYMO-DSL-001). The set conforms to ISO/IEC/IEEE 12207:2017
(life-cycle processes) and ISO/IEC/IEEE 15289:2019 (information-item content).

**In scope:** the file-scope grammar surface (metadata directives, leaf
components, region containers, layout containers, edges, anonymous layout trees,
comments) and the **resolution pipeline** — parse → `layout()` → `resolve_alignments()`
→ renderer hand-off — in both the Python (`packages/python`) and JavaScript
(`packages/js`) implementations.

**Out of scope (delegated):** the normative EBNF grammar and per-statement
semantics; the `bpmn { … }` block and its auto-layout
(INTRO/FEAT/DESIGN/TEST-BPMN-DSL-001); the BPMN 2.0 XML importer/exporter
(BPMN-MAP-001 and the `bpmn-parser`/`bpmn-export` sets); the `.kymo.json`
interchange format (KYMOJSON-MAP-001); and the canvas editor (`canvas-*` sets).

### 2. Background

kymostudio is a diagram-as-code product: an author writes a `.kymo` file and the
toolchain compiles it to animated SVG (plus Figma / Excalidraw / WebP). The
`.kymo` DSL is the **primary, hand-authored front-end** — the first thing a new
user touches and the most-exercised code path in the toolchain.

Its language reference already exists: KYMO-DSL-001 specifies the grammar in EBNF
(per ISO/IEC 14977:1996) and the statement-level semantics. What was missing was
the **engineering document set** — requirements, design, test, and plan — that
every other feature area in the repository carries (`bpmn-parser`, `bpmn-export`,
`bpmn-dsl`, `canvas-engine`, `canvas-editor`, `canvas-jam`, `kymo-json`). This
set fills that gap. It is **descriptive** (the front-end is shipped and in daily
use); it captures the requirements the implementation already meets, the design
it already follows, and the tests that already gate it.

### 3. Feature concept

The front-end is a **declarative pipeline**. Parsing collects elements and
validates nothing and computes no positions; later passes resolve geometry; the
renderer is deliberately *dumb* and only turns resolved data into output:

1. **Source → `Diagram`** — `dsl.py:parse()` reads line-oriented `.kymo` text and
   returns `(Diagram, layout_dict, external_dict)`. The grammar is purely
   declarative: it records directives, leaves, regions, layout frames, edges, and
   layout trees as plain dataclasses; it does not position anything.
2. **`layout.py:layout()`** — only when a DSL `layout { … }` tree (or named
   layout frame) is present; packs members of auto-layout frames into rows/cells.
3. **`alignment.py:resolve_alignments()`** — the five-pass post-parse resolver
   where positions are actually computed: auto-layouts, parent/child anchoring,
   region auto-bounds, fan-in / trunk-lane edge staggering, and auto-canvas sizing.
4. **`to_svg.py:render()`** — the SVG back-end; sibling emitters `to_figma.py`,
   `to_excalidraw.py`, `to_webp.py` consume the same resolved model.

`cli.py:load()` dispatches by file extension and wires the stages together. Two
implementations — Python (reference) and JavaScript (`dsl.ts` / `layout.ts` /
`alignment.ts`, exposed as `parse` / `parseDiagram`, rendered by `renderSVG`) —
are kept at functional parity and enforced by a golden conformance suite.

### 4. Audience

Engineers implementing or reviewing the kymo DSL parser, the layout engine, the
alignment resolver, and the Python/JS renderers; and maintainers verifying
cross-language conformance.

### 5. Terms and abbreviations

- **DSL** — the kymo domain-specific language (`.kymo`); normative grammar in KYMO-DSL-001.
- **Front-end** — the source-to-resolved-`Diagram` path (this feature), as
  opposed to the renderers (the back-end).
- **Leaf / component** — a single rendered element (a `Component`).
- **Region** — a container with a visible border + label (`outer` / `inner` / `cluster`).
- **Layout frame** — an invisible positioning container (`horizontal` / `vertical`).
- **Edge** — a connector (`-->` / `==>` / `---`) with optional anchors, waypoints, and label.
- **Layout tree** — the single-line anonymous `layout { … }` grouping construct.
- **Resolution pipeline** — `parse()` → `layout()` → `resolve_alignments()` → render.
- **Alignment pass** — one of the five stages inside `resolve_alignments()`.
- **Parity** — functional (not byte-identical) equivalence between Python and JS.

### 6. Document map

This feature's docs use a two-layer model in this folder — a **baselined spec**
(`01-REQUIREMENTS`–`03-TEST`) and a **living plan** (`04-PLAN.md` + `CR/`). The documents for kymo-dsl:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` | `FEAT-KYMO-DSL-001` | *what product problem, whose needs (`SN-KYMO-DSL`), and what must it do? (SRS, `FR`/`NFR`)* |
| 02 | `02-DESIGN.md` | `DESIGN-KYMO-DSL-001` | *how is it built?* |
| 03 | `03-TEST.md` | `TEST-KYMO-DSL-001` | *how do we know it's right?* |
| — | `04-PLAN.md` | `PLAN-KYMO-DSL-001` | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only. The normative grammar (EBNF + statement semantics) is **KYMO-DSL-001**; this
set references it rather than restating it.

**Change management:** a change to this baselined spec is raised as a change-request in
`docs/specs/kymo-dsl/CR/` and re-baselined (bump version + record in Annex A).

---

## Part C — Requirements (SRS)

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Related      | DESIGN-TEST-PLAN-KYMO-DSL-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO/IEC/IEEE
29148:2018 drafting conventions. Each requirement carries a stable ID for
traceability from TEST-KYMO-DSL-001. Concept and rationale: Part B;
realisation: DESIGN-KYMO-DSL-001. The **normative grammar (EBNF + per-statement
semantics) is KYMO-DSL-001**; these requirements specify the front-end's
behaviour and surface, not the grammar productions.

### 1. Scope and stakeholder needs

Stakeholder needs (`SN-KYMO-DSL-01..04`, ISO 29148 §6.4.2 ConOps) are owned by Part A: an author
describes *what* a diagram contains (components, containers, connectors, grouping) without
hand-computing layout coordinates, and the engine resolves geometry deterministically and identically
across the Python and JavaScript implementations. This part specifies the front-end's behaviour and
surface that meets those needs; the scope/out-of-scope boundary is in §4.

### 2. Functional requirements

**Parsing model**

- **FR-1** The front-end SHALL parse line-oriented `.kymo` source **declaratively**:
  parsing collects elements, validates nothing, and computes no positions.
  `dsl.py:parse()` SHALL return `(Diagram, layout_dict, external_dict)`
  (`layout_dict` = region→rows for grid/auto-layout frames; `external_dict` =
  component→`{above, gap}` reservations).

**Metadata directives** (file scope)

- **FR-2** The DSL SHALL accept the directives `canvas [:] W x H` (optional;
  auto-sized when omitted), `title: "…"` (≤1), `subtitle: "…"` (≤1), and
  `external <id> above <id> [gap N]` (reserve vertical space above a leaf).

**Leaf components**

- **FR-3** A leaf SHALL be `<id> <shape>/<icon>/<accent> "Name" "Subtitle" [@ placement]`,
  where `placement` is absolute `(x,y)` **or** relative `<parent_id> <side> [gap]`
  with `side ∈ {top, right, bottom, left}`. Shapes, icon keys, and accents are
  accepted permissively by the parser and validated at render time.

**Containers**

- **FR-4** A region container SHALL be `<id> (outer|inner|cluster) "Label" [opts] { body }`
  with options, each at most once, in any order: `padding (X,Y)`,
  `padding-bottom N`, `dash (N,N)`, `stroke #hex`, `label-position (above|inside)`,
  `label-anchor (start|middle|end)`, `icon <name>`, and `(horizontal|vertical)`
  (which turns the region into an auto-layout frame).
- **FR-5** A layout container SHALL be
  `<id> (horizontal|vertical) pos (X,Y) gap N [align (start|center|end)] { body }`;
  its body SHALL accept **bare-id references only** (no inline leaves, no nested
  containers), each appending a positioning directive.
- **FR-6** A region body SHALL accept: nested containers (region or layout),
  inline leaf definitions (added to that region's `contains`), bare-id references
  (appended to `contains`; defined elsewhere), grid rows `row [id1 id2 …]`
  (switching the region to grid mode, mutually exclusive with bare-ids / nested
  containers), comments, and blank lines.

**Edges**

- **FR-7** An edge SHALL be `<src> (-->|==>|---) <dst> [: "Label"] [{ opts }]`,
  where `-->` is the default (gray, directed), `==>` is highlight (orange,
  directed), and `---` is an undirected sibling link (no arrowhead). Edge options
  (comma-separated, all optional) SHALL include `src=`, `dst=` (anchor specs
  `(top|right|bottom|left|center)[±offset]`), `via=(x,y);…` (waypoints),
  `label_offset=`, `label_pos=`, `label_at=(src|dst|mid)`, `route=(auto|over|under|curve)`,
  the flags `small`, `dashed`, `shared`, and the route shorthands
  `curve`/`over`/`under`/`straight`/`elbow`.

**Anonymous layout trees**

- **FR-8** The DSL SHALL accept a single-line `layout { expr }` tree where `|`
  groups horizontally (left→right) and `,` groups vertically (top→bottom);
  separators SHALL NOT be mixed at one level (nest with `{ }`); atoms are leaf
  ids or nested groups.

**BPMN block (delegated)**

- **FR-9** The DSL SHALL accept a file-scope `bpmn { … }` block. Its grammar,
  node/flow semantics, and auto-layout are **specified by FEAT-BPMN-DSL-001** and
  are out of scope for this document; the core front-end's only obligation is to
  recognise the block and route it to the BPMN sub-pipeline.

**Comments**

- **FR-10** A `#` outside a quoted string SHALL begin a comment to end of line;
  a `#` immediately followed by a hex digit SHALL be treated as a colour literal,
  **not** a comment.

**Resolution pipeline**

- **FR-11** After parsing, `layout.py:layout()` SHALL position members of
  auto-layout / grid frames (when a layout spec is present), and
  `alignment.py:resolve_alignments()` SHALL run a five-pass resolver:
  (1) auto-layouts, (2) parent/child anchoring, (3) region auto-bounds,
  (4) fan-in / trunk-lane edge staggering, (5) auto-canvas sizing.
- **FR-12** The pipeline SHALL emit a fully-resolved `Diagram` (components with
  absolute `pos`/`size`, regions with `bounds`, edges with routing) and hand it
  to a *dumb* back-end: `to_svg.py:render()` (and sibling emitters `to_figma`,
  `to_excalidraw`, `to_webp`) SHALL turn resolved data into output without
  computing geometry. `cli.py:load()` SHALL dispatch by extension and SHALL skip
  both `layout()` and `resolve_alignments()` for already-resolved sources
  (`.bpmn`, `.kymo.json`, and a `bpmn { }` block after its own layout).

**Parity**

- **FR-13** The front-end SHALL exist with equivalent functionality in both
  `packages/python` (reference) and `packages/js` — same grammar surface, same
  pipeline stages, exposed as `parse` / `parseDiagram` and rendered by `renderSVG`.

### 3. Non-functional requirements

- **NFR-1** Resolution SHALL be **deterministic** — stable tie-breaks, fixed
  iteration counts, integer coordinates — so golden SVGs are byte-stable. JS
  SHALL round with `pyRound` (half-to-even) wherever Python uses `int(round(...))`.
- **NFR-2** The JS implementation SHALL remain **dependency-free** (zero runtime
  deps; ships ESM + `.d.ts`).
- **NFR-3** Python↔JS parity SHALL be **enforced by a golden conformance suite**
  with Python as the sole golden writer; cross-language output need not be
  byte-identical (parity is functional equivalence).
- **NFR-4** The grammar SHALL be **dual-sourced**: `dsl.py` is the reference
  implementation and KYMO-DSL-001 the normative grammar; the two SHALL be updated
  in lockstep on any grammar change.

### 4. Constraints, assumptions, out-of-scope

- The normative EBNF + statement semantics live in **KYMO-DSL-001** (not restated here).
- The `bpmn { }` block, its node/flow grammar, and its Sugiyama auto-layout are
  specified by **FEAT-BPMN-DSL-001**.
- The BPMN 2.0 XML importer/exporter (**BPMN-MAP-001**), the `.kymo.json`
  interchange format (**KYMOJSON-MAP-001**), and the canvas editor (`canvas-*`
  sets) are separate features and out of scope.
- Icon keys, shape names, and accents are parser-permissive; render-time
  validation/fallback is a renderer concern, not a front-end requirement.

---

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — requirements for the shipped `.kymo` front-end. (FEAT-KYMO-DSL-001 v1.0) |
| 1.1     | 2026-05-25 | Vũ Anh | **Doc reorganization.** Moved §1 stakeholder needs to the new product description `FEAT-KYMO-DSL-001` (minted `SN-KYMO-DSL-01..04`); §1 now points there. Added `FEAT-KYMO-DSL-001` to related documents. No requirement content changed. |
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — descriptive spec set for the shipped `.kymo` front-end. (FEAT-KYMO-DSL-001 v1.0) |
| 1.1     | 2026-05-25 | Vũ Anh | **Doc reorganization.** §6 reworked to a document map that defers the ISO/lifecycle model to the standard and adds `00-PRODUCT` (`FEAT-KYMO-DSL-001`) + a change-management pointer to `docs/specs/kymo-dsl/CR/`; §1 reading map updated to include the product description. (FEAT-KYMO-DSL-001 v1.1) |
| 0.1     | 2026-05-25 | Vũ Anh | Initial product description. Extracted from `FEAT-KYMO-DSL-001` §1–§3 (purpose/background/concept) and `FEAT-KYMO-DSL-001` §1 (scope & stakeholder needs); minted feature-scoped needs `SN-KYMO-DSL-01..04`. (FEAT-KYMO-DSL-001 v0.1) |
| 2.0     | 2026-06-06 | Vũ Anh | **Consolidation.** Merged `00-PRODUCT.md` (FEAT-KYMO-DSL-001), `01-INTRO.md` (FEAT-KYMO-DSL-001), and `02-FEATURE.md` (FEAT-KYMO-DSL-001) into this single `01-REQUIREMENTS.md` under the 4-file spec structure. Content losslessly preserved as Part A (ConOps/StRS), Part B (Introduction), and Part C (SRS). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled in the project repository at
`docs/specs/kymo-dsl/01-REQUIREMENTS.md`; the authoritative source is the main-branch
working tree, with history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it describes; available to anyone with repository read
access.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set (`REQUIREMENTS`/`DESIGN`/`TEST`/`PLAN`)
consistent; increment `version`; append a row to Annex A. New stakeholder needs are minted in Part A
only, through a baseline or an approved change-request. Adding/changing a requirement requires:
edit the relevant FR/NFR (preserving IDs); update TEST-KYMO-DSL-001's traceability matrix; increment
`version`; append a row to Annex A; reflect any grammar change in KYMO-DSL-001 (NFR-4).

### B.4 Backwards Compatibility
Requirement IDs are stable across revisions; a removed requirement SHALL be marked withdrawn (not
re-used) so traceability links remain valid. On any front-end change, reconcile this document with
`KYMO-DSL-001` (the normative grammar) before release.

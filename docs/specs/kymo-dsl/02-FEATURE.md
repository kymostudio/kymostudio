---
title: Kymo DSL Front-End — Requirements
document_id: FEAT-KYMO-DSL-001
version: "1.1"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the kymo DSL front-end
review_cycle: On phase completion, or on grammar change
supersedes: null
related_documents:
  - PROD-KYMO-DSL-001        # Product description (owns the SN- stakeholder needs)
  - INTRO-KYMO-DSL-001       # Introduction
  - DESIGN-KYMO-DSL-001      # Design
  - TEST-KYMO-DSL-001        # Test documentation
  - PLAN-KYMO-DSL-001        # Plan
  - FEAT-BPMN-DSL-001        # bpmn { } block requirements (delegated subset)
  - KYMOJSON-MAP-001         # .kymo.json — serialization of the resolved model
authors:
  - Vũ Anh
language: en
keywords:
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

# Kymo DSL Front-End — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-KYMO-DSL-001                                  |
| Version      | 1.1                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-25                                         |
| Owner        | `diagrams/` project                                |
| Related      | PROD-KYMO-DSL-001 (stakeholder needs), INTRO-DESIGN-TEST-PLAN-KYMO-DSL-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO/IEC/IEEE
29148:2018 drafting conventions. Each requirement carries a stable ID for
traceability from TEST-KYMO-DSL-001. Concept and rationale: INTRO-KYMO-DSL-001;
realisation: DESIGN-KYMO-DSL-001. The **normative grammar (EBNF + per-statement
semantics) is KYMO-DSL-001**; these requirements specify the front-end's
behaviour and surface, not the grammar productions.

## 1. Scope and stakeholder needs

Stakeholder needs (`SN-KYMO-DSL-01..04`, ISO 29148 §6.4.2 ConOps) are owned by the product
description **`PROD-KYMO-DSL-001`** (`00-PRODUCT.md`): an author describes *what* a diagram contains
(components, containers, connectors, grouping) without hand-computing layout coordinates, and the
engine resolves geometry deterministically and identically across the Python and JavaScript
implementations. This document specifies the front-end's behaviour and surface that meets those needs;
the scope/out-of-scope boundary is in §4.

## 2. Functional requirements

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

## 3. Non-functional requirements

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

## 4. Constraints, assumptions, out-of-scope

- The normative EBNF + statement semantics live in **KYMO-DSL-001** (not restated here).
- The `bpmn { }` block, its node/flow grammar, and its Sugiyama auto-layout are
  specified by **FEAT-BPMN-DSL-001**.
- The BPMN 2.0 XML importer/exporter (**BPMN-MAP-001**), the `.kymo.json`
  interchange format (**KYMOJSON-MAP-001**), and the canvas editor (`canvas-*`
  sets) are separate features and out of scope.
- Icon keys, shape names, and accents are parser-permissive; render-time
  validation/fallback is a renderer concern, not a front-end requirement.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — requirements for the shipped `.kymo` front-end. |
| 1.1     | 2026-05-25 | Vũ Anh | **Doc reorganization.** Moved §1 stakeholder needs to the new product description `PROD-KYMO-DSL-001` (minted `SN-KYMO-DSL-01..04`); §1 now points there. Added `PROD-KYMO-DSL-001` to related documents. No requirement content changed. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-dsl/02-FEATURE.md`; authoritative source
is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant FR/NFR (preserving
IDs); update TEST-KYMO-DSL-001's traceability matrix; increment `version`; append
a row to Annex A; reflect any grammar change in KYMO-DSL-001 (NFR-4).

### B.4 Backwards Compatibility
Requirement IDs are stable across revisions; a removed requirement SHALL be
marked withdrawn (not re-used) so traceability links remain valid.

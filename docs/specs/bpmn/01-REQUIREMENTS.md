---
title: BPMN Support — Requirements (umbrella)
document_id: FEAT-BPMN-001
version: "0.1"
issue_date: 2026-06-06
status: Draft
classification: Internal
owner: packages/python (kymo CLI) · packages/js
audience: Engineers implementing and verifying any BPMN-family module
review_cycle: On a module being added/delivered, or on family-scope change
supersedes: null
related_documents:
  - DESIGN-BPMN-001         # Design (umbrella)
  - TEST-BPMN-001           # Test documentation (umbrella)
  - PLAN-BPMN-001           # Plan (umbrella)
  - FEAT-BPMN-PARSER-001    # module: parser requirements
  - FEAT-BPMN-EXPORT-001    # module: export requirements
  - FEAT-BPMN-DSL-001       # module: dsl requirements
  - FEAT-BPMN-LINT-001      # module: lint requirements
  - FEAT-BPMN-ANIMATE-001   # module: animate requirements
  - FEAT-BPMN-EDITOR-001    # module: editor requirements
  - BPMN-MAP-001            # BPMN element → kymo mapping (normative)
  - BPMN-NREF-001           # BPMN 2.0 normative spec mirror set
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - requirements
  - import
  - export
  - dsl
  - lint
  - animation
  - editor
  - umbrella
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Support — Requirements (umbrella)

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | FEAT-BPMN-001                                               |
| Version      | 0.1                                                        |
| Status       | Draft                                                      |
| Issue Date   | 2026-06-06                                                 |
| Owner        | `packages/python` (kymo CLI) · `packages/js`               |
| Related      | DESIGN-BPMN-001, TEST-BPMN-001, PLAN-BPMN-001, BPMN-MAP-001, BPMN-NREF-001 |

## 0. The family and its document set

This document is the **entry point** to the `bpmn` umbrella — kymo's **BPMN 2.0 support** family — and
folds in the family overview and module registry alongside the family requirements. BPMN (Business
Process Model and Notation) is a ubiquitous process-modeling standard; this family lets kymo **read,
write, author, validate, animate, and edit** BPMN diagrams, all anchored on one normative element
mapping (`BPMN-MAP-001`) and the BPMN 2.0 spec mirror (`BPMN-NREF-001`). The umbrella owns the
**family** scope and the shared mapping; each capability is a **module** with its own self-contained
doc-set under `modules/`.

| Module | Capability | Requirements (entry) | Status |
|--------|------------|----------------------|--------|
| **`parser`** | `.bpmn` (BPMN 2.0 XML + DI) → kymo `Diagram` import | `FEAT-BPMN-PARSER-001` | Delivered |
| **`export`** | kymo `Diagram` → `.bpmn` (inverse mapping, round-trip) | `FEAT-BPMN-EXPORT-001` | Released |
| **`dsl`** | BPMN shapes/edges in the `.diagram` DSL | `FEAT-BPMN-DSL-001` | Delivered |
| **`lint`** | Import-fidelity / reference-integrity / graph-sanity checks | `FEAT-BPMN-LINT-001` | Baselined |
| **`animate`** | BPMN token-flow animation over the rendered SVG | `FEAT-BPMN-ANIMATE-001` | Delivered |
| **`editor`** | Interactive BPMN modeling surface in the kymo web editor | `FEAT-BPMN-EDITOR-001` | Planned |

The umbrella uses a four-document layout (`01`–`04`): `01-REQUIREMENTS` (this) → `02-DESIGN`
(DESIGN-BPMN-001) → `03-TEST` (TEST-BPMN-001) → `04-PLAN` (PLAN-BPMN-001). Cross-document references
use **`document_id`** (never file paths); the numeric `NN-` prefixes are a reading-order aid only.

## 1. Scope and stakeholder needs (`SN-BPMN`)

**Scope:** the `bpmn` family gives kymo end-to-end interoperability with **BPMN 2.0** — import, export,
DSL authoring, linting, animation, and interactive editing — sharing one normative element mapping
across both kymo implementations (`packages/python`, `packages/js`). It covers BPMN **notation and
diagram interchange** (the visual model + DI geometry); it does **not** implement BPMN **execution
semantics** (a process engine).

| ID | Need | Rationale |
|----|------|-----------|
| `SN-BPMN-01` | kymo must **import** industry-standard `.bpmn` (BPMN 2.0 XML with DI geometry) into its model so existing process diagrams can be rendered and animated. | BPMN is the de-facto process-modeling interchange; users arrive with `.bpmn` from Camunda/bpmn.io/Signavio/etc. |
| `SN-BPMN-02` | kymo must **export** its `Diagram` back to valid BPMN 2.0 XML so it round-trips with BPMN tooling. | Interop is bidirectional; a diagram authored or edited in kymo should be openable in standard BPMN tools. |
| `SN-BPMN-03` | Authors must be able to express **BPMN shapes in the `.diagram` DSL** without leaving kymo or using an external BPMN tool. | Diagram-as-code authors want BPMN glyphs as first-class DSL primitives. |
| `SN-BPMN-04` | Imported and authored BPMN must be **validated** (mapping fidelity, reference integrity, graph sanity) so silent mapping errors surface. | A foreign-format importer fails quietly; lint turns silent drops into actionable diagnostics. |
| `SN-BPMN-05` | The family must be **modular** — each capability delivered independently with its own doc-set, sharing **one normative mapping**. | Capabilities mature at different rates; a single source of truth for the element correspondence avoids drift. |
| `SN-BPMN-06` | Every capability must be kept at **feature parity across both implementations** (Python and JS). | The two packages are independent but equivalent; BPMN support must not regress parity. |

## 2. Functional requirements (family)

- **FR-BPMN-1** The family SHALL **import** `.bpmn` (BPMN 2.0 XML + Diagram Interchange) into a kymo
  `Diagram`, consuming **absolute DI coordinates** directly (no layout/alignment pass). *(SN-BPMN-01)*
- **FR-BPMN-2** The family SHALL **export** a kymo `Diagram` to valid BPMN 2.0 XML via the inverse
  mapping, supporting round-trip. *(SN-BPMN-02)*
- **FR-BPMN-3** The family SHALL let authors express **BPMN shapes and edges in the `.diagram` DSL**.
  *(SN-BPMN-03)*
- **FR-BPMN-4** The family SHALL **lint** imported/authored BPMN for import fidelity, reference
  integrity, and graph sanity, mapping diagnostics to source. *(SN-BPMN-04)*
- **FR-BPMN-5** The family SHALL **animate** token flow over the rendered BPMN SVG. *(SN-BPMN-01)*
- **FR-BPMN-6** The family SHALL provide an **interactive BPMN modeling surface** in the kymo web
  editor, composing the import and export modules. *(SN-BPMN-01, SN-BPMN-02)*
- **FR-BPMN-7** All modules SHALL cite the **single normative mapping** `BPMN-MAP-001` for the BPMN
  element → kymo correspondence; no module SHALL re-derive that correspondence. *(SN-BPMN-05)*
- **FR-BPMN-8** Each capability SHALL be a **module** under `modules/` with a self-contained doc-set
  and CR log, delivered independently. *(SN-BPMN-05)*

## 3. Non-functional requirements (family)

- **NFR-BPMN-1** **Dual-implementation parity.** Every family capability SHALL exist in both
  `packages/python` and `packages/js` at feature parity. *(SN-BPMN-06)*
- **NFR-BPMN-2** **Additive rendering.** BPMN-specific defs/CSS SHALL be injected **only** when a
  diagram uses BPMN, so the golden-SVG fixtures for non-BPMN diagrams stay byte-identical.
- **NFR-BPMN-3** **Standard conformance.** Import/export SHALL conform to BPMN 2.0 as mirrored in
  `BPMN-NREF-001` and mapped by `BPMN-MAP-001`.
- **NFR-BPMN-4** **Determinism.** For a given input and options, each module's output SHALL be
  deterministic.
- **NFR-BPMN-5** **Corpus regression.** The importer SHALL be gated by the vendored MIWG `.bpmn`
  corpus baseline (status, node/edge counts, SVG hash) on every build.

## 4. Constraints, assumptions, out-of-scope

- **Notation, not execution.** The family covers BPMN's visual/interchange model, **not** process
  execution semantics (tokens-as-runtime, gateway evaluation, service-task invocation). The `animate`
  module visualises flow; it does not *execute* the process.
- **DI-driven geometry.** Import relies on the file carrying Diagram Interchange geometry; BPMN without
  DI is out-of-scope for faithful placement (kymo does not auto-layout BPMN).
- **One mapping.** The element correspondence is owned by `BPMN-MAP-001`; modules consume it and MUST
  NOT fork it.
- **Out-of-scope (umbrella):** a BPMN execution engine; collaboration/choreography/conversation
  diagrams beyond what `BPMN-MAP-001` records as supported; non-BPMN process notations.

## 5. Module roadmap (which module realises what)

| Module | Realises (family FR) | Status |
|--------|----------------------|--------|
| `parser` (`FEAT-BPMN-PARSER-001`) | FR-BPMN-1, FR-BPMN-7, FR-BPMN-8 | **Delivered** |
| `export` (`FEAT-BPMN-EXPORT-001`) | FR-BPMN-2, FR-BPMN-7, FR-BPMN-8 | **Released** |
| `dsl` (`FEAT-BPMN-DSL-001`) | FR-BPMN-3, FR-BPMN-7, FR-BPMN-8 | **Delivered** |
| `lint` (`FEAT-BPMN-LINT-001`) | FR-BPMN-4, FR-BPMN-7, FR-BPMN-8 | **Baselined** |
| `animate` (`FEAT-BPMN-ANIMATE-001`) | FR-BPMN-5, FR-BPMN-8 | **Delivered** |
| `editor` (`FEAT-BPMN-EDITOR-001`) | FR-BPMN-6, FR-BPMN-7, FR-BPMN-8 | **Planned** |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial umbrella SRS created when consolidating the formerly sibling BPMN feature folders into one `bpmn/` umbrella with `modules/{parser,export,dsl,lint,animate,editor}`. Folds in the family overview + module registry; defines `SN-BPMN-01..06`, `FR-BPMN-1..8`, `NFR-BPMN-1..5`, and the module roadmap. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn/01-REQUIREMENTS.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the family; available to all repository readers.

### B.3 Change Control
Adding/changing a family requirement requires: edit the relevant FR/NFR (preserving IDs); update
TEST-BPMN-001's traceability and the affected module SRS; increment `version`; append a row to Annex A.
A new capability is raised as a module under `modules/`.

### B.4 Backwards Compatibility
Requirement IDs are stable across revisions; a removed requirement SHALL be marked withdrawn (not
re-used) so traceability links remain valid. Module `document_id`s are unaffected by the umbrella's
file-naming scheme.

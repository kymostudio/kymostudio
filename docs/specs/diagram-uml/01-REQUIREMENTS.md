---
title: UML Diagram Hub — Requirements
document_id: FEAT-UML-001
version: "0.1"
issue_date: 2026-06-13
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers maintaining kymo's UML diagram import/export/render
review_cycle: On a diagram-type/spoke being added or a mapping change
supersedes: null
related_documents:
  - DESIGN-UML-001              # Design
  - TEST-UML-001                # Test documentation
  - PLAN-UML-001                # Plan
  - FEAT-UML-SEQUENCE-001       # module: sequence diagram (implemented)
  - FEAT-UML-CLASS-001          # module: class diagram (reserved)
  - FEAT-UML-STATE-001          # module: state machine diagram (reserved)
  - FEAT-FLOWCHART-001          # sibling diagram-family hub (the precedent)
  - FEAT-MERMAID-001            # Mermaid source-syntax front-end (a source spoke)
  - FEAT-MERMAID-SEQUENCE-001   # Mermaid sequenceDiagram front-end module (now superseded — see PLAN)
  - FEAT-MERMAID-CLASS-001      # Mermaid classDiagram front-end module
  - FEAT-MERMAID-STATE-001      # Mermaid stateDiagram front-end module
  - FEAT-PIPECLI-001            # Pipeline & CLI — the registry this plugs into
  - KYMOJSON-MAP-001            # .kymo.json — the interchange wire format
  - REF-PLANTUML-001            # prior art: PlantUML's UML coverage
authors:
  - Vũ Anh
language: en
keywords:
  - uml
  - sequence
  - class
  - state
  - xmi
  - staruml
  - gaphor
  - requirements
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# UML Diagram Hub — Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-UML-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `packages/rust/kymostudio-core` (shared engine) |
| Related Documents | `DESIGN-UML-001`, `TEST-UML-001`, `PLAN-UML-001`; sibling hub `FEAT-FLOWCHART-001`; source spoke `FEAT-MERMAID-001` |

## 0. The feature and its document set

The **UML diagram hub** is the family-level home in `kymostudio-core` for OMG **UML 2.5.1**
diagram types — sequence, class, state machine, use-case, activity, component, and the rest —
that are **not** flowchart-shaped and so do not belong to the flowchart conversion hub
(`FEAT-FLOWCHART-001`). It is the same "hub-and-spoke" realisation of the pipeline's *single
intermediate model + one importer/encoder per format* principle (`FEAT-PIPECLI-001`,
`RES-PIPELINE-001`), specialised to the UML family.

```
  Mermaid sequenceDiagram ─┐                 ┌─ XMI 2.5.1   (uml:Interaction)
  (PlantUML — reserved) ───┼─▶ UML IR  ──────┼─ StarUML .mdj (model + views)
  (classDiagram — resv.) ──┘  (per type,     ├─ Gaphor .gaphor
                              positionless)  └─ SVG (layout → render)
```

Unlike the flowchart hub, **each UML diagram type has its own IR** (a sequence is lifelines +
ordered messages, not a node-edge graph), so the hub is a *family of typed sub-models* that
share the export/render discipline, not one universal IR. The first type — **sequence** — is
**implemented**; the others are reserved (§ Part B).

The document set: this `FEAT` (requirements) · `DESIGN-UML-001` (architecture & data model) ·
`TEST-UML-001` (V&V) · `PLAN-UML-001` (phasing). Each diagram-type spoke has a module under
`modules/` and (when scheduled) a normative interchange mapping under `docs/formats/`.

### 0.1 Relationship to neighbouring features

| Concern | Owner | Note |
|---|---|---|
| **UML IR + interchange emitters + renderers** | **this hub** (`FEAT-UML-001`) | `crate::sequence` (and future `crate::umlclass`, `crate::statemachine`) |
| **Source syntax** (`sequenceDiagram`/`classDiagram`/`stateDiagram` text) | `FEAT-MERMAID-001` | parsed by `crate::mermaid::parse_sequence` (a *source spoke* into this hub), exactly as Mermaid flowchart feeds `FEAT-FLOWCHART-001` |
| **Flowchart-shaped diagrams** | `FEAT-FLOWCHART-001` | node-edge family; the structural sibling of this hub |
| **draw.io / D2 / DOT** | `FEAT-FLOWCHART-001` / `FEAT-PIPECLI-DRAWIO-001` | flowchart-family targets, not UML |

UML interchange formats (**XMI**, StarUML **.mdj**, **Gaphor**) are owned here because they are
*UML metamodel* serializations — the UML analogue of how the flowchart hub owns D2/DOT/draw.io.

## Part A — Stakeholder needs (`SN-UML`)

| id | Need |
|----|------|
| `SN-UML-01` | A user SHALL be able to **export** a UML diagram to standard UML interchange formats (XMI 2.5.1, StarUML `.mdj`, Gaphor) so it opens in a dedicated UML tool — without a browser or that tool installed. |
| `SN-UML-02` | A user SHALL be able to **render** a UML diagram to SVG entirely in the engine (no Mermaid.js / PlantUML / Graphviz binary). |
| `SN-UML-03` | A user SHALL be able to **import** a UML diagram authored in a diagram-as-code syntax (Mermaid `sequenceDiagram` today; PlantUML reserved) into the engine. |
| `SN-UML-04` | Adding a UML **diagram type** SHALL be a contained addition (its own IR + parser + emit/render), and adding an **interchange format** SHALL be one emitter — not a new end-to-end path. |
| `SN-UML-05` | Conversions SHALL be **deterministic** and, where exposed, identical across the Python, JS, and Rust surfaces (one Rust core via PyO3/wasm). The current binding-parity gap (§ Part C, `FR-UML-5`) is tracked, not silently accepted. |
| `SN-UML-06` | Where a target tool's metamodel cannot represent a construct, the loss SHALL be **explicit and documented**, not a silent corruption. |

## Part B — Introduction & family map

The hub is a set of per-type positionless sub-models plus a shared export/render discipline.
**Source-syntax front-ends** (`crate::mermaid::parse_sequence`, …) parse text into a typed UML
IR; **interchange emitters** serialize that IR to a UML tool format; **renderers** run a
type-specific layout to SVG. Mermaid is the first source spoke and keeps its own feature folder
(`FEAT-MERMAID-001`); this hub owns the typed IRs, the emitters, and the renderers.

| Diagram type | Module | document_id | Status | IR |
|---|---|---|---|---|
| **Sequence** | `modules/sequence` | `FEAT-UML-SEQUENCE-001` | **Implemented** | `crate::sequence` (Participant / Item / Message / Fragment / Note) |
| **Class** | `modules/class` | `FEAT-UML-CLASS-001` | Reserved | own (compartment-sized class boxes + typed relations) |
| **State machine** | `modules/state` | `FEAT-UML-STATE-001` | Reserved | node-edge shaped (may reuse layered layout) |
| Use-case | — (roadmap) | — | Reserved | actors + use-cases + associations |
| Activity | — (roadmap) | — | Reserved | control/object flow with forks/joins |
| Component / Deployment / Package / Object / Timing / Communication | — (roadmap) | — | Reserved | per UML 2.5.1; see the diagram-taxonomy data set (`docs/data/database.dbml`) |

**Interchange targets (today, sequence only):**

| Target | API (Rust core) | What | Fidelity note |
|---|---|---|---|
| XMI 2.5.1 | `mermaid_to_xmi` → `sequence::emit::to_xmi` | `uml:Interaction` (lifelines, messages, executions, combined fragments, comments) | full |
| StarUML `.mdj` | `mermaid_to_mdj` → `sequence::mdj::to_mdj` | model + laid-out views (opens in StarUML) | activations/notes omitted (v1); `synchCall` sort omitted (default) |
| Gaphor `.gaphor` | `mermaid_to_gaphor` → `sequence::gaphor::to_gaphor` | flat model + presentation (opens in Gaphor) | **CombinedFragment unsupported by Gaphor → fragments flattened** (`SN-UML-06`) |
| SVG | `mermaid_to_sequence_svg` → `sequence::svg::render` | pure-Rust render | notes/activations not yet drawn |

## Part C — Software requirements

### C.1 Functional (`FR-UML`)

| id | Requirement | Need |
|----|-------------|------|
| `FR-UML-1` | Each UML diagram type SHALL have its **own positionless IR**, sized to that type's semantics (sequence = `crate::sequence`: participants + ordered items, message sorts, combined fragments, notes). It SHALL NOT be forced onto the flowchart node-edge IR. | `SN-UML-04` |
| `FR-UML-2` | A **source-syntax importer** SHALL parse diagram-as-code text into the typed UML IR and SHALL NOT itself emit or encode. Sequence is parsed by `crate::mermaid::parse_sequence` today (Mermaid `sequenceDiagram`). | `SN-UML-03` |
| `FR-UML-3` | **Interchange emitters** SHALL serialize the IR to standard UML formats — **XMI 2.5.1** (`to_xmi`), **StarUML `.mdj`** (`to_mdj`), **Gaphor** (`to_gaphor`) — each producing a file the corresponding tool opens. | `SN-UML-01` |
| `FR-UML-4` | A **pure-Rust SVG renderer** SHALL render the UML IR via a type-specific layout (`sequence::layout` → `sequence::svg::render`) with no external binary. | `SN-UML-02` |
| `FR-UML-5` | Converters SHALL be exposed uniformly across the Rust `kymo` CLI (output-extension registry), PyO3, and wasm. **Known gap (as-built 2026-06-13):** XMI/mdj/gaphor are Rust-CLI-only; only `mermaidSequenceToSvg` is on wasm; none are on Python. Closing this is the parity deliverable in `PLAN-UML-001`. | `SN-UML-05` |
| `FR-UML-6` | Where a target metamodel cannot represent an IR construct, the emitter SHALL **degrade explicitly** and the loss SHALL be documented in the type's module + its format mapping (e.g. Gaphor fragment flattening; `.mdj` activation/note omission). | `SN-UML-06` |

### C.2 Non-functional (`NFR-UML`)

| id | Requirement |
|----|-------------|
| `NFR-UML-1` | **Determinism.** Identical input → byte-identical output across runs/platforms (monotonic element ids, stable ordering). |
| `NFR-UML-2` | **No new heavy deps.** IRs, parsers, emitters, and renderers compile under `--no-default-features` and into the wasm bundle. |
| `NFR-UML-3` | **Standards conformance.** XMI output SHALL be well-formed and valid against OMG UML 2.5.1; `.mdj` SHALL open in StarUML; `.gaphor` SHALL open in Gaphor — each gated by a golden/fixture test (`TEST-UML-001`). |
| `NFR-UML-4` | **Per-type isolation.** Each diagram type's IR, parser, emitters, and renderer SHALL be independently unit-testable; a new type SHALL NOT touch another type's code. |

## Part D — Constraints, assumptions, out-of-scope (v1)

- **Constraints.** `kymostudio-core` (Rust), surfaced via PyO3 (Python) and wasm (JS). The
  `.kymo.json` schema (`KYMOJSON-MAP-001`) is the resolved-model wire format where a UML type
  also produces a kymo `Diagram` (e.g. via SVG-render layout); the UML *interchange* formats
  (XMI/mdj/gaphor) are tool-specific serializations, **not** `.kymo.json`.
- **Assumptions.** Mermaid is the first UML source syntax; PlantUML (the richest UML DSL — see
  `REF-PLANTUML-001`) is the obvious second source spoke.
- **Out of scope (v1).** Rendering of class / state / use-case / activity / component (reserved
  — today those Mermaid types are drawn by **external Mermaid.js**, not kymo); PlantUML import or
  export; reverse import (`.xmi`/`.mdj`/`.gaphor` → IR — export-only today); round-trip fidelity
  across UML tools.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-13 | Vũ Anh | Initial issue. Established the UML diagram-family hub (sibling to `FEAT-FLOWCHART-001`) from a full project scan: **sequence implemented** in `crate::sequence` (Mermaid `sequenceDiagram` parser + XMI 2.5.1 / StarUML `.mdj` / Gaphor emitters + pure-Rust SVG renderer); class/state reserved; PlantUML absent. Minted `SN-UML-01..06`, `FR-UML-1..6`, `NFR-UML-1..4`. Recorded the binding-parity gap (`FR-UML-5`) and the explicit fidelity-loss rule (`FR-UML-6`). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/diagram-uml/01-REQUIREMENTS.md`; the authoritative source is
the main-branch working tree, history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it describes.

### B.3 Change Control
Changes require: update the relevant clause; keep the set (`FEAT`/`DESIGN`/`TEST`/`PLAN`-`UML`)
consistent; increment `version`; append a row to Annex A. New diagram-type modules are minted
under `modules/<type>/` with their own `FEAT-UML-<TYPE>-001` id.

### B.4 Backwards Compatibility
On any change, reconcile with `DESIGN-UML-001` and the source-spoke front-end (`FEAT-MERMAID-001`)
before release.

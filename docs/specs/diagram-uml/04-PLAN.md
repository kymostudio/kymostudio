---
title: UML Diagram Hub — Plan
document_id: PLAN-UML-001
version: "0.1"
issue_date: 2026-06-13
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers sequencing UML-hub work
review_cycle: On a phase being delivered
supersedes: null
related_documents:
  - FEAT-UML-001
  - DESIGN-UML-001
  - TEST-UML-001
  - FEAT-UML-SEQUENCE-001
  - FEAT-MERMAID-001
  - FEAT-MERMAID-SEQUENCE-001
  - FEAT-FLOWCHART-001
  - FEAT-PIPECLI-001
  - REF-PLANTUML-001
authors:
  - Vũ Anh
language: en
keywords:
  - uml
  - plan
  - roadmap
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# UML Diagram Hub — Plan

| Field             | Value |
|-------------------|-------|
| Document ID       | `PLAN-UML-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `packages/rust/kymostudio-core` |
| Related Documents | `FEAT-UML-001`, `DESIGN-UML-001`, `TEST-UML-001` |

## Phase 1 — Sequence diagram in the Rust core (shipped)

**Status: implemented** in `kymostudio-core`. The `crate::sequence` IR, the Mermaid
`sequenceDiagram` parser (`crate::mermaid::parse_sequence`), the three interchange emitters
(`to_xmi` / `to_mdj` / `to_gaphor`), the pure-Rust SVG renderer (`sequence::svg::render`), and the
shared `sequence::layout` all exist with `cargo` tests (XMI/mdj/gaphor goldens + render). The Rust
`kymo` CLI dispatches `.xmi` / `.mdj` / `.gaphor` outputs from a `sequenceDiagram` source.

## Phase 2 — Binding parity (next)

Close the surface gap (`FR-UML-5`, `DESIGN-UML-001` §4): expose `mermaid_to_xmi` /
`mermaid_to_mdj` / `mermaid_to_gaphor` through **PyO3** (`python.rs`) and **wasm** (`wasm.rs`),
and add the Python `cli.py` / JS `bin` dispatch for `.xmi` / `.mdj` / `.gaphor` outputs. Adds
cross-impl parity tests (today blocked — `TEST-UML-001` §3). Subject to the two-release core
rollout (new core APIs land first, then the Python/JS floors are raised — cf. `PLAN-FLOWCHART-001`
open items).

## Phase 3 — Sequence render completeness

Draw **notes** and **activations** in `sequence::svg` (layout already tracks lifeline centres and
rows; the renderer skips these today). Add the omitted constructs to `to_mdj` (activations/notes)
where StarUML supports them.

## Phase 4+ — More UML diagram types (per module)

Each new type is its own `crate::<type>` IR + parser arm + emit/render, with a `modules/<type>/`
doc set:

- **state machine** (`FEAT-UML-STATE-001`) — node-edge shaped; may reuse the layered layout. The
  cleanest next type. Today `stateDiagram` is recognised-but-`Unsupported` in core and drawn only
  by external Mermaid.js.
- **class** (`FEAT-UML-CLASS-001`) — compartment-sized class boxes + typed relations
  (inheritance/composition/aggregation, cardinalities); needs its own sizing + layout.
- **use-case / activity / component / object / deployment / package / timing / communication** —
  reserved per UML 2.5.1 (see the diagram-taxonomy data set `docs/data/database.dbml`). PlantUML
  (`REF-PLANTUML-001`) is the natural second **source spoke** feeding these.

## Open items / risks

- **Binding parity is the headline gap.** XMI/mdj/gaphor work in core but reach no user on
  Python/JS; only sequence-SVG is on wasm. Until Phase 2, the UML export story is Rust-CLI-only.
- **Stale neighbour modules to reconcile.** `FEAT-MERMAID-SEQUENCE-001` (and the class/state
  Mermaid modules) are marked **Reserved**, but the Mermaid `sequenceDiagram` *parser* has since
  shipped as this hub's source spoke. Those `format-mermaid` modules should be updated to point at
  `FEAT-UML-SEQUENCE-001` for the model/emit/render side (front-end parser vs UML hub split). —
  follow-up CR against `FEAT-MERMAID-001`.
- **Gaphor fragment flattening** (`FR-UML-6`) is a metamodel limit, not a bug — kept documented.
- **External-Mermaid render for class/state.** The `class-*.svg` / `state-*.svg` samples are
  produced by Mermaid.js (via the render-api fallback), **not** kymo — so they are not yet a kymo
  capability; the modules stay Reserved until a native IR + renderer lands.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-13 | Vũ Anh | Initial issue. Phase 1 (sequence) recorded as shipped from a project scan; Phase 2 = binding parity (the headline gap); Phase 3 = render completeness; Phase 4+ = reserved UML types. Flagged the stale `format-mermaid` sequence/class/state modules and the external-Mermaid render of class/state as reconciliation items. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/diagram-uml/04-PLAN.md`; authoritative source is the
main-branch working tree, history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature.

### B.3 Change Control
Changes require: update the affected phase/risk; keep `FEAT`/`DESIGN`/`TEST`-`UML` consistent;
increment `version`; append to Annex A. Scope changes are minted as `CR/` entries against
`FEAT-UML-001`.

### B.4 Backwards Compatibility
Every phase before the binding-parity break preserves the Rust-CLI surface; new surfaces are
additive.

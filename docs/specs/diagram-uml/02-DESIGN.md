---
title: UML Diagram Hub — Design
document_id: DESIGN-UML-001
version: "0.1"
issue_date: 2026-06-13
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers maintaining the UML IRs, importers, emitters, renderers
review_cycle: On architecture change
supersedes: null
related_documents:
  - FEAT-UML-001
  - TEST-UML-001
  - PLAN-UML-001
  - FEAT-UML-SEQUENCE-001
  - FEAT-FLOWCHART-001
  - FEAT-MERMAID-001
  - KYMOJSON-MAP-001
  - RES-PIPELINE-001
authors:
  - Vũ Anh
language: en
keywords:
  - uml
  - sequence
  - ir
  - xmi
  - architecture
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# UML Diagram Hub — Design

| Field             | Value |
|-------------------|-------|
| Document ID       | `DESIGN-UML-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `packages/rust/kymostudio-core` |
| Related Documents | `FEAT-UML-001` (traced), `TEST-UML-001`, `PLAN-UML-001`; sibling `FEAT-FLOWCHART-001` |

## 1. Per-type intermediate representations

The flowchart hub has **one** IR because every flowchart language is node-edge shaped. UML is
not: a sequence is lifelines + time-ordered messages; a class diagram is compartment-sized boxes
+ typed relations; a state machine is states + transitions. So the UML hub is a **family of
typed, positionless IRs**, one per diagram type, sharing the export/render discipline rather than
a single data model (`FR-UML-1`).

The first IR — sequence (`crate::sequence`, `src/sequence/mod.rs`) — as built:

```rust
pub struct Sequence { pub participants: Vec<Participant>, pub items: Vec<Item> }
pub struct Participant { pub id: String, pub label: String, pub is_actor: bool }
pub enum Item { Message(Message), Activate(String), Deactivate(String),
                Note(Note), Fragment(Fragment) }
pub struct Message { /* from, to, label, */ pub sort: MessageSort }
pub enum MessageSort { SynchCall, AsynchCall, AsynchSignal, Reply,
                       CreateMessage, DeleteMessage }
pub struct Fragment { /* operator + operands(+guards) */ }  // Loop | Alt | Opt | Par
pub struct Note { /* placement: LeftOf | RightOf | Over */ }
```

The IR carries **no coordinates**; geometry is computed by a type-specific layout only for the
targets that need it (SVG, `.mdj` views). This is the single decision the rest follows from
(mirrors `DESIGN-FLOWCHART-001` §1).

## 2. Spoke topology (sequence as built)

```
 sequenceDiagram text ──parse_sequence──▶ Sequence ──┬── to_xmi    ─────────▶ .xmi  (uml:Interaction)
   (crate::mermaid)                        (IR)      ├── to_mdj  ──layout──▶ .mdj  (StarUML model+views)
                                                     ├── to_gaphor ────────▶ .gaphor (flattened fragments)
                                                     └── svg::render ─layout▶ SVG
```

- **Source-syntax importer** — `crate::mermaid::parse_sequence(&str) -> Result<Sequence>`
  (`src/mermaid/sequence.rs`). It owns Mermaid's `sequenceDiagram` grammar (participant/actor,
  arrow sorts, `activate`/`deactivate`, notes, `loop`/`alt`/`opt`/`par` with `else`/`and`
  guards, `autonumber`). Pure `&str → IR`; no layout, no emit (`FR-UML-2`).
- **Interchange emitters** (`FR-UML-3`) — pure `&Sequence → String`:
  - `sequence::emit::to_xmi` → OMG **XMI 2.5.1**: each participant → `uml:Lifeline`; each message
    → `uml:Message` + two `MessageOccurrenceSpecification`; activations →
    `BehaviorExecutionSpecification`/`ExecutionOccurrenceSpecification`; fragments →
    `uml:CombinedFragment` + `InteractionOperand`/`InteractionConstraint`; notes → `ownedComment`.
  - `sequence::mdj::to_mdj` → **StarUML** metadata-JSON: model (`UMLCollaboration` →
    `UMLInteraction` → `UMLSequenceDiagram`) **plus laid-out views** (lifeline/message/fragment
    view geometry), so the file opens rendered. Runs `sequence::layout`.
  - `sequence::gaphor::to_gaphor` → **Gaphor** XML v3.0: flat model + presentation. Gaphor's
    metamodel has **no CombinedFragment**, so alt/loop/opt/par are **flattened** — messages keep
    their order, the box + guards are dropped (explicit degradation, `FR-UML-6`).
- **Renderer** (`FR-UML-4`) — `sequence::svg::render` over `sequence::layout` (lifeline centres,
  message rows, fragment boxes); pure-Rust SVG, no external binary. Notes/activations are not yet
  drawn (layout incomplete for them).
- **Shared layout** — `sequence::layout::layout(&Sequence) -> Layout` is consumed by `to_mdj`,
  `to_gaphor`, and `svg::render` (one geometry source).

## 3. Key decisions

- **Typed IR per diagram, not a universal model.** UML diagram types are semantically disjoint;
  forcing them onto one model would lose the very structure XMI/`.mdj` need. Each type is its own
  `crate::<type>` sub-model with its own layout (`FR-UML-1`, `NFR-UML-4`).
- **Source syntax is a spoke, the hub owns the model.** The Mermaid `sequenceDiagram` parser
  lives in `crate::mermaid` (the `FEAT-MERMAID-001` front-end); the IR + emitters + renderer are
  this hub — exactly the flowchart-hub/Mermaid split. PlantUML, when added, is a second source
  spoke producing the same IR.
- **Interchange formats are UML-metamodel serializations.** XMI/`.mdj`/`.gaphor` belong to this
  hub (not the pipeline draw.io encoder), because they encode the UML metamodel, not a generic
  positioned `Diagram`.
- **Explicit, documented fidelity loss.** Targets that cannot represent a construct degrade
  visibly (Gaphor fragment flattening; `.mdj` activation/note omission) and say so in the module +
  mapping, never silently (`FR-UML-6`).

## 4. As-built deviations to close (binding parity)

The engine functions exist, but the surfaces are uneven (`FR-UML-5`):

| Function | Rust CLI | PyO3 (Python) | wasm (JS) |
|---|---|---|---|
| `mermaid_to_xmi` | ✅ (`.xmi`) | ❌ | ❌ |
| `mermaid_to_mdj` | ✅ (`.mdj`) | ❌ | ❌ |
| `mermaid_to_gaphor` | ✅ (`.gaphor`) | ❌ | ❌ |
| `mermaid_to_sequence_svg` | (via render path) | ❌ | ✅ `mermaidSequenceToSvg` |

`PLAN-UML-001` tracks exposing the three interchange emitters through PyO3 + wasm and adding the
CLI/bin dispatch on the Python/JS sides.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-13 | Vũ Anh | Initial issue — per-type IR rationale, the as-built sequence spoke topology (parser + XMI/mdj/gaphor emitters + SVG renderer + shared layout), key decisions, and the binding-parity deviation table. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/diagram-uml/02-DESIGN.md`; authoritative source is the
main-branch working tree, history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature.

### B.3 Change Control
Changes require: update the clause; keep `FEAT`/`TEST`/`PLAN`-`UML` consistent; increment
`version`; append to Annex A.

### B.4 Backwards Compatibility
Reconcile with `FEAT-UML-001` and the source-spoke front-end before release.

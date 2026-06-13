---
title: UML Sequence — Requirements (module)
document_id: FEAT-UML-SEQUENCE-001
version: "0.1"
issue_date: 2026-06-13
status: Implemented
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers maintaining the UML sequence IR, emitters, renderer
review_cycle: On sequence-subsystem change
supersedes: null
related_documents:
  - FEAT-UML-001              # UML hub (umbrella)
  - DESIGN-UML-001            # hub design (sequence topology)
  - TEST-UML-001              # hub tests (sequence goldens)
  - FEAT-MERMAID-001          # the sequenceDiagram source-syntax front-end
  - FEAT-MERMAID-SEQUENCE-001 # the (now-superseded) Mermaid reserved module — see PLAN-UML-001
authors:
  - Vũ Anh
language: en
keywords:
  - uml
  - sequence
  - xmi
  - staruml
  - gaphor
  - implemented
---

# UML Sequence — Requirements (module)

**Status: implemented.** The first UML diagram type in `kymostudio-core`. A Mermaid
`sequenceDiagram` source is parsed into a positionless sequence IR and emitted to three UML
interchange formats plus SVG.

- **FR-UML-SEQ-1.** IR `crate::sequence` (`src/sequence/mod.rs`): `Sequence` = participants +
  ordered `Item`s; `Participant {id,label,is_actor}`; `Item` = `Message | Activate | Deactivate |
  Note | Fragment`; `MessageSort` = `SynchCall | AsynchCall | AsynchSignal | Reply | CreateMessage
  | DeleteMessage`; `Fragment` operator `Loop | Alt | Opt | Par` with guarded operands; `Note`
  placement `LeftOf | RightOf | Over`. Positionless (`FR-UML-1`).
- **FR-UML-SEQ-2.** Parser `crate::mermaid::parse_sequence` (`src/mermaid/sequence.rs`) — Mermaid
  `sequenceDiagram`: `participant`/`actor`, all arrow sorts, `activate`/`deactivate`, notes,
  `loop`/`alt`/`opt`/`par` with `else`/`and` guards, `autonumber`. Pure `&str → Sequence`.
- **FR-UML-SEQ-3.** Emitters (pure `&Sequence → String`):
  `sequence::emit::to_xmi` → **OMG XMI 2.5.1** `uml:Interaction` (lifelines, messages +
  occurrence specs, executions, combined fragments + operand guards, comments) — full;
  `sequence::mdj::to_mdj` → **StarUML `.mdj`** model + laid-out views (activations/notes omitted
  v1; `synchCall` sort omitted = StarUML default);
  `sequence::gaphor::to_gaphor` → **Gaphor v3.0** (CombinedFragment unsupported by Gaphor →
  fragments **flattened**; documented loss, `FR-UML-6`).
- **FR-UML-SEQ-4.** Renderer `sequence::svg::render` over `sequence::layout` — pure-Rust SVG
  (participants, messages per sort, self-messages, combined-fragment boxes). Notes/activations
  not yet drawn (`PLAN-UML-001` Phase 3).
- **FR-UML-SEQ-5.** Public core APIs: `mermaid_to_xmi`, `mermaid_to_mdj`, `mermaid_to_gaphor`,
  `mermaid_to_sequence_svg` (`src/lib.rs`). Rust `kymo` CLI: `kymo seq.mmd seq.{xmi,mdj,gaphor}`.
  **Binding gap:** only `mermaidSequenceToSvg` (wasm); no PyO3/JS exposure of the interchange
  emitters yet — `PLAN-UML-001` Phase 2.

**Out of scope:** notes/activations in SVG (Phase 3); reverse import (`.xmi`/`.mdj`/`.gaphor` →
IR); PlantUML sequence source.

**Verification:** `tests/sequence_xmi.rs`, `tests/sequence_mdj.rs`, `tests/sequence_gaphor.rs`
(golden + determinism + well-formedness); fixtures `tests/fixtures/sequence/`. See `TEST-UML-001`.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-13 | Vũ Anh | Initial issue — documents the shipped sequence subsystem (IR, Mermaid parser, XMI/mdj/gaphor emitters, SVG renderer) and the binding gap. |

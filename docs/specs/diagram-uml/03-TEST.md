---
title: UML Diagram Hub — Test
document_id: TEST-UML-001
version: "0.1"
issue_date: 2026-06-13
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers verifying the UML IRs, importers, emitters, renderers
review_cycle: On test-surface change
supersedes: null
related_documents:
  - FEAT-UML-001
  - DESIGN-UML-001
  - PLAN-UML-001
  - FEAT-UML-SEQUENCE-001
authors:
  - Vũ Anh
language: en
keywords:
  - uml
  - sequence
  - test
  - xmi
  - verification
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# UML Diagram Hub — Test

| Field             | Value |
|-------------------|-------|
| Document ID       | `TEST-UML-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `packages/rust/kymostudio-core` |
| Related Documents | `FEAT-UML-001` (traced), `DESIGN-UML-001`, `PLAN-UML-001` |

## 1. Strategy

Each layer is **pure** (`&str → IR`, `&IR → String`), so parser, emitters, and renderer are
unit-testable in isolation (`NFR-UML-4`), and each interchange format is checked against a golden
fixture for byte-stability and tool-openability.

| Level | What | Where (as-built) |
|---|---|---|
| **Unit — parser** | `parse_sequence` handles participants/actors, all message sorts, activate/deactivate, notes, fragments (`loop`/`alt`/`opt`/`par` + guards), autonumber. | `src/mermaid/sequence.rs` `#[cfg(test)]` |
| **Golden — XMI** | `mermaid_to_xmi` → byte-stable XMI 2.5.1; well-formed; deterministic ids. | `tests/sequence_xmi.rs` + `tests/fixtures/sequence/golden/*.xmi` |
| **Golden — StarUML** | `mermaid_to_mdj` → `.mdj` model + views; file structure + cross-refs validated. | `tests/sequence_mdj.rs` |
| **Golden — Gaphor** | `mermaid_to_gaphor` → `.gaphor` v3.0; fragments flattened (documented loss). | `tests/sequence_gaphor.rs` + `tests/fixtures/sequence/gaphor_golden/*.gaphor` |
| **Render** | `mermaid_to_sequence_svg` produces well-formed SVG (participants, messages, fragments). | `src/sequence/svg.rs` + lib integration |
| **Determinism** | Two runs of each emitter are byte-equal (`NFR-UML-1`). | per-emitter test |

Fixtures: `tests/fixtures/sequence/{basic,activations,fragments,notes}.mmd`.

## 2. Acceptance

- `cargo test` green: parser units, XMI/mdj/gaphor goldens, render integration, determinism.
- A `sequenceDiagram` fixture exports to **`.xmi`, `.mdj`, and `.gaphor`** via the Rust `kymo`
  CLI (`kymo seq.mmd seq.xmi`), each opening in its tool (OMG-XMI consumer / StarUML / Gaphor).
- `NFR-UML-3` standards checks pass: XMI well-formed + UML 2.5.1-valid; `.mdj`/`.gaphor` open.

## 3. Not yet covered (gaps → `PLAN-UML-001`)

- **Cross-impl parity tests** for XMI/mdj/gaphor — blocked: those emitters are **not exposed**
  through PyO3 or wasm yet (`FR-UML-5`), so there is no Python/JS surface to assert against. Only
  `mermaidSequenceToSvg` (wasm) has a JS surface, and it has no dedicated JS test today.
- **SVG goldens** — the sequence renderer is verified structurally + by resvg rasterization, not
  by byte-goldens; notes/activations are not yet drawn, so not yet asserted.
- **Class / state / other UML types** — reserved; no tests (no implementation).

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-13 | Vũ Anh | Initial issue — test strategy + acceptance for the as-built sequence spoke (XMI/mdj/gaphor goldens, render, determinism); recorded the cross-impl-parity and SVG-golden gaps. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/diagram-uml/03-TEST.md`; authoritative source is the
main-branch working tree, history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature.

### B.3 Change Control
Changes require: update the affected case; keep `FEAT`/`DESIGN`/`PLAN`-`UML` consistent;
increment `version`; append to Annex A.

### B.4 Backwards Compatibility
The XMI/mdj/gaphor goldens are the contract that interchange output stays tool-openable; no drift
without a documented intentional change.

---
title: BPMN in the kymo DSL — Test Documentation
document_id: FEAT-BPMN-DSL-TST-001
version: "0.1"
issue_date: 2026-05-23
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the BPMN-in-kymo feature
review_cycle: On milestone completion, or on grammar change
supersedes: null
related_documents:
  - FEAT-BPMN-DSL-001        # Introduction
  - FEAT-BPMN-DSL-REQ-001    # Requirements (traced below)
  - FEAT-BPMN-DSL-DSN-001    # Design
  - FEAT-BPMN-DSL-PLAN-001   # Plan
  - DSL-LANG-001             # kymo DSL language specification (normative)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - dsl
  - test
  - verification
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN in the kymo DSL — Test Documentation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-DSL-TST-001                             |
| Version      | 0.1                                                |
| Status       | Proposed                                           |
| Issue Date   | 2026-05-23                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-BPMN-DSL-001, FEAT-BPMN-DSL-REQ-001, FEAT-BPMN-DSL-DSN-001, FEAT-BPMN-DSL-PLAN-001 |

Verifies the requirements in FEAT-BPMN-DSL-REQ-001 (FR/NFR IDs). Covers
12207 Verification & Validation.

## 1. Test approach and levels

- **Unit** — `bpmn_layout` rank/order/coordinate functions on small graphs.
- **Parser** — `bpmn { }` grammar in `packages/python/tests/test_dsl.py`.
- **Integration** — byte-for-byte golden SVG under
  `packages/python/tests/diagrams/bpmn_block_order/`.
- **Regression gate** — existing `tests/test_bpmn_corpus.py` + `test_edges`/
  `test_layout`/`test_diagrams` goldens remain green **without** regeneration.
- **Parity** — JS parser + render smoke (`packages/js/tests/`).

## 2. Test items, environment, tooling

`packages/python` (`uv run --group dev python -m pytest`), `packages/js`
(`npm test` → `node --test`), `rsvg-convert` for raster eyeballing, and the
`KYMO_UPDATE_GOLDEN` mechanism for minting the new golden only.

## 3. Test cases

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-1** | Node kind → (shape, marker) | FR-3, FR-4 | Each kind/`type=` maps to the expected `bpmn-*` shape + marker key |
| **TC-2** | Chain / `;` expansion | FR-7 | `A -> B -> C` and `;` yield the expected `Edge` set |
| **TC-3** | Flow-kind arrows | FR-6 | `->`/`~>`/`..>` set `bpmn_flow` = sequence/message/association |
| **TC-4** | Auto-layout structure | FR-8 | Linear, single-branch, and split/join graphs get correct ranks + crossing-min order |
| **TC-5** | Pin override | FR-9 | A node with `@ (x,y)` keeps that centre; incident edges re-route; un-pinned nodes unchanged |
| **TC-6** | Resolved emission | FR-10 | Components have absolute `pos`/`size`; edges carry `points` + `bpmn_flow` |
| **TC-7** | Determinism | NFR-1 | Re-running layout yields byte-identical SVG |
| **TC-8** | `order-flow` golden | FR-1, FR-8, FR-10 | `samples/order-flow.kymo` renders LR with split/join; matches committed golden |
| **TC-9** | No regression | NFR-2 | Existing goldens + corpus baseline pass unchanged (no regen) |
| **TC-10** | JS parity | FR-11, NFR-3 | JS parses the block and emits `bpmn-flow` edges + `bpmn-*` glyphs; `npm test` green; no runtime deps |

## 4. Pass/fail criteria

A milestone passes when its mapped test cases pass and the full Python suite
(incl. the regression gate) and JS `npm test` are green. Any golden change
outside the new `bpmn_block_order` case is a **failure**, not a re-baseline.

## 5. Requirements traceability matrix

| Requirement | Test case(s) |
|-------------|--------------|
| FR-1 | TC-8 |
| FR-2 | TC-1, TC-2 |
| FR-3 | TC-1 |
| FR-4 | TC-1 |
| FR-5 | TC-6 |
| FR-6 | TC-3 |
| FR-7 | TC-2 |
| FR-8 | TC-4, TC-8 |
| FR-9 | TC-5 |
| FR-10 | TC-6, TC-8 |
| FR-11 | TC-10 |
| NFR-1 | TC-7 |
| NFR-2 | TC-9 |
| NFR-3 | TC-10 |
| NFR-4 | (by design — no cross-language byte comparison) |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial issue. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/features/bpmn-dsl/04-TEST.md`; authoritative source
is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
When a requirement changes, update the affected test case(s) and the
traceability matrix in the same revision; increment `version`; append a row to
Annex A.

### B.4 Backwards Compatibility
Test-case IDs are stable; a removed case SHALL be marked withdrawn (not re-used)
so traceability links remain valid.

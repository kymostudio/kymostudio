---
title: BPMN 2.0 Export — Test Documentation
document_id: FEAT-BPMN-EXPORT-TST-001
version: "0.1"
issue_date: 2026-05-23
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the BPMN export feature
review_cycle: On phase completion, or on BPMN-mapping change
supersedes: null
related_documents:
  - FEAT-BPMN-EXPORT-001        # Introduction
  - FEAT-BPMN-EXPORT-REQ-001    # Requirements (traced below)
  - FEAT-BPMN-EXPORT-DSN-001    # Design
  - FEAT-BPMN-EXPORT-PLAN-001   # Plan
  - BPD-DGM-001                 # BPMN importer (round-trip counterpart)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - export
  - test
  - round-trip
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN 2.0 Export — Test Documentation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-EXPORT-TST-001                           |
| Version      | 0.1                                                |
| Status       | Proposed                                           |
| Issue Date   | 2026-05-23                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-BPMN-EXPORT-001, FEAT-BPMN-EXPORT-REQ-001, FEAT-BPMN-EXPORT-DSN-001, FEAT-BPMN-EXPORT-PLAN-001 |

Verifies FEAT-BPMN-EXPORT-REQ-001 (FR/NFR IDs). Covers 12207 Verification &
Validation. The headline check is **round-trip** against the importer (BPD-DGM-001).

## 1. Test approach and levels

- **Unit** — the inverse maps `(shape, marker) → element tag` and `bpmn_flow → flow
  element`; the centre→top-left DI bounds math; waypoint/label emission.
- **Integration** — `to_bpmn.export()` on whole diagrams; well-formedness + re-import.
- **Round-trip (key)** — over `samples/*.bpmn` + the vendored `tests/corpus_bpmn/*.bpmn`:
  `parse_bpmn → export → parse_bpmn` and compare structure (reusing the corpus harness).
- **Parity** — the JS `toBpmn` produces equivalent XML and round-trips via `parseBpmn`.

## 2. Test items, environment, tooling

`packages/python` (`uv run --group dev python -m pytest`), `packages/js` (`npm test`
→ `node --test`), the existing `tests/corpus_bpmn/` MIWG corpus + `parse_bpmn`, and
XML well-formedness via the standard library.

## 3. Test cases

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-1** | Node mapping | FR-2 | Each `(shape, marker)` emits the expected element tag + `*EventDefinition` / task / gateway form |
| **TC-2** | Flow mapping | FR-3 | `bpmn_flow` → `sequenceFlow`/`messageFlow`/`association`; `default` sets `default="…"` on source; `conditional` adds `<conditionExpression>` |
| **TC-3** | DI geometry | FR-4 | `<dc:Bounds>` = centre−size/2 + size; `<di:waypoint>`s from `points`; `<BPMNLabel>` from `label_pos` |
| **TC-4** | Containers | FR-5 | Pools/lanes → `collaboration`+`participant`+`laneSet`/`lane`(`flowNodeRef`); group → `group`; expanded subprocess nests members |
| **TC-5** | Well-formed + valid | FR-1, NFR-2 | Exported XML parses; re-imports via `from_bpmn` without error |
| **TC-6** | Round-trip structure | NFR-1 | `import → export → re-import` preserves component/edge/region counts + per-id shape/marker/flow/geometry (within rounding) across `samples/` + corpus |
| **TC-7** | Determinism | FR-6, NFR-4 | Re-exporting the same `Diagram` yields byte-identical XML |
| **TC-8** | CLI `--bpmn` | FR-7 | `kymo <file> --bpmn` writes a `.bpmn`; output parses |
| **TC-9** | JS parity | FR-8, NFR-3 | JS `toBpmn` emits equivalent XML, round-trips via `parseBpmn`; `npm test` green; no runtime deps |

## 4. Pass/fail criteria

A phase passes when its mapped test cases pass and the full Python suite (incl. the
BPMN corpus gate) and JS `npm test` are green. Round-trip drift on any corpus file
(changed counts, shapes, markers, or flow kinds) is a **failure**, not a re-baseline.

## 5. Requirements traceability matrix

| Requirement | Test case(s) |
|-------------|--------------|
| FR-1 | TC-5 |
| FR-2 | TC-1, TC-6 |
| FR-3 | TC-2, TC-6 |
| FR-4 | TC-3, TC-6 |
| FR-5 | TC-4, TC-6 |
| FR-6 | TC-7 |
| FR-7 | TC-8 |
| FR-8 | TC-9 |
| NFR-1 | TC-6 |
| NFR-2 | TC-5 |
| NFR-3 | TC-9 (+ CI: no new deps) |
| NFR-4 | TC-7 |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial issue. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/features/bpmn-export/04-TEST.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
When a requirement changes, update the affected test case(s) and the traceability
matrix in the same revision; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are stable; a removed case SHALL be marked withdrawn (not re-used) so
traceability links remain valid.

---
title: Kymo DSL Front-End — Test Documentation
document_id: TEST-KYMO-DSL-001
version: "1.0"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the kymo DSL front-end
review_cycle: On phase completion, or on grammar change
supersedes: null
related_documents:
  - INTRO-KYMO-DSL-001       # Introduction
  - FEAT-KYMO-DSL-001        # Requirements (traced below)
  - DESIGN-KYMO-DSL-001      # Design
  - PLAN-KYMO-DSL-001        # Plan
  - KYMO-DSL-001             # kymo DSL language specification (normative grammar)
  - TEST-BPMN-DSL-001        # bpmn { } block tests (delegated subset)
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - test
  - verification
  - traceability
  - conformance
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo DSL Front-End — Test Documentation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-KYMO-DSL-001                                  |
| Version      | 1.0                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-24                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-KYMO-DSL-001, FEAT-KYMO-DSL-001, DESIGN-KYMO-DSL-001, PLAN-KYMO-DSL-001 |

Verifies the requirements in FEAT-KYMO-DSL-001 (FR/NFR IDs). Covers
ISO/IEC/IEEE 12207 Verification & Validation.

## 1. Test approach and levels

- **Parser unit** — grammar productions in `packages/python/tests/test_dsl.py`
  (directives, leaves, containers, edges, layout trees, comments).
- **Pipeline golden** — byte-for-byte resolved-SVG fixtures in
  `tests/test_diagrams.py`, `tests/test_layout.py`, `tests/test_edges.py`
  (the resolution pipeline end-to-end against committed `output.svg`).
- **Sample corpus** — every `samples/*.kymo` parses + renders (Python and JS).
- **Conformance** — golden `.kymo` → resolved-model JSON deep-equal across both
  implementations (`tests/test_conformance.py` / `conformance.test.js`), Python
  the sole golden writer.
- **Parity / lint gates** — JS `npm test` (build + `node --test`); `ruff check`
  before pytest in CI.

## 2. Test items, environment, tooling

`packages/python` (`uv run --group dev python -m pytest -q`), `packages/js`
(`npm test` → `node --test`), `rsvg-convert` for raster eyeballing, and the
`KYMO_UPDATE_GOLDEN` / `KYMO_UPDATE_CONFORMANCE` mechanisms for regenerating
goldens after an **intentional** change (Python is the sole golden writer).

## 3. Test cases

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-1**  | Metadata directives | FR-2 | `canvas`/`title`/`subtitle`/`external` parse to the expected `Diagram` fields; cardinality respected |
| **TC-2**  | Leaf + placement | FR-1, FR-3 | `id shape/icon/accent "Name" "Sub"` with absolute `(x,y)` and relative `<parent> <side> [gap]` build the expected `Component` |
| **TC-3**  | Region container + options | FR-4 | `outer`/`inner`/`cluster` + each option (`padding`, `stroke`, `label-position`, …) set the expected region fields |
| **TC-4**  | Layout container | FR-5 | `horizontal`/`vertical pos gap [align]`; body of bare-ids only; inline leaf / nested container rejected |
| **TC-5**  | Region body & grid rows | FR-6 | Nested containers, inline leaves, bare-id refs, and `row […]` grid mode populate `contains` / `layout_dict` as expected |
| **TC-6**  | Edges + options | FR-7 | `-->`/`==>`/`---` + `src`/`dst`/`via`/`label_*`/`route`/flags build the expected `Edge` |
| **TC-7**  | Anonymous layout tree | FR-8 | `layout { a | b , c }` tokenises and nests correctly; mixed separators at one level rejected |
| **TC-8**  | Comment / colour literal | FR-10 | `#` outside quotes is stripped; `#rrggbb` is preserved as a colour literal |
| **TC-9**  | Pipeline resolution golden | FR-11, FR-12, NFR-1 | `test_diagrams` / `test_layout` / `test_edges` byte-match committed `output.svg` (auto-layouts, anchoring, bounds, staggering, auto-canvas) |
| **TC-10** | Sample `.kymo` corpus | FR-1…FR-12 | Every `samples/*.kymo` parses and renders without error in Python and JS |
| **TC-11** | Python↔JS conformance | FR-13, NFR-2, NFR-3, NFR-4 | `test_conformance.py` / `conformance.test.js` deep-equal the same golden model JSON; `npm test` green; zero JS runtime deps |
| **TC-12** | BPMN block delegation | FR-9 | A `bpmn { }` block is recognised and routed to the BPMN sub-pipeline; full coverage is **TEST-BPMN-DSL-001** |

## 4. Pass/fail criteria

A change passes when its mapped test cases pass and the full Python suite (incl.
`ruff check` and the golden/conformance gates) and JS `npm test` are green. Any
golden or conformance change outside an intentional, documented modification is a
**failure**, not a re-baseline — regenerate (`KYMO_UPDATE_GOLDEN` /
`KYMO_UPDATE_CONFORMANCE`) only for deliberate front-end changes.

## 5. Requirements traceability matrix

| Requirement | Test case(s) |
|-------------|--------------|
| FR-1  | TC-2, TC-10 |
| FR-2  | TC-1 |
| FR-3  | TC-2 |
| FR-4  | TC-3 |
| FR-5  | TC-4 |
| FR-6  | TC-5 |
| FR-7  | TC-6 |
| FR-8  | TC-7 |
| FR-9  | TC-12 |
| FR-10 | TC-8 |
| FR-11 | TC-9 |
| FR-12 | TC-9, TC-10 |
| FR-13 | TC-11 |
| NFR-1 | TC-9 |
| NFR-2 | TC-11 |
| NFR-3 | TC-11 |
| NFR-4 | TC-11 |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — test documentation for the shipped `.kymo` front-end. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-dsl/04-TEST.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
When a requirement changes, update the affected test case(s) and the traceability
matrix in the same revision; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are stable; a removed case SHALL be marked withdrawn (not re-used)
so traceability links remain valid.

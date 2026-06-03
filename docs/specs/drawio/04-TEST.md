---
title: draw.io Interoperability — Test Documentation (umbrella)
document_id: TEST-DRAWIO-001
version: "0.1"
issue_date: 2026-06-03
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the drawio family
review_cycle: On a module being added/delivered, or on substrate change
supersedes: null
related_documents:
  - INTRO-DRAWIO-001        # Introduction (umbrella)
  - FEAT-DRAWIO-001         # Requirements (umbrella, traced below)
  - DESIGN-DRAWIO-001       # Design (umbrella)
  - PLAN-DRAWIO-001         # Plan (umbrella)
  - TEST-DRAWIO-SVG-001     # module: drawio-svg test set (rolls up here)
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - test
  - verification
  - umbrella
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# draw.io Interoperability — Test Documentation (umbrella)

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-DRAWIO-001                                    |
| Version      | 0.1                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-06-03                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-DRAWIO-001, FEAT-DRAWIO-001, DESIGN-DRAWIO-001, PLAN-DRAWIO-001, TEST-DRAWIO-SVG-001 |

Verifies FEAT-DRAWIO-001 (family FR/NFR). Covers 12207 Verification & Validation. The **detailed**
cases live in each module's `04-TEST` (e.g. `TEST-DRAWIO-SVG-001` `TC-DS-1..9`); this umbrella defines
**family-level invariants** that every module must satisfy and the traceability that rolls module
suites up to the family requirements.

## 1. Test approach and levels

- **Module suites (primary)** — each module ships its own unit/integration cases (e.g.
  `TEST-DRAWIO-SVG-001`). The umbrella does **not** duplicate them.
- **Family invariants (here)** — cross-module checks asserted on **every** delivered module: pure-Node
  execution, the zero-runtime-dep guarantee, additivity to existing kymo paths, and substrate reuse.

## 2. Test items, environment, tooling

The delivered module code under `packages/js/src/` and its suite; `packages/js` (`npm test`); the
golden-SVG + BPMN-corpus gates (for additivity); Node ≥21. New modules register their suite and map it
to the family cases below.

## 3. Family-level test cases (`TC-DRW`)

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-DRW-1** | Pure-Node interop | FR-DRW-1, NFR-DRW-2 | Each delivered module runs `.drawio` interop headless (no desktop binary, no browser) |
| **TC-DRW-2** | Substrate reuse | FR-DRW-2 | Each module that reads `.drawio` uses the shared wrapper decode / mxGraph-on-jsdom (no re-implementation); multi-page + compressed inputs handled |
| **TC-DRW-3** | Zero-runtime-dep | FR-DRW-4, NFR-DRW-1 | After installing any module's deps, `kymostudio` (`packages/js`) runtime `dependencies` stays **empty**; deps are dev-only; module sources excluded from build + not published |
| **TC-DRW-4** | Additivity | NFR-DRW-3 | Existing kymo render/import paths stay byte-identical (golden-SVG + BPMN-corpus baselines unchanged) when a module is added |
| **TC-DRW-5** | Determinism | NFR-DRW-4 | Each module yields deterministic output for a given input + options |

## 4. Pass/fail criteria

A module is accepted into the family when **its own suite** passes **and** the family invariants
`TC-DRW-1..5` hold for it, with the full `packages/js` `npm test` (incl. golden-SVG + BPMN-corpus
gates) green. Any leak of an interop dep into the published runtime `dependencies`, or any golden/corpus
drift on existing paths, is a **failure**.

## 5. Requirements traceability matrix

| Family requirement | Family case | Module evidence (drawio-svg) |
|--------------------|-------------|------------------------------|
| FR-DRW-1 | TC-DRW-1 | TC-DS-9 |
| FR-DRW-2 | TC-DRW-2 | TC-DS-1, TC-DS-2, TC-DS-3 |
| FR-DRW-3 | (module delivery) | the `drawio-svg` doc-set |
| FR-DRW-4 | TC-DRW-3 | TC-DS-6 |
| NFR-DRW-1 | TC-DRW-3 | TC-DS-6 |
| NFR-DRW-2 | TC-DRW-1 | TC-DS-9 |
| NFR-DRW-3 | TC-DRW-4 | TC-DS-6 (golden-safety scope) |
| NFR-DRW-4 | TC-DRW-5 | TC-DS-8 |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-03 | Vũ Anh | Initial umbrella test doc: family invariants `TC-DRW-1..5` + traceability rolling up the `drawio-svg` module suite. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/drawio/04-TEST.md`; authoritative source is the main-branch working
tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the family; available to all repository readers.

### B.3 Change Control
When a family requirement changes or a module is added, update the affected case(s) + the traceability
matrix in the same revision; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are stable; a removed case SHALL be marked withdrawn (not re-used) so traceability links
remain valid.

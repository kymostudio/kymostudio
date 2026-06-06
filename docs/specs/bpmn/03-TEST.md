---
title: BPMN Support — Test Documentation (umbrella)
document_id: TEST-BPMN-001
version: "0.1"
issue_date: 2026-06-06
status: Draft
classification: Internal
owner: packages/python (kymo CLI) · packages/js
audience: Engineers verifying the BPMN family
review_cycle: On a module being added/delivered, or on mapping/pipeline change
supersedes: null
related_documents:
  - FEAT-BPMN-001           # Requirements (umbrella, traced below)
  - DESIGN-BPMN-001         # Design (umbrella)
  - PLAN-BPMN-001           # Plan (umbrella)
  - TEST-BPMN-PARSER-001    # module: parser test set (rolls up here)
  - TEST-BPMN-EXPORT-001    # module: export test set (rolls up here)
  - TEST-BPMN-DSL-001       # module: dsl test set
  - TEST-BPMN-LINT-001      # module: lint test set
  - TEST-BPMN-ANIMATE-001   # module: animate test set
  - TEST-BPMN-EDITOR-001    # module: editor test set
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - test
  - verification
  - corpus
  - traceability
  - umbrella
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Support — Test Documentation (umbrella)

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | TEST-BPMN-001                                              |
| Version      | 0.1                                                       |
| Status       | Draft                                                     |
| Issue Date   | 2026-06-06                                                |
| Owner        | `packages/python` (kymo CLI) · `packages/js`              |
| Related      | FEAT-BPMN-001, DESIGN-BPMN-001, PLAN-BPMN-001             |

## 1. Test approach and levels

The family is verified at three levels, rolling up from the module test sets:

- **Unit** — per-module behaviour (mapping correspondence, DSL parse, lint rules, export inverse,
  animation timing), owned by each module's test doc (`TEST-BPMN-PARSER-001`, …).
- **Golden-SVG** — byte-for-byte renderer fixtures. BPMN-specific defs/CSS are injected only when used,
  so adding a BPMN capability MUST keep non-BPMN goldens byte-identical (NFR-BPMN-2).
- **Corpus regression** — the vendored MIWG `.bpmn` corpus (~120 files) rendered and compared on
  `(status, node/edge counts, SVG hash)` to a committed baseline; gates every build (NFR-BPMN-5).

## 2. Test items, environment, tooling

- **Python:** `uv run --group dev python -m pytest -q` (golden fixtures via `test_diagrams.py` /
  `test_layout.py` / `test_edges.py`; corpus via `test_bpmn_corpus.py`). Goldens regenerated with
  `KYMO_UPDATE_GOLDEN=1`; corpus baseline with `KYMO_UPDATE_BPMN_BASELINE=1`.
- **JS:** `npm test` (builds to `dist/`, then `node --test`).
- Both run per-package in CI (`.github/workflows/test.yml`); the nightly `bpmn-regression.yml` runs the
  full-corpus `baseline_full.json`.

## 3. Family-level test cases (`TC-BPMN`)

| ID | Verifies | Method |
|----|----------|--------|
| `TC-BPMN-01` | Import: a representative `.bpmn` (DI geometry) renders to the expected `Diagram`/SVG. | parser unit + golden |
| `TC-BPMN-02` | Round-trip: `import → export` of a `.bpmn` yields BPMN that re-imports to an equivalent `Diagram`. | export unit |
| `TC-BPMN-03` | DSL: BPMN shapes/edges authored in `.diagram` render identically to the mapped glyphs. | dsl golden |
| `TC-BPMN-04` | Lint: a malformed/low-fidelity import emits the expected diagnostics mapped to source. | lint unit |
| `TC-BPMN-05` | Animation: token flow over BPMN edges renders deterministically. | animate unit + golden |
| `TC-BPMN-06` | Additivity: enabling a BPMN capability leaves all non-BPMN goldens byte-identical. | golden diff |
| `TC-BPMN-07` | Corpus: the MIWG corpus matches the baseline `(status, counts, hash)`. | corpus regression |
| `TC-BPMN-08` | Parity: equivalent inputs produce equivalent results in Python and JS. | cross-impl spot-check |

## 4. Pass/fail criteria

A build passes when: every module's unit suite is green; all golden-SVG fixtures match byte-for-byte;
the BPMN corpus matches its baseline; and no non-BPMN golden has changed. Any intentional renderer
change must regenerate the affected goldens/baseline in the same change.

## 5. Requirements traceability matrix

| Requirement | Covered by |
|-------------|-----------|
| FR-BPMN-1 (import) | `TC-BPMN-01`, `TC-BPMN-07`, `TEST-BPMN-PARSER-001` |
| FR-BPMN-2 (export) | `TC-BPMN-02`, `TEST-BPMN-EXPORT-001` |
| FR-BPMN-3 (dsl) | `TC-BPMN-03`, `TEST-BPMN-DSL-001` |
| FR-BPMN-4 (lint) | `TC-BPMN-04`, `TEST-BPMN-LINT-001` |
| FR-BPMN-5 (animate) | `TC-BPMN-05`, `TEST-BPMN-ANIMATE-001` |
| FR-BPMN-6 (editor) | `TEST-BPMN-EDITOR-001` |
| FR-BPMN-7 (one mapping) | `TC-BPMN-01`, `TC-BPMN-02`, `TC-BPMN-03` (all cite `BPMN-MAP-001`) |
| FR-BPMN-8 (modular) | per-module test docs roll up here |
| NFR-BPMN-1 (parity) | `TC-BPMN-08` |
| NFR-BPMN-2 (additive) | `TC-BPMN-06` |
| NFR-BPMN-3 (conformance) | `TC-BPMN-01`, `TC-BPMN-07` |
| NFR-BPMN-4 (determinism) | `TC-BPMN-05`, golden byte-equality |
| NFR-BPMN-5 (corpus) | `TC-BPMN-07` |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial umbrella V&V: three test levels, family `TC-BPMN-01..08`, pass/fail criteria, and the requirements traceability matrix. Created with the `bpmn/` consolidation. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn/03-TEST.md`; authoritative source is the main-branch working
tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the family; available to all repository readers.

### B.3 Change Control
Adding/changing a family test case requires: edit the relevant `TC-BPMN`; update the traceability
matrix and the affected module test doc; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are stable across revisions; a withdrawn case SHALL be marked (not re-used) so
traceability links remain valid.

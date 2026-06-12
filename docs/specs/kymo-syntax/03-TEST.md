---
title: Kymo Syntax (umbrella) — Verification & Validation
document_id: TEST-KYMO-SYNTAX-001
version: "1.0"
issue_date: 2026-06-12
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the kymo syntax surfaces; reviewers
review_cycle: On module addition/removal, or on scope change
supersedes: null
related_documents:
  - FEAT-KYMO-SYNTAX-001     # Requirements (umbrella)
  - DESIGN-KYMO-SYNTAX-001   # Design (umbrella)
  - PLAN-KYMO-SYNTAX-001     # Plan (umbrella)
  - TEST-KYMO-DSL-001        # modules/dsl V&V
  - TEST-KYMOJSON-001        # modules/json V&V
  - TEST-KYMO-NREF-001       # modules/nref V&V
authors:
  - Vũ Anh
language: en
keywords:
  - umbrella
  - verification
  - validation
  - traceability
  - round-trip
  - parity
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo Syntax (umbrella) — Verification & Validation

| Field             | Value |
|-------------------|-------|
| Document ID       | `TEST-KYMO-SYNTAX-001` |
| Version           | 1.0 |
| Status            | Released |
| Issue Date        | 2026-06-12 |
| Owner             | `diagrams/` project |
| Related Documents | FEAT-DESIGN-PLAN-KYMO-SYNTAX-001; TEST-KYMO-DSL-001; TEST-KYMOJSON-001; TEST-KYMO-NREF-001 |

> Umbrella V&V: the substantive test cases live in the module TEST docs; this file states which
> existing gates verify the umbrella invariants (`UR-1..3`) and adds none of its own.

## 1. Verification of the umbrella invariants

| Invariant | Verified by |
|-----------|-------------|
| **UR-1** (one model, lossless) | The round-trip + cross-language byte-parity suites specified in `TEST-KYMOJSON-001` (Python writer = golden; JS load/serialize agrees byte-for-byte). |
| **UR-2** (dual-source lockstep) | The dsl module's NFR-4 discipline + golden conformance suites in `TEST-KYMO-DSL-001`; for the reference set's structural integrity, the grep/diff gates in `TEST-KYMO-NREF-001`. |
| **UR-3** (module shape) | Structural review on change (this folder vs. the repository 4-file convention); no automated gate. |

## 2. Regression gates (union of the modules')

| Gate | Command | Owner module |
|------|---------|--------------|
| Python suites (goldens, round-trip, conformance) | `cd packages/python && uv run --group dev python -m pytest -q` | dsl, json |
| JS suites (parity, serialization) | `cd packages/js && npm test` | dsl, json |

A change anywhere under this umbrella passes only with both gates green; module TEST docs define
what each suite asserts.

## 3. Traceability

`UR-1..3` → §1. All module-level `FR`/`NFR` ↔ `TC` traceability stays in the module TEST docs
(`TEST-KYMO-DSL-001` §, `TEST-KYMOJSON-001` §, `TEST-KYMO-NREF-001` §5) — not duplicated here.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-06-12 | Vũ Anh | Initial issue — umbrella V&V: maps `UR-1..3` onto the existing module gates; no new test cases minted. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-syntax/03-TEST.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
When an umbrella invariant changes, update §1/§3 in the same revision; increment `version`; append
a row to Annex A. Module test changes are governed by the module TEST docs.

### B.4 Backwards Compatibility
This file mints no TC ids; module TC ids are stable per their own doc-control.

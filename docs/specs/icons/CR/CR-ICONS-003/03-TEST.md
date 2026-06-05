---
title: "Icons CR-003 — Verification & Validation: single generator / single source of truth"
document_id: TEST-ICONS-CR003
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the generator + two-package wiring; reviewers
review_cycle: Until CR-ICONS-003 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-003                # CR lead doc — scope (FR-8, FR-10, NFR-1, NFR-3)
  - DESIGN-ICONS-CR003          # CR design
  - PLAN-ICONS-CR003            # CR plan
  - TEST-ICONS-001              # Baseline test — reuses TC-7, TC-9, TC-12
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - test
  - generator
  - parity
  - dependency-posture
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-003 — Verification & Validation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-ICONS-CR003                                   |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-003, DESIGN-ICONS-CR003, PLAN-ICONS-CR003, TEST-ICONS-001 |

Verifies **CR-ICONS-003** (FR-8, FR-10, NFR-1, NFR-3). **Adds no new test case**: it brings the
existing **TC-7, TC-9, TC-12** from *specified* to *passing*. Headline: **one artifact consumed by
both impls**, **record parity**, **zero new runtime dep**.

## 1. Test approach and levels

- **Build** — generator output is deterministic (same `icons/` → byte-identical artifact); a stale
  committed artifact fails CI.
- **Integration** — both `icons.py` and `icons-loader.ts` resolve from the generated artifact; the
  second scanner is gone (no second walk of `icons/`).
- **Cross-language conformance** — resolved records match across Python/JS (Python sole writer).
- **Dependency** — `packages/js` `package.json` carries zero new runtime deps; generator tooling is
  `devDependencies` only.

## 2. Test items, environment, tooling

`packages/python` (`pytest` — `test_conformance.py`), `packages/js` (`npm test` →
`conformance.test.js`; `npm run build-manifest`). Generator under `packages/js/scripts/`.

## 3. Test cases exercised (baseline, no additions)

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-7** | One source of truth | FR-8, NFR-1 | Both implementations consume the generated artifact (no second scanner); resolved records match across Python/JS in the conformance suite |
| **TC-9** | Parity surface | FR-10 | Equivalent icon API exists and behaves equivalently in `packages/python` and `packages/js` |
| **TC-12** | Dependency posture | NFR-3 | `packages/js` carries zero new **runtime** deps; normalization/generator tooling is build-time only |

## 4. Pass/fail criteria

P2 passes when TC-7, TC-9, TC-12 pass and the full Python suite + JS `npm test` are green. A record
mismatch is a **failure** reconciled toward Python (sole golden writer), not a re-baseline. A new
runtime dependency in `packages/js` is a **failure** (NFR-3).

## 5. Requirements traceability (this CR's slice of TEST-ICONS-001)

| Requirement | Test case(s) |
|-------------|--------------|
| FR-8 | TC-7 |
| FR-10 | TC-9 |
| NFR-1 | TC-7 |
| NFR-3 | TC-12 |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — identifies TC-7/TC-9/TC-12 as the P2 acceptance set; no new test case minted. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-003/03-TEST.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
Mints no test-case ID; TC-7/TC-9/TC-12 are owned by TEST-ICONS-001. On change, keep this slice
consistent with that matrix; increment `version`; append to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are owned by the baseline and unchanged here.

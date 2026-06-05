---
title: "Icons CR-006 — Verification & Validation: docs & gates"
document_id: TEST-ICONS-CR006
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the doc set, citation integrity, and CI gates; reviewers
review_cycle: Until CR-ICONS-006 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-006                # CR lead doc — scope (all FR/NFR via release + gates)
  - DESIGN-ICONS-CR006          # CR design
  - PLAN-ICONS-CR006            # CR plan
  - TEST-ICONS-001              # Baseline test — full TC-1..TC-12 must stay green
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - test
  - citation-integrity
  - gates
  - release
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-006 — Verification & Validation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-ICONS-CR006                                   |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-006, DESIGN-ICONS-CR006, PLAN-ICONS-CR006, TEST-ICONS-001 |

Verifies **CR-ICONS-006**. P5 mints **no new icon test case**; its acceptance is **(a)** the full
existing suite **TC-1..TC-12** (and TC-13..16 once the CLI lands) remaining green under the wired
CI gates, and **(b)** a new **doc-lint** asserting citation integrity across the spec set.

## 1. Test approach and levels

- **Doc-lint** — every `document_id` referenced in `docs/specs/icons/**` resolves to an existing
  document; no dangling reference; phase rows in `PLAN-ICONS-001` are consistent with each CR's
  status.
- **Gate regression** — the conformance, golden SVG / BPMN-corpus, generator-freshness, and
  no-unreachable-icons gates run in CI and are green.
- **Release check** — the spec set `status` is `Released` and each Annex A records the release.

## 2. Test items, environment, tooling

The full `packages/python` `pytest` suite + `packages/js` `npm test`; a doc-lint script over
`docs/specs/icons/**` (citation graph). CI workflow under `.github/`.

## 3. Test cases / checks

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **Full suite** | All icon test cases green | TC-1..TC-12 (+TC-13..16) | The complete Python + JS suites pass under the wired gates |
| **DOC-LINT** | Citation integrity | this CR | Every `document_id` citation in `docs/specs/icons/**` resolves; no dangling reference |
| **GATE-CI** | Gates enforced | NFR-1, NFR-2, FR-8 | Conformance + golden + freshness + no-unreachable gates run in CI and are green |
| **RELEASE** | Doc set Released | this CR | Spec set `status: Released`; phase rows reflect actual status |

## 4. Pass/fail criteria

P5 passes when the full suite is green, the doc-lint reports zero dangling citations, all CI gates
are green, and the doc set is Released. A dangling `document_id` citation is a **failure**. Any gate
red is a **failure** — P5 may not mark Released over a red gate.

## 5. Requirements traceability

P5 finalises **all** FR/NFR rather than a slice; its traceability is the **entire**
TEST-ICONS-001 matrix remaining green, plus the doc-lint/gate checks above.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — defines the P5 acceptance: full-suite-green + doc-lint citation integrity + CI gates + Released. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-006/03-TEST.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
The icon TC IDs are owned by TEST-ICONS-001; this CR adds only the DOC-LINT/GATE-CI/RELEASE checks.
On change, keep consistent with CR-ICONS-006; increment `version`; append to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are owned by the baseline and unchanged here.

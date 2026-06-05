---
title: "Icons CR-005 — Verification & Validation: PNG → SVG body (vectorization)"
document_id: TEST-ICONS-CR005
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the vector renderer, inliner, and pipeline; reviewers
review_cycle: Until CR-ICONS-005 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-005                # CR lead doc — scope (FR-3, FR-6, FR-7, NFR-2)
  - DESIGN-ICONS-CR005          # CR design
  - PLAN-ICONS-CR005            # CR plan
  - TEST-ICONS-001              # Baseline test — reuses TC-2, TC-5, TC-6, TC-11
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - test
  - vectorization
  - currentColor
  - byte-stable
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-005 — Verification & Validation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-ICONS-CR005                                   |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-005, DESIGN-ICONS-CR005, PLAN-ICONS-CR005, TEST-ICONS-001 |

Verifies **CR-ICONS-005** (FR-3, FR-6, FR-7, NFR-2). **Adds no new test case**: it brings the
existing **TC-2, TC-5, TC-6, TC-11** from *specified* to *passing*. Headline: **vector render +
recolour + scale**, **no `id` collisions**, **goldens stable for unaffected diagrams**.

## 1. Test approach and levels

- **Unit** — `<svg>` assembly from a record at a target size; `currentColor` recolouring; sparse
  record shape (body only, no wrapper); `id`/`defs`-safe inlining for repeated icons.
- **Render** — a vectorized icon scales crisply (no raster blur); recolours to theme.
- **Regression** — golden SVG + BPMN-corpus baselines byte-identical for diagrams whose icons are
  unaffected; an affected icon's change is an intentional, reviewed golden regeneration.
- **Cross-language conformance** — Python and JS render the same `<svg viewBox>{body}</svg>`.

## 2. Test items, environment, tooling

`packages/python` (`pytest` — `test_to_svg.py`, golden `test_diagrams.py` / `test_bpmn_corpus.py`),
`packages/js` (`npm test` — `render.test.js` + `conformance.test.js`). A fixture set with vector
records; the normalize pipeline runs at build time in the generator.

## 3. Test cases exercised (baseline, no additions)

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-2** | IconifyJSON shape (record) | FR-3 | Records are sparse `{ body, width, height }` — inner body, no `<svg>` wrapper |
| **TC-5** | Render & recolour | FR-6 | A record renders as `<svg viewBox=…>{body}</svg>` at the requested size; `currentColor` adopts the theme colour; output scales without raster blur |
| **TC-6** | `id`/`defs`-safe inlining | FR-7 | The same icon used N times in one document produces no duplicate/colliding element `id`s |
| **TC-11** | Byte-stable goldens | NFR-2 | Golden SVG + BPMN-corpus baselines unchanged for diagrams whose icons are unaffected |

## 4. Pass/fail criteria

P4 passes when TC-2, TC-5, TC-6, TC-11 pass and the full Python suite + JS `npm test` are green. An
`id` collision for repeated icons is a **failure** (TC-6). An **unintended** golden/baseline change
for an unaffected diagram is a **failure** (TC-11); an affected icon's change is accepted only via a
reviewed `KYMO_UPDATE_GOLDEN` regeneration. A Python/JS render divergence is reconciled toward
Python (sole golden writer).

## 5. Requirements traceability (this CR's slice of TEST-ICONS-001)

| Requirement | Test case(s) |
|-------------|--------------|
| FR-3 | TC-2 |
| FR-6 | TC-5 |
| FR-7 | TC-6 |
| NFR-2 | TC-11 |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — identifies TC-2/TC-5/TC-6/TC-11 as the P4 acceptance set; no new test case minted. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-005/03-TEST.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
Mints no test-case ID; TC-2/TC-5/TC-6/TC-11 are owned by TEST-ICONS-001. On change, keep this slice
consistent with that matrix; increment `version`; append to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are owned by the baseline and unchanged here.

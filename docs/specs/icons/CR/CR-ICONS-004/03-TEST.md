---
title: "Icons CR-004 — Verification & Validation: IconifyJSON manifest + on-demand loading"
document_id: TEST-ICONS-CR004
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the IconifyJSON manifest + batched loader; reviewers
review_cycle: Until CR-ICONS-004 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-004                # CR lead doc — scope (FR-2, FR-3, FR-5, FR-9, NFR-4)
  - DESIGN-ICONS-CR004          # CR design
  - PLAN-ICONS-CR004            # CR plan
  - TEST-ICONS-001              # Baseline test — reuses TC-2, TC-4, TC-8
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - test
  - iconify-json
  - on-demand
  - cache
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-004 — Verification & Validation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-ICONS-CR004                                   |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-004, DESIGN-ICONS-CR004, PLAN-ICONS-CR004, TEST-ICONS-001 |

Verifies **CR-ICONS-004** (FR-2, FR-3, FR-5, FR-9, NFR-4). **Adds no new test case**: it brings the
existing **TC-2, TC-4, TC-8** from *specified* to *passing*. Headline: **IconifyJSON shape +
sparse records**, **metadata queryable**, **batched on-demand load with cache + `missing`**.

## 1. Test approach and levels

- **Unit** — sparse + root-default resolution (a record inherits root dims; an override appears only
  when differing); `info`/tags/category presence; alias entry shape.
- **Catalogue** — per-set artifact has `prefix`/root defaults/`icons`/`aliases`/`info`; metadata is
  queryable for a sample set.
- **Loader** — a page referencing K icons of a prefix issues **one** batched request for those K,
  caches the result, records 404s in `missing` (no re-request), and does not pull the whole
  catalogue.
- **Cross-language conformance** — Python and JS resolve the same record after sparse/alias
  resolution.

## 2. Test items, environment, tooling

`packages/python` (`pytest` — icon unit + `test_conformance.py`), `packages/js` (`npm test` — loader
tests with a stubbed `fetch` asserting request batching/caching + `conformance.test.js`). Fixture
catalogue with multiple sets.

## 3. Test cases exercised (baseline, no additions)

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-2** | IconifyJSON shape | FR-2, FR-3 | Per-set artifact has `prefix`/root defaults/`icons`/`aliases`/`info`; records are sparse (dims present only when differing from root) |
| **TC-4** | Searchable metadata | FR-5 | Dimensions, aliases, `info`, category/tags are present and queryable for a sample set |
| **TC-8** | On-demand / batched load | FR-9, NFR-4 | A page referencing K icons of a set fetches those K (batched, one request/prefix) and caches; `missing` prevents re-request; whole catalogue not pulled up front |

## 4. Pass/fail criteria

P3 passes when TC-2, TC-4, TC-8 pass and the full Python suite + JS `npm test` are green. A
Python/JS record mismatch after sparse/alias resolution is a **failure** reconciled toward Python.
A loader that pulls the whole catalogue, or re-requests a recorded miss, is a **failure** (NFR-4).

## 5. Requirements traceability (this CR's slice of TEST-ICONS-001)

| Requirement | Test case(s) |
|-------------|--------------|
| FR-2 | TC-2 |
| FR-3 | TC-2 |
| FR-5 | TC-4 |
| FR-9 | TC-8 |
| NFR-4 | TC-8 |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — identifies TC-2/TC-4/TC-8 as the P3 acceptance set; no new test case minted. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-004/03-TEST.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
Mints no test-case ID; TC-2/TC-4/TC-8 are owned by TEST-ICONS-001. On change, keep this slice
consistent with that matrix; increment `version`; append to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are owned by the baseline and unchanged here.

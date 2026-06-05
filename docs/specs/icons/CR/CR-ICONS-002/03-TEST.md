---
title: "Icons CR-002 — Verification & Validation: `prefix:name` + aliases + legacy compatibility"
document_id: TEST-ICONS-CR002
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the icon key + alias layer across packages/python and packages/js; reviewers
review_cycle: Until CR-ICONS-002 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-002                # CR lead doc — scope (FR-1, FR-4, FR-11)
  - DESIGN-ICONS-CR002          # CR design
  - PLAN-ICONS-CR002            # CR plan
  - TEST-ICONS-001              # Baseline test — reuses TC-1, TC-3, TC-10, TC-11
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - test
  - collision
  - aliases
  - legacy-keys
  - parity
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-002 — Verification & Validation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-ICONS-CR002                                   |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-002, DESIGN-ICONS-CR002, PLAN-ICONS-CR002, TEST-ICONS-001 |

Verifies **CR-ICONS-002** (FR-1, FR-4, FR-11). This CR **adds no new test case**: it is the phase
that brings the existing baseline cases **TC-1, TC-3, TC-10** (and the byte-stability guard
**TC-11**) from *specified* to *passing*. Headline checks: **no unreachable icons**, **alias chains
resolve with cycle rejection**, **legacy keys still render byte-identical**.

## 1. Test approach and levels

- **Unit** — path → `prefix:name` mapping; `prefix:name` validation; alias chain resolution
  (synonym, transform, cycle guard); legacy `<provider>-<name>` → address mapping.
- **Catalogue** — every source icon is addressable (collision count == 0); the ~157 previously
  shadowed icons are now reachable.
- **Cross-language conformance** — Python and JS resolve the same address/alias to the same
  fragment; rides the golden conformance suite (Python sole writer).
- **Regression** — golden SVG + BPMN-corpus baselines byte-identical for diagrams whose icons are
  unaffected.

## 2. Test items, environment, tooling

`packages/python` (`uv run --group dev python -m pytest` — icon unit tests + `test_conformance.py`,
golden `test_diagrams.py` / `test_bpmn_corpus.py`) and `packages/js` (`npm test` → `node --test` —
icon loader tests + `conformance.test.js`). No new runtime dependency.

## 3. Test cases exercised (baseline, no additions)

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-1** | No unreachable icons | FR-1 | Count source icons == count addressable `prefix:name`; the ~157 legacy collisions are gone |
| **TC-3** | Alias resolution | FR-4 | Synonym → parent body; transform alias applies `rotate`/`hFlip`/`vFlip`; a cycle is rejected, not looped |
| **TC-10** | Legacy keys still resolve | FR-11 | Existing `.kymo`/BPMN diagrams using `<provider>-<name>` keys render unchanged |
| **TC-11** | Byte-stable goldens | NFR-2 | Golden SVG + BPMN-corpus baselines unchanged for diagrams whose icons are unaffected (re-keying changes address, not bytes) |

## 4. Pass/fail criteria

P1 passes when TC-1, TC-3, TC-10 (and TC-11 as guard) pass and the full Python suite + JS
`npm test` are green. A Python/JS divergence in resolved fragment or alias behaviour is a
**failure** to reconcile toward Python (sole golden writer), not a re-baseline. Any unintended
change to golden SVG / BPMN / conformance baselines is a **failure** — re-keying is address-only.

## 5. Requirements traceability (this CR's slice of TEST-ICONS-001)

| Requirement | Test case(s) |
|-------------|--------------|
| FR-1 | TC-1 |
| FR-4 | TC-3 |
| FR-11 | TC-10 |
| NFR-2 (guard) | TC-11 |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — identifies TC-1/TC-3/TC-10 (+TC-11 guard) as the P1 acceptance set; no new test case minted. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-002/03-TEST.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
This CR mints no test-case ID; TC-1/TC-3/TC-10/TC-11 are owned by TEST-ICONS-001. On change, keep
this slice consistent with that matrix; increment `version`; append to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are owned by the baseline and unchanged here.

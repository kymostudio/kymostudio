---
title: Kymo DSL Normative-Reference Set — Test Documentation
document_id: TEST-KYMO-NREF-001
version: "1.0"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the kymo DSL documentation restructure
review_cycle: On documentation-structure change
supersedes: null
related_documents:
  - INTRO-KYMO-NREF-001      # Introduction
  - FEAT-KYMO-NREF-001       # Requirements (traced below)
  - DESIGN-KYMO-NREF-001     # Design
  - PLAN-KYMO-NREF-001       # Plan
  - KYMO-DSL-001             # the spec this set reorganises (now the index)
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - test
  - verification
  - documentation
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo DSL Normative-Reference Set — Test Documentation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-KYMO-NREF-001                                |
| Version      | 1.0                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-25                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-KYMO-NREF-001, FEAT-KYMO-NREF-001, DESIGN-KYMO-NREF-001, PLAN-KYMO-NREF-001 |

Verifies the requirements in FEAT-KYMO-NREF-001 (FR/NFR ids). Covers ISO/IEC/IEEE
12207 Verification & Validation. This is a documentation feature, so most checks are
**static** (grep / diff) plus a docs-only CI sanity gate.

## 1. Test approach and rings

- **grep** — repository-wide pattern checks (id uniqueness, no dangling path,
  anchor-heading existence).
- **diff** — compare each new clause body against the corresponding v2.5 section to
  prove content fidelity.
- **manual** — visual structure review against the BPMN-set shape.
- **CI** — the existing Python (`pytest -q`, `ruff`) and JS (`npm test`) gates, run
  to confirm a documentation-only change perturbs nothing.

## 2. Test items, environment, tooling

The new set under `docs/formats/kymo-dsl/`; the repointed links across `docs/`,
`CONTRIBUTING.md`, `CHANGELOG.md`, `.github/`; the spec set under
`docs/specs/kymo-dsl-nref/` (spec set + `PLAN.md`). Tooling: `grep`/`git
grep`, `git show HEAD:docs/KYMO_DSL.md` for the diff baseline, and the package test
runners (`uv run --group dev python -m pytest -q`; `npm test`).

## 3. Test cases

**Table 3.1 — Test cases**

| TC | Requirement | Ring | Assertion |
|----|-------------|------|-----------|
| **TC-1** | FR-1, NFR-4 | grep / manual | `docs/formats/kymo-dsl/` holds `README.md` + `01-scope.md`…`10-examples.md` (11 files). Each has YAML frontmatter, an H1 + doc-control table, and `## Annex A — Revision History` + `## Annex B — Document Control`. The shape matches `docs/formats/bpmn/` (index + per-clause files, per-file annexes). |
| **TC-2** | FR-2, NFR-1 | grep | `grep -rn "^document_id: KYMO-DSL-001$" docs/` returns **exactly one** hit — `docs/formats/kymo-dsl/README.md`. Each clause file declares a unique `KYMO-DSL-<X>-001` (`SCOPE`/`NORMREF`/`TERMS`/`ABBR`/`LEX`/`GRAMMAR`/`SEMANTICS`/`AUTHORING`/`CONF`/`EXAMPLES`); no `document_id` is duplicated. |
| **TC-3** | FR-3 | diff | For each clause, the body between the doc-control table and Annex A is **content-equal** to the matching section of `git show HEAD~:docs/KYMO_DSL.md`, modulo (a) the H1/doc-control/annex wrappers and (b) the `../` → `../../../` path-depth fix. No grammar/EBNF token differs. |
| **TC-4** | FR-3, NFR-2 | grep | Every anchor in DESIGN §4 Table 4.1 resolves: the verbatim heading text exists in its target clause file (`### 6.4 Leaf Components` in `06-grammar.md`, `### 7.4 Auto-Canvas` in `07-semantics.md`, …), and the repointed guide links carry those exact fragments. |
| **TC-5** | FR-4, NFR-2 | grep | No link, frontmatter path entry, or URL to the deleted monolith remains: `grep -rn "](.*KYMO_DSL" .` and `grep -rn "/KYMO_DSL\.md" .` (ex `node_modules`) return **0**. Every repointed relative link resolves to an existing file. *(Prose mentions of the historical path inside this `kymo-dsl-nref` set are non-link provenance and are exempt — see `RK-KND-05`.)* |
| **TC-6** | NFR-3 | CI | No `.py`/`.ts` file references `KYMO_DSL`. `uv run --group dev python -m pytest -q` and `npm test` are **green** and unchanged from before the restructure. |
| **TC-7** | FR-5 | grep | The index `README.md` declares `version: "2.6"` and its Annex A holds the **full** revision history (rows 1.0 → 2.6, the 2.6 row describing the split). Each clause file declares `version: "2.6"`. |

## 4. Pass/fail criteria

The change passes when **TC-1…TC-7 all pass** and the full Python suite (incl.
`ruff` and the golden/conformance gates) and JS `npm test` are green. Because the
change is documentation-only, **any** golden or test delta is a failure to
investigate, not a re-baseline.

## 5. Requirements traceability matrix

**Table 5.1 — Traceability**

| Requirement | Covering test(s) |
|-------------|------------------|
| FR-1 | TC-1 |
| FR-2 | TC-2 |
| FR-3 | TC-3, TC-4 |
| FR-4 | TC-5 |
| FR-5 | TC-7 |
| NFR-1 | TC-2 |
| NFR-2 | TC-4, TC-5 |
| NFR-3 | TC-6 |
| NFR-4 | TC-1 |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-25 | Vũ Anh | Initial issue — test documentation (TC-1…7 + traceability) for the kymo DSL normative-reference restructure. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-dsl-nref/04-TEST.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
When a requirement changes, update the affected test case(s) and the traceability
matrix in the same revision; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
Test-case ids are stable; a removed case SHALL be marked withdrawn (not re-used) so
traceability links remain valid.

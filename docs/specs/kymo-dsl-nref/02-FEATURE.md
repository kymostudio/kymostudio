---
title: Kymo DSL Normative-Reference Set — Requirements
document_id: FEAT-KYMO-NREF-001
version: "1.0"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the kymo DSL documentation restructure
review_cycle: On documentation-structure change
supersedes: null
related_documents:
  - INTRO-KYMO-NREF-001      # Introduction
  - DESIGN-KYMO-NREF-001     # Design
  - TEST-KYMO-NREF-001       # Test documentation
  - PLAN-KYMO-NREF-001       # Plan
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - requirements
  - documentation
  - normative-reference
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO/IEC 25010:2011
  - ISO 8601:2019
---

# Kymo DSL Normative-Reference Set — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-KYMO-NREF-001                                |
| Version      | 1.0                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-25                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-KYMO-NREF-001, DESIGN-KYMO-NREF-001, TEST-KYMO-NREF-001, PLAN-KYMO-NREF-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO/IEC/IEEE
29148:2018 drafting conventions. Each requirement carries a stable ID for
traceability from TEST-KYMO-NREF-001; quality attributes follow ISO/IEC 25010:2011.
Concept and rationale: INTRO-KYMO-NREF-001; realisation: DESIGN-KYMO-NREF-001.

## 1. Scope and stakeholder needs

Reorganise the kymo DSL specification from one monolithic file into
a clause-per-file normative-reference set — so each clause can be cited, revised,
and versioned independently (as the BPMN set already is) — **without** changing the
normative language definition and **without** breaking any existing cross-reference.

**Table 1.1 — Stakeholder needs**

| ID | Need |
|----|------|
| **SN-1** | Each clause of the DSL spec should be **independently citable, revisable, and versioned** — as the `.bpmn` normative set already is. |
| **SN-2** | Existing references to the spec — the ≈50 `KYMO-DSL-001` `document_id` citations, the path links, and the teaching guide's **deep section anchors** — must keep working: no broken links, no churn for documents that cite it. |
| **SN-3** | The **normative language definition must not change**: readers and tooling that depend on the grammar/semantics must see byte-identical content after the move. |
| **SN-4** | The set should match the repository's existing normative-reference **convention** (the BPMN set), so a contributor navigates kymo and BPMN the same way. |
| **SN-5** | The **build must be unaffected** — this is a documentation change only; no source, test, golden, or CI behaviour may shift. |

## 2. Functional requirements

**Table 2.1 — Functional requirements**

| ID | Requirement | Source need | Phase |
|----|-------------|-------------|-------|
| **FR-1** | The DSL specification SHALL be organised as a **clause-per-file normative-reference set** under `docs/formats/kymo-dsl/`, mirroring `docs/formats/bpmn/`: a `README.md` index plus one file per clause for clauses 1–10 (`01-scope.md` … `10-examples.md`). | SN-1, SN-4 | P1 |
| **FR-2** | The index `README.md` SHALL retain `document_id: KYMO-DSL-001`; each clause file SHALL carry a unique `KYMO-DSL-<X>-001` sub-id (`SCOPE`, `NORMREF`, `TERMS`, `ABBR`, `LEX`, `GRAMMAR`, `SEMANTICS`, `AUTHORING`, `CONF`, `EXAMPLES`). Each file (index and clauses) SHALL carry its own Annex A (revision history) and Annex B (document control). | SN-2, SN-1 | P1 |
| **FR-3** | Clause content SHALL be lifted **verbatim** from the v2.5 monolith — no grammar or semantic change. Original section-heading **texts** SHALL be preserved so existing in-document anchors (e.g. `#64-leaf-components`, `#7-semantics`, `#74-auto-canvas`) continue to resolve; only relative paths inside the lifted content are adjusted for the new folder depth. | SN-3, SN-2 | P1 |
| **FR-4** | The monolith (`docs/KYMO_DSL.md`) SHALL be deleted, and **every** `../KYMO_DSL.md` path/anchor link in the repository (docs, `CONTRIBUTING.md`, `CHANGELOG.md`, the PR template, the issue-template contact link) SHALL be repointed into the new folder — deep anchors to their specific clause file, plain links to the index. | SN-2 | P2 |
| **FR-5** | The set SHALL be version-bumped 2.5 → 2.6 (MINOR — restructure, no grammar change); the full revision-history provenance (1.0 → 2.6) SHALL be kept on the index. | SN-1, SN-4 | P1 |

## 3. Non-functional requirements

**Table 3.1 — Non-functional requirements**

| ID | Attribute (ISO 25010) | Requirement |
|----|-----------------------|-------------|
| **NFR-1** | Maintainability — Modularity | `document_id: KYMO-DSL-001` SHALL be defined **exactly once** (the index); every existing `KYMO-DSL-001` citation SHALL still resolve; no `document_id` SHALL be duplicated across the set. |
| **NFR-2** | Functional Correctness | No link or path to the deleted monolith SHALL remain; every repointed anchor SHALL resolve to an **existing heading** in its target clause file. |
| **NFR-3** | Compatibility — Co-existence | No source or test change. The reference implementation `dsl.py` SHALL remain authoritative and untouched; the Python and JS test suites and CI SHALL be unaffected. |
| **NFR-4** | Maintainability — Analysability | The set SHALL match the `docs/formats/bpmn/` structure and the repository's ISO/IEC/IEEE 15289 doc-control conventions (frontmatter schema, doc-control table, Annex A/B). |

## 4. Constraints, assumptions, out-of-scope

**Table 4.1 — Out-of-scope / deferred**

| Item | Where it lives | Why out |
|------|----------------|---------|
| Grammar + statement semantics (the language definition itself) | `KYMO-DSL-001` clauses + `dsl.py` (unchanged) | This feature is a **restructure**, not a language change; content is lifted verbatim and stays dual-sourced with the reference implementation. |
| Converting `docs/softwares/*.md` path-based `related_documents` to cite-by-`document_id` | the repository's citation convention (`CLAUDE.md`) | A separate cleanup; here we only **repoint** the existing paths to the new location. |
| Non-English editions | — | The whole repository is English-only; matching every sibling doc set. |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-25 | Vũ Anh | Initial issue — requirements (SN-1…5, FR-1…5, NFR-1…4) for the kymo DSL normative-reference restructure. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-dsl-nref/02-FEATURE.md`; authoritative source
is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant FR/NFR (preserving IDs);
update TEST-KYMO-NREF-001's traceability matrix; increment `version`; append a row
to Annex A.

### B.4 Backwards Compatibility
Requirement IDs are stable across revisions; a removed requirement SHALL be marked
withdrawn (not re-used) so traceability links remain valid.

---
title: Kymo DSL Normative-Reference Set — Requirements
document_id: FEAT-KYMO-NREF-001
version: "1.1"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the kymo DSL documentation restructure
review_cycle: On documentation-structure change
supersedes: null
related_documents:
  - DESIGN-KYMO-NREF-001     # Design
  - TEST-KYMO-NREF-001       # Test documentation
  - PLAN-KYMO-NREF-001       # Plan
  - KYMO-FMT-001             # .kymo source format — catalog reference
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - requirements
  - documentation
  - normative-reference
  - restructure
  - introduction
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
| Version      | 1.1                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-25                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-KYMO-NREF-001, TEST-KYMO-NREF-001, PLAN-KYMO-NREF-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO/IEC/IEEE
29148:2018 drafting conventions. Each requirement carries a stable ID for
traceability from TEST-KYMO-NREF-001; quality attributes follow ISO/IEC 25010:2011.
Realisation: DESIGN-KYMO-NREF-001.

## Part A — Introduction

### 1. Purpose and scope

This document introduces the **kymo DSL normative-reference set** — the
reorganisation of the kymo DSL language specification from a single
monolithic file into a **clause-per-file normative-reference set** under
`docs/formats/kymo-dsl/`. It is the entry point to this feature's document set: it
states the problem, the concept, and the terminology, and maps the reader to the
design (DESIGN-KYMO-NREF-001), the test
documentation (TEST-KYMO-NREF-001), and the plan (PLAN-KYMO-NREF-001). The set
conforms to ISO/IEC/IEEE 12207:2017 (life-cycle processes) and ISO/IEC/IEEE
15289:2019 (information-item content).

**In scope:** the on-disk *structure* of the DSL specification — splitting it into a
README index (retaining `document_id: KYMO-DSL-001`) plus ten clause files
(`KYMO-DSL-<X>-001`), each with its own doc-control annexes; preserving heading
anchors so deep links survive; preserving the `KYMO-DSL-001` id so existing
citations keep resolving; and repointing every cross-repository link to the former
single-file location.

**Out of scope:** the **content** of the grammar and semantics — the normative
language definition is unchanged (lifted verbatim) and continues to be specified by
`KYMO-DSL-001` and its reference implementation
[`dsl.py`](../../../packages/python/src/kymo/dsl.py). The DSL front-end pipeline is
documented by the `*-KYMO-DSL-001` engineering set; this set documents only the
**documentation restructure**.

### 2. Layer structure and document map

This feature is documented across two layers, per ISO/IEC/IEEE 15289 (information
items) and ISO/IEC/IEEE 12207 (life-cycle processes):

| Layer | Folder | 15289 class | 12207 processes | Answers |
|-------|--------|-------------|-----------------|---------|
| **Specification** (this folder) | `docs/specs/kymo-dsl-nref/` | Specification / Description | §6.4 Technical Processes | *what must it be / how is it built / how is it verified?* |
| **Implementation plan** | `docs/specs/kymo-dsl-nref/04-PLAN.md` | Plan + Records — **living** | §6.3 Technical Management | *why, in what order, at what risk, what's done?* |

#### 2.1 Specification layer — document map

Read in order:

| # | Document | `document_id` | ISO/IEC/IEEE 12207 process | Answers |
|---|----------|---------------|----------------------------|---------|
| 01 | `01-REQUIREMENTS.md` (this) | `FEAT-KYMO-NREF-001` | 6.3.6 Information Management + 6.4.2 Stakeholder Needs + 6.4.3 Requirements (SRS, 29148) | *where do I start? / what must it do?* |
| 02 | `02-DESIGN.md` | `DESIGN-KYMO-NREF-001` | 6.4.4 Architecture (42010) + 6.4.5 Design Definition | *how is it built?* |
| 03 | `03-TEST.md` | `TEST-KYMO-NREF-001` | 6.4.9 Verification + 6.4.11 Validation + 6.3.6 Traceability | *how do we know it's right?* |

The implementation plan (`PLAN-KYMO-NREF-001`, `docs/specs/kymo-dsl-nref/04-PLAN.md`)
carries the phasing, sizing, risk register, and worklog. The **restructured
specification itself** is `KYMO-DSL-001` (the set at `docs/formats/kymo-dsl/`); this
engineering set documents the restructure, it does not restate the grammar.

### 3. Background

The kymo DSL is the product's primary hand-authored front-end; its language
reference, was a single ISO/IEC/IEEE 15289–structured file
(`docs/KYMO_DSL.md`, v2.5, ~730 lines) covering Scope through Examples plus
doc-control annexes.

The repository already carries a sibling **normative-reference set for the `.bpmn`
interchange format** at `docs/formats/bpmn/`: a README index plus
one file per clause, each independently versioned with its own doc-control annexes.
The kymo DSL — being the repository's *own* normative language — warranted the same
clause-per-file organisation, so a reader can go straight from a clause number to
its file and each clause can be revised and cited independently. This feature
performs that restructure.

### 4. Feature concept

The restructure is **mechanical and content-preserving**:

1. **Split** — `KYMO-DSL-001` §1–§10 are lifted **verbatim** into ten clause files
   (`01-scope.md` … `10-examples.md`) under `docs/formats/kymo-dsl/`.
2. **Index** — a `README.md` retains `document_id: KYMO-DSL-001` and indexes the
   clauses; the ≈50 existing `KYMO-DSL-001` citations therefore keep resolving.
3. **Sub-IDs** — each clause file carries a `KYMO-DSL-<X>-001` document_id and its
   own Annex A (revision history) / Annex B (document control), per the BPMN-set
   convention.
4. **Anchor preservation** — original section-heading texts are kept verbatim, so
   deep links such as `#64-leaf-components` and `#74-auto-canvas` still resolve;
   only the path part of incoming links changes.
5. **Link repoint + delete** — every `../KYMO_DSL.md` path/anchor link across the
   repository is repointed into the new folder, and the monolith is deleted.

No grammar, semantics, or renderer behaviour changes; the reference implementation
`dsl.py` remains authoritative and untouched.

### 5. Terms and abbreviations

- **Normative-reference set** — a clause-per-file specification: a README index plus
  one file per clause, each independently versioned (cf. `BPMN-NREF-001`).
- **Clause file** — one file holding a single clause of the spec (`KYMO-DSL-<X>-001`).
- **Index** — the set's `README.md`, retaining the canonical `KYMO-DSL-001` id.
- **Anchor** — a GitHub heading fragment (e.g. `#74-auto-canvas`), derived from
  heading text; preserved across the split.
- **Citation** — a reference to a document by its `document_id` (resolves to the index).
- **Monolith** — the former single-file specification `docs/KYMO_DSL.md` (v2.5).
- **FR / NFR / SN / TC / RK** — functional requirement / non-functional requirement
  / stakeholder need / test case / risk.

## Part B — Requirements (SRS)

### 1. Scope and stakeholder needs

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

### 2. Functional requirements

**Table 2.1 — Functional requirements**

| ID | Requirement | Source need | Phase |
|----|-------------|-------------|-------|
| **FR-1** | The DSL specification SHALL be organised as a **clause-per-file normative-reference set** under `docs/formats/kymo-dsl/`, mirroring `docs/formats/bpmn/`: a `README.md` index plus one file per clause for clauses 1–10 (`01-scope.md` … `10-examples.md`). | SN-1, SN-4 | P1 |
| **FR-2** | The index `README.md` SHALL retain `document_id: KYMO-DSL-001`; each clause file SHALL carry a unique `KYMO-DSL-<X>-001` sub-id (`SCOPE`, `NORMREF`, `TERMS`, `ABBR`, `LEX`, `GRAMMAR`, `SEMANTICS`, `AUTHORING`, `CONF`, `EXAMPLES`). Each file (index and clauses) SHALL carry its own Annex A (revision history) and Annex B (document control). | SN-2, SN-1 | P1 |
| **FR-3** | Clause content SHALL be lifted **verbatim** from the v2.5 monolith — no grammar or semantic change. Original section-heading **texts** SHALL be preserved so existing in-document anchors (e.g. `#64-leaf-components`, `#7-semantics`, `#74-auto-canvas`) continue to resolve; only relative paths inside the lifted content are adjusted for the new folder depth. | SN-3, SN-2 | P1 |
| **FR-4** | The monolith (`docs/KYMO_DSL.md`) SHALL be deleted, and **every** `../KYMO_DSL.md` path/anchor link in the repository (docs, `CONTRIBUTING.md`, `CHANGELOG.md`, the PR template, the issue-template contact link) SHALL be repointed into the new folder — deep anchors to their specific clause file, plain links to the index. | SN-2 | P2 |
| **FR-5** | The set SHALL be version-bumped 2.5 → 2.6 (MINOR — restructure, no grammar change); the full revision-history provenance (1.0 → 2.6) SHALL be kept on the index. | SN-1, SN-4 | P1 |

### 3. Non-functional requirements

**Table 3.1 — Non-functional requirements**

| ID | Attribute (ISO 25010) | Requirement |
|----|-----------------------|-------------|
| **NFR-1** | Maintainability — Modularity | `document_id: KYMO-DSL-001` SHALL be defined **exactly once** (the index); every existing `KYMO-DSL-001` citation SHALL still resolve; no `document_id` SHALL be duplicated across the set. |
| **NFR-2** | Functional Correctness | No link or path to the deleted monolith SHALL remain; every repointed anchor SHALL resolve to an **existing heading** in its target clause file. |
| **NFR-3** | Compatibility — Co-existence | No source or test change. The reference implementation `dsl.py` SHALL remain authoritative and untouched; the Python and JS test suites and CI SHALL be unaffected. |
| **NFR-4** | Maintainability — Analysability | The set SHALL match the `docs/formats/bpmn/` structure and the repository's ISO/IEC/IEEE 15289 doc-control conventions (frontmatter schema, doc-control table, Annex A/B). |

### 4. Constraints, assumptions, out-of-scope

**Table 4.1 — Out-of-scope / deferred**

| Item | Where it lives | Why out |
|------|----------------|---------|
| Grammar + statement semantics (the language definition itself) | `KYMO-DSL-001` clauses + `dsl.py` (unchanged) | This feature is a **restructure**, not a language change; content is lifted verbatim and stays dual-sourced with the reference implementation. |
| Converting `docs/tools/*.md` path-based `related_documents` to cite-by-`document_id` | the repository's citation convention (`CLAUDE.md`) | A separate cleanup; here we only **repoint** the existing paths to the new location. |
| Non-English editions | — | The whole repository is English-only; matching every sibling doc set. |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-25 | Vũ Anh | Initial issue — introduction for the kymo DSL normative-reference restructure (FEAT-KYMO-NREF-001). |
| 1.0     | 2026-05-25 | Vũ Anh | Initial issue — requirements (SN-1…5, FR-1…5, NFR-1…4) for the kymo DSL normative-reference restructure (FEAT-KYMO-NREF-001). |
| 1.1     | 2026-06-06 | Vũ Anh | Consolidated FEAT-KYMO-NREF-001 (01-INTRO.md) and FEAT-KYMO-NREF-001 (02-FEATURE.md) into single 01-REQUIREMENTS.md under document_id FEAT-KYMO-NREF-001; no content changes. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-dsl-nref/01-REQUIREMENTS.md`; the authoritative
source is the main-branch working tree, with history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it introduces; available to anyone with
repository read access.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set
(REQ/DSN/TST/PLAN) consistent; increment `version` (MAJOR/MINOR/PATCH); append a row
to Annex A. Adding/changing a requirement requires editing the relevant FR/NFR
(preserving IDs); updating TEST-KYMO-NREF-001's traceability matrix in the same
revision.

### B.4 Backwards Compatibility
Requirement IDs (SN-/FR-/NFR-) are stable across revisions; a removed requirement
SHALL be marked withdrawn (not re-used) so traceability links remain valid. On any
change to the set's structure, reconcile with DESIGN-KYMO-NREF-001 and `KYMO-DSL-001`
(the specification being organised) before release.

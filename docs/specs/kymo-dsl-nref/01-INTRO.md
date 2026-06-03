---
title: Kymo DSL Normative-Reference Set — Introduction
document_id: INTRO-KYMO-NREF-001
version: "1.0"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers and reviewers of the kymo DSL documentation set
review_cycle: On documentation-structure change
supersedes: null
related_documents:
  - FEAT-KYMO-NREF-001       # Requirements
  - DESIGN-KYMO-NREF-001     # Design
  - TEST-KYMO-NREF-001       # Test documentation
  - PLAN-KYMO-NREF-001       # Plan
  - KYMO-DSL-001             # the spec this set reorganises (now the index)
  - KYMO-FMT-001             # .kymo source format — catalog reference
  - BPMN-NREF-001            # BPMN normative-reference set (the structural model mirrored)
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - documentation
  - normative-reference
  - restructure
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo DSL Normative-Reference Set — Introduction

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | INTRO-KYMO-NREF-001                                         |
| Version      | 1.0                                                         |
| Status       | Released                                                    |
| Issue Date   | 2026-05-25                                                  |
| Owner        | `diagrams/` project                                         |
| Related      | FEAT-KYMO-NREF-001, DESIGN-KYMO-NREF-001, TEST-KYMO-NREF-001, PLAN-KYMO-NREF-001 |

## 1. Purpose and scope

This document introduces the **kymo DSL normative-reference set** — the
reorganisation of the kymo DSL language specification (`KYMO-DSL-001`) from a single
monolithic file into a **clause-per-file normative-reference set** under
`docs/formats/kymo-dsl/`. It is the entry point to this feature's document set: it
states the problem, the concept, and the terminology, and maps the reader to the
requirements (FEAT-KYMO-NREF-001), the design (DESIGN-KYMO-NREF-001), the test
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

## 2. Layer structure and document map

This feature is documented across two layers, per ISO/IEC/IEEE 15289 (information
items) and ISO/IEC/IEEE 12207 (life-cycle processes):

| Layer | Folder | 15289 class | 12207 processes | Answers |
|-------|--------|-------------|-----------------|---------|
| **Specification** (this folder) | `docs/specs/kymo-dsl-nref/` | Specification / Description | §6.4 Technical Processes | *what must it be / how is it built / how is it verified?* |
| **Implementation plan** | `docs/specs/kymo-dsl-nref/PLAN.md` | Plan + Records — **living** | §6.3 Technical Management | *why, in what order, at what risk, what's done?* |

### 2.1 Specification layer — document map

Read in order:

| # | Document | `document_id` | ISO/IEC/IEEE 12207 process | Answers |
|---|----------|---------------|----------------------------|---------|
| 01 | `01-INTRO.md` (this) | `INTRO-KYMO-NREF-001` | 6.3.6 Information Management | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-KYMO-NREF-001` | 6.4.2 Stakeholder Needs + 6.4.3 Requirements (SRS, 29148) | *what must it do?* |
| 03 | `03-DESIGN.md` | `DESIGN-KYMO-NREF-001` | 6.4.4 Architecture (42010) + 6.4.5 Design Definition | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-KYMO-NREF-001` | 6.4.9 Verification + 6.4.11 Validation + 6.3.6 Traceability | *how do we know it's right?* |

The implementation plan (`PLAN-KYMO-NREF-001`, `docs/specs/kymo-dsl-nref/PLAN.md`)
carries the phasing, sizing, risk register, and worklog. The **restructured
specification itself** is `KYMO-DSL-001` (the set at `docs/formats/kymo-dsl/`); this
engineering set documents the restructure, it does not restate the grammar.

## 3. Background

The kymo DSL is the product's primary hand-authored front-end; its language
reference, `KYMO-DSL-001`, was a single ISO/IEC/IEEE 15289–structured file
(`docs/KYMO_DSL.md`, v2.5, ~730 lines) covering Scope through Examples plus
doc-control annexes.

The repository already carries a sibling **normative-reference set for the `.bpmn`
interchange format** at `docs/formats/bpmn/` (`BPMN-NREF-001`): a README index plus
one file per clause, each independently versioned with its own doc-control annexes.
The kymo DSL — being the repository's *own* normative language — warranted the same
clause-per-file organisation, so a reader can go straight from a clause number to
its file and each clause can be revised and cited independently. This feature
performs that restructure.

## 4. Feature concept

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

## 5. Terms and abbreviations

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

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-25 | Vũ Anh | Initial issue — introduction for the kymo DSL normative-reference restructure. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-dsl-nref/01-INTRO.md`; the authoritative
source is the main-branch working tree, with history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it introduces; available to anyone with
repository read access.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set
(REQ/DSN/TST/PLAN) consistent; increment `version` (MAJOR/MINOR/PATCH); append a row
to Annex A.

### B.4 Backwards Compatibility
This is an informative overview; on any change to the set's structure, reconcile it
with FEAT-KYMO-NREF-001 (the normative requirements) and `KYMO-DSL-001` (the
specification being organised) before release.

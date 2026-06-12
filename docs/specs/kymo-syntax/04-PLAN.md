---
title: Kymo Syntax (umbrella) — Plan
document_id: PLAN-KYMO-SYNTAX-001
version: "1.0"
issue_date: 2026-06-12
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers working on the kymo syntax surfaces; reviewers
review_cycle: On module addition/removal, or on scope change
supersedes: null
related_documents:
  - FEAT-KYMO-SYNTAX-001     # Requirements (umbrella)
  - DESIGN-KYMO-SYNTAX-001   # Design (umbrella)
  - TEST-KYMO-SYNTAX-001     # V&V (umbrella)
  - PLAN-KYMO-DSL-001        # modules/dsl plan
  - PLAN-KYMOJSON-001        # modules/json plan
  - PLAN-KYMO-NREF-001       # modules/nref plan
authors:
  - Vũ Anh
language: en
keywords:
  - umbrella
  - plan
  - folder-merge
  - worklog
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo Syntax (umbrella) — Plan

| Field             | Value |
|-------------------|-------|
| Document ID       | `PLAN-KYMO-SYNTAX-001` |
| Version           | 1.0 |
| Status            | Released |
| Issue Date        | 2026-06-12 |
| Owner             | `diagrams/` project |
| Related Documents | FEAT-DESIGN-TEST-KYMO-SYNTAX-001; PLAN-KYMO-DSL-001; PLAN-KYMOJSON-001; PLAN-KYMO-NREF-001 |

> Umbrella plan: the record of the folder merge that created this feature, plus the standing
> change-management rules. Module delivery history lives in the module PLAN docs.

## 1. Context

`kymo-dsl` and `kymo-json` were sibling top-level spec sets for the two ends of one pipeline (the
authoring DSL and the resolved-model serialization), and `kymo-dsl-nref` recorded the one-off
restructure of the DSL's language reference. Three top-level folders for one tightly-coupled
syntax area obscured the coupling (`DESIGN-KYMO-SYNTAX-001` §1) and pre-dated the repository's
`modules/` convention for sub-features.

## 2. Decision

Create the **kymo-syntax umbrella** (this set, `*-KYMO-SYNTAX-001`) and fold the three sets in as
modules — `modules/dsl/` (ex `docs/specs/kymo-dsl/`), `modules/json/` (ex `docs/specs/kymo-json/`),
`modules/nref/` (ex `docs/specs/kymo-dsl-nref/`, transitively via the dsl set earlier the same
day). Constraints honoured: every pre-existing `document_id` and item ID unchanged (citations are
by id, so nothing breaks); each module keeps its own versioning, Annexes, and `CR/`; only
self-referential paths were updated, with historical/worklog mentions left as provenance.

## 3. Execution record (2026-06-12, single change set)

1. `git mv` the three folders under `docs/specs/kymo-syntax/modules/{dsl,json,nref}`.
2. Module docs: bumped each file one minor version with an Annex A "Relocated…" row; updated
   present-tense self-paths (document maps, change-management pointers, Annex B.1) — also fixing
   three stale Annex B.1 filenames (`03-DESIGN`/`04-TEST`/`PLAN.md`) noticed in passing; wired
   parent/sibling `related_documents` (`FEAT-KYMO-SYNTAX-001` ↔ modules).
3. Authored the four umbrella docs (`FEAT`/`DESIGN`/`TEST`/`PLAN-KYMO-SYNTAX-001`, v1.0) with the
   module map and invariants `UR-1..3`.
4. Repointed the one external path reference (`KYMO-DSL-001` index companion table →
   `modules/nref/`).

## 4. Risk register

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|----|------|-----------|--------|------------|--------|
| **RK-KSX-01** | Stale path references to the old top-level folders linger somewhere in the repo or in contributors' habits. | Low | Low | Citations are by `document_id` (unchanged); repo-wide grep for `docs/specs/kymo-dsl`/`kymo-json` ran clean at merge time, historical provenance mentions excepted. | Closed |
| **RK-KSX-02** | Umbrella docs drift from module reality (module added/renamed without updating the map). | Med | Low | B.3 change control: module add/remove requires a Part B §2 update + version bump here. | Open |

## 5. Worklog

| Date       | Work | Status |
|------------|------|--------|
| 2026-06-12 | Folded `kymo-dsl-nref` into `kymo-dsl` as `modules/nref/` (intermediate step, same change set). | ✅ |
| 2026-06-12 | Created the kymo-syntax umbrella; moved `kymo-dsl` → `modules/dsl/`, `kymo-json` → `modules/json/`, `nref` → `modules/nref/`; authored the `*-KYMO-SYNTAX-001` quartet; repointed paths. | ✅ |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-06-12 | Vũ Anh | Initial issue — records the kymo-dsl + kymo-json (+ nref) folder merge into the kymo-syntax umbrella (decision, execution record, risks RK-KSX-01..02, worklog). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-syntax/04-PLAN.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
This plan is a living record: append worklog rows as umbrella-level work happens; increment
`version` and add an Annex A row on substantive change. Module plans evolve independently.

### B.4 Backwards Compatibility
`RK-KSX-` ids are stable; a removed risk SHALL be marked withdrawn (not re-used).

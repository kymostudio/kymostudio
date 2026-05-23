---
title: BPMN 2.0 Export — Plan
document_id: FEAT-BPMN-EXPORT-PLAN-001
version: "0.1"
issue_date: 2026-05-23
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo BPMN emitter, CLI, and JS port
review_cycle: On phase completion
supersedes: null
related_documents:
  - FEAT-BPMN-EXPORT-001        # Introduction
  - FEAT-BPMN-EXPORT-REQ-001    # Requirements
  - FEAT-BPMN-EXPORT-DSN-001    # Design
  - FEAT-BPMN-EXPORT-TST-001    # Test documentation
  - BPD-DGM-001                 # BPMN importer element mapping (inverted here)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - export
  - plan
  - phases
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN 2.0 Export — Plan

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-EXPORT-PLAN-001                          |
| Version      | 0.1                                                |
| Status       | Proposed                                           |
| Issue Date   | 2026-05-23                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-BPMN-EXPORT-001, FEAT-BPMN-EXPORT-REQ-001, FEAT-BPMN-EXPORT-DSN-001, FEAT-BPMN-EXPORT-TST-001 |

Concept: FEAT-BPMN-EXPORT-001. Requirements (FR/NFR referenced below):
FEAT-BPMN-EXPORT-REQ-001. Design: FEAT-BPMN-EXPORT-DSN-001. Verification:
FEAT-BPMN-EXPORT-TST-001.

## 1. Scope and approach

Implement `to_bpmn` — the inverse of `from_bpmn` (BPD-DGM-001) — mirrored in
`packages/python` and `packages/js`, plus a CLI `--bpmn` target. The headline
acceptance is **round-trip fidelity** against real `.bpmn` corpora. Delivered
incrementally (P0–P4).

## 2. Design

The mapping (inverse classification + DI coordinate inverse + collaboration
reconstruction), the emitter API, and integration are specified in
**FEAT-BPMN-EXPORT-DSN-001**. This plan covers only scope, phases, and risks.

## 3. Phases (work breakdown)

| ID | Phase | Deliverables | Exit criteria | Reqs | Status |
|----|-------|--------------|---------------|------|--------|
| **P0** | Spike | Throwaway export of `samples/order.bpmn` (+ `collaboration.bpmn`) → BPMN XML; re-import + open in bpmn.io; eyeball round-trip | Exported XML re-imports; layout legible | FR-4 | Planned |
| **P1** | Python core | `to_bpmn.py` `export()` (single `<process>` + DI; events/tasks/gateways/flows) + inverse maps; CLI `--bpmn`; unit + round-trip tests | Single-process corpus files round-trip; suite green | FR-1..FR-4, FR-6, FR-7 | Planned |
| **P2** | Containers | Pools/lanes/groups → collaboration + laneSet; data-object/store/annotation/subprocess; **full corpus round-trip** gate | Whole `samples/` + `tests/corpus_bpmn/` round-trip; structure preserved | FR-5, NFR-1, NFR-2 | Planned |
| **P3** | JS parity | `to-bpmn.ts` port + `index.ts` export + JS round-trip tests | `npm test` green; XML ~matches Python; round-trips via `parseBpmn` | FR-8, NFR-3 | Planned |
| **P4** | Docs & release | `docs/BPMN.md` export section (cite BPD-DGM-001 as inverse); mark this set `Released`; version bump | Spec updated; doc set Released | all | Planned |

## 4. Risks and mitigations

- **Mapping drift vs the importer** — invert `from_bpmn`'s maps at build time (single
  source of truth) instead of duplicating tables (DSN §3).
- **Round-trip lossiness** (NFR-1) — gate on the corpus; accept *semantic + DI*
  equivalence, not byte equality; document any element types not yet covered.
- **Collaboration / lane membership** — reconstructing `<flowNodeRef>` from geometry
  is fuzzy; prefer stored membership where available; cover with corpus pools.
- **Coordinate inverse** — centre↔top-left + label boxes are the main correctness
  surface; unit-test the math (TC-3) and verify visually in P0.

## 5. Verification

Approach, levels, cases (TC-1…TC-9), and the requirements-traceability matrix are
specified in FEAT-BPMN-EXPORT-TST-001.

## 6. Estimate (complexity)

Relative complexity in **story points** (Fibonacci):

| Phase | Points |
|-------|--------|
| P0 — Spike (round-trip prototype) | 3 |
| P1 — Python core emitter + CLI + tests | 8 |
| P2 — Containers + full corpus round-trip | 5 |
| P3 — JS parity (port + tests) | 5 |
| P4 — Docs & release | 3 |
| **Total** | **24** |

~24 points = a medium feature. **P1** carries the core emitter; **P2** carries the
correctness risk (round-trip over the full corpus).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial issue (feature doc set created). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/features/bpmn-export/05-PLAN.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On phase completion or scope change: update the affected clause + phase row; keep
requirement IDs and the TST traceability matrix consistent; increment `version`;
append a row to Annex A (document edits) and Annex C (the phase's implementation worklog).

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-BPMN-EXPORT-REQ-001,
FEAT-BPMN-EXPORT-DSN-001, and BPD-DGM-001. Reconcile any deviation there before release.

## Annex C — Worklog

**Table C.1 — Implementation worklog.** Per-phase work as it happens — distinct from
Annex A, which records edits to *this document*. Newest entries at the bottom; dates
ISO 8601.

| Date       | Phase | Work | Outcome / artifacts |
|------------|-------|------|---------------------|
| 2026-05-23 | — (doc set) | Authored the feature doc set (INTRO/REQ/DSN/TST/PLAN) defining `to_bpmn` as the inverse of `from_bpmn` (BPD-DGM-001). | **Proposed** — no code yet; P0–P4 planned in §3. |

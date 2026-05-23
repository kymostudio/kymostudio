---
title: BPMN in the kymo DSL — Plan
document_id: FEAT-BPMN-DSL-PLAN-001
version: "0.1"
issue_date: 2026-05-23
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo DSL, layout engine, and renderers
review_cycle: On milestone completion, or on grammar change
supersedes: null
related_documents:
  - FEAT-BPMN-DSL-001        # Introduction
  - FEAT-BPMN-DSL-REQ-001    # Requirements
  - FEAT-BPMN-DSL-DSN-001    # Design
  - FEAT-BPMN-DSL-TST-001    # Test documentation
  - DSL-LANG-001             # kymo DSL language specification (normative)
  - BPD-DGM-001              # BPMN importer element mapping
  - RES-MERMAID-D2-001       # Mermaid vs D2 (auto-layout prior art)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - dsl
  - plan
  - milestones
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN in the kymo DSL — Plan

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-DSL-PLAN-001                            |
| Version      | 0.1                                                |
| Status       | Proposed                                           |
| Issue Date   | 2026-05-23                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-BPMN-DSL-001, FEAT-BPMN-DSL-REQ-001, FEAT-BPMN-DSL-DSN-001, FEAT-BPMN-DSL-TST-001 |

Concept: FEAT-BPMN-DSL-001. Requirements (FR/NFR referenced below):
FEAT-BPMN-DSL-REQ-001. Design: FEAT-BPMN-DSL-DSN-001. Verification:
FEAT-BPMN-DSL-TST-001.

## 1. Scope and approach

Implement the `bpmn { }` block + a layered DAG auto-layout, mirrored in
`packages/python` and `packages/js`. The block emits a fully-resolved
sub-diagram, reusing the existing renderer (FR-10) — so no `to_svg`/`render`
change. Delivered incrementally (M0–M4).

## 2. Design

The architecture and algorithm (grammar → AST → model, the Sugiyama LR layout
pipeline, integration, renderer reuse, determinism) are specified in
**FEAT-BPMN-DSL-DSN-001**. This plan covers only scope, milestones, and risks.

## 3. Milestones (work breakdown)

| ID | Milestone | Deliverables | Exit criteria | Reqs |
|----|-----------|--------------|---------------|------|
| **M0** | Spike | Throwaway layered-layout prototype on the order graph | Sane LR layout w/ split-join; legible routing | FR-8 |
| **M1** | Python parser | `bpmn { }` → AST → Components/Edges (no layout; raise if rendered); parser tests | Parser tests green; suite green | FR-1..FR-7 |
| **M2** | Python layout | `bpmn_layout.py` + `finalize` wiring; `samples/order-flow.kymo`; golden + `tests/test_bpmn_layout.py` | Renders LR; full suite green incl. corpus gate (no regen); deterministic | FR-8..FR-10, NFR-1, NFR-2 |
| **M3** | JS parity | `dsl.ts` block branch + `bpmn-layout.ts` port + JS tests | `npm test` green; geometry ~matches Python | FR-11, NFR-3 |
| **M4** | Docs & release | DSL-LANG-001 clause (EBNF + semantics) + version/Annex bump; finalise samples; mark this set `Released` | Spec updated in lockstep with `dsl.py`/`dsl.ts` | all |

## 4. Risks and mitigations

- **Routing aesthetics** (main cost) — benchmark visually vs
  `samples/order-fulfillment.svg`.
- **Determinism** (NFR-1) — stable tie-breaks + fixed iteration counts.
- **Parity drift** — shared test graphs + cross-language geometry-equivalence
  check (not byte-equality, NFR-4).
- **Pipeline interaction** — confirm `resolve_alignments` does not perturb
  laid-out geometry; gate if necessary.

## 5. Verification

Approach, levels, cases, and the requirements-traceability matrix are specified
in FEAT-BPMN-DSL-TST-001.

## 6. Estimate (complexity)

Relative complexity in **story points** (Fibonacci; calibration: 13 ≈ the layout
engine, the dominant effort and risk):

| Milestone | Points |
|-----------|--------|
| M0 — Spike (layout prototype) | 3 |
| M1 — Python parser (block → AST → model) | 5 |
| M2 — Python layout engine (Sugiyama + routing + pin + golden) | 13 |
| M3 — JS parity (port `bpmn-layout.ts` + tests) | 8 |
| M4 — Docs & release (DSL-LANG-001 clause + bump) | 3 |
| **Total** | **32** |

~32 points = a large, multi-week feature. **M2** carries most of the effort and
the principal risks (routing aesthetics, determinism — see §4); everything else
is comparatively mechanical.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes                                                |
|---------|------------|--------|--------------------------------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial issue (design extracted to FEAT-BPMN-DSL-DSN-001). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/features/bpmn-dsl/05-PLAN.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On milestone completion or scope change: update the affected clause + milestone
row; keep requirement IDs and the TST traceability matrix consistent; increment
`version`; append a row to Annex A.

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-BPMN-DSL-REQ-001,
FEAT-BPMN-DSL-DSN-001, and DSL-LANG-001. Reconcile any deviation there before
release.

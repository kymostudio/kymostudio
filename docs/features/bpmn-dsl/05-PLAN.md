---
title: BPMN in the kymo DSL — Plan
document_id: FEAT-BPMN-DSL-PLAN-001
version: "0.6"
issue_date: 2026-05-23
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo DSL, layout engine, and renderers
review_cycle: On phase completion, or on grammar change
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
  - phases
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN in the kymo DSL — Plan

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-DSL-PLAN-001                            |
| Version      | 0.6                                                |
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
change. Delivered incrementally (P0–P4).

## 2. Design

The architecture and algorithm (grammar → AST → model, the Sugiyama LR layout
pipeline, integration, renderer reuse, determinism) are specified in
**FEAT-BPMN-DSL-DSN-001**. This plan covers only scope, phases, and risks.

## 3. Phases (work breakdown)

| ID | Phase | Deliverables | Exit criteria | Reqs | Status |
|----|-------|--------------|---------------|------|--------|
| **P0** | Spike | Throwaway layered-layout prototype on the order graph | Sane LR layout w/ split-join; legible routing | FR-8 | ✅ Done (2026-05-23) |
| **P1** | Python parser | `bpmn { }` → AST → Components/Edges (no layout; raise if rendered); parser tests | Parser tests green; suite green | FR-1..FR-7 | ✅ Done (2026-05-23) |
| **P2** | Python layout | `bpmn_layout.py` + cli-pass wiring; `samples/order-flow.kymo`; golden + `tests/test_bpmn_layout.py` | Renders LR; full suite green incl. corpus gate (no regen); deterministic | FR-8..FR-10, NFR-1, NFR-2 | ✅ Done (2026-05-23) |
| **P3** | JS parity | `dsl.ts` block branch + `bpmn-layout.ts` port + JS tests | `npm test` green; geometry ~matches Python | FR-11, NFR-3 | ✅ Done (2026-05-23) |
| **P4** | Docs & release | DSL-LANG-001 clause (EBNF + semantics) + version/Annex bump; finalise samples; mark this set `Released` | Spec updated in lockstep with `dsl.py`/`dsl.ts` | all | Planned |

**P0 complete (2026-05-23).** The throwaway spike
(`packages/python/spikes/bpmn_layout_spike.py`) validated the layered LR pipeline
on the order graph — sane LR layout, legible `xor` branch + parallel split/join,
deterministic (byte-identical) output: verdict **PASS**, P2 greenlit. Findings
were folded into FEAT-BPMN-DSL-DSN-001 §3 (primary-path/trunk pinning; real
dummy-node handling) — see `packages/python/spikes/README.md`.

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

| Phase | Points |
|-------|--------|
| P0 — Spike (layout prototype) | 3 |
| P1 — Python parser (block → AST → model) | 5 |
| P2 — Python layout engine (Sugiyama + routing + pin + golden) | 13 |
| P3 — JS parity (port `bpmn-layout.ts` + tests) | 8 |
| P4 — Docs & release (DSL-LANG-001 clause + bump) | 3 |
| **Total** | **32** |

~32 points = a large, multi-week feature. **P2** carries most of the effort and
the principal risks (routing aesthetics, determinism — see §4); everything else
is comparatively mechanical.

**Progress:** P0 + P1 + P2 + P3 (3 + 5 + 13 + 8 = 29 pts) complete (2026-05-23) — ~3 points remain (P4).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes                                                |
|---------|------------|--------|--------------------------------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial issue (design extracted to FEAT-BPMN-DSL-DSN-001). |
| 0.2     | 2026-05-23 | Vũ Anh | Record P0 (spike) complete: phase Status column + progress notes; findings fed to FEAT-BPMN-DSL-DSN-001. |
| 0.3     | 2026-05-23 | Vũ Anh | Add Annex C (implementation worklog); B.3 now references it. |
| 0.4     | 2026-05-23 | Vũ Anh | Record P1 (parser) complete: phase Status + progress + Annex C worklog row. |
| 0.5     | 2026-05-23 | Vũ Anh | Record P2 (layout engine) complete: phase Status + progress + Annex C worklog row. |
| 0.6     | 2026-05-23 | Vũ Anh | Record P3 (JS parity) complete: phase Status + progress + Annex C worklog row. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/features/bpmn-dsl/05-PLAN.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On phase completion or scope change: update the affected clause + phase
row; keep requirement IDs and the TST traceability matrix consistent; increment
`version`; append a row to Annex A (document edits) and Annex C (the phase's
implementation worklog).

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-BPMN-DSL-REQ-001,
FEAT-BPMN-DSL-DSN-001, and DSL-LANG-001. Reconcile any deviation there before
release.

## Annex C — Worklog

**Table C.1 — Implementation worklog.** Per-phase work as it happens — distinct
from Annex A, which records edits to *this document*. Newest entries at the
bottom; dates ISO 8601.

| Date       | Phase | Work | Outcome / artifacts |
|------------|-------|------|---------------------|
| 2026-05-23 | P0 — Spike | Built a throwaway layered-LR layout prototype on the order graph (rank → order → coordinates → orthogonal routing), rendered it via the existing `to_svg` back-end, eyeballed against `samples/order-fulfillment.svg`, and checked determinism. | **PASS** — sane LR layout; legible `xor` branch + parallel split/join; byte-identical SVG across runs. Artifacts in `packages/python/spikes/` (`bpmn_layout_spike.py`, `order-spike.svg`/`.png`, `README.md`). Findings (primary-path/trunk pinning; real dummy nodes) folded into FEAT-BPMN-DSL-DSN-001 §3. P2 greenlit. |
| 2026-05-23 | P1 — Python parser | Added the file-scope `bpmn { }` parser to `dsl.py`: `BpmnNode`/`BpmnFlow`/`BpmnBlock` AST; kind→`(shape, marker)` + arrow→flow maps (mirroring `from_bpmn`); chain/`;` expansion + `: "label"`; `@ (x,y)` parsed (honoured in P2). `Diagram.bpmn_blocks` field; `to_svg.render()` + CLI raise while a block is unlaid-out. | **Done** — 8 new `test_dsl.py` cases (covering TC-1/TC-2/TC-3); full suite **220 passed, 1 skipped**, goldens + BPMN corpus baseline byte-identical. No layout yet (P2). |
| 2026-05-23 | P2 — Python layout | Built `bpmn_layout.py`: rank → dummy nodes → barycenter order → coordinate assignment (longest path pinned to a straight baseline — finding #1) → `@` pin override (FR-9) → orthogonal routing (`Edge.points`). Wired as a cli pass; `resolve_alignments` skipped for bpmn-block diagrams. Added `samples/order-flow.kymo` + golden `.svg`. | **Done** — straight trunk, branches balanced above/below the trunk, legible split/join (eyeballed vs benchmark), deterministic. 8 new `test_bpmn_layout.py` cases; full suite **228 passed, 1 skipped**; other goldens + corpus baseline byte-identical (only the new golden minted). |
| 2026-05-23 | P3 — JS parity | Ported the parser + layout to `packages/js`: `bpmn { }` branch in `dsl.ts`, new `bpmn-layout.ts` (same algorithm/constants), `bpmnBlocks` on the model, wired into `parseDiagram` (skips `resolveAlignments`), render-guard backstop. Also **fixed red CI**: P2's `samples/order-flow.kymo` had broken the JS `renders every sample .kymo` test. | **Done** — `npm test` **49 passed** (incl. the sample test) + 8 new bpmn cases; typecheck clean; **zero runtime deps** (NFR-3). JS render geometrically matches the Python golden (eyeballed) — functional parity (FR-11/NFR-4). |

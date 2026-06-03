---
title: Kymo DSL Front-End — Plan
document_id: PLAN-KYMO-DSL-001
version: "1.1"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo DSL parser, layout engine, alignment resolver, and renderers
review_cycle: On phase completion, or on grammar change
supersedes: null
related_documents:
  - INTRO-KYMO-DSL-001       # Introduction
  - FEAT-KYMO-DSL-001        # Requirements
  - DESIGN-KYMO-DSL-001      # Design
  - TEST-KYMO-DSL-001        # Test documentation
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - plan
  - phases
  - pipeline
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo DSL Front-End — Plan

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-KYMO-DSL-001                                  |
| Version      | 1.1                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-24                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-FEAT-DESIGN-TEST-KYMO-DSL-001 |

Concept: INTRO-KYMO-DSL-001. Requirements (FR/NFR referenced below):
FEAT-KYMO-DSL-001. Design: DESIGN-KYMO-DSL-001. Verification: TEST-KYMO-DSL-001.

> **Descriptive plan.** The `.kymo` front-end is already shipped and in daily use;
> this document set was authored to fill the missing engineering documentation
> (every other feature area carries one). The phase breakdown below records how
> the front-end was delivered; all phases are complete. The authoritative
> implementation timeline is `git log` — exact historical dates/metrics are not
> reconstructed here.

## 1. Scope and approach

Deliver a declarative, line-oriented `.kymo` front-end that compiles source into a
fully-resolved `Diagram`, mirrored in `packages/python` (reference) and
`packages/js`, reusing a *dumb* back-end (FR-12). Built and maintained
incrementally (P0–P6).

## 2. Design

The architecture — pipeline + dispatch, the declarative parser, the layout
engine, the five-pass alignment resolver, the renderer hand-off, JS parity, and
determinism/conformance — is specified in **DESIGN-KYMO-DSL-001**. This plan
covers only scope, phases, and risks.

## 3. Phases (work breakdown)

| ID | Phase | Deliverables | Exit criteria | Reqs | Status |
|----|-------|--------------|---------------|------|--------|
| **P0** | Parser | `dsl.py:parse()` — declarative line grammar (directives, leaves, regions, layout frames, edges, layout trees, comments) → `(Diagram, layout_dict, external_dict)`; `test_dsl.py` | Parser tests green; no positions computed | FR-1…FR-8, FR-10 | ✅ Shipped |
| **P1** | Layout engine | `layout.py:layout()` — pack auto-layout / grid frames into rows/cells | Frames packed; cross-region rows align | FR-11 | ✅ Shipped |
| **P2** | Alignment resolver | `alignment.py:resolve_alignments()` — five passes (auto-layouts, anchoring, region bounds, fan-in/trunk staggering, auto-canvas) | Positions resolved; golden SVGs stable | FR-11, NFR-1 | ✅ Shipped |
| **P3** | Renderer hand-off | `to_svg.py:render()` + sibling emitters consume the resolved model; `cli.py:load()` dispatch + skip-resolve for resolved sources | Resolved `Diagram` renders; back-end stays dumb | FR-12 | ✅ Shipped |
| **P4** | JS parity | `dsl.ts`/`layout.ts`/`alignment.ts` (`parse`/`parseDiagram`/`renderSVG`); `round.ts` `pyRound` | `npm test` green; zero runtime deps | FR-13, NFR-2 | ✅ Shipped |
| **P5** | Conformance harness | golden `.kymo` → model JSON; `test_conformance.py` / `conformance.test.js` (Python sole golden writer) | Both suites deep-equal the same goldens | NFR-3, NFR-4 | ✅ Shipped |
| **P6** | Grammar spec & this doc set | KYMO-DSL-001 (EBNF + semantics) maintained in lockstep; this descriptive REQ/DSN/TST/PLAN set | Spec ↔ `dsl.py`/`dsl.ts` in lockstep; set `Released` | all | ✅ Shipped |

## 4. Risks and mitigations

- **Parity drift** (Python vs JS) — golden conformance suite with Python as the
  sole golden writer; JS rounds with `pyRound` (half-to-even). (NFR-3, NFR-4)
- **Determinism** — stable tie-breaks, fixed iteration counts, integer
  coordinates; byte-for-byte golden SVGs. (NFR-1)
- **Golden churn** — feature-specific CSS/defs injected only when used, so
  unaffected diagrams stay byte-identical; regenerate goldens only on intentional
  change.
- **Grammar/spec divergence** — KYMO-DSL-001 and `dsl.py` updated in lockstep on
  any grammar change. (NFR-4)

## 5. Verification

Approach, levels, cases, and the requirements-traceability matrix are specified in
TEST-KYMO-DSL-001.

## 6. Estimate (complexity)

Relative complexity in **story points** (Fibonacci; calibration: 13 ≈ the
alignment resolver, the dominant geometry effort).

| Phase | Points |
|-------|--------|
| P0 — Parser (declarative line grammar) | 8 |
| P1 — Layout engine (frame packing) | 5 |
| P2 — Alignment resolver (five passes + staggering) | 13 |
| P3 — Renderer hand-off (dispatch + dumb back-end) | 5 |
| P4 — JS parity (independent impl + `pyRound`) | 13 |
| P5 — Conformance harness (golden model JSON, both suites) | 8 |
| P6 — Grammar spec & doc set | 3 |
| **Total** | **55** |

~55 points = a large, multi-week foundation. **P2** (geometry resolution) and
**P4** (an independent JS implementation kept at byte-level parity) carry most of
the effort and risk; everything else is comparatively mechanical.

## 7. Change requests

Changes to the baselined spec (`docs/specs/kymo-dsl/`) are raised, assessed, and logged in
[`CR/`](CR/) (raise → assess → approve → implement → re-baseline). None raised
yet — see [`CR/README.md`](CR/README.md).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — descriptive plan for the shipped `.kymo` front-end. |
| 1.1     | 2026-05-25 | Vũ Anh | **Doc reorganization.** Added §7 Change-requests (`CR/`). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-dsl/PLAN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On phase completion or scope change: update the affected clause + phase row; keep
requirement IDs and the TST traceability matrix consistent; increment `version`;
append a row to Annex A (document edits) and Annex C (the phase's implementation
worklog).

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-DESIGN-and KYMO-DSL-001. Reconcile any deviation there before
release.

## Annex C — Worklog

**Table C.1 — Implementation worklog.** Per-phase work as it happens — distinct
from Annex A, which records edits to *this document*. Newest entries at the
bottom; dates ISO 8601.

| Date       | Phase | Work | Outcome / artifacts |
|------------|-------|------|---------------------|
| 2026-05-24 | P6 — Doc set | Authored this descriptive engineering set (INTRO/FEAT/DESIGN/TEST/PLAN-KYMO-DSL-001) for the already-shipped `.kymo` front-end, capturing the requirements it meets, the design it follows, and the tests that gate it. | **Done** — doc-only; no source/test change. The shipped front-end's implementation history is in `git log`; KYMO-DSL-001 remains the normative grammar, maintained in lockstep with `dsl.py`/`dsl.ts`. |

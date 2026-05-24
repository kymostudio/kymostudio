---
title: BPMN 2.0 Import — Plan
document_id: PLAN-BPMN-PARSER-001
version: "1.0"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo BPMN importer and its JS port
review_cycle: On phase completion
supersedes: null
related_documents:
  - INTRO-BPMN-PARSER-001        # Introduction
  - FEAT-BPMN-PARSER-001         # Requirements
  - DESIGN-BPMN-PARSER-001       # Design
  - TEST-BPMN-PARSER-001         # Test documentation
  - BPMN-MAP-001                 # BPMN element mapping (the import table)
  - DESIGN-BPMN-EXPORT-001       # BPMN export design (the inverse)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - import
  - plan
  - phases
  - conformance
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN 2.0 Import — Plan

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-BPMN-PARSER-001                               |
| Version      | 1.0                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-24                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-BPMN-PARSER-001, FEAT-BPMN-PARSER-001, DESIGN-BPMN-PARSER-001, TEST-BPMN-PARSER-001 |

Concept: INTRO-BPMN-PARSER-001. Requirements (FR/NFR referenced below):
FEAT-BPMN-PARSER-001. Design: DESIGN-BPMN-PARSER-001. Verification:
TEST-BPMN-PARSER-001.

## 1. Scope and approach

Provide the BPMN 2.0 importer — `from_bpmn.parse` (Python) and `parseBpmn` (JS) — that
turns a `.bpmn` file into a fully-resolved `Diagram` from its Diagram-Interchange
geometry, the inverse of BPMN-MAP-001's export direction. The importer itself shipped
ahead of this document set (the renderer needs it to draw `.bpmn` input). This plan is
therefore largely **retroactive**: it records the importer's phases and, crucially, the
recent **cross-language parity** work that turned "two independent importers we trust"
into "two importers proven identical on a 120-file corpus" (NFR-1, FR-8).

## 2. Design

The pipeline, classification (shared single-source tables), DI geometry + half-to-even
rounding, container mapping, and integration are specified in **DESIGN-BPMN-PARSER-001**.
This plan covers only scope, phases, and risks.

## 3. Phases (work breakdown)

| ID | Phase | Deliverables | Exit criteria | Reqs | Status |
|----|-------|--------------|---------------|------|--------|
| **P0** | Python importer | `from_bpmn.py:parse` — DI geometry → resolved `Diagram`; classification tables; namespace-agnostic; pools/lanes/groups/subprocess → regions; CLI routes `.bpmn`, skips layout | `.bpmn` samples import + render; MIWG corpus gated by `baseline.json` | FR-1..FR-7, NFR-2..NFR-4 | ✅ Done (pre-existing) |
| **P1** | JS parity | `from-bpmn.ts:parseBpmn` mirror + dependency-free XML parser; classification tables **exported** so `to-bpmn.ts` inverts the same source; `index.ts` exports `parseBpmn` | `npm test` green; samples import + render | FR-8, NFR-3 | ✅ Done (pre-existing) |
| **P2** | Cross-language import conformance | Bidirectional BPMN conformance (`conformance/`): `bpmn_import.json` snapshot over samples + fixtures + full MIWG corpus; `test_bpmn_conformance.py` / `bpmn-conformance.test.js`; reconcile all divergences | Python ≡ JS on every corpus file; `known_divergences.json` empty | NFR-1, FR-8 | ✅ Done (2026-05-24) |
| **P3** | Docs & release | This feature doc set (INTRO/REQ/DSN/TST/PLAN); back-reference from BPMN-MAP-001 | Doc set Released; citations resolve | all | ✅ Done (2026-05-24) |

## 4. Risks and mitigations

- **Rounding-mode divergence (NFR-1)** — `Math.round` (half-up) vs Python `round()`
  (half-to-even) split coordinates at exact `.5`. *Mitigation*: the shared `pyRound`
  helper (`packages/js/src/round.ts`) everywhere the importer rounds; the conformance
  gate catches any regression (it was the **only** root cause found — see Annex C).
- **Independent-implementation drift** — two hand-written parsers can diverge silently.
  *Mitigation*: `bpmn_import.json` conformance gate over the full MIWG corpus on every CI run.
- **DI-less files** — no geometry to read. *Mitigation*: out of scope (FEAT §4); such
  files are surfaced as empty/un-importable uniformly, not partially built.
- **Encoding** — a few MIWG files are Latin-1. *Mitigation*: decode as UTF-8 with invalid
  bytes replaced (matches the corpus tooling and Node's `readFileSync(…, "utf8")`).

## 5. Verification

Approach, levels, cases (TC-1…TC-11), and the requirements-traceability matrix are
specified in TEST-BPMN-PARSER-001. Headline gates: the MIWG `baseline.json` corpus test
and the cross-language `bpmn_import.json` conformance suite.

## 6. Estimate (complexity)

Relative complexity in **story points** (Fibonacci):

| Phase | Points |
|-------|--------|
| P0 — Python importer | 8 |
| P1 — JS parity | 5 |
| P2 — Cross-language import conformance | 5 |
| P3 — Docs & release | 2 |
| **Total** | **20** |

**Progress:** P0 + P1 (pre-existing) + P2 + P3 (2026-05-24) = 8 + 5 + 5 + 2 = **20 / 20 pts — feature complete and parity-locked**.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — retroactive plan for the BPMN importer; records the cross-language conformance lock (P2) and the doc set (P3). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/plans/bpmn-parser/PLAN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On phase completion or scope change: update the affected clause + phase row; keep
requirement IDs and the TST traceability matrix consistent; increment `version`;
append a row to Annex A (document edits) and Annex C (the phase's implementation worklog).

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-BPMN-PARSER-001,
DESIGN-BPMN-PARSER-001, and BPMN-MAP-001. Reconcile any deviation there before release.

## Annex C — Worklog

**Table C.1 — Implementation worklog.** Per-phase work as it happens — distinct from
Annex A, which records edits to *this document*. Newest entries at the bottom; dates
ISO 8601.

| Date       | Phase | Work | Outcome / artifacts |
|------------|-------|------|---------------------|
| (pre-existing) | P0 — Python importer | `src/kymo/from_bpmn.py` — DI-geometry import, classification tables, region mapping; `cli` routes `.bpmn` and skips layout/align. Gated by `tests/test_bpmn_corpus.py` against `baseline.json`. | **Done** — shipped before this doc set; see `git log`. |
| (pre-existing) | P1 — JS parity | `packages/js/src/from-bpmn.ts` `parseBpmn` + dependency-free `xml.ts`; classification tables exported for `to-bpmn.ts` to invert; `index.ts` exports `parseBpmn`. | **Done** — shipped before this doc set; see `git log`. |
| 2026-05-24 | P2 — Cross-language import conformance | Added the bidirectional BPMN conformance layer: a canonical-model serializer mirrored in `packages/python/tests/_conformance.py` ↔ `packages/js/tests/_conformance.mjs`; `bpmn_import.json` snapshot (`{stem: canonical model}`) over **samples + fixtures + the full 120-file MIWG corpus**; drivers `test_bpmn_conformance.py` / `bpmn-conformance.test.js` (Python writes goldens, JS asserts). First run surfaced **45 import + 17 export** divergences over the MIWG corpus — **all one root cause**: JS used `Math.round` (half-up) where Python uses `int(round())` (half-to-even). Extracted the shared `pyRound` (`src/round.ts`) and routed `from-bpmn.ts` + `to-bpmn.ts` (and earlier `alignment.ts`/`bpmn-layout.ts`) through it. | **Done** — `known_divergences.json` **empty**; same `.bpmn` ⇒ identical canonical model in both languages across all 126 files. Negative check: a stray `Math.round` in `from-bpmn.ts` re-breaks the import lock. Python suite + JS `npm test` green. |
| 2026-05-24 | P3 — Docs & release | Authored the feature doc set `docs/specs/bpmn-parser/` (INTRO/REQ/DSN/TST/PLAN, `*-BPMN-PARSER-001`) — the symmetric counterpart to the `bpmn-export` set — and added a back-reference from BPMN-MAP-001. Doc set marked **Released**. | **Done** — feature complete (20/20 pts); citations resolve; structure mirrors `bpmn-export` 1:1. |

---
title: kymo.json Interchange Format — Plan
document_id: PLAN-KYMOJSON-001
version: "1.2"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo.json serializer/loader, CLI, and JS port
review_cycle: On phase completion
supersedes: null
related_documents:
  - FEAT-KYMOJSON-001          # Introduction
  - DESIGN-KYMOJSON-001         # Design
  - TEST-KYMOJSON-001           # Test documentation
  - KYMOJSON-MAP-001            # The normative schema
authors:
  - Vũ Anh
language: en
keywords:
  - kymo.json
  - plan
  - phases
  - round-trip
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# kymo.json Interchange Format — Plan

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-KYMOJSON-001                                  |
| Version      | 1.2                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-24                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-KYMOJSON-001, FEAT-KYMOJSON-001, DESIGN-KYMOJSON-001, TEST-KYMOJSON-001 |

Concept: FEAT-KYMOJSON-001. Requirements: FEAT-KYMOJSON-001. Design:
DESIGN-KYMOJSON-001. Schema: KYMOJSON-MAP-001. Verification: TEST-KYMOJSON-001.

## 1. Scope and approach

Add a bidirectional, lossless `.kymo.json` serialization of the resolved `Diagram`,
mirrored in `packages/python` and `packages/js`, plus a CLI `--json` target and a
`.kymo.json` input source. The serializer is **promoted to the library as the single
source of truth** for kymo's canonical model JSON — the conformance suite reuses it.
Sequenced to isolate the one risk (the conformance suite newly comparing
`layout_trees`) behind a standalone parity gate (P3) before touching committed goldens.

## 2. Design

The envelope, model body, layout-tree canonical form, serializer/loader, CLI wiring,
and the single-source-of-truth reuse are specified in **DESIGN-KYMOJSON-001**; the
schema in **KYMOJSON-MAP-001**. This plan covers scope, phases, and risks.

## 3. Phases (work breakdown)

| ID | Phase | Deliverables | Exit criteria | Reqs | Status |
|----|-------|--------------|---------------|------|--------|
| **P1** | Python end-to-end | `to_kymojson.py` / `from_kymojson.py`; CLI `--json` + `.json` load (skip layout); round-trip + render tests | `kymo x.kymo --json` then `kymo x.kymo.json` renders identical SVG; `export∘parse∘export` stable; pytest + ruff green | FR-1..FR-7, NFR-2..NFR-4 | ✅ Done (2026-05-24) |
| **P2** | JS end-to-end | `to-kymojson.ts` / `from-kymojson.ts`; `index.ts` exports; round-trip tests | `npm test` green; JS load-fixpoint holds | FR-8, NFR-3 | ✅ Done (2026-05-24) |
| **P3** | Cross-language parity gate | Standalone check: Python `export` and JS `toKymoJson` byte-identical (incl. `layout_trees`) across the corpus | Identical bytes both ways; layout-tree divergences (if any) reconciled in isolation | NFR-1 | ✅ Done (2026-05-24) |
| **P4** | Unify conformance serializer | Point `tests/_conformance.{py,mjs}` at `model_dict`/`modelDict`; regenerate `.model.json` + `bpmn_import.json` goldens (now incl. `layout_trees`) | Both conformance suites green; layout-tree parity now gated | NFR-1 | ✅ Done (2026-05-24) |
| **P5** | Docs | `KYMOJSON-MAP-001` format doc + this spec set + back-references (BPMN-MAP-001) | Doc set Released; citations resolve | all | ✅ Done (2026-05-24) |

## 4. Risks and mitigations

- **Layout-tree parity** (the design risk) — the conformance suite newly compares
  `layout_trees`. *Mitigation*: P3 proved Python/JS build them **byte-identically**
  across the corpus **before** P4 touched committed goldens — zero reconciliation
  needed. The shared half-to-even rounding (`pyRound`) from the BPMN work underpins it.
- **JSON formatting parity** — Python `json.dumps(indent=2)` vs JS `JSON.stringify(…,2)`.
  *Mitigation*: same key order + number normalisation; verified byte-identical on the
  corpus (P3); the `"format"` key is the type marker regardless of formatting.
- **Two serializers drifting** — *Mitigation*: promote to one library serializer the
  conformance suite imports (no in-test copy).

## 5. Verification

Approach, levels, cases (TC-1…TC-10), and the traceability matrix are in
TEST-KYMOJSON-001. Headline: round-trip (fixpoint + render-equivalence) and the
cross-language model conformance gate.

## 6. Estimate (complexity)

| Phase | Points |
|-------|--------|
| P1 — Python end-to-end | 5 |
| P2 — JS end-to-end | 3 |
| P3 — Cross-language parity gate | 2 |
| P4 — Unify conformance serializer | 2 |
| P5 — Docs (format doc + spec set) | 3 |
| **Total** | **15** |

**Progress:** P1+P2+P3+P4+P5 (2026-05-24) = **15 / 15 pts — feature complete.**

## 7. Change requests

Changes to the baselined spec (`docs/specs/kymo-syntax/modules/json/`) are raised, assessed, and logged in
[`CR/`](CR/) (raise → assess → approve → implement → re-baseline). None raised
yet — see [`CR/README.md`](CR/README.md).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — records the `.kymo.json` feature (P1–P5) complete, cross-language byte parity incl. `layout_trees`. |
| 1.1     | 2026-05-25 | Vũ Anh | **Doc reorganization.** Added §7 Change-requests (`CR/`). |
| 1.2     | 2026-06-12 | Vũ Anh | **Relocated** into `docs/specs/kymo-syntax/modules/json/` (the kymo-syntax umbrella's json module). Annex B.1 path updated. No plan content changed. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-syntax/modules/json/04-PLAN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On phase completion or scope change: update the affected clause + phase row; keep
requirement IDs and the TST traceability matrix consistent; increment `version`;
append a row to Annex A (document edits) and Annex C (implementation worklog).

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-KYMOJSON-001,
DESIGN-KYMOJSON-001, and KYMOJSON-MAP-001. Reconcile any deviation there before release.

## Annex C — Worklog

**Table C.1 — Implementation worklog.** Per-phase work as it happened — distinct from
Annex A (edits to this document). Newest at the bottom; dates ISO 8601.

| Date       | Phase | Work | Outcome / artifacts |
|------------|-------|------|---------------------|
| 2026-05-24 | P1 — Python | `src/kymo/to_kymojson.py` (`export` + `model_dict`, incl. `layout_trees`) + `from_kymojson.py` (`parse`, array→tuple coercion, native layout-tree rebuild); CLI `--json` output + `.json` load branch (skips layout/align); `tests/test_kymojson.py` (round-trip fixpoint + render-equivalence + envelope + layout-tree preservation + foreign-JSON reject). | **Done** — full Python suite **649 passed**; CLI `aiq.kymo --json` → load → render byte-identical to direct render; ruff clean. |
| 2026-05-24 | P2 — JS | `src/to-kymojson.ts` (`toKymoJson`/`modelDict`) + `from-kymojson.ts` (`parseKymoJson`), layout-node canonical form ↔ `LayoutNode`; exported from `index.ts`; `tests/kymojson.test.js` mirroring the Python tests. | **Done** — typecheck + lint clean; **`npm test` 397 (0 fail)**; JS load-fixpoint + render-equivalence hold. |
| 2026-05-24 | P3 — Parity gate | Dumped Python `export` and JS `toKymoJson` for all 31 `.kymo` corpus files and diffed. | **Done** — **all 31 byte-identical, `layout_trees` included** → the Python↔JS layout-tree gap is closed with **zero** divergence; cross-load interop follows from byte-identity. |
| 2026-05-24 | P4 — Conformance unify | Pointed `tests/_conformance.py` (`model_dict`) and `_conformance.mjs` (`modelDict`) at the promoted serializer (removed the in-test copies); regenerated `.model.json` + `bpmn_import.json` goldens (now carry `layout_trees`). | **Done** — Python conformance **275 passed**, JS conformance **274 passed / 0 fail**; full suites green; layout-tree parity now permanently gated. |
| 2026-05-24 | P5 — Docs | `docs/formats/kymo.json.md` (`KYMOJSON-MAP-001`) + this spec set (`*-KYMOJSON-001`) + back-references from `KYMO-DSL-001` and `BPMN-MAP-001`. | **Done** — doc set Released; citations resolve. |

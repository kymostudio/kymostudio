---
title: Interactive Canvas Editor — Tests, V&V & Traceability
document_id: TEST-CANVAS-001
version: "0.1"
issue_date: 2026-05-23
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers verifying & validating the canvas editor
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-CANVAS-001
  - FEAT-CANVAS-001
  - PLAN-CANVAS-001
  - DESIGN-CANVAS-001
  - DSL-LANG-001
authors:
  - Vũ Anh
language: en
keywords:
  - test-plan
  - verification
  - validation
  - traceability
  - iso-29119
  - canvas-editor
  - quality-assurance
---

# Interactive Canvas Editor — Tests, V&V & Traceability

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | TEST-CANVAS-001                                                 |
| Version           | 0.1                                                              |
| Issue Date        | 2026-05-23                                                       |
| Status            | Draft                                                           |
| Classification    | Internal                                                        |
| Owner             | `diagrams/` project                                             |
| Audience          | Engineers verifying & validating the editor                     |
| Related Documents | `FEAT-CANVAS-001` (requirements), `DESIGN-CANVAS-001` (design), `PLAN-CANVAS-001` (plan), `DSL-LANG-001` |

> Covers ISO/IEC/IEEE 12207 **Verification** (§6.4.9), **Validation** (§6.4.11), **Quality
> Assurance** (§6.3.8), and the requirement **traceability** (§6.3.6) — the matrix is merged in (§5).
> Test structure references **ISO/IEC/IEEE 29119**. Every `FR-CE`/`NFR-CE` in `FEAT-CANVAS-001` must
> map to ≥ 1 test case here (coverage gate).

---

## 1. Scope

Verification & validation for the interactive canvas editor. **Verification** = building it right
(unit / integration / regression against the design). **Validation** = building the right thing (e2e
against the acceptance criteria in `FEAT-CANVAS-001`).

## 2. Test approach

- **Unit** — pure functions: the serializer (`shapesToDsl`), `diagramToShapes`, and the additive
  parser source-spans (`DESIGN-CANVAS-001` §8–§9). Run under `node --test` in `packages/js` / the app.
- **Integration** — the sync engine wiring (`useKymoSync`): debounce, incremental diff, loop guard
  (`DESIGN-CANVAS-001` §7).
- **End-to-end (validation)** — drive the served app through the chrome-anhv MCP (as in prior
  sessions): load samples, edit text, drag nodes, drop freeform shapes, export, share.
- **Regression** — `cd packages/js && npm test`; if `dsl.ts` is touched for spans, also run the
  Python golden suite (`KYMO_UPDATE_GOLDEN` only on *intentional* render changes) per `CLAUDE.md`.

## 3. Environment & tooling

- Local static serve: `python3 -m http.server --directory website 8000` → `http://localhost:8000/app/`.
- Browser automation: chrome-anhv MCP (screenshot, evaluate, click).
- Build: `website/app/build.sh` (esbuild) producing the committed bundle.

## 4. Test cases

| ID | Level | Verifies | Design § | Steps → Expected |
|----|-------|----------|----------|------------------|
| TC-01 | Unit | FR-CE-05 | §8.1 | `parseDiagram(shapesToDsl(diagramToShapes(d)))` reproduces `d`'s ids + rounded positions (idempotent `A→text→A`). |
| TC-02 | Unit | FR-CE-06 | §8.2, §9 | Move one node, Tier-2 patch → only that leaf's `@ …` token changes; comments + untouched lines byte-identical. |
| TC-03 | Integration | FR-CE-01, NFR-CE-01 | §7, §12 | Edit text → canvas updates within one debounce (~220 ms) via create/update/delete **diff** (not full recreate); parse error keeps last good render. |
| TC-04 | Integration | FR-CE-02 | §7, §8 | Drag/rename a kymo shape → `.kymo` text updates; re-parse reflects the change. |
| TC-05 | Integration | NFR-CE-03 | §7 | A programmatic `diagramToShapes` apply does **not** fire a canvas→text write (no A→B→A); stale async parse is dropped by epoch. |
| TC-06 | E2E | FR-CE-03, FR-CE-04, NFR-CE-07 | §3, §5, §11 | Drop a sticky note + freehand stroke; assert they render, persist on reload, and are **absent** from the `.kymo` text; kymo shapes carry `meta.kymo`. |
| TC-07 | E2E | FR-CE-07 | §3, §11 | Open a link from the *current* playground → loads; create a new `?script=` link → round-trips the `.kymo`. |
| TC-08 | E2E | FR-CE-08 | §3 | Select each built-in sample → loads into editor and renders. |
| TC-09 | E2E | FR-CE-09 | §3 | Export → a standalone SVG downloads and opens. |
| TC-10 | E2E | FR-CE-10 | §3 | Load a `.bpmn` file → parses and renders as before. |
| TC-11 | Unit | NFR-CE-05 | §6 | Render a diagram using only built-in icons with the network blocked → all glyphs resolve (offline). |
| TC-12 | Regression/CI | NFR-CE-02 | §10 | `build.sh` regenerates a committed `kymo.bundle.js`; the Pages workflow uploads `website/` with **no build step**; static serve works. |
| TC-13 | Non-functional | NFR-CE-06 | §10 | Measure committed bundle size ≤ budget (~3 MB); flag regressions in the diff. |
| TC-14 | Review (static) | NFR-CE-04 | §8 | Code review confirms all DSL-emitting logic lives in one module (re-targetable for v3). |
| TC-15 | Regression | FR-CE-06 (support) | §9 | After the additive parser source-span change, JS `npm test` + Python golden suite pass unchanged (no rendered-byte drift). |

## 5. Traceability matrix

Every requirement maps to ≥ 1 test case (no orphans).

| Requirement | Covered by |
|-------------|-----------|
| FR-CE-01 | TC-03 |
| FR-CE-02 | TC-04 |
| FR-CE-03 | TC-06 |
| FR-CE-04 | TC-06 |
| FR-CE-05 | TC-01 |
| FR-CE-06 | TC-02, TC-15 |
| FR-CE-07 | TC-07 |
| FR-CE-08 | TC-08 |
| FR-CE-09 | TC-09 |
| FR-CE-10 | TC-10 |
| NFR-CE-01 | TC-03 |
| NFR-CE-02 | TC-12 |
| NFR-CE-03 | TC-05 |
| NFR-CE-04 | TC-14 |
| NFR-CE-05 | TC-11 |
| NFR-CE-06 | TC-13 |
| NFR-CE-07 | TC-06 |

**Coverage gate:** any requirement added to `FEAT-CANVAS-001` without a row here is a defect.

## 6. Entry / exit criteria

- **Entry** — the requirement(s) under test are `Approved` in `FEAT-CANVAS-001`; the relevant phase's
  design (`DESIGN-CANVAS-001`) is implemented.
- **Exit (per phase)** — all test cases tracing to that phase's requirements pass; regression
  (`npm test` + goldens) is green; no open Sev-1 defects. Phase→requirement mapping per
  `PLAN-CANVAS-001` §4–§5.

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                   |
|---------|------------|--------|-------------------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial V&V plan + traceability matrix.   |

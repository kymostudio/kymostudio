---
title: BPMN Editor — Tests, V&V & Traceability
document_id: TEST-BPMN-EDITOR-001
version: "0.1"
issue_date: 2026-05-31
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers verifying & validating the BPMN editor
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-001
  - FEAT-BPMN-EDITOR-001
  - DESIGN-BPMN-EDITOR-001
  - PLAN-BPMN-EDITOR-001
  - FEAT-BPMN-PARSER-001
  - FEAT-BPMN-EXPORT-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - test-plan
  - verification
  - validation
  - traceability
  - iso-29119
  - bpmn-editor
  - playwright
  - quality-assurance
---

# BPMN Editor — Tests, V&V & Traceability

| Field             | Value |
|-------------------|-------|
| Document ID       | `TEST-BPMN-EDITOR-001` |
| Version           | 0.1 |
| Issue Date        | 2026-05-31 |
| Status            | Draft |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Audience          | Engineers verifying & validating the editor |
| Related Documents | `FEAT-BPMN-EDITOR-001` (requirements), `DESIGN-BPMN-EDITOR-001` (design), `PLAN-BPMN-EDITOR-001` (plan), `BPMN-MAP-001` |

> Covers ISO/IEC/IEEE 12207 **Verification** (§6.4.9), **Validation** (§6.4.11), **Quality Assurance**
> (§6.3.8), and requirement **traceability** (§6.3.6) — the matrix is merged in (§5). Test structure
> references **ISO/IEC/IEEE 29119**. Every `FR-BE`/`NFR-BE` in `FEAT-BPMN-EDITOR-001` must map to ≥ 1
> test case here (coverage gate).

---

## 1. Scope

V&V for the interactive BPMN editor. **Verification** = building it right (unit/integration against
the design). **Validation** = building the right thing (e2e against the `FEAT-BPMN-EDITOR-001`
acceptance criteria). Because the editor composes already-tested layers, the focus is the
**interaction layer** (palette, placement, context pad, file I/O) and **round-trip integrity** — not
re-testing `parseBpmn`/`toBpmn`, which their own suites cover.

## 2. Test approach

- **Unit** — pure helpers in `bpmn-tools.ts` / `bpmn-ops.ts`: type→default-geometry lookup, flow-type
  selection by endpoint types, morph target enumeration (all keyed to `BPMN-MAP-001`).
- **Integration** — placement/connect/morph dispatch against the `Editor` facade (a single shape op
  per action; one history step per edit).
- **End-to-end (validation)** — Playwright (`website/app` already has a `test:e2e` harness; CI gate
  "E2E (engine render guard)"). Drive the served app: select palette tools, place elements, connect
  flows, use the context pad, double-click-edit, open/new/export. Use **`data-testid`** selectors and
  **trusted events** (native focus/hit-test) per the engine-UI E2E conventions.
- **Regression** — `cd packages/js && npm test`; the BPMN corpus baseline (`test_bpmn_corpus.py`) and
  the byte-for-byte golden SVGs must stay green (the editor changes no renderer, so they must not
  drift).

## 3. Environment & tooling

- Local static serve (Node): `npx http-server website -p 8000 -c-1` → `http://localhost:8000/app/`.
  Hard-reload after a rebuild — the bundle has no cache-buster.
- E2E: Playwright (`npm run test:e2e` in `website/app`).
- Build: `website/app/build.sh` (esbuild) producing the committed bundle.

## 4. Test cases

| ID | Level | Verifies | Design § | Steps → Expected |
|----|-------|----------|----------|------------------|
| TC-01 | E2E | FR-BE-01, FR-BE-03 | §3, §4 | Activate each palette creator → click canvas → the mapped `bpmn-*` shape is created at the click point with the `BPMN-MAP-001` default size (event 36×36, task 100×80, gateway 50×50). |
| TC-02 | Integration | FR-BE-02 | §3 | Activate hand/lasso/global-connect → each delegates to the engine primitive (pan, marquee-select, connect) with no BPMN-specific regression. |
| TC-03 | E2E | FR-BE-04 | §4, §6 | In connect mode, drag from a task to an event → a sequence-flow `Edge` is created, endpoints bound to both; an association is created to a text annotation. |
| TC-04 | E2E | FR-BE-05 | §5, §6 | Select an element → context pad shows append/annotation/connect/delete; "append task" creates a task **and** a connecting flow in one action. |
| TC-05 | Integration | FR-BE-06 | §5 | Morph exclusive→parallel gateway (and task→user-task) → marker/glyph updates per `BPMN-MAP-001`; id, position, and connected flows preserved. |
| TC-06 | E2E | FR-BE-07 | §5, §7 | Double-click a node and a flow → in-place editor opens; commit updates `name`/`label`; the change appears on re-render and in export. |
| TC-07 | E2E | FR-BE-08 | §6, §7 | Move a node → connected flows follow; multi-select moves a group; each place/morph/label/move/delete is a single undo step and redo restores it. |
| TC-08 | E2E | FR-BE-09 | §8 | Open a `.bpmn` via the file picker **and** via drag-drop → it parses and renders as editable shapes (matches `parseBpmn`). |
| TC-09 | E2E | FR-BE-10 | §8 | "New diagram" → canvas clears to a single start event, ready to model. |
| TC-10 | E2E | FR-BE-11, NFR-BE-03 | §8 | Export `.bpmn` → re-open the downloaded file → an **equivalent** diagram (round-trip, ±1px DI); export `.svg` → a standalone SVG opens. |
| TC-11 | Integration | NFR-BE-01 | §4, §5 | Place / move / morph / label each emit a **single** engine shape op (create/update/delete), never a full canvas rebuild. |
| TC-12 | Regression/CI | NFR-BE-02, NFR-BE-05 | §10 | `build.sh` regenerates the committed bundle; Pages uploads `website/` with **no build step**; bundle size within budget. |
| TC-13 | Review (static) | NFR-BE-04 | §11 | Code review confirms all BPMN tooling lives in the dedicated modules and that `packages/js-canvas`, the `bpmn-*` renderers, and `parseBpmn`/`toBpmn` are unchanged. |
| TC-14 | Regression | NFR-BE-04 (support) | §11 | `packages/js` `npm test`, the Python golden SVGs, and the BPMN corpus baseline (`test_bpmn_corpus.py`) all pass unchanged (no rendered-byte drift). |

## 5. Traceability matrix

Every requirement maps to ≥ 1 test case (no orphans).

| Requirement | Covered by |
|-------------|-----------|
| FR-BE-01 | TC-01 |
| FR-BE-02 | TC-02 |
| FR-BE-03 | TC-01 |
| FR-BE-04 | TC-03 |
| FR-BE-05 | TC-04 |
| FR-BE-06 | TC-05 |
| FR-BE-07 | TC-06 |
| FR-BE-08 | TC-07 |
| FR-BE-09 | TC-08 |
| FR-BE-10 | TC-09 |
| FR-BE-11 | TC-10 |
| FR-BE-12 | TC-01 (zoom/fit via status bar), TC-02 |
| NFR-BE-01 | TC-11 |
| NFR-BE-02 | TC-12 |
| NFR-BE-03 | TC-10 |
| NFR-BE-04 | TC-13, TC-14 |
| NFR-BE-05 | TC-12 |

**Coverage gate:** any requirement added to `FEAT-BPMN-EDITOR-001` without a row here is a defect.

## 6. Entry / exit criteria

- **Entry** — the requirement(s) under test are `Approved` in `FEAT-BPMN-EDITOR-001`; the relevant
  phase's design (`DESIGN-BPMN-EDITOR-001`) is implemented.
- **Exit (per phase)** — all test cases tracing to that phase's requirements pass; regression
  (`packages/js` `npm test` + Python goldens + BPMN corpus baseline) is green; the engine render-guard
  E2E gate is green; no open Sev-1 defects. Phase→requirement mapping per `PLAN-BPMN-EDITOR-001`.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Initial V&V plan + traceability matrix. `TC-01..14` cover `FR-BE-01..12` + `NFR-BE-01..05`; E2E via Playwright (`data-testid`, trusted events); regression asserts goldens + BPMN corpus baseline stay byte-stable (no renderer change). |

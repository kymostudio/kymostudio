---
title: In-House Canvas Engine — Verification & Validation
document_id: TEST-ENGINE-001
version: "0.2"
issue_date: 2026-05-23
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers verifying engine parity; reviewers
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-ENGINE-001
  - FEAT-ENGINE-001
  - DESIGN-ENGINE-001
  - PLAN-ENGINE-001
  - TEST-FIGJAM-001
  - TEST-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - verification
  - validation
  - iso-29119
  - test-cases
  - traceability
  - parity
  - canvas-engine
---

# In-House Canvas Engine — Verification & Validation

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | TEST-ENGINE-001                                                  |
| Version           | 0.2                                                              |
| Status            | Draft                                                            |
| Owner             | `diagrams/` project                                            |
| Related Documents | `FEAT-ENGINE-001` (requirements), `DESIGN-ENGINE-001` (design), `TEST-FIGJAM-001` (sibling — full parity re-run + perf/bundle), `TEST-CANVAS-001` (the editor V&V re-run against the engine) |

> V&V per **ISO/IEC/IEEE 29119**. Test cases **`TC-EN-NN`**. The engine's headline acceptance is
> **"`TEST-CANVAS-001` passes unchanged against the engine"** — this document adds the engine-internal
> tests (store, geometry, persistence) that tldraw never needed because it owned them.

---

## 1. Strategy

Three rings, cheapest first:

1. **Unit (`node --test`, like `packages/js`)** — pure engine logic: store mutations, source/history
   tagging, geometry hit-test, `zoomToFit` math, persistence round-trip, `T` validators. No DOM.
2. **Integration (jsdom or a thin harness)** — Editor facade ↔ store ↔ a fake ShapeUtil; the
   loop-guard guarantee (programmatic apply → no `source:"user"` echo).
3. **E2E (chrome MCP, as in `PLAN-CANVAS-001` worklog)** — the served app on the engine: render, drag
   → `.kymo` patch, freeform no-leak, persistence reload, undo, **public-domain render with no key**.

The **regression bar**: `cd packages/js && npm test` stays green (the engine does not touch
`packages/js`), and the canvas-editor E2E suite (`TEST-CANVAS-001`) reproduces on the engine.

## 2. Engine-internal test cases (`TC-EN`)

| TC | Requirement | Ring | Assertion |
|----|-------------|------|-----------|
| **TC-EN-01** | FR-EN-01 | unit | `createShapes`/`updateShape`/`deleteShapes` then `getCurrentPageShapes` returns the expected set in `index` order; `getShape(id)` round-trips. |
| **TC-EN-02** | FR-EN-02, NFR-EN-05 | integ | A write inside `run(fn,{history:"ignore"})` (programmatic) fires **zero** `{scope:"document",source:"user"}` callbacks; a tool-originated move fires **exactly one**. *(The `RK-05`/`RK-EN-01` guarantee.)* |
| **TC-EN-03** | FR-EN-02 | unit | `store.listen` honours `scope` and `source` filters independently; unsubscribe stops delivery. |
| **TC-EN-04** | FR-EN-02 | unit | Writes carry a history flag: `{history:"ignore"}` writes are **tagged non-undoable** (excluded from the recorded history log); default writes are tagged recordable. *(The user-facing undo/redo stack & restoration is `TC-FJ-` in `TEST-FIGJAM-001`.)* |
| **TC-EN-05** | FR-EN-03 | unit | A `ShapeUtil` subclass: `getDefaultProps` fills missing props on create; `T.number`/`T.string` reject mismatched props (dev mode). |
| **TC-EN-06** | FR-EN-03, FR-EN-04 | unit | `Rectangle2d.hitTestPoint` — filled rect: inside hits, outside misses; edge margin honoured. |
| **TC-EN-07** | FR-EN-01 | unit | `zoomToFit` centres + fits the union of two disjoint shapes within padding; idempotent on re-call. |
| **TC-EN-08** | FR-EN-07 | unit | Persist → reload hydrates identical shapes + camera; freeform shapes verbatim; `schemaVersion` mismatch drops snapshot safely. |
| **TC-EN-09** | FR-EN-08 | integ | `useValue(name, compute, deps)` recomputes when a read atom changes and **not** otherwise. |

> **Deferred to `TEST-FIGJAM-001`** (re-id `TC-FJ-`): `TC-EN-10` board export (ex-`FR-EN-11`),
> `TC-EN-11` `kymo-region`/`kymo-edge` props (ex-`FR-EN-06`), and the user-facing undo/redo
> restoration (ex-`FR-EN-10`).

## 3. Parity test cases (re-run of `TEST-CANVAS-001` on the engine)

These are **not** new behaviour — they assert the engine reproduces `FEAT-CANVAS-001`. This feature
re-runs the **core subset** at the key-free flip (Phase 7); the **full** `TC-01..19` green on the
engine — including undo (`TC-18`) — is the sibling's headline acceptance (`TEST-FIGJAM-001`).

| TC (canvas-editor) | What it proves on the engine |
|--------------------|------------------------------|
| `TC` for FR-CE-02/06 (round-trip) | Drag a `kymo-node` → `.kymo` text patched (`@ (x,y)` / lift from frame); `parseDiagram` reproduces the moved position. |
| `TC` for FR-CE-03 (two-layer) | Freeform shape (`meta.kymo == null`) never leaks into `.kymo`; only `meta.kymo` shapes sync. |
| `TC-16` (layout) | `#root` full-height; panes don't collapse (independent of engine, but re-confirm post-swap). |
| `TC-17` (persistence) | Freeform geo persists across reload; kymo shapes reconcile by id, 0 duplicates. |
| `TC-19` (embed robustness) | BPMN embed (`KymoDiagramShape` `<img>` data-URL) survives cull/remount with no flash (`RK-07`, preserved by §8.2). |

> **Deferred to `TEST-FIGJAM-001`:** `TC-18` (undo restores origin **and** round-trips text — needs
> the undo stack, ex-`FR-EN-10`) and the assertion that the **full** `TC-01..19` suite passes green
> on the engine with tldraw removed.

## 4. Non-functional verification

| NFR | Method |
|-----|--------|
| **NFR-EN-03** (no key) | E2E on the **public domain** (`kymostudio.github.io`): board renders, **no watermark**, no "license required" console error. **This is the `RK-02` render-level closure check.** |
| **NFR-EN-04** (seam) | `grep -r '"tldraw"' website/app/src` matches **only** inside `engine/` (the adapter re-export); `Board`/shapes/`Inspector`/`diagramToShapes` import only the adapter; their git diff is import-path + the dropped `tlschema` augmentation only. |
| **NFR-EN-05** (loop-safe) | Covered by `TC-EN-02`. |
| **NFR-EN-06** (deploy) | `build.sh` produces a committed bundle; served statically with zero runtime fetch (DevTools network tab clean of CDN). |

> **Deferred to `TEST-FIGJAM-001`:** `NFR-EN-01` (60 fps profile) and `NFR-EN-02` (bundle
> measurement before/after tldraw removal) — both meaningful only once the sibling removes tldraw.

## 5. Traceability matrix

Every requirement → ≥ 1 covering test (the `FEAT-ENGINE-001` invariant).

| Requirement | Covering test(s) |
|-------------|------------------|
| FR-EN-01 | TC-EN-01, TC-EN-07 |
| FR-EN-02 | TC-EN-02, TC-EN-03, TC-EN-04 |
| FR-EN-03 | TC-EN-05, TC-EN-06 |
| FR-EN-04 | TC-EN-06; parity (render) |
| FR-EN-05 | parity round-trip (drag); E2E |
| FR-EN-07 | TC-EN-08; `TC-17` |
| FR-EN-08 | TC-EN-09; E2E mount |
| FR-EN-09 | compile-time (NFR-EN-04 grep) + TC-EN-01 |
| FR-EN-12 | NFR-EN-06 method |
| NFR-EN-03..06 | §4 |

> `FR-EN-06/10/11` and `NFR-EN-01/02` are re-homed and traced in `TEST-FIGJAM-001` (as `FR-FJ-`/`NFR-FJ-`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial V&V: engine-internal `TC-EN-01..11`, the `TEST-CANVAS-001` parity re-run, NFR methods (incl. the `RK-02` public-render closure check), and the traceability matrix. |
| 0.2     | 2026-05-24 | Vũ Anh | **Feature split.** Kept `TC-EN-01..09` + the core parity subset + `NFR-EN-03..06`; re-scoped `TC-EN-04` to store history-*tagging* (was undo); moved `TC-EN-10/11`, `TC-18` (undo), the full-suite-green acceptance, and `NFR-EN-01/02` verification to `TEST-FIGJAM-001`. |

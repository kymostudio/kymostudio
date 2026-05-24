---
title: Canvas Jam — Verification & Validation
document_id: TEST-JAM-001
version: "0.1"
issue_date: 2026-05-24
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers verifying engine completion + freeform tools; reviewers
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-JAM-001
  - FEAT-JAM-001
  - DESIGN-JAM-001
  - PLAN-JAM-001
  - TEST-ENGINE-001
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
  - canvas-jam
---

# Canvas Jam — Verification & Validation

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | TEST-JAM-001                                                |
| Version           | 0.1                                                            |
| Status            | Draft                                                          |
| Owner             | `diagrams/` project                                           |
| Related Documents | `FEAT-JAM-001` (requirements), `DESIGN-JAM-001` (design), `TEST-ENGINE-001` (the core V&V this extends), `TEST-CANVAS-001` (the full editor V&V, re-run with tldraw removed) |

> V&V per **ISO/IEC/IEEE 29119**. Test cases **`TC-J-NN`**. This document **extends** the engine's
> V&V (`TEST-ENGINE-001`) with the completion + freeform cases, and owns the **headline acceptance**:
> the **full** `TEST-CANVAS-001` (`TC-01..19`) passes green on the engine **with tldraw removed**.

---

## 1. Strategy

Reuses the three rings from `TEST-ENGINE-001` (unit `node --test`, integration jsdom, E2E chrome MCP)
and the same regression bar (`cd packages/js && npm test` stays green). New surface to cover:

1. **Unit** — built-in `kymo-region`/`kymo-edge` props; undo/redo stack; export aggregation; freeform
   shape geometry.
2. **Integration** — undo restores a record *and* the `source:"user"` listener re-fires the writeback;
   freeform tool create → store.
3. **E2E** — draw/sticky/text authoring on the served app; **the full `TC-01..19` suite green with
   tldraw removed**; bundle/perf measurement.

## 2. Feature test cases (`TC-J`)

| TC | Requirement | Ring | Assertion |
|----|-------------|------|-----------|
| **TC-J-01** | FR-J-01 | unit | `kymo-region`/`kymo-edge` render from the exact props `diagramToShapes` sets; `meta.kymo` survives a create→update→read cycle. *(⊇ ex-`TC-EN-11`.)* |
| **TC-J-02** | FR-J-02 | unit | A default write pushes one undo entry; `{history:"ignore"}` writes are absent from the stack; `undo()` restores the exact prior record, `redo()` re-applies. |
| **TC-J-03** | FR-J-03 | unit | Board export calls each util's `toSvg` in `index` order and wraps them in one `<svg>` sized to the fit bounds. *(⊇ ex-`TC-EN-10`.)* |
| **TC-J-04** | FR-J-04 | E2E | After the removal commit, `grep -r '"tldraw"' website/app/src` → **0**; the public board renders with no key/watermark; bundle no longer contains tldraw. |
| **TC-J-05** | FR-J-05 | E2E | The draw tool creates a `freedraw` stroke on pointer-drag; it is `meta.kymo == null`, persists across reload, and never appears in `.kymo`. |
| **TC-J-06** | FR-J-06 | E2E | The sticky tool places a `note`; its text is editable; persists; absent from `.kymo`. |
| **TC-J-07** | FR-J-07 | E2E | The text tool places an editable `text` shape; persists; absent from `.kymo`. |

## 3. Full parity re-run (`TEST-CANVAS-001` on the engine, tldraw removed)

The headline acceptance — execute **every** canvas-editor case against the tldraw-free engine build:

| TC (canvas-editor) | What it proves on the engine |
|--------------------|------------------------------|
| `TC` for FR-CE-02/06 (round-trip) | Drag a `kymo-node` → `.kymo` patched; reproduces the moved position. |
| `TC` for FR-CE-03 (two-layer) | Freeform shapes (incl. the new draw/sticky/text) never leak into `.kymo`. |
| `TC-16` (layout) | `#root` full-height; panes don't collapse. |
| `TC-17` (persistence) | Freeform geo + kymo shapes persist/reconcile across reload, 0 duplicates. |
| `TC-18` (undo) | Undo a node move returns it to origin **and** the text round-trips (`FR-J-02`). |
| `TC-19` (embed robustness) | BPMN embed `<img>` survives cull/remount with no flash (`RK-07`). |

**Gate:** all of `TC-01..19` green **before** the tldraw-removal commit (`FR-J-04`).

## 4. Non-functional verification

| NFR | Method |
|-----|--------|
| **NFR-J-01** (60 fps) | Profile pan/zoom/drag on the AIQ sample (19 nodes / 4 regions / 20 arrows); record frame time; cull on/off comparison. |
| **NFR-J-02** (bundle) | `ls -la website/app/kymo.bundle.js` + gzip before/after tldraw removal; assert materially below 2.0 MB / ≈586 KB-gzip; engine ≤ ~50 KB gzip target. |

> Inherited checks still apply (`TEST-ENGINE-001` §4): `NFR-EN-04` (adapter seam) — now `grep
> '"tldraw"'` → **0** everywhere; `NFR-EN-06` (committed bundle, no CI build).

## 5. Traceability matrix

Every requirement → ≥ 1 covering test (the `FEAT-JAM-001` invariant).

| Requirement | Covering test(s) |
|-------------|------------------|
| FR-J-01 | TC-J-01 |
| FR-J-02 | TC-J-02; `TC-18` |
| FR-J-03 | TC-J-03 |
| FR-J-04 | TC-J-04; full `TC-01..19` (§3) |
| FR-J-05 | TC-J-05 |
| FR-J-06 | TC-J-06 |
| FR-J-07 | TC-J-07 |
| NFR-J-01..02 | §4 |

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial V&V: `TC-J-01..07` (consolidation, undo, export, tldraw-removal, draw/sticky/text), the full `TEST-CANVAS-001` parity re-run with tldraw removed (§3), NFR perf/bundle methods (ex-`TEST-ENGINE-001` §4), traceability. |

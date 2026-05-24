---
title: Canvas Jam — Feature & Requirements (SRS)
document_id: FEAT-JAM-001
version: "0.1"
issue_date: 2026-05-24
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the engine completion + freeform tools; reviewers
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-JAM-001
  - DESIGN-JAM-001
  - TEST-JAM-001
  - PLAN-JAM-001
  - FEAT-ENGINE-001
  - FEAT-CANVAS-001
  - DESIGN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - srs
  - iso-29148
  - canvas-jam
  - freeform-authoring
  - tldraw-removal
  - acceptance-criteria
---

# Canvas Jam — Feature & Requirements (SRS)

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | FEAT-JAM-001                                                 |
| Version           | 0.1                                                             |
| Status            | Draft                                                           |
| Owner             | `diagrams/` project                                            |
| Related Documents | `DESIGN-JAM-001` (how), `TEST-JAM-001` (V&V), `FEAT-ENGINE-001` (sibling — the render core), `FEAT-CANVAS-001` (the editor on top) |

> Requirements per **ISO/IEC/IEEE 29148**. IDs: functional **`FR-J-NN`**, non-functional
> **`NFR-J-NN`**. This feature **completes** the in-house engine begun in `FEAT-ENGINE-001` and adds
> the freeform-authoring tools. Its **entry gate** is the sibling's Phase 7 (the key-free board). This
> document owns the `FR-J`/`NFR-J` IDs; `PLAN-JAM-001` never re-defines them.

---

## 1. Stakeholder needs (ISO 29148 §6.4.2)

| ID | Need |
|----|------|
| SN-1 | The project must depend on **no tldraw code at all** — no license key, no watermark, no `@tldraw/assets`, nothing in `package.json` (finishes `RK-02`). |
| SN-2 | The canvas-editor's **full** behaviour (`FEAT-CANVAS-001`, `TC-01..19` incl. undo and export) must be **preserved** once tldraw is gone — zero regression. |
| SN-3 | The committed `kymo.bundle.js` should **shrink** materially from the ~2.0 MB tldraw baseline. |
| SN-4 | Users must be able to **author freeform content** (draw, sticky notes, text) on the board — the FigJam half — without tldraw. |

## 2. Re-homed requirements (from `FEAT-ENGINE-001`)

The feature split moved these requirements here; the old IDs are **retired** in `FEAT-ENGINE-001`.

| New ID | ⊇ former (engine) | Subject |
|--------|-------------------|---------|
| `FR-J-01` | `FR-EN-06` | Built-in shape consolidation (`kymo-region`/`kymo-edge`) |
| `FR-J-02` | `FR-EN-10` | Undo/redo (history stack) |
| `FR-J-03` | `FR-EN-11` | Board export (`toSvg` aggregation) |
| `NFR-J-01` | `NFR-EN-01` | Performance (~60 fps) |
| `NFR-J-02` | `NFR-EN-02` | Footprint / bundle shrink |

The engine's store already **tags** writes recordable/ignored (`FR-EN-02`, `DESIGN-ENGINE-001` §5.3);
`FR-J-02` builds the user-facing undo/redo stack on top of those tags.

## 3. Functional requirements (`FR-J`)

| ID | Requirement | Source need | Phase |
|----|-------------|-------------|-------|
| **FR-J-01** | The engine SHALL **consolidate the built-in shapes** to two tiny custom shapes **`kymo-region`** / **`kymo-edge`** carrying only the props kymo sets, rendered by the engine's own `ShapeUtil`s. *As implemented (engine-only split):* the shared `diagramToShapes.ts` keeps emitting tldraw `geo`/`arrow` (the live `?engine=tldraw` path needs them); a thin `engine/diagramToShapesEngine.ts` reuses it and remaps to `kymo-region`/`kymo-edge` — so re-pointing doesn't break the tldraw board. The `patchDsl` round-trip is unaffected (it reads `meta.kymo`, not the shape type). | SN-1 | P1 |
| **FR-J-02** | The engine SHALL provide **undo/redo** across the document, consuming the store's history tags: `{history:"ignore"}` writes are excluded; a default write pushes one undo entry; undo restores the exact prior record (incl. node `x/y`) and `Board`'s writeback re-patches the `.kymo` text. | SN-2 | P2 |
| **FR-J-03** | The engine SHALL provide a **board export** that walks shapes in `index` order, aggregates each util's `toSvg()` (or a `component()` raster fallback) into one `<svg>` sized to the fit bounds, and offers SVG/PNG download. | SN-2 | P3 |
| **FR-J-04** | The build SHALL **remove tldraw entirely**. *As built (P3):* dropped the `tldraw` dep; deleted `Board.tsx`/`KymoNodeShape.tsx`/`KymoDiagramShape.tsx`/`engine/adapter.ts` + the `@tldraw/tlschema` augmentations + the `?engine=tldraw` switch; removed the (now-empty) `kymo.bundle.css` link from `index.html`. **`grep -r '"tldraw"' website/app/src` → 0**; bundle 2.09 MB → 399 KB raw (107 KB gzip). `TEST-CANVAS-001` `TC-01..05/07..19` pass green on the engine; **`TC-06`'s freeform clause is deferred to P5–7** (no freeform tools yet — the `meta.kymo`-exclusion invariant + reserved `persist.freeform` are in place). | SN-1, SN-2 | P3 |
| **FR-J-05** | The engine SHALL provide a **draw/pen tool**: a freehand tool that creates a freeform stroke shape (`meta.kymo == null`) on pointer-drag, with the tool state machine (`engine/tools`) that activates/deactivates it. | SN-4 | P5 |
| **FR-J-06** | The engine SHALL provide a **sticky-note tool**: click-to-place a resizable sticky shape with an editable plain-text label. | SN-4 | P6 |
| **FR-J-07** | The engine SHALL provide a **text tool**: click-to-place an editable plain-text shape. | SN-4 | P7 |

> Freeform shapes (`FR-J-05..07`) are always **freeform-layer** (`meta.kymo == null`) and MUST never
> serialise into `.kymo` (`NFR-CE-07`, `FR-CE-03`) — they persist via `engine/persist` only.

## 4. Non-functional requirements (`NFR-J`)

| ID | Attribute (ISO 25010) | Requirement |
|----|-----------------------|-------------|
| **NFR-J-01** | Performance efficiency | Pan/zoom and drag SHALL stay smooth (~60 fps) for the reference workload (**AIQ sample: 19 nodes / 4 regions / 20 arrows**); off-screen shapes MAY be culled. |
| **NFR-J-02** | Portability / footprint | With tldraw removed, the committed bundle MUST be **well under the 2.0 MB / ≈586 KB-gzip** tldraw baseline; the engine itself SHOULD be ≤ ~50 KB gzip. |

> Inherited and still binding from the sibling: **`NFR-EN-04`** (single adapter seam — call sites
> import only `engine/adapter`) and **`NFR-EN-06`** (committed bundle, no CI build).

## 5. Scope

**In scope (this feature):** built-in shape consolidation, undo/redo, board export, the physical
tldraw removal + full `TEST-CANVAS-001` parity, the footprint/perf pass, and the **freeform
authoring tools** (draw/pen, sticky, text).

**Out of scope (the whole programme):** multiplayer/CRDT; vector (Figma-style) path editing; arrow
**binding/auto-reroute** (edges stay static); rich-text styling beyond plain labels; richer FigJam
primitives (connectors, frames, shape library) — a possible later feature (see `PLAN-JAM-001`
Annex B).

## 6. Acceptance criteria (feature-level)

1. **tldraw is gone:** `website/app/package.json` lists no `tldraw`/`@tldraw/*`; `grep -r '"tldraw"'
   website/app/src` → **0**; the public board still renders with no key/watermark (`FR-J-04`).
2. The **full** canvas-editor V&V (`TEST-CANVAS-001`, `TC-01..19`) passes **unchanged** on the engine
   — including **undo** (`TC-18`, `FR-J-02`) and **export**, plus the round-trip and no-leak cases.
3. The committed bundle is **materially smaller** than the tldraw baseline (`NFR-J-02`), and pan/
   zoom/drag hold ~60 fps on the AIQ sample (`NFR-J-01`).
4. A user can **draw a freehand stroke, place a sticky note, and add text** on the board; each
   persists across reload and **never** appears in the `.kymo` text (`FR-J-05..07`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial requirements: re-homed `FR-J-01..03`/`NFR-J-01/02` from `FEAT-ENGINE-001`, added `FR-J-04` (tldraw removal + full parity) and `FR-J-05..07` (freeform draw/sticky/text), scope & acceptance. |

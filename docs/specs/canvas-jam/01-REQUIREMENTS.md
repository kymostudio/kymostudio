---
title: Canvas Jam — Requirements
document_id: FEAT-JAM-001
version: "0.3"
issue_date: 2026-06-06
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the engine completion + freeform tools; reviewers; stakeholders
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
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
  - conops
  - stakeholder-requirements
  - canvas-jam
  - freeform-authoring
  - tldraw-removal
  - acceptance-criteria
  - product-description
---

# Canvas Jam — Requirements

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `FEAT-JAM-001`                                                   |
| Version           | 0.3                                                              |
| Status            | Draft                                                            |
| Owner             | `diagrams/` project                                             |
| Related Documents | `DESIGN-JAM-001` (how), `TEST-JAM-001` (V&V), `FEAT-ENGINE-001` (sibling — the render core), `FEAT-CANVAS-001` (the editor on top) |

> Requirements per **ISO/IEC/IEEE 29148**. IDs: functional **`FR-J-NN`**, non-functional
> **`NFR-J-NN`**, stakeholder needs **`SN-J-NN`**. This feature **completes** the in-house engine
> begun in `FEAT-ENGINE-001` and adds the freeform-authoring tools. Its **entry gate** is the
> sibling's Phase 7 (the key-free board). This document owns the `SN-J`, `FR-J`, and `NFR-J` IDs;
> `PLAN-JAM-001` never re-defines them.

---

## Part A — Product context (ConOps & Stakeholder Requirements)

### A.1 Problem & motivation

The in-house canvas-engine programme was **split** to honour the maintainer's **≤ 50-SP-per-feature**
cap (the whole engine was ≈ 91 SP). The render/interaction core — adapter seam → store → ShapeUtil +
viewport → interaction + persistence → a **key-free rendering board** — is the sibling feature
`FEAT-ENGINE-001` (≈ 42 SP), where the public board already renders with no license key but **tldraw
is still bundled behind the adapter**. This feature (≈ 44 SP) picks up there: it *completes* the
tldraw replacement and adds the **FigJam freeform-authoring** tools that tldraw gave for free.

Two things remain after the key-free board: (a) **finish the replacement** — consolidate the built-in
shapes onto custom `kymo-region`/`kymo-edge`, add the undo/redo stack and board export, then **remove
tldraw entirely** and prove the **full** canvas-editor V&V (`TEST-CANVAS-001`, `TC-01..19`) green on
the engine, and shrink the bundle; and (b) **add the FigJam half** — the freeform whiteboard
**authoring** tools (draw/pen, sticky, text) that the kymo "freeform layer" (`DESIGN-CANVAS-001` §3)
currently depends on tldraw to create.

### A.2 Users & context of operations (ConOps)

- **Who:** the maintainer who wants the vendor dependency fully gone, and users who want to **author
  freeform content** (draw, sticky notes, text) on the board — the FigJam half — without tldraw.
- **Substrate it builds on (unchanged):** the engine core from `FEAT-ENGINE-001` — reactive store +
  source/history *tagging*, editor facade, geometry, camera/viewport/render, custom-shape API,
  persistence, adapter seam (`DESIGN-ENGINE-001`) — and the canvas-editor's `patchDsl` + sync engine
  (`DESIGN-CANVAS-001`). This feature adds modules on top; it does not re-design the engine.
- **Constraint:** the **entry gate** is the sibling's Phase 7 complete (the key-free board); the
  programme stays **client-only / static** (committed bundle, no CI build). Freeform shapes are
  always freeform-layer (`meta.kymo == null`) and MUST never serialise into `.kymo`. Phased one
  freeform tool at a time so value lands incrementally.

### A.3 Goals & non-goals

- **Goals:** complete the tldraw replacement (built-in consolidation, undo/redo, board export,
  **physical tldraw removal + full `TEST-CANVAS-001` parity**, footprint/perf to ~60 fps) and add the
  freeform-authoring tools (draw/pen, sticky, text) — each persisting across reload and never leaking
  into `.kymo`.
- **Non-goals (whole programme):** multiplayer/CRDT; vector (Figma-style) path editing; arrow
  binding/auto-reroute (edges stay static); rich-text styling beyond plain labels; richer FigJam
  primitives (connectors, frames, shape library) — a possible later feature.

### A.4 Stakeholder needs (`SN-J`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-J-01` | The project must depend on **no tldraw code at all** — no license key, no watermark, no `@tldraw/assets`, nothing in `package.json` (finishes `RK-02`). | Vendor independence; `RK-02` is only fully retired when tldraw is physically gone. |
| `SN-J-02` | The canvas-editor's **full** behaviour (`FEAT-CANVAS-001`, `TC-01..19` incl. undo and export) must be **preserved** once tldraw is gone — zero regression. | Removal must never break the delivered editor; parity is the gate before deletion. |
| `SN-J-03` | The committed `kymo.bundle.js` should **shrink** materially from the ~2.0 MB tldraw baseline. | A committed-in-git artifact; the point of removing tldraw is a smaller, owned bundle. |
| `SN-J-04` | Users must be able to **author freeform content** (draw, sticky notes, text) on the board — the FigJam half — without tldraw. | The freeform layer depended on tldraw's tools; the product still needs whiteboard authoring. |

### A.5 Scope

**In scope (product level):** built-in shape consolidation, undo/redo, board export, the physical
tldraw removal + full `TEST-CANVAS-001` parity, the footprint/perf pass, and the **freeform
authoring tools** (draw/pen, sticky, text). **Out of scope (programme):** multiplayer/CRDT, vector
path editing, arrow binding/auto-reroute, rich-text beyond plain labels, and richer FigJam primitives
(connectors, frames, shape library) — a possible later feature (the SRS §C.5 restates these).

---

## Part B — Introduction

> Start here. This folder (`docs/specs/canvas-jam/`) specifies the **second half** of the in-house
> canvas-engine programme: it **completes** the tldraw replacement begun in `FEAT-ENGINE-001`
> (built-in shape consolidation, undo/redo, board export, the **physical tldraw removal + full
> `TEST-CANVAS-001` parity**, footprint) and then adds the **FigJam freeform-authoring** tools —
> draw/pen, sticky notes, and text — the "whiteboard half" tldraw gave for free. The implementation
> plan that delivers it (phases, risks, worklog) lives in `docs/specs/canvas-jam/`
> (`PLAN-JAM-001`).

### B.1 Purpose & motivation

The programme was **split** to honour the maintainer's **≤ 50-SP-per-feature** cap (the whole engine
was ≈ 91 SP). The render/interaction core — adapter seam → store → ShapeUtil + viewport →
interaction + persistence → a **key-free rendering board** — is the sibling feature
`FEAT-ENGINE-001` (≈ 42 SP). **This feature** (≈ 44 SP) picks up where that ends:

- **Finish the replacement.** Consolidate the built-in shapes onto custom `kymo-region`/`kymo-edge`,
  add the undo/redo stack and board export, then **remove tldraw entirely** and prove the **full**
  canvas-editor V&V (`TEST-CANVAS-001`, `TC-01..19`) green on the engine, and shrink the bundle.
- **Add the FigJam half.** Build the freeform whiteboard **authoring** tools (draw/pen, sticky, text)
  that the kymo "freeform layer" (`DESIGN-CANVAS-001` §3) currently depends on tldraw to create.

Documented to the spirit of **ISO/IEC/IEEE 12207**, with requirements per **29148**, architecture
per **42010**, quality attributes per **25010**, test structure per **29119** — tailored to a
single-maintainer OSS feature, exactly as the sibling doc-set.

### B.2 Document map

This feature's docs use a two-layer model in this folder — a **baselined spec** (`01-REQUIREMENTS`–`03-TEST`)
and a **living plan** (`04-PLAN.md` + `CR/`). The documents for canvas-jam:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` | `FEAT-JAM-001` | *what product problem, whose needs (`SN-J`), and what must it do? (`FR-J`/`NFR-J`)* |
| 02 | `02-DESIGN.md` | `DESIGN-JAM-001` | *how is it built?* |
| 03 | `03-TEST.md` | `TEST-JAM-001` | *how do we know it's right? (`TC-J`)* |
| — | `docs/specs/canvas-jam/04-PLAN.md` | `PLAN-JAM-001` | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only.

### B.3 Relationship to the canvas-engine specification

This feature is the **continuation of `FEAT-ENGINE-001`**, not a new product. They are two halves of
one programme, split at the **KEY-FREE BOARD** milestone:

- **Entry gate:** this feature's first phase begins only when the sibling's **Phase 7** is complete —
  i.e. the engine already renders and drives the public board with no license key.
- **Inherited requirements:** the engine's deferred requirements are **re-homed here** with new IDs —
  `FR-EN-06` → `FR-J-01` (built-in consolidation), `FR-EN-10` → `FR-J-02` (undo/redo), `FR-EN-11`
  → `FR-J-03` (board export), `NFR-EN-01/02` → `NFR-J-` (perf, footprint). `FEAT-JAM-001` owns
  these IDs; `FEAT-ENGINE-001` retired them.
- **Built on:** the design here reuses the engine's store/editor/viewport/persist (`DESIGN-ENGINE-001`)
  unchanged; it adds the consolidation, history stack, export, and the freeform tool layer.
- **`RK-02` (no-key blank board)** is **fully retired** in this feature when tldraw is physically
  removed (it had already closed at the render level in the sibling's Phase 7).

### B.4 Reading guide

Spec: **`01-REQUIREMENTS`** (this doc) → **`02-DESIGN`**
(consolidation, undo stack, export, removal, footprint, freeform tools) → **`03-TEST`** (V&V,
`TC-J-NN`, the full parity re-run, traceability). For delivery status & history, read **`PLAN-JAM-001`**.

Quick paths: *implementer* → Part A → Part C → `02-DESIGN` → `04-PLAN`; *reviewer* → Part C → `03-TEST`; *stakeholder* → Part A → `04-PLAN`.

### B.5 Status & ownership

- **Status:** Draft — design-before-code; **blocked on** the sibling's Phase 7 (key-free board).
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** every requirement in this document will have ≥ 1 covering test in
  `TEST-JAM-001` before the feature is declared done.
- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/canvas-jam/CR/` and re-baselined (bump version + record in Annex A).

---

## Part C — Requirements (SRS)

> Requirements per **ISO/IEC/IEEE 29148**. IDs: functional **`FR-J-NN`**, non-functional
> **`NFR-J-NN`**. This document owns these IDs; `PLAN-JAM-001` never re-defines them.

### C.1 Stakeholder needs

Stakeholder needs (`SN-J-01..04`, ISO 29148 §6.4.2 ConOps) are owned by **Part A** of this document.
Each requirement below traces back to them via the **Source need** column.

### C.2 Re-homed requirements (from `FEAT-ENGINE-001`)

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

### C.3 Functional requirements (`FR-J`)

| ID | Requirement | Source need | Phase |
|----|-------------|-------------|-------|
| **FR-J-01** | The engine SHALL **consolidate the built-in shapes** to two tiny custom shapes **`kymo-region`** / **`kymo-edge`** carrying only the props kymo sets, rendered by the engine's own `ShapeUtil`s. *As implemented (engine-only split):* the shared `diagramToShapes.ts` keeps emitting tldraw `geo`/`arrow` (the live `?engine=tldraw` path needs them); a thin `engine/diagramToShapesEngine.ts` reuses it and remaps to `kymo-region`/`kymo-edge` — so re-pointing doesn't break the tldraw board. The `patchDsl` round-trip is unaffected (it reads `meta.kymo`, not the shape type). | SN-J-01 | P1 |
| **FR-J-02** | The engine SHALL provide **undo/redo** across the document, consuming the store's history tags: `{history:"ignore"}` writes are excluded; a default write pushes one undo entry; undo restores the exact prior record (incl. node `x/y`) and `Board`'s writeback re-patches the `.kymo` text. | SN-J-02 | P2 |
| **FR-J-03** | The engine SHALL provide a **board export** that walks shapes in `index` order, aggregates each util's `toSvg()` (or a `component()` raster fallback) into one `<svg>` sized to the fit bounds, and offers SVG/PNG download. | SN-J-02 | P3 |
| **FR-J-04** | The build SHALL **remove tldraw entirely**. *As built (P3):* dropped the `tldraw` dep; deleted `Board.tsx`/`KymoNodeShape.tsx`/`KymoDiagramShape.tsx`/`engine/adapter.ts` + the `@tldraw/tlschema` augmentations + the `?engine=tldraw` switch; removed the (now-empty) `kymo.bundle.css` link from `index.html`. **`grep -r '"tldraw"' website/app/src` → 0**; bundle 2.09 MB → 399 KB raw (107 KB gzip). `TEST-CANVAS-001` `TC-01..05/07..19` pass green on the engine; **`TC-06`'s freeform clause is deferred to P5–7** (no freeform tools yet — the `meta.kymo`-exclusion invariant + reserved `persist.freeform` are in place). | SN-J-01, SN-J-02 | P3 |
| **FR-J-05** | The engine SHALL provide a **draw/pen tool**: a freehand tool that creates a freeform stroke shape (`meta.kymo == null`) on pointer-drag, with the tool state machine (`engine/tools`) that activates/deactivates it. | SN-J-04 | P5 |
| **FR-J-06** | The engine SHALL provide a **sticky-note tool**: click-to-place a resizable sticky shape with an editable plain-text label. | SN-J-04 | P6 |
| **FR-J-07** | The engine SHALL provide a **text tool**: click-to-place an editable plain-text shape. | SN-J-04 | P7 |

> Freeform shapes (`FR-J-05..07`) are always **freeform-layer** (`meta.kymo == null`) and MUST never
> serialise into `.kymo` (`NFR-CE-07`, `FR-CE-03`) — they persist via `engine/persist` only.

### C.4 Non-functional requirements (`NFR-J`)

| ID | Attribute (ISO 25010) | Requirement |
|----|-----------------------|-------------|
| **NFR-J-01** | Performance efficiency | Pan/zoom and drag SHALL stay smooth (~60 fps) for the reference workload (**AIQ sample: 19 nodes / 4 regions / 20 arrows**); off-screen shapes MAY be culled. |
| **NFR-J-02** | Portability / footprint | With tldraw removed, the committed bundle MUST be **well under the 2.0 MB / ≈586 KB-gzip** tldraw baseline; the engine itself SHOULD be ≤ ~50 KB gzip. |

> Inherited and still binding from the sibling: **`NFR-EN-04`** (single adapter seam — call sites
> import only `engine/adapter`) and **`NFR-EN-06`** (committed bundle, no CI build).

### C.5 Scope

**In scope (this feature):** built-in shape consolidation, undo/redo, board export, the physical
tldraw removal + full `TEST-CANVAS-001` parity, the footprint/perf pass, and the **freeform
authoring tools** (draw/pen, sticky, text).

**Out of scope (the whole programme):** multiplayer/CRDT; vector (Figma-style) path editing; arrow
**binding/auto-reroute** (edges stay static); rich-text styling beyond plain labels; richer FigJam
primitives (connectors, frames, shape library) — a possible later feature (see `PLAN-JAM-001`
Annex B).

### C.6 Acceptance criteria (feature-level)

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

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial requirements: re-homed `FR-J-01..03`/`NFR-J-01/02` from `FEAT-ENGINE-001`, added `FR-J-04` (tldraw removal + full parity) and `FR-J-05..07` (freeform draw/sticky/text), scope & acceptance. |
| 0.2     | 2026-05-25 | Vũ Anh | **Doc reorganization.** Moved §1 stakeholder needs to `FEAT-JAM-001` (renamed `SN-1..4` → `SN-J-01..04`); §1 now points there and the `FR-J` Source-need column cites the new IDs. No requirement content changed. Added `FEAT-JAM-001` reading guide, document map, relationship to canvas-engine, and status/ownership sections. |
| 0.3     | 2026-06-06 | Vũ Anh | **Consolidation.** Merged `FEAT-JAM-001` (ConOps/stakeholder requirements) and `FEAT-JAM-001` (overview/document map) into this document as Part A and Part B respectively. `SN-J-NN` IDs, `FR-J-NN` IDs, and all prose preserved verbatim; document map updated to reflect the 4-file structure (`01-REQUIREMENTS`, `02-DESIGN`, `03-TEST`, `04-PLAN`). |

## Annex B — Document Control

| Field | Value |
|-------|-------|
| Classification | Internal |
| Review cycle | On scope change, or when a phase completes |
| Supersedes | `FEAT-JAM-001` (v0.1), `FEAT-JAM-001` (v0.2), `FEAT-JAM-001` (v0.2) |
| Authors | Vũ Anh |

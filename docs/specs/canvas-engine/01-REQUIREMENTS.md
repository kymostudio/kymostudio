---
title: In-House Canvas Engine — Requirements
document_id: FEAT-ENGINE-001
version: "0.4"
issue_date: 2026-06-06
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the engine; reviewers verifying parity; stakeholders
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - DESIGN-ENGINE-001
  - TEST-ENGINE-001
  - PLAN-ENGINE-001
  - FEAT-JAM-001
  - FEAT-CANVAS-001
  - DESIGN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - srs
  - iso-29148
  - product-description
  - conops
  - stakeholder-requirements
  - parity-contract
  - tldraw-surface
  - canvas-engine
  - acceptance-criteria
  - tldraw-replacement
  - vendor-independence
---

# Canvas Engine — Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-ENGINE-001` |
| Version           | 0.4 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `DESIGN-ENGINE-001` (how), `TEST-ENGINE-001` (V&V), `FEAT-JAM-001` (sibling — the deferred half), `FEAT-CANVAS-001` (parent feature), `FEAT-JAM-001` (sibling feature intro) |

> Requirements per **ISO/IEC/IEEE 29148**. IDs: functional **`FR-EN-NN`**, non-functional
> **`NFR-EN-NN`**, stakeholder needs **`SN-EN-NN`**. The engine is judged by **behavioural parity**
> with the tldraw-backed canvas-editor (`FEAT-CANVAS-001`), minus the tldraw-specific limitations it
> exists to remove. This document owns the requirement IDs; `PLAN-ENGINE-001` never re-defines them.
>
> **Scope note (v0.2 split).** This feature is the **render/interaction core** that lands a key-free
> board (`PLAN-ENGINE-001` Phases 1–7). The post-parity work — built-in shape consolidation
> (ex-`FR-EN-06`), undo/redo (ex-`FR-EN-10`), board export (ex-`FR-EN-11`), the 60 fps/footprint
> NFRs (ex-`NFR-EN-01/02`), the physical tldraw removal, and the FigJam freeform-authoring tools —
> is **re-homed in `FEAT-JAM-001`** (as `FR-J-`/`NFR-J-`). Those IDs are retired here.

---

## Part A — Product context (ConOps & Stakeholder Requirements)

### A.1 Problem & motivation

The canvas-editor (`PLAN-CANVAS-001`, Phases 0–4, baselined) runs on the **tldraw** SDK. That choice
left one open, accepted limitation — **`RK-02`**: tldraw v5 **requires a license key in production**;
with no key the board renders only on `localhost` and is **blank on the deployed domain**. The public
deploy (`kymostudio.github.io`) is therefore blank today.

This effort removes that dependency by building the **minimal canvas engine** the canvas-editor
actually uses — *not* a tldraw clone. The driving insight (quantified in `DESIGN-ENGINE-001` §3): the
editor consumes a **small, enumerable slice** of the tldraw API. We re-implement exactly that slice
behind a stable adapter seam, then swap the implementation with **no changes to `Board.tsx`, the
custom shapes, or `Inspector.tsx`**. The goal is **vendor independence** — no license key, no
production watermark, no CDN-hosted assets, and a far smaller committed bundle — while preserving the
canvas-editor's behaviour.

### A.2 Users & context of operations (ConOps)

- **Who:** users of the deployed public board (today blank) and the canvas-editor that sits on top of
  the canvas substrate; the maintainer who must own the dependency.
- **Substrate it builds on (unchanged):** the canvas-editor requirements (`FEAT-CANVAS-001`) and the
  round-trip design (`DESIGN-CANVAS-001` §5–§9 — the kymo↔shape mapping, `patchDsl`, the sync engine)
  **remain authoritative**. What changes is the substrate they sit on: tldraw's asset/license model
  (`DESIGN-CANVAS-001` §10) and `persistenceKey` (§11) are superseded by the engine's own zero-asset
  persistence.
- **Constraint:** the swap is **incremental and reversible** behind a single adapter seam — never a
  big-bang. This feature is the **render/interaction core** that lands a key-free board (Phases 1–7);
  tldraw stays bundled behind the adapter throughout. The sibling **`canvas-jam`** (`FEAT-JAM-001`)
  completes the replacement (tldraw removal, footprint) and adds the freeform-authoring tools.

### A.3 Goals & non-goals

- **Goals:** a render/interaction core — reactive store, editor facade, viewport, custom-shape API,
  pointer interaction, IndexedDB persistence — that makes the public board **render with no license
  key, no watermark, and zero-network assets**, preserving the canvas-editor's round-trip behaviour.
- **Non-goals (deferred to `canvas-jam`):** built-in shape consolidation, undo/redo, board export,
  the **physical tldraw removal + full `TEST-CANVAS-001` parity**, footprint/perf, and the FigJam
  freeform-authoring tools. **Out of scope (whole programme):** multiplayer/CRDT, vector path
  editing, arrow binding/auto-reroute, rich-text styling beyond plain labels.

### A.4 Stakeholder needs (`SN-EN`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-EN-01` | The deployed public board must **render** (today it is blank — `RK-02`). | The headline product failure: no-key tldraw blanks the public deploy. |
| `SN-EN-02` | The project must not depend on a **third-party license key**, **watermark**, or **CDN-hosted assets** for the canvas to work. | Vendor independence — own the substrate, render with zero network. |
| `SN-EN-03` | The existing canvas-editor behaviour (two-way `.kymo` sync, freeform layer, persistence, undo) must be **preserved** — no regression in `FEAT-CANVAS-001`. | The engine is a substitution, not a new product; the editor must keep working. |
| `SN-EN-04` | The committed `kymo.bundle.js` should **shrink** materially from the ~2.0 MB tldraw baseline. | A committed-in-git artifact; tldraw bloats the repo and first load. |
| `SN-EN-05` | The swap should be **incremental and reversible** — never a big-bang that breaks the editor for the duration. | De-risks the rewrite; an adapter seam keeps every step shippable. |

### A.5 Scope

**In scope (product level):** the render/interaction core — store, editor facade, ShapeUtil,
viewport, interaction, persistence — behind a single adapter seam, making the public board render
with no key. tldraw stays bundled behind the adapter. **Out of scope → sibling `canvas-jam`:**
built-in shape consolidation, undo/redo, board export, the physical tldraw removal + full parity,
footprint, and the freeform-authoring tools (the SRS §5 maps each). **Out of scope (programme):**
multiplayer/CRDT, vector path editing, arrow binding/auto-reroute, rich-text beyond plain labels.

---

## Part B — Introduction

### B.1 Purpose & motivation

The canvas-editor (`PLAN-CANVAS-001`, Phases 0–4, baselined) runs on the **tldraw** SDK. That choice
left one open, accepted limitation — **`RK-02`**: tldraw v5 **requires a license key in production**;
with no key the board renders only on `localhost` and is **blank on the deployed domain**. The public
deploy (`kymostudio.github.io`) is therefore blank today.

This effort removes that dependency by building the **minimal canvas engine** the canvas-editor
actually uses — *not* a tldraw clone. The driving insight (quantified in `DESIGN-ENGINE-001` §3): the
editor consumes a **small, enumerable slice** of the tldraw API. We re-implement exactly that slice
behind a stable adapter seam, then swap the implementation with **no changes to `Board.tsx`, the
custom shapes, or `Inspector.tsx`**.

Documented to the spirit of **ISO/IEC/IEEE 12207** (life-cycle processes), with information items per
**ISO/IEC/IEEE 15289**, requirements per **ISO/IEC/IEEE 29148**, architecture per **ISO/IEC/IEEE
42010**, quality attributes per **ISO/IEC 25010**, test structure per **ISO/IEC/IEEE 29119** —
**tailored** to a single-maintainer OSS feature.

### B.2 Document map

This feature's docs use a two-layer model in this folder — a **baselined spec** and a **living plan**
(`PLAN.md` + `CR/`). The documents for canvas-engine after consolidation:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` | `FEAT-ENGINE-001` | *what product problem, whose needs (`SN-EN`), what must it do? (SRS, `FR-EN`/`NFR-EN`)* |
| 02 | `02-DESIGN.md` | `DESIGN-ENGINE-001` | *how is it built?* |
| 03 | `03-TEST.md` | `TEST-ENGINE-001` | *how do we know it's right? (`TC-EN`) + performance benchmark* |
| — | `04-PLAN.md` | `PLAN-ENGINE-001` | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only.

### B.3 Relationship to the canvas-editor specification

This engine is a **substitution under the canvas-editor**, not a new product. The canvas-editor
requirements (`FEAT-CANVAS-001`) and round-trip design (`DESIGN-CANVAS-001` §5–§9, the kymo↔shape
mapping, `patchDsl`, the sync engine) **remain authoritative and unchanged**. What changes is the
substrate they sit on:

- `DESIGN-CANVAS-001` **§10** (tldraw assets / license / watermark) and **§11** (tldraw
  `persistenceKey`) are **superseded** by this engine's own persistence and zero-asset model.
- `RK-02` (no-key blank board) **closes at the render level** in this feature (Phase 7 — the engine
  renders the board, needing no key); it is **fully retired** when the sibling feature physically
  removes tldraw.

The engine's job is to satisfy the canvas-editor's behaviour with an implementation we own.

#### B.3.1 Sibling feature — `canvas-jam` (`FEAT-JAM-001`)

The programme was split (v0.2) to honour the ≤50-SP/feature cap. **This feature** is the
render/interaction core that lands the key-free board. The **sibling** (`docs/specs/canvas-jam/`)
*completes* the engine — built-in shape consolidation, undo/redo, board export, the **physical
tldraw removal + full `TEST-CANVAS-001` parity**, footprint — and adds the **FigJam freeform
authoring** tools. Its first phase's entry gate is **this feature's Phase 7 complete**. Requirements
re-homed there (`FR-EN-06/10/11`, `NFR-EN-01/02`) become `FR-J-`/`NFR-J-` and are retired here.

### B.4 Reading guide

Spec: **`01-REQUIREMENTS`** (this doc — product context + introduction + SRS) →
**`02-DESIGN`** (store, editor facade, viewport, ShapeUtil parity, interaction, persistence, the
adapter seam) → **`03-TEST`** (V&V, `TC-EN-NN`, traceability + benchmark). For delivery status &
history, read **`PLAN-ENGINE-001`**.

Quick paths: *implementer* → Part A + Part C → `02-DESIGN` → `04-PLAN`; *reviewer* → Part C → `03-TEST`;
*stakeholder* → Part A → `04-PLAN`.

### B.5 Status & ownership

- **Status:** Draft — design-before-code. No engine code exists yet; tldraw remains bundled behind
  the adapter **throughout this feature** (Phases 1–7), its physical removal being the sibling
  feature (`PLAN-JAM-001`).
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** every requirement in Part C will have ≥ 1 covering test in
  `TEST-ENGINE-001` §5 before the engine is declared at parity.
- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/canvas-engine/CR/` and re-baselined (bump version + record in Annex A).

---

## Part C — Requirements (SRS)

> Stakeholder needs (`SN-EN-01..05`, ISO 29148 §6.4.2 ConOps) are owned by Part A above. Each
> requirement below traces back to them via the **Source need** column.

### C.1 The parity contract — tldraw surface to reproduce

The engine MUST reproduce **exactly** the tldraw API surface consumed by `website/app/src`
(enumerated from the code in `DESIGN-ENGINE-001` §3). This table is the normative contract; anything
not listed is **out of scope** for parity.

| Area | Symbols / methods consumed | Requirement |
|------|----------------------------|-------------|
| Mount | `<Tldraw>` props `shapeUtils`, `onMount`, `persistenceKey` (drop `licenseKey`) | FR-EN-08 |
| Helpers | `createShapeId`, `toRichText` | FR-EN-09 |
| Editor — query | `getCurrentPageShapes`, `getShape`, `getOnlySelectedShape` | FR-EN-01 |
| Editor — mutate | `createShape`, `createShapes`, `updateShape`, `deleteShape`, `deleteShapes` | FR-EN-01 |
| Editor — control | `run(fn, { history: "ignore" })`, `zoomToFit` | FR-EN-01 |
| Store | `store.listen(cb, { scope: "document", source: "user" })` | FR-EN-02 |
| ShapeUtil | `type`, `props`, `getDefaultProps`, `getGeometry`→`Rectangle2d`, `component`, `getIndicatorPath`, `toSvg`, `canResize`, `canEdit`, `hideRotateHandle` | FR-EN-03 |
| Render host | `HTMLContainer`; prop validators `T.number`, `T.string` | FR-EN-03, FR-EN-08 |
| Hooks | `useEditor`, `useValue` | FR-EN-08 |
| Built-in shapes | `geo` (rectangle, `richText` label) for Region; `arrow` (`start`/`end`/`richText`) for Edge — supplied by **tldraw behind the adapter** in this feature; consolidated to custom `kymo-region`/`kymo-edge` in `FEAT-JAM-001` | `FR-J-01` *(was FR-EN-06)* |
| Types | `Editor`, `TLShape`, `TLShapeId`, `TLShapePartial`, `TLBaseShape` | FR-EN-09 |

### C.2 Functional requirements (`FR-EN`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-EN-01** | The engine SHALL expose an **`Editor` facade** with the query/mutate/control methods in §C.1, with semantics identical to tldraw's as relied upon by `Board.tsx` (centre/top-left conventions, deterministic ids). | SN-EN-03 |
| **FR-EN-02** | The engine SHALL provide a **reactive store** whose change subscription distinguishes **`source: "user"`** (direct user interaction) from programmatic writes, and supports a **`scope: "document"`** filter. Programmatic mutations made inside `run(fn, { history: "ignore" })` MUST NOT notify `source:"user"` listeners. *(This is the load-bearing guarantee behind the round-trip loop-guard, `DESIGN-CANVAS-001` §7 / `RK-05`.)* | SN-EN-03 |
| **FR-EN-03** | The engine SHALL provide a **custom-shape API** (`ShapeUtil` parity) covering every override in §C.1, so `KymoNodeShapeUtil` and `KymoDiagramShapeUtil` port with **no behavioural change** (incl. `getGeometry`→rectangle, `component()` rendered in an `HTMLContainer`-equivalent, `getIndicatorPath`, `toSvg`, and the `canResize/canEdit/hideRotateHandle` flags). | SN-EN-03 |
| **FR-EN-04** | The engine SHALL render shapes in an **infinite, pannable, zoomable viewport**; each shape positioned by `x/y` and drawn via its util's `component()` under a camera transform. | SN-EN-01, SN-EN-03 |
| **FR-EN-05** | The engine SHALL support pointer interaction: **single/multi selection**, **drag-move** of shapes (the action that drives canvas→text), **pan** (space/middle-drag), and **wheel/pinch zoom**, with a selection **indicator** outline from `getIndicatorPath`/`getGeometry`. | SN-EN-03 |
| **FR-EN-07** | The engine SHALL **persist** the document (all shapes + camera) to **IndexedDB** under a key, restoring on mount — replacing tldraw's `persistenceKey` (`DESIGN-CANVAS-001` §11, `FR-CE-11`). Freeform shapes survive verbatim; kymo shapes reconcile by deterministic id. | SN-EN-02, SN-EN-03 |
| **FR-EN-08** | The engine SHALL provide **React bindings**: a `<Canvas>` mount component (accepting `shapeUtils`, `onMount`, persistence key — **no `licenseKey`**), plus `useEditor` and a reactive `useValue(name, compute, deps)` selector, and an `HTMLContainer` render host. | SN-EN-01, SN-EN-02 |
| **FR-EN-09** | The engine SHALL provide the **helpers/types** in §C.1 (`createShapeId`, `toRichText`; `Editor`, `Shape`/`ShapeId`/`ShapePartial`/`BaseShape` types) so call sites type-check unchanged. | SN-EN-03 |
| **FR-EN-12** | The engine SHALL render with **zero network** at runtime — no CDN fonts/icons/translations. Any required font/asset is self-contained or system-default. | SN-EN-02 |

> **Deferred to `FEAT-JAM-001`** (re-homed IDs): `FR-EN-06` built-in shape consolidation →
> `FR-J-01`; `FR-EN-10` undo/redo → `FR-J-02`; `FR-EN-11` board export → `FR-J-03`. The store's
> `history:"ignore"` **tagging** stays here (`FR-EN-02`, the foundation the undo stack builds on);
> the user-facing undo/redo stack itself is `FR-J-02`.

### C.3 Non-functional requirements (`NFR-EN`)

| ID | Attribute (ISO 25010) | Requirement |
|----|-----------------------|-------------|
| **NFR-EN-03** | Compatibility | No license key; **no watermark**; the engine renders the board on any domain — **closes `RK-02` at the render level** (Phase 7). tldraw's *physical* removal is `NFR-J-`/`FEAT-JAM-001`. |
| **NFR-EN-04** | Maintainability | The engine SHALL sit behind a single **adapter module**; `Board.tsx`, `KymoNodeShape`, `KymoDiagramShape`, `Inspector`, `diagramToShapes` import **only** the adapter, never the engine internals — so the substrate is swappable. |
| **NFR-EN-05** | Reliability | The reactive store MUST be loop-safe: a programmatic `text→canvas` apply produces **zero** `canvas→text` echo (re-verify `RK-05` against the new store). |
| **NFR-EN-06** | Deployability | Unchanged static model: `build.sh` → committed `kymo.bundle.js`, uploaded as-is by `deploy-website.yml`; **no CI build**, no runtime fetch. |

> **Deferred to `FEAT-JAM-001`**: `NFR-EN-01` (60 fps perf) → `NFR-J-`; `NFR-EN-02`
> (footprint/bundle shrink — only real once tldraw is physically removed) → `NFR-J-`.

### C.4 Scope

**In scope (this feature — render/interaction core):** the §C.1–§C.3 surface needed to make `Board.tsx`
work on the engine with the **public board rendering, no key** — store, editor facade, ShapeUtil,
viewport, interaction, persistence. tldraw stays bundled behind the adapter.

**Deferred to `FEAT-JAM-001`:** built-in shape consolidation, undo/redo, board export, the
physical tldraw removal + full `TEST-CANVAS-001` parity, footprint/perf, and the **FigJam freeform
authoring tools** (draw/pen, sticky, text) which tldraw supplied out of the box and which the kymo
"freeform layer" (`DESIGN-CANVAS-001` §3) currently depends on tldraw to create. Until those land,
the freeform layer can only hold shapes the engine ships.

**Out of scope (the whole programme):** multiplayer/CRDT (matches `DESIGN-CANVAS-001` non-goal);
vector (Figma-style) path editing; arrow **binding/auto-reroute** (edges stay static as today);
rich-text styling beyond plain labels.

### C.5 Acceptance criteria (feature-level)

1. With the engine **rendering the board** (behind `?engine=native`, then as the default), the
   **public deploy renders** with **no watermark and no license key** — `RK-02` closes at the render
   level. *(tldraw stays in `package.json`; its physical removal is `FEAT-JAM-001`.)*
2. The **core round-trip** parity holds on the engine: drag a `kymo-node` → `.kymo` patches (`TC` for
   `FR-CE-02/06`); freeform shapes **never leak** into `.kymo` (`FR-CE-03`); **persistence** reload
   reconciles (`TC-17`). *(The full `TC-01..19` suite, incl. undo `TC-18`, is `FEAT-JAM-001`.)*
3. `Board.tsx`, `KymoNodeShape.tsx`, `KymoDiagramShape.tsx`, `Inspector.tsx`, `diagramToShapes.ts`
   compile against the adapter with **no logic changes** (import path change only — `NFR-EN-04`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial requirements: parity contract, `FR-EN-01..12`, `NFR-EN-01..06`, scope & acceptance. (`FEAT-ENGINE-001` v0.1) |
| 0.1     | 2026-05-23 | Vũ Anh | Initial introduction + document map for the in-house canvas engine. (`FEAT-ENGINE-001` v0.1) |
| 0.1     | 2026-05-25 | Vũ Anh | Initial product description. Extracted from `FEAT-ENGINE-001` §1 (purpose/motivation) and `FEAT-ENGINE-001` §1 (stakeholder needs); renamed needs `SN-1..5` → `SN-EN-01..05` (feature-scoped). (`FEAT-ENGINE-001` v0.1) |
| 0.2     | 2026-05-24 | Vũ Anh | **Feature split.** Re-homed `FR-EN-06/10/11` and `NFR-EN-01/02` to `FEAT-JAM-001` (as `FR-J-`/`NFR-J-`); rescoped scope and acceptance to the key-free board + core round-trip. (`FEAT-ENGINE-001` v0.2) |
| 0.2     | 2026-05-24 | Vũ Anh | **Feature split** at the key-free-board seam: rescoped to the render/interaction core; added sibling-feature relationship to `FEAT-JAM-001`; `RK-02` now closes at render level here. (`FEAT-ENGINE-001` v0.2) |
| 0.3     | 2026-05-25 | Vũ Anh | **Doc reorganization.** Moved §1 stakeholder needs to `FEAT-ENGINE-001` (renamed `SN-1..5` → `SN-EN-01..05`); §1 now points there. No requirement content changed. (`FEAT-ENGINE-001` v0.3) |
| 0.3     | 2026-05-25 | Vũ Anh | **Doc reorganization.** §2 trimmed to a document map and adds `FEAT-ENGINE-001` + a benchmark row; reading guide + change-management updated. (`FEAT-ENGINE-001` v0.3) |
| 0.4     | 2026-06-06 | Vũ Anh | **Consolidation.** Merged `FEAT-ENGINE-001` (product context), `FEAT-ENGINE-001` (introduction), and `FEAT-ENGINE-001` (SRS) into this single `01-REQUIREMENTS.md`; document_id remains `FEAT-ENGINE-001`; source docs removed. |

## Annex B — Document Control

This document is baselined. Changes follow the change-request process in `docs/specs/canvas-engine/CR/`.
Raise a CR, update the relevant Part, bump the version, and add a row to Annex A.

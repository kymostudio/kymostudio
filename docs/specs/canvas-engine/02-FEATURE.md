---
title: In-House Canvas Engine — Feature & Requirements (SRS)
document_id: FEAT-ENGINE-001
version: "0.1"
issue_date: 2026-05-23
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the engine; reviewers verifying parity
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-ENGINE-001
  - DESIGN-ENGINE-001
  - TEST-ENGINE-001
  - PLAN-ENGINE-001
  - FEAT-CANVAS-001
  - DESIGN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - srs
  - iso-29148
  - parity-contract
  - tldraw-surface
  - canvas-engine
  - acceptance-criteria
---

# In-House Canvas Engine — Feature & Requirements (SRS)

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | FEAT-ENGINE-001                                                   |
| Version           | 0.1                                                               |
| Status            | Draft                                                             |
| Owner             | `diagrams/` project                                              |
| Related Documents | `DESIGN-ENGINE-001` (how), `TEST-ENGINE-001` (V&V), `FEAT-CANVAS-001` (parent feature) |

> Requirements per **ISO/IEC/IEEE 29148**. IDs: functional **`FR-EN-NN`**, non-functional
> **`NFR-EN-NN`**. The engine is judged by **behavioural parity** with the tldraw-backed canvas-editor
> (`FEAT-CANVAS-001`), minus the tldraw-specific limitations it exists to remove. This document owns
> the requirement IDs; `PLAN-ENGINE-001` never re-defines them.

---

## 1. Stakeholder needs (ISO 29148 §6.4.2)

| ID | Need |
|----|------|
| SN-1 | The deployed public board must **render** (today it is blank — `RK-02`). |
| SN-2 | The project must not depend on a **third-party license key**, **watermark**, or **CDN-hosted assets** for the canvas to work. |
| SN-3 | The existing canvas-editor behaviour (two-way `.kymo` sync, freeform layer, persistence, undo) must be **preserved** — no regression in `FEAT-CANVAS-001`. |
| SN-4 | The committed `kymo.bundle.js` should **shrink** materially from the ~2.0 MB tldraw baseline. |
| SN-5 | The swap should be **incremental and reversible** — never a big-bang that breaks the editor for the duration. |

## 2. The parity contract — tldraw surface to reproduce

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
| Built-in shapes | `geo` (rectangle, `richText` label) for Region; `arrow` (`start`/`end`/`richText`) for Edge | FR-EN-06 |
| Types | `Editor`, `TLShape`, `TLShapeId`, `TLShapePartial`, `TLBaseShape` | FR-EN-09 |

## 3. Functional requirements (`FR-EN`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-EN-01** | The engine SHALL expose an **`Editor` facade** with the query/mutate/control methods in §2, with semantics identical to tldraw's as relied upon by `Board.tsx` (centre/top-left conventions, deterministic ids). | SN-3 |
| **FR-EN-02** | The engine SHALL provide a **reactive store** whose change subscription distinguishes **`source: "user"`** (direct user interaction) from programmatic writes, and supports a **`scope: "document"`** filter. Programmatic mutations made inside `run(fn, { history: "ignore" })` MUST NOT notify `source:"user"` listeners. *(This is the load-bearing guarantee behind the round-trip loop-guard, `DESIGN-CANVAS-001` §7 / `RK-05`.)* | SN-3 |
| **FR-EN-03** | The engine SHALL provide a **custom-shape API** (`ShapeUtil` parity) covering every override in §2, so `KymoNodeShapeUtil` and `KymoDiagramShapeUtil` port with **no behavioural change** (incl. `getGeometry`→rectangle, `component()` rendered in an `HTMLContainer`-equivalent, `getIndicatorPath`, `toSvg`, and the `canResize/canEdit/hideRotateHandle` flags). | SN-3 |
| **FR-EN-04** | The engine SHALL render shapes in an **infinite, pannable, zoomable viewport**; each shape positioned by `x/y` and drawn via its util's `component()` under a camera transform. | SN-1, SN-3 |
| **FR-EN-05** | The engine SHALL support pointer interaction: **single/multi selection**, **drag-move** of shapes (the action that drives canvas→text), **pan** (space/middle-drag), and **wheel/pinch zoom**, with a selection **indicator** outline from `getIndicatorPath`/`getGeometry`. | SN-3 |
| **FR-EN-06** | The engine SHALL provide the **built-in shapes** used by `diagramToShapes.ts`: a **`geo` rectangle** (with `richText` label, dashed/solid, colour) for Regions and an **`arrow`** (`start`/`end` points, `richText` label, arrowheads) for Edges — OR an equivalent that `diagramToShapes` is re-pointed to. | SN-3 |
| **FR-EN-07** | The engine SHALL **persist** the document (all shapes + camera) to **IndexedDB** under a key, restoring on mount — replacing tldraw's `persistenceKey` (`DESIGN-CANVAS-001` §11, `FR-CE-11`). Freeform shapes survive verbatim; kymo shapes reconcile by deterministic id. | SN-2, SN-3 |
| **FR-EN-08** | The engine SHALL provide **React bindings**: a `<Canvas>` mount component (accepting `shapeUtils`, `onMount`, persistence key — **no `licenseKey`**), plus `useEditor` and a reactive `useValue(name, compute, deps)` selector, and an `HTMLContainer` render host. | SN-1, SN-2 |
| **FR-EN-09** | The engine SHALL provide the **helpers/types** in §2 (`createShapeId`, `toRichText`; `Editor`, `Shape`/`ShapeId`/`ShapePartial`/`BaseShape` types) so call sites type-check unchanged. | SN-3 |
| **FR-EN-10** | The engine SHALL provide **undo/redo** (history) across the document — tldraw supplied this for free and the canvas-editor relies on it (`FR-CE-12`, Phase 4b). Mutations under `{ history: "ignore" }` MUST be excluded from the undo stack. | SN-3 |
| **FR-EN-11** | The engine SHALL provide a **board export** that aggregates each shape's `toSvg()` into a single SVG/PNG document (parity with the export hook `KymoDiagramShapeUtil.toSvg` relies on, `RK-07`). | SN-3 |
| **FR-EN-12** | The engine SHALL render with **zero network** at runtime — no CDN fonts/icons/translations. Any required font/asset is self-contained or system-default. | SN-2 |

## 4. Non-functional requirements (`NFR-EN`)

| ID | Attribute (ISO 25010) | Requirement |
|----|-----------------------|-------------|
| **NFR-EN-01** | Performance efficiency | Pan/zoom and drag SHALL stay smooth (~60 fps) for the reference workload (**AIQ sample: 19 nodes / 4 regions / 20 arrows**, `PLAN-CANVAS-001` worklog P2); off-screen shapes MAY be culled. |
| **NFR-EN-02** | Portability / footprint | The engine MUST be **dependency-light** (React + the engine only; no tldraw, no `@tldraw/assets`). Target committed bundle **well under the 2.0 MB / ≈586 KB-gzip** tldraw baseline (`RK-03`); the engine itself SHOULD be ≤ ~50 KB gzip. |
| **NFR-EN-03** | Compatibility | No license key; **no watermark**; renders on any domain (closes `RK-02`). |
| **NFR-EN-04** | Maintainability | The engine SHALL sit behind a single **adapter module**; `Board.tsx`, `KymoNodeShape`, `KymoDiagramShape`, `Inspector`, `diagramToShapes` import **only** the adapter, never the engine internals — so the substrate is swappable. |
| **NFR-EN-05** | Reliability | The reactive store MUST be loop-safe: a programmatic `text→canvas` apply produces **zero** `canvas→text` echo (re-verify `RK-05` against the new store). |
| **NFR-EN-06** | Deployability | Unchanged static model: `build.sh` → committed `kymo.bundle.js`, uploaded as-is by `deploy-website.yml`; **no CI build**, no runtime fetch. |

## 5. Scope

**In scope (parity MVP):** everything in §2–§4 — enough to make `Board.tsx` work unchanged with the
public board rendering, no key, smaller bundle.

**In scope (post-parity, the FigJam half):** freeform whiteboard **tools** — a draw/pen tool, sticky
notes, and a text tool — which tldraw supplied out of the box and which the kymo "freeform layer"
(`DESIGN-CANVAS-001` §3) currently depends on tldraw to create. Until these land, the freeform layer
can only hold shapes the engine ships.

**Out of scope (this version):** multiplayer/CRDT (matches `DESIGN-CANVAS-001` non-goal); vector
(Figma-style) path editing; arrow **binding/auto-reroute** (edges stay static as today, `RK` in
`PLAN-ENGINE-001` §6); rich-text styling beyond plain labels.

## 6. Acceptance criteria (feature-level)

1. With the engine swapped in (tldraw removed from `website/app/package.json`), the **public deploy
   renders** the board with **no watermark and no license key**.
2. The full canvas-editor V&V (`TEST-CANVAS-001`, `TC-01..TC-19`) passes **unchanged** against the
   engine — most importantly the **round-trip** (`TC` for `FR-CE-02/06`), **no-leak** (freeform vs
   kymo), **persistence** (`TC-17`), and **undo** (`TC-18`).
3. `Board.tsx`, `KymoNodeShape.tsx`, `KymoDiagramShape.tsx`, `Inspector.tsx`, `diagramToShapes.ts`
   compile against the adapter with **no logic changes** (import path change only — NFR-EN-04).
4. Committed bundle is materially smaller than the tldraw baseline (NFR-EN-02).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial requirements: parity contract (§2), `FR-EN-01..12`, `NFR-EN-01..06`, scope & acceptance. |

---
title: In-House Canvas Engine — Feature & Requirements (SRS)
document_id: FEAT-ENGINE-001
version: "0.2"
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
  - FEAT-FIGJAM-001
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
| Version           | 0.2                                                               |
| Status            | Draft                                                             |
| Owner             | `diagrams/` project                                              |
| Related Documents | `DESIGN-ENGINE-001` (how), `TEST-ENGINE-001` (V&V), `FEAT-FIGJAM-001` (sibling — the deferred half), `FEAT-CANVAS-001` (parent feature) |

> Requirements per **ISO/IEC/IEEE 29148**. IDs: functional **`FR-EN-NN`**, non-functional
> **`NFR-EN-NN`**. The engine is judged by **behavioural parity** with the tldraw-backed canvas-editor
> (`FEAT-CANVAS-001`), minus the tldraw-specific limitations it exists to remove. This document owns
> the requirement IDs; `PLAN-ENGINE-001` never re-defines them.
>
> **Scope note (v0.2 split).** This feature is the **render/interaction core** that lands a key-free
> board (`PLAN-ENGINE-001` Phases 1–7). The post-parity work — built-in shape consolidation
> (ex-`FR-EN-06`), undo/redo (ex-`FR-EN-10`), board export (ex-`FR-EN-11`), the 60 fps/footprint
> NFRs (ex-`NFR-EN-01/02`), the physical tldraw removal, and the FigJam freeform-authoring tools —
> is **re-homed in `FEAT-FIGJAM-001`** (as `FR-FJ-`/`NFR-FJ-`). Those IDs are retired here.

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
| Built-in shapes | `geo` (rectangle, `richText` label) for Region; `arrow` (`start`/`end`/`richText`) for Edge — supplied by **tldraw behind the adapter** in this feature; consolidated to custom `kymo-region`/`kymo-edge` in `FEAT-FIGJAM-001` | `FR-FJ-01` *(was FR-EN-06)* |
| Types | `Editor`, `TLShape`, `TLShapeId`, `TLShapePartial`, `TLBaseShape` | FR-EN-09 |

## 3. Functional requirements (`FR-EN`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-EN-01** | The engine SHALL expose an **`Editor` facade** with the query/mutate/control methods in §2, with semantics identical to tldraw's as relied upon by `Board.tsx` (centre/top-left conventions, deterministic ids). | SN-3 |
| **FR-EN-02** | The engine SHALL provide a **reactive store** whose change subscription distinguishes **`source: "user"`** (direct user interaction) from programmatic writes, and supports a **`scope: "document"`** filter. Programmatic mutations made inside `run(fn, { history: "ignore" })` MUST NOT notify `source:"user"` listeners. *(This is the load-bearing guarantee behind the round-trip loop-guard, `DESIGN-CANVAS-001` §7 / `RK-05`.)* | SN-3 |
| **FR-EN-03** | The engine SHALL provide a **custom-shape API** (`ShapeUtil` parity) covering every override in §2, so `KymoNodeShapeUtil` and `KymoDiagramShapeUtil` port with **no behavioural change** (incl. `getGeometry`→rectangle, `component()` rendered in an `HTMLContainer`-equivalent, `getIndicatorPath`, `toSvg`, and the `canResize/canEdit/hideRotateHandle` flags). | SN-3 |
| **FR-EN-04** | The engine SHALL render shapes in an **infinite, pannable, zoomable viewport**; each shape positioned by `x/y` and drawn via its util's `component()` under a camera transform. | SN-1, SN-3 |
| **FR-EN-05** | The engine SHALL support pointer interaction: **single/multi selection**, **drag-move** of shapes (the action that drives canvas→text), **pan** (space/middle-drag), and **wheel/pinch zoom**, with a selection **indicator** outline from `getIndicatorPath`/`getGeometry`. | SN-3 |
| **FR-EN-07** | The engine SHALL **persist** the document (all shapes + camera) to **IndexedDB** under a key, restoring on mount — replacing tldraw's `persistenceKey` (`DESIGN-CANVAS-001` §11, `FR-CE-11`). Freeform shapes survive verbatim; kymo shapes reconcile by deterministic id. | SN-2, SN-3 |
| **FR-EN-08** | The engine SHALL provide **React bindings**: a `<Canvas>` mount component (accepting `shapeUtils`, `onMount`, persistence key — **no `licenseKey`**), plus `useEditor` and a reactive `useValue(name, compute, deps)` selector, and an `HTMLContainer` render host. | SN-1, SN-2 |
| **FR-EN-09** | The engine SHALL provide the **helpers/types** in §2 (`createShapeId`, `toRichText`; `Editor`, `Shape`/`ShapeId`/`ShapePartial`/`BaseShape` types) so call sites type-check unchanged. | SN-3 |
| **FR-EN-12** | The engine SHALL render with **zero network** at runtime — no CDN fonts/icons/translations. Any required font/asset is self-contained or system-default. | SN-2 |

> **Deferred to `FEAT-FIGJAM-001`** (re-homed IDs): `FR-EN-06` built-in shape consolidation →
> `FR-FJ-01`; `FR-EN-10` undo/redo → `FR-FJ-02`; `FR-EN-11` board export → `FR-FJ-03`. The store's
> `history:"ignore"` **tagging** stays here (`FR-EN-02`, the foundation the undo stack builds on);
> the user-facing undo/redo stack itself is `FR-FJ-02`.

## 4. Non-functional requirements (`NFR-EN`)

| ID | Attribute (ISO 25010) | Requirement |
|----|-----------------------|-------------|
| **NFR-EN-03** | Compatibility | No license key; **no watermark**; the engine renders the board on any domain — **closes `RK-02` at the render level** (Phase 7). tldraw's *physical* removal is `NFR-FJ-`/`FEAT-FIGJAM-001`. |
| **NFR-EN-04** | Maintainability | The engine SHALL sit behind a single **adapter module**; `Board.tsx`, `KymoNodeShape`, `KymoDiagramShape`, `Inspector`, `diagramToShapes` import **only** the adapter, never the engine internals — so the substrate is swappable. |
| **NFR-EN-05** | Reliability | The reactive store MUST be loop-safe: a programmatic `text→canvas` apply produces **zero** `canvas→text` echo (re-verify `RK-05` against the new store). |
| **NFR-EN-06** | Deployability | Unchanged static model: `build.sh` → committed `kymo.bundle.js`, uploaded as-is by `deploy-website.yml`; **no CI build**, no runtime fetch. |

> **Deferred to `FEAT-FIGJAM-001`**: `NFR-EN-01` (60 fps perf) → `NFR-FJ-`; `NFR-EN-02`
> (footprint/bundle shrink — only real once tldraw is physically removed) → `NFR-FJ-`.

## 5. Scope

**In scope (this feature — render/interaction core):** the §2–§4 surface needed to make `Board.tsx`
work on the engine with the **public board rendering, no key** — store, editor facade, ShapeUtil,
viewport, interaction, persistence. tldraw stays bundled behind the adapter.

**Deferred to `FEAT-FIGJAM-001`:** built-in shape consolidation, undo/redo, board export, the
physical tldraw removal + full `TEST-CANVAS-001` parity, footprint/perf, and the **FigJam freeform
authoring tools** (draw/pen, sticky, text) which tldraw supplied out of the box and which the kymo
"freeform layer" (`DESIGN-CANVAS-001` §3) currently depends on tldraw to create. Until those land,
the freeform layer can only hold shapes the engine ships.

**Out of scope (the whole programme):** multiplayer/CRDT (matches `DESIGN-CANVAS-001` non-goal);
vector (Figma-style) path editing; arrow **binding/auto-reroute** (edges stay static as today);
rich-text styling beyond plain labels.

## 6. Acceptance criteria (feature-level)

1. With the engine **rendering the board** (behind `?engine=native`, then as the default), the
   **public deploy renders** with **no watermark and no license key** — `RK-02` closes at the render
   level. *(tldraw stays in `package.json`; its physical removal is `FEAT-FIGJAM-001`.)*
2. The **core round-trip** parity holds on the engine: drag a `kymo-node` → `.kymo` patches (`TC` for
   `FR-CE-02/06`); freeform shapes **never leak** into `.kymo` (`FR-CE-03`); **persistence** reload
   reconciles (`TC-17`). *(The full `TC-01..19` suite, incl. undo `TC-18`, is `FEAT-FIGJAM-001`.)*
3. `Board.tsx`, `KymoNodeShape.tsx`, `KymoDiagramShape.tsx`, `Inspector.tsx`, `diagramToShapes.ts`
   compile against the adapter with **no logic changes** (import path change only — `NFR-EN-04`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial requirements: parity contract (§2), `FR-EN-01..12`, `NFR-EN-01..06`, scope & acceptance. |
| 0.2     | 2026-05-24 | Vũ Anh | **Feature split.** Re-homed `FR-EN-06/10/11` and `NFR-EN-01/02` to `FEAT-FIGJAM-001` (as `FR-FJ-`/`NFR-FJ-`); rescoped §5 to the render/interaction core and §6 acceptance to the key-free board + core round-trip (full `TC-01..19` parity → sibling). |

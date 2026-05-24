---
title: Canvas Jam — Design
document_id: DESIGN-JAM-001
version: "0.1"
issue_date: 2026-05-24
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers completing the engine + building the freeform tools (`website/app/`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-JAM-001
  - FEAT-JAM-001
  - TEST-JAM-001
  - PLAN-JAM-001
  - DESIGN-ENGINE-001
  - DESIGN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - technical-design
  - canvas-jam
  - builtin-shapes
  - undo-redo
  - export
  - tldraw-removal
  - freeform-tools
  - footprint
---

# Canvas Jam — Design

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | DESIGN-JAM-001                                               |
| Version           | 0.1                                                            |
| Status            | Draft                                                          |
| Owner             | `diagrams/` project                                           |
| Audience          | Engineers completing the engine + building freeform tools     |
| Related Documents | `FEAT-JAM-001` (requirements), `PLAN-JAM-001` (phases/why), `DESIGN-ENGINE-001` (the render core this builds on), `DESIGN-CANVAS-001` (the editor on top) |

> **Status note.** Draft engineering design, not a committed spec. The *how* that complements
> `PLAN-JAM-001` (the *why* and the phase order). This feature **builds on** the engine core
> designed in `DESIGN-ENGINE-001` (store §5, editor §6, geometry §7, viewport §8, custom-shape API
> §9, persistence §11, adapter seam §13) — reused unchanged. Phasing is in `PLAN-JAM-001` §4.

---

## 1. Scope & relationship to the canvas-engine

This feature picks up at the **key-free board** the sibling delivers (`DESIGN-ENGINE-001`). It does
**not** re-design the store/render/persist; it **completes** the replacement (consolidation, undo,
export, tldraw removal, footprint) and adds the **freeform-authoring tools**. The litmus test is the
same: *does `Board.tsx` still compile and behave identically — now with tldraw gone?*

## 2. Built-in shape consolidation (`engine/shapes-builtin`) — FR-J-01

`diagramToShapes.ts` emits two built-in types today (supplied by tldraw behind the adapter in the
sibling feature):

- **`geo` rectangle** (`:29`) — props `{ geo:"rectangle", w, h, size, color, fill, dash, font, align,
  verticalAlign, richText }` for Regions.
- **`arrow`** (`:60`) — props `{ start, end, bend, size, color, arrowheadStart, arrowheadEnd,
  richText }` for Edges.

**Design.** Replace these with two tiny `ShapeUtil`s on the engine's custom-shape API
(`DESIGN-ENGINE-001` §9):

- **`KymoRegionShapeUtil`** (`kymo-region`) — props `{ w, h, color, dash, label }`; renders a
  dashed/solid grey rect with an optional centred label. `getGeometry → Rectangle2d`.
- **`KymoEdgeShapeUtil`** (`kymo-edge`) — props `{ start, end, color, arrowhead, label }`; renders a
  line/curve with an arrowhead and optional label.

**Engine-only split (as implemented in P1).** `diagramToShapes.ts` is shared by the still-live tldraw
`Board.tsx` (`?engine=tldraw`), where `geo`/`arrow` are tldraw's *native* built-in shapes — re-pointing
it in place would leave that path with no util for the new types (broken render + changed golden
output). So `diagramToShapes.ts` keeps emitting `geo`/`arrow` for tldraw, and a thin engine builder
`engine/diagramToShapesEngine.ts` reuses it (for stable ids / positions / `meta.kymo`) then remaps
`geo` → `kymo-region` and `arrow` → `kymo-edge`, carrying only the props the engine reads (dropping
dead tldraw fields `bend`, `size`, `verticalAlign`, … and flattening `richText` → a plain `label`).
The new `ShapeUtil`s live in `engine/shapes.tsx` as `KymoRegionEngineUtil`/`KymoEdgeEngineUtil`
(alongside `KymoNodeEngineUtil`). `meta.kymo` and the `patchDsl` round-trip are untouched. The shared
`diagramToShapes.ts` leaves the engine path entirely when tldraw is deleted (FR-J-04, P3).

## 3. Undo / redo (`engine/store` history stack) — FR-J-02

The store already **tags** each write `history:"ignore"|"record"` at write time
(`DESIGN-ENGINE-001` §5.3). This feature adds the consuming **stack**:

- An append-only list of recordable change-entries (forward + inverse patches); `undo()` applies the
  inverse, `redo()` re-applies. `{history:"ignore"}` writes never enter the stack — so a programmatic
  `text→canvas` apply is **not** undoable (matches tldraw).
- Undo of a kymo-node move restores its `x/y` record; `Board`'s existing `source:"user"` listener
  then fires and the writeback re-patches the `.kymo` text — exactly the Phase-4b behaviour
  `TC-18` asserts. (`RK-EN-02`.)

## 4. Board export (`engine/view` + `ShapeUtil.toSvg`) — FR-J-03

`KymoDiagramShapeUtil.toSvg` (`KymoDiagramShape.tsx:69`) returns an `<image>`; the per-shape `toSvg`
hook lives on the engine's `ShapeUtil` base (`DESIGN-ENGINE-001` §9.1). The exporter here walks
shapes in `index` order, calls `util.toSvg(shape)` (or rasterises `component()` as a fallback), wraps
them in an `<svg>` sized to the `zoomToFit` bounds, and offers SVG/PNG download. MVP ships SVG-only;
PNG via canvas `drawImage` follows.

## 5. tldraw removal + parity (`Board.tsx`, `package.json`, `build.sh`) — FR-J-04

Once consolidation (§2), undo (§3) and export (§4) land, flip the adapter's `./impl` **fully** to the
engine and remove tldraw:

- `website/app/package.json`: drop `tldraw`, `@tldraw/assets`.
- `build.sh`: drop the tldraw asset copy step.
- `Board.tsx`: remove `licenseKey` and the `import "tldraw/tldraw.css"`.
- Regenerate + commit `kymo.bundle.js`.

**Gate:** the **full** `TEST-CANVAS-001` (`TC-01..19`) must be green on the engine **before** the
removal commit, and `grep -r '"tldraw"' website/app/src` → 0 **after**. `RK-02` is fully retired.

## 6. Footprint & performance (`engine/view`) — NFR-J-01/02

- **Bundle:** measure `kymo.bundle.js` (raw + gzip) before/after removal; assert materially below the
  2.0 MB / ≈586 KB-gzip tldraw baseline; tree-shake; target engine ≤ ~50 KB gzip.
- **Perf:** profile pan/zoom/drag on the AIQ sample; if coarse single-epoch reactivity
  (`DESIGN-ENGINE-001` §5.4) misses ~60 fps, refine to per-record atoms (`RK-EN-04`). Culling
  (`DESIGN-ENGINE-001` §8.2) on/off comparison; preserve the `KymoDiagramShape` `<img>` data-URL
  cache so cull/remount doesn't flash (`RK-07`).

## 7. Freeform authoring tools (`engine/tools` + freeform shapes) — FR-J-05..07

The "FigJam half" — the largest deferred chunk. Built on the engine's tool state machine
(`engine/tools`, `DESIGN-ENGINE-001` §4) which already hosts select/drag/pan/zoom.

### 7.1 Tool state machine

A small current-tool state machine: `select` (default) plus `draw`, `sticky`, `text`. The active tool
owns pointer events; on commit it creates a freeform shape (`meta.kymo == null`, `source:"user"`) and
returns to `select`. Each created shape persists via `engine/persist` and is excluded from `.kymo`.

### 7.2 Shapes

| Tool (`FR`) | Shape (`ShapeUtil`) | Props | Create gesture |
|-------------|---------------------|-------|----------------|
| draw/pen (`FR-J-05`) | `freedraw` | `{ points: Vec[], color, size }` | pointer-down → move (accumulate points) → up |
| sticky (`FR-J-06`) | `note` | `{ w, h, color, text }` | click to place; double-click to edit text |
| text (`FR-J-07`) | `text` | `{ text, color, size }` | click to place; type to edit |

`freedraw` renders an SVG path from its `points`; `note`/`text` render in an `HTMLContainer`
(`DESIGN-ENGINE-001` §9.4) with a plain (non-rich) editable label. Geometry: `freedraw` bounds from
the point extent; `note`/`text` from `w/h` — all via `Rectangle2d` for hit-test/selection.

## 8. Risks / open questions

Tracked in `PLAN-JAM-001` §6 (risk register). Design-level callouts:

1. **Undo + round-trip (`RK-EN-02`)** — the history stack must restore `x/y` *and* let `Board`'s
   writeback re-patch the text; verify `TC-18`.
2. **Freeform scope (`RK-EN-03`)** — draw/sticky/text are a genuine build; phased one tool per phase
   (P5/P6/P7) so each lands independently. Richer primitives (connectors, frames) stay out of scope.
3. **Bundle (`RK-EN-05`)** — own render/signals/persist code may not shrink as hoped; measure each
   phase, tree-shake.
4. **Rich-text editing (`RK-EN-06`)** — labels are plain text in MVP; rich-text editing deferred.

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial design: built-in consolidation (§2, ex-`DESIGN-ENGINE-001` §10), undo/redo stack (§3), board export (§4, ex-§12), tldraw removal + parity (§5), footprint/perf (§6), and the freeform tool state machine + shapes (§7). Builds on `DESIGN-ENGINE-001`. |

---
title: In-House Canvas Engine — Design
document_id: DESIGN-ENGINE-001
version: "0.1"
issue_date: 2026-05-23
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the engine in `website/app/` (and a future `packages/js-canvas`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-ENGINE-001
  - FEAT-ENGINE-001
  - TEST-ENGINE-001
  - PLAN-ENGINE-001
  - DESIGN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - technical-design
  - canvas-engine
  - reactive-store
  - editor-facade
  - shapeutil
  - viewport
  - camera
  - persistence
  - adapter-seam
  - tldraw-replacement
---

# In-House Canvas Engine — Design

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | DESIGN-ENGINE-001                                                |
| Version           | 0.1                                                               |
| Status            | Draft                                                             |
| Owner             | `diagrams/` project                                             |
| Audience          | Engineers implementing the engine (`website/app/`)              |
| Related Documents | `FEAT-ENGINE-001` (requirements), `PLAN-ENGINE-001` (phases/why), `DESIGN-CANVAS-001` (the editor that sits on top) |

> **Status note.** Draft engineering design, not a committed spec. This is the *how* that complements
> `PLAN-ENGINE-001` (the *why* and the phase order). Re-validate symbol names against
> `website/app/src` and `packages/js/src` before implementing — they evolve. Phasing is **not**
> repeated here; see `PLAN-ENGINE-001` §4.

---

## 1. Scope & relationship to the canvas-editor

We are **not** rewriting tldraw. We are building the **minimal canvas engine** the canvas-editor
consumes, behind an adapter that preserves the editor's source. `DESIGN-CANVAS-001` (the kymo↔shape
mapping §5, the custom shapes §6, the sync engine §7, `patchDsl` §8) stays authoritative; this
document specifies the **substrate** those modules run on.

The litmus test for every design decision: *does `Board.tsx` still compile and behave identically?*

## 2. Goals / non-goals

**Goals**
- Reproduce **exactly** the tldraw surface in `FEAT-ENGINE-001` §2 — no more.
- A **reactive store** whose `source:"user"` vs programmatic distinction is precise (the round-trip
  loop-guard depends on it — `DESIGN-CANVAS-001` §7).
- **Swap with zero logic change** to `Board`/shapes/`Inspector`/`diagramToShapes` (adapter seam, §13).
- **No key, no watermark, no CDN, small bundle** (`FEAT-ENGINE-001` SN-1/2/4).

**Non-goals (this version)**
- Multiplayer/CRDT; vector path editing; arrow auto-reroute/binding (edges stay static, as today);
  rich-text styling beyond plain labels. (See `FEAT-ENGINE-001` §5.)

## 3. The surface to replace — enumerated from the code

These are **all** the tldraw imports in `website/app/src` (Phase-0 census). The engine must export a
drop-in for each; the right column is the module that owns the replacement (§4).

| File | tldraw imports used | Replaced by |
|------|---------------------|-------------|
| `Board.tsx` | `Tldraw`, `createShapeId`, `Editor`, `TLShape`; `editor.{getCurrentPageShapes,getShape,deleteShape(s),updateShape,createShape(s),run,zoomToFit}`, `editor.store.listen` | `engine/react` (`<Canvas>`), `engine/editor`, `engine/store` |
| `KymoNodeShape.tsx` | `HTMLContainer`, `Rectangle2d`, `ShapeUtil`, `T`, `TLBaseShape` | `engine/shape` (`ShapeUtil`, `Rectangle2d`, `T`, `BaseShape`), `engine/react` (`HTMLContainer`) |
| `KymoDiagramShape.tsx` | `HTMLContainer`, `Rectangle2d`, `ShapeUtil`, `T`, `TLBaseShape` (+ `toSvg` override) | same |
| `Inspector.tsx` | `useEditor`, `useValue` | `engine/react` (hooks) |
| `diagramToShapes.ts` | `createShapeId`, `toRichText`, `TLShapeId`, `TLShapePartial` (+ built-in `geo`/`arrow`) | `engine/editor`, `engine/text`, `engine/shapes-builtin` |

Two consequences:
1. The **built-in `geo` rectangle and `arrow`** are part of the surface (Regions and Edges use them in
   `diagramToShapes.ts:29,60`). The engine ships these two, **or** Phase 4 re-points `diagramToShapes`
   to custom `kymo-region` / `kymo-edge` shapes. Re-pointing is cleaner long-term (fewer built-ins to
   own) — decided in `PLAN-ENGINE-001` §4 (Phase 4).
2. The **`@tldraw/tlschema` module augmentation** (`declare module ... TLGlobalShapePropsMap`) in the
   two custom shapes is tldraw-specific and is **dropped** — the engine derives its shape union from
   the registered `shapeUtils` array instead (§9.3).

## 4. Architecture & module tree

Layered, dependency flows downward. The top three layers are tldraw's public API today; the bottom
three are what tldraw hides and we must build.

```
   React app (Board.tsx, KymoNodeShape, KymoDiagramShape, Inspector)   ← UNCHANGED (imports adapter)
        │
   engine/adapter.ts ........ the seam: re-exports either tldraw OR engine/* (NFR-EN-04, §13)
        │
   ┌────┴───────────────────────────────────────────────────────────────────┐
   │ engine/react/   <Canvas>, HTMLContainer, useEditor, useValue            │  React bindings
   │ engine/editor   Editor facade (FR-EN-01): CRUD + run + zoomToFit        │  imperative API
   │ engine/shape    ShapeUtil base, Rectangle2d, T validators, BaseShape    │  custom-shape API
   ├──────────────────────────────────────────────────────────────────────────┤
   │ engine/store    reactive records + scoped/sourced listeners + history   │  state + reactivity
   │ engine/view     camera, hit-test, culling, DOM render loop              │  rendering
   │ engine/tools    select / drag / pan / zoom  (+ later draw / sticky)     │  interaction
   │ engine/persist  IndexedDB serialize ⇄ restore                          │  durability
   └──────────────────────────────────────────────────────────────────────────┘
```

Proposed location: a new workspace package **`packages/js-canvas`** (so it is testable with
`node --test` like `packages/js`, and reusable), imported by `website/app`. An MVP MAY start inside
`website/app/src/engine/` and graduate to a package once stable.

## 5. The reactive store (`engine/store`) — FR-EN-02, FR-EN-10

The store is the heart; the loop-guard correctness (`RK-05`) lives or dies here.

### 5.1 Records & shape model

```ts
export type ShapeId = string & { readonly __brand: "ShapeId" };
export interface BaseShape<Type extends string, Props> {
  id: ShapeId;
  type: Type;
  x: number; y: number;          // top-left in page space
  rotation?: number;
  index: string;                 // fractional z-order key (see §5.5)
  parentId?: ShapeId;            // pages/frames; MVP: single page
  props: Props;
  meta: Record<string, unknown>; // kymo writes meta.kymo = { id, kind, src, dst }
}
export type Shape = BaseShape<string, Record<string, unknown>>;
export type ShapePartial = Partial<Shape> & { id: ShapeId; type: string };
```

`meta` is untyped on purpose — kymo's `meta.kymo` (`diagramToShapes.ts:37,47,66`) and `Inspector`'s
`s.meta.kymo` read (`Inspector.tsx:21`) must keep working verbatim.

### 5.2 Change subscription — the load-bearing API

```ts
export type ChangeSource = "user" | "remote";          // "remote" reserved for future sync
export type ChangeScope  = "document" | "session" | "presence";
export interface StoreListenerOpts { scope?: ChangeScope; source?: ChangeSource; }
store.listen(cb: (changes: HistoryEntry) => void, opts?: StoreListenerOpts): () => void;
```

Every mutation carries **`source`** and **`scope`** at write time. `Board.tsx:126-133` subscribes with
`{ scope: "document", source: "user" }`; the engine MUST deliver that callback **only** for
user-originated document changes. This is what lets the writeback fire on a drag but not on a
programmatic `text→canvas` apply.

### 5.3 Transactions, source, and `run`

```ts
editor.run(fn: () => void, opts?: { history?: "ignore" | "record"; source?: ChangeSource }): void;
```

- A transaction batches writes and flushes **one** notification at the end (matches tldraw's
  end-of-transaction flush that `Board.tsx:92` relies on with `queueMicrotask`).
- **Source rule (NFR-EN-05):** writes inside `run` default to **`source:"remote"`** (programmatic);
  writes from `engine/tools` (user gestures) carry **`source:"user"`**. `Board.tsx` wraps every
  `text→canvas` sync in `editor.run(..., { history: "ignore" })` (`Board.tsx:85-91`) → those changes
  are *programmatic* → **not** delivered to the `source:"user"` listener → no echo.
- **History rule (FR-EN-10):** `{ history: "ignore" }` writes are excluded from the undo stack;
  default writes push an undo entry.

> **Design invariant (RK-05):** "user listener fires" ⇔ "a change whose source is `user`". The
> tldraw-side belt-and-braces `applyingRef` guard in `Board.tsx:78,92` becomes redundant but is left
> in place (harmless) until the engine's guarantee is proven by `TC-EN` tests.

### 5.4 Reactivity primitive (`useValue`)

`Inspector.tsx:17` uses `useValue(name, compute, deps)` — a memoised reactive selector that
recomputes when any store atom it *read* during `compute` changes. Implement a tiny signals layer:

- `Atom<T>` with `get()`/`set()`; a global "currently-computing" capture so `compute` auto-tracks the
  atoms it touches (tldraw uses its own `@tldraw/state`; we ship a ~100-line equivalent).
- `react/useValue` subscribes a React `useSyncExternalStore` to the derived computation.
- Store records are atoms (or a coarse single document-epoch atom for the MVP — simplest correct
  option; refine to per-record atoms only if `NFR-EN-01` needs it).

### 5.5 Z-order

Shapes carry a fractional **`index`** string (à la `fractional-indexing`) so insert-between is O(1)
and stable. `diagramToShapes` creates Regions before nodes (`diagramToShapes.ts:24` — "regions first
so they sit behind the nodes"); the engine MUST honour creation order → assign increasing indices.

## 6. The Editor facade (`engine/editor`) — FR-EN-01

A thin imperative wrapper over the store. Method-by-method parity with the calls in `Board.tsx`:

| Method (used at) | Behaviour |
|------------------|-----------|
| `getCurrentPageShapes()` (`Board.tsx:47`) | All shapes on the active page, in `index` order. |
| `getShape(id)` (`Board.tsx:52`) | Record by id or `undefined`. |
| `getOnlySelectedShape()` (`Inspector.tsx:21`) | The single selected shape, else `undefined`. |
| `createShape(p)` / `createShapes(ps)` (`Board.tsx:55`, `:69`) | Insert; fill missing props from the util's `getDefaultProps()`; assign `index`. |
| `updateShape(p)` (`Board.tsx:53`,`:70`) | Shallow-merge `props`/`x`/`y`/`meta` by id. |
| `deleteShape(id)` / `deleteShapes(ids)` (`Board.tsx:51`,`:60`,`:67`) | Remove + drop from selection. |
| `run(fn, opts)` (`Board.tsx:85`) | Transaction (§5.3). |
| `zoomToFit()` (`Board.tsx:94`) | Fit camera to the union of all shape geometries (§8.3). |
| `store.listen(cb, opts)` (`Board.tsx:126`) | Scoped/sourced subscription (§5.2). |

Plus selection accessors the tools/Inspector need: `select(ids)`, `getSelectedShapeIds()`,
`getOnlySelectedShape()`.

## 7. Geometry (`engine/shape`) — `Rectangle2d` parity

`getGeometry()` returns a geometry object used for hit-testing, selection bounds, and the zoom-to-fit
union. The custom shapes only ever use **`Rectangle2d`** (`KymoNodeShape.tsx:73`,
`KymoDiagramShape.tsx:35`):

```ts
export class Rectangle2d {
  constructor(opts: { width: number; height: number; isFilled?: boolean; x?: number; y?: number });
  get bounds(): Box;                       // {x,y,w,h} in shape-local space
  hitTestPoint(p: Vec, margin?: number): boolean;   // isFilled → inside; else edge-band
  toSvgPath(): string;                     // for the default indicator if getIndicatorPath absent
}
```

`getIndicatorPath()` (both shapes return a `Path2D` rect) drives the selection outline; if a util omits
it, fall back to `getGeometry().toSvgPath()`.

## 8. Camera, viewport & rendering (`engine/view`) — FR-EN-04

### 8.1 Camera

`{ x, y, z }` — page-space pan offset + zoom. Screen = `(page + {x,y}) * z`. Pointer events convert
screen→page via the inverse. Single source of truth; persisted (§11).

### 8.2 Render loop

- A `<div>` viewport with a CSS `transform: translate(x,y) scale(z)` container holds one positioned
  wrapper **per shape**; each wrapper renders `util.component(shape)` inside an **`HTMLContainer`**
  (a positioned `<div>` honouring the shape's `w/h`, matching `KymoNodeShape.tsx:38`).
- React renders the shape list keyed by id; the signals layer (§5.4) re-renders only changed shapes.
- **Culling (NFR-EN-01):** skip wrappers whose `getGeometry().bounds` fall outside the viewport rect
  (with a margin). *Note `RK-07`:* `KymoDiagramShape` already renders as a cached `<img>` data-URL
  specifically so culling/remount doesn't flash — preserve that; do not eagerly unmount its DOM
  without the data-URL cache.

### 8.3 `zoomToFit`

Compute the union of all shapes' world bounds (`x/y` + `getGeometry().bounds`), then set camera `z` to
fit with padding and centre. Gated by `Board.tsx:93,123` (`fittedRef`) so a restored camera (§11) is
honoured — the engine just needs `zoomToFit()` to be idempotent and side-effect-free beyond the camera.

## 9. Custom-shape API (`engine/shape`) — FR-EN-03

### 9.1 `ShapeUtil` base class

Parity with the overrides the two kymo shapes use:

```ts
export abstract class ShapeUtil<S extends Shape> {
  static type: string;
  static props?: Record<string, Validator<unknown>>;   // T.number / T.string
  abstract getDefaultProps(): S["props"];
  abstract getGeometry(shape: S): Rectangle2d;
  abstract component(shape: S): ReactNode;
  getIndicatorPath?(shape: S): Path2D;
  toSvg?(shape: S): ReactNode;                          // export (§12), FR-EN-11
  canResize?(): boolean;        // default true
  canEdit?(): boolean;          // default false
  hideRotateHandle?(): boolean; // default false
}
```

`KymoNodeShapeUtil` / `KymoDiagramShapeUtil` extend this **unchanged** apart from the import path. The
`static props` use `T.number`/`T.string` validators (§9.2).

### 9.2 Prop validators (`T`)

`T.number`, `T.string` are the only validators used (`KymoNodeShape.tsx:62`,
`KymoDiagramShape.tsx:28`). Implement `T` as a minimal schema (`T.number`, `T.string`, `T.boolean`,
`T.literal`, `T.optional`) with `validate(v)`; run on create/update in dev, no-op in prod for speed.

### 9.3 Registry & the shape union

Utils are passed to `<Canvas shapeUtils={[...]}/>` (`Board.tsx:34,144`). The engine builds a
`type → util` registry at mount. The `declare module "@tldraw/tlschema"` augmentation (`KymoNodeShape`
.tsx:83, `KymoDiagramShape.tsx:84`) is **deleted**; shape-prop typing comes from the
`TLBaseShape`→`BaseShape` generic instead. (Minor, mechanical edit to the two shape files — the only
change beyond import paths.)

### 9.4 `HTMLContainer`

A positioned `<div>` that sizes to the shape and forwards `style`/children (matches usage at
`KymoNodeShape.tsx:38`, `KymoDiagramShape.tsx:52`). ~15 lines.

## 10. Built-in shapes (`engine/shapes-builtin`) — FR-EN-06

`diagramToShapes.ts` emits two built-in types today:

- **`geo` rectangle** (`:29`) — props `{ geo:"rectangle", w, h, size, color, fill, dash, font, align,
  verticalAlign, richText }`. The engine needs a `GeoShapeUtil` rendering a rect with the dashed/solid
  + grey styling and an optional centred/started label.
- **`arrow`** (`:60`) — props `{ start:{x,y}, end:{x,y}, bend, size, color, arrowheadStart,
  arrowheadEnd, richText }`. An `ArrowShapeUtil` drawing a line/curve with an arrowhead and optional
  label.

**Decision (see `PLAN-ENGINE-001` §4, Phase 4):** rather than re-implement tldraw's full `geo`/`arrow`
prop surface, **re-point `diagramToShapes` to two tiny custom shapes** `kymo-region` / `kymo-edge`
carrying only the props kymo sets. This shrinks the surface and removes dead tldraw prop fields
(`bend`, `verticalAlign`, …). The `patchDsl` round-trip is unaffected (it reads `meta.kymo`, not the
shape type). This is the **only** change to `diagramToShapes.ts` and it is mechanical.

## 11. Persistence (`engine/persist`) — FR-EN-07

Replaces tldraw's `persistenceKey` (`Board.tsx:32,144`; `DESIGN-CANVAS-001` §11).

- Serialize `{ schemaVersion, shapes: Shape[], camera }` to **IndexedDB** under the key
  (`"kymo-canvas"`). Debounced writes on document change.
- On mount: read the snapshot, hydrate the store, restore the camera. `Board.tsx:122-123` then sees
  `getCurrentPageShapes().length > 0` and skips the auto-fit — preserved behaviour.
- **Reconciliation (FR-CE-11 / NFR-CE-07):** freeform shapes (`meta.kymo == null`) restore verbatim;
  kymo shapes are **re-derived from `.kymo` text** and reconciled by deterministic id — the engine
  just restores; `Board.sync` (`Board.tsx:82`) does the reconcile, unchanged.
- A `schemaVersion` int enables future migrations; mismatch → drop snapshot (safe for a single-player
  playground).

## 12. Export (`engine/view` + `ShapeUtil.toSvg`) — FR-EN-11

`KymoDiagramShapeUtil.toSvg` (`KymoDiagramShape.tsx:69`) returns an `<image>`. The engine's exporter
walks shapes in `index` order, calls `util.toSvg(shape)` (or rasterises `component()` as a fallback),
wraps them in an `<svg>` sized to the `zoomToFit` bounds, and offers SVG/PNG download. MVP can ship
SVG-only; PNG via canvas `drawImage` later.

## 13. The adapter seam (`engine/adapter.ts`) — NFR-EN-04, the migration enabler

This is what makes the rewrite incremental and reversible (the whole strategy in `PLAN-ENGINE-001`):

```ts
// engine/adapter.ts  — the ONLY module the app imports for canvas primitives
export * from "./impl";   // ./impl re-exports tldraw today; the engine after Phase 5
```

- **Phase 0:** `./impl` simply re-exports the tldraw symbols the app uses, under the engine's own
  names. `Board.tsx` & friends change their imports from `"tldraw"` → `"./engine/adapter"` (and the
  two shapes drop the `@tldraw/tlschema` augmentation). **Zero behaviour change** — tldraw still runs.
- **Phases 1–5:** implement `engine/store`, `editor`, `view`, `shape`, `react`, `tools`, `persist`.
  Point `./impl` at the engine **piece by piece** (e.g. store first, render last) — or run a
  feature-flag (`?engine=native`) to A/B the two implementations on the same `Board`.
- **Phase 6:** flip `./impl` fully to the engine, delete tldraw from `package.json`, drop
  `@tldraw/assets` and `tldraw/tldraw.css`, remove `licenseKey` (`Board.tsx:30,144`). `RK-02` closes.

Because the app depends only on the adapter, tldraw can be reinstated instantly by reverting one
re-export — de-risking the whole effort (NFR-EN-04, SN-5).

## 14. What we lose with tldraw, and how we replace it

tldraw gave several things "for free" that the canvas-editor quietly relies on. Each is a line item:

| Free from tldraw | Used by | Engine plan |
|------------------|---------|-------------|
| Undo/redo | `FR-CE-12` / Phase 4b | `engine/store` history stack (§5.3, FR-EN-10) |
| `source:"user"` change filter | round-trip loop-guard (`DESIGN-CANVAS-001` §7) | store source tagging (§5.2–5.3) — **highest-risk parity item** |
| Pan/zoom/select/drag | all interaction | `engine/tools` (§4) |
| Persistence | `FR-CE-11` | `engine/persist` (§11) |
| `geo`/`arrow` shapes | Regions/Edges | re-point to custom (§10) |
| **Freeform draw / sticky / text tools** | the **FigJam half** (`DESIGN-CANVAS-001` §3 freeform layer) | **post-parity** `engine/tools` (`FEAT-ENGINE-001` §5) — the largest deferred chunk |
| Rich-text label **editing** | `geo`/`arrow` labels | MVP renders labels read-only; inline edit deferred |

## 15. Risks / open questions

Tracked in `PLAN-ENGINE-001` §6 (risk register). The design-level callouts:

1. **Store source-fidelity (`RK-EN-01`)** — if a programmatic write ever leaks as `source:"user"`, the
   round-trip oscillates (`RK-05`). Mitigation: single choke-point for `source` tagging in `run`
   (§5.3) + a `TC-EN` test asserting zero echo on a programmatic apply.
2. **Undo scope (`RK-EN-02`)** — kymo-node moves must undo *and* round-trip the text (Phase 4b
   behaviour). The history stack must restore `x/y`; `Board`'s existing writeback then patches the
   text. Verify the same `TC-18` passes.
3. **Freeform tools are the 80% (`RK-EN-03`)** — parity (read/move/persist) is the tractable MVP; the
   draw/sticky/text **authoring** tools are a separate, larger build. Sequenced last so value (a
   rendering public board, no key) lands first.
4. **Perf at scale (`RK-EN-04`)** — coarse single-epoch reactivity (§5.4) is simplest but re-renders
   broadly; measure against `NFR-EN-01` before optimising to per-record atoms.

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial design: surface census (§3), layered architecture (§4), reactive store + source/history semantics (§5), Editor facade (§6), geometry/camera/render (§7–§8), ShapeUtil parity (§9), built-ins (§10), persistence (§11), export (§12), the adapter seam (§13), and the "what we lose" ledger (§14). |

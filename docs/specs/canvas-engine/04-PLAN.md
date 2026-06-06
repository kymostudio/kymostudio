---
title: In-House Canvas Engine — Implementation Plan
document_id: PLAN-ENGINE-001
version: "0.3"
issue_date: 2026-05-25
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers replacing the tldraw substrate under the canvas-editor (`website/app/`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - FEAT-ENGINE-001
  - DESIGN-ENGINE-001
  - TEST-ENGINE-001
  - PLAN-JAM-001
  - PLAN-CANVAS-001
  - DESIGN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - plan
  - project-plan
  - risk-register
  - canvas-engine
  - tldraw-replacement
  - vendor-independence
  - adapter-seam
  - story-points
  - worklog
---

# In-House Canvas Engine — Implementation Plan

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | PLAN-ENGINE-001                                                  |
| Version           | 0.3                                                              |
| Status            | Draft                                                           |
| Owner             | `diagrams/` project                                            |
| Related Documents | `FEAT-ENGINE-001` (requirements), `DESIGN-ENGINE-001` (design), `TEST-ENGINE-001` (V&V), `PLAN-JAM-001` (sibling — engine completion + FigJam authoring), `PLAN-CANVAS-001` (parent — the editor on top) |

> **Implementation plan (ISO/IEC/IEEE 12207 §6.3 Technical Management).** The *delivery* layer for the
> in-house canvas engine: mission rationale, the phased plan, the risk register, and the worklog /
> change-requests. It *implements* the baselined spec in `docs/specs/canvas-engine/`
> (`FEAT-ENGINE-001`, `DESIGN-ENGINE-001`, `TEST-ENGINE-001`).

---

## 1. Context

The canvas-editor (`PLAN-CANVAS-001`, Phases 0–4, delivered) runs on **tldraw v5**. One accepted
limitation remains open: **`RK-02`** — tldraw requires a **production license key**; with none, the
public board (`kymostudio.github.io`) is **blank** (renders only on `localhost`). It was *Accepted
(skipped)* in `PLAN-CANVAS-001` v0.11.

The maintainer's decision (this session): **remove the tldraw dependency** by building the minimal
canvas engine the editor uses — for **vendor independence** (no key, no watermark, no CDN assets,
smaller bundle), keeping the canvas-editor's behaviour intact.

The honest framing that drives everything below: **the engine's API surface is small and enumerable
(`DESIGN-ENGINE-001` §3) — that part is tractable. The hard, easily-underestimated parts are (a) the
reactive store's `source:"user"` fidelity that the round-trip loop-guard depends on, and (b) the
freeform whiteboard *authoring* tools (draw/sticky/text) that tldraw gave for free — the "FigJam
half".** We sequence so the key-free rendering public board lands *early* and the FigJam half lands
*last*.

### 1.1 Feature split (this revision)

The original v0.1 plan covered the whole programme (≈91 SP, Phases 0–7) in one feature — over the
**50-SP-per-feature** cap. v0.2 splits it at the **KEY-FREE BOARD milestone**:

- **This feature — `canvas-engine` (≈42 SP):** the render/interaction core. Adapter seam → reactive
  store → ShapeUtil + viewport → interaction + persistence → **public board renders with no license
  key** (`RK-02` closes at the render level). tldraw stays bundled behind the adapter.
- **Sibling feature — `canvas-jam` (`PLAN-JAM-001`, ≈44 SP):** *completes* the replacement
  (built-in shape consolidation, undo/redo, board export, **physical tldraw removal + full
  `TEST-CANVAS-001` parity**, footprint) and adds the net-new **FigJam freeform-authoring** tools.
  Its first phase's entry gate is **this feature's Phase 7 complete**.

Phases are also **renumbered 1-based** and decomposed so **no phase exceeds 10 SP** (§4–§5).

## 2. Decision

**Build an in-house canvas engine behind an adapter seam; phased, not big-bang; tldraw stays until
parity.** (`DESIGN-ENGINE-001` §13.)

- **Adapter-first.** The app imports canvas primitives only from `engine/adapter`. Phase 1 makes that
  adapter re-export tldraw (zero behaviour change); later phases swap the implementation underneath,
  reversibly. This is what turns a scary rewrite into incremental, shippable steps (SN-5).
- **Minimal, not a clone.** Reproduce exactly the surface in `FEAT-ENGINE-001` §2 — nothing more.
- **Render-first value.** The point of the exercise (a public board that renders with no key) is
  reached the moment the engine can mount + render + select + drag + persist. The freeform authoring
  tools come after that win.

### 2.1 Caveats to accept up front

- **Undo/redo, persistence, pan/zoom, `source` filtering, geo/arrow shapes, and the freeform tools
  are all things tldraw supplied.** Each is now our line item (`DESIGN-ENGINE-001` §14). The freeform
  *authoring* tools are the largest and are explicitly deferred (`FEAT-ENGINE-001` §5).
- **`.kymo` round-trip logic does not change.** `patchDsl`, `diagramToShapes` (bar the §10 re-point),
  the sync engine, and the kymo↔shape mapping are reused from `DESIGN-CANVAS-001` verbatim.
- **No multiplayer, no vector editing, no arrow auto-reroute** this version (matches the canvas-editor
  non-goals).
- **Bundle should shrink** but is unproven until measured (`RK-EN-05`).

## 3. Architecture (overview)

Full engineering design — store, editor facade, viewport, ShapeUtil parity, persistence, the adapter
seam — is in **`DESIGN-ENGINE-001`**. Proposed layout:

```
packages/js-canvas/              # the engine home (private workspace pkg; node --test like packages/js) — Annex B §1 decided
└── src/
    ├── store.ts        # reactive records, scoped/sourced listeners, transactions, history   (DESIGN §5) ✅ Phase 2
    ├── editor.ts       # Editor facade: CRUD + run + zoomToFit + selection + camera ops       (DESIGN §6,§8.1) ✅ Phase 3,6
    ├── shape.ts        # ShapeUtil base, Rectangle2d, T validators, BaseShape                (DESIGN §7,§9) ✅ Phase 4
    ├── persist.ts      # IndexedDB serialize ⇄ restore                                       (DESIGN §11)
    └── shapes-builtin/ # kymo-region / kymo-edge (or geo / arrow)                            (DESIGN §10)
    # (pointer interaction — select/drag/pan/zoom — lives in-app in react.tsx, not a package tools/ dir)

website/app/src/engine/                                                                       # the React/DOM-coupled layer (in-app; graduates to the package later)
    ├── adapter.ts      # the seam: re-exports tldraw (P1) → engine; tldraw deleted in canvas-jam   (DESIGN §13) ✅ Phase 1
    ├── react.tsx       # <EngineCanvas> render loop + pointer interaction, HTMLContainer, hooks (DESIGN §8,§9.4) ✅ Phase 5,6
    ├── shapes.tsx      # engine ShapeUtils (kymo-node/diagram + parity geo/arrow)             (DESIGN §8) ✅ Phase 5
    ├── persist.ts      # IndexedDB snapshot (camera + freeform) — replaces persistenceKey    (DESIGN §11) ✅ Phase 7
    └── EngineBoard.tsx # the board (sync/writeback round-trip + restore) — **the DEFAULT** (`?engine=tldraw` opts out)  ✅ Phase 5,6,7
```

**Reused unchanged** from `DESIGN-CANVAS-001`: `Board.tsx` sync/writeback, `KymoNodeShapeUtil`,
`KymoDiagramShapeUtil`, `Inspector`, `patchDsl`, `diagramToShapes` (minus the §10 re-point). They
import `engine/adapter`, never the engine internals (`NFR-EN-04`).

## 4. Phased plan

Phases are **1-based** and sized so **no phase exceeds 10 SP**. This feature ends at **Phase 7 — the
KEY-FREE BOARD**; everything after it (built-in consolidation, undo, export, tldraw removal,
footprint, FigJam authoring) is the sibling `PLAN-JAM-001`.

| Phase | Goal | tldraw present? |
|-------|------|------------------|
| **1 — Adapter seam** | Introduce `engine/adapter.ts` re-exporting the exact tldraw symbols in `DESIGN-ENGINE-001` §3 under engine names (+ the `tldraw/tldraw.css` side-effect). Re-point `Board`/shapes/`Inspector`/`diagramToShapes` imports to it. The `@tldraw/tlschema` augmentation **stays** until the engine owns its shape union (DESIGN §9.3) — dropping it while tldraw is the runtime breaks the `TLShape` union. **Zero behaviour change.** Establishes the swap point. | Yes (behind adapter) |
| **2 — Reactive store** | `store.ts`: records, `run`/transactions, **`source`/`scope`** semantics + `history:"ignore"` tagging (DESIGN §5). The `source:"user"` choke-point — loop-guard fidelity. Unit-tested headless (`TC-EN-01..04`). | Yes |
| **3 — Editor facade** | `editor.ts`: CRUD + `run` + `zoomToFit` + selection over the store (DESIGN §6). | Yes |
| **4 — ShapeUtil + geometry** | `shape.ts` — ShapeUtil base, `Rectangle2d`, `T` validators, `BaseShape` (DESIGN §7,§9). `TC-EN-05/06`. | Yes |
| **5 — Viewport (render)** | `view/` camera + DOM render loop + cull, `react/` (`<Canvas>`, `HTMLContainer`, `useEditor`, `useValue`). Render the kymo shapes **read-only** behind a `?engine=native` flag, A/B against tldraw. | Yes (A/B) |
| **6 — Interaction** | `tools/` select / drag / pan / zoom + hit-test + selection indicator — the drag that drives canvas→text. | Yes (A/B) |
| **7 — Persistence → KEY-FREE BOARD** | `persist.ts` (IndexedDB). Round-trip (drag→`.kymo`) + reload on the engine. **Flip the public deploy to the engine: board renders, no key, no watermark — `RK-02` closes at the render level.** tldraw stays bundled behind the adapter (physically removed in `canvas-jam`). | Yes (engine renders) |

## 5. Project plan

Single-maintainer OSS — **relative sizing** (T-shirt + story points), not dates. Phases are sequential
and **each ≤ 10 SP**; **Phase 2 (store source-fidelity) is the correctness-critical path.**

| Phase | Exit criteria (milestone) | Entry criteria | Effort | SP | Depends on |
|-------|---------------------------|----------------|--------|----|------------|
| 1 | Adapter in place; app imports only the adapter; tldraw still runs; e2e parity unchanged | canvas-editor stable | S | 3 | — |
| 2 | Store passes `TC-EN-01..04` headless (incl. zero-echo loop-guard) | P1 | M | 8 | 1 |
| 3 | Editor facade CRUD/`run`/`zoomToFit`/selection over the store | P2 | M | 5 | 2 |
| 4 | ShapeUtil + `Rectangle2d` + `T` pass `TC-EN-05/06` | P3 | M | 5 | 3 |
| 5 | kymo shapes render via the engine behind `?engine=native`; visual parity | P4 | M | 8 | 4 |
| 6 | Drag/select/pan/zoom on the engine; drag→`.kymo` fires | P5 | M | 8 | 5 |
| 7 | Persistence + **public board renders, no key** (`RK-02` closes) | P6 | M | 5 | 6 |

**Sequencing:** `1 → 2 → 3 → 4 → 5 → 6 → 7`. **Gate before the Phase-7 flip:** `TC-EN-02`
(zero-echo) green — never ship a round-trip that can oscillate. Full `TEST-CANVAS-001` parity and
the physical tldraw removal are the sibling feature's gates (`PLAN-JAM-001`).

### 5.1 Complexity & sizing (story points)

| Work item | Phase | SP | Complexity driver |
|-----------|-------|----|-------------------|
| Adapter seam + import re-point | 1 | 3 | mechanical, but touches every canvas file |
| Reactive store (source/scope/history tagging) | 2 | 8 | **the hard core** — loop-guard fidelity, transactions |
| Editor facade (CRUD + run + zoomToFit + selection) | 3 | 5 | thin imperative layer over the store |
| ShapeUtil + `Rectangle2d` + `T` validators | 4 | 5 | geometry + prop schema |
| Viewport: camera + DOM render loop + cull + React bindings | 5 | 8 | render loop, signals→React |
| Interaction tools (select/drag/pan/zoom) + hit-test | 6 | 8 | pointer math, hit-test |
| Persistence (IndexedDB) + key-free deploy flip | 7 | 5 | snapshot reconcile |
| V&V build-out (`TC-EN` + parity harness) — *shared, programme-level* | all | (5) | test infrastructure |
| **Total (this feature)** | | **≈ 42** | **Complexity: High** |

- **Confidence:** range **35–55 SP**; widest variance is **Phase 2** (store fidelity, 8→13).
- **Per-feature cap:** ≈42 SP **≤ 50** ✓. **Per-phase cap:** every phase **≤ 10 SP** ✓ (largest 8).
- **Risk concentration:** Phase 2 (store source-fidelity) gates everything downstream.
- **Sibling:** the remaining ≈44 SP (parity completion + FigJam authoring) are in `PLAN-JAM-001`.
- **T-shirt ↔ SP key:** S ≈ 2–3 · M ≈ 5–8 · L ≈ 13 · XL ≈ 20+.

## 6. Risk register

Likelihood / impact qualitative (Low / Med / High).

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|----|------|-----------|--------|------------|--------|
| RK-EN-01 | Store `source` fidelity slips → a programmatic apply leaks as `source:"user"` → round-trip oscillates (`RK-05` regression) | Med | High | Single `source`-tagging choke-point in `run` (DESIGN §5.3); `TC-EN-02` gates the Phase-7 flip; keep `Board`'s `applyingRef` belt-and-braces until proven | Open |
| RK-EN-04 | Reactivity too coarse → broad re-renders → render jank | Med | Med | **Benchmarked 2026-05-24:** locked 60 fps at ≤ 50 shapes; **knee ~75–100** — pan dropped into the 30–60 fps band (avg ~44–52, worst ~33 ms) because a camera change `force()`-ed a **full shape re-render** even though only the container transform moves. **Mitigated:** pan/zoom now mutate the transform container's `style` directly via a ref (shapes are CSS children → move with it, no React re-render) → holds ~60 fps at any N during pan/zoom. **Guarded** by a Playwright render-count test (`website/app/e2e/render-guard.spec.ts`): pan/zoom must produce 0 shape re-renders (drag ≥ 1) — fails if `force()` regresses onto the pan/zoom path. **Tail closed in `canvas-jam` P4 (`NFR-J-01`):** per-record reactivity — a drag re-renders only the moved shape (O(1); render-guard `toEqual([targetId])` lock + `TEST-ENGINE-001` §4.4: 60 fps median to ≥600 nodes vs 30 fps parent-wide). Viewport culling **deferred** (net-negative for on-screen workloads). | **Mitigated (pan/zoom + per-record drag); culling deferred** |
| RK-EN-07 | `RK-07` embed-blank regression if the render loop unmounts the diagram `<img>` | Low | Med | Preserve the data-URL `<img>` cache (DESIGN §8.2); re-run `TC-19` | Open |
| RK-02 *(parent)* | No-key tldraw blanks the public board | — | — | **Closed at render level (Phase 7):** the engine is the default renderer and needs no key, so the deployed board renders. **Fully retired** when `canvas-jam` physically removes tldraw. | Closed (render) |

> Risks owned by the sibling feature (`PLAN-JAM-001` §6): **RK-EN-02** (undo restores `x/y` +
> round-trip text), **RK-EN-03** (freeform authoring scope blowout), **RK-EN-05** (engine bundle
> size), **RK-EN-06** (rich-text label editing). They concern work that lands after this feature's
> key-free board.

## 7. Files to create / modify

- **New:** `packages/js-canvas/` (or `website/app/src/engine/`) per §3 — `store.ts`, `editor.ts`,
  `shape.ts`, `view/`, `tools/`, `persist.ts`, `react/`; plus `website/app/src/engine/adapter.ts`
  (the seam).
- **Modify (import path only, + drop `tlschema` augmentation):** `Board.tsx`, `KymoNodeShape.tsx`,
  `KymoDiagramShape.tsx`, `Inspector.tsx`, `diagramToShapes.ts`.
- **Unchanged:** `packages/js/*` (the model/parser/renderer — the engine does not touch it);
  `.github/workflows/deploy-website.yml` (still uploads `website/` as-is — committed bundle, no CI
  build).
- **Owned by the sibling feature (`PLAN-JAM-001`):** `engine/shapes-builtin/` (built-in
  consolidation), the `diagramToShapes` re-point, undo/export, and the tldraw-removal edits
  (`package.json`, `build.sh`, `Board.tsx` `licenseKey`/`tldraw.css`, bundle regen).

## 8. Verification

Detailed cases + traceability in `TEST-ENGINE-001`. At the plan level (this feature's gates):

- **Phase 2:** `TC-EN-01..04` headless (`node --test`) — store CRUD, **zero-echo loop-guard**,
  history tagging.
- **Phase 4:** `TC-EN-05/06` — ShapeUtil defaults/validators, `Rectangle2d` hit-test.
- **Phase 5/6:** A/B render under `?engine=native`; drag a node → `.kymo` updates; freeform no-leak.
  E2E via chrome MCP (as in `PLAN-CANVAS-001` worklog).
- **Phase 7 flip:** reload persists; **public-domain render check** — board renders, no watermark,
  no "license required" console error (`RK-02` render-level closure, `NFR-EN-03`).
- **Regression throughout:** `cd packages/js && npm test` stays green; `Board`/shapes/`Inspector`/
  `diagramToShapes` import only `engine/adapter` (`NFR-EN-04`).
- **Out of scope here:** full `TEST-CANVAS-001` (`TC-01..19`) parity, undo (`TC-18`), export, and
  the `grep -r '"tldraw"' → 0` removal check are the sibling's gates (`PLAN-JAM-001` / `TEST-JAM-001`).

---

## 9. Change requests

Changes to the baselined spec (`docs/specs/canvas-engine/`) are raised, assessed, and logged
in [`CR/`](CR/) (raise → assess → approve → implement → re-baseline). None raised
yet — see [`CR/README.md`](CR/README.md).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial plan: decision (adapter-first, minimal, render-first), phased plan (0→7), story-point sizing (≈ 91 SP), risk register (`RK-EN-01..07`, `RK-02` closing), files, verification gates. |
| 0.2     | 2026-05-24 | Vũ Anh | **Split at the KEY-FREE BOARD seam** to honour the ≤50-SP/feature and ≤10-SP/phase caps: this feature keeps the render/interaction core (≈42 SP); built-in consolidation, undo, export, tldraw removal, footprint and FigJam authoring spun out to `PLAN-JAM-001`. Phases **renumbered 1-based** and decomposed so every phase ≤10 SP. Risks RK-EN-02/03/05/06 moved to the sibling; RK-02 now *closes at render level* here. |
| 0.3     | 2026-05-25 | Vũ Anh | **Doc reorganization.** Added §9 Change-requests (`CR/`); plan consolidated per feature under `docs/specs/`. |

## Annex B — Open questions / pending decisions

1. ~~**Engine home**~~ — **DECIDED (Phase 2):** the engine lives in a new **private** workspace
   package **`packages/js-canvas`** (mirrors `packages/js`: `tsc → dist`, `node --test`). Clean
   headless test harness, reusable/extractable; the app's `engine/adapter.ts` re-exports from it in
   later phases. (`DESIGN-ENGINE-001` §4's primary proposal.)
2. **Reactivity granularity** — single document epoch (simplest) vs. per-record atoms (faster)?
   Start coarse in Phase 5; the formal 60 fps decision is the sibling's footprint pass (`RK-EN-04`).
3. **A/B flag lifetime** — keep `?engine=native` as a permanent escape hatch, or delete once
   `canvas-jam` removes tldraw? (Decided there.)

> Decided/moved: *built-ins vs. custom* (re-point `diagramToShapes` to `kymo-region`/`kymo-edge`) and
> *freeform tool ambition* are now the sibling feature's open questions (`PLAN-JAM-001` Annex B).

## Annex C — Worklog

Append-only progress log (newest at the bottom) — ISO/IEC/IEEE 12207 §6.3.2. `Status`: ✅ done ·
🚧 in progress · ⏳ pending.

| Date       | Phase / area | Work | Status | Ref |
|------------|--------------|------|--------|-----|
| 2026-05-23 | Docs | Authored the canvas-engine spec/plan doc set (`INTRO`/`FEATURE`/`DESIGN`/`TEST`/`PLAN`) — design-before-code for the tldraw replacement; surface census from `website/app/src`, adapter-seam strategy, phased plan, risk register. | ✅ | — |
| 2026-05-24 | Docs | **Split the feature at the KEY-FREE BOARD seam** (≤50-SP/feature, ≤10-SP/phase caps): rescoped this doc-set to the render/interaction core (≈42 SP, Phases 1–7, 1-based); spun the parity-completion + FigJam-authoring half out to the new `*-JAM-001` doc-set (≈44 SP). | ✅ | `PLAN-JAM-001` |
| 2026-05-24 | Phase 1 | **Adapter seam shipped.** New `website/app/src/engine/adapter.ts` re-exports the tldraw surface (+ `tldraw.css`); `Board`/`Inspector`/`KymoNodeShape`/`KymoDiagramShape`/`diagramToShapes` re-pointed to `./engine/adapter`. `@tldraw/tlschema` augmentation kept (deferred per DESIGN §9.3). Verified: `tsc --noEmit` clean; `grep '"tldraw"'` only in `adapter.ts` (`NFR-EN-04`); bundle rebuilt (CSS byte-identical); E2E smoke — board renders 43 shapes, 0 console errors; `packages/js` 59/59 green. | ✅ | — |
| 2026-05-24 | Phase 2 | **Reactive store shipped.** New private package `packages/js-canvas` (mirrors `packages/js`: `tsc → dist`, `node --test`) with `src/store.ts` — records + CRUD, `listen(scope/source)`, `run(history/source)` transactions, the single **source-tagging choke-point** (loop-guard, `RK-EN-01`), monotonic index order, history tagging. CI gains a `js-canvas` job. Resolves Annex B §1 (engine home). Verified headless: **`TC-EN-01..04` green** (incl. the zero-echo loop-guard); `tsc --noEmit` clean; `packages/js` 59/59; `website/app` untouched. | ✅ | — |
| 2026-05-24 | Phase 3 | **Editor facade shipped.** `packages/js-canvas/src/editor.ts` — `Editor` over the store: `getCurrentPageShapes`/`getShape`, `createShape(s)`/`updateShape`/`deleteShape(s)`, `run`, **selection** state (`select`/`getSelectedShapeIds`/`getOnlySelectedShape`), **camera** state + `zoomToFit`. Uses an optional structural `ShapeUtilLike` for `getDefaultProps`/`getGeometry`, with an `x/y`+`props.w/h` fallback until Phase 4. Verified headless: **`TC-EN-01`, `TC-EN-07`** + selection + default-fill green (8/8 in `js-canvas`); `tsc --noEmit` clean; `packages/js` 59/59; `website/app` untouched. | ✅ | — |
| 2026-05-24 | Phase 4 | **ShapeUtil + geometry shipped.** `packages/js-canvas/src/shape.ts` — `Rectangle2d` (bounds/hitTestPoint/toSvgPath), `T` validators (number/string/boolean/literal/optional), `ShapeUtil` abstract base (`static type`/`props`, instance `get type()`, abstract `getDefaultProps`/`getGeometry`, dev-time `validateProps`; render hooks `component`/`getIndicatorPath`/`toSvg` optional & `unknown` → **headless**, narrowed by Phase 5). Editor now validates props on `createShape`/`updateShape`; `zoomToFit` consumes real `getGeometry` bounds. Verified: **`TC-EN-05`, `TC-EN-06`** + zoomToFit-upgrade green (12/12 in `js-canvas`); `tsc --noEmit` clean (no React/DOM); `packages/js` 59/59; `website/app` untouched. | ✅ | — |
| 2026-05-24 | Phase 5 | **Viewport + render (React) shipped.** Render layer lives **in-app** (`website/app/src/engine/`, keeping `packages/js-canvas` headless): `react.tsx` (`EngineCanvas` camera-transform render loop, `HTMLContainer`, `useEditor`/`useValue`), `shapes.tsx` (engine `ShapeUtil`s for `kymo-node`, `kymo-diagram`, + Phase-5 parity-stopgap `geo`/`arrow`), `EngineBoard.tsx` (read-only build from `diagramToShapes`). `App.tsx` branches on **`?engine=native`** → `EngineBoard` (Board.tsx untouched); `build.sh` builds the engine dist. **A/B verified (chrome E2E):** AIQ DSL renders nodes + 4 regions + edges; `order` BPMN renders the `<img>` embed; 0 console errors; default (no-flag) path still mounts tldraw. `tsc --noEmit` clean (app + js-canvas); `packages/js` 59/59, `js-canvas` 12/12. | ✅ | — |
| 2026-05-24 | Phase 6 | **Interaction + round-trip shipped.** Editor gains pure camera helpers (`screenToPage`/`panBy`/`zoomToPoint`, clamped — unit-tested). `EngineCanvas` handles pointer/wheel: **drag a `kymo-node`** (`source:"user"` write), **pan** on empty-drag, **wheel-zoom** to cursor, **click-select** + indicator outline (DOM hit-test via `data-shape-id`). `EngineBoard` reworked from read-only → **persistent editor + `sync`/`writeback`/loop-guard** (mirrors Board.tsx); `App` passes `source`/`onPatch`. **E2E verified:** dragging Orchestrator patched the `.kymo` to `@ (964,278)` and the node **stayed put — no oscillation** (loop-guard held); pan/zoom/select work; 0 console errors; default path unchanged. `js-canvas` 13/13 (incl. camera ops); `packages/js` 59/59; Board.tsx untouched. | ✅ | — |
| 2026-05-24 | Phase 7 | **Persistence + engine-default shipped — `canvas-engine` FEATURE-COMPLETE.** New in-app `engine/persist.ts` (IndexedDB snapshot `{schemaVersion, camera, freeform}`; debounced save; schema-guarded load) replaces tldraw's `persistenceKey` (`FR-EN-07`). `EngineBoard` restores the camera on mount (fit suppressed when restored); `EngineCanvas` gains `autoFit`/`onChange`, fits **once** (resize re-measures only). **`App.tsx` flips the default to the engine** (`USE_ENGINE = engine !== "tldraw"`); `?engine=tldraw` opts out. **`RK-02` closes at the render level** (engine renders with no key; live closure on the next `deploy-website` publish). **E2E verified:** default `/app/` renders via the engine (19 nodes, no tldraw); pan→reload **restores the camera** (IndexedDB snapshot present); round-trip intact; `?engine=tldraw` mounts tldraw; 0 console errors. `packages/js` 59/59; `js-canvas` 13/13; Board.tsx/adapter/core untouched. | ✅ | — |
| 2026-05-24 | Perf | **Pan/zoom render-decoupling + render-count guard (`RK-EN-04`).** FPS stress test found a ~75–100-shape knee on pan (a camera change `force()`-ed a full shape re-render). Fix: pan/zoom now write the camera transform straight to the DOM (`applyCamera`, `will-change: transform`) — **0 shape re-renders**, FPS flat regardless of N. Locked in by a **Playwright** render-count guard (`website/app/e2e/render-guard.spec.ts`, new `playwright.yml` CI job, paths-filtered) — pan/zoom → 0 renders, drag → ≥1; the guard was confirmed to **fail** when `force()` is re-added (non-vacuous). FPS itself is deliberately **not** asserted (flaky in CI). | ✅ | `RK-EN-04` |
| 2026-05-24 | Perf | **Engine-vs-tldraw Playwright comparison bench** (`website/app/e2e/perf-compare.spec.ts`, `@perf`-tagged → run via `npm run test:perf`, **excluded from CI**). Real Playwright input (so tldraw's input system responds) + an in-page rAF sampler + a "moved?" signature per renderer. AIQ (~43 shapes): **parity** — both pin 60 fps on pan & zoom; engine pan does **0** React re-renders (tldraw is already transform-only, so the fix reaches parity, not a lead). Headless software-GL ⇒ absolute FPS isn't real-hardware (the high-N divergence is the real-GPU stress test above + the `canvas-jam` footprint pass). | ✅ | `RK-EN-04` |

**Status: `canvas-engine` is complete (Phases 1–7).** The engine is the default renderer; the
deployed board renders with no license key (`RK-02` closed at the render level). **Remaining work is
the sibling `canvas-jam`** (`PLAN-JAM-001`): built-in `geo`/`arrow` consolidation, undo/redo,
board export, the **physical tldraw removal + full `TEST-CANVAS-001` parity**, footprint, and the
FigJam freeform-authoring tools.

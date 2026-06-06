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
  - FEAT-ENGINE-001
  - DESIGN-ENGINE-001
  - PLAN-ENGINE-001
  - TEST-JAM-001
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
| Related Documents | `FEAT-ENGINE-001` (requirements), `DESIGN-ENGINE-001` (design), `TEST-JAM-001` (sibling — full parity re-run + perf/bundle), `TEST-CANVAS-001` (the editor V&V re-run against the engine) |

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
| **TC-EN-04** | FR-EN-02 | unit | Writes carry a history flag: `{history:"ignore"}` writes are **tagged non-undoable** (excluded from the recorded history log); default writes are tagged recordable. *(The user-facing undo/redo stack & restoration is `TC-J-` in `TEST-JAM-001`.)* |
| **TC-EN-05** | FR-EN-03 | unit | A `ShapeUtil` subclass: `getDefaultProps` fills missing props on create; `T.number`/`T.string` reject mismatched props (dev mode). |
| **TC-EN-06** | FR-EN-03, FR-EN-04 | unit | `Rectangle2d.hitTestPoint` — filled rect: inside hits, outside misses; edge margin honoured. |
| **TC-EN-07** | FR-EN-01 | unit | `zoomToFit` centres + fits the union of two disjoint shapes within padding; idempotent on re-call. |
| **TC-EN-08** | FR-EN-07 | unit | Persist → reload hydrates identical shapes + camera; freeform shapes verbatim; `schemaVersion` mismatch drops snapshot safely. |
| **TC-EN-09** | FR-EN-08 | integ | `useValue(name, compute, deps)` recomputes when a read atom changes and **not** otherwise. |

> **Deferred to `TEST-JAM-001`** (re-id `TC-J-`): `TC-EN-10` board export (ex-`FR-EN-11`),
> `TC-EN-11` `kymo-region`/`kymo-edge` props (ex-`FR-EN-06`), and the user-facing undo/redo
> restoration (ex-`FR-EN-10`).

## 3. Parity test cases (re-run of `TEST-CANVAS-001` on the engine)

These are **not** new behaviour — they assert the engine reproduces `FEAT-CANVAS-001`. This feature
re-runs the **core subset** at the key-free flip (Phase 7); the **full** `TC-01..19` green on the
engine — including undo (`TC-18`) — is the sibling's headline acceptance (`TEST-JAM-001`).

| TC (canvas-editor) | What it proves on the engine |
|--------------------|------------------------------|
| `TC` for FR-CE-02/06 (round-trip) | Drag a `kymo-node` → `.kymo` text patched (`@ (x,y)` / lift from frame); `parseDiagram` reproduces the moved position. |
| `TC` for FR-CE-03 (two-layer) | Freeform shape (`meta.kymo == null`) never leaks into `.kymo`; only `meta.kymo` shapes sync. |
| `TC-16` (layout) | `#root` full-height; panes don't collapse (independent of engine, but re-confirm post-swap). |
| `TC-17` (persistence) | Freeform geo persists across reload; kymo shapes reconcile by id, 0 duplicates. |
| `TC-19` (embed robustness) | BPMN embed (`KymoDiagramShape` `<img>` data-URL) survives cull/remount with no flash (`RK-07`, preserved by §8.2). |

> **Deferred to `TEST-JAM-001`:** `TC-18` (undo restores origin **and** round-trips text — needs
> the undo stack, ex-`FR-EN-10`) and the assertion that the **full** `TC-01..19` suite passes green
> on the engine with tldraw removed.

## 4. Non-functional verification

| NFR | Method |
|-----|--------|
| **NFR-EN-03** (no key) | E2E on the **public domain** (`kymostudio.github.io`): board renders, **no watermark**, no "license required" console error. **This is the `RK-02` render-level closure check.** |
| **NFR-EN-04** (seam) | `grep -r '"tldraw"' website/app/src` matches **only** inside `engine/` (the adapter re-export); `Board`/shapes/`Inspector`/`diagramToShapes` import only the adapter; their git diff is import-path + the dropped `tlschema` augmentation only. |
| **NFR-EN-05** (loop-safe) | Covered by `TC-EN-02`. |
| **NFR-EN-06** (deploy) | `build.sh` produces a committed bundle; served statically with zero runtime fetch (DevTools network tab clean of CDN). |

> **Deferred to `TEST-JAM-001`:** `NFR-EN-01` (60 fps profile) and `NFR-EN-02` (bundle
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

> `FR-EN-06/10/11` and `NFR-EN-01/02` are re-homed and traced in `TEST-JAM-001` (as `FR-J-`/`NFR-J-`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial V&V: engine-internal `TC-EN-01..11`, the `TEST-CANVAS-001` parity re-run, NFR methods (incl. the `RK-02` public-render closure check), and the traceability matrix. |
| 0.2     | 2026-05-24 | Vũ Anh | **Feature split.** Kept `TC-EN-01..09` + the core parity subset + `NFR-EN-03..06`; re-scoped `TC-EN-04` to store history-*tagging* (was undo); moved `TC-EN-10/11`, `TC-18` (undo), the full-suite-green acceptance, and `NFR-EN-01/02` verification to `TEST-JAM-001`. |
| 0.3     | 2026-06-06 | Vũ Anh | **Consolidation.** Appended `TEST-ENGINE-001` (performance benchmark report, was `05-BENCHMARK.md`) as Annex C; source file removed. |

---

## Annex C — Benchmark (was BENCH-ENGINE-001)

> **Measured results, not targets.** This annex records pan/zoom interaction performance of the
> in-house engine against **tldraw v5** on the same diagram, machine, and scenarios. It backs the
> `RK-EN-04` mitigation claim in `PLAN-ENGINE-001` and scopes the remaining work owned by
> `NFR-J-01`. FPS is hardware-dependent — treat absolute numbers as *of this run*; the **engine↔tldraw
> deltas** and the **render-count** are the durable signals. Re-measure (and update this annex) on any
> renderer/layout change.

### C.1 What & why

`RK-EN-04` (reactivity too coarse → broad re-renders → jank) drove a pan/zoom optimization: the camera
transform is written straight to the DOM container (`applyCamera`, `will-change: transform`) so pan/zoom
move the shape layer with **zero React re-renders** (`DESIGN-ENGINE-001` §8.1). This annex answers two
questions:

1. Did the optimization hold at scale, and **how does the engine compare to tldraw** — the substrate it
   replaces — under identical load?
2. Where does each renderer's curve bend, so we know what `canvas-jam` (`NFR-J-01`: culling +
   per-record reactivity) must still buy.

A non-gating regression guard locks the *render-count* invariant in CI
(`website/app/e2e/render-guard.spec.ts`). A headless cross-renderer harness (`perf-compare.spec.ts`,
`npm run test:perf`) also existed, but was **removed in canvas-jam P3 (`FR-J-04`) when tldraw was deleted**
— there is no second renderer to compare against anymore. The numbers below are archival (captured while
tldraw was still bundled behind `?engine=tldraw`).

### C.2 Method

- **Renderers, one diagram.** A generated grid of *N* `kymo-node` shapes (`box/gear/orange`, laid out
  in `horizontal` layout rows), loaded identically into the engine (`/`) and tldraw (`/?engine=tldraw`)
  via the playground's `?script=` URL. Both consume the same parsed `Diagram`.
- **Driving the camera (one update per animation frame):**
  - *Engine* — its real input path: synthetic `pointermove` (pan, on an empty point) / `wheel` (zoom)
    dispatched into `EngineCanvas`, which runs the production handler → `applyCamera`.
  - *tldraw* — it **ignores untrusted events** (`isTrusted`), so the `Editor` instance was reached
    through the React fiber tree and `editor.setCamera(...)` was called once per `requestAnimationFrame`
    — exactly what tldraw's own wheel/drag handler does each frame. The `inputs.isPanning` fast-path was
    tested and made **no difference**.
  - Both methods apply **one camera mutation per rAF**; the only asymmetry is that the engine's path
    also runs its (cheap) event handler. The dominant cost measured — compositing/painting *N* on-screen
    shapes — is identical for both.
- **Metric.** A `requestAnimationFrame` frame counter over a ~2.5 s sustained gesture → average FPS +
  worst single-frame gap. For the engine, the test-only render counter (`window.__kymoRenders`, the same
  seam the CI guard uses) records React re-renders during the gesture.
- **Scene.** Zoomed-to-fit, so **all *N* shapes are on-screen** — see the §C.6 caveat.

### C.3 Environment

| | |
|---|---|
| Host | macOS (Apple GPU), Google Chrome with hardware acceleration, driven over CDP (`chrome-anhv`) |
| Display | 60 Hz (FPS therefore caps at ~60) |
| Build | committed `website/app/kymo.bundle.js` (minified), served by `http-server` |
| tldraw | v5 (bundled behind `engine/adapter`) |
| Date | 2026-05-24 |

> Headless CI (SwiftShader, no GPU) is **not** used here — it is paint-bound and unrepresentative, which
> is exactly why CI gates on render-count, not FPS.

### C.4 Results

Average FPS (higher is better) · worst-frame ms · engine React re-renders. Five shape counts, both
scenarios, real GPU. Engine **re-renders = 0 at every N**.

#### C.4.1 Pan

| N | Engine fps | Engine worst | re-renders | tldraw fps | tldraw worst | engine÷tldraw |
|----:|:------:|:------:|:--:|:------:|:------:|:--:|
| 75   | **60** | 17.6 ms | 0 | 58 | 33 ms  | 1.0× |
| 150  | **60** | 17.6 ms | 0 | 28 | 51 ms  | 2.1× |
| 300  | **52** | 133 ms  | 0 | 15 | 84 ms  | 3.5× |
| 600  | **35** | 83 ms   | 0 | 8  | 150 ms | 4.4× |
| 1000 | **21** | 100 ms  | 0 | 8  | 150 ms | 2.6× |

#### C.4.2 Zoom

| N | Engine fps | Engine worst | re-renders | tldraw fps | tldraw worst | engine÷tldraw |
|----:|:------:|:------:|:--:|:------:|:------:|:--:|
| 75   | **60** | 17.7 ms | 0 | 47 | 83 ms  | 1.3× |
| 150  | **60** | 17.7 ms | 0 | 28 | 83 ms  | 2.1× |
| 300  | **56** | 118 ms  | 0 | 16 | 199 ms | 3.5× |
| 600  | **37** | 100 ms  | 0 | 10 | 150 ms | 3.7× |
| 1000 | **21** | 200 ms  | 0 | 9  | 484 ms | 2.3× |

tldraw's 300-pan re-measured ×3 → 14/16/16 (stable). Driving validated at small N (tldraw is healthy
at ≤75), so the collapse is real scaling, not a broken method.

#### C.4.3 Small-N anchor (headless, different method)

For reference, the headless `perf-compare.spec.ts` at the AIQ sample (~43 shapes) shows **parity** —
both renderers pin ~60 fps on pan and zoom, engine pan = 0 re-renders. (Headless ⇒ relative only; listed
for the trend, not the absolute.)

#### C.4.4 Drag-at-high-N — per-record reactivity (`canvas-jam` P4, 2026-05-24)

The §C.4.1–C.4.2 sweep measured **pan/zoom** (0 re-renders). **Drag** is the case that *does* re-render
(`RK-EN-04`): pre-P4 a node drag re-rendered the **whole** shape list every frame; `canvas-jam` P4
(`NFR-J-01`) refines this to **per-record reactivity** — only the dragged shape's wrapper re-renders.
Method: real GPU, drag one mid-grid node ~2.5 s (one `updateShape` per rAF) after a 1.5 s settle +
600 ms warm-up; **median** = steady-state frame, **avg** over the gesture. Engine-only (tldraw gone).

| N | OLD (parent-wide) avg · median · re-rendered/move | NEW (per-record) avg · median · re-rendered/move |
|----:|:--|:--|
| 300 | 49 fps · 17 ms · **all 300** | **59 fps** · 17 ms · **1** (the dragged node) |
| 600 | 27 fps · **33 ms (30 fps)** · **all 600** | **40 fps** · **17 ms (60 fps)** · **1** |

Per-record drops the per-frame React reconciliation from **O(N) → O(1)** (verified: the test seam
`window.__kymoRenderedIds` contains exactly the dragged id at both N). The practical payoff is the
**median**: at 600 shapes the drag holds **60 fps** where the parent-wide build halved to 30 fps. At the
`NFR-J-01` reference workload (AIQ, 19 nodes) both are 60 fps — per-record's benefit is at scale. The
*absolute* ceiling at extreme N is still **paint-bound** (dragging a shape re-rasters the one shape
layer), which is the **culling** lever — deliberately **deferred** in P4 (§C.6: culling would re-introduce
pan-time re-renders, regressing the headline 0-re-render pan win, for an off-screen case kymo rarely hits).

### C.5 Analysis

#### C.5.1 Both scale ~linearly in N — but the engine's slope is ~5× lower

Converting FPS → frame time (`ms = 1000/fps`) and fitting the curve:

- **Engine** (fit 300→1000, past the vsync cap): **~0.04 ms added per shape per frame**. Its cost is
  **100% GPU paint/composite** — re-renders are **0 at every N**, so the `RK-EN-04` decoupling holds at
  all scales; the only N-dependence is compositing a larger layer.
- **tldraw** (fit 75→300): **~0.22 ms per shape per frame — ~5× steeper**. Its per-frame reactive/cull
  bookkeeping (JS, on the CPU) dominates, on top of the same paint. tldraw *does* use a CSS transform
  for the camera (its shape layer carries `scale() translate()`), but the JS work, not the transform,
  is the bottleneck.

#### C.5.2 Interactive head-room (the practical takeaway)

| Threshold | Engine holds up to | tldraw holds up to |
|-----------|:------------------:|:------------------:|
| 60 fps (buttery) | ~200 shapes | ~75 shapes |
| ≥ 30 fps (usable) | **~700 shapes** | **~145 shapes** |

→ at an interactive frame rate the engine carries **~5× more shapes**. The FPS ratio widens from parity
(75) to **~4.4×** at 600, then narrows at **N = 1000** because tldraw **plateaus at ~8 fps** (a floor /
partial culling / render-throttle) while the engine keeps a clean ~21 fps.

#### C.5.3 Failure shape

Engine = **low mean, periodic spikes** (worst 100–200 ms — large-layer re-raster / GC; **not** React,
since re-renders = 0). tldraw = **steady-slow** with severe spikes at scale (zoom worst **484 ms** at
1000). At N = 1000 the engine is still interactive (21 fps) where tldraw is unusable (8–9 fps).

### C.6 Caveat — this is tldraw's worst case (read fairly)

All shapes are **on-screen** (zoomed-to-fit), so tldraw's **viewport culling — its whole scaling
strategy — buys nothing**: it must process every shape every frame. The engine **has no culling yet**
(it always renders all *N*), so its per-frame cost is just one composited transform and it wins this
scenario outright. On a large board where most content is scrolled off-screen, tldraw culls and would
close much of the gap, and the engine — until it culls — would lose that scenario. Concretely:

- **The on-screen pan/zoom win is real and is the point of `RK-EN-04`.**
- **The off-screen / very-large-board case needs the engine's missing lever:** viewport culling +
  per-record reactivity (for drag-at-high-N and huge initial mounts). That is `NFR-J-01`, owned by
  `PLAN-JAM-001`.

### C.7 Reproduce

1. Serve the app: from `website/app`, `npx http-server . -p 4317 -c-1 -s`.
2. In the playground textarea, load a grid of *N* nodes — *N* `<id> box/gear/orange "…" "…"` leaf lines
   plus `horizontal pos (x,y) gap g {` rows (members on the line **after** the `{`; the layout head must
   end in `{` — single-line `{ … }` does **not** parse). The app encodes this into a shareable
   `?script=` URL; reload it to mount the diagram fresh (the engine board builds shapes on mount).
3. Engine = default; tldraw = add `&engine=tldraw`. Drive one camera update per `requestAnimationFrame`
   for ~2.5 s and count frames (engine via dispatched pointer/wheel; tldraw via `editor.setCamera`).

> **Note (P3):** tldraw and the `?engine=tldraw` opt-out were removed (`FR-J-04`), so this comparison is
> no longer reproducible against a live tldraw — re-pin tldraw via `git revert` of the P3 removal to re-run.

### C.8 Conclusions & traceability

| Finding | Backs |
|---------|-------|
| Engine pan/zoom = **0 React re-renders at every N (75→1000)** — cost is pure GPU paint, ~0.04 ms/shape | `RK-EN-04` mitigation (`PLAN-ENGINE-001`); `DESIGN-ENGINE-001` §8.1 |
| Both scale ~linearly but tldraw's slope is **~5× steeper** (~0.22 ms/shape) → engine sustains ≥30 fps to ~700 shapes vs tldraw ~145 | the vendor-independence + performance case for the in-house engine |
| **Drag** pre-P4 re-rendered all *N* shapes/frame; `canvas-jam` P4 per-record reactivity makes it re-render **only the dragged shape** → drag median holds 60 fps to ≥600 (§C.4.4) | `NFR-J-01` (`PLAN-JAM-001`) — `RK-EN-04` tail closed |
| Extreme-N absolute ceiling stays paint-bound (engine cost ∝ painted *N*); viewport **culling deferred** (counterproductive for kymo's all-on-screen workload — would regress the 0-re-render pan) | `NFR-J-01` (`PLAN-JAM-001`) — culling open/deferred |

**Done (P4, §C.4.4):** the drag-at-high-N run — per-record reactivity landed; drag re-render scope is now
O(1). **Still open (deferred):** the sweep **with culling enabled** for the off-screen/large-board case
(culling is `NFR-J-01`-`MAY` and was deferred in P4 as net-negative for on-screen workloads — see §C.6).

---
title: In-House Canvas Engine — Performance Benchmark Report
document_id: BENCH-ENGINE-001
version: "0.2"
issue_date: 2026-05-24
status: Draft
classification: Internal
audience: Engineers evaluating the engine vs tldraw at scale; reviewers
owner: diagrams/ project
review_cycle: On renderer/layout change, or when a new scale point is measured
supersedes: null
related_documents:
  - INTRO-ENGINE-001
  - FEAT-ENGINE-001
  - DESIGN-ENGINE-001
  - TEST-ENGINE-001
  - PLAN-ENGINE-001
  - PLAN-JAM-001
authors:
  - Vũ Anh
language: en
keywords:
  - benchmark
  - performance
  - fps
  - pan-zoom
  - render-count
  - tldraw-comparison
  - canvas-engine
---

# In-House Canvas Engine — Performance Benchmark Report

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | BENCH-ENGINE-001                                                  |
| Version           | 0.2                                                               |
| Status            | Draft                                                             |
| Owner             | `diagrams/` project                                              |
| Related Documents | `FEAT-ENGINE-001` (NFRs), `DESIGN-ENGINE-001` (camera/render design), `TEST-ENGINE-001` (V&V), `PLAN-ENGINE-001` (risk `RK-EN-04`), `PLAN-JAM-001` (the footprint pass `NFR-J-01`) |

> **Measured results, not targets.** This report records pan/zoom interaction performance of the
> in-house engine against **tldraw v5** on the same diagram, machine, and scenarios. It backs the
> `RK-EN-04` mitigation claim in `PLAN-ENGINE-001` and scopes the remaining work owned by
> `NFR-J-01`. FPS is hardware-dependent — treat absolute numbers as *of this run*; the **engine↔tldraw
> deltas** and the **render-count** are the durable signals. Re-measure (and bump the version) on any
> renderer/layout change.

---

## 1. What & why

`RK-EN-04` (reactivity too coarse → broad re-renders → jank) drove a pan/zoom optimization: the camera
transform is written straight to the DOM container (`applyCamera`, `will-change: transform`) so pan/zoom
move the shape layer with **zero React re-renders** (`DESIGN-ENGINE-001` §8.1). This report answers two
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

## 2. Method

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
- **Scene.** Zoomed-to-fit, so **all *N* shapes are on-screen** — see the §5 caveat.

## 3. Environment

| | |
|---|---|
| Host | macOS (Apple GPU), Google Chrome with hardware acceleration, driven over CDP (`chrome-anhv`) |
| Display | 60 Hz (FPS therefore caps at ~60) |
| Build | committed `website/app/kymo.bundle.js` (minified), served by `http-server` |
| tldraw | v5 (bundled behind `engine/adapter`) |
| Date | 2026-05-24 |

> Headless CI (SwiftShader, no GPU) is **not** used here — it is paint-bound and unrepresentative, which
> is exactly why CI gates on render-count, not FPS (`TEST-ENGINE-001`).

## 4. Results

Average FPS (higher is better) · worst-frame ms · engine React re-renders. Five shape counts, both
scenarios, real GPU. Engine **re-renders = 0 at every N**.

### 4.1 Pan

| N | Engine fps | Engine worst | re-renders | tldraw fps | tldraw worst | engine÷tldraw |
|----:|:------:|:------:|:--:|:------:|:------:|:--:|
| 75   | **60** | 17.6 ms | 0 | 58 | 33 ms  | 1.0× |
| 150  | **60** | 17.6 ms | 0 | 28 | 51 ms  | 2.1× |
| 300  | **52** | 133 ms  | 0 | 15 | 84 ms  | 3.5× |
| 600  | **35** | 83 ms   | 0 | 8  | 150 ms | 4.4× |
| 1000 | **21** | 100 ms  | 0 | 8  | 150 ms | 2.6× |

### 4.2 Zoom

| N | Engine fps | Engine worst | re-renders | tldraw fps | tldraw worst | engine÷tldraw |
|----:|:------:|:------:|:--:|:------:|:------:|:--:|
| 75   | **60** | 17.7 ms | 0 | 47 | 83 ms  | 1.3× |
| 150  | **60** | 17.7 ms | 0 | 28 | 83 ms  | 2.1× |
| 300  | **56** | 118 ms  | 0 | 16 | 199 ms | 3.5× |
| 600  | **37** | 100 ms  | 0 | 10 | 150 ms | 3.7× |
| 1000 | **21** | 200 ms  | 0 | 9  | 484 ms | 2.3× |

tldraw's 300-pan re-measured ×3 → 14/16/16 (stable). Driving validated at small N (tldraw is healthy
at ≤75), so the collapse is real scaling, not a broken method.

### 4.3 Small-N anchor (headless, different method)

For reference, the headless `perf-compare.spec.ts` at the AIQ sample (~43 shapes) shows **parity** —
both renderers pin ~60 fps on pan and zoom, engine pan = 0 re-renders. (Headless ⇒ relative only; listed
for the trend, not the absolute.)

### 4.4 Drag-at-high-N — per-record reactivity (`canvas-jam` P4, 2026-05-24)

The §4.1–4.2 sweep measured **pan/zoom** (0 re-renders). **Drag** is the case that *does* re-render
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
layer), which is the **culling** lever — deliberately **deferred** in P4 (§6: culling would re-introduce
pan-time re-renders, regressing the headline 0-re-render pan win, for an off-screen case kymo rarely hits).

## 5. Analysis

### 5.1 Both scale ~linearly in N — but the engine's slope is ~5× lower

Converting FPS → frame time (`ms = 1000/fps`) and fitting the curve:

- **Engine** (fit 300→1000, past the vsync cap): **~0.04 ms added per shape per frame**. Its cost is
  **100% GPU paint/composite** — re-renders are **0 at every N**, so the `RK-EN-04` decoupling holds at
  all scales; the only N-dependence is compositing a larger layer.
- **tldraw** (fit 75→300): **~0.22 ms per shape per frame — ~5× steeper**. Its per-frame reactive/cull
  bookkeeping (JS, on the CPU) dominates, on top of the same paint. tldraw *does* use a CSS transform
  for the camera (its shape layer carries `scale() translate()`), but the JS work, not the transform,
  is the bottleneck.

### 5.2 Interactive head-room (the practical takeaway)

| Threshold | Engine holds up to | tldraw holds up to |
|-----------|:------------------:|:------------------:|
| 60 fps (buttery) | ~200 shapes | ~75 shapes |
| ≥ 30 fps (usable) | **~700 shapes** | **~145 shapes** |

→ at an interactive frame rate the engine carries **~5× more shapes**. The FPS ratio widens from parity
(75) to **~4.4×** at 600, then narrows at **N = 1000** because tldraw **plateaus at ~8 fps** (a floor /
partial culling / render-throttle) while the engine keeps a clean ~21 fps.

### 5.3 Failure shape

Engine = **low mean, periodic spikes** (worst 100–200 ms — large-layer re-raster / GC; **not** React,
since re-renders = 0). tldraw = **steady-slow** with severe spikes at scale (zoom worst **484 ms** at
1000). At N = 1000 the engine is still interactive (21 fps) where tldraw is unusable (8–9 fps).

## 6. Caveat — this is tldraw's worst case (read fairly)

All shapes are **on-screen** (zoomed-to-fit), so tldraw's **viewport culling — its whole scaling
strategy — buys nothing**: it must process every shape every frame. The engine **has no culling yet**
(it always renders all *N*), so its per-frame cost is just one composited transform and it wins this
scenario outright. On a large board where most content is scrolled off-screen, tldraw culls and would
close much of the gap, and the engine — until it culls — would lose that scenario. Concretely:

- **The on-screen pan/zoom win is real and is the point of `RK-EN-04`.**
- **The off-screen / very-large-board case needs the engine's missing lever:** viewport culling +
  per-record reactivity (for drag-at-high-N and huge initial mounts). That is `NFR-J-01`, owned by
  `PLAN-JAM-001`.

## 7. Reproduce

1. Serve the app: from `website/app`, `npx http-server . -p 4317 -c-1 -s`.
2. In the playground textarea, load a grid of *N* nodes — *N* `<id> box/gear/orange "…" "…"` leaf lines
   plus `horizontal pos (x,y) gap g {` rows (members on the line **after** the `{`; the layout head must
   end in `{` — single-line `{ … }` does **not** parse). The app encodes this into a shareable
   `?script=` URL; reload it to mount the diagram fresh (the engine board builds shapes on mount).
3. Engine = default; tldraw = add `&engine=tldraw`. Drive one camera update per `requestAnimationFrame`
   for ~2.5 s and count frames (engine via dispatched pointer/wheel; tldraw via `editor.setCamera`).

> **Note (P3):** tldraw and the `?engine=tldraw` opt-out were removed (`FR-J-04`), so this comparison is
> no longer reproducible against a live tldraw — re-pin tldraw via `git revert` of the P3 removal to re-run.

## 8. Conclusions & traceability

| Finding | Backs |
|---------|-------|
| Engine pan/zoom = **0 React re-renders at every N (75→1000)** — cost is pure GPU paint, ~0.04 ms/shape | `RK-EN-04` mitigation (`PLAN-ENGINE-001`); `DESIGN-ENGINE-001` §8.1 |
| Both scale ~linearly but tldraw's slope is **~5× steeper** (~0.22 ms/shape) → engine sustains ≥30 fps to ~700 shapes vs tldraw ~145 | the vendor-independence + performance case for the in-house engine (`INTRO-ENGINE-001`) |
| **Drag** pre-P4 re-rendered all *N* shapes/frame; `canvas-jam` P4 per-record reactivity makes it re-render **only the dragged shape** → drag median holds 60 fps to ≥600 (§4.4) | `NFR-J-01` (`PLAN-JAM-001`) — `RK-EN-04` tail closed |
| Extreme-N absolute ceiling stays paint-bound (engine cost ∝ painted *N*); viewport **culling deferred** (counterproductive for kymo's all-on-screen workload — would regress the 0-re-render pan) | `NFR-J-01` (`PLAN-JAM-001`) — culling open/deferred |

**Done (P4, §4.4):** the drag-at-high-N run — per-record reactivity landed; drag re-render scope is now
O(1). **Still open (deferred):** the sweep **with culling enabled** for the off-screen/large-board case
(culling is `NFR-J-01`-`MAY` and was deferred in P4 as net-negative for on-screen workloads — see §6).

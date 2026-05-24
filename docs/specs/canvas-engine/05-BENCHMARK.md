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
  - PLAN-FIGJAM-001
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
| Related Documents | `FEAT-ENGINE-001` (NFRs), `DESIGN-ENGINE-001` (camera/render design), `TEST-ENGINE-001` (V&V), `PLAN-ENGINE-001` (risk `RK-EN-04`), `PLAN-FIGJAM-001` (the footprint pass `NFR-FJ-01`) |

> **Measured results, not targets.** This report records pan/zoom interaction performance of the
> in-house engine against **tldraw v5** on the same diagram, machine, and scenarios. It backs the
> `RK-EN-04` mitigation claim in `PLAN-ENGINE-001` and scopes the remaining work owned by
> `NFR-FJ-01`. FPS is hardware-dependent — treat absolute numbers as *of this run*; the **engine↔tldraw
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
2. Where does each renderer's curve bend, so we know what `canvas-figjam` (`NFR-FJ-01`: culling +
   per-record reactivity) must still buy.

A non-gating regression guard already locks the *render-count* invariant in CI
(`website/app/e2e/render-guard.spec.ts`); a headless cross-renderer harness lives alongside it
(`website/app/e2e/perf-compare.spec.ts`, `@perf`, run via `npm run test:perf`). The numbers below are
the **real-GPU** companion to that headless harness.

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
  per-record reactivity (for drag-at-high-N and huge initial mounts). That is `NFR-FJ-01`, owned by
  `PLAN-FIGJAM-001`.

## 7. Reproduce

1. Serve the app: from `website/app`, `npx http-server . -p 4317 -c-1 -s`.
2. In the playground textarea, load a grid of *N* nodes — *N* `<id> box/gear/orange "…" "…"` leaf lines
   plus `horizontal pos (x,y) gap g {` rows (members on the line **after** the `{`; the layout head must
   end in `{` — single-line `{ … }` does **not** parse). The app encodes this into a shareable
   `?script=` URL; reload it to mount the diagram fresh (the engine board builds shapes on mount).
3. Engine = default; tldraw = add `&engine=tldraw`. Drive one camera update per `requestAnimationFrame`
   for ~2.5 s and count frames (engine via dispatched pointer/wheel; tldraw via `editor.setCamera`).

The headless, repeatable version of this comparison is `npm run test:perf`
(`website/app/e2e/perf-compare.spec.ts`).

## 8. Conclusions & traceability

| Finding | Backs |
|---------|-------|
| Engine pan/zoom = **0 React re-renders at every N (75→1000)** — cost is pure GPU paint, ~0.04 ms/shape | `RK-EN-04` mitigation (`PLAN-ENGINE-001`); `DESIGN-ENGINE-001` §8.1 |
| Both scale ~linearly but tldraw's slope is **~5× steeper** (~0.22 ms/shape) → engine sustains ≥30 fps to ~700 shapes vs tldraw ~145 | the vendor-independence + performance case for the in-house engine (`INTRO-ENGINE-001`) |
| Off-screen/large-board scaling still needs culling + per-record reactivity (engine cost ∝ painted N) | `NFR-FJ-01` (`PLAN-FIGJAM-001`) |

**Next scale point to measure:** the same sweep **with culling enabled** once `canvas-figjam` lands, and
a drag-at-high-N run (drag still re-renders by design — `RK-EN-04`).

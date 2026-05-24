---
title: In-House Canvas Engine — Performance Benchmark Report
document_id: BENCH-ENGINE-001
version: "0.1"
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
| Version           | 0.1                                                               |
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

Average FPS (higher is better) · worst-frame ms (lower is better) · engine React re-renders during the gesture.

### 4.1 N = 75 shapes

| Scenario | Engine | tldraw |
|----------|:------:|:------:|
| pan  | **60** fps · 17.6 ms · **0 re-renders** | 58 fps · 33.3 ms |
| zoom | **60** fps · 17.7 ms · **0 re-renders** | 47 fps · 83.3 ms |

### 4.2 N = 300 shapes

| Scenario | Engine | tldraw |
|----------|:------:|:------:|
| pan  | **52** fps · 133 ms · **0 re-renders** | **15** fps · 84 ms |
| zoom | **56** fps · 118 ms · **0 re-renders** | **16** fps · 199 ms |

tldraw's 300-shape pan was re-measured three times → **14 / 16 / 16 fps** (stable, not a fluke).

### 4.3 Small-N anchor (headless, different method)

For reference, the headless `perf-compare.spec.ts` at the AIQ sample (~43 shapes) shows **parity** —
both renderers pin ~60 fps on pan and zoom, engine pan = 0 re-renders. (Headless ⇒ relative only; listed
for the trend, not the absolute.)

## 5. Analysis

- **≤ 75 shapes: rough parity** (both ~50–60 fps). This covers typical kymo diagrams.
- **300 shapes: the engine pulls decisively ahead** — it holds **52–56 fps with 0 React re-renders**
  (pan/zoom are a pure GPU transform, the `RK-EN-04` fix), while tldraw collapses to **~15 fps** because
  it re-evaluates its rendering/cull pipeline on every camera change. tldraw *does* use a CSS transform
  for the camera (confirmed: its shape layer carries `scale() translate()`), but its per-frame
  reactive/cull bookkeeping dominates once many shapes are involved.
- **Failure shape differs.** The engine is mostly smooth with occasional hitches (worst frame
  117–133 ms — a GC/large-layer repaint spike); tldraw is *uniformly* slow at 300 (every frame
  ~60–80 ms). Engine = better average, rarer-but-larger hitch; tldraw = steady low rate.

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
| Pan/zoom hold 60 fps (≤75) / 52–56 fps (300) at **0 React re-renders** | `RK-EN-04` mitigation (`PLAN-ENGINE-001`); `DESIGN-ENGINE-001` §8.1 |
| Engine ≫ tldraw at 300 on-screen shapes (52–56 vs ~15 fps) | the vendor-independence + performance case for the in-house engine (`INTRO-ENGINE-001`) |
| Off-screen/large-board scaling still needs culling + per-record reactivity | `NFR-FJ-01` (`PLAN-FIGJAM-001`) |

**Next scale point to measure:** the same sweep **with culling enabled** once `canvas-figjam` lands, and
a drag-at-high-N run (drag still re-renders by design — `RK-EN-04`).

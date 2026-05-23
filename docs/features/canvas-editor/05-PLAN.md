---
title: Interactive Canvas Editor — Plan
document_id: PLAN-CANVAS-001
version: "0.3"
issue_date: 2026-05-23
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo web playground (`website/app/`) and the `packages/js` model/parser
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-CANVAS-001
  - FEAT-CANVAS-001
  - DESIGN-CANVAS-001
  - TEST-CANVAS-001
  - DSL-LANG-001
  - RES-MERMAID-D2-001
authors:
  - Vũ Anh
language: en
keywords:
  - plan
  - project-plan
  - risk-register
  - playground
  - canvas-editor
  - whiteboard
  - tldraw
  - react
  - wysiwyg
  - round-trip
  - estimation
  - story-points
---

# Interactive Canvas Editor — Plan

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | PLAN-CANVAS-001                                                 |
| Version           | 0.3                                                              |
| Issue Date        | 2026-05-23                                                       |
| Status            | Draft                                                           |
| Classification    | Internal                                                        |
| Owner             | `diagrams/` project                                             |
| Audience          | Engineers evolving the web playground (`website/app/`) and `packages/js` |
| Related Documents | `FEAT-CANVAS-001` (requirements), `DESIGN-CANVAS-001` (design), `TEST-CANVAS-001` (V&V), `DSL-LANG-001`, `RES-MERMAID-D2-001` |

> **Status note.** A *proposal / plan*, not a committed spec. It records the decision to grow the
> playground into an interactive canvas editor, the mission rationale, the phased plan, and the risk
> register. The *detailed design* lives in `DESIGN-CANVAS-001`; the *requirements* in
> `FEAT-CANVAS-001`. Phase 0 should be re-validated against the live code before starting.

---

## 1. Context

The playground (`website/app/`) is today a ~245-line vanilla-JS app: a `<textarea>` of `.kymo`
DSL on the left, a live SVG preview on the right — one-way `text → Diagram → SVG string`.

The goal is to evolve it into an **interactive canvas editor**: a freeform whiteboard (FigJam-like
whiteboarding as the inspiration) **plus** WYSIWYG editing of kymo diagrams, where the `.kymo` text
stays the **source of truth** but **canvas edits sync back to the `.kymo` file**. Constraint: stay
**single-player / static** (GitHub Pages, no backend), per the existing deploy model.

The honest framing that drives everything below: **React is the easy ~20%; the hard ~80% is the
round-trip serializer and the canvas↔model sync — both framework-independent.** Two facts from
the code force the architecture:

1. `renderSVG()` (`packages/js/src/render.ts`) returns a **monolithic SVG string** with **no
   per-element `id` / `data-*`** → you cannot hit-test or select nodes from the rendered SVG.
   The canvas must therefore be **model-driven**, not SVG-driven.
2. **No `Diagram → .kymo` serializer exists** anywhere in the repo — only one-way emitters
   (SVG / Figma / Excalidraw / WebP). "Drag a node → update the source" requires writing one
   from scratch. This is the central cost of the project.

---

## 2. Decision

**Rewrite the playground in React + TypeScript, on the `tldraw` canvas SDK — phased, not big-bang.**

- **React + TS** for the app shell: as the surface grows (toolbars, inspectors, panels, layers,
  modals), the component/state model pays off; the current vanilla approach does not scale here.
- **`tldraw`** as the canvas SDK — *not* react-flow. The user wants the *freeform whiteboard*
  half (sticky notes, freehand, frames, connectors); only tldraw ships that out of the box, and
  its custom-shape API (`ShapeUtil`) covers the *diagram* half. react-flow is node-graph-only and
  cannot do the whiteboard half. tldraw also gives pan/zoom, selection, snapping, undo/redo,
  copy/paste, and persistence for free.
- **Phased.** Port the current playground to React first (Phase 0, no tldraw) to de-risk the
  build/deploy toolchain, then layer tldraw and sync incrementally.
- **Budget the serializer, not the SDK.** tldraw integration is days; the round-trip serializer
  + two-way sync (Phase 3) is the real cost.

### 2.1 Caveats to accept up front (decision points, not blockers)

- **`.kymo` is source-of-truth for the *diagram layer only*.** Freeform whiteboard content
  (sticky notes, freehand strokes, frames) has **no representation in the DSL** (`DSL-LANG-001`
  §6) — it cannot sync to `.kymo`. It must persist in tldraw's own store. Mental model: **two
  layers** — a kymo-diagram layer (bound to `.kymo`) and a freeform layer (bound to tldraw's
  document, persisted via `persistenceKey` / exported `.tldr`).
- **tldraw licensing / watermark.** The SDK shows a "made with tldraw" watermark unless a license
  key is set (free key for many cases; business license to remove). Confirm acceptable or obtain
  a key. (Tracked as risk RK-02.)
- **Bundle size.** The committed `kymo.bundle.js` is ~222 KB today; tldraw + React push it to
  ~1–3 MB. Acceptable for a static playground, but it is a committed-in-git artifact. (RK-03.)
- **tldraw assets.** For zero-network rendering, self-host tldraw fonts/icons via `@tldraw/assets`
  copied into `website/` (else it fetches from a CDN).
- **DSL v3 watch-out.** The mooted v3 direction (indentation / CSS-cascade styling) is **not yet
  in `docs/`**. If v3 lands, the serializer's *output grammar* changes. Coordinate with
  `DSL-LANG-001`. (RK-04.)

---

## 3. Architecture (overview)

The full engineering design — module interfaces, the kymo↔tldraw mapping, the custom shape, the
sync engine, and the serializer — is specified in **`DESIGN-CANVAS-001`**. The overview:

```
website/app/
├── package.json          # NEW devDeps: react, react-dom, @tldraw/tldraw, @tldraw/assets, esbuild, typescript
├── build.sh              # UPDATED: npm ci → esbuild src/main.tsx (JSX auto) → committed kymo.bundle.js
├── index.html            # <div id="root">; loads kymo.bundle.js (module) + tldraw.css
├── src/
│   ├── main.tsx                  # React root render
│   ├── App.tsx                   # layout: <SourcePanel/> | <Board/> + top bar (Share) + bottom toolbelt
│   ├── Board.tsx                 # wraps <Tldraw/>; registers KymoNode shape; owns sync wiring
│   ├── SourcePanel.tsx           # .kymo text editor (textarea / CodeMirror); two-way bound
│   ├── kymo-sync/
│   │   ├── diagramToShapes.ts    # Diagram → tldraw shapes (diagram layer only)  [text→canvas]
│   │   ├── shapesToDsl.ts        # tldraw shapes → .kymo text  ← THE SERIALIZER  [canvas→text]
│   │   └── KymoNodeShapeUtil.tsx # custom ShapeUtil; renders one kymo node as SVG via getIcon()
│   ├── share.ts                  # PORT existing deflate-raw + base64url ?script= sharing (keep link compat)
│   └── samples.ts                # inlined samples via esbuild text loader (.kymo / .bpmn)
```

**Reused as-is from `packages/js` (`src/index.ts`):** `parseDiagram`, `parseBpmn`, `renderSVG`,
`setManifest`, `setIconBaseURL`, `getIcon`, and the `Diagram` / `Component` / `Region` / `Edge`
types. The model carries **resolved absolute `pos` / `bounds` / `via`** after `parseDiagram` —
exactly what a model-driven canvas needs.

### 3.1 The crux — `shapesToDsl` (Diagram → `.kymo`)

`DSL-LANG-001` §6 already provides every construct the serializer needs (leaf `@ (x,y)`; regions +
`contains`; edge `src=`/`dst=`/`via=`). Two tiers: **Tier 1 (regenerate)** — simple but lossy (drops
comments / layout frames / parent-relative placement); **Tier 2 (surgical patch)** — retain source
spans, rewrite only changed tokens, preserve structure. Full algorithm in `DESIGN-CANVAS-001` §8.

---

## 4. Phased plan

Value lands early; the risky serializer is isolated to Phase 3.

| Phase | Goal | Serializer needed? |
|-------|------|--------------------|
| **0 — React/TS scaffold** | Stand up `package.json` + `build.sh` (esbuild bundles `.tsx`, automatic JSX) and **port the current playground 1:1 to React** (editor + SVG preview + toolbelt + `?script=` sharing). Byte-equivalent behavior, committed bundle, deploy unchanged. De-risks the toolchain against the static / committed-bundle pipeline. | No |
| **1 — tldraw board, diagram embedded (one-way)** | Replace the preview pane with `<Tldraw>`. Render the kymo SVG as **one image / embed shape** on the board. Immediately get pan/zoom + sticky notes + freehand around the diagram. Editing still via text. Delivers the whiteboard+diagram combo first. | No |
| **2 — per-node mapping (canvas mirrors the model)** | Implement `diagramToShapes` + `KymoNodeShapeUtil` so each Component / Region / Edge is a real tldraw shape; selection / inspection on canvas. Still text-as-source for *editing*. | No |
| **3 — round-trip (drag → `.kymo`)** | Implement `shapesToDsl` (3a regenerate → 3b surgical patch + parser spans) and two-way binding with the loop guard. **The "sync with file" milestone.** | **Yes** |
| **4 — polish** | Freeform-layer persistence (`persistenceKey` / `.tldr`), undo/redo across both layers, animated-WebP export hook, icon palette / drag-in. | — |

---

## 5. Project plan

Single-maintainer OSS project — effort is **relative sizing**: T-shirt (S/M/L/XL) plus **story
points** (`SP`, see §5.1), not committed dates. Phases are sequential; **Phase 3 (the serializer) is
the critical path**.

| Phase | Exit criteria (milestone) | Entry criteria | Effort | SP | Depends on | Owner |
|-------|---------------------------|----------------|--------|----|------------|-------|
| 0 | Playground ported 1:1 to React; bundle committed; deploy unchanged; e2e parity verified | current playground stable | M | 8 | — | Vũ Anh |
| 1 | tldraw board live; kymo SVG embedded; pan/zoom + sticky notes work; freeform persists | P0 done; **tldraw license decided (RK-02)** | M | 5 | P0 | Vũ Anh |
| 2 | Each Component/Region/Edge is a selectable tldraw shape; inspector reads model | P1 done | L | 13 | P1 | Vũ Anh |
| 3a | Tier-1 `shapesToDsl`; drag → `.kymo` updates (lossy) | P2 done | L | 8 | P2 | Vũ Anh |
| 3b | Tier-2 surgical patch; comments/structure byte-preserved | P3a done; **`dsl.ts` source-span change merged** | XL | 13 | P3a, parser spans | Vũ Anh |
| 4 | Persistence + undo across layers; WebP export; icon palette | P3 done | M | 8 | P3 | Vũ Anh |

**Sequencing:** `P0 → P1 → P2 → P3a → P3b → P4`. Gate before P1: resolve RK-02. Gate before P3b:
land the additive parser-span change (`DESIGN-CANVAS-001` §9) behind passing golden tests.

### 5.1 Complexity & sizing (story points)

Relative story points (Fibonacci); one experienced dev. The §5 `SP` column is **phase-specific**;
cross-cutting work (sync-engine hardening, V&V/test harness) adds the remainder, reconciling the
phase subtotal (55) to the total below.

| Work item | Phase | SP | Complexity driver |
|-----------|-------|----|-------------------|
| React/TS scaffold + 1:1 port + build pipeline + `?script=` | P0 | 8 | toolchain risk, parity, committed bundle |
| tldraw board + SVG embed + self-host assets + license | P1 | 5 | integration/config, little logic |
| `diagramToShapes` + `KymoNodeShapeUtil` (custom shape, async icons) | P2 | 13 | custom render + model↔shape mapping |
| Sync engine: text→canvas diff + canvas→text + loop guard | P2–P3 | 8 | stateful, race-prone |
| Serializer Tier-1 (`Diagram → .kymo`) | P3a | 8 | cover all element types, ordering, rounding |
| Serializer Tier-2 surgical patch + `dsl.ts` source-spans | P3b | 13 | parser change, golden-safe, byte preservation |
| Polish: persistence / undo / WebP / icon palette | P4 | 8 | breadth |
| V&V build-out (unit + integration + e2e via chrome MCP) | all | 5 | test infrastructure |
| **Total** | | **≈ 68** | **Complexity: High** |

- **Confidence:** range **55–85 SP**; widest variance is the **Tier-2 serializer** (8→21 alone) and
  the **sync loop-guard**.
- **Risk concentration:** P2 + sync + P3 ≈ **57 %** of points — the canvas mapping + round-trip
  serializer are the hard core (`DESIGN-CANVAS-001` §7–§9). **Critical path: P3b** (gated on the
  parser-span change).
- **T-shirt ↔ SP key:** S ≈ 2–3 · M ≈ 5–8 · L ≈ 13 · XL ≈ 13–20.

---

## 6. Risk register

Likelihood / impact are qualitative (Low / Med / High).

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Status |
|----|------|-----------|--------|------------|-------|--------|
| RK-01 | Tier-1 serializer is lossy (drops comments / layout frames / parent-relative placement) → degrades `.kymo` authoring | High | High | Ship Tier-2 surgical patch (`DESIGN-CANVAS-001` §8.2); isolate serializer output behind one module | Vũ Anh | Open |
| RK-02 | tldraw watermark / license terms unacceptable for the OSS site | Med | Med | Evaluate free license key; else accept watermark; **decide before Phase 1** | Vũ Anh | Open |
| RK-03 | Committed bundle grows to ~1–3 MB → repo bloat / slower first load | Med | Med | Lazy-load tldraw; monitor bundle diff; enforce footprint NFR (`FEAT-CANVAS-001`) | Vũ Anh | Open |
| RK-04 | DSL v3 (CSS-cascade) lands mid-build → serializer must re-target grammar | Med | High | Isolate grammar-output module; coordinate with `DSL-LANG-001` owner | Vũ Anh | Open |
| RK-05 | Sync feedback loop (A→B→A oscillation) corrupts text or canvas | Med | High | `epoch` token + `applying` flag + tldraw `source:'user'` filter (`DESIGN-CANVAS-001` §7) | Vũ Anh | Mitigated by design |
| RK-06 | Dragging a node replaces declarative placement (`@ parent side gap`) with `@ (x,y)` | Med | Low | Tier-2 keeps parent-ref for unmoved nodes; optional "re-flow" (Annex B) | Vũ Anh | Open |

---

## 7. Files to create / modify

- **New:** `website/app/package.json`, `website/app/src/*` (per §3), `website/app/.gitignore`
  (node_modules), self-hosted tldraw assets directory.
- **Modify:** `website/app/build.sh` (npm ci + esbuild tsx + asset copy), `website/app/index.html`
  (React root + tldraw CSS), and commit the regenerated `kymo.bundle.js`.
- **Possibly modify (Phase 3b):** `packages/js/src/dsl.ts` to retain source spans — **additive**;
  must not change `parseDiagram` output (guard the byte-for-byte golden SVG tests).
- **Unchanged:** `.github/workflows/deploy-website.yml` (still uploads `website/` as-is — the
  committed bundle is what deploys; **no CI build**); `website/index.html` (landing page is
  independent of `/app/`).

---

## 8. Verification

Detailed test cases + traceability are in `TEST-CANVAS-001`. At the plan level:

- **Toolchain / deploy (Phase 0):** `cd website/app && ./build.sh` produces a committed
  `kymo.bundle.js`; serve `python3 -m http.server --directory website 8000` and confirm at
  `http://localhost:8000/app/` (drive via the chrome-anhv MCP) that editor + preview + theme
  toggle + Share link + `?script=` round-trip all still work.
- **Phase 1+:** screenshot the board — pan/zoom, drop a sticky note, confirm the diagram embed
  renders; verify freeform shapes persist on reload but never leak into `.kymo`.
- **Phase 3 (round-trip):** drag a node on canvas → assert the `.kymo` text updates and
  `parseDiagram(updated)` reproduces the moved position (idempotent A→text→A); for Tier 2, assert
  comments and untouched lines are byte-preserved.
- **Regression:** `cd packages/js && npm test`; if `dsl.ts` is touched, also run the Python golden
  suite (`KYMO_UPDATE_GOLDEN` only on intentional render changes) per `CLAUDE.md` to confirm no
  rendered-byte drift.

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                                                 |
|---------|------------|--------|-------------------------------------------------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial roadmap draft (as `RMAP-CANVAS-001`).                           |
| 0.2     | 2026-05-23 | Vũ Anh | Renamed Roadmap → Plan (`PLAN-CANVAS-001`); added §5 Project plan + §6 Risk register; split design into `DESIGN-CANVAS-001`, requirements into `FEAT-CANVAS-001`. |
| 0.3     | 2026-05-23 | Vũ Anh | Added §5.1 Complexity & sizing (story points); SP column in §5 (≈ 68 SP total, High). |

## Annex B — Open questions / pending decisions

1. **tldraw vs. a lighter custom canvas** if the freeform half turns out to be secondary — would
   react-flow + a thin drawing layer suffice and keep the bundle small? (See RK-03.)
2. **Serializer target grammar** — build against `DSL-LANG-001` v2.0 now, or wait for the v3
   direction to stabilise to avoid re-targeting? (See RK-04.)
3. **Auto-layout vs. manual positions** — once a node is dragged, its declarative placement
   (`@ parent side gap`) is replaced by `@ (x,y)`. Acceptable, or offer a "re-flow" that restores
   declarative layout? (See RK-06.)

---
title: In-House Canvas Engine — Implementation Plan
document_id: PLAN-ENGINE-001
version: "0.1"
issue_date: 2026-05-23
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers replacing the tldraw substrate under the canvas-editor (`website/app/`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-ENGINE-001
  - FEAT-ENGINE-001
  - DESIGN-ENGINE-001
  - TEST-ENGINE-001
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
| Version           | 0.1                                                              |
| Status            | Draft                                                           |
| Owner             | `diagrams/` project                                            |
| Related Documents | `FEAT-ENGINE-001` (requirements), `DESIGN-ENGINE-001` (design), `TEST-ENGINE-001` (V&V), `PLAN-CANVAS-001` (parent — the editor on top) |

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

## 2. Decision

**Build an in-house canvas engine behind an adapter seam; phased, not big-bang; tldraw stays until
parity.** (`DESIGN-ENGINE-001` §13.)

- **Adapter-first.** The app imports canvas primitives only from `engine/adapter`. Phase 0 makes that
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
packages/js-canvas/              # NEW workspace pkg (node --test like packages/js); MAY start as website/app/src/engine/
└── src/
    ├── store.ts        # reactive records, scoped/sourced listeners, transactions, history   (DESIGN §5)
    ├── editor.ts       # Editor facade: CRUD + run + zoomToFit + selection                   (DESIGN §6)
    ├── shape.ts        # ShapeUtil base, Rectangle2d, T validators, BaseShape                (DESIGN §7,§9)
    ├── view/           # camera, hit-test, culling, DOM render loop                          (DESIGN §8)
    ├── tools/          # select / drag / pan / zoom  (+ later: draw / sticky / text)         (DESIGN §4)
    ├── persist.ts      # IndexedDB serialize ⇄ restore                                       (DESIGN §11)
    ├── react/          # <Canvas>, HTMLContainer, useEditor, useValue                        (DESIGN §9.4)
    └── shapes-builtin/ # kymo-region / kymo-edge (or geo / arrow)                            (DESIGN §10)

website/app/src/engine/adapter.ts   # the seam: re-exports tldraw (P0) → engine (P-F)         (DESIGN §13)
```

**Reused unchanged** from `DESIGN-CANVAS-001`: `Board.tsx` sync/writeback, `KymoNodeShapeUtil`,
`KymoDiagramShapeUtil`, `Inspector`, `patchDsl`, `diagramToShapes` (minus the §10 re-point). They
import `engine/adapter`, never the engine internals (`NFR-EN-04`).

## 4. Phased plan

Value lands early (a key-free rendering board by Phase C); the FigJam authoring tools are isolated to
Phase G.

| Phase | Goal | tldraw still present? |
|-------|------|------------------------|
| **0 — Adapter seam** | Introduce `engine/adapter.ts` re-exporting the exact tldraw symbols in `DESIGN-ENGINE-001` §3 under engine names. Re-point `Board`/shapes/`Inspector`/`diagramToShapes` imports to it; drop the `@tldraw/tlschema` augmentation. **Zero behaviour change.** Establishes the swap point. | Yes (behind adapter) |
| **A — Reactive store + Editor** | `store.ts` + `editor.ts`: records, `run`/transactions, **`source`/`scope`/history** semantics (DESIGN §5–§6). Unit-tested headless (`TC-EN-01..04`). Not yet rendering. | Yes |
| **B — ShapeUtil + viewport (render)** | `shape.ts` (ShapeUtil, Rectangle2d, T), `view/` camera + DOM render, `react/` (`<Canvas>`, HTMLContainer, hooks). Render the kymo shapes **read-only** behind a `?engine=native` flag, A/B against tldraw on the same `Board`. | Yes (A/B) |
| **C — Interaction + persistence → KEY-FREE BOARD** | `tools/` select/drag/pan/zoom + `persist.ts`. The round-trip (drag→`.kymo`) and reload work on the engine. **Flip the public deploy to the engine: board renders, no key, no watermark — `RK-02` closes.** | Optional |
| **D — Built-in shapes consolidated** | Re-point `diagramToShapes` to `kymo-region`/`kymo-edge` (DESIGN §10); drop reliance on tldraw `geo`/`arrow`. | Removable |
| **E — Undo/redo + export parity** | History stack drives `TC-18`; board `toSvg` export (`FR-EN-11`). Full `TEST-CANVAS-001` parity (`TC-01..19`) green on the engine. **Remove tldraw from `package.json`; delete assets/CSS/`licenseKey`.** | **No** |
| **F — Footprint** | Measure & shrink bundle (`NFR-EN-02`); culling/perf pass (`NFR-EN-01`). | No |
| **G — FigJam authoring tools** *(post-parity)* | Freeform **draw / sticky / text** tools — the whiteboard-authoring half tldraw gave for free (`FEAT-ENGINE-001` §5). Largest chunk; sized separately once parity ships. | No |

## 5. Project plan

Single-maintainer OSS — **relative sizing** (T-shirt + story points), not dates. Phases are sequential;
**Phase A (store source-fidelity) is the correctness-critical path**; **Phase G is the largest by
effort.**

| Phase | Exit criteria (milestone) | Entry criteria | Effort | SP | Depends on |
|-------|---------------------------|----------------|--------|----|------------|
| 0 | Adapter in place; app imports only the adapter; tldraw still runs; e2e parity unchanged | canvas-editor stable | S | 3 | — |
| A | Store + Editor pass `TC-EN-01..04` headless (incl. loop-guard) | P0 | L | 13 | 0 |
| B | kymo shapes render via the engine behind `?engine=native`; visual parity | A | L | 13 | A |
| C | Drag→`.kymo` + persistence on the engine; **public board renders, no key** | B | L | 13 | B |
| D | `diagramToShapes` on custom `kymo-region`/`kymo-edge`; tldraw `geo`/`arrow` unused | C | M | 5 | C |
| E | Undo + export; **`TEST-CANVAS-001` parity green; tldraw removed** | C, D | L | 13 | C, D |
| F | Bundle measured & shrunk; 60 fps on AIQ sample | E | M | 5 | E |
| G | Freeform draw/sticky/text authoring tools | E | XL | 21 | E |

**Sequencing:** `0 → A → B → C → (D ∥ E) → F → G`. **Gate before C-flip:** `TC-EN-02` (zero-echo)
green — never ship a round-trip that can oscillate. **Gate before E tldraw-removal:** full
`TEST-CANVAS-001` parity green on the engine.

### 5.1 Complexity & sizing (story points)

| Work item | Phase | SP | Complexity driver |
|-----------|-------|----|-------------------|
| Adapter seam + import re-point | 0 | 3 | mechanical, but touches every canvas file |
| Reactive store (source/scope/history) + Editor facade | A | 13 | **the hard core** — loop-guard fidelity, transactions |
| ShapeUtil + Rectangle2d + T + camera/render + React bindings | B | 13 | render loop, signals→React, geometry |
| Tools (select/drag/pan/zoom) + IndexedDB persistence | C | 13 | pointer math, hit-test, snapshot reconcile |
| Built-in shapes consolidation (`kymo-region`/`kymo-edge`) | D | 5 | re-point one module |
| Undo/redo history + board SVG export | E | 13 | history correctness, export aggregation |
| Bundle/perf pass | F | 5 | measurement + culling |
| Freeform authoring tools (draw/sticky/text) | G | 21 | **the FigJam half** — breadth |
| V&V build-out (`TC-EN` + parity harness) | all | 5 | test infrastructure |
| **Total** | | **≈ 91** | **Complexity: High** |

- **Confidence:** range **70–120 SP**; widest variance is **Phase A** (store fidelity, 13→21) and
  **Phase G** (freeform tools, 13→34 depending on ambition).
- **Risk concentration:** A + B + C ≈ **43 %** of points (parity MVP); G alone ≈ 23 %.
- **T-shirt ↔ SP key:** S ≈ 2–3 · M ≈ 5–8 · L ≈ 13 · XL ≈ 20+.

## 6. Risk register

Likelihood / impact qualitative (Low / Med / High).

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|----|------|-----------|--------|------------|--------|
| RK-EN-01 | Store `source` fidelity slips → a programmatic apply leaks as `source:"user"` → round-trip oscillates (`RK-05` regression) | Med | High | Single `source`-tagging choke-point in `run` (DESIGN §5.3); `TC-EN-02` gates the Phase-C flip; keep `Board`'s `applyingRef` belt-and-braces until proven | Open |
| RK-EN-02 | Undo must restore node `x/y` **and** round-trip text (Phase 4b / `TC-18`) | Med | Med | History stack restores records; `Board` writeback patches text on the restore (DESIGN §14); re-run `TC-18` | Open |
| RK-EN-03 | Freeform authoring tools (draw/sticky/text) are far larger than parity — scope blowout if pulled forward | High | Med | **Sequenced last (Phase G)**; parity MVP (read/move/persist) ships first so the key-free board lands regardless | Open |
| RK-EN-04 | Reactivity too coarse (single epoch) → broad re-renders → misses 60 fps on larger boards | Med | Med | Start coarse (simplest correct); measure on AIQ sample (`NFR-EN-01`); refine to per-record atoms only if needed | Open |
| RK-EN-05 | Engine bundle not as small as hoped (own render/signals/persist code) | Low | Low | Still far below tldraw's ~2 MB; measure each phase (`NFR-EN-02`); tree-shake; target ≤ ~50 KB gzip | Open |
| RK-EN-06 | Rich-text **label editing** on `geo`/`arrow` (tldraw feature) expected by users | Low | Low | MVP renders labels read-only (text stays source-of-truth via `.kymo`); inline edit deferred to a backlog item | Open |
| RK-EN-07 | `RK-07` embed-blank regression if culling unmounts the diagram `<img>` | Low | Med | Preserve the data-URL `<img>` cache (DESIGN §8.2); re-run `TC-19` | Open |
| RK-02 *(parent)* | No-key tldraw blanks the public board | — | — | **Closed by this effort** at Phase E (tldraw removed → no key needed) | Closing |

## 7. Files to create / modify

- **New:** `packages/js-canvas/` (or `website/app/src/engine/`) per §3 — `store.ts`, `editor.ts`,
  `shape.ts`, `view/`, `tools/`, `persist.ts`, `react/`, `shapes-builtin/`; plus
  `website/app/src/engine/adapter.ts` (the seam).
- **Modify (import path only, + drop `tlschema` augmentation):** `Board.tsx`, `KymoNodeShape.tsx`,
  `KymoDiagramShape.tsx`, `Inspector.tsx`, `diagramToShapes.ts` (the last also re-pointed to custom
  shapes in Phase D).
- **Modify (Phase E):** `website/app/package.json` (remove `tldraw`, `@tldraw/assets`), `build.sh`
  (drop asset copy), `Board.tsx` (remove `licenseKey`, `tldraw/tldraw.css`); regenerate & commit
  `kymo.bundle.js`.
- **Unchanged:** `packages/js/*` (the model/parser/renderer — the engine does not touch it);
  `.github/workflows/deploy-website.yml` (still uploads `website/` as-is — committed bundle, no CI
  build).

## 8. Verification

Detailed cases + traceability in `TEST-ENGINE-001`. At the plan level:

- **Phase A:** `TC-EN-01..04` headless (`node --test`) — store CRUD, **zero-echo loop-guard**, history.
- **Phase B/C:** A/B render under `?engine=native`; drag a node → `.kymo` updates; reload persists;
  freeform no-leak. E2E via chrome MCP (as in `PLAN-CANVAS-001` worklog).
- **Phase C flip:** **public-domain render check** — board renders, no watermark, no "license
  required" console error (`RK-02` closure, `NFR-EN-03`).
- **Phase E:** full `TEST-CANVAS-001` (`TC-01..19`) green on the engine; then remove tldraw.
- **Regression throughout:** `cd packages/js && npm test` stays green; `grep -r '"tldraw"'
  website/app/src` → 0 outside `engine/` (`NFR-EN-04`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial plan: decision (adapter-first, minimal, render-first), phased plan (0→A→…→G), story-point sizing (≈ 91 SP), risk register (`RK-EN-01..07`, `RK-02` closing), files, verification gates. |

## Annex B — Open questions / pending decisions

1. **Engine home** — new workspace package `packages/js-canvas` (testable, reusable) vs. start inside
   `website/app/src/engine/` and graduate later? (Lean: start in-app for the MVP, extract at Phase F.)
2. **Built-ins vs. custom** — ship tldraw-shaped `geo`/`arrow`, or re-point `diagramToShapes` to lean
   `kymo-region`/`kymo-edge` (DESIGN §10)? (Lean: custom — smaller surface. Phase D.)
3. **Reactivity granularity** — single document epoch (simplest) vs. per-record atoms (faster)?
   Decide by measuring `NFR-EN-01` (`RK-EN-04`).
4. **Freeform tool ambition (Phase G)** — minimal (pen + sticky + text) vs. richer (shapes, connectors,
   frames)? Size after parity ships; this is where the FigJam/Miro comparison really bites.
5. **A/B flag lifetime** — keep `?engine=native` as a permanent escape hatch, or delete at Phase E
   once tldraw is removed?

## Annex C — Worklog

Append-only progress log (newest at the bottom) — ISO/IEC/IEEE 12207 §6.3.2. `Status`: ✅ done ·
🚧 in progress · ⏳ pending.

| Date       | Phase / area | Work | Status | Ref |
|------------|--------------|------|--------|-----|
| 2026-05-23 | Docs | Authored the canvas-engine spec/plan doc set (`INTRO`/`FEATURE`/`DESIGN`/`TEST`/`PLAN`) — design-before-code for the tldraw replacement; surface census from `website/app/src`, adapter-seam strategy, phased plan, risk register. | ✅ | — |

**Next:** decide Annex B §1–§2 (engine home; built-ins vs custom), then execute **Phase 0** (the
adapter seam) — mechanical and zero-behaviour-change, establishing the swap point before any engine
code is written.

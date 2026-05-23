---
title: In-House Canvas Engine — Implementation Plan
document_id: PLAN-ENGINE-001
version: "0.2"
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
  - PLAN-FIGJAM-001
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
| Version           | 0.2                                                              |
| Status            | Draft                                                           |
| Owner             | `diagrams/` project                                            |
| Related Documents | `FEAT-ENGINE-001` (requirements), `DESIGN-ENGINE-001` (design), `TEST-ENGINE-001` (V&V), `PLAN-FIGJAM-001` (sibling — engine completion + FigJam authoring), `PLAN-CANVAS-001` (parent — the editor on top) |

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
- **Sibling feature — `canvas-figjam` (`PLAN-FIGJAM-001`, ≈44 SP):** *completes* the replacement
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

website/app/src/engine/adapter.ts   # the seam: re-exports tldraw (P1) → engine (this feature); tldraw deleted in canvas-figjam   (DESIGN §13)
```

**Reused unchanged** from `DESIGN-CANVAS-001`: `Board.tsx` sync/writeback, `KymoNodeShapeUtil`,
`KymoDiagramShapeUtil`, `Inspector`, `patchDsl`, `diagramToShapes` (minus the §10 re-point). They
import `engine/adapter`, never the engine internals (`NFR-EN-04`).

## 4. Phased plan

Phases are **1-based** and sized so **no phase exceeds 10 SP**. This feature ends at **Phase 7 — the
KEY-FREE BOARD**; everything after it (built-in consolidation, undo, export, tldraw removal,
footprint, FigJam authoring) is the sibling `PLAN-FIGJAM-001`.

| Phase | Goal | tldraw present? |
|-------|------|------------------|
| **1 — Adapter seam** | Introduce `engine/adapter.ts` re-exporting the exact tldraw symbols in `DESIGN-ENGINE-001` §3 under engine names. Re-point `Board`/shapes/`Inspector`/`diagramToShapes` imports to it; drop the `@tldraw/tlschema` augmentation. **Zero behaviour change.** Establishes the swap point. | Yes (behind adapter) |
| **2 — Reactive store** | `store.ts`: records, `run`/transactions, **`source`/`scope`** semantics + `history:"ignore"` tagging (DESIGN §5). The `source:"user"` choke-point — loop-guard fidelity. Unit-tested headless (`TC-EN-01..04`). | Yes |
| **3 — Editor facade** | `editor.ts`: CRUD + `run` + `zoomToFit` + selection over the store (DESIGN §6). | Yes |
| **4 — ShapeUtil + geometry** | `shape.ts` — ShapeUtil base, `Rectangle2d`, `T` validators, `BaseShape` (DESIGN §7,§9). `TC-EN-05/06`. | Yes |
| **5 — Viewport (render)** | `view/` camera + DOM render loop + cull, `react/` (`<Canvas>`, `HTMLContainer`, `useEditor`, `useValue`). Render the kymo shapes **read-only** behind a `?engine=native` flag, A/B against tldraw. | Yes (A/B) |
| **6 — Interaction** | `tools/` select / drag / pan / zoom + hit-test + selection indicator — the drag that drives canvas→text. | Yes (A/B) |
| **7 — Persistence → KEY-FREE BOARD** | `persist.ts` (IndexedDB). Round-trip (drag→`.kymo`) + reload on the engine. **Flip the public deploy to the engine: board renders, no key, no watermark — `RK-02` closes at the render level.** tldraw stays bundled behind the adapter (physically removed in `canvas-figjam`). | Yes (engine renders) |

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
the physical tldraw removal are the sibling feature's gates (`PLAN-FIGJAM-001`).

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
- **Sibling:** the remaining ≈44 SP (parity completion + FigJam authoring) are in `PLAN-FIGJAM-001`.
- **T-shirt ↔ SP key:** S ≈ 2–3 · M ≈ 5–8 · L ≈ 13 · XL ≈ 20+.

## 6. Risk register

Likelihood / impact qualitative (Low / Med / High).

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|----|------|-----------|--------|------------|--------|
| RK-EN-01 | Store `source` fidelity slips → a programmatic apply leaks as `source:"user"` → round-trip oscillates (`RK-05` regression) | Med | High | Single `source`-tagging choke-point in `run` (DESIGN §5.3); `TC-EN-02` gates the Phase-7 flip; keep `Board`'s `applyingRef` belt-and-braces until proven | Open |
| RK-EN-04 | Reactivity too coarse (single epoch) → broad re-renders → render jank | Med | Med | Start coarse (simplest correct) in Phase 5; the formal 60 fps measurement is the sibling's footprint pass (`PLAN-FIGJAM-001`) | Open |
| RK-EN-07 | `RK-07` embed-blank regression if the render loop unmounts the diagram `<img>` | Low | Med | Preserve the data-URL `<img>` cache (DESIGN §8.2); re-run `TC-19` | Open |
| RK-02 *(parent)* | No-key tldraw blanks the public board | — | — | **Closes at render level** at this feature's Phase 7 (engine renders the board, no key); **fully retired** when `canvas-figjam` physically removes tldraw | Closing |

> Risks owned by the sibling feature (`PLAN-FIGJAM-001` §6): **RK-EN-02** (undo restores `x/y` +
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
- **Owned by the sibling feature (`PLAN-FIGJAM-001`):** `engine/shapes-builtin/` (built-in
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
  the `grep -r '"tldraw"' → 0` removal check are the sibling's gates (`PLAN-FIGJAM-001` / `TEST-FIGJAM-001`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial plan: decision (adapter-first, minimal, render-first), phased plan (0→7), story-point sizing (≈ 91 SP), risk register (`RK-EN-01..07`, `RK-02` closing), files, verification gates. |
| 0.2     | 2026-05-24 | Vũ Anh | **Split at the KEY-FREE BOARD seam** to honour the ≤50-SP/feature and ≤10-SP/phase caps: this feature keeps the render/interaction core (≈42 SP); built-in consolidation, undo, export, tldraw removal, footprint and FigJam authoring spun out to `PLAN-FIGJAM-001`. Phases **renumbered 1-based** and decomposed so every phase ≤10 SP. Risks RK-EN-02/03/05/06 moved to the sibling; RK-02 now *closes at render level* here. |

## Annex B — Open questions / pending decisions

1. **Engine home** — new workspace package `packages/js-canvas` (testable, reusable) vs. start inside
   `website/app/src/engine/` and graduate later? (Lean: start in-app for the MVP, extract later.)
2. **Reactivity granularity** — single document epoch (simplest) vs. per-record atoms (faster)?
   Start coarse in Phase 5; the formal 60 fps decision is the sibling's footprint pass (`RK-EN-04`).
3. **A/B flag lifetime** — keep `?engine=native` as a permanent escape hatch, or delete once
   `canvas-figjam` removes tldraw? (Decided there.)

> Decided/moved: *built-ins vs. custom* (re-point `diagramToShapes` to `kymo-region`/`kymo-edge`) and
> *freeform tool ambition* are now the sibling feature's open questions (`PLAN-FIGJAM-001` Annex B).

## Annex C — Worklog

Append-only progress log (newest at the bottom) — ISO/IEC/IEEE 12207 §6.3.2. `Status`: ✅ done ·
🚧 in progress · ⏳ pending.

| Date       | Phase / area | Work | Status | Ref |
|------------|--------------|------|--------|-----|
| 2026-05-23 | Docs | Authored the canvas-engine spec/plan doc set (`INTRO`/`FEATURE`/`DESIGN`/`TEST`/`PLAN`) — design-before-code for the tldraw replacement; surface census from `website/app/src`, adapter-seam strategy, phased plan, risk register. | ✅ | — |
| 2026-05-24 | Docs | **Split the feature at the KEY-FREE BOARD seam** (≤50-SP/feature, ≤10-SP/phase caps): rescoped this doc-set to the render/interaction core (≈42 SP, Phases 1–7, 1-based); spun the parity-completion + FigJam-authoring half out to the new `*-FIGJAM-001` doc-set (≈44 SP). | ✅ | `PLAN-FIGJAM-001` |

**Next:** decide Annex B §1 (engine home), then execute **Phase 1** (the adapter seam) — mechanical
and zero-behaviour-change, establishing the swap point before any engine code is written.

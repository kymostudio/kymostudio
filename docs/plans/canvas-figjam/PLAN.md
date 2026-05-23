---
title: Canvas FigJam — Implementation Plan
document_id: PLAN-FIGJAM-001
version: "0.1"
issue_date: 2026-05-24
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers completing the engine + building the freeform tools (`website/app/`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-FIGJAM-001
  - FEAT-FIGJAM-001
  - DESIGN-FIGJAM-001
  - TEST-FIGJAM-001
  - PLAN-ENGINE-001
  - PLAN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - plan
  - project-plan
  - risk-register
  - canvas-figjam
  - tldraw-removal
  - freeform-authoring
  - story-points
  - worklog
---

# Canvas FigJam — Implementation Plan

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | PLAN-FIGJAM-001                                                 |
| Version           | 0.1                                                             |
| Status            | Draft                                                           |
| Owner             | `diagrams/` project                                            |
| Related Documents | `FEAT-FIGJAM-001` (requirements), `DESIGN-FIGJAM-001` (design), `TEST-FIGJAM-001` (V&V), `PLAN-ENGINE-001` (sibling — the render core; **entry gate**) |

> **Implementation plan (ISO/IEC/IEEE 12207 §6.3).** The *delivery* layer for the second half of the
> in-house canvas-engine programme: completing the tldraw replacement and adding the FigJam
> freeform-authoring tools. It *implements* the baselined spec in `docs/specs/canvas-figjam/`
> (`FEAT-FIGJAM-001`, `DESIGN-FIGJAM-001`, `TEST-FIGJAM-001`).

---

## 1. Context

The in-house canvas engine was sized at ≈ 91 SP — over the **≤ 50-SP-per-feature** cap — so it was
**split at the KEY-FREE BOARD milestone** (`PLAN-ENGINE-001` §1.1). The sibling feature
(`PLAN-ENGINE-001`, ≈ 42 SP) delivers the render/interaction core: a board that renders and
round-trips on the engine with **no license key** (`RK-02` closed at the render level), tldraw still
bundled behind the adapter.

**This feature (≈ 44 SP)** picks up there. Its **entry gate is the sibling's Phase 7 complete.** It:
1. **Completes the replacement** — consolidates the built-in shapes, adds undo/redo + board export,
   then **physically removes tldraw** and proves the **full `TEST-CANVAS-001` (`TC-01..19`)** green,
   and shrinks the bundle.
2. **Adds the FigJam half** — the freeform **draw / sticky / text** authoring tools tldraw gave for
   free (`FEAT-FIGJAM-001` §3, `DESIGN-CANVAS-001` §3 freeform layer).

## 2. Decision

**Continue the adapter-seam strategy; phased, one freeform tool per phase; tldraw removed the moment
full parity is green.** (`DESIGN-FIGJAM-001`.)

- **Parity before removal.** Consolidation → undo → export land *first*; only when the full
  `TC-01..19` is green does the tldraw-removal commit happen (never break the editor).
- **Freeform last, one tool per phase.** Draw, then sticky, then text — each a self-contained phase
  (`RK-EN-03` mitigation), so value lands incrementally and scope can stop after any of them.
- **Reuse the engine.** Store, editor, viewport, persistence, adapter (`DESIGN-ENGINE-001`) are
  reused unchanged; this feature only adds modules on top.

## 3. Architecture (overview)

Full design in **`DESIGN-FIGJAM-001`**. New/changed modules on top of the engine core:

```
packages/js-canvas/ (or website/app/src/engine/)
├── shapes-builtin/   # NEW: kymo-region / kymo-edge ShapeUtils                 (DESIGN §2, FR-FJ-01)
├── store.ts          # +history stack (undo/redo) consuming existing tags      (DESIGN §3, FR-FJ-02)
├── view/export.ts    # NEW: toSvg aggregation → SVG/PNG                         (DESIGN §4, FR-FJ-03)
└── tools/            # +draw / sticky / text tools + freeform shapes            (DESIGN §7, FR-FJ-05..07)

website/app/src/Board.tsx, package.json, build.sh   # tldraw removal             (DESIGN §5, FR-FJ-04)
```

**Reused unchanged** from `DESIGN-ENGINE-001`: the reactive store + source/history *tagging* (§5),
editor facade (§6), geometry (§7), camera/viewport/render (§8), custom-shape API (§9), persistence
(§11), adapter seam (§13). **Reused unchanged** from `DESIGN-CANVAS-001`: `patchDsl`, the sync
engine, `Board.tsx` writeback.

## 4. Phased plan

Phases are **1-based** (feature-local) and sized so **no phase exceeds 10 SP**. **Entry gate:** the
sibling's Phase 7 (key-free board) is complete.

| Phase | Goal | tldraw present? |
|-------|------|------------------|
| **1 — Built-in consolidation** | Re-point `diagramToShapes` to custom `kymo-region`/`kymo-edge` ShapeUtils (DESIGN §2); drop reliance on tldraw `geo`/`arrow`. | Removable |
| **2 — Undo/redo** | History stack consuming the store's tags (DESIGN §3); undo restores `x/y` + the `Board` writeback round-trips the text. `TC-18`/`TC-FJ-02`. | Yes |
| **3 — Export + REMOVE tldraw** | Board `toSvg` export (DESIGN §4). Full `TEST-CANVAS-001` (`TC-01..19`) green → **delete tldraw** from `package.json`/`build.sh`/`Board.tsx`; regen bundle. **`RK-02` fully retired.** | **No (removed)** |
| **4 — Footprint** | Measure & shrink bundle (`NFR-FJ-02`); culling/perf pass to ~60 fps (`NFR-FJ-01`). | No |
| **5 — Draw/pen tool** | Tool state machine + freehand `freedraw` shape (DESIGN §7, `FR-FJ-05`). | No |
| **6 — Sticky tool** | `note` shape + click-to-place + editable text (`FR-FJ-06`). | No |
| **7 — Text tool** | `text` shape + click-to-place + editable text (`FR-FJ-07`). | No |

## 5. Project plan

Single-maintainer OSS — **relative sizing** (T-shirt + story points), not dates. Phases are sequential
and **each ≤ 10 SP**; **Phase 3 is the parity gate** (full `TC-01..19` before removal); **Phases 5–7
(freeform) are the breadth.**

| Phase | Exit criteria (milestone) | Entry criteria | Effort | SP | Depends on |
|-------|---------------------------|----------------|--------|----|------------|
| 1 | `diagramToShapes` on custom `kymo-region`/`kymo-edge`; tldraw `geo`/`arrow` unused | engine P7 (key-free board) | M | 5 | engine P7 |
| 2 | Undo/redo green (`TC-FJ-02`, `TC-18`) | P1 | M | 8 | 1 |
| 3 | Export (`TC-FJ-03`); **full `TC-01..19` green; tldraw removed** (`TC-FJ-04`) | P1, P2 | M | 5 | 1, 2 |
| 4 | Bundle measured & shrunk; ~60 fps on AIQ sample | P3 | M | 5 | 3 |
| 5 | Draw/pen tool creates persisted `freedraw` (`TC-FJ-05`) | P3 | M | 8 | 3 |
| 6 | Sticky tool places editable `note` (`TC-FJ-06`) | P5 | M | 5 | 5 |
| 7 | Text tool places editable `text` (`TC-FJ-07`) | P6 | M | 8 | 6 |

**Sequencing:** `1 ∥ 2 → 3 → 4 → 5 → 6 → 7`. **Gate before the Phase-3 removal commit:** full
`TEST-CANVAS-001` (`TC-01..19`) green on the engine — never delete tldraw with a failing suite.

### 5.1 Complexity & sizing (story points)

| Work item | Phase | SP | Complexity driver |
|-----------|-------|----|-------------------|
| Built-in shapes consolidation (`kymo-region`/`kymo-edge`) | 1 | 5 | re-point one module + two small ShapeUtils |
| Undo/redo history stack | 2 | 8 | history correctness, inverse patches, round-trip |
| Board export + tldraw removal + full parity | 3 | 5 | export aggregation + removal mechanics (gated on parity) |
| Bundle/perf pass | 4 | 5 | measurement + culling |
| Freeform draw/pen tool + `freedraw` | 5 | 8 | tool state machine + freehand capture |
| Freeform sticky tool + `note` | 6 | 5 | one shape + inline edit |
| Freeform text tool + `text` | 7 | 8 | one shape + inline edit + caret |
| V&V build-out (`TC-FJ` + full parity harness) — *shared, programme-level* | all | (5) | test infrastructure |
| **Total (this feature)** | | **≈ 44** | **Complexity: High** |

- **Confidence:** range **35–60 SP**; widest variance is the **freeform tools** (P5–P7, 8→13 each
  depending on inline-edit ambition).
- **Per-feature cap:** ≈44 SP **≤ 50** ✓. **Per-phase cap:** every phase **≤ 10 SP** ✓ (largest 8).
- **Risk concentration:** Phases 5–7 (freeform authoring) ≈ 48 % of points.
- **T-shirt ↔ SP key:** S ≈ 2–3 · M ≈ 5–8 · L ≈ 13 · XL ≈ 20+.

## 6. Risk register

Likelihood / impact qualitative (Low / Med / High). Inherits the post-parity risks from the sibling.

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|----|------|-----------|--------|------------|--------|
| RK-EN-02 | Undo must restore node `x/y` **and** round-trip the text (`TC-18`) | Med | Med | History stack restores records; `Board` writeback patches text on the restore (DESIGN §3); re-run `TC-18` | Open |
| RK-EN-03 | Freeform authoring tools far larger than expected — scope blowout | High | Med | **One tool per phase (P5/P6/P7)**; can stop after any; richer primitives (connectors/frames) out of scope | Open |
| RK-EN-05 | Engine bundle not as small as hoped after removal | Low | Low | Measure each phase (`NFR-FJ-02`); tree-shake; target ≤ ~50 KB gzip | Open |
| RK-EN-06 | Rich-text **label editing** expected by users | Low | Low | Labels plain-text in MVP; inline rich-text edit deferred to backlog | Open |
| **RK-FJ-01** | tldraw-removal regresses a `TC-01..19` case that only tldraw covered | Med | High | **Gate removal on full parity green** (P3); keep the adapter so tldraw can be re-pinned by reverting one re-export | Open |
| RK-02 *(parent)* | No-key tldraw blanks the public board | — | — | **Fully retired** at Phase 3 (tldraw deleted → no key needed) | Closing |

## 7. Files to create / modify

- **New:** `engine/shapes-builtin/` (`kymo-region`/`kymo-edge` ShapeUtils); `engine/view/export.ts`;
  `engine/tools/` draw/sticky/text tools + the `freedraw`/`note`/`text` freeform shapes; undo/redo
  in `engine/store`.
- **Modify:** `diagramToShapes.ts` (re-point to custom shapes — Phase 1); `website/app/package.json`
  (remove `tldraw`, `@tldraw/assets`), `build.sh` (drop asset copy), `Board.tsx` (remove
  `licenseKey`, `tldraw/tldraw.css`) — Phase 3; regenerate & commit `kymo.bundle.js`.
- **Unchanged:** `packages/js/*`; `.github/workflows/deploy-website.yml` (committed bundle, no CI
  build); the engine core modules (store/editor/view/shape/react/persist/adapter) from the sibling.

## 8. Verification

Detailed cases + traceability in `TEST-FIGJAM-001`. At the plan level:

- **Phase 1:** `TC-FJ-01` — `kymo-region`/`kymo-edge` render from `diagramToShapes` props; `meta.kymo`
  survives.
- **Phase 2:** `TC-FJ-02` + `TC-18` — undo/redo restores records and round-trips the text.
- **Phase 3:** `TC-FJ-03` (export) + **full `TC-01..19` green**, then `TC-FJ-04` — `grep -r '"tldraw"'
  website/app/src` → 0; public board still renders, no key.
- **Phase 4:** `NFR-FJ-01/02` — bundle measured & shrunk; ~60 fps on the AIQ sample.
- **Phases 5–7:** `TC-FJ-05/06/07` (E2E via chrome MCP) — draw/sticky/text create, persist, and never
  leak into `.kymo`.
- **Regression throughout:** `cd packages/js && npm test` stays green.

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial plan: spun out of `PLAN-ENGINE-001` at the key-free-board seam (≈44 SP). 1-based phases ≤10 SP — consolidation, undo, export+removal, footprint, then draw/sticky/text. Risk register (inherited `RK-EN-02/03/05/06` + new `RK-FJ-01`, `RK-02` closing). |

## Annex B — Open questions / pending decisions

1. **Freeform tool ambition** — minimal (pen + sticky + text, as planned) vs. richer (connectors,
   frames, shape library)? Decide after the three core tools ship; richer primitives would be a
   *later* feature, not this one.
2. **Inline edit fidelity** — plain text only (MVP) vs. basic rich text (bold/colour) for sticky/text?
   (`RK-EN-06`.)
3. **A/B flag lifetime** — delete `?engine=native` at Phase 3 once tldraw is removed, or keep as a
   permanent escape hatch?

## Annex C — Worklog

Append-only progress log (newest at the bottom) — ISO/IEC/IEEE 12207 §6.3.2. `Status`: ✅ done ·
🚧 in progress · ⏳ pending.

| Date       | Phase / area | Work | Status | Ref |
|------------|--------------|------|--------|-----|
| 2026-05-24 | Docs | Authored the canvas-figjam spec/plan doc set (`INTRO`/`FEATURE`/`DESIGN`/`TEST`/`PLAN`) — the engine-completion + FigJam-authoring half spun out of the canvas-engine programme at the key-free-board seam. | ✅ | `PLAN-ENGINE-001` |

**Next:** **blocked on** the sibling's Phase 7 (key-free board). When that lands, execute **Phase 1**
(built-in shape consolidation) — the smallest, lowest-risk step.

---
title: Canvas Jam — Implementation Plan
document_id: PLAN-JAM-001
version: "0.1"
issue_date: 2026-05-24
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers completing the engine + building the freeform tools (`website/app/`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-JAM-001
  - FEAT-JAM-001
  - DESIGN-JAM-001
  - TEST-JAM-001
  - PLAN-ENGINE-001
  - PLAN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - plan
  - project-plan
  - risk-register
  - canvas-jam
  - tldraw-removal
  - freeform-authoring
  - story-points
  - worklog
---

# Canvas Jam — Implementation Plan

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | PLAN-JAM-001                                                 |
| Version           | 0.1                                                             |
| Status            | Draft                                                           |
| Owner             | `diagrams/` project                                            |
| Related Documents | `FEAT-JAM-001` (requirements), `DESIGN-JAM-001` (design), `TEST-JAM-001` (V&V), `PLAN-ENGINE-001` (sibling — the render core; **entry gate**) |

> **Implementation plan (ISO/IEC/IEEE 12207 §6.3).** The *delivery* layer for the second half of the
> in-house canvas-engine programme: completing the tldraw replacement and adding the FigJam
> freeform-authoring tools. It *implements* the baselined spec in `docs/specs/canvas-jam/`
> (`FEAT-JAM-001`, `DESIGN-JAM-001`, `TEST-JAM-001`).

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
   free (`FEAT-JAM-001` §3, `DESIGN-CANVAS-001` §3 freeform layer).

## 2. Decision

**Continue the adapter-seam strategy; phased, one freeform tool per phase; tldraw removed the moment
full parity is green.** (`DESIGN-JAM-001`.)

- **Parity before removal.** Consolidation → undo → export land *first*; only when the full
  `TC-01..19` is green does the tldraw-removal commit happen (never break the editor).
- **Freeform last, one tool per phase.** Draw, then sticky, then text — each a self-contained phase
  (`RK-EN-03` mitigation), so value lands incrementally and scope can stop after any of them.
- **Reuse the engine.** Store, editor, viewport, persistence, adapter (`DESIGN-ENGINE-001`) are
  reused unchanged; this feature only adds modules on top.

## 3. Architecture (overview)

Full design in **`DESIGN-JAM-001`**. New/changed modules on top of the engine core:

```
packages/js-canvas/ (or website/app/src/engine/)
├── shapes-builtin/   # NEW: kymo-region / kymo-edge ShapeUtils                 (DESIGN §2, FR-J-01)
├── store.ts          # +history stack (undo/redo) consuming existing tags      (DESIGN §3, FR-J-02)
├── view/export.ts    # NEW: toSvg aggregation → SVG/PNG                         (DESIGN §4, FR-J-03)
└── tools/            # +draw / sticky / text tools + freeform shapes            (DESIGN §7, FR-J-05..07)

website/app/src/Board.tsx, package.json, build.sh   # tldraw removal             (DESIGN §5, FR-J-04)
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
| **2 — Undo/redo** | History stack consuming the store's tags (DESIGN §3); undo restores `x/y` + the `Board` writeback round-trips the text. `TC-18`/`TC-J-02`. | Yes |
| **3 — Export + REMOVE tldraw** | Board `toSvg` export (DESIGN §4). Full `TEST-CANVAS-001` (`TC-01..19`) green → **delete tldraw** from `package.json`/`build.sh`/`Board.tsx`; regen bundle. **`RK-02` fully retired.** | **No (removed)** |
| **4 — Footprint** | Measure & shrink bundle (`NFR-J-02`); culling/perf pass to ~60 fps (`NFR-J-01`). | No |
| **5 — Draw/pen tool** | Tool state machine + freehand `freedraw` shape (DESIGN §7, `FR-J-05`). | No |
| **6 — Sticky tool** | `note` shape + click-to-place + editable text (`FR-J-06`). | No |
| **7 — Text tool** | `text` shape + click-to-place + editable text (`FR-J-07`). | No |

## 5. Project plan

Single-maintainer OSS — **relative sizing** (T-shirt + story points), not dates. Phases are sequential
and **each ≤ 10 SP**; **Phase 3 is the parity gate** (full `TC-01..19` before removal); **Phases 5–7
(freeform) are the breadth.**

| Phase | Exit criteria (milestone) | Entry criteria | Effort | SP | Depends on |
|-------|---------------------------|----------------|--------|----|------------|
| 1 | `diagramToShapes` on custom `kymo-region`/`kymo-edge`; tldraw `geo`/`arrow` unused | engine P7 (key-free board) | M | 5 | engine P7 |
| 2 | Undo/redo green (`TC-J-02`, `TC-18`) | P1 | M | 8 | 1 |
| 3 | Export (`TC-J-03`); **full `TC-01..19` green; tldraw removed** (`TC-J-04`) | P1, P2 | M | 5 | 1, 2 |
| 4 | Bundle measured & shrunk; ~60 fps on AIQ sample | P3 | M | 5 | 3 |
| 5 | Draw/pen tool creates persisted `freedraw` (`TC-J-05`) | P3 | M | 8 | 3 |
| 6 | Sticky tool places editable `note` (`TC-J-06`) | P5 | M | 5 | 5 |
| 7 | Text tool places editable `text` (`TC-J-07`) | P6 | M | 8 | 6 |

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
| V&V build-out (`TC-J` + full parity harness) — *shared, programme-level* | all | (5) | test infrastructure |
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
| RK-EN-03 | Freeform authoring tools far larger than expected — scope blowout | High | Med | **One tool per phase (P5/P6/P7)** — draw, sticky, text all shipped within budget; richer primitives (connectors/frames) + select/move/resize stayed out of scope (backlog). | **Closed (all 3 tools shipped)** |
| **RK-EN-04** *(parent)* | Coarse reactivity → broad re-renders → drag jank at high N | Med | Med | Pan/zoom decoupled in `PLAN-ENGINE-001` (transform-only, 0 re-renders). **P4 closed the tail:** **per-record reactivity** — a drag re-renders only the moved shape (O(1), not O(N)). Render-guard E2E asserts it; `BENCH-ENGINE-001` §4.4 confirms 60 fps median to ≥600 nodes. **Culling deferred** (net-negative for on-screen workloads — `DESIGN-JAM-001` §6). | **Mitigated (P4); culling deferred** |
| RK-EN-05 | Engine bundle not as small as hoped after removal | Low | Low | Measure each phase (`NFR-J-02`); tree-shake. **As-built: 399 KB raw / 107 KB gzip** (−82% vs the 586 KB tldraw baseline). | **Closed (P3/P4)** |
| RK-EN-06 | Rich-text **label editing** expected by users | Low | Low | Labels plain-text in MVP; inline rich-text edit deferred to backlog | Open |
| **RK-J-01** | tldraw-removal regresses a `TC-01..19` case that only tldraw covered | Med | High | Removed P3 with `TC-01..05/07..19` green on the engine; `TC-06`'s freeform clause was deferred to P5–7 and is **now fully met** — draw (P5), sticky (P6), text (P7) all shipped on the engine's own freeform layer. | **Closed (TC-06 met)** |
| RK-02 *(parent)* | No-key tldraw blanks the public board | — | — | tldraw deleted in P3 → no key/watermark possible. | **Closed** |

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

Detailed cases + traceability in `TEST-JAM-001`. At the plan level:

- **Phase 1:** `TC-J-01` — `kymo-region`/`kymo-edge` render from `diagramToShapes` props; `meta.kymo`
  survives.
- **Phase 2:** `TC-J-02` + `TC-18` — undo/redo restores records and round-trips the text.
- **Phase 3:** `TC-J-03` (export) + **full `TC-01..19` green**, then `TC-J-04` — `grep -r '"tldraw"'
  website/app/src` → 0; public board still renders, no key.
- **Phase 4:** `NFR-J-01/02` — bundle measured & shrunk; ~60 fps on the AIQ sample.
- **Phases 5–7:** `TC-J-05/06/07` (E2E via chrome MCP) — draw/sticky/text create, persist, and never
  leak into `.kymo`.
- **Regression throughout:** `cd packages/js && npm test` stays green.

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial plan: spun out of `PLAN-ENGINE-001` at the key-free-board seam (≈44 SP). 1-based phases ≤10 SP — consolidation, undo, export+removal, footprint, then draw/sticky/text. Risk register (inherited `RK-EN-02/03/05/06` + new `RK-J-01`, `RK-02` closing). |

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
| 2026-05-24 | Docs | Authored the canvas-jam spec/plan doc set (`INTRO`/`FEATURE`/`DESIGN`/`TEST`/`PLAN`) — the engine-completion + FigJam-authoring half spun out of the canvas-engine programme at the key-free-board seam. | ✅ | `PLAN-ENGINE-001` |
| 2026-05-24 | Phase 1 | **Built-in consolidation shipped (`FR-J-01`).** New engine `ShapeUtil`s `KymoRegionEngineUtil` (`kymo-region`) + `KymoEdgeEngineUtil` (`kymo-edge`) in `engine/shapes.tsx` replace the Phase-5 tldraw-style `geo`/`arrow` stopgaps. **Engine-only split** (`DESIGN-JAM-001` §2): the shared `diagramToShapes.ts` stays on tldraw `geo`/`arrow` (the live `?engine=tldraw` path needs them, golden byte-identical); a thin `engine/diagramToShapesEngine.ts` reuses it then remaps → `kymo-region`/`kymo-edge`, preserving ids/`x`/`y`/`meta.kymo` (so `patchDsl` round-trip + persistence reconcile untouched). `EngineBoard` registers the two new utils. Verified: typecheck (app + js-canvas) clean; `packages/js` 59/59; `js-canvas` 13/13; Playwright render-guard + new region/edge presence assertion green; chrome-MCP A/B (AIQ + BPMN, engine default) pixel-faithful; `?engine=tldraw` byte-identical. | ✅ | `FR-J-01` |

| 2026-05-24 | Phase 2 | **Undo/redo shipped (`FR-J-02`).** Store gains `undos`/`redos` stacks + `undo()`/`redo()`/`mark()`/`canUndo`/`canRedo` (consuming the existing `history:"record"` tags; `history:"ignore"` writes never enter). A drag's many per-move writes **coalesce** into one step (same-source, update-only, same-id-set) until `mark()` (called on a drag's pointer-up) seals it. `undo()`/`redo()` re-apply inverse/forward as `run({source:"user", history:"ignore"})` → EngineBoard's writeback round-trips the `.kymo` text (`RK-EN-02`) without re-recording. `EngineBoard` adds a document-level Cmd/Ctrl+Z (+Shift/Y) keydown, guarded on `activeElement` so the `.kymo` `<textarea>` keeps native text undo. `getHistory()` (raw log) untouched. Verified: `js-canvas` **19/19** (`TC-J-02`: restore/redo, ignore-excluded, coalescing, `mark()` boundary, redo-invalidation) + editor facade; `packages/js` 59/59; typecheck clean; Playwright render-guard 4/4; **chrome-MCP `TC-18`** — drag→`@(x,y)`, Cmd+Z→node restored **and** text reverted, Cmd+Shift+Z→redo, textarea-focused Cmd+Z left the canvas untouched; 0 console errors. | ✅ | `FR-J-02` |

| 2026-05-24 | Phase 3 | **Board export + tldraw REMOVED (`FR-J-03/04`).** New `engine/export.ts` `boardToSvg` walks shapes in `index` order, calls each util's new `toSvg` (node glyph + label, region rect, edge line+arrow+label, BPMN `<image>`), wraps in `<g translate>` and frames one `<svg>` at the fit bounds (pre-warms the glyph cache; SVG-only MVP). The "⬇ SVG" button exports the board (DSL render = fallback). `diagramToShapes` **collapsed** to emit `kymo-node`/`kymo-region`/`kymo-edge` directly (js-canvas ids, plain labels — no tldraw/`toRichText`/geo/arrow); `diagramToShapesEngine` deleted. **tldraw deleted**: `Board.tsx`/`KymoNodeShape.tsx`/`KymoDiagramShape.tsx`/`engine/adapter.ts` + the `@tldraw/tlschema` augmentations + the `tldraw` dep + `perf-compare.spec.ts`; `App` always renders `EngineBoard`; `index.html` drops the (now-empty) `kymo.bundle.css`. **Bundle 2.09 MB → 399 KB raw / 586 → 107 KB gzip** (`NFR-J-02`); no CSS bundle. `Inspector` removed (non-reactive on the engine — `useValue` only tracks store, not selection; deferred until the engine exposes reactive selection). **TC-06 freeform clause deferred to P5–7** (engine has no freeform tools yet; the `meta.kymo` exclusion invariant + `persist.freeform` are in place). Verified: typecheck clean; `packages/js` 59/59; `js-canvas` 19/19 + `TC-J-03` 2/2; render-guard 4/4; chrome-MCP (engine sole path) — render AIQ+BPMN, drag→`@(x,y)` (`TC-04`), undo+round-trip (`TC-18`), board export = one `<svg>` with all shapes/glyphs (`TC-09`/`TC-J-03`), 0 console errors; `grep '"tldraw"' src` → 0. | ✅ | `FR-J-03/04` |

| 2026-05-24 | Phase 4 | **Footprint perf pass shipped (`NFR-J-01/02`).** **Per-record reactivity** in `engine/react.tsx`: extracted a `ShapeView` per shape that subscribes to the store for its **own id** ("subscribe-to-all, filter-to-mine") and re-renders only when that shape changes; `EngineCanvas` re-renders only on **structural** change (add/remove) + selection. A drag now re-renders **only the moved shape** (O(1), was O(N)); pan/zoom stay at 0 re-renders. The `__kymoRenders` counter moved into `ShapeView` (+ `__kymoRenderedIds`); the selection outline moved **inside** the wrapper so it follows a dragged node frame-for-frame. Removed the now-unused `useValue`. **Culling DEFERRED** (decided against — `BENCH-ENGINE-001` §6: would re-render on pan, regressing the headline 0-re-render win; net-negative for kymo's on-screen workload; `NFR-J-01`-`MAY`). **`NFR-J-02`:** bundle 107 KB gzip / 399 KB raw — unchanged (no deps). Verified: typecheck (app+js-canvas) clean; `packages/js` 59/59; `js-canvas` 19/19; render-guard **5/5** (4 + new per-record `toEqual([targetId])` lock); chrome-MCP real-GPU (engine sole path) — AIQ render (19/4/20), `TC-04` drag→`@(x,y)`, `TC-18` undo→origin + round-trip, selection-follow (outline rides the drag), 0 console errors; **drag-at-high-N** (`BENCH-ENGINE-001` §4.4): 300/600-node drag re-renders **1** shape, 60 fps median to 600 (vs 30 fps parent-wide). | ✅ | `NFR-J-01/02`, `RK-EN-04` |

| 2026-05-24 | Phase 5 | **Draw/pen tool shipped (`FR-J-05`).** New `FreedrawEngineUtil` (`freedraw`, props `{points,color,size}`) renders an SVG path from page-space points (relative to origin); `getGeometry` = point extent; `toSvg` exports a `<path>`. A `select`\|`draw` **tool state machine** (`react.tsx` `Tool`) threads `App → EngineBoard → EngineCanvas`; a new toolbar group (Select · Draw) toggles it; draw mode shows a crosshair. Draw gesture: pointer-down creates the stroke, moves accumulate points (live preview via `history:"ignore"`), pointer-up **re-stamps** the final shape as ONE recorded add (single-step undo, full-fidelity redo) — the pen **stays active** for multi-stroke drawing. Strokes carry **no `meta.kymo`** → freeform layer: never written back to `.kymo`, persisted via `engine/persist` (restored on mount; `scheduleSave` now fires on any user edit). Verified: typecheck clean; `packages/js` 0-fail; `js-canvas` 19/19; app `node --test` 10/10; Playwright **7/7** (render-guard 5 regression + `TC-J-05` create/persist/not-in-`.kymo` + single-step undo); chrome-MCP real-GPU — draw renders (`#1e293b`/3px path), tool toggle + crosshair, survives reload, `.kymo` byte-identical, 0 console errors. Bundle ~108 KB gzip. | ✅ | `FR-J-05`, `TC-J-05` |

| 2026-05-24 | Phase 6 | **Sticky-note tool shipped (`FR-J-06`).** New `KymoNoteEngineUtil` (`note`, props `{w,h,color,text}`) renders a colour-filled rounded sticky with a plain-text label in an `HTMLContainer` (`pointerEvents:auto` so it's hit-testable under the `none` wrapper); `toSvg` emits `<rect>` + multiline `<tspan>`s for board export. Tool union gains `sticky`; **click-to-place** centres a `note` (one recorded add → one undo) and reverts to `select` (`onToolReset`, threaded `App→EngineBoard→EngineCanvas`). **Double-click → inline edit**: an overlay `<textarea>` (in the camera-transformed container, so it tracks pan/zoom), focused via an effect (not `autoFocus`) with a brief blur-guard so the opening gesture's focus-shift doesn't commit-close it; the dblclick hit-test scans `elementsFromPoint` (robust through the `none` wrapper). Commit (Enter / click-away) is one recorded, persisted step; Escape cancels. Freeform-layer (`meta.kymo == null`): never in `.kymo`, persisted via the snapshot. **Resize/move of placed notes deferred** (a later freeform-transform pass; `RK-EN-03`). Verified: typecheck clean; `packages/js` 0-fail; `js-canvas` 19/19; app `node --test` 10/10; Playwright **9/9** (render-guard 5 + draw 2 + `TC-J-06` place/edit/persist/not-in-`.kymo` + single-step undo); chrome-MCP real-GPU — place → dblclick → multi-line/unicode edit, survives reload, `.kymo` byte-identical, 0 console errors. Bundle ~108 KB gzip. | ✅ | `FR-J-06`, `TC-J-06` |

| 2026-05-24 | Phase 7 | **Text tool shipped (`FR-J-07`) — programme COMPLETE.** New `KymoTextEngineUtil` (`text`, props `{text,color,size}`) renders a transparent auto-sizing plain-text label (`pointerEvents:auto`); geometry is approximated from the text extent; `toSvg` emits `<text>`+`<tspan>`s for board export. Tool union gains `text`; **click-to-place → type to edit** (auto-enters edit on placement, "type to edit"), reverting to `select`. The text shape is created with `history:"ignore"` and **re-stamped on commit** as one recorded add — or **dropped if left empty** (no stray invisible text), so it's a single clean undo step. The inline-edit overlay (P6) was **generalised** to both `note` (filled box) and `text` (transparent label, dashed outline) — shared `editStyle` + testid `inline-editor`; double-click re-edits either. Freeform-layer (`meta.kymo == null`): never in `.kymo`, persisted via the snapshot. Verified: typecheck clean; `packages/js` 0-fail; `js-canvas` 19/19; app `node --test` 10/10; Playwright **12/12** (render-guard 5 + draw 2 + sticky 2 + `TC-J-07` place/edit/persist/not-in-`.kymo` + empty-drop + single-step undo); chrome-MCP real-GPU — place → auto-edit → multi-line/unicode, survives reload, `.kymo` byte-identical, 0 console errors. Bundle ~109 KB gzip. | ✅ | `FR-J-07`, `TC-J-07` |

**Programme complete.** All seven phases shipped (consolidation → undo → export+remove-tldraw →
footprint/per-record → draw → sticky → text). `TC-06`'s freeform clause is **fully un-deferred** (draw +
sticky + text all green); the engine is the sole, vendor-independent renderer (`RK-02` retired). Backlog
(out of the original scope): freeform **select/move/resize** (a transform pass), rich-text labels
(`RK-EN-06`), PNG export. See Annex B.

---
title: Canvas Studio — Implementation Plan
document_id: PLAN-STUDIO-001
version: "0.6"
issue_date: 2026-05-25
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers building the hi-fi editor chrome (`website/app/`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-STUDIO-001
  - FEAT-STUDIO-001
  - DESIGN-STUDIO-001
  - TEST-STUDIO-001
  - PLAN-JAM-001
  - PLAN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - plan
  - project-plan
  - risk-register
  - canvas-studio
  - editor-shell
  - story-points
  - worklog
---

# Canvas Studio — Implementation Plan

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | PLAN-STUDIO-001                                                  |
| Version           | 0.6                                                             |
| Status            | Draft                                                           |
| Owner             | `diagrams/` project                                            |
| Related Documents | `FEAT-STUDIO-001` (requirements), `DESIGN-STUDIO-001` (design), `TEST-STUDIO-001` (V&V), `PLAN-JAM-001` (the capability layer this builds on — **entry gate, complete**) |

> **Implementation plan (ISO/IEC/IEEE 12207 §6.3).** The *delivery* layer for the hi-fi editor UI
> shell. It *implements* the spec in `docs/specs/canvas-studio/` (`FEAT-STUDIO-001`,
> `DESIGN-STUDIO-001`, `TEST-STUDIO-001`). **Client-only**; no backend, no new runtime deps.

---

## 1. Context

The canvas engine (`PLAN-ENGINE-001`) and the freeform-tool capability (`PLAN-JAM-001`) are
**complete** — the engine is the sole renderer, tldraw is gone, draw/sticky/text ship, undo/redo +
board export work, per-record reactivity holds ~60 fps. The live playground (`FEAT-CANVAS-001`,
`website/app/`) is still a **bare split-pane** (`<header>` + `.kymo` `<textarea>` + `EngineBoard`
preview + a small FigJam toolbar). A hi-fi design prototype shows the intended **Editor** screen —
top bar, left tool rail, richly-styled canvas items, status bar.

**This feature (≈ 42 SP)** builds that chrome over the existing engine, **client-only**, decomposed
by the **canvas's UI regions** as phases (mirroring how `canvas-jam` is one feature phased by tool).
The heavier / backend-bound regions are deferred as named siblings so the **≤ 50-SP-per-feature**
cap holds.

## 2. Decision

**Re-skin the playground into the prototype's Editor regions, additively, over the unchanged
engine — golden-safe, no new deps.** (`DESIGN-STUDIO-001`.)

- **Token foundation first.** Port the prototype `tokens.css` (P1) so every later region reads one
  themed surface; reconcile with the existing `[data-theme]` switch.
- **Region per phase, each ≤ 10 SP.** Top bar → tool rail → item styling → selection → status bar.
  The 13-SP "canvas items" chunk is **split** (styling P4 / selection P5) to honour the per-phase cap.
- **Reuse the engine + sync.** Store/editor/camera/persist (`DESIGN-ENGINE-001`), freeform tools +
  `toSvg` (`DESIGN-JAM-001`), `patchDsl`/sync (`DESIGN-CANVAS-001`) are reused unchanged; this
  feature only adds React chrome + item styling.
- **Hard non-goals.** Inspector, timeline, creation tools, presence/comments/dashboard/AI are
  deferred to siblings (`FEAT-STUDIO-001` §4); the rail shows them only as disabled placeholders.

## 3. Architecture (overview)

Full design in **`DESIGN-STUDIO-001`**. New/changed modules on top of the engine:

```
website/app/src/
├── ui/TopBar.tsx          # NEW: brand · breadcrumb · panel tabs · undo/redo · theme · export/share  (DESIGN §3, FR-CS-02)
├── ui/ToolRail.tsx        # NEW: left rail   ┐ both driven by …                                       (DESIGN §4, FR-CS-03)
├── ui/BottomToolbar.tsx   # NEW: bottom bar  ┘
├── ui/StatusBar.tsx       # NEW: counts · autosave · zoom · fit                                       (DESIGN §7, FR-CS-06)
├── engine/tools-registry.ts # NEW: { id, icon, kbd, title, enabled } tool list                        (DESIGN §4, FR-CS-03)
├── engine/shapes.tsx      # MOD: item styling parity (tile/region/edge) + toSvg in lockstep           (DESIGN §5, FR-CS-04)
├── engine/react.tsx       # MOD: selection handles + size badge in the shape wrapper                  (DESIGN §6, FR-CS-05)
├── App.tsx                # MOD: header/main → TopBar + 3-col layout + StatusBar; showCode/title state (DESIGN §8)
└── index.html / tokens    # MOD: design-token migration                                               (DESIGN §2, FR-CS-01)
```

**Reused unchanged:** the engine core (`packages/js-canvas`), the freeform tools + export
(`DESIGN-JAM-001`), and `patchDsl` + the sync engine + `onShare`/`onDownload` (`DESIGN-CANVAS-001`).
**Untouched (golden-frozen):** `packages/js` `renderSVG` and the Python renderer.

## 4. Phased plan

Phases are **1-based** (feature-local) and sized so **no phase exceeds 10 SP**. **Entry gate:** the
capability layer (`PLAN-JAM-001`) is complete — so P1 can start now.

| Phase | Goal |
|-------|------|
| **1 — Foundation: tokens/theme** | Port the prototype `tokens.css` into `website/app`; reconcile with the existing `[data-theme]` light/dark vars. No layout change (DESIGN §2). |
| **2 — canvas-topbar** | Replace `<header>` with `TopBar`: brand, breadcrumb/title, panel-toggle tabs, theme toggle, undo/redo → engine history, Export/Share reuse (DESIGN §3). |
| **3 — canvas-left-sidebar** | Tool rail + bottom toolbar from a tool registry; active state + keyboard shortcuts; wire existing tools; disabled placeholders for future ones (DESIGN §4). |
| **4 — canvas-items: styling** | `kymo-node`/`kymo-region`/`kymo-edge` visual parity (tile stripe+glyph, dashed container, flow-dash) + `toSvg` lockstep (DESIGN §5). |
| **5 — canvas-items: selection** | Selection rect + corner handles + size badge in the canvas layer; comment-pin marker (DESIGN §6). |
| **6 — canvas-status-bar** | Counts · autosave · zoom `−/%/+` · Fit, wired to engine camera/persist (DESIGN §7). |
| **7 — chrome de-dup** | One owner per control: remove the floating toolbar; relocate the sample picker + a 3-mode (light/dark/transparent) canvas-background control to the top bar; single Export; truthful `Code`/`Preview` tabs (DESIGN §11, `FR-CS-07`, `TC-CS-07`). |

## 5. Project plan

Single-maintainer OSS — **relative sizing** (T-shirt + story points), not dates. Phases are
**each ≤ 10 SP**; P1 is the token foundation the rest consume; P4/P5 are the split "canvas items".

| Phase | Exit criteria (milestone) | Entry criteria | Effort | SP | Depends on |
|-------|---------------------------|----------------|--------|----|------------|
| 1 | Ported tokens resolve in both themes; existing playground visually unchanged (`TC-CS-01`) | jam complete | M | 5 | jam P7 |
| 2 | Top bar: undo/redo round-trips (`TC-CS-02`, `TC-18`), theme/export/share + Code toggle work | P1 | M | 8 | 1 |
| 3 | Tool rail click + shortcut drive the engine tool; placeholders inert (`TC-CS-03`) | P1 | M | 8 | 1 |
| 4 | Item styling parity on the AIQ sample (`TC-CS-04`); goldens byte-identical | P1 | M | 8 | 1 |
| 5 | Selection handles + size badge track a drag (`TC-CS-05`) | P4 | S–M | 5 | 4 |
| 6 | Status bar counts/zoom/Fit/autosave correct (`TC-CS-06`) | P1 | S–M | 5 | 1 |
| 7 | One owner per control — no floating toolbar; sample + background in the top bar; single Export; truthful tabs (`TC-CS-07`) | P1–P6 | S | 5 | 1–6 |

**Sequencing:** `1 → (2 ∥ 3 ∥ 4 ∥ 6) → 5 → 7` (P7 was a follow-up amendment, delivered via `CR-STUDIO-001` after the initial P1–P6 programme shipped). **Regression gate every phase:** `TEST-CANVAS-001`
(`TC-01..19`) + `TEST-JAM-001` (`TC-J-01..07`) + the render-guard stay green; `packages/js` /
`packages/python` goldens byte-identical.

### 5.1 Complexity & sizing (story points)

| Work item | Phase | SP | Complexity driver |
|-----------|-------|----|-------------------|
| Design-token migration + theme parity | 1 | 5 | reconcile two token sets; visual-diff to avoid churn |
| Top bar (undo/redo wiring, panel tabs, theme/export/share reuse) | 2 | 8 | wiring breadth; button-state reactivity (`RK-CS-02`) |
| Tool rail + registry + keyboard shortcuts | 3 | 8 | registry seam, shortcut guard, placeholder states |
| Canvas-item styling parity (`kymo-node`/`region`/`edge`) + `toSvg` | 4 | 8 | match prototype across themes; keep export WYSIWYG |
| Selection handles + size badge + comment-pin | 5 | 5 | canvas-layer overlay riding the in-wrapper outline |
| Status bar (counts, autosave, zoom, Fit) | 6 | 5 | three small sources; no canvas re-render |
| Chrome de-dup — relocate sample/bg to the top bar, single Export, truthful tabs + `chrome.spec.ts` | 7 | 5 | pure relocation; one new e2e spec (P7.1 docs 1 · P7.2 code 2 · P7.3 e2e 1 · P7.4 verify 1) |
| V&V build-out (`TC-CS` + regression harness) — *shared, programme-level* | all | (3) | Playwright specs + golden checks |
| **Total (this feature)** | | **≈ 47** | **Complexity: Medium–High** |

- **Confidence:** range **32–55 SP**; widest variance is **item styling** (P4) if theme parity needs
  per-shape token work.
- **Per-feature cap:** ≈ 47 SP **≤ 50** ✓ (incl. the P7 de-dup amendment). **Per-phase cap:** every phase **≤ 10 SP** ✓ (largest 8).
- **Risk concentration:** P2 (wiring breadth) + P4 (styling parity) ≈ 55 % of points.
- **T-shirt ↔ SP key:** S ≈ 2–3 · M ≈ 5–8 · L ≈ 13 · XL ≈ 20+.

## 6. Risk register

Likelihood / impact qualitative (Low / Med / High).

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|----|------|-----------|--------|------------|--------|
| **RK-CS-01** | Engine has **no reactive selection signal** → selection-driven *React panels* can't update (the non-reactive Inspector was retired in `PLAN-JAM-001` P3) | High | Med | Keep selection affordances in the **canvas layer** (`FR-CS-05`) where the engine already re-renders the selected shape; defer the reactive signal + inspector panel to the `canvas-inspector` sibling. | Open (scoped out) |
| **RK-CS-02** | Top-bar undo/redo enabled-state needs reactivity (`canUndo`/`canRedo`) | Low | Low | Recompute on the store-change tick `EngineBoard` already subscribes to, or ship always-enabled no-ops. | Open |
| **RK-CS-03** | Token migration churns/breaks the existing playground look | Med | Med | Port **additively**; reconcile with the existing `[data-theme]` vars; chrome-MCP visual-diff before/after (`TC-CS-01`). | Open |
| **RK-CS-04** | Scope creep into deferred siblings (inspector/timeline/creation tools) | Med | Med | Hard non-goals in `FEAT-STUDIO-001` §4; rail shows only **disabled placeholders**; reviewer rejects PRs that add deferred surfaces. | Open |
| **RK-CS-05** | A styling change accidentally touches `renderSVG` → golden churn | Low | High | All visual change lives in `engine/*` + CSS tokens; `packages/js`/`packages/python` are untouched; run goldens each phase (`NFR-CS-03`). | Open |
| **RK-CS-06** | Chrome state re-renders the canvas shape layer → perf regression | Low | Med | Chrome is separate React state; the render-guard E2E asserts a drag still re-renders only the moved shape (`NFR-CS-02`). | Open |

## 7. Files to create / modify

- **New:** `website/app/src/ui/{TopBar,ToolRail,BottomToolbar,StatusBar}.tsx`;
  `website/app/src/engine/tools-registry.ts`; a small TS icon module (port of the prototype's
  `icons.jsx`); `website/app/e2e/{topbar,toolrail,items,statusbar}.spec.ts`.
- **Modify:** `website/app/src/App.tsx` (header/main → `TopBar` + 3-col layout + `StatusBar`;
  `showCode`/`title` state); `website/app/src/engine/shapes.tsx` (item styling + `toSvg`);
  `website/app/src/engine/react.tsx` (selection handles + size badge); `website/app/index.html` (or a
  new imported `tokens.css`) — design-token migration; regenerate & commit `kymo.bundle.js`.
- **Unchanged:** `packages/js/*` and `packages/python/*` (golden-frozen); `packages/js-canvas/*`
  (engine core); `.github/workflows/deploy-website.yml` (committed bundle, no CI build).
- **P7 (chrome de-dup):** *new* `website/app/e2e/chrome.spec.ts`; *modify* `website/app/src/ui/TopBar.tsx`
  (owns sample + 3-mode bg, truthful tabs), `website/app/src/ui/icons.tsx` (`Checker` glyph),
  `website/app/src/App.tsx` (delete the floating `.toolbar`, rewire `<TopBar>` props),
  `website/app/index.html` (drop dead toolbar CSS, add `.k-sample`/`.k-seg`); regenerate
  `kymo.bundle.js`; clean the two inert `.closest(".toolbar")` guards in `e2e/{render-guard,selection}.spec.ts`.

## 8. Verification

Detailed cases + traceability in `TEST-STUDIO-001`. At the plan level:

- **Phase 1:** `TC-CS-01` — ported tokens resolve in both themes; no unintended restyle.
- **Phase 2:** `TC-CS-02` (+ `TC-18`) — top-bar undo/redo round-trips; theme/export/share + Code
  toggle work; Comments/Versions disabled.
- **Phase 3:** `TC-CS-03` — rail click + keyboard drive the engine tool; textarea keeps its keys;
  placeholders inert.
- **Phase 4:** `TC-CS-04` — node/region/edge styling parity; **goldens byte-identical**.
- **Phase 5:** `TC-CS-05` — selection handles + size badge track a drag.
- **Phase 6:** `TC-CS-06` — counts/zoom/Fit/autosave correct.
- **Phase 7:** `TC-CS-07` — no floating toolbar; sample + 3-mode background in the top bar; single
  Export; truthful `Code`/`Preview` tabs. **Goldens byte-identical** (pure relocation).
- **Regression throughout:** `TEST-CANVAS-001` + `TEST-JAM-001` + render-guard green; `cd
  packages/js && npm test` and `cd packages/python && uv run --group dev python -m pytest -q` stay
  green (goldens unchanged).

---

## 9. Change requests

Changes to the baselined spec (`docs/specs/canvas-studio/`) are raised, assessed, and logged
in [`CHANGE-REQUESTS/`](CHANGE-REQUESTS/) (raise → assess → approve → implement → re-baseline). None raised
yet — see [`CHANGE-REQUESTS/README.md`](CHANGE-REQUESTS/README.md).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial plan: hi-fi editor UI shell over the complete engine. 1-based phases ≤ 10 SP — tokens → top bar → tool rail → item styling → selection → status bar (≈ 42 SP). Risk register (`RK-CS-01..06`), files-to-touch, golden-safe verification, deferred-sibling non-goals. |
| 0.2     | 2026-05-25 | Vũ Anh | Added **P7 (chrome de-dup, ≈ 5 SP)** — one owner per control (`FR-CS-07`/`TC-CS-07`): remove the floating toolbar; relocate the sample picker + a 3-mode canvas-background control to the top bar; single Export; truthful tabs. Updated §4/§5/§5.1 (total ≈ 47 SP ≤ 50), §7 files, §8 verification. Pure relocation — goldens byte-identical. |
| 0.3     | 2026-05-25 | Vũ Anh | **Doc reorganization.** Added §9 Change-requests (`CR/`); plan consolidated into the feature folder under `docs/specs/`. |
| 0.4     | 2026-05-25 | Vũ Anh | **Renumber for reading order.** Renamed `PLAN.md` → `06-PLAN.md` and `CR/` → `07-CR/`, extending the folder's `NN-` numbering to the living-plan layer; updated the §9 change-request links. `PLAN-STUDIO-001` unchanged. See `INTRO-STUDIO-001` §2. |
| 0.5     | 2026-05-25 | Vũ Anh | **P7 implemented + worklog reconciled (`CR-STUDIO-001`, Path A).** P7 chrome de-dup built & verified (21/21 e2e; `js`/`python` goldens byte-identical) → worklog P7 🚧→✅; removed the stray mid-table "Programme complete" paragraph and relocated a corrected **P1–P7** summary below the phases; de-duplicated the P6 lead; §5 sequencing note updated; resolved Annex B open questions (title cosmetic · undo/redo always-enabled · left-rail-only · comment-pin deferred). |
| 0.6     | 2026-05-28 | Vũ Anh | **Restructure to repo-norm layout.** Renamed `06-PLAN.md` → un-numbered `PLAN.md` (matches the repo's leaf model); `CHANGE-REQUESTS/` links unchanged; `PLAN-STUDIO-001` content unchanged. See `INTRO-STUDIO-001` Annex A 0.4. |

## Annex B — Open questions / pending decisions

1. **Breadcrumb/title persistence** — **Resolved (kept cosmetic).** The editable title is a
   local-only, non-persisted label; a real per-board title needs the dashboard + a backend (out of
   scope). `FR-CS-02` documents it as cosmetic.
2. **Undo/redo button state** — **Resolved (always-enabled).** Shipped as always-enabled buttons
   wired to `editor.undo()/redo()`; a reactive `canUndo`/`canRedo` signal is deferred with the
   inspector (`RK-CS-02`).
3. **Tool-rail layout** — **Resolved (left rail only).** Shipped the left rail at P3; the floating
   bottom toolbar was retired entirely at P7 (`FR-CS-07`).
4. **Comment-pin marker** — **Resolved (deferred).** Dropped at P5 — no comment data model; it's a
   backend feature (threads out of scope regardless).

## Annex C — Worklog

Append-only progress log (newest at the bottom) — ISO/IEC/IEEE 12207 §6.3.2. `Status`: ✅ done ·
🚧 in progress · ⏳ pending.

| Date       | Phase / area | Work | Status | Ref |
|------------|--------------|------|--------|-----|
| 2026-05-24 | Docs | Authored the canvas-studio spec/plan doc set (`INTRO`/`FEATURE`/`DESIGN`/`TEST`/`PLAN`) — the hi-fi editor UI shell over the complete engine + freeform tools, decomposed by canvas region (top bar / left sidebar / items / status bar), client-only, ≤ 50-SP cap with ≤ 10-SP phases. Sibling of `canvas-jam` (not a rename). | ✅ | `INTRO-STUDIO-001` |
| 2026-05-24 | Phase 1 | **Design-token migration shipped (`FR-CS-01`).** Ported the hi-fi prototype's `tokens.css` into `website/app/index.html`'s `<style>` **additively** — two new blocks (`:root` light + `:root[data-theme="dark"]` overrides) adding `--bg-elev`, `--canvas-grid`, `--border-soft/strong`, `--text-mute`, `--text-on-canvas(-dim)`, `--accent-soft/fg`, `--accent-2-soft`, `--user-1..5`, `--aws-*`, `--tok-*` (DSL syntax), the `--r-sm..xl` scale, the `--shadow-sm/shadow/shadow-lg/shadow-glow` box-shadow scale (the unused colour `--shadow-sm` repurposed), and `--topbar-h`/`--rail-w`. **No token the current CSS references was changed** → P1 restyles nothing; no consumer yet (P2–P6). No bundle rebuild (CSS lives in `index.html`, not `kymo.bundle.js`). Verified (chrome-anhv, `npx http-server`): `/app/` 200, React mounts, screenshot **pixel-unchanged** vs before; `getComputedStyle(:root)` resolves all new tokens in **light** (`--bg-elev` #ffffff, `--tok-kw` #56880c, `--shadow-sm` light) and **dark** (`--bg-elev` #1a1a24, `--tok-kw` #76b900, `--shadow-sm` dark) — theme-neutral tokens identical across both; existing tokens still flip (`--bg` #ffffff↔#131419); 0 console errors (`TC-CS-01`). | ✅ | `FR-CS-01`, `TC-CS-01` |
| 2026-05-24 | Phase 2 | **canvas-topbar shipped (`FR-CS-02`).** Replaced the bare `<header>` with a hi-fi **`TopBar`** (`website/app/src/ui/TopBar.tsx`) + a ported, dependency-free icon set (`website/app/src/ui/icons.tsx`): brand, an **editable title** (local state), centre **Code/Preview tabs**, **undo/redo**, **theme toggle**, and **Export/Share** (reuse `onDownload`/`onShare`). **Trimmed** the backend-implying chrome at review (`FR-CS-02` is client-only): dropped the "Playground ›" breadcrumb, the star, the **Comments/Versions** tabs, and the **presence** avatar (boards/comments/multiuser are out of scope) — dead CSS removed too. `EngineBoard` gained an `onEditorReady` prop handing `App` the live `Editor` (drives top-bar undo/redo; also sets up P6 camera/fit). The Code tab toggles a `showCode` flag that hides the `.kymo` pane (`main.code-hidden` → single column). Topbar CSS ported into `index.html` (`.k-topbar`/`.k-logo`/`.k-btn*`/`.center-tabs`/`.k-presence`, token-driven → themes via `[data-theme]`). Verified: `tsc --noEmit` clean; `build.sh` bundle 399→**410 KB**; chrome-anhv (light **and** dark) — topbar renders + themes, Code tab hides/shows the editor pane, Comments/Versions disabled, undo/redo wired (no-throw), theme flips, title editable, 0 console errors (`TC-CS-02`). Regression green: `js-canvas` **19/19**, `js` **368 pass/0 fail**, `python` **649 passed** (goldens byte-identical — `renderSVG` untouched, `NFR-CS-03`). | ✅ | `FR-CS-02`, `TC-CS-02` |
| 2026-05-24 | Phase 3 | **canvas-left-sidebar shipped (`FR-CS-03`).** New flush **left tool rail** (`website/app/src/ui/ToolRail.tsx`) driven by a **tool registry** (`website/app/src/ui/tools.ts`, `{ id, Icon, kbd, title, enabled, sepBefore }`): enabled `select`/`hand`/`draw`/`sticky`/`text` wired to the engine, **disabled placeholders** (frame/cloud/shape/diamond/edge/comment/AI, tooltips) reserving slots for `canvas-create-tools`. Added the rail icons to `ui/icons.tsx`. **`hand` is a real tool** — added to the engine `Tool` union (`engine/react.tsx`): a pan-only gesture (pan on any drag, grab cursor, never selects). Document-level **keyboard shortcuts** V/H/P/S/T (`App.tsx`, guarded on `activeElement`). The view pane is now a flex row (`ToolRail` + `.canvas-wrap`); the floating toolbar's tool buttons **moved to the rail** (it keeps sample/bg/export). CSS ported (`.k-rail`/`.tool`/`.kbd`/`.sep`, token-driven). Verified: `tsc` clean; bundle ~411 KB; chrome-anhv (light+dark) — rail renders/themes, click + V/H/P/S/T switch tools, `hand`→grab cursor, disabled placeholders inert, `S` in the textarea ignored, 0 console errors (`TC-CS-03`). Regression green: `js-canvas` 19/19, `js` 368/0-fail, `python` 649 passed (goldens byte-identical, `NFR-CS-03`). Spec (`FEAT`/`DESIGN`/`TEST-STUDIO-001`) reconciled to the as-built rail. | ✅ | `FR-CS-03`, `TC-CS-03` |
| 2026-05-24 | Phase 4 | **canvas-items shape styling shipped (`FR-CS-04`).** Scope clarified at review: the engine **already** renders nodes as the **real cloud-icon glyphs** (richer than the prototype's flat-tile mockup), so P4 **matched `renderSVG`** (not the mockup) — keeping the glyphs and fixing the two real gaps. **Regions** (`engine/shapes.tsx` `KymoRegionEngineUtil` component + `toSvg`) now match `renderSVG`'s `REGION_STYLE`: outer = slate `#cbd5e1` solid + `rgba(15,23,42,.02)` fill; **inner (`dash:"dashed"`) = purple `#7c3aed` dashed + `rgba(124,58,237,.03)` fill + `#6d28d9` label**. **Edges** now `#94a3b8` width-2 + the signature **flow-dash animation** (`stroke-dasharray:6 4` + a `kymo-edge-flow` keyframe in `index.html` → `stroke-dashoffset:-10`; `toSvg` emits a SMIL `<animate>` so the export flows too). Nodes/`note`/`text`/`freedraw` unchanged. Verified: `tsc` clean; bundle ~412 KB; **`npm run test:e2e` 12/12 locally** (ran it this time per the P3 lesson); chrome-anhv light+dark — inner region purple-dashed, outer slate, 20 edges `#94a3b8` dash `6 4` with `animationName=kymo-edge-flow` running, 0 console errors (`TC-CS-04`). Regression green: `js-canvas` 19/19, `js` 368/0-fail, `python` 649 passed (goldens byte-identical — `renderSVG` untouched, `NFR-CS-03`). Spec reconciled (`FR-CS-04`/§5/`TC-CS-04` → match `renderSVG`). | ✅ | `FR-CS-04`, `TC-CS-04` |
| 2026-05-24 | Phase 5 | **canvas-items selection & markers shipped (`FR-CS-05`).** Extended the engine's in-wrapper selection outline (`website/app/src/engine/react.tsx` `ShapeView`) with **four corner resize handles** (`data-testid="selection-handle"`, presentational — resize is backlog) + a **`W × H` size badge** (`data-testid="selection-size"`), all **accent-green** (`var(--accent)`/`var(--accent-fg)`, matching the prototype `KSelect`, replacing the old generic blue) and page-unit (`/cam.z`) sized so they're constant on screen and ride a dragged node frame-for-frame. The `selected` gate generalised from node-only to **any** selected shape. **Comment-pin dropped** (no comment data model — backend feature, like the P2 presence trim). New `e2e/selection.spec.ts` (3 cases). Verified: `tsc` clean; bundle ~416 KB; **`npm run test:e2e` 15/15 locally**; chrome-anhv — Orchestrator node shows green rect + 4 handles + `70 × 64` badge, 0 console errors (`TC-CS-05`). Regression green: `js-canvas` 19/19, `js` 368/0-fail, `python` 649 passed (goldens byte-identical, `NFR-CS-03`); render-guard unaffected (`NFR-CS-02`). Spec reconciled (`FR-CS-05`/§6/`TC-CS-05`). | ✅ | `FR-CS-05`, `TC-CS-05` |
| 2026-05-24 | Phase 6 | **canvas-status-bar shipped (`FR-CS-06`).** New floating **status bar** (`website/app/src/ui/StatusBar.tsx`, a sibling of `EngineBoard` under `.canvas-wrap`): **counts** (`19 nodes · 20 edges` from the diagram), **autosave** (`Saving…`→`Saved`, edit-driven), and **zoom −/%/+ + Fit**. Added an engine **`ViewApi`** (`{zoomIn,zoomOut,fit,getZoom}`) in `engine/react.tsx` (`onViewReady`, threaded via `EngineBoard`): zoom goes through `editor.zoomToPoint`/`zoomToFit` + **`applyCamera`** (DOM transform) so it's **0 shape re-renders** like wheel-zoom; the `%` is a **200 ms isolated poll** in `StatusBar` so wheel-zoom updates it without re-rendering the canvas. Added `Minus`/`Plus` icons; `.k-statusbar`/`.k-chip` CSS. Verified: `tsc` clean; bundle ~416 KB; **`npm run test:e2e` 17/17 locally** (fixed two test fallouts: the new bottom bar overlapped `selection.spec.ts`'s empty-point finder → now rejects chrome; `status.spec.ts` waits for the auto-fit `%` to settle); chrome-anhv — `19 nodes · 20 edges`, zoom 69%→83%→100%→Fit 69%, Saved, 0 console errors (`TC-CS-06`). Regression green: `js-canvas` 19/19, `js` 368/0-fail, `python` 649 passed (goldens byte-identical, `NFR-CS-03`); render-guard green (`NFR-CS-02`). Spec reconciled. | ✅ | `FR-CS-06`, `TC-CS-06` |
| 2026-05-25 | Phase 7 | **chrome de-dup shipped (`FR-CS-07`) — CR-STUDIO-001 close-out (Path A).** Removed the duplication earlier phases had baked in (top-bar theme toggle + the floating toolbar's light/dark both drove `selectBg`; top-bar Export + the floating SVG button both called `onDownload`). One owner per control: the floating `.toolbar` is **deleted** from `App.tsx`/`index.html`; the **sample picker** (`topbar-sample`) + a **3-mode light/dark/transparent background control** (`topbar-bg-*`, `.k-sample`/`.k-seg`, soft `--accent-soft` active) move to the top bar reusing `selectBg`/`bgActive`; the standalone theme toggle is **subsumed**; a **single Export** (`data-testid=export`; floating `#download` gone); truthful `Code`/`Preview` tabs (`tab-code`/`tab-preview` — Preview active ⇔ code pane hidden). Reused the existing `Checker` icon; `App.tsx` rewired (`selectSample`); dead `.toolbar`/`.tbtn`/`.pick`/`.bg-toggle` CSS removed; the two inert `.closest(".toolbar")` test guards cleaned. New `e2e/chrome.spec.ts` (`TC-CS-07`, 4 cases). Verified: `tsc` clean; bundle **416 KB**; **`npm run test:e2e` 21/21** (4 new); chrome-anhv — no floating toolbar, sample + 3-mode bg in the top bar, single Export, light/dark/transparent all work, 0 console errors. Regression green: `js` 368/0-fail, `python` goldens byte-identical (`renderSVG`/`svgBackground` untouched, `NFR-CS-03`/`NFR-CS-05`). | ✅ | `FR-CS-07`, `TC-CS-07` |

**Programme complete (P1–P7).** All seven phases shipped — tokens → top bar → left tool rail → item
styling → selection & markers → status bar → chrome de-dup (P7 delivered via `CR-STUDIO-001`, Path A,
after the initial P1–P6 programme). The playground wears the hi-fi editor chrome over the unchanged
engine — **client-only, `renderSVG` golden-frozen, zero new runtime deps, one owner per control**.
`TC-CS-01..07` covered; the gated render-guard suite is now **21 Playwright tests** (incl.
`e2e/{selection,status,chrome}.spec.ts`). Deferred to sibling specs (out of scope here):
`canvas-inspector` (Selected/Animate/Outline + reactive selection), `canvas-timeline`,
`canvas-create-tools` (the rail's disabled placeholders), and any presence/comments/dashboard/AI
(need a backend).

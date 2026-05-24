---
title: Canvas Studio — Implementation Plan
document_id: PLAN-STUDIO-001
version: "0.1"
issue_date: 2026-05-24
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
| Version           | 0.1                                                             |
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

**Sequencing:** `1 → (2 ∥ 3 ∥ 4 ∥ 6) → 5`. **Regression gate every phase:** `TEST-CANVAS-001`
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
| V&V build-out (`TC-CS` + regression harness) — *shared, programme-level* | all | (3) | Playwright specs + golden checks |
| **Total (this feature)** | | **≈ 42** | **Complexity: Medium–High** |

- **Confidence:** range **32–55 SP**; widest variance is **item styling** (P4) if theme parity needs
  per-shape token work.
- **Per-feature cap:** ≈ 42 SP **≤ 50** ✓. **Per-phase cap:** every phase **≤ 10 SP** ✓ (largest 8).
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
- **Regression throughout:** `TEST-CANVAS-001` + `TEST-JAM-001` + render-guard green; `cd
  packages/js && npm test` and `cd packages/python && uv run --group dev python -m pytest -q` stay
  green (goldens unchanged).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial plan: hi-fi editor UI shell over the complete engine. 1-based phases ≤ 10 SP — tokens → top bar → tool rail → item styling → selection → status bar (≈ 42 SP). Risk register (`RK-CS-01..06`), files-to-touch, golden-safe verification, deferred-sibling non-goals. |

## Annex B — Open questions / pending decisions

1. **Breadcrumb/title persistence** — local-only label for the MVP; a real per-board title needs the
   dashboard + a backend (out of scope). Keep it cosmetic or drop it?
2. **Undo/redo button state** — reflect `canUndo`/`canRedo` reactively (store-change tick) vs.
   always-enabled no-ops (`RK-CS-02`).
3. **Tool-rail layout** — left rail **and** bottom toolbar (prototype shows both), or pick one to
   reduce duplication? Default: ship the left rail; bottom toolbar optional.
4. **Comment-pin marker** — render a static visual-only pin now, or defer entirely until the
   comments backend exists? (Threads are out of scope regardless.)

## Annex C — Worklog

Append-only progress log (newest at the bottom) — ISO/IEC/IEEE 12207 §6.3.2. `Status`: ✅ done ·
🚧 in progress · ⏳ pending.

| Date       | Phase / area | Work | Status | Ref |
|------------|--------------|------|--------|-----|
| 2026-05-24 | Docs | Authored the canvas-studio spec/plan doc set (`INTRO`/`FEATURE`/`DESIGN`/`TEST`/`PLAN`) — the hi-fi editor UI shell over the complete engine + freeform tools, decomposed by canvas region (top bar / left sidebar / items / status bar), client-only, ≤ 50-SP cap with ≤ 10-SP phases. Sibling of `canvas-jam` (not a rename). | ✅ | `INTRO-STUDIO-001` |
| 2026-05-24 | Phase 2 | **canvas-topbar shipped (`FR-CS-02`).** Replaced the bare `<header>` with a hi-fi **`TopBar`** (`website/app/src/ui/TopBar.tsx`) + a ported, dependency-free icon set (`website/app/src/ui/icons.tsx`): brand, an **editable title** (local state), centre **Code/Preview tabs**, **undo/redo**, **theme toggle**, and **Export/Share** (reuse `onDownload`/`onShare`). **Trimmed** the backend-implying chrome at review (`FR-CS-02` is client-only): dropped the "Playground ›" breadcrumb, the star, the **Comments/Versions** tabs, and the **presence** avatar (boards/comments/multiuser are out of scope) — dead CSS removed too. `EngineBoard` gained an `onEditorReady` prop handing `App` the live `Editor` (drives top-bar undo/redo; also sets up P6 camera/fit). The Code tab toggles a `showCode` flag that hides the `.kymo` pane (`main.code-hidden` → single column). Topbar CSS ported into `index.html` (`.k-topbar`/`.k-logo`/`.k-btn*`/`.center-tabs`/`.k-presence`, token-driven → themes via `[data-theme]`). Verified: `tsc --noEmit` clean; `build.sh` bundle 399→**410 KB**; chrome-anhv (light **and** dark) — topbar renders + themes, Code tab hides/shows the editor pane, Comments/Versions disabled, undo/redo wired (no-throw), theme flips, title editable, 0 console errors (`TC-CS-02`). Regression green: `js-canvas` **19/19**, `js` **368 pass/0 fail**, `python` **649 passed** (goldens byte-identical — `renderSVG` untouched, `NFR-CS-03`). | ✅ | `FR-CS-02`, `TC-CS-02` |
| 2026-05-24 | Phase 1 | **Design-token migration shipped (`FR-CS-01`).** Ported the hi-fi prototype's `tokens.css` into `website/app/index.html`'s `<style>` **additively** — two new blocks (`:root` light + `:root[data-theme="dark"]` overrides) adding `--bg-elev`, `--canvas-grid`, `--border-soft/strong`, `--text-mute`, `--text-on-canvas(-dim)`, `--accent-soft/fg`, `--accent-2-soft`, `--user-1..5`, `--aws-*`, `--tok-*` (DSL syntax), the `--r-sm..xl` scale, the `--shadow-sm/shadow/shadow-lg/shadow-glow` box-shadow scale (the unused colour `--shadow-sm` repurposed), and `--topbar-h`/`--rail-w`. **No token the current CSS references was changed** → P1 restyles nothing; no consumer yet (P2–P6). No bundle rebuild (CSS lives in `index.html`, not `kymo.bundle.js`). Verified (chrome-anhv, `npx http-server`): `/app/` 200, React mounts, screenshot **pixel-unchanged** vs before; `getComputedStyle(:root)` resolves all new tokens in **light** (`--bg-elev` #ffffff, `--tok-kw` #56880c, `--shadow-sm` light) and **dark** (`--bg-elev` #1a1a24, `--tok-kw` #76b900, `--shadow-sm` dark) — theme-neutral tokens identical across both; existing tokens still flip (`--bg` #ffffff↔#131419); 0 console errors (`TC-CS-01`). | ✅ | `FR-CS-01`, `TC-CS-01` |

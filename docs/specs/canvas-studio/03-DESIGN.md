---
title: Canvas Studio — Design
document_id: DESIGN-STUDIO-001
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
  - TEST-STUDIO-001
  - PLAN-STUDIO-001
  - DESIGN-JAM-001
  - DESIGN-ENGINE-001
  - DESIGN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - technical-design
  - canvas-studio
  - editor-shell
  - design-tokens
  - tool-registry
  - item-styling
  - status-bar
  - golden-safe
---

# Canvas Studio — Design

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | DESIGN-STUDIO-001                                                |
| Version           | 0.1                                                             |
| Status            | Draft                                                          |
| Owner             | `diagrams/` project                                           |
| Audience          | Engineers building the editor chrome (`website/app/`)         |
| Related Documents | `FEAT-STUDIO-001` (requirements), `PLAN-STUDIO-001` (phases/why), `DESIGN-JAM-001` (freeform tools + export), `DESIGN-ENGINE-001` (store/editor/camera), `DESIGN-CANVAS-001` (sync engine + `patchDsl`) |

> **Status note.** Draft engineering design, not a committed spec — the *how* that complements
> `PLAN-STUDIO-001` (the *why* + phase order). This feature **builds on** the engine core
> (`DESIGN-ENGINE-001`: store §5, editor §6, camera/viewport §8, custom-shape API §9, persistence
> §11), the freeform tools + `toSvg` export (`DESIGN-JAM-001` §4/§7), and the playground sync engine
> + `patchDsl` (`DESIGN-CANVAS-001`) — all **reused unchanged**. It adds React chrome and item
> styling only. The **design source** is the hi-fi prototype's `editor.jsx`/`tokens.css` (not in-repo;
> a visual reference).

---

## 1. Scope & relationship to the engine

`canvas-studio` re-implements the prototype's **Editor screen structure** as the real `website/app`
shell, driven by the live engine. It does **not** re-design the store/render/persist; it replaces the
bare `App.tsx` chrome (`<header>` + split-pane + a small FigJam toolbar) with the four hi-fi regions
and restyles the on-canvas items. Litmus test: *the engine and `patchDsl` round-trip behave
identically; only the surrounding chrome and item styling change.*

Target layout (replaces today's `header` + `main.{editor|view}`):

```
┌──────────────────────────── TopBar (FR-CS-02) ───────────────────────────┐
│ ◧ kymo · Untitled diagram        │ Code  Preview │  ↶ ↷  ☾  ⤓ Export  Share │
├──────┬──────────────────────────────────────────────────┬──────(reserved)─┤
│ Tool │  .kymo code pane          ░ Canvas (EngineBoard) ░ │  right panel    │
│ rail │  (toggle via Code tab)    ░  items (FR-CS-04)    ░ │  → canvas-      │
│(FR-  │                           ░  selection (FR-CS-05)░ │    inspector    │
│ CS-  │                           ░                      ░ │  (OUT of scope) │
│ 03)  │                           └ BottomToolbar (alt) ──┘ │                 │
├──────┴──────────────────────────────────────────────────┴─────────────────┤
│ StatusBar (FR-CS-06):  12 nodes · 11 edges │ ● saved │   − 72% +   ⤢ Fit    │
└────────────────────────────────────────────────────────────────────────────┘
```

## 2. Design tokens (`tokens.css` migration) — FR-CS-01

The prototype's `tokens.css` (surfaces, brand `--accent`/`--accent-2`, item palette
`--aws-*`, DSL-syntax `--tok-*`, radii, type, shadows, and a `[data-theme="light"]` block) is the
single source. `website/app/index.html` already declares an overlapping set with a `[data-theme]`
dark variant (`App.tsx:54` toggles it).

**Design.** Reconcile the two **additively** — port the prototype's variable names/values into the
app's style contract, keeping the existing `[data-theme]` switch as the theme driver (no JS theme
engine). The chrome and the canvas read the same tokens, so light/dark parity is automatic
(`NFR-CS-05`). No layout change in this phase: it is the surface P2–P6 consume. Visual-diff the
existing playground before/after to confirm no unintended restyle (`RK-CS-03`).

## 3. Top bar (`ui/TopBar.tsx`) — FR-CS-02

Replaces `App.tsx:196` `<header>`. A flex row of: brand (`KLogo`), an **editable title**
(controlled input, **local state only** — no persistence backend), the center **panel-toggle
tabs**, and the right action cluster. **Trimmed to client-only at the P2 build:** the bar carries
**no** breadcrumb, star, comments, version-history, or presence/account chrome — those imply a
backend (boards, comments, multiuser) and are out of scope (`FEAT-STUDIO-001` §4).

- **Undo/redo** → call `editor.undo()` / `editor.redo()` (engine history from `FR-J-02`). The
  enabled state reflects `editor.canUndo` / `canRedo`; since the engine has **no reactive selection
  signal**, recompute these from the store's change subscription that `EngineBoard` already holds
  (or render them always-enabled as a no-op-when-empty fallback — `RK-CS-02`).
- **Theme toggle** → flips `theme` state; the existing `useEffect` writes `[data-theme]`
  (`App.tsx:54`). Icon swaps sun/moon.
- **Export / Share** → reuse `onDownload` (board `toSvg` from `DESIGN-JAM-001` §4, DSL-render
  fallback) and `onShare` (`?script=` link copy) verbatim (`App.tsx:158-180`).
- **Center tabs** → just `Code` (toggles the `.kymo` pane via a new `showCode` layout flag) and
  `Preview` (the canvas, always on). `Comments` / `Versions` were **removed** — they need a backend
  (out of scope, `FEAT-STUDIO-001` §4).

## 4. Tool rail + registry (`ui/ToolRail.tsx`, `ui/tools.ts`) — FR-CS-03

The current FigJam toolbar (`App.tsx:236-316`) hard-codes four tool buttons. Generalise to a
**tool registry** so future creation tools are additive:

```ts
type ToolDef = { id: Tool | PlaceholderTool; icon: IconKey; kbd: string; title: string; enabled: boolean };
const TOOLS: ToolDef[] = [
  { id: "select", kbd: "V", title: "Select",        enabled: true },
  { id: "hand",   kbd: "H", title: "Pan",           enabled: true },   // real pan-anywhere tool (engine Tool union)
  { id: "draw",   kbd: "P", title: "Draw (pen)",    enabled: true },
  { id: "sticky", kbd: "S", title: "Sticky note",   enabled: true },
  { id: "text",   kbd: "T", title: "Text",          enabled: true },
  // reserved for canvas-create-tools (disabled placeholders):
  { id: "frame",  kbd: "F", title: "Container",     enabled: false },
  { id: "shape",  kbd: "R", title: "Shape",         enabled: false },
  { id: "diamond",kbd: "D", title: "Decision",      enabled: false },
  { id: "arrow",  kbd: "A", title: "Edge",          enabled: false },
  { id: "tile",   kbd: "C", title: "Cloud tile",    enabled: false },
  { id: "comment",kbd: "K", title: "Comment",       enabled: false },
];
```

`ToolRail` (`ui/ToolRail.tsx`, the flush vertical left rail) renders the registry, highlights the
active `tool`, and calls `setTool(id)` for `enabled` ones; placeholders are inert + tooltip-explained.
A **document-level keydown** in `App` maps `kbd → setTool` (`TOOL_SHORTCUTS`: V/H/P/S/T), guarded on
`document.activeElement` so the `.kymo` `<textarea>` keeps its keys (the same guard the undo keydown
uses, `DESIGN-JAM-001` §3). **As-built:** `hand` is a *real* tool added to the engine `Tool` union
(`engine/react.tsx`) — it pans on **any** drag (a pan-only gesture + grab cursor), not just
empty-canvas drag; placeholder ids never reach the engine. The existing floating toolbar **kept** the
sample-picker / background / export controls and its tool buttons **moved** to the rail (no
duplication) — so there is no separate bottom tool toolbar.

## 5. Canvas item styling (`engine/shapes.tsx`) — FR-CS-04

Item visuals live in the engine's interactive shape layer (`engine/shapes.tsx` — the `component`
hooks), **not** in `renderSVG` (`packages/js`, which is golden-frozen). **As-built decision:** match
**`renderSVG`** (the canonical render + export), not the prototype's `diagram.jsx` mockup — the
engine already renders the *real* cloud-icon glyphs, which the mockup only approximated, so chasing
the flat tile would be a downgrade and would diverge from the export.

| Engine shape | As-built styling | Source of truth |
|--------------|------------------|-----------------|
| `kymo-node` | the real cloud-icon **glyph** (`getIcon`) + name label — **unchanged** (already richer than the mockup) | engine `NodeView` |
| `kymo-region` | outer = slate `#cbd5e1` solid + `rgba(15,23,42,0.02)` fill; **inner (`dash:"dashed"`) = purple `#7c3aed` dashed + `rgba(124,58,237,0.03)` fill + `#6d28d9` label** | `renderSVG` `REGION_STYLE` (`render.ts`) |
| `kymo-edge` | `#94a3b8` width-2 line + arrowhead; **flow-dash animation** (`stroke-dasharray:6 4` + a `kymo-edge-flow` keyframe → `stroke-dashoffset:-10`); `toSvg` uses a SMIL `<animate>` so the export flows too | kymo "animated SVG" identity |
| `note` / `text` / `freedraw` | unchanged | (canvas-jam) |

The `toSvg` exporters (`DESIGN-JAM-001` §4) are updated in lockstep so board export stays WYSIWYG
(edges animate via SMIL; static-renders fine where SMIL is unsupported). **Golden-safe:** nothing in
`packages/js` changes (`NFR-CS-03`).

## 6. Selection affordances (`engine/react.tsx` shape wrapper) — FR-CS-05

The engine already renders a **selection outline inside each shape's wrapper** (`canvas-jam` P4 —
the outline rides the drag frame-for-frame, `DESIGN-JAM-001` §6). This feature extends that overlay
(in the **canvas layer**, not a React panel) with:

- four **corner resize handles** (`data-testid="selection-handle"`, white squares with an accent
  border) on the selection rect, and
- a **size badge** (`data-testid="selection-size"`, `W × H` from `getGeometry(s).bounds`) below the
  shape (prototype `KSelect`).

**As-built (P5):** the `selected` gate was generalised from node-only to **any** selected shape
(regions stay `pointer-events:none` so can't be click-selected; nodes + notes/text can). Rect,
handles, and badge are **accent-green** (`var(--accent)` / `var(--accent-fg)`, matching `KSelect`,
replacing the old generic blue) and sized in page units (`/cam.z`) so they're constant on screen.
Handles are **presentational in the MVP** (interactive resize is the `canvas-create-tools`/transform
backlog, mirroring `RK-EN-03`). **The comment-pin marker was dropped** — no comment data model; it
belongs to the backend comments feature.

> **Reactive-selection gap (`RK-CS-01`).** A *React panel* keyed on selection (the right inspector)
> can't update because the engine exposes selection imperatively, not as a reactive signal
> (`PLAN-JAM-001` P3 retired the non-reactive Inspector for exactly this). `FR-CS-05` sidesteps it by
> living in the canvas layer where the engine already re-renders the selected shape. The reactive
> signal is a **prerequisite the `canvas-inspector` sibling owns**, not this feature.

## 7. Status bar (`ui/StatusBar.tsx`) — FR-CS-06

A floating strip at the canvas bottom (prototype `.k-statusbar`/`.k-chip`), a **sibling of
`EngineBoard`** under `.canvas-wrap`, so its re-renders never touch the canvas shape layer
(`NFR-CS-02`). Three chips:

- **Counts** — from the parsed `Diagram` in `App` state (`diagram.components.length` /
  `diagram.edges.length`): "N nodes · M edges".
- **Autosave** — `Saving…`→`Saved`, driven by the `source` prop (an edit → `Saving…`, then a 700 ms
  idle → `Saved`). Honest: the app debounce-persists `source`→URL (`syncURL`) and
  camera/freeform→IndexedDB (`engine/persist`). *(No dedicated persist "saved" event exists, so the
  indicator is edit-driven, not a `scheduleSave` callback.)*
- **Zoom & Fit** — `−`/`+`/Fit call the engine **`ViewApi`** (`react.tsx`): `zoomIn`/`zoomOut` =
  `editor.zoomToPoint(clamp(z·f), viewportCentre)` + `applyCamera()`; `fit` = `editor.zoomToFit()` +
  `applyCamera()`. Going **through `applyCamera`** (DOM transform, no React render) keeps zoom at 0
  shape re-renders, like wheel-zoom. The `%` is a **200 ms poll** of `ViewApi.getZoom()` inside
  `StatusBar` (setState-on-change), so wheel-zoom updates the readout without re-rendering the canvas.

## 8. Component structure & state

- **New components:** `website/app/src/ui/{TopBar,ToolRail,BottomToolbar,StatusBar}.tsx` +
  `engine/tools-registry.ts` + an icon set (port the prototype's `icons.jsx` as a small TS module).
- **`App.tsx` changes:** swap `<header>`+`<main>` for `TopBar` + a 3-column flex
  (`code | canvas | reserved`) + `StatusBar`; add layout flags (`showCode`, editable `title`); keep
  the `tool` state and pass it to the rail + `EngineBoard` (already threaded). Reuse `onShare` /
  `onDownload` / theme effect untouched.
- **Engine layer:** `engine/shapes.tsx` (item styling, §5), `engine/react.tsx` (selection-handle
  overlay, §6). The `packages/js-canvas` package is **not** modified (`NFR-CS-03`).

## 9. Golden-safety, build & deploy

- **Golden-safe:** all visual change is in the interactive board (`engine/*`) + CSS tokens; the DSL
  renderer `renderSVG` (`packages/js`) and the Python renderer are untouched → `packages/js` /
  `packages/python` goldens stay **byte-identical** (`NFR-CS-03`, verified in `TEST-STUDIO-001` §4).
- **Build/deploy unchanged:** `website/app/build.sh` (esbuild → committed `kymo.bundle.js`),
  `deploy-website.yml` static publish to GitHub Pages. **No new runtime deps** (`NFR-CS-04`); the
  icon set is hand-rolled SVG (as the prototype's `icons.jsx`), not an icon library.

## 10. Risks / open questions

Tracked in `PLAN-STUDIO-001` §6. Design-level callouts:

1. **Reactive selection (`RK-CS-01`)** — selection-driven chrome stays in the canvas layer
   (`FR-CS-05`); the reactive signal + the inspector panel are the `canvas-inspector` sibling's job.
2. **Undo/redo button state (`RK-CS-02`)** — reflect `canUndo`/`canRedo` via the store-change tick,
   or ship always-enabled no-ops; either is acceptable for the MVP.
3. **Token migration churn (`RK-CS-03`)** — port additively + visual-diff so the existing playground
   look is preserved where intended.
4. **Scope creep (`RK-CS-04`)** — inspector / timeline / creation tools / presence are hard
   non-goals (`FEAT-STUDIO-001` §4); the rail shows only disabled placeholders for them.

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial design: token migration (§2), top bar (§3), tool rail + registry (§4), canvas-item styling (§5), selection handles/size badge in the canvas layer + the reactive-selection gap (§6), status bar (§7), component/state structure (§8), golden-safety + unchanged build/deploy (§9). Builds on `DESIGN-ENGINE-001`/`DESIGN-JAM-001`/`DESIGN-CANVAS-001`. **P2 build:** trimmed the top bar (§3) to client-only — dropped breadcrumb/star/Comments/Versions/presence. **P3 build:** §4 as-built — left `ToolRail` only (registry in `ui/tools.ts`); `hand` added to the engine `Tool` union (pan-anywhere); floating toolbar keeps sample/bg/export. **P4 build:** §5 as-built — match `renderSVG` not the mockup: node glyph kept, region outer-slate / inner-purple-dashed, edge flow-dash (CSS keyframe + SMIL). **P5 build:** §6 as-built — selection generalised to any selected shape; rect/handles/badge accent-green; comment-pin dropped (no data model). **P6 build:** §7 as-built — status bar via engine `ViewApi` (zoom through `applyCamera`, isolated `%` poll); autosave edit-driven. **canvas-studio complete (P1–P6).** |

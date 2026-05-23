---
title: Interactive Canvas Editor — Roadmap
document_id: RMAP-CANVAS-001
version: "0.1"
issue_date: 2026-05-23
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo web playground (`website/app/`) and the `packages/js` model/parser
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - DSL-LANG-001
  - RES-MERMAID-D2-001
  - RES-LANG-EVAL-001
authors:
  - Vũ Anh
language: en
keywords:
  - roadmap
  - playground
  - canvas-editor
  - whiteboard
  - tldraw
  - react
  - wysiwyg
  - dsl-serializer
  - round-trip
---

# Interactive Canvas Editor — Roadmap

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | RMAP-CANVAS-001                                                  |
| Version           | 0.1                                                              |
| Issue Date        | 2026-05-23                                                       |
| Status            | Draft                                                           |
| Classification    | Internal                                                        |
| Owner             | `diagrams/` project                                             |
| Audience          | Engineers evolving the web playground (`website/app/`) and `packages/js` |
| Related Documents | `DSL-LANG-001` (serializer target grammar), `RES-MERMAID-D2-001` (positioning / "animation is the moat"), `RES-LANG-EVAL-001` |

> **Status note.** This is a *proposal / roadmap*, not a committed spec. It records the decision
> to grow the playground into an interactive canvas editor, the architecture that follows from the
> current code, and a phased path. Phase 0 should be re-validated against the live code before
> starting (the playground evolves).

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
  a key.
- **Bundle size.** The committed `kymo.bundle.js` is ~222 KB today; tldraw + React push it to
  ~1–3 MB. Acceptable for a static playground, but it is a committed-in-git artifact.
- **tldraw assets.** For zero-network rendering, self-host tldraw fonts/icons via `@tldraw/assets`
  copied into `website/` (else it fetches from a CDN).
- **DSL v3 watch-out.** The mooted v3 direction (indentation / CSS-cascade styling) is **not yet
  in `docs/`**. If v3 lands, the serializer's *output grammar* changes — either target it directly
  or accept that Phase 3 needs re-targeting. Coordinate with `DSL-LANG-001`.

---

## 3. Architecture

```
website/app/
├── package.json          # NEW devDeps: react, react-dom, @tldraw/tldraw, @tldraw/assets, esbuild, typescript
├── build.sh              # UPDATED: npm ci → esbuild src/main.tsx (JSX auto) → committed kymo.bundle.js
│                         #          + copy tldraw assets + tldraw CSS into website/app/
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
types. Crucially, the model carries **resolved absolute `pos` / `bounds` / `via`** after
`parseDiagram` — exactly what a model-driven canvas needs.

### 3.1 Sync flow (with a loop guard)

Mirror the existing `renderToken` pattern in `app.js` to prevent A→B→A feedback:

- **text → canvas:** edit `.kymo` → `parseDiagram()` → `diagramToShapes()` → patch the tldraw
  store, touching **only diagram-layer shapes** (never the freeform layer).
- **canvas → text:** drag/resize a kymo shape → `shapesToDsl()` → update editor text → re-render.
- Debounce both; a monotonic token discards stale updates.

### 3.2 The crux — `shapesToDsl` (Diagram → `.kymo`)

`DSL-LANG-001` §6 already provides every construct the serializer needs: leaves with `@ (x,y)`
absolute positions (§6.4), regions (`outer`/`inner` + `contains`, §6.5), and edges with `src=` /
`dst=` anchors + `via=` waypoints (§6.7). Two implementation tiers:

- **Tier 1 (MVP, Phase 3a) — regenerate.** Emit every leaf with explicit `@ (x,y)`, regions with
  their member ids, edges with anchors / vias. Simple and correct, but **lossy**: drops comments,
  layout containers (`horizontal`/`vertical`), and parent-relative placement (`@ orch right 50`)
  — everything flattens to absolute coordinates.
- **Tier 2 (better, Phase 3b) — surgical text patch.** Retain per-element **source spans** so a
  canvas edit rewrites *only* the changed `@ placement` / `pos` / `via` token in the original
  text, preserving comments and declarative structure. Requires a small **additive** parser
  enhancement in `packages/js/src/dsl.ts` to record line/col ranges per leaf/edge (currently
  discarded). This is what truly delivers "sync with the `.kymo` file".

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

## 5. Files to create / modify

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

## 6. Verification

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

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial roadmap draft.           |

## Annex B — Open Questions

1. **tldraw vs. a lighter custom canvas** if the freeform half turns out to be secondary — would
   react-flow + a thin drawing layer suffice and keep the bundle small?
2. **Serializer target grammar** — build against `DSL-LANG-001` v2.0 now, or wait for the v3
   direction to stabilise to avoid re-targeting?
3. **Auto-layout vs. manual positions** — once a node is dragged, its declarative placement
   (`@ parent side gap`) is replaced by `@ (x,y)`. Is that acceptable, or should the editor offer
   a "re-flow" that restores declarative layout?

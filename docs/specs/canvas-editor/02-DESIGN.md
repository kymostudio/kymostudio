---
title: Interactive Canvas Editor — Design
document_id: DESIGN-CANVAS-001
version: "1.0"
issue_date: 2026-05-23
status: Baselined
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the canvas editor in `website/app/` and touching `packages/js`
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - FEAT-CANVAS-001
  - PLAN-CANVAS-001
  - TEST-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - technical-design
  - canvas-editor
  - tldraw
  - react
  - sync-engine
  - dsl-serializer
  - round-trip
  - source-spans
---

# Interactive Canvas Editor — Design

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | DESIGN-CANVAS-001                                               |
| Version           | 1.0                                                              |
| Issue Date        | 2026-05-23                                                       |
| Status            | Baselined                                                       |
| Classification    | Internal                                                        |
| Owner             | `diagrams/` project                                             |
| Audience          | Engineers implementing the editor (`website/app/`) and `packages/js` |
| Related Documents | `PLAN-CANVAS-001` (why / phases), `KYMO-DSL-001` (serializer target grammar) |

> **Status note.** Draft engineering design, not a committed spec. This is the *how* that
> complements `PLAN-CANVAS-001` (the *why* and the phase ordering). Re-validate symbol names against
> `packages/js/src` before implementing — the package evolves.

---

## 1. Scope & relationship to `PLAN-CANVAS-001`

`PLAN-CANVAS-001` decides **what** to build and the **phase order** (0 → React scaffold, 1 → tldraw
board with the diagram embedded, 2 → per-node shapes, 3 → round-trip sync, 4 → polish). This document
specifies the **engineering** for Phases 0–3: data flow, module contracts, the kymo↔tldraw mapping,
the sync engine, and the `Diagram → .kymo` serializer. Phase-4 polish (freeform persistence, undo
across layers, WebP export, icon palette) is sketched only where it constrains earlier design.

Phasing is **not** repeated here — see `PLAN-CANVAS-001` §4.

## 2. Goals / non-goals

**Goals**
- A **model-driven** canvas (the rendered SVG is not hit-testable — see §3) where kymo nodes are
  real, selectable, draggable objects.
- **Two-way sync**: editing `.kymo` text updates the canvas; moving/renaming a kymo shape updates the
  `.kymo` text. `.kymo` remains the source of truth for the diagram.
- **Freeform whiteboard** (sticky notes, draw, frames) coexisting on the same board.
- **Single-player, static**: no backend, deployable as a committed bundle on GitHub Pages.

**Non-goals (this version)**
- Multiplayer / real-time collaboration (needs a server — explicitly out per `PLAN-CANVAS-001` §2.1).
- Serializing the **freeform layer** into `.kymo` (the DSL has no representation for it — `KYMO-DSL-001` §6).
- Targeting a future v3 grammar; we serialize to `KYMO-DSL-001` v2.0.

## 3. Architecture & data flow

Two facts from the current code drive the whole design:

1. `renderSVG()` (`packages/js/src/render.ts`) returns a **monolithic SVG string**; node groups are
   emitted as `<g transform="translate(x,y)">…glyph…</g>` with **no `id` / `data-*`**. You cannot
   select or hit-test a node from that output ⇒ the canvas must be driven by the **`Diagram` model**,
   not the SVG.
2. There is **no `Diagram → .kymo` serializer** in the repo (only one-way emitters). Round-trip
   requires writing one (§8).

The editor maintains **two layers** on one tldraw board:

```
                ┌──────────────────────── tldraw board (Editor.store) ───────────────────────┐
                │                                                                             │
  .kymo text ⇄  │   kymo-diagram layer  (shapes tagged meta.kymo = { id })   │  freeform layer │
  (source of    │   ── derived from the Diagram; never persisted separately  │  sticky notes,  │
   truth for    │                                                            │  draw, frames…  │
   the diagram) │                                                            │  (tldraw-only)  │
                └─────────────────────────────────────────────────────────────────────────────┘

  text  ──parseDiagram()──▶  Diagram  ──diagramToShapes()──▶  kymo-layer shapes      [text → canvas]
  text  ◀──shapesToDsl()──   Diagram' ◀──shapesToDiagram()──  kymo-layer shapes      [canvas → text]
```

The freeform layer is opaque to `.kymo`: it lives only in tldraw's store and is persisted via tldraw
(§11). Only shapes tagged `meta.kymo` participate in sync.

Modules (full tree in `PLAN-CANVAS-001` §3):

| Module | Responsibility |
|--------|----------------|
| `src/App.tsx` | Layout: `<SourcePanel/>` ∥ `<Board/>`, top-bar Share, bottom toolbelt. Owns the shared source-text state. |
| `src/SourcePanel.tsx` | `.kymo` text editor; controlled by source state; emits edits. |
| `src/Board.tsx` | Wraps `<Tldraw/>`, registers `KymoNodeShapeUtil`, mounts the sync engine via `useKymoSync`. |
| `src/kymo-sync/diagramToShapes.ts` | `Diagram → TLShapePartial[]` (kymo layer only). |
| `src/kymo-sync/shapesToDsl.ts` | kymo-layer shapes → `.kymo` text — **the serializer** (§8). |
| `src/kymo-sync/KymoNodeShapeUtil.tsx` | Custom tldraw shape for one kymo node (§6). |
| `src/share.ts` | Ported `?script=` deflate/base64url sharing (keep link compatibility). |
| `src/samples.ts` | Inlined samples via esbuild text loader. |

## 4. Module interfaces (TypeScript sketches)

Indicative signatures, not final:

```ts
// kymo-sync/diagramToShapes.ts
import type { Diagram } from "kymostudio";
import type { TLShapePartial } from "tldraw";
/** Pure: positioned Diagram → kymo-layer shape partials (each meta.kymo = { id }). */
export function diagramToShapes(d: Diagram): TLShapePartial[];

// kymo-sync/shapesToDsl.ts
export interface SerializeOpts {
  /** Tier-2 only: original text + spans for surgical patching. Omit ⇒ Tier-1 regenerate. */
  base?: { text: string; spans: SourceSpans };
}
/** kymo-layer shapes (+ optional diagram for non-geometric fields) → .kymo text. */
export function shapesToDsl(shapes: KymoNodeShape[], opts?: SerializeOpts): string;

// kymo-sync/useKymoSync.ts
export function useKymoSync(editor: Editor, source: string, setSource: (s: string) => void): void;
```

`Component`, `Region`, `Edge`, `Diagram`, `componentHalf`, `anchor`, `parseDiagram`, `renderSVG`,
`getIcon` are imported **as-is** from `kymostudio` (`packages/js/src/index.ts`). The model already
carries resolved absolute `pos` / `bounds` / `via` after `parseDiagram` — exactly what the canvas
needs.

## 5. kymo ↔ tldraw mapping

`Component.pos` is the node **centre**; tldraw shape `x/y` is the **top-left**. Convert with
`componentHalf(c)` (`model.ts`), which honours `Component.size` (BPMN) or falls back to `SHAPE_HALF`.

| kymo model | tldraw representation | Notes |
|------------|----------------------|-------|
| `Component` | custom `'kymo-node'` shape | `x = pos[0] − hw`, `y = pos[1] − hh` where `[hw,hh] = componentHalf(c)`. Props mirror the Component (id, shape, icon, accent, name, subtitle, size). `meta.kymo = { id }`. |
| `Region` | `frame` (or `geo` rect) | From `bounds = [x,y,w,h]`; label = `Region.label`. `meta.kymo = { id, kind: 'region' }`. Inner vs outer → styling. |
| `Edge` | `arrow` (Phase 2) → custom (Phase 3) | Bind to source/dest kymo shapes; carry `srcAnchor/dstAnchor/via`. `meta.kymo = { kind: 'edge', src, dst }`. BPMN edges (`Edge.points`) draw the explicit polyline. |

Everything not tagged `meta.kymo` is freeform and ignored by sync.

## 6. Custom shape — `KymoNodeShapeUtil`

```ts
type KymoNodeShape = TLBaseShape<"kymo-node", {
  w: number; h: number;
  kymoShape: Shape;       // model Shape union ("hex" | "box" | "cube" | …)
  icon: string;           // icon key for getIcon()
  accent: string;
  name: string; subtitle: string;
}>;
```

- `getDefaultProps()` — sensible blanks (`box`, empty labels).
- `getGeometry(shape)` — a `Rectangle2d` sized from `componentHalf` (×2) or `Component.size`; this is
  what tldraw uses for hit-testing and selection bounds.
- `component(shape)` — renders the node: resolve the glyph through `getIcon(props.icon)` (async ⇒ see
  cache below) and inject it (`dangerouslySetInnerHTML`) plus the label `<div>`. Reuse the renderer's
  visual language (`render.ts` `DEFS`/`CSS`) for visual parity with the exported SVG.
- `indicator(shape)` — a rect matching the geometry (tldraw selection outline).
- **Icon cache** — `getIcon()` is async; cache resolved SVG by key in a module-level `Map` so
  re-renders are synchronous after first resolve. Built-in icons resolve offline; file-backed icons
  fetch from the jsDelivr base URL (`setIconBaseURL`, already wired in `app.js`).

## 7. Sync engine (`useKymoSync`)

A two-way binding with explicit echo-suppression — mirrors the `renderToken` guard already in
`app.js`.

State: a monotonic `epoch` counter and an `applying` boolean ref.

**text → canvas** (on source change, debounced ~220 ms):
1. `const my = ++epoch;` then `parseDiagram(text)` (in try/catch; show the error, keep last good canvas).
2. If `my !== epoch`, bail (a newer edit superseded this async parse).
3. Set `applying = true`; inside `editor.batch(...)`: **diff** the new `Diagram` against current
   kymo-layer shapes (by `meta.kymo.id`) and `createShapes` / `updateShapes` / `deleteShapes` for the
   delta only (never a full wipe-and-recreate — see §12). Leave freeform shapes untouched.
4. `applying = false`.

**canvas → text** (on store change):
1. `editor.store.listen(handler, { source: "user", scope: "document" })` — `source: "user"` already
   excludes our programmatic writes; the `applying` flag is a belt-and-braces second guard.
2. If `applying`, ignore. Filter the changed records to shapes carrying `meta.kymo`. If none, ignore
   (freeform-only edit).
3. Rebuild a `Diagram` from the kymo-layer shapes (`shapesToDiagram`) and call
   `shapesToDsl(...)` → `setSource(newText)`, debounced.

**Loop guard summary**: programmatic writes are flagged (`applying` + tldraw's own `source:"user"`
filter); stale async parses are dropped by `epoch`. This prevents `A → B → A` oscillation.

## 8. The serializer — `shapesToDsl` (the crux)

The DSL provides every construct needed (`KYMO-DSL-001` §6): leaf `@ (x,y)` absolute positions (§6.4),
regions with `contains` (§6.5), edges with `src=`/`dst=` anchors + `via=` waypoints (§6.7). **All
coordinates are integers** (`-?\d+`) — `Math.round` every value.

### 8.1 Tier 1 — regenerate (Phase 3a)

Emit a complete `.kymo` from the model, in the recommended statement order (`KYMO-DSL-001` §8.1):

```
title: "…"            # if Diagram.title
subtitle: "…"         # if Diagram.subtitle

<region blocks with inline leaves>      # region.id style "label" [opts] { … }
<loose leaves>                          # id shape/icon/accent "name" "sub" @ (x,y)
<edges>                                 # src -->|==> dst : "label" { src=…, dst=…, via=… }
```

- **Leaf**: `` `${id} ${shape}/${icon}/${accent} "${name}" "${subtitle}" @ (${rx}, ${ry})` `` where
  `[rx,ry] = round(pos)`.
- **Region**: `` `${id} ${style} "${label}" {` `` + member ids (one per line) + `}`.
- **Edge**: arrow from `style` (`orange → ==>`, else `-->`; `noArrow → ---`); append
  `{ src=…, dst=…, via=(x,y);… }` only for non-default fields.

**Lossy** by nature: comments, layout containers (`horizontal`/`vertical`), and parent-relative
placement (`@ orch right 50`) are flattened to absolute `@ (x,y)`. Acceptable for the MVP; addressed
by Tier 2.

### 8.2 Tier 2 — surgical patch (Phase 3b)

Keep the original text as the base and rewrite **only** what changed, preserving comments and
declarative structure:

1. From `parseWithSpans()` (§9) get a per-element source span.
2. For each moved/renamed kymo shape, locate its line; replace just the affected token:
   - moved → replace the trailing `@ …` (or **append** `@ (x,y)` if the leaf had none).
   - renamed → replace the relevant quoted string.
3. Untouched lines are byte-preserved.

### 8.3 Edge cases

| Case | Handling |
|------|----------|
| Shape **created** on canvas | No source span ⇒ **append** a new leaf/edge line at file scope. |
| Shape **deleted** on canvas | Remove its source line (Tier 2) / omit it (Tier 1). |
| **Renamed** label | Replace the quoted `"name"` / `"subtitle"` token. |
| Non-integer position | `Math.round` (DSL ints only). |
| Id collides with a **reserved keyword** | Reject / suffix; see `KYMO-DSL-001` §6.8 reserved list. |
| Parent-relative leaf dragged | Tier 1 flattens to `@ (x,y)`; Tier 2 may keep parent ref if unmoved (see Risk §14). |

## 9. Parser change for source spans (additive)

`makeComponentFrom(m, lineNo)` and `makeEdgeFrom(m, lineNo)` in `dsl.ts` **already receive** a
`lineNo` (the `i + 1` passed at each call site) but **discard** it — so capturing spans is additive.

Design:
- Add `parseWithSpans(dsl): { result: ParseResult; spans: SourceSpans }` where

  ```ts
  interface Span { line: number; atRange?: [start: number, end: number]; }  // 0-based line; col range of the `@ …` token
  interface SourceSpans {
    components: Map<string, Span>;   // by Component.id
    regions:    Map<string, Span>;   // by Region.id
    edges:      Span[];              // parallel to Diagram.edges order
  }
  ```

- **Constraint**: do **not** add fields to the `Component`/`Edge`/`Region`/`Diagram` objects, and do
  **not** change the existing `parse()` / `parseDiagram()` return shapes. The spans ride in a separate
  structure. This keeps the **byte-for-byte golden SVG tests** (`packages/python` goldens and the JS
  `node --test` suite) untouched, since the rendered `Diagram` is identical.
- Implementation: thread an optional collector through `parseBlock` → the per-kind builders, recording
  `lineNo` (and the `@`-token column range from the `LEAF_RE` match offsets) keyed by id / edge index.

## 10. Build / deploy / bundle

- **Toolchain**: `build.sh` runs `npm ci` then `esbuild src/main.tsx --bundle --format=esm
  --target=es2022 --loader:.kymo=text --loader:.bpmn=text --minify`. esbuild compiles `.tsx` with
  automatic JSX natively — no extra plugin.
- **Deps** (`website/app/package.json`, devDeps; `node_modules` git-ignored): `react`, `react-dom`,
  `@tldraw/tldraw`, `@tldraw/assets`, `esbuild`, `typescript`.
- **Committed bundle, no CI build**: `.github/workflows/deploy-website.yml` uploads `website/` as-is;
  `kymo.bundle.js` is regenerated locally and committed (unchanged deploy model).
- **tldraw assets**: self-host fonts/icons/translations via `@tldraw/assets` copied into `website/` so
  the page renders with zero network (else tldraw fetches from a CDN).
- **tldraw license / watermark**: set a `licenseKey` on `<Tldraw>` or accept the "made with tldraw"
  watermark. Decide before Phase 1.
- **Bundle budget**: ~222 KB today → ~1–3 MB with React + tldraw. Acceptable for a static playground
  but it is a committed-in-git artifact; watch the diff size.
- **Layout contract (`NFR-CE-08`)**: React mounts into `<div id="root">`, an extra DOM level between
  `<body>` and `header`/`main`. The vanilla `<body>` held the full-height flex column, so `#root`
  **must** re-declare it — `#root { flex: 1 1 auto; display: flex; flex-direction: column; min-height: 0 }`
  — otherwise `main { flex:1 }` has no full-height parent and the panes collapse to content height
  (the Phase-0 full-viewport regression). CSS lives in `index.html`, not the bundle (no rebuild to fix).

## 11. Persistence & sharing

- **Diagram layer** is *derived* from `.kymo` — never persisted independently (the text is the truth).
- **Freeform layer** persists through tldraw's `persistenceKey` (localStorage) and/or an exported
  `.tldr` snapshot.
- **`?script=`** sharing (`src/share.ts`, ported from `app.js`) continues to encode **only** the
  `.kymo` text. The freeform layer is **not** part of a shared link in this version (documented
  limitation).

## 12. Performance

- **Debounce** both directions (~220 ms), matching `app.js`.
- **Incremental diffing** in text→canvas: compute create/update/delete deltas by `meta.kymo.id`;
  never wipe-and-recreate the kymo layer (preserves selection, avoids flicker, keeps undo sane).
- **Async icon cache** (§6) so shape re-renders are synchronous after first resolve.
- **Epoch cancellation** drops superseded async parses (no wasted store writes).

## 13. Testing strategy

- **Unit (serializer)** — `parseDiagram(shapesToDsl(diagramToShapes(d))) ≈ d` round-trip idempotency
  for positions/ids; Tier-2: assert comments + untouched lines are byte-identical after a single-node
  move.
- **Unit (spans)** — `parseWithSpans` records correct line/col for leaves with and without `@ …`.
- **Integration (sync)** — simulate a programmatic apply and assert no `canvas→text` echo fires
  (loop guard); simulate a user drag and assert exactly one text update.
- **E2E** — drive the served app via the chrome-anhv MCP (as in prior sessions): load a sample, drag a
  node, confirm the `.kymo` text updates; drop a sticky note, confirm it does **not** leak into `.kymo`.
- **Regression** — `cd packages/js && npm test`. If `dsl.ts` is touched for spans, also run the Python
  golden suite (`KYMO_UPDATE_GOLDEN` only on *intentional* render changes) per `CLAUDE.md` to confirm
  no rendered-byte drift.

## 14. Risks / open questions

Carried from `PLAN-CANVAS-001` Annex B:

1. **Auto-layout vs. manual positions** — dragging a node replaces its declarative `@ parent side gap`
   with `@ (x,y)`. Acceptable, or offer a "re-flow" that restores declarative layout? Tier-2 can keep
   the parent ref for *unmoved* nodes to limit churn.
2. **Serializer target grammar** — build against `KYMO-DSL-001` v2.0 now; a future v3 (indentation /
   CSS-cascade styling) would force a re-target. Keep `shapesToDsl` grammar-output isolated behind one
   module to ease that.
3. **tldraw licensing** — watermark vs license key (also §10).
4. **Edges as tldraw arrows vs. custom** — native arrows are easy (Phase 2) but may not reproduce the
   renderer's anchor/via routing exactly; a custom edge shape closes the gap (Phase 3).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial technical design draft.  |
| 0.2     | 2026-05-23 | Vũ Anh | §10: added the `#root` full-height layout contract (NFR-CE-08). |
| 1.0     | 2026-05-23 | Vũ Anh | **Baselined** & relocated to `docs/specs/canvas-editor/`. |

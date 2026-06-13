---
title: BPMN Editor — Design
document_id: DESIGN-BPMN-EDITOR-001
version: "0.1"
issue_date: 2026-05-31
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the BPMN editor (`website/app/`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - FEAT-BPMN-EDITOR-001
  - TEST-BPMN-EDITOR-001
  - PLAN-BPMN-EDITOR-001
  - FEAT-ENGINE-001
  - FEAT-STUDIO-001
  - FEAT-JAM-001
  - FEAT-BPMN-PARSER-001
  - FEAT-BPMN-EXPORT-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - design
  - architecture
  - composition
  - iso-42010
  - bpmn-editor
  - palette
  - context-pad
  - reuse-map
---

# BPMN Editor — Design

| Field             | Value |
|-------------------|-------|
| Document ID       | `DESIGN-BPMN-EDITOR-001` |
| Version           | 0.1 |
| Issue Date        | 2026-05-31 |
| Status            | Draft |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-BPMN-EDITOR-001` (requirements), `TEST-BPMN-EDITOR-001` (V&V), `PLAN-BPMN-EDITOR-001` (plan), `BPMN-MAP-001` (mapping) |

> The engineering design (ISO/IEC/IEEE 12207 §6.4.4, architecture per ISO/IEC/IEEE 42010) for the
> bpmn-editor. The guiding constraint: it is a **composition** over the existing stack and **adds no
> engine or `bpmn-*` renderer change** (`NFR-BE-04`). Each section names where a requirement lands in
> `website/app/src` and which existing primitive it reuses.

---

## 1. Design invariant — compose, don't fork

The editor is built **entirely on top of** the published primitives; it never reaches into engine
internals and never edits the `bpmn-*` glyph renderers:

- **Engine** (`FEAT-ENGINE-001`, `packages/js-canvas` — exports `store`, `shape`, `editor`): the
  `Editor` facade (`createShape` / `updateShape` / `deleteShape` / `run(fn,{history})` / `zoomToFit`),
  reactive `Store`, `ShapeUtil`, viewport, selection/drag, `<Canvas>` React binding.
- **Studio** (`FEAT-STUDIO-001`): the tool rail + registry (`ui/tools.ts`), top bar, status bar,
  on-canvas item styling (`engine/shapes.tsx`).
- **Jam** (`FEAT-JAM-001`): undo/redo (history-tagged writes), board SVG export (`engine/export.ts`).
- **BPMN data** (`FEAT-BPMN-PARSER-001` / `FEAT-BPMN-EXPORT-001` / `BPMN-MAP-001`): `parseBpmn`,
  `toBpmn`, the `bpmn-*` `Component`/`Region`/`Edge` model + glyph renderers and default geometry.

```
website/app/src/
├── ui/
│   ├── tools.ts            # EXTEND: add the BPMN palette group (the disabled create-tool slots are the seam)
│   ├── ToolRail.tsx        # reused as-is (renders the registry)
│   ├── BpmnPalette.tsx     # NEW (optional): grouped BPMN element creators, if the rail isn't enough
│   └── ContextPad.tsx      # NEW: floating per-element action pad (FR-BE-05/06)
├── engine/
│   ├── bpmn-tools.ts       # NEW: placement + connect handlers → editor.createShape() (FR-BE-01..04)
│   ├── bpmn-ops.ts         # NEW: morph / append / label edits → editor.updateShape()/createShape() (FR-BE-05..07)
│   └── shapes.tsx          # EXTEND: canEdit + in-place label editor on bpmn-* utils (FR-BE-07)
└── bpmn-io.ts              # NEW: open (.bpmn → parseBpmn) / new / export (toBpmn / SVG) (FR-BE-09..11)
```

## 2. Reuse-vs-add map

| Concern | Already exists (reuse) | What this feature adds |
|---------|------------------------|------------------------|
| Render BPMN on canvas | `bpmn-*` shape utils + `parseBpmn` | — (use as-is) |
| Palette / tools | tool rail + registry; disabled create-tool slots | BPMN element creators + placement modes |
| Place a shape | `editor.createShape()` | per-type defaults (geometry, marker) from `BPMN-MAP-001` |
| Connect a flow | engine global-connect primitive | flow-type choice (sequence/message/association) per endpoints |
| Context pad | — | `ContextPad.tsx` + append/morph/connect/delete handlers |
| Morph type | `editor.updateShape()` | marker/glyph swap keyed to `BPMN-MAP-001` |
| Direct edit | `ShapeUtil.canEdit` | in-place label editor + commit-to-model |
| Move / reconnect | engine drag + selection | flow endpoints follow nodes |
| Undo/redo | engine history (`FR-J-02`) | group each BPMN edit into one step |
| Open `.bpmn` | `parseBpmn` | file picker + drag-drop wiring |
| Save `.bpmn` / SVG | `toBpmn` + board export (`FR-J-03`) | download affordances + filenames |
| Navigation | `zoomToFit` + status bar | keyboard-shortcut reference |

## 3. Palette & tools (FR-BE-01/02, FR-BE-12 nav)

Extend the studio tool registry (`ui/tools.ts`) with a **BPMN palette group**: one entry per core
creator (start/intermediate/end event, gateway, task, expanded sub-process, data object ref, data
store ref, group, generic create-element) plus the interaction tools (hand/pan, lasso-select,
global-connect). The rail's existing disabled create-tool slots (`frame`/`tile`/`shape`/`diamond`/
`edge`, labelled *"coming in canvas-create-tools"*) are the seam: the BPMN group is a **BPMN-specific**
palette that lives alongside (it does not repurpose the generic create-tools). Selecting a creator
sets an active placement tool; selecting an interaction tool delegates to the engine primitive. Zoom/
fit reuse the status bar (`FEAT-STUDIO-001`); a shortcut reference lists the palette/tool/edit keys.

## 4. Placement (FR-BE-03, NFR-BE-01)

`engine/bpmn-tools.ts` handles a canvas click in a placement mode: it looks up the active creator's
mapped `bpmn-*` type, marker, and **default geometry** from `BPMN-MAP-001` (event 36×36, task 100×80,
gateway 50×50, expanded sub-process as a default container `Region`), then calls
`editor.createShape()` with the click point as the centre/top-left (matching the engine's coordinate
convention). One shape op per placement → incremental, not a rebuild (`NFR-BE-01`).

## 5. Context pad, morph & direct edit (FR-BE-05/06/07)

`ui/ContextPad.tsx` renders the floating action set for the currently-selected element, positioned at
its bounds (read via the `Editor` facade). Actions dispatch to `engine/bpmn-ops.ts`:

- **Append-next** — create the new element offset from the source + a connecting flow, in one
  history step (`editor.run`).
- **Morph / change-type** — `editor.updateShape()` swaps the element's marker/glyph to the new BPMN
  subtype per `BPMN-MAP-001`, preserving id, position, and connected flows.
- **Connect-to / delete** — delegate to the connect primitive / `editor.deleteShape()`.
- **Direct edit** — `engine/shapes.tsx` sets `canEdit` on the `bpmn-*` utils and renders an in-place
  text overlay on double-click; commit writes `name`/`label` via `editor.updateShape()`.

The pad's contents are **element-aware**: the available append/morph targets depend on the selected
element's type (e.g. a gateway offers parallel/inclusive/exclusive; an event offers
start/intermediate/end), all enumerated from `BPMN-MAP-001`.

## 6. Flows, move & reconnect (FR-BE-04/08)

Connect mode (palette or context-pad "connect-to") drags from a source to a target; `bpmn-tools.ts`
chooses the flow type per the endpoint types (`BPMN-MAP-001`: sequence within a process; message
across participants — relevant once pools land in `CR-BPMN-EDITOR-001`; association to/from a text
annotation) and creates the `bpmn-*` `Edge` bound to both. Moving a node updates its shape; connected
flow endpoints recompute from the moved bounds. Multi-select moves the group. Each interaction is a
single history step so undo/redo (`FR-J-02`) reverts it atomically.

## 7. Model binding & label persistence (FR-BE-07, NFR-BE-03)

The on-canvas shapes are the editable surface; the `Diagram` model (`Component`/`Region`/`Edge`) is
the serialization source. Label edits and structural edits update the model so that **export**
(`§8`) reflects them. Where the editor also coexists with the `.kymo`/text round-trip
(`canvas-editor`), the same patch path applies; for a pure-BPMN session the model is serialized
directly by `toBpmn`.

## 8. File I/O (FR-BE-09/10/11, NFR-BE-03)

`bpmn-io.ts`:

- **Open** — a file-picker button (top bar) + canvas drag-drop read a `.bpmn` file's text →
  `parseBpmn(text) → Diagram` → render as `bpmn-*` shapes (the importer returns fully-resolved DI
  geometry; no layout pass, per `FEAT-BPMN-PARSER-001`).
- **New** — clear to a single start event.
- **Export** — `toBpmn(diagram)` → download `.bpmn` (`application/bpmn+xml`); the board SVG export
  (`FR-J-03`) → download `.svg`. Round-trip integrity (`NFR-BE-03`) rests on the parser/exporter's
  own invariants — the editor adds no new serialization logic.

## 9. Navigation & shortcuts (FR-BE-12)

Zoom/fit reuse `zoomToFit` and the status-bar zoom control (`FEAT-STUDIO-001`). A keyboard-shortcut
reference (overlay or panel) lists palette/tool selection keys and edit shortcuts, mirroring the
`demo.bpmn.io` shortcut overlay.

## 10. Deployment & footprint (NFR-BE-02/05)

Built by the existing `website/app/build.sh` (esbuild) into the committed bundle; the Pages workflow
uploads `website/` as-is (no CI build). The BPMN layer is pure app code reusing `packages/js` /
`packages/js-canvas` — **no new runtime dependency** — so the bundle stays within budget.

## 11. What is explicitly NOT touched

- `packages/js-canvas` engine internals (only the published `Editor`/`Store`/`ShapeUtil` API is used).
- The `bpmn-*` glyph renderers and `BPMN-MAP-001` mapping (consumed, never modified) — so the Python/JS
  golden SVGs and the BPMN corpus baseline stay byte-stable.
- `parseBpmn` / `toBpmn` (consumed as-is; the deferred `Set color` CR is the first item that would
  extend `toBpmn`, and it is out of v1 scope).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Initial design. Composition over `FEAT-ENGINE-001`/`FEAT-STUDIO-001`/`FEAT-JAM-001`/`FEAT-BPMN-PARSER-001`/`FEAT-BPMN-EXPORT-001`/`BPMN-MAP-001`; new modules `bpmn-tools.ts`/`bpmn-ops.ts`/`ContextPad.tsx`/`bpmn-io.ts` + `ui/tools.ts` & `engine/shapes.tsx` extensions; no engine/renderer change. |

---
title: BPMN Editor — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-BPMN-EDITOR-001
version: "0.1"
issue_date: 2026-05-31
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for the interactive BPMN editor; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-001
  - FEAT-BPMN-EDITOR-001
  - FEAT-STUDIO-001
  - FEAT-ENGINE-001
  - FEAT-BPMN-PARSER-001
  - FEAT-BPMN-EXPORT-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - bpmn
  - editor
  - modeling
  - palette
  - context-pad
---

# BPMN Editor — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-BPMN-EDITOR-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-BPMN-EDITOR-001`, `FEAT-BPMN-EDITOR-001` (the SRS derived from the needs below) |

> This doc owns the `SN-BE-NN` stakeholder needs; the SRS (`FEAT-BPMN-EDITOR-001`) derives
> `FR-BE`/`NFR-BE` from them.

## 1. Problem & motivation

kymostudio can already *render* BPMN (the `bpmn-*` glyphs), *import/export* BPMN 2.0 XML
(`parseBpmn` / `toBpmn`, mapped by `BPMN-MAP-001`), and *author it textually* (the `bpmn { … }` DSL
block, `FEAT-BPMN-DSL-001`). What it lacks is a **direct, WYSIWYG modeling surface** like the
reference public modeler `demo.bpmn.io` (the `bpmn-js` demo): there is no way to click a palette to
drop a task, morph a gateway, append the next step, draw a flow, or open and save a `.bpmn` file —
all by direct manipulation on the canvas.

The **BPMN editor** feature closes that gap. Inspecting `demo.bpmn.io` directly shows it is organized
around **three pillars**, which this feature adopts:

1. **Palette modeling** — a vertical palette creates BPMN elements (events, gateways, tasks,
   expanded sub-processes, data object/store references, groups, a generic create-element) plus
   interaction tools (hand/pan, lasso-select, global-connect); elements are placed by click or
   drag-onto-canvas.
2. **Context pad + direct editing** — selecting an element opens a contextual pad (append the next
   end-event / gateway / task / intermediate event / element, add a text annotation, change/morph the
   element type, delete, connect to another element); double-click edits a label in place; drag
   moves/reconnects; undo/redo and keyboard shortcuts apply.
3. **File I/O & navigation** — open a local `.bpmn` file, create a new diagram, export as BPMN 2.0
   XML and as SVG; zoom/fit/keyboard-shortcut reference.

Crucially, **every supporting layer already exists** — the reactive canvas engine
(`FEAT-ENGINE-001`), the studio UI shell with its tool rail (`FEAT-STUDIO-001`), undo/redo + board
export (`FEAT-JAM-001`), and the BPMN parser/exporter (`FEAT-BPMN-PARSER-001` /
`FEAT-BPMN-EXPORT-001`). The editor is therefore a **composition** of these, adding only the
BPMN-specific interaction/UX layer — **no engine or renderer change is required**.

## 2. Users & context of operations (ConOps)

- **Who:** process authors and analysts who want to *draw* a BPMN diagram by direct manipulation in
  the browser (not by hand-coordinates or XML), and engineers maintaining the kymo editor stack.
- **Substrate it builds on (unchanged):** the canvas engine's `Editor` facade
  (`createShape`/`updateShape`/`deleteShape`/`zoomToFit`/`run`, `FEAT-ENGINE-001`); the studio tool
  rail + chrome (`FEAT-STUDIO-001`, whose registry already reserves disabled create-tool slots); the
  freeform tools / undo-redo / board export precedent (`FEAT-JAM-001`); `parseBpmn` / `toBpmn`
  (`FEAT-BPMN-PARSER-001` / `FEAT-BPMN-EXPORT-001`); and the normative element mapping `BPMN-MAP-001`
  with its `bpmn-*` glyph renderers.
- **Constraint:** **single-player / static** — runs in `website/app/`, deployed as the committed
  bundle via the existing GitHub-Pages workflow, **no backend and no CI build step** (as
  `canvas-studio` / `canvas-editor`). The editor is **web-only**; the underlying `parseBpmn`/`toBpmn`
  already carry Python/JS parity, so no Python editor UI is needed.
- **Scenario:** an author opens an empty diagram (or a `.bpmn` file), clicks the palette to place a
  start event and a task, uses the context pad to append a gateway and connect a flow, double-clicks
  to label nodes, then exports the result as `.bpmn` (and/or SVG).

## 3. Goals & non-goals

- **Goals (v1):** the three pillars over **core BPMN elements** — events, tasks, gateways, expanded
  sub-processes, data object/store references, sequence/message/association flows, text annotations,
  and groups — modeled by direct manipulation, reusing the existing engine/studio/parser/exporter
  with **no renderer or core change**; round-trip-safe (`.bpmn` → edit → `.bpmn`).
- **Non-goals (v1):** pools/participants and lanes (the laning model — deferred, consistent with
  `FEAT-BPMN-DSL-001`'s own pools/lanes deferral); the `Set color` action; BPMN validation / linting
  (researched separately in `RES-BPMN-LINT-001`); copy/paste & keyboard-only modeling; one-click
  auto-layout; multiplayer; and any Python editor UI. These are tracked as proposed change-requests
  (`CR-BPMN-EDITOR-001..005`) against the v1 baseline.

## 4. Stakeholder needs (`SN-BE`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-BE-01` | Authors must be able to **place BPMN elements from a palette** (events, tasks, gateways, sub-processes, data objects/stores, groups, flows) by direct manipulation — without typing coordinates or XML. | The current BPMN paths are render-only, XML import/export, or textual DSL; there is no WYSIWYG modeling surface like `demo.bpmn.io`. |
| `SN-BE-02` | Authors must be able to **edit an existing element in place** — rename it, change its type, append the next step, and connect a flow — via on-canvas affordances (a context pad + direct label editing). | Modeling is iterative; the `demo.bpmn.io` context pad + double-click editing is the expected interaction, and selection/drag already exist in the engine. |
| `SN-BE-03` | Authors must be able to **open a `.bpmn` file and save the edited diagram back to `.bpmn`** (and export SVG), entirely client-side. | Interchange with other BPMN tools is the point of a BPMN editor; `parseBpmn`/`toBpmn` already round-trip, so only the I/O affordances are missing. |
| `SN-BE-04` | The editor must **reuse the existing engine, studio chrome, and BPMN parser/exporter** — adding only the BPMN interaction layer, with **no change to the engine or the `bpmn-*` renderers** — and stay **single-player / static** (committed bundle, no backend, no CI build). | Keeps the renderer dumb, protects byte-stable goldens and the BPMN corpus baseline, and preserves the established deploy model. |

## 5. Scope

**In scope (product level):** the interactive BPMN editor over core elements — palette placement +
interaction tools; context pad (append / change-type / connect / delete / add-annotation) + direct
label editing + move/reconnect + undo/redo; and `.bpmn` open / new / export (BPMN 2.0 XML + SVG) with
canvas navigation — **web-only, single-player, static**, composed from the existing stack.
**Out of scope (v1):** pools/lanes, the color action, validation/linting, copy/paste & keyboard
modeling, auto-layout, multiplayer, and any Python editor UI (the SRS §6 restates these; the proposed
post-v1 change-requests are logged in `CHANGE-REQUESTS/`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Initial product description. Derived from a live inspection of `demo.bpmn.io` (three pillars) and the kymostudio editor-stack survey; minted feature-scoped needs `SN-BE-01..04`. v1 scope = three pillars over core elements; pools/lanes, color, validation, copy-paste, auto-layout deferred to `CR-BPMN-EDITOR-001..005`. |

---
title: BPMN Editor — Requirements
document_id: FEAT-BPMN-EDITOR-001
version: "0.2"
issue_date: 2026-06-06
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing & verifying the BPMN editor (`website/app/`)
review_cycle: On scope change, or when a phase completes
supersedes:
  - FEAT-BPMN-EDITOR-001
  - FEAT-BPMN-EDITOR-001
related_documents:
  - DESIGN-BPMN-EDITOR-001
  - TEST-BPMN-EDITOR-001
  - PLAN-BPMN-EDITOR-001
  - FEAT-BPMN-001
  - FEAT-ENGINE-001
  - FEAT-STUDIO-001
  - FEAT-JAM-001
  - FEAT-BPMN-PARSER-001
  - FEAT-BPMN-EXPORT-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
iso_compliance:
  - ISO/IEC/IEEE 12207
  - ISO/IEC/IEEE 15289
  - ISO/IEC/IEEE 29148
  - ISO/IEC 25010
keywords:
  - requirements
  - features
  - functional-requirements
  - non-functional-requirements
  - product-description
  - conops
  - stakeholder-requirements
  - introduction
  - document-map
  - reading-guide
  - iso-25010
  - iso-12207
  - iso-15289
  - bpmn
  - bpmn-editor
  - editor
  - modeling
  - palette
  - context-pad
  - acceptance-criteria
---

# BPMN Editor — Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-EDITOR-001` |
| Version           | 0.2 |
| Issue Date        | 2026-06-06 |
| Status            | Draft |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Supersedes        | `FEAT-BPMN-EDITOR-001` (stakeholder needs), `FEAT-BPMN-EDITOR-001` (introduction/map) |
| Related Documents | `DESIGN-BPMN-EDITOR-001` (design), `TEST-BPMN-EDITOR-001` (V&V), `PLAN-BPMN-EDITOR-001` (plan/risk), `BPMN-MAP-001` (element mapping) |

> This is the **requirements specification** (ISO/IEC/IEEE 12207 §6.4.2/§6.4.3). It owns both the
> `SN-BE-NN` stakeholder needs and the `FR-BE`/`NFR-BE` requirements derived from them. Each
> requirement is atomic, verifiable, and stably identified so `TEST-BPMN-EDITOR-001` can trace a test
> case to it. Non-functional requirements are framed by **ISO/IEC 25010**.

---

## 1. Introduction and scope

The **bpmn-editor** feature adds an **interactive BPMN modeling surface** to the kymo web editor
(`website/app/`), modeled on the reference public modeler `demo.bpmn.io`: a palette to place BPMN
elements, a context pad + direct editing to revise them, and `.bpmn` open/save — all by direct
manipulation, single-player and static. It is a **composition** of the existing editor stack (engine,
studio chrome, freeform tools) and the BPMN parser/exporter; it does **not** change the engine or the
`bpmn-*` renderers.

This folder is documented to the spirit of **ISO/IEC/IEEE 12207** (life-cycle processes), with
information items per **ISO/IEC/IEEE 15289**, requirements per **ISO/IEC/IEEE 29148**, architecture
per **ISO/IEC/IEEE 42010**, quality attributes per **ISO/IEC 25010**, and test structure per
**ISO/IEC/IEEE 29119** — **tailored** to a single-maintainer OSS feature.

### 1.1 Document map

This feature's docs use a **4-document module layout** in this folder
(`docs/specs/bpmn/modules/editor/`) plus a **living plan**:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` (this doc) | `FEAT-BPMN-EDITOR-001` | *what product problem, whose needs (`SN-BE`), and what must it do (`FR-BE`/`NFR-BE`)?* |
| 02 | `02-DESIGN.md` | `DESIGN-BPMN-EDITOR-001` | *how is it built (composition over the stack)?* |
| 03 | `03-TEST.md` | `TEST-BPMN-EDITOR-001` | *how do we know it's right? (`TC-NN`)* |
| 04 | `04-PLAN.md` | `PLAN-BPMN-EDITOR-001` | *why, in what order, at what risk, what's done? (+ `CHANGE-REQUESTS/`)* |

Reading order: **`01-REQUIREMENTS`** (this doc — product context + `SN-BE` needs, then the
`FR-BE`/`NFR-BE` requirements grouped by the three pillars) → **`02-DESIGN`** (composition over the
engine/studio/parser/exporter) → **`03-TEST`** (V&V, `TC-NN`, traceability) → **`04-PLAN`** (phases,
risks, change-requests, worklog). Cross-document references use **`document_id`** (never file paths),
so docs can move without breaking links; the numeric `NN-` prefixes are a reading-order aid only.

### 1.2 Relationship to sibling specs

The bpmn-editor stands on already-delivered features and an existing normative mapping. It composes
them rather than re-implementing anything:

| Sibling | document_id | What bpmn-editor reuses |
|---------|-------------|--------------------------|
| canvas-engine | `FEAT-ENGINE-001` | The substrate: reactive `Store`, the `Editor` facade (`createShape`/`updateShape`/`deleteShape`/`zoomToFit`/`run`), `ShapeUtil` custom shapes, viewport/camera, selection/drag, React `<Canvas>` bindings. |
| canvas-studio | `FEAT-STUDIO-001` | The UI shell: top bar, **tool rail + registry** (`website/app/src/ui/tools.ts`, which already reserves *disabled* create-tool slots), status bar, design tokens, on-canvas item styling. |
| canvas-jam | `FEAT-JAM-001` | The tool-pattern precedent (draw/sticky/text place freeform shapes), **undo/redo**, and **board SVG export**. |
| bpmn-parser | `FEAT-BPMN-PARSER-001` | `parseBpmn(xml) → Diagram` for the **open** path. |
| bpmn-export | `FEAT-BPMN-EXPORT-001` | `toBpmn(Diagram) → xml` for the **save** path. |
| bpmn element mapping | `BPMN-MAP-001` | The normative element↔glyph mapping + default geometry the palette/context-pad must honor. |

> **Distinct from generic create-tools.** The studio tool rail reserves disabled create-tool slots
> labelled *"coming in canvas-create-tools"* — a *generic* shape/edge palette. The bpmn-editor adds a
> **BPMN-specific** palette + context pad keyed to `BPMN-MAP-001`; where the two overlap (the connect
> tool, in-place editing), the bpmn-editor reuses the generic primitive rather than forking it.

### 1.3 Problem & motivation

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

### 1.4 Users & context of operations (ConOps)

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

### 1.5 Goals & non-goals

- **Goals (v1):** the three pillars over **core BPMN elements** — events, tasks, gateways, expanded
  sub-processes, data object/store references, sequence/message/association flows, text annotations,
  and groups — modeled by direct manipulation, reusing the existing engine/studio/parser/exporter
  with **no renderer or core change**; round-trip-safe (`.bpmn` → edit → `.bpmn`).
- **Non-goals (v1):** pools/participants and lanes (the laning model — deferred, consistent with
  `FEAT-BPMN-DSL-001`'s own pools/lanes deferral); the `Set color` action; BPMN validation / linting
  (researched separately in `RES-BPMN-LINT-001`); copy/paste & keyboard-only modeling; one-click
  auto-layout; multiplayer; and any Python editor UI. These are tracked as proposed change-requests
  (`CR-BPMN-EDITOR-001..005`) against the v1 baseline.

### 1.6 Scope

**In scope (product level):** the interactive BPMN editor over core elements — palette placement +
interaction tools; context pad (append / change-type / connect / delete / add-annotation) + direct
label editing + move/reconnect + undo/redo; and `.bpmn` open / new / export (BPMN 2.0 XML + SVG) with
canvas navigation — **web-only, single-player, static**, composed from the existing stack.
**Out of scope (v1):** pools/lanes, the color action, validation/linting, copy/paste & keyboard
modeling, auto-layout, multiplayer, and any Python editor UI (§5 restates these; the proposed
post-v1 change-requests are logged in `CHANGE-REQUESTS/`).

## 2. Stakeholder needs (`SN-BE`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-BE-01` | Authors must be able to **place BPMN elements from a palette** (events, tasks, gateways, sub-processes, data objects/stores, groups, flows) by direct manipulation — without typing coordinates or XML. | The current BPMN paths are render-only, XML import/export, or textual DSL; there is no WYSIWYG modeling surface like `demo.bpmn.io`. |
| `SN-BE-02` | Authors must be able to **edit an existing element in place** — rename it, change its type, append the next step, and connect a flow — via on-canvas affordances (a context pad + direct label editing). | Modeling is iterative; the `demo.bpmn.io` context pad + double-click editing is the expected interaction, and selection/drag already exist in the engine. |
| `SN-BE-03` | Authors must be able to **open a `.bpmn` file and save the edited diagram back to `.bpmn`** (and export SVG), entirely client-side. | Interchange with other BPMN tools is the point of a BPMN editor; `parseBpmn`/`toBpmn` already round-trip, so only the I/O affordances are missing. |
| `SN-BE-04` | The editor must **reuse the existing engine, studio chrome, and BPMN parser/exporter** — adding only the BPMN interaction layer, with **no change to the engine or the `bpmn-*` renderers** — and stay **single-player / static** (committed bundle, no backend, no CI build). | Keeps the renderer dumb, protects byte-stable goldens and the BPMN corpus baseline, and preserves the established deploy model. |

## 3. Definitions

- **Palette** — the on-canvas toolbar of BPMN element creators + interaction tools.
- **Context pad** — the floating set of contextual actions shown for a selected element.
- **Morph / change-type** — replacing an element's BPMN subtype (e.g. exclusive → parallel gateway)
  while preserving its identity, position, and connected flows — i.e. updating its marker/glyph.
- **Core elements (v1)** — events (start / intermediate / end), tasks (incl. typed tasks), gateways,
  expanded sub-processes, data object / data store references, groups, text annotations, and
  sequence / message / association flows. **Excludes** pools/participants and lanes.
- **Round-trip** — `.bpmn` → import → edit → `toBpmn` produces XML that re-imports to an equivalent
  `Diagram`, conformant to `BPMN-MAP-001`.

## 4. Functional requirements

Each `FR-BE-NN` has an acceptance criterion (AC) and the `DESIGN-BPMN-EDITOR-001` section that
realizes it.

### 4.1 Pillar 1 — Palette modeling

| ID | Requirement | Acceptance criterion | Design § |
|----|-------------|----------------------|----------|
| FR-BE-01 | BPMN palette of core element creators | The palette offers: start/intermediate/end event, gateway, task, expanded sub-process, data object reference, data store reference, group, and a generic create-element; activating one enters a placement mode | §3, §4 |
| FR-BE-02 | Interaction tools | The palette offers hand/pan, lasso-select, and global-connect tools; (space-tool optional); each reuses the engine's existing interaction primitives (`FEAT-ENGINE-001`) | §3, §4 |
| FR-BE-03 | Placement creates the correct `bpmn-*` shape with default geometry | Clicking the canvas in a placement mode creates the mapped `bpmn-*` `Component`/`Region` (`BPMN-MAP-001`) at the click point, sized to the BPMN default (event 36×36, task 100×80, gateway 50×50, sub-process/region default container) | §4, §5 |
| FR-BE-04 | Draw a flow between two elements | In connect mode, dragging from a source element to a target creates the correct `bpmn-*` `Edge` (sequence by default; message/association where the endpoint types require it per `BPMN-MAP-001`) with endpoints bound to both elements | §4, §6 |

### 4.2 Pillar 2 — Context pad + direct editing

| ID | Requirement | Acceptance criterion | Design § |
|----|-------------|----------------------|----------|
| FR-BE-05 | Context pad with contextual actions | Selecting an element shows a pad with: append-next (end-event / gateway / task / intermediate-event / element), add text annotation, connect-to, and delete; append creates the new element + a connecting flow in one action | §5, §6 |
| FR-BE-06 | Change / morph element type | The context pad can change an element's BPMN subtype (e.g. task ↔ user/service task; exclusive ↔ parallel gateway; start ↔ intermediate event) in place — updating its marker/glyph per `BPMN-MAP-001` while preserving id, position, and connected flows | §5 |
| FR-BE-07 | Direct label editing | Double-clicking a node or flow opens an in-place editor; committing updates the element's `name`/`label` and the change is reflected in the model (and serializable on export) | §5, §7 |
| FR-BE-08 | Move / reconnect + undo/redo | Dragging moves an element (its connected flows follow) and reconnects a flow endpoint; multi-select moves a group; every BPMN edit (place / morph / label / move / delete) is a single undo/redo step, reusing the engine history (`FR-J-02`) | §6, §7 |

### 4.3 Pillar 3 — File I/O & navigation

| ID | Requirement | Acceptance criterion | Design § |
|----|-------------|----------------------|----------|
| FR-BE-09 | Open a local `.bpmn` file | A file picker **and** drag-drop of a `.bpmn` file load it via `parseBpmn` and render it on the canvas as editable `bpmn-*` shapes | §8 |
| FR-BE-10 | New empty diagram | A "new diagram" action clears the canvas to a single start event (as `demo.bpmn.io`'s create-new), ready to model | §8 |
| FR-BE-11 | Export BPMN 2.0 XML + SVG | The current diagram exports to a downloadable `.bpmn` (via `toBpmn`) and to a standalone `.svg` (via the board export, `FR-J-03`), with correct filename + MIME type | §8 |
| FR-BE-12 | Canvas navigation | Zoom in / out / reset and fit-to-content work (reusing `zoomToFit` + the studio status bar, `FEAT-STUDIO-001`); a keyboard-shortcut reference lists the palette/tool/edit shortcuts | §3, §9 |

## 5. Non-functional requirements (ISO/IEC 25010)

| ID | Quality characteristic | Requirement | Acceptance criterion | Design § |
|----|------------------------|-------------|----------------------|----------|
| NFR-BE-01 | Performance efficiency | Modeling feels live | Place / move / morph / label apply as **incremental** engine shape ops (create/update/delete a single shape), never a full canvas rebuild | §4, §5 |
| NFR-BE-02 | Compatibility / portability | Static, zero-backend | Ships in the committed bundle via the existing Pages workflow; **no CI build step**; web-only (no Python editor UI) | §10 |
| NFR-BE-03 | Functional correctness | Round-trip integrity | `.bpmn` → edit → `toBpmn` stays `BPMN-MAP-001`-conformant and re-imports (`parseBpmn`) to an equivalent diagram (±1px DI rounding), upholding the parser/exporter invariants (`FEAT-BPMN-PARSER-001` / `FEAT-BPMN-EXPORT-001`) | §8 |
| NFR-BE-04 | Maintainability | Isolated interaction layer | All BPMN tooling (palette defs, placement/connect handlers, context pad) lives in dedicated modules; the engine and the `bpmn-*` renderers (`BPMN-MAP-001`) are **untouched** | §4–§6, §11 |
| NFR-BE-05 | Performance / footprint | Bounded bundle | The committed bundle stays within the existing budget; the BPMN layer adds no heavy runtime dependency (it reuses `packages/js` / `packages/js-canvas`) | §10 |

## 6. Constraints & assumptions

- Reuses the `packages/js` public API as-is: `parseBpmn`, `toBpmn`, and the `Diagram` / `Component` /
  `Region` / `Edge` model (carrying resolved absolute positions).
- Reuses the `packages/js-canvas` `Editor` facade as-is (`createShape`/`updateShape`/`deleteShape`/
  `zoomToFit`/`run`) and the studio tool rail + chrome.
- Element subtype ↔ glyph/marker choices, and default geometry, are governed by `BPMN-MAP-001`
  (normative) — the editor never invents a mapping.
- Single-player / static; deployed as the committed bundle; web-only.

## 7. Out of scope (v1)

- **Pools / participants and lanes** (the laning model) — deferred; tracked as `CR-BPMN-EDITOR-001`.
- **`Set color`** action — deferred (needs DI color in `toBpmn`); tracked as `CR-BPMN-EDITOR-002`.
- **BPMN validation / linting** — deferred; tracked as `CR-BPMN-EDITOR-003`.
- **Copy / paste, duplicate, keyboard-only modeling** — deferred; tracked as `CR-BPMN-EDITOR-004`.
- **One-click auto-layout** (`bpmnLayout`) — deferred; tracked as `CR-BPMN-EDITOR-005`.
- **Multiplayer / real-time collaboration** and any **Python editor UI**.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Initial product description (`FEAT-BPMN-EDITOR-001`). Derived from a live inspection of `demo.bpmn.io` (three pillars) and the kymostudio editor-stack survey; minted feature-scoped needs `SN-BE-01..04`. v1 scope = three pillars over core elements; pools/lanes, color, validation, copy-paste, auto-layout deferred to `CR-BPMN-EDITOR-001..005`. |
| 0.1     | 2026-05-31 | Vũ Anh | Initial introduction + document map (`FEAT-BPMN-EDITOR-001`); positions bpmn-editor as a composition over `FEAT-ENGINE-001` / `FEAT-STUDIO-001` / `FEAT-JAM-001` / `FEAT-BPMN-PARSER-001` / `FEAT-BPMN-EXPORT-001` / `BPMN-MAP-001`, distinct from the generic `canvas-create-tools` palette. |
| 0.1     | 2026-05-31 | Vũ Anh | Initial requirements draft (`FEAT-BPMN-EDITOR-001`). Minted `FR-BE-01..12` (grouped by the three `demo.bpmn.io` pillars) + `NFR-BE-01..05`; traces to `SN-BE-01..04`. v1 = core elements; pools/lanes, color, validation, copy-paste, auto-layout listed out-of-scope (`CR-BPMN-EDITOR-001..005`). |
| 0.2     | 2026-06-06 | Vũ Anh | Consolidated FEAT-BPMN-EDITOR-001 (stakeholder needs) and FEAT-BPMN-EDITOR-001 (introduction/map) into this requirements doc under the new 4-document module layout (01-REQUIREMENTS/02-DESIGN/03-TEST/04-PLAN). |

## Annex B — Document Control

### B.1 Storage

- **Path:** `docs/specs/bpmn/modules/editor/01-REQUIREMENTS.md`
- **Format:** Markdown (GitHub-flavored), UTF-8.
- **Version control:** tracked in the kymostudio monorepo.

### B.2 Approval & review

- **Owner:** `diagrams/` project (Vũ Anh).
- **Review cycle:** on scope change, or when a phase completes.
- **Change management:** once baselined, a change to this spec is raised as a change-request in
  `CHANGE-REQUESTS/` and re-baselined (bump version + record in Annex A). Five post-v1 enhancements
  are already logged as **proposed** CR mini-specs (`CR-001/`..`CR-005/`) — see
  `CHANGE-REQUESTS/README.md`.

### B.3 Traceability invariant

Every requirement in this document (`FR-BE-*`, `NFR-BE-*`) traces back to a stakeholder need
(`SN-BE-01..04`, §2) and has ≥ 1 covering test in `TEST-BPMN-EDITOR-001` §5.

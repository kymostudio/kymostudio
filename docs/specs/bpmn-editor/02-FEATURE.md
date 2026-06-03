---
title: BPMN Editor — Features & Requirements
document_id: FEAT-BPMN-EDITOR-001
version: "0.1"
issue_date: 2026-05-31
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing & verifying the BPMN editor (`website/app/`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - PROD-BPMN-EDITOR-001
  - INTRO-BPMN-EDITOR-001
  - DESIGN-BPMN-EDITOR-001
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
  - requirements
  - features
  - functional-requirements
  - non-functional-requirements
  - iso-25010
  - bpmn-editor
  - palette
  - context-pad
  - acceptance-criteria
---

# BPMN Editor — Features & Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-EDITOR-001` |
| Version           | 0.1 |
| Issue Date        | 2026-05-31 |
| Status            | Draft |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Related Documents | `PROD-BPMN-EDITOR-001` (stakeholder needs), `DESIGN-BPMN-EDITOR-001` (design), `TEST-BPMN-EDITOR-001` (V&V), `PLAN-BPMN-EDITOR-001` (plan/risk), `BPMN-MAP-001` (element mapping) |

> This is the **requirements specification** (ISO/IEC/IEEE 12207 §6.4.2/§6.4.3). Each requirement is
> atomic, verifiable, and stably identified so `TEST-BPMN-EDITOR-001` can trace a test case to it.
> Non-functional requirements are framed by **ISO/IEC 25010**. Stakeholder needs (`SN-BE-01..04`) are
> owned by `PROD-BPMN-EDITOR-001`; each requirement below traces back to them.

---

## 1. Scope

Requirements for an **interactive BPMN editor** in `website/app/`: place BPMN elements from a palette,
revise them via a context pad + direct editing, and open/save `.bpmn` — by direct manipulation,
single-player and static. The feature is a **composition** of the canvas engine (`FEAT-ENGINE-001`),
the studio shell (`FEAT-STUDIO-001`), the freeform-tools/undo/export precedent (`FEAT-JAM-001`), and
the BPMN parser/exporter (`FEAT-BPMN-PARSER-001` / `FEAT-BPMN-EXPORT-001`), keyed to the normative
mapping `BPMN-MAP-001`. It adds **no** engine or renderer change. Requirements are grouped by the
three `demo.bpmn.io` pillars (`PROD-BPMN-EDITOR-001` §1).

## 2. Definitions

- **Palette** — the on-canvas toolbar of BPMN element creators + interaction tools.
- **Context pad** — the floating set of contextual actions shown for a selected element.
- **Morph / change-type** — replacing an element's BPMN subtype (e.g. exclusive → parallel gateway)
  while preserving its identity, position, and connected flows — i.e. updating its marker/glyph.
- **Core elements (v1)** — events (start / intermediate / end), tasks (incl. typed tasks), gateways,
  expanded sub-processes, data object / data store references, groups, text annotations, and
  sequence / message / association flows. **Excludes** pools/participants and lanes.
- **Round-trip** — `.bpmn` → import → edit → `toBpmn` produces XML that re-imports to an equivalent
  `Diagram`, conformant to `BPMN-MAP-001`.

## 3. Functional requirements

Each `FR-BE-NN` has an acceptance criterion (AC) and the `DESIGN-BPMN-EDITOR-001` section that
realizes it.

### 3.1 Pillar 1 — Palette modeling

| ID | Requirement | Acceptance criterion | Design § |
|----|-------------|----------------------|----------|
| FR-BE-01 | BPMN palette of core element creators | The palette offers: start/intermediate/end event, gateway, task, expanded sub-process, data object reference, data store reference, group, and a generic create-element; activating one enters a placement mode | §3, §4 |
| FR-BE-02 | Interaction tools | The palette offers hand/pan, lasso-select, and global-connect tools; (space-tool optional); each reuses the engine's existing interaction primitives (`FEAT-ENGINE-001`) | §3, §4 |
| FR-BE-03 | Placement creates the correct `bpmn-*` shape with default geometry | Clicking the canvas in a placement mode creates the mapped `bpmn-*` `Component`/`Region` (`BPMN-MAP-001`) at the click point, sized to the BPMN default (event 36×36, task 100×80, gateway 50×50, sub-process/region default container) | §4, §5 |
| FR-BE-04 | Draw a flow between two elements | In connect mode, dragging from a source element to a target creates the correct `bpmn-*` `Edge` (sequence by default; message/association where the endpoint types require it per `BPMN-MAP-001`) with endpoints bound to both elements | §4, §6 |

### 3.2 Pillar 2 — Context pad + direct editing

| ID | Requirement | Acceptance criterion | Design § |
|----|-------------|----------------------|----------|
| FR-BE-05 | Context pad with contextual actions | Selecting an element shows a pad with: append-next (end-event / gateway / task / intermediate-event / element), add text annotation, connect-to, and delete; append creates the new element + a connecting flow in one action | §5, §6 |
| FR-BE-06 | Change / morph element type | The context pad can change an element's BPMN subtype (e.g. task ↔ user/service task; exclusive ↔ parallel gateway; start ↔ intermediate event) in place — updating its marker/glyph per `BPMN-MAP-001` while preserving id, position, and connected flows | §5 |
| FR-BE-07 | Direct label editing | Double-clicking a node or flow opens an in-place editor; committing updates the element's `name`/`label` and the change is reflected in the model (and serializable on export) | §5, §7 |
| FR-BE-08 | Move / reconnect + undo/redo | Dragging moves an element (its connected flows follow) and reconnects a flow endpoint; multi-select moves a group; every BPMN edit (place / morph / label / move / delete) is a single undo/redo step, reusing the engine history (`FR-J-02`) | §6, §7 |

### 3.3 Pillar 3 — File I/O & navigation

| ID | Requirement | Acceptance criterion | Design § |
|----|-------------|----------------------|----------|
| FR-BE-09 | Open a local `.bpmn` file | A file picker **and** drag-drop of a `.bpmn` file load it via `parseBpmn` and render it on the canvas as editable `bpmn-*` shapes | §8 |
| FR-BE-10 | New empty diagram | A "new diagram" action clears the canvas to a single start event (as `demo.bpmn.io`'s create-new), ready to model | §8 |
| FR-BE-11 | Export BPMN 2.0 XML + SVG | The current diagram exports to a downloadable `.bpmn` (via `toBpmn`) and to a standalone `.svg` (via the board export, `FR-J-03`), with correct filename + MIME type | §8 |
| FR-BE-12 | Canvas navigation | Zoom in / out / reset and fit-to-content work (reusing `zoomToFit` + the studio status bar, `FEAT-STUDIO-001`); a keyboard-shortcut reference lists the palette/tool/edit shortcuts | §3, §9 |

## 4. Non-functional requirements (ISO/IEC 25010)

| ID | Quality characteristic | Requirement | Acceptance criterion | Design § |
|----|------------------------|-------------|----------------------|----------|
| NFR-BE-01 | Performance efficiency | Modeling feels live | Place / move / morph / label apply as **incremental** engine shape ops (create/update/delete a single shape), never a full canvas rebuild | §4, §5 |
| NFR-BE-02 | Compatibility / portability | Static, zero-backend | Ships in the committed bundle via the existing Pages workflow; **no CI build step**; web-only (no Python editor UI) | §10 |
| NFR-BE-03 | Functional correctness | Round-trip integrity | `.bpmn` → edit → `toBpmn` stays `BPMN-MAP-001`-conformant and re-imports (`parseBpmn`) to an equivalent diagram (±1px DI rounding), upholding the parser/exporter invariants (`FEAT-BPMN-PARSER-001` / `FEAT-BPMN-EXPORT-001`) | §8 |
| NFR-BE-04 | Maintainability | Isolated interaction layer | All BPMN tooling (palette defs, placement/connect handlers, context pad) lives in dedicated modules; the engine and the `bpmn-*` renderers (`BPMN-MAP-001`) are **untouched** | §4–§6, §11 |
| NFR-BE-05 | Performance / footprint | Bounded bundle | The committed bundle stays within the existing budget; the BPMN layer adds no heavy runtime dependency (it reuses `packages/js` / `packages/js-canvas`) | §10 |

## 5. Constraints & assumptions

- Reuses the `packages/js` public API as-is: `parseBpmn`, `toBpmn`, and the `Diagram` / `Component` /
  `Region` / `Edge` model (carrying resolved absolute positions).
- Reuses the `packages/js-canvas` `Editor` facade as-is (`createShape`/`updateShape`/`deleteShape`/
  `zoomToFit`/`run`) and the studio tool rail + chrome.
- Element subtype ↔ glyph/marker choices, and default geometry, are governed by `BPMN-MAP-001`
  (normative) — the editor never invents a mapping.
- Single-player / static; deployed as the committed bundle; web-only.

## 6. Out of scope (v1)

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
| 0.1     | 2026-05-31 | Vũ Anh | Initial requirements draft. Minted `FR-BE-01..12` (grouped by the three `demo.bpmn.io` pillars) + `NFR-BE-01..05`; traces to `SN-BE-01..04`. v1 = core elements; pools/lanes, color, validation, copy-paste, auto-layout listed out-of-scope (`CR-BPMN-EDITOR-001..005`). |

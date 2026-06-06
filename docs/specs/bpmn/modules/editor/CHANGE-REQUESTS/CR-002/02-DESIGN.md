---
title: "BPMN Editor CR-002 — Design (delta): Set color"
document_id: DESIGN-BPMN-EDITOR-CR-002
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the color action
review_cycle: Until CR-002 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-BPMN-EDITOR-CR-002
  - TEST-BPMN-EDITOR-CR-002
  - PLAN-BPMN-EDITOR-CR-002
  - DESIGN-BPMN-EDITOR-001
  - FEAT-BPMN-EXPORT-001
  - FEAT-BPMN-PARSER-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - design
  - change-request
  - bpmn-editor
  - color
  - di-color
  - bioc
---

# BPMN Editor CR-002 — Design (delta): Set color

| Field             | Value |
|-------------------|-------|
| Document ID       | `DESIGN-BPMN-EDITOR-CR-002` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-BPMN-EDITOR-CR-002` (requirements), `TEST-BPMN-EDITOR-CR-002`, `DESIGN-BPMN-EDITOR-001` (extended), `FEAT-BPMN-EXPORT-001`, `BPMN-MAP-001` |

> **Delta design.** Two parts: a small UI control, and the durable persistence (the real work).

---

## 1. UI — the color control (FR-CR2-01)

Add a "Set color" entry to `ui/ContextPad.tsx`; choosing a color calls `editor.updateShape()` to set
the element's fill/stroke (one shape op, `NFR-BE-01`). The on-canvas `bpmn-*` shape utils read the
color from the shape props; this is presentational and needs no renderer change in `packages/js`.

## 2. Persistence — DI color (NFR-CR2-01)

The durable part: color must reach the exported `.bpmn` and come back on import.

- **Namespace decision:** pick the DI color extension — the de-facto Camunda `bioc:fill`/`bioc:stroke`
  (+ `color:background-color`/`color:border-color`), which `bpmn-js`/Camunda Modeler emit. Fix the
  choice in `FEAT-BPMN-EXPORT-001` and document it in `BPMN-MAP-001`.
- **Exporter:** extend `toBpmn` (`to-bpmn.ts`) to emit the color attributes on `BPMNShape`/`BPMNEdge`
  **only when** an element carries a color (conditional → byte-stable for uncolored diagrams).
- **Importer:** extend `parseBpmn` (`from-bpmn.ts`) to read those attributes back into the model.
- **Round-trip test:** add a `to-bpmn`/`from-bpmn` color round-trip unit test (kept in sync like the
  existing import/export table tests).

## 3. Golden-safety & what is NOT touched

- Color emission is conditional, so diagrams without color export byte-identically → Python/JS goldens
  + BPMN corpus baseline unchanged (`NFR-CR2-01` acceptance #3).
- The engine internals and the `bpmn-*` glyph geometry are untouched.

## 4. Risks (detail in `PLAN-BPMN-EDITOR-CR-002 §4`)

- Choosing a non-interoperable color namespace → other tools ignore the color (`RK-CR2-01`).
- Accidentally emitting color on uncolored diagrams → golden churn (`RK-CR2-02`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. Context-pad color control + conditional DI-color emit/read in `toBpmn`/`parseBpmn`; namespace fixed in `FEAT-BPMN-EXPORT-001` + `BPMN-MAP-001`. |

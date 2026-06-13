---
title: "BPMN Editor CR-005 — Design (delta): One-click auto-layout"
document_id: DESIGN-BPMN-EDITOR-CR-005
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers implementing auto-layout
review_cycle: Until CR-005 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-BPMN-EDITOR-CR-005
  - TEST-BPMN-EDITOR-CR-005
  - PLAN-BPMN-EDITOR-CR-005
  - DESIGN-BPMN-EDITOR-001
  - FEAT-BPMN-DSL-001
authors:
  - Vũ Anh
language: en
keywords:
  - design
  - change-request
  - bpmn-editor
  - auto-layout
  - bpmn-layout
---

# BPMN Editor CR-005 — Design (delta): One-click auto-layout

| Field             | Value |
|-------------------|-------|
| Document ID       | `DESIGN-BPMN-EDITOR-CR-005` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-BPMN-EDITOR-CR-005`, `TEST-BPMN-EDITOR-CR-005`, `DESIGN-BPMN-EDITOR-001` (extended), `FEAT-BPMN-DSL-001` |

> **Delta design.** The thinnest CR: a button that runs the existing layout engine and writes the new
> positions back as one history step.

---

## 1. Auto-arrange action (FR-CR5-01)

Add an "auto-arrange" control (top bar or palette). On click: take the current `Diagram` model, call
`bpmnLayout(diagram)` (`packages/js`, the `FEAT-BPMN-DSL-001` engine), then apply the resulting
positions/waypoints back to the engine shapes via `editor.run(..., {history})` so the entire re-layout
is **one undo step**. Optionally `zoomToFit` afterwards.

## 2. Structure-preservation & what is NOT touched (NFR-CR5-01)

`bpmnLayout` mutates positions + waypoints only; the editor maps those back to shape geometry without
touching element/flow structure. `bpmnLayout` itself is called **unchanged** — no layout-engine edit,
no renderer/exporter change → goldens + corpus baseline unaffected.

## 3. Risks (detail in `PLAN-BPMN-EDITOR-CR-005 §4`)

- `bpmnLayout` expects a DAG-ish process; pathological inputs (cycles, pools) may lay out oddly —
  `RK-CR5-01`.
- Applying many position updates must be one history step, not N — `RK-CR5-02`.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. Auto-arrange control calling `bpmnLayout` and writing positions back as one `editor.run` history step; structure-preserving; engine unchanged. |

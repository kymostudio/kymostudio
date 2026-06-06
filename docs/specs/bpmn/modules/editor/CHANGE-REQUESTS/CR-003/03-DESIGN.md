---
title: "BPMN Editor CR-003 — Design (delta): Validation / lint overlay"
document_id: DESIGN-BPMN-EDITOR-CR-003
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the lint overlay
review_cycle: Until CR-003 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-CR-003
  - FEAT-BPMN-EDITOR-CR-003
  - TEST-BPMN-EDITOR-CR-003
  - PLAN-BPMN-EDITOR-CR-003
  - DESIGN-BPMN-EDITOR-001
authors:
  - Vũ Anh
language: en
keywords:
  - design
  - change-request
  - bpmn-editor
  - validation
  - lint
  - rule-engine
---

# BPMN Editor CR-003 — Design (delta): Validation / lint overlay

| Field             | Value |
|-------------------|-------|
| Document ID       | `DESIGN-BPMN-EDITOR-CR-003` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-BPMN-EDITOR-CR-003`, `TEST-BPMN-EDITOR-CR-003`, `DESIGN-BPMN-EDITOR-001` (extended) |

> **Delta design.** A rule engine + a non-blocking marker overlay, layered over the editor model.

---

## 1. Rule engine (FR-CR3-01)

A new `bpmn-lint.ts` runs a **data-driven** rule set over the current `Diagram` model. Per
two options: vendor `bpmnlint` (mature, but expects a `bpmn-js` moddle model — an
adapter would map kymo's model to it) or a **small in-house checker** over the kymo model (lighter,
no dep — preferred for the initial rule set). Decision recorded at implementation; the initial rules
(start/end flow constraints, disconnected nodes, gateway fan-in/out, dangling endpoints) are simple
enough for the in-house path.

## 2. Marker overlay & debounce (FR-CR3-01, NFR-CR3-01)

A new `ui/LintOverlay.tsx` reads findings (each keyed to an element id) and draws a **non-blocking**
marker (badge/underline) positioned at the element's bounds (via the `Editor` facade), with a tooltip.
The check runs **debounced** on model change (reusing the editor's change listener) and never blocks an
edit or export. A toggle turns the overlay off → it does nothing (zero behavioural change).

## 3. Golden-safety & what is NOT touched

- Pure overlay over the existing model; no change to `packages/js`, the `bpmn-*` renderers, or
  `toBpmn`/`parseBpmn` → goldens + corpus baseline unaffected.
- With the overlay off, the editor is byte-for-byte unchanged (`NFR-CR3-01`).

## 4. Risks (detail in `PLAN-BPMN-EDITOR-CR-003 §4`)

- A heavy/over-frequent check janks modeling — debounce + incremental scope (`RK-CR3-01`).
- Vendoring `bpmnlint` would add bundle weight + a moddle adapter — prefer in-house for the initial set
  (`RK-CR3-02`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. Data-driven rule engine (`bpmn-lint.ts`) + non-blocking `ui/LintOverlay.tsx` (debounced); in-house checker preferred over vendoring `bpmnlint` for the initial set. |

---
title: "BPMN Editor CR-004 — Design (delta): Copy/paste & keyboard modeling"
document_id: DESIGN-BPMN-EDITOR-CR-004
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers implementing clipboard + keyboard modeling
review_cycle: Until CR-004 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-CR-004
  - FEAT-BPMN-EDITOR-CR-004
  - TEST-BPMN-EDITOR-CR-004
  - PLAN-BPMN-EDITOR-CR-004
  - DESIGN-BPMN-EDITOR-001
  - FEAT-ENGINE-001
authors:
  - Vũ Anh
language: en
keywords:
  - design
  - change-request
  - bpmn-editor
  - clipboard
  - keyboard
  - id-remap
---

# BPMN Editor CR-004 — Design (delta): Copy/paste & keyboard modeling

| Field             | Value |
|-------------------|-------|
| Document ID       | `DESIGN-BPMN-EDITOR-CR-004` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-BPMN-EDITOR-CR-004`, `TEST-BPMN-EDITOR-CR-004`, `DESIGN-BPMN-EDITOR-001` (extended), `FEAT-ENGINE-001` |

> **Delta design.** Both features sit over the engine's selection + history; no engine change.

---

## 1. Clipboard (FR-CR4-01)

A new `engine/bpmn-clipboard.ts`: **copy** snapshots the selected `bpmn-*` shapes plus any flows whose
**both** endpoints are in the selection; **paste/duplicate** re-creates them at an offset with **new
ids**, remapping internal flow endpoints to the new ids (flows with one endpoint outside the selection
are dropped). The whole paste is one `editor.run({history})` step so undo reverts it atomically.

## 2. Keyboard modeling (FR-CR4-02)

A keyboard handler (extending the studio shortcut layer) lets a selected element **append** the next
element + connecting flow (Tab/arrow), then moves selection/focus to the new element — reusing the
context-pad "append" op (`bpmn-ops.ts`, `FR-BE-05`). The shortcut reference (`FR-BE-12`) is extended
with the new keys.

## 3. Golden-safety & what is NOT touched

- All work in `website/app/*` over existing engine primitives; no `packages/js`, renderer, or exporter
  change → goldens + corpus baseline unaffected (`NFR-CR4-01`).

## 4. Risks (detail in `PLAN-BPMN-EDITOR-CR-004 §4`)

- Id collisions / dangling flow endpoints on paste — `RK-CR4-01`.
- Keyboard shortcut clashes with browser/editor defaults — `RK-CR4-02`.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. `engine/bpmn-clipboard.ts` (copy/paste/duplicate with id remap, internal-flow inclusion, one undo step) + keyboard-append handler reusing `bpmn-ops.ts`; renderer untouched. |

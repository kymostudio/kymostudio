---
title: "BPMN Editor CR-003 — Tests & Traceability (delta): Validation / lint overlay"
document_id: TEST-BPMN-EDITOR-CR-003
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the lint overlay
review_cycle: Until CR-003 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-CR-003
  - FEAT-BPMN-EDITOR-CR-003
  - DESIGN-BPMN-EDITOR-CR-003
  - PLAN-BPMN-EDITOR-CR-003
  - TEST-BPMN-EDITOR-001
  - RES-BPMN-LINT-001
authors:
  - Vũ Anh
language: en
keywords:
  - test-plan
  - verification
  - traceability
  - iso-29119
  - change-request
  - bpmn-editor
  - lint
---

# BPMN Editor CR-003 — Tests & Traceability (delta): Validation / lint overlay

| Field             | Value |
|-------------------|-------|
| Document ID       | `TEST-BPMN-EDITOR-CR-003` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-BPMN-EDITOR-CR-003`, `DESIGN-BPMN-EDITOR-CR-003`, `PLAN-BPMN-EDITOR-CR-003`, `TEST-BPMN-EDITOR-001`, `RES-BPMN-LINT-001` |

> **Delta V&V.** Test cases for CR-003 only; folded into `TEST-BPMN-EDITOR-001` on re-baseline.

---

## 1. Test cases

| ID | Level | Verifies | Steps → Expected |
|----|-------|----------|------------------|
| TC-CR3-01 | E2E | FR-CR3-01 | Load a diagram with seeded violations (start event with incoming flow; disconnected node) → the expected non-blocking markers appear with tooltips; fixing each clears its marker. |
| TC-CR3-02 | E2E | NFR-CR3-01 | With the overlay ON, an edit and an export are never blocked; with the overlay OFF, the editor behaves identically to before (no markers, no model/render change). |

## 2. Traceability matrix

| Requirement | Covered by |
|-------------|-----------|
| FR-CR3-01 | TC-CR3-01 |
| NFR-CR3-01 | TC-CR3-02 |

## 3. Entry / exit criteria

- **Entry** — CR-003 approved; `DESIGN-BPMN-EDITOR-CR-003` implemented.
- **Exit** — `TC-CR3-01..02` pass; overlay never blocks; overlay-off = no change; goldens + corpus
  baseline unaffected; render-guard green.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. `TC-CR3-01` (markers raised/cleared) + `TC-CR3-02` (non-blocking; overlay-off no-change). |

---
title: "BPMN Editor CR-005 — Tests & Traceability (delta): One-click auto-layout"
document_id: TEST-BPMN-EDITOR-CR-005
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers verifying auto-layout
review_cycle: Until CR-005 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-CR-005
  - FEAT-BPMN-EDITOR-CR-005
  - DESIGN-BPMN-EDITOR-CR-005
  - PLAN-BPMN-EDITOR-CR-005
  - TEST-BPMN-EDITOR-001
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
  - auto-layout
---

# BPMN Editor CR-005 — Tests & Traceability (delta): One-click auto-layout

| Field             | Value |
|-------------------|-------|
| Document ID       | `TEST-BPMN-EDITOR-CR-005` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-BPMN-EDITOR-CR-005`, `DESIGN-BPMN-EDITOR-CR-005`, `PLAN-BPMN-EDITOR-CR-005`, `TEST-BPMN-EDITOR-001` |

> **Delta V&V.** Test cases for CR-005 only; folded into `TEST-BPMN-EDITOR-001` on re-baseline.

---

## 1. Test cases

| ID | Level | Verifies | Steps → Expected |
|----|-------|----------|------------------|
| TC-CR5-01 | E2E | FR-CR5-01 | Build a messy hand-placed diagram → auto-arrange → nodes re-position + flows route via `bpmnLayout`; one undo restores the prior positions. |
| TC-CR5-02 | E2E + unit | NFR-CR5-01 | After auto-arrange the element/flow **structure** is unchanged (same ids, same connections); `bpmnLayout` is invoked unchanged; goldens + corpus baseline unaffected. |

## 2. Traceability matrix

| Requirement | Covered by |
|-------------|-----------|
| FR-CR5-01 | TC-CR5-01 |
| NFR-CR5-01 | TC-CR5-02 |

## 3. Entry / exit criteria

- **Entry** — CR-005 approved; `DESIGN-BPMN-EDITOR-CR-005` implemented.
- **Exit** — `TC-CR5-01..02` pass; structure preserved; one undo step; goldens + corpus baseline
  unaffected; render-guard green.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. `TC-CR5-01` (auto-arrange + one undo) + `TC-CR5-02` (structure-preserving; engine unchanged). |

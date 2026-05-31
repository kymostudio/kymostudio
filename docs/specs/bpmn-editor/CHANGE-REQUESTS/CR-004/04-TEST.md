---
title: "BPMN Editor CR-004 — Tests & Traceability (delta): Copy/paste & keyboard modeling"
document_id: TEST-BPMN-EDITOR-CR-004
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers verifying clipboard + keyboard modeling
review_cycle: Until CR-004 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-CR-004
  - FEAT-BPMN-EDITOR-CR-004
  - DESIGN-BPMN-EDITOR-CR-004
  - PLAN-BPMN-EDITOR-CR-004
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
  - copy-paste
  - keyboard
---

# BPMN Editor CR-004 — Tests & Traceability (delta): Copy/paste & keyboard modeling

| Field             | Value |
|-------------------|-------|
| Document ID       | `TEST-BPMN-EDITOR-CR-004` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-BPMN-EDITOR-CR-004`, `DESIGN-BPMN-EDITOR-CR-004`, `PLAN-BPMN-EDITOR-CR-004`, `TEST-BPMN-EDITOR-001` |

> **Delta V&V.** Test cases for CR-004 only; folded into `TEST-BPMN-EDITOR-001` on re-baseline.

---

## 1. Test cases

| ID | Level | Verifies | Steps → Expected |
|----|-------|----------|------------------|
| TC-CR4-01 | E2E | FR-CR4-01, NFR-CR4-01 | Select 2 connected tasks → copy → paste → a clone appears at an offset with **new ids** and the internal flow preserved; one undo removes the whole paste. |
| TC-CR4-02 | E2E | FR-CR4-02, NFR-CR4-01 | Select an element → keyboard-append → the next element + connecting flow are created and focus moves to it; the shortcut reference lists the keys. |

## 2. Traceability matrix

| Requirement | Covered by |
|-------------|-----------|
| FR-CR4-01 | TC-CR4-01 |
| FR-CR4-02 | TC-CR4-02 |
| NFR-CR4-01 | TC-CR4-01, TC-CR4-02 |

## 3. Entry / exit criteria

- **Entry** — CR-004 approved; `DESIGN-BPMN-EDITOR-CR-004` implemented.
- **Exit** — `TC-CR4-01..02` pass; pointer modeling unchanged; goldens + corpus baseline unaffected;
  render-guard green.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. `TC-CR4-01` (copy/paste id-remap + one-undo) + `TC-CR4-02` (keyboard append/focus). |

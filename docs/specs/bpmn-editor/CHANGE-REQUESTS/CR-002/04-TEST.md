---
title: "BPMN Editor CR-002 — Tests & Traceability (delta): Set color"
document_id: TEST-BPMN-EDITOR-CR-002
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the color action
review_cycle: Until CR-002 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-CR-002
  - FEAT-BPMN-EDITOR-CR-002
  - DESIGN-BPMN-EDITOR-CR-002
  - PLAN-BPMN-EDITOR-CR-002
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
  - color
---

# BPMN Editor CR-002 — Tests & Traceability (delta): Set color

| Field             | Value |
|-------------------|-------|
| Document ID       | `TEST-BPMN-EDITOR-CR-002` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-BPMN-EDITOR-CR-002` (requirements), `DESIGN-BPMN-EDITOR-CR-002`, `PLAN-BPMN-EDITOR-CR-002`, `TEST-BPMN-EDITOR-001` (parent V&V) |

> **Delta V&V.** Test cases for CR-002 only; folded into `TEST-BPMN-EDITOR-001` on re-baseline.

---

## 1. Test cases

| ID | Level | Verifies | Steps → Expected |
|----|-------|----------|------------------|
| TC-CR2-01 | E2E | FR-CR2-01 | Select an element → Set color → the canvas reflects the new fill/stroke immediately (single shape op). |
| TC-CR2-02 | Unit + round-trip | NFR-CR2-01 | A colored element exports with the DI color extension; re-import restores the color; an **uncolored** diagram exports byte-identically (goldens + corpus baseline unchanged). |

## 2. Traceability matrix

| Requirement | Covered by |
|-------------|-----------|
| FR-CR2-01 | TC-CR2-01 |
| NFR-CR2-01 | TC-CR2-02 |

## 3. Entry / exit criteria

- **Entry** — CR-002 approved; `DESIGN-BPMN-EDITOR-CR-002` implemented (UI + exporter/importer).
- **Exit** — `TC-CR2-01..02` pass; color round-trip unit test green; goldens + corpus baseline
  byte-stable for uncolored diagrams; render-guard green.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. `TC-CR2-01` (recolor on canvas) + `TC-CR2-02` (DI-color round-trip + uncolored byte-stability). |

---
title: "BPMN Editor CR-005 — Requirements (SRS delta): One-click auto-layout"
document_id: FEAT-BPMN-EDITOR-CR-005
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers implementing auto-layout (`website/app/`); reviewers
review_cycle: Until CR-005 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-CR-005
  - DESIGN-BPMN-EDITOR-CR-005
  - TEST-BPMN-EDITOR-CR-005
  - PLAN-BPMN-EDITOR-CR-005
  - FEAT-BPMN-EDITOR-001
  - FEAT-BPMN-DSL-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - srs
  - iso-29148
  - change-request
  - bpmn-editor
  - auto-layout
  - acceptance-criteria
---

# BPMN Editor CR-005 — Requirements (SRS delta): One-click auto-layout

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-EDITOR-CR-005` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-BPMN-EDITOR-CR-005` (change record), `DESIGN-BPMN-EDITOR-CR-005`, `TEST-BPMN-EDITOR-CR-005`, `FEAT-BPMN-EDITOR-001` (SRS amended), `FEAT-BPMN-DSL-001` (`bpmnLayout`) |

> **Delta SRS.** Requirements for the CR-005 change only; maps to the parent clause it extends (§5).

---

## 1. Stakeholder needs

- `SN-BE-01` (model without fighting coordinates) — extended with a **one-click tidy** of a hand-placed
  diagram.

## 2. Functional requirements (`FR-CR5`)

| ID | Requirement | Source need | Extends / supersedes |
|----|-------------|-------------|----------------------|
| `FR-CR5-01` | An **auto-arrange** action SHALL run `bpmnLayout(diagram)` and re-position nodes + route flows; the result SHALL be a **single undo step**. | `SN-BE-01` | `FEAT §6` (auto-layout) |

## 3. Non-functional requirements (`NFR-CR5`)

| ID | Requirement | Inherits |
|----|-------------|----------|
| `NFR-CR5-01` | **Structure-preserving & engine-safe.** Auto-arrange mutates only positions/waypoints, never structure (elements + flows unchanged); it calls the existing `bpmnLayout` unchanged, so no layout-engine change. | `NFR-BE-04` |

## 4. Scope

**In scope:** the auto-arrange action wiring `bpmnLayout` into the editor, in `website/app/*`.
**Out of scope:** alternative layout directions (TB/RL), partial/selection-only layout, and any change
to the `bpmnLayout` algorithm itself.

## 5. Acceptance criteria

1. Auto-arrange repositions a messy diagram via `bpmnLayout`; structure (elements + flows) is
   unchanged; the action is a single undo step (`FR-CR5-01`, `NFR-CR5-01`).
2. `bpmnLayout` is called unchanged (the editor only invokes it); goldens + corpus baseline unaffected.

**Supersession / traceability:**

| `FR/NFR-CR5` | Extends (parent) | Covered by |
|--------------|------------------|------------|
| `FR-CR5-01` | `§6` (auto-layout) | `TC-CR5-01` |
| `NFR-CR5-01` | `NFR-BE-04` | `TC-CR5-02` |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. `FR-CR5-01` one-click auto-arrange (`bpmnLayout`, one undo step); `NFR-CR5-01` structure-preserving/engine-safe. |

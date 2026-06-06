---
title: "BPMN Editor CR-003 — Requirements (SRS delta): Validation / lint overlay"
document_id: FEAT-BPMN-EDITOR-CR-003
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the lint overlay (`website/app/`); reviewers
review_cycle: Until CR-003 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-CR-003
  - DESIGN-BPMN-EDITOR-CR-003
  - TEST-BPMN-EDITOR-CR-003
  - PLAN-BPMN-EDITOR-CR-003
  - FEAT-BPMN-EDITOR-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - srs
  - iso-29148
  - change-request
  - bpmn-editor
  - validation
  - lint
  - acceptance-criteria
---

# BPMN Editor CR-003 — Requirements (SRS delta): Validation / lint overlay

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-EDITOR-CR-003` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-BPMN-EDITOR-CR-003` (change record), `DESIGN-BPMN-EDITOR-CR-003`, `TEST-BPMN-EDITOR-CR-003`, `FEAT-BPMN-EDITOR-001` (SRS amended), `RES-BPMN-LINT-001` (rule basis) |

> **Delta SRS.** Requirements for the CR-003 change only; maps to the parent clause it extends (§5).

---

## 1. Stakeholder needs

- `SN-BE-02` (edit elements correctly) — extended with **early, non-blocking feedback** on structural
  validity while modeling.

## 2. Functional requirements (`FR-CR3`)

| ID | Requirement | Source need | Extends / supersedes |
|----|-------------|-------------|----------------------|
| `FR-CR3-01` | A configurable rule set SHALL run on the current diagram; each finding SHALL be shown as a **non-blocking** marker on the offending element with a tooltip; clearing the cause SHALL clear the marker. | `SN-BE-02` | `FEAT §6` (removes validation/linting from out-of-scope) |

Initial rule set (from `RES-BPMN-LINT-001`): start/end event flow constraints, disconnected nodes,
gateway fan-in/fan-out sanity, dangling flow endpoints. Rules are **data-driven** so the set can grow.

## 3. Non-functional requirements (`NFR-CR3`)

| ID | Requirement | Inherits |
|----|-------------|----------|
| `NFR-CR3-01` | **Non-intrusive & cheap.** Linting runs incrementally (debounced) and NEVER blocks an edit or export; with the overlay OFF there is **zero** behavioural change. | `NFR-BE-01`, `NFR-BE-04` |

## 4. Scope

**In scope:** the rule engine + non-blocking marker overlay + the initial rule set, in `website/app/*`.
**Out of scope:** blocking/gating validation (export is never prevented), auto-fix, and custom
user-authored rules (a possible follow-up). The rule engine MAY reuse `bpmnlint` or a small in-house
checker (decided in design).

## 5. Acceptance criteria

1. A diagram with seeded violations shows the expected non-blocking markers; resolving each clears it;
   edits and export are never blocked (`FR-CR3-01`, `NFR-CR3-01`).
2. With the overlay disabled, the editor behaves byte-for-byte as before (no regression).

**Supersession / traceability:**

| `FR/NFR-CR3` | Extends (parent) | Covered by |
|--------------|------------------|------------|
| `FR-CR3-01` | `§6` (validation/linting) | `TC-CR3-01` |
| `NFR-CR3-01` | `NFR-BE-01`, `NFR-BE-04` | `TC-CR3-02` |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. `FR-CR3-01` non-blocking lint overlay + initial rule set; `NFR-CR3-01` non-intrusive/cheap. |

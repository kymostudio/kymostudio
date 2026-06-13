---
title: "BPMN Editor CR-003 — Live validation / lint overlay: Requirements"
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
  - DESIGN-BPMN-EDITOR-CR-003
  - TEST-BPMN-EDITOR-CR-003
  - PLAN-BPMN-EDITOR-CR-003
  - FEAT-BPMN-EDITOR-001
  - DESIGN-BPMN-EDITOR-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - introduction
  - change-record
  - requirements
  - srs
  - iso-29148
  - bpmn-editor
  - validation
  - lint
  - bpmnlint
  - acceptance-criteria
---

# BPMN Editor CR-003 — Live validation / lint overlay: Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-EDITOR-CR-003` |
| Version           | 0.1 |
| Status            | **Proposed** — not yet raised (v1 baseline `*-BPMN-EDITOR-001` pending) |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Severity          | **Low–Medium** — quality-of-life enhancement |
| Type              | **Enhancement** (new capability beyond v1) |
| Related Documents | `DESIGN-BPMN-EDITOR-CR-003`, `TEST-BPMN-EDITOR-CR-003`, `PLAN-BPMN-EDITOR-CR-003`; parent `FEAT-/DESIGN-BPMN-EDITOR-001`; research `RES-BPMN-LINT-001` |

---

## Part A — Introduction

> **What this folder is.** `CR-003/` is a **self-contained mini engineering-spec** using its own mini-spec
> layout (`01-REQUIREMENTS`→`04-PLAN`). This Part A doubles as the **change record**.

### A.1 Purpose & motivation

A modeling surface invites structurally invalid diagrams — a start event with an incoming flow, a
disconnected node, a gateway with a single path, a flow with a missing endpoint. `bpmn-js` ships
`bpmnlint` for this; `RES-BPMN-LINT-001` already surveys the rule sets and tooling.
`FEAT-BPMN-EDITOR-001 §7` lists validation as out of scope for v1. This CR surfaces a curated subset of
rules as **non-blocking** on-canvas warnings while the author models — caught early, never forced.

**Intended outcome.** Findings appear as non-blocking markers on offending elements; fixing the cause
clears the marker; with the overlay off the editor behaves exactly as before.

### A.2 Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-REQUIREMENTS.md` | `FEAT-BPMN-EDITOR-CR-003` | This doc — motivation, change record (Part A) + requirements (Part B). |
| `02-DESIGN.md` | `DESIGN-BPMN-EDITOR-CR-003` | Rule engine, marker UI, debounce; golden-safety. |
| `03-TEST.md` | `TEST-BPMN-EDITOR-CR-003` | `TC-CR3-01..02`; traceability. |
| `04-PLAN.md` | `PLAN-BPMN-EDITOR-CR-003` | Close-out plan; risks; worklog. |

### A.3 Relationship to the bpmn-editor baseline

| Clause | Doc | Change |
|--------|-----|--------|
| §7 Out-of-scope | `FEAT-BPMN-EDITOR-001` | Remove "validation/linting"; add the lint overlay requirements |
| (new section) | `DESIGN-BPMN-EDITOR-001` | Add the rule engine + marker UI + debounce |

Item IDs are **CR-local** (`FR-CR3-`/`NFR-CR3-`/`TC-CR3-`/`RK-CR3-`).

### A.4 Reading guide

- **Approver:** §A.1 + §A.3 → Part B §2/§5.
- **Implementer:** `DESIGN-BPMN-EDITOR-CR-003` → `PLAN-BPMN-EDITOR-CR-003`, verify against `TEST-BPMN-EDITOR-CR-003`.

### A.5 Status & change record

**Status: Proposed** · Severity **Low–Medium** · Type **Enhancement**. Grounded in `RES-BPMN-LINT-001`;
non-blocking by design.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Proposed.** Mini-spec authored. Awaiting v1 baseline + approval. |

---

## Part B — Requirements

> **Delta SRS.** Requirements for the CR-003 change only; maps to the parent clause it extends (§B.5).

### B.1 Stakeholder needs

- `SN-BE-02` (edit elements correctly) — extended with **early, non-blocking feedback** on structural
  validity while modeling.

### B.2 Functional requirements (`FR-CR3`)

| ID | Requirement | Source need | Extends / supersedes |
|----|-------------|-------------|----------------------|
| `FR-CR3-01` | A configurable rule set SHALL run on the current diagram; each finding SHALL be shown as a **non-blocking** marker on the offending element with a tooltip; clearing the cause SHALL clear the marker. | `SN-BE-02` | `FEAT §6` (removes validation/linting from out-of-scope) |

Initial rule set (from `RES-BPMN-LINT-001`): start/end event flow constraints, disconnected nodes,
gateway fan-in/fan-out sanity, dangling flow endpoints. Rules are **data-driven** so the set can grow.

### B.3 Non-functional requirements (`NFR-CR3`)

| ID | Requirement | Inherits |
|----|-------------|----------|
| `NFR-CR3-01` | **Non-intrusive & cheap.** Linting runs incrementally (debounced) and NEVER blocks an edit or export; with the overlay OFF there is **zero** behavioural change. | `NFR-BE-01`, `NFR-BE-04` |

### B.4 Scope

**In scope:** the rule engine + non-blocking marker overlay + the initial rule set, in `website/app/*`.
**Out of scope:** blocking/gating validation (export is never prevented), auto-fix, and custom
user-authored rules (a possible follow-up). The rule engine MAY reuse `bpmnlint` or a small in-house
checker (decided in design).

### B.5 Acceptance criteria

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
| 0.1     | 2026-06-06 | Vũ Anh | Consolidated `01-INTRO.md` (FEAT-BPMN-EDITOR-CR-003) into Part A and `02-REQUIREMENT.md` (FEAT-BPMN-EDITOR-CR-003) into Part B; deleted source files; renamed `03-DESIGN`→`02-DESIGN`, `04-TEST`→`03-TEST`, `05-PLAN`→`04-PLAN`. |

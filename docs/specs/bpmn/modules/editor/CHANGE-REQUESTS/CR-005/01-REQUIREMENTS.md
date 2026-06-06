---
title: "BPMN Editor CR-005 — One-click auto-layout: Requirements"
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
  - DESIGN-BPMN-EDITOR-CR-005
  - TEST-BPMN-EDITOR-CR-005
  - PLAN-BPMN-EDITOR-CR-005
  - FEAT-BPMN-EDITOR-001
  - DESIGN-BPMN-EDITOR-001
  - FEAT-BPMN-DSL-001
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
  - auto-layout
  - bpmn-layout
  - acceptance-criteria
---

# BPMN Editor CR-005 — One-click auto-layout: Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-EDITOR-CR-005` |
| Version           | 0.1 |
| Status            | **Proposed** — not yet raised (v1 baseline `*-BPMN-EDITOR-001` pending) |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Severity          | **Low** — convenience enhancement |
| Type              | **Enhancement** (new capability beyond v1) |
| Related Documents | `DESIGN-BPMN-EDITOR-CR-005`, `TEST-BPMN-EDITOR-CR-005`, `PLAN-BPMN-EDITOR-CR-005`; parent `FEAT-/DESIGN-BPMN-EDITOR-001`; `FEAT-BPMN-DSL-001` (the `bpmnLayout` engine) |

---

## Part A — Introduction

> **What this folder is.** `CR-005/` is a **self-contained mini engineering-spec** using its own mini-spec
> layout (`01-REQUIREMENTS`→`04-PLAN`). This Part A doubles as the **change record**.

### A.1 Purpose & motivation

v1 places elements where the author clicks; there is no "tidy up". Hand-placed diagrams drift out of
alignment as they grow. `packages/js` already exposes **`bpmnLayout(diagram)`** — a left-to-right
layered (Sugiyama/DAG) layout with orthogonal routing, the same engine behind the `bpmn { … }` DSL
block (`FEAT-BPMN-DSL-001`). This CR exposes it as a one-click **auto-arrange** action in the editor.

**Intended outcome.** An author sketches freely, then clicks "auto-arrange" to re-position nodes +
route flows via `bpmnLayout`; the result is a single undo step (revertible).

### A.2 Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-REQUIREMENTS.md` | `FEAT-BPMN-EDITOR-CR-005` | This doc — motivation, change record (Part A) + requirements (Part B). |
| `02-DESIGN.md` | `DESIGN-BPMN-EDITOR-CR-005` | The auto-arrange action calling `bpmnLayout`, applied as one history step. |
| `03-TEST.md` | `TEST-BPMN-EDITOR-CR-005` | `TC-CR5-01..02`; traceability. |
| `04-PLAN.md` | `PLAN-BPMN-EDITOR-CR-005` | Close-out plan; risks; worklog. |

### A.3 Relationship to the bpmn-editor baseline

| Clause | Doc | Change |
|--------|-----|--------|
| §4.1 / §7 | `FEAT-BPMN-EDITOR-001` | Add the auto-layout action; drop auto-layout from out-of-scope |
| §4 placement | `DESIGN-BPMN-EDITOR-001` | Add the auto-arrange action calling `bpmnLayout`, as one history step |

Item IDs are **CR-local** (`FR-CR5-`/`NFR-CR5-`/`TC-CR5-`/`RK-CR5-`).

### A.4 Reading guide

- **Approver:** §A.1 + §A.3 → Part B §2/§5.
- **Implementer:** `DESIGN-BPMN-EDITOR-CR-005` → `PLAN-BPMN-EDITOR-CR-005`, verify against `TEST-BPMN-EDITOR-CR-005`.

### A.5 Status & change record

**Status: Proposed** · Severity **Low** · Type **Enhancement**. A thin wrapper over the existing
`bpmnLayout`; no layout-engine change.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Proposed.** Mini-spec authored. Awaiting v1 baseline + approval. |

---

## Part B — Requirements

> **Delta SRS.** Requirements for the CR-005 change only; maps to the parent clause it extends (§B.5).

### B.1 Stakeholder needs

- `SN-BE-01` (model without fighting coordinates) — extended with a **one-click tidy** of a hand-placed
  diagram.

### B.2 Functional requirements (`FR-CR5`)

| ID | Requirement | Source need | Extends / supersedes |
|----|-------------|-------------|----------------------|
| `FR-CR5-01` | An **auto-arrange** action SHALL run `bpmnLayout(diagram)` and re-position nodes + route flows; the result SHALL be a **single undo step**. | `SN-BE-01` | `FEAT §6` (auto-layout) |

### B.3 Non-functional requirements (`NFR-CR5`)

| ID | Requirement | Inherits |
|----|-------------|----------|
| `NFR-CR5-01` | **Structure-preserving & engine-safe.** Auto-arrange mutates only positions/waypoints, never structure (elements + flows unchanged); it calls the existing `bpmnLayout` unchanged, so no layout-engine change. | `NFR-BE-04` |

### B.4 Scope

**In scope:** the auto-arrange action wiring `bpmnLayout` into the editor, in `website/app/*`.
**Out of scope:** alternative layout directions (TB/RL), partial/selection-only layout, and any change
to the `bpmnLayout` algorithm itself.

### B.5 Acceptance criteria

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
| 0.1     | 2026-06-06 | Vũ Anh | Consolidated `01-INTRO.md` (FEAT-BPMN-EDITOR-CR-005) into Part A and `02-REQUIREMENT.md` (FEAT-BPMN-EDITOR-CR-005) into Part B; deleted source files; renamed `03-DESIGN`→`02-DESIGN`, `04-TEST`→`03-TEST`, `05-PLAN`→`04-PLAN`. |

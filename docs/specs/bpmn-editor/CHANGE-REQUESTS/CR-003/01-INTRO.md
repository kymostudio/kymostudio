---
title: "BPMN Editor CR-003 — Live validation / lint overlay: Overview & Change Record"
document_id: INTRO-BPMN-EDITOR-CR-003
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: bpmn-editor maintainers / reviewers; the approver of the baseline; the engineer closing CR-003
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-BPMN-EDITOR-CR-003
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
  - bpmn-editor
  - validation
  - lint
  - bpmnlint
---

# BPMN Editor CR-003 — Live validation / lint overlay: Overview & Change Record

| Field             | Value |
|-------------------|-------|
| Document ID       | `INTRO-BPMN-EDITOR-CR-003` |
| Version           | 0.1 |
| Status            | **Proposed** — not yet raised (v1 baseline `*-BPMN-EDITOR-001` pending) |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Severity          | **Low–Medium** — quality-of-life enhancement |
| Type              | **Enhancement** (new capability beyond v1) |
| Related Documents | `FEAT-BPMN-EDITOR-CR-003`, `DESIGN-BPMN-EDITOR-CR-003`, `TEST-BPMN-EDITOR-CR-003`, `PLAN-BPMN-EDITOR-CR-003`; parent `FEAT-/DESIGN-BPMN-EDITOR-001`; research `RES-BPMN-LINT-001` |

> **What this folder is.** `CR-003/` is a **self-contained mini engineering-spec** mirroring the parent
> layout (`01-INTRO`→`05-PLAN`). This `01-INTRO` doubles as the **change record**.

---

## 1. Purpose & motivation

A modeling surface invites structurally invalid diagrams — a start event with an incoming flow, a
disconnected node, a gateway with a single path, a flow with a missing endpoint. `bpmn-js` ships
`bpmnlint` for this; `RES-BPMN-LINT-001` already surveys the rule sets and tooling.
`FEAT-BPMN-EDITOR-001 §6` lists validation as out of scope for v1. This CR surfaces a curated subset of
rules as **non-blocking** on-canvas warnings while the author models — caught early, never forced.

**Intended outcome.** Findings appear as non-blocking markers on offending elements; fixing the cause
clears the marker; with the overlay off the editor behaves exactly as before.

## 2. Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-INTRO.md` | `INTRO-BPMN-EDITOR-CR-003` | This doc — motivation, map, supersession, **change record**. |
| `02-REQUIREMENT.md` | `FEAT-BPMN-EDITOR-CR-003` | `FR-CR3-01`, `NFR-CR3-01`; scope; acceptance; supersession. |
| `03-DESIGN.md` | `DESIGN-BPMN-EDITOR-CR-003` | Rule engine, marker UI, debounce; golden-safety. |
| `04-TEST.md` | `TEST-BPMN-EDITOR-CR-003` | `TC-CR3-01..02`; traceability. |
| `05-PLAN.md` | `PLAN-BPMN-EDITOR-CR-003` | Close-out plan; risks; worklog. |

## 3. Relationship to the bpmn-editor baseline

| Clause | Doc | Change |
|--------|-----|--------|
| §6 Out-of-scope | `FEAT-BPMN-EDITOR-001` | Remove "validation/linting"; add the lint overlay requirements |
| (new section) | `DESIGN-BPMN-EDITOR-001` | Add the rule engine + marker UI + debounce |

Item IDs are **CR-local** (`FR-CR3-`/`NFR-CR3-`/`TC-CR3-`/`RK-CR3-`).

## 4. Reading guide

- **Approver:** §1 + §3 → `FEAT-BPMN-EDITOR-CR-003 §2/§5`.
- **Implementer:** `DESIGN-BPMN-EDITOR-CR-003` → `PLAN-BPMN-EDITOR-CR-003`, verify against `TEST-BPMN-EDITOR-CR-003`.

## 5. Status & change record

**Status: Proposed** · Severity **Low–Medium** · Type **Enhancement**. Grounded in `RES-BPMN-LINT-001`;
non-blocking by design.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Proposed.** Mini-spec authored. Awaiting v1 baseline + approval. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. Live non-blocking lint overlay; rule set from `RES-BPMN-LINT-001`. |

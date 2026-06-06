---
title: "BPMN Editor CR-005 — One-click auto-layout: Overview & Change Record"
document_id: INTRO-BPMN-EDITOR-CR-005
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: bpmn-editor maintainers / reviewers; the approver of the baseline; the engineer closing CR-005
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-BPMN-EDITOR-CR-005
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
  - bpmn-editor
  - auto-layout
  - bpmn-layout
---

# BPMN Editor CR-005 — One-click auto-layout: Overview & Change Record

| Field             | Value |
|-------------------|-------|
| Document ID       | `INTRO-BPMN-EDITOR-CR-005` |
| Version           | 0.1 |
| Status            | **Proposed** — not yet raised (v1 baseline `*-BPMN-EDITOR-001` pending) |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Severity          | **Low** — convenience enhancement |
| Type              | **Enhancement** (new capability beyond v1) |
| Related Documents | `FEAT-BPMN-EDITOR-CR-005`, `DESIGN-BPMN-EDITOR-CR-005`, `TEST-BPMN-EDITOR-CR-005`, `PLAN-BPMN-EDITOR-CR-005`; parent `FEAT-/DESIGN-BPMN-EDITOR-001`; `FEAT-BPMN-DSL-001` (the `bpmnLayout` engine) |

> **What this folder is.** `CR-005/` is a **self-contained mini engineering-spec** using its own mini-spec
> layout (`01-INTRO`→`05-PLAN`). This `01-INTRO` doubles as the **change record**.

---

## 1. Purpose & motivation

v1 places elements where the author clicks; there is no "tidy up". Hand-placed diagrams drift out of
alignment as they grow. `packages/js` already exposes **`bpmnLayout(diagram)`** — a left-to-right
layered (Sugiyama/DAG) layout with orthogonal routing, the same engine behind the `bpmn { … }` DSL
block (`FEAT-BPMN-DSL-001`). This CR exposes it as a one-click **auto-arrange** action in the editor.

**Intended outcome.** An author sketches freely, then clicks "auto-arrange" to re-position nodes +
route flows via `bpmnLayout`; the result is a single undo step (revertible).

## 2. Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-INTRO.md` | `INTRO-BPMN-EDITOR-CR-005` | This doc — motivation, map, supersession, **change record**. |
| `02-REQUIREMENT.md` | `FEAT-BPMN-EDITOR-CR-005` | `FR-CR5-01`, `NFR-CR5-01`; scope; acceptance; supersession. |
| `03-DESIGN.md` | `DESIGN-BPMN-EDITOR-CR-005` | The auto-arrange action calling `bpmnLayout`, applied as one history step. |
| `04-TEST.md` | `TEST-BPMN-EDITOR-CR-005` | `TC-CR5-01..02`; traceability. |
| `05-PLAN.md` | `PLAN-BPMN-EDITOR-CR-005` | Close-out plan; risks; worklog. |

## 3. Relationship to the bpmn-editor baseline

| Clause | Doc | Change |
|--------|-----|--------|
| §4.1 / §7 | `FEAT-BPMN-EDITOR-001` | Add the auto-layout action; drop auto-layout from out-of-scope |
| §4 placement | `DESIGN-BPMN-EDITOR-001` | Add the auto-arrange action calling `bpmnLayout`, as one history step |

Item IDs are **CR-local** (`FR-CR5-`/`NFR-CR5-`/`TC-CR5-`/`RK-CR5-`).

## 4. Reading guide

- **Approver:** §1 + §3 → `FEAT-BPMN-EDITOR-CR-005 §2/§5`.
- **Implementer:** `DESIGN-BPMN-EDITOR-CR-005` → `PLAN-BPMN-EDITOR-CR-005`, verify against `TEST-BPMN-EDITOR-CR-005`.

## 5. Status & change record

**Status: Proposed** · Severity **Low** · Type **Enhancement**. A thin wrapper over the existing
`bpmnLayout`; no layout-engine change.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Proposed.** Mini-spec authored. Awaiting v1 baseline + approval. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. One-click auto-arrange wrapping the existing `bpmnLayout` (`packages/js`), applied as one undo step. |

---
title: "BPMN Editor CR-005 — Implementation Plan (close-out): One-click auto-layout"
document_id: PLAN-BPMN-EDITOR-CR-005
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineer closing CR-005 (auto-layout)
review_cycle: Until CR-005 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-BPMN-EDITOR-CR-005
  - DESIGN-BPMN-EDITOR-CR-005
  - TEST-BPMN-EDITOR-CR-005
  - PLAN-BPMN-EDITOR-001
  - FEAT-BPMN-DSL-001
authors:
  - Vũ Anh
language: en
keywords:
  - plan
  - close-out
  - change-request
  - risk-register
  - story-points
  - worklog
  - bpmn-editor
  - auto-layout
---

# BPMN Editor CR-005 — Implementation Plan (close-out): One-click auto-layout

| Field             | Value |
|-------------------|-------|
| Document ID       | `PLAN-BPMN-EDITOR-CR-005` |
| Version           | 0.1 |
| Status            | **Proposed** — awaiting v1 baseline + approval |
| Owner             | `diagrams/` project |
| Entry gate        | **CR-005 approved** and the v1 spec baselined. |
| Related Documents | `FEAT-BPMN-EDITOR-CR-005`, `DESIGN-BPMN-EDITOR-CR-005`, `TEST-BPMN-EDITOR-CR-005`, `PLAN-BPMN-EDITOR-001`, `FEAT-BPMN-DSL-001` |

---

## 1. Context

Wire the existing `bpmnLayout` into a one-click auto-arrange action, prove it preserves structure as
one undo step, re-baseline. The thinnest of the five CRs.

## 2. Decision

Build per `DESIGN-BPMN-EDITOR-CR-005`. Call `bpmnLayout` unchanged; apply positions back in one
`editor.run({history})`.

## 3. Phased plan

| Phase | Goal | SP |
|-------|------|----|
| **P1 — Auto-arrange action + V&V** | Wire `bpmnLayout` to a control; apply as one history step; `TC-CR5-01..02`. | 2 |
| **P2 — Re-baseline + close** | Fold into parent; reconcile §3.1/§4; close. | 1 |

## 4. Risk register

| ID | Risk | L | I | Mitigation |
|----|------|---|---|------------|
| `RK-CR5-01` | Pathological inputs (cycles, pools) lay out oddly | Med | Low | Document the LR/DAG assumption; auto-arrange is always undoable (`FR-CR5-01`). |
| `RK-CR5-02` | Position updates applied as N steps, not one | Low | Med | Single `editor.run({history})`; `TC-CR5-01` asserts one-undo. |
| `RK-CR5-03` | Temptation to modify `bpmnLayout` for editor needs | Low | Med | Call it unchanged; any algorithm change is a separate CR against `FEAT-BPMN-DSL-001`. |

## 5. Files to create / modify

| File | Change |
|------|--------|
| `website/app/src/engine/bpmn-tools.ts` (or a small `bpmn-autolayout.ts`) | Auto-arrange action calling `bpmnLayout`. |
| `website/app/src/ui/*` | Auto-arrange control (top bar / palette). |
| `website/app/e2e/*` | `TC-CR5-01..02`. |
| parent `BPMN-EDITOR-001` docs + `CHANGE-REQUESTS/README.md` | P2 re-baseline + register close. |

## 6. Verification (close-out gate)

Closes when `TC-CR5-01..02` pass; structure preserved; one undo step; `bpmnLayout` unchanged; goldens +
corpus unaffected; render-guard green; parent re-baselined; register row Closed.

## 7. Change-control / close-out

Change against baselined `BPMN-EDITOR-001`; parent §3.1/§4 reconciled at close-out; register row flipped
to **Closed**. The `bpmnLayout` algorithm is out of scope (owned by `FEAT-BPMN-DSL-001`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. P1 auto-arrange + V&V → P2 re-baseline, ~3 SP; risks `RK-CR5-01..03`; `bpmnLayout` called unchanged. |

## Annex B — Worklog

| Date | Phase | Work | Status |
|------|-------|------|--------|
| 2026-05-31 | — | CR-005 mini-spec authored (`BPMN-EDITOR-CR-005` series); Proposed, awaiting v1 baseline + approval. | ✅ |

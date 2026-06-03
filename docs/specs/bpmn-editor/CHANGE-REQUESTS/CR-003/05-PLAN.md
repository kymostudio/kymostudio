---
title: "BPMN Editor CR-003 — Implementation Plan (close-out): Validation / lint overlay"
document_id: PLAN-BPMN-EDITOR-CR-003
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineer closing CR-003 (lint overlay)
review_cycle: Until CR-003 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-CR-003
  - FEAT-BPMN-EDITOR-CR-003
  - DESIGN-BPMN-EDITOR-CR-003
  - TEST-BPMN-EDITOR-CR-003
  - PLAN-BPMN-EDITOR-001
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
  - lint
---

# BPMN Editor CR-003 — Implementation Plan (close-out): Validation / lint overlay

| Field             | Value |
|-------------------|-------|
| Document ID       | `PLAN-BPMN-EDITOR-CR-003` |
| Version           | 0.1 |
| Status            | **Proposed** — awaiting v1 baseline + approval |
| Owner             | `diagrams/` project |
| Entry gate        | **CR-003 approved** and the v1 spec baselined. |
| Related Documents | `FEAT-BPMN-EDITOR-CR-003`, `DESIGN-BPMN-EDITOR-CR-003`, `TEST-BPMN-EDITOR-CR-003`, `PLAN-BPMN-EDITOR-001` |

---

## 1. Context

Deliver a non-blocking lint overlay over the editor model, prove it never blocks (and is a no-op when
off), re-baseline. Pure `website/app/*` work; no renderer/exporter change.

## 2. Decision

Build per `DESIGN-BPMN-EDITOR-CR-003`. Prefer a small in-house checker over the kymo model for the
initial rule set (avoids a `bpmnlint` + moddle-adapter dependency); revisit vendoring if the rule set
grows large.

## 3. Phased plan

| Phase | Goal | SP |
|-------|------|----|
| **P1 — Rule engine** | `bpmn-lint.ts` with the initial data-driven rules; debounced run. | 3 |
| **P2 — Overlay + V&V** | `ui/LintOverlay.tsx` non-blocking markers; `TC-CR3-01..02`. | 2 |
| **P3 — Re-baseline + close** | Fold into parent; reconcile §6; close. | 1 |

## 4. Risk register

| ID | Risk | L | I | Mitigation |
|----|------|---|---|------------|
| `RK-CR3-01` | An over-frequent/heavy check janks modeling | Med | Med | Debounce + incremental scope; keep rules O(n) over the model (`NFR-CR3-01`). |
| `RK-CR3-02` | Vendoring `bpmnlint` adds bundle weight + a moddle adapter | Med | Low | In-house checker for the initial set; `RES-BPMN-LINT-001` informs the choice. |
| `RK-CR3-03` | Overlay leaks state when toggled off | Low | Med | Overlay-off path asserted no-op by `TC-CR3-02`. |

## 5. Files to create / modify

| File | Change |
|------|--------|
| `website/app/src/engine/bpmn-lint.ts` | NEW — rule engine over the model. |
| `website/app/src/ui/LintOverlay.tsx` | NEW — non-blocking markers + tooltips + toggle. |
| `website/app/e2e/*` | `TC-CR3-01..02`. |
| parent `BPMN-EDITOR-001` docs + `CHANGE-REQUESTS/README.md` | P3 re-baseline + register close. |

## 6. Verification (close-out gate)

Closes when `TC-CR3-01..02` pass; overlay never blocks; overlay-off no-change; goldens + corpus
unaffected; render-guard green; parent re-baselined; register row Closed.

## 7. Change-control / close-out

Change against baselined `BPMN-EDITOR-001`; parent §6 + design reconciled at close-out; register row
flipped to **Closed**.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. P1 rule engine → P2 overlay+V&V → P3 re-baseline, ~6 SP; risks `RK-CR3-01..03`; in-house checker preferred. |

## Annex B — Worklog

| Date | Phase | Work | Status |
|------|-------|------|--------|
| 2026-05-31 | — | CR-003 mini-spec authored (`BPMN-EDITOR-CR-003` series); Proposed, awaiting v1 baseline + approval. | ✅ |

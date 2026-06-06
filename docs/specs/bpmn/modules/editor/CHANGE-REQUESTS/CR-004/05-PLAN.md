---
title: "BPMN Editor CR-004 — Implementation Plan (close-out): Copy/paste & keyboard modeling"
document_id: PLAN-BPMN-EDITOR-CR-004
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineer closing CR-004 (copy/paste & keyboard)
review_cycle: Until CR-004 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-CR-004
  - FEAT-BPMN-EDITOR-CR-004
  - DESIGN-BPMN-EDITOR-CR-004
  - TEST-BPMN-EDITOR-CR-004
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
  - copy-paste
  - keyboard
---

# BPMN Editor CR-004 — Implementation Plan (close-out): Copy/paste & keyboard modeling

| Field             | Value |
|-------------------|-------|
| Document ID       | `PLAN-BPMN-EDITOR-CR-004` |
| Version           | 0.1 |
| Status            | **Proposed** — awaiting v1 baseline + approval |
| Owner             | `diagrams/` project |
| Entry gate        | **CR-004 approved** and the v1 spec baselined. |
| Related Documents | `FEAT-BPMN-EDITOR-CR-004`, `DESIGN-BPMN-EDITOR-CR-004`, `TEST-BPMN-EDITOR-CR-004`, `PLAN-BPMN-EDITOR-001` |

---

## 1. Context

Deliver clipboard + keyboard modeling over the engine's selection + history, prove it, re-baseline.
Pure `website/app/*` work; no renderer/exporter change.

## 2. Decision

Build per `DESIGN-BPMN-EDITOR-CR-004`. Reuse the context-pad "append" op for keyboard append so the two
paths share one code path.

## 3. Phased plan

| Phase | Goal | SP |
|-------|------|----|
| **P1 — Clipboard** | `engine/bpmn-clipboard.ts` (copy/paste/duplicate, id remap, internal flows, one undo step). | 3 |
| **P2 — Keyboard + V&V** | Keyboard append/navigation; shortcut reference; `TC-CR4-01..02`. | 2 |
| **P3 — Re-baseline + close** | Fold into parent; reconcile §6/§9; close. | 1 |

## 4. Risk register

| ID | Risk | L | I | Mitigation |
|----|------|---|---|------------|
| `RK-CR4-01` | Paste produces id collisions or dangling flow endpoints | Med | Med | Remap all ids; drop flows with an endpoint outside the selection; `TC-CR4-01`. |
| `RK-CR4-02` | Keyboard shortcuts clash with browser/editor defaults | Med | Low | Scope keys to canvas focus; document in the shortcut reference; align with `demo.bpmn.io` keys. |
| `RK-CR4-03` | Scope creep (cross-document paste, custom keymap) | Low | Low | Hard non-goals stand (`FEAT-BPMN-EDITOR-CR-004 §4`). |

## 5. Files to create / modify

| File | Change |
|------|--------|
| `website/app/src/engine/bpmn-clipboard.ts` | NEW — copy/paste/duplicate with id remap. |
| `website/app/src/engine/bpmn-ops.ts` | Reuse "append" for keyboard append. |
| `website/app/src/ui/*` | Keyboard handler + extend the shortcut reference. |
| `website/app/e2e/*` | `TC-CR4-01..02`. |
| parent `BPMN-EDITOR-001` docs + `CHANGE-REQUESTS/README.md` | P3 re-baseline + register close. |

## 6. Verification (close-out gate)

Closes when `TC-CR4-01..02` pass; pointer modeling unchanged; goldens + corpus unaffected; render-guard
green; parent re-baselined; register row Closed.

## 7. Change-control / close-out

Change against baselined `BPMN-EDITOR-001`; parent §6/§9 reconciled at close-out; register row flipped
to **Closed**.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. P1 clipboard → P2 keyboard+V&V → P3 re-baseline, ~6 SP; risks `RK-CR4-01..03`. |

## Annex B — Worklog

| Date | Phase | Work | Status |
|------|-------|------|--------|
| 2026-05-31 | — | CR-004 mini-spec authored (`BPMN-EDITOR-CR-004` series); Proposed, awaiting v1 baseline + approval. | ✅ |

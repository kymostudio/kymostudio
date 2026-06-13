---
title: "BPMN Editor CR-002 — Implementation Plan (close-out): Set color"
document_id: PLAN-BPMN-EDITOR-CR-002
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineer closing CR-002 (set color)
review_cycle: Until CR-002 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-BPMN-EDITOR-CR-002
  - DESIGN-BPMN-EDITOR-CR-002
  - TEST-BPMN-EDITOR-CR-002
  - PLAN-BPMN-EDITOR-001
  - FEAT-BPMN-EXPORT-001
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
  - color
---

# BPMN Editor CR-002 — Implementation Plan (close-out): Set color

| Field             | Value |
|-------------------|-------|
| Document ID       | `PLAN-BPMN-EDITOR-CR-002` |
| Version           | 0.1 |
| Status            | **Proposed** — awaiting v1 baseline + approval |
| Owner             | `diagrams/` project |
| Entry gate        | **CR-002 approved** and the v1 spec baselined. |
| Related Documents | `FEAT-BPMN-EDITOR-CR-002`, `DESIGN-BPMN-EDITOR-CR-002`, `TEST-BPMN-EDITOR-CR-002`, `PLAN-BPMN-EDITOR-001`, `FEAT-BPMN-EXPORT-001` |

---

## 1. Context

Deliver the Set-color action + durable DI color, prove the round-trip, re-baseline. The cross-feature
part (exporter/importer) is the real work; the UI is small.

## 2. Decision

Build per `DESIGN-BPMN-EDITOR-CR-002`. Fix the DI color namespace (Camunda `bioc:`/`color:`) in
`FEAT-BPMN-EXPORT-001` first, since it governs interoperability.

## 3. Phased plan

| Phase | Goal | SP |
|-------|------|----|
| **P1 — Persistence** | Emit/read DI color in `toBpmn`/`parseBpmn`; round-trip unit test; document in `BPMN-MAP-001`. | 3 |
| **P2 — UI + V&V** | Context-pad color control; `TC-CR2-01..02`; goldens byte-stable for uncolored diagrams. | 2 |
| **P3 — Re-baseline + close** | Fold into parent; reconcile clauses; close. | 1 |

## 4. Risk register

| ID | Risk | L | I | Mitigation |
|----|------|---|---|------------|
| `RK-CR2-01` | Non-interoperable color namespace → other tools drop the color | Med | Med | Use the de-facto Camunda `bioc:`/`color:` attributes; document in `BPMN-MAP-001`. |
| `RK-CR2-02` | Color emitted on uncolored diagrams → golden / corpus churn | Med | High | Conditional emission only; `TC-CR2-02` asserts uncolored byte-stability. |
| `RK-CR2-03` | Scope creep (gradients, presets) | Low | Low | Hard non-goals stand (`FEAT-BPMN-EDITOR-CR-002 §4`). |

## 5. Files to create / modify

| File | Change |
|------|--------|
| `website/app/src/ui/ContextPad.tsx` | Add the Set-color control. |
| `website/app/src/engine/shapes.tsx` | Read color from shape props (presentational). |
| `packages/js/src/to-bpmn.ts` | Conditional DI color emit. |
| `packages/js/src/from-bpmn.ts` | DI color read. |
| `packages/js` tests | Color round-trip unit test. |
| `docs/formats/bpmn/kymo-mapping.md` (`BPMN-MAP-001`) | Document the color extension. |
| parent `BPMN-EDITOR-001` docs + `CHANGE-REQUESTS/README.md` | P3 re-baseline + register close. |

## 6. Verification (close-out gate)

Closes when `TC-CR2-01..02` pass; color round-trips; uncolored diagrams byte-stable (goldens +
corpus); render-guard green; parent re-baselined; register row Closed.

## 7. Change-control / close-out

Change against baselined `BPMN-EDITOR-001`; **also** amends `FEAT-BPMN-EXPORT-001` (+ `BPMN-MAP-001`) —
those are re-baselined in lockstep at close-out.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. P1 persistence → P2 UI+V&V → P3 re-baseline, ~6 SP; risks `RK-CR2-01..03`; cross-feature with `FEAT-BPMN-EXPORT-001`/`BPMN-MAP-001`. |

## Annex B — Worklog

| Date | Phase | Work | Status |
|------|-------|------|--------|
| 2026-05-31 | — | CR-002 mini-spec authored (`BPMN-EDITOR-CR-002` series); Proposed, awaiting v1 baseline + approval. | ✅ |

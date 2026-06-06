---
title: "BPMN Editor CR-001 — Tests & Traceability (delta): Pools & lanes"
document_id: TEST-BPMN-EDITOR-CR-001
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the laning model
review_cycle: Until CR-001 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-CR-001
  - FEAT-BPMN-EDITOR-CR-001
  - DESIGN-BPMN-EDITOR-CR-001
  - PLAN-BPMN-EDITOR-CR-001
  - TEST-BPMN-EDITOR-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - test-plan
  - verification
  - validation
  - traceability
  - iso-29119
  - change-request
  - bpmn-editor
  - pools
  - lanes
---

# BPMN Editor CR-001 — Tests & Traceability (delta): Pools & lanes

| Field             | Value |
|-------------------|-------|
| Document ID       | `TEST-BPMN-EDITOR-CR-001` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-BPMN-EDITOR-CR-001` (requirements), `DESIGN-BPMN-EDITOR-CR-001` (design), `PLAN-BPMN-EDITOR-CR-001` (plan), `TEST-BPMN-EDITOR-001` (parent V&V) |

> **Delta V&V.** Test cases for the CR-001 change only; folded into `TEST-BPMN-EDITOR-001` on
> re-baseline. Every `FR-CR1`/`NFR-CR1` maps to ≥ 1 case (§5).

---

## 1. Test approach

- **E2E (Playwright)** — drive the served app (`data-testid`, trusted events) to place a pool, manage
  lanes, assign membership, and draw a cross-pool flow.
- **Round-trip** — export `.bpmn` and re-import; assert structural equivalence (pools/lanes/flows).
- **Regression** — `packages/js` `npm test`, Python goldens, and the BPMN corpus baseline stay green
  (no renderer change).

## 2. Test cases

| ID | Level | Verifies | Steps → Expected |
|----|-------|----------|------------------|
| TC-CR1-01 | E2E | FR-CR1-01 | Create a pool → a `participant` container renders with a label band; an element can be enclosed. |
| TC-CR1-02 | E2E | FR-CR1-02 | Add 2 lanes → resize and reorder them → geometry stays `BPMN-MAP-001`-conformant; pool bounds stay consistent. |
| TC-CR1-03 | E2E | FR-CR1-03 | Drag a task into a lane → membership recorded; export nests it under the lane's refs. |
| TC-CR1-04 | E2E | FR-CR1-04 | Draw a flow between elements in two pools → it is a `messageFlow`; a same-pool flow stays a sequence flow. |
| TC-CR1-05 | Round-trip | NFR-CR1-02 | Export a laned diagram → re-import → pools/lanes/membership/message-flows are equivalent (±1px DI). |
| TC-CR1-06 | Regression | NFR-CR1-01 | `packages/js` `npm test` + Python goldens + BPMN corpus baseline pass unchanged. |

## 3. Traceability matrix

| Requirement | Covered by |
|-------------|-----------|
| FR-CR1-01 | TC-CR1-01 |
| FR-CR1-02 | TC-CR1-02 |
| FR-CR1-03 | TC-CR1-03 |
| FR-CR1-04 | TC-CR1-04 |
| NFR-CR1-01 | TC-CR1-06 |
| NFR-CR1-02 | TC-CR1-05 |

## 4. Entry / exit criteria

- **Entry** — CR-001 approved; `DESIGN-BPMN-EDITOR-CR-001` implemented.
- **Exit** — `TC-CR1-01..06` pass; regression + corpus baseline green; render-guard green; no open
  Sev-1 defects.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. `TC-CR1-01..06` cover `FR-CR1-01..04` + `NFR-CR1-01/-02`; round-trip + corpus-baseline regression gates. |

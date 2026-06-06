---
title: "BPMN Editor CR-001 — Requirements (SRS delta): Pools & lanes"
document_id: FEAT-BPMN-EDITOR-CR-001
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the laning model (`website/app/`); reviewers
review_cycle: Until CR-001 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-CR-001
  - DESIGN-BPMN-EDITOR-CR-001
  - TEST-BPMN-EDITOR-CR-001
  - PLAN-BPMN-EDITOR-CR-001
  - FEAT-BPMN-EDITOR-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - srs
  - iso-29148
  - change-request
  - bpmn-editor
  - pools
  - lanes
  - message-flow
  - acceptance-criteria
---

# BPMN Editor CR-001 — Requirements (SRS delta): Pools & lanes

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-EDITOR-CR-001` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-BPMN-EDITOR-CR-001` (change record), `DESIGN-BPMN-EDITOR-CR-001` (how), `TEST-BPMN-EDITOR-CR-001` (V&V), `FEAT-BPMN-EDITOR-001` (the requirements + stakeholder needs this amends) |

> **Delta SRS.** States the requirements *for the CR-001 change only*. Each `FR-CR1` maps to the
> baselined `FEAT-BPMN-EDITOR-001` clause it extends/supersedes (§5). It does **not** re-state the
> whole feature.

---

## 1. Stakeholder needs

CR-001 serves the existing `bpmn-editor` stakeholder needs (`FEAT-BPMN-EDITOR-001` §2), extended to
collaboration:

- `SN-BE-01` (place elements from a palette) — extended to **pools/participants and lanes**.
- `SN-BE-02` (edit in place) — extended to **lane membership** and **cross-pool message flows**.

## 2. Functional requirements (`FR-CR1`)

| ID | Requirement | Source need | Extends / supersedes |
|----|-------------|-------------|----------------------|
| `FR-CR1-01` | The palette/context-pad SHALL create a **pool / participant** as a `participant` container (`BPMN-MAP-001`) with a vertical label band; existing elements MAY be enclosed. | `SN-BE-01` | extends `FR-BE-01` (palette), `FEAT §6` (removes pools/lanes from out-of-scope) |
| `FR-CR1-02` | A pool SHALL be splittable into **lanes** that can be added, **resized, and reordered**, staying `BPMN-MAP-001`-conformant. | `SN-BE-01` | new (laning) |
| `FR-CR1-03` | Dragging an element into a lane SHALL set its **lane membership**; export SHALL nest it under the lane's flow-node refs. | `SN-BE-02` | new (laning) |
| `FR-CR1-04` | A flow drawn between elements in **different** pools SHALL be created as a **`messageFlow`** (not a sequence flow). | `SN-BE-02` | extends `FR-BE-04` (flows) |

## 3. Non-functional requirements (`NFR-CR1`)

| ID | Requirement | Inherits |
|----|-------------|----------|
| `NFR-CR1-01` | **Renderer-safe.** Pools/lanes/message-flows are drawn by the existing `bpmn-*` renderers per `BPMN-MAP-001`; no renderer change, so Python/JS goldens + the BPMN corpus baseline stay byte-stable. | `NFR-BE-04` |
| `NFR-CR1-02` | **Round-trip.** A laned diagram exports via `toBpmn` (pools→`participant`, lanes→`lane`, cross-pool→`messageFlow`) and re-imports (`parseBpmn`) to an equivalent diagram. | `NFR-BE-03` |

## 4. Scope

**In scope:** pool/participant creation, lane add/resize/reorder, lane membership by drag, and
cross-pool message-flow creation — over the existing engine/studio + `toBpmn`/`parseBpmn`.
**Out of scope:** collapsed participants (black-box pools) and choreography/conversation diagrams;
multi-diagram collaboration files beyond a single `collaboration`. Other deferred items remain in
their own CRs (color `CR-002`, lint `CR-003`, copy/paste `CR-004`, auto-layout `CR-005`).

## 5. Acceptance criteria

1. A pool is placed and can enclose elements; lanes add/resize/reorder; an element dragged into a lane
   records membership (`FR-CR1-01..03`).
2. A flow between two pools is a `messageFlow`; within a pool it stays a sequence flow (`FR-CR1-04`).
3. Export → re-import preserves pools/lanes/membership/message-flows (`NFR-CR1-02`); goldens + corpus
   baseline unchanged (`NFR-CR1-01`).

**Supersession / traceability** (CR-local → parent baseline; covering tests in `TEST-BPMN-EDITOR-CR-001 §5`):

| `FR-CR1` | Extends / supersedes (parent `FEAT-BPMN-EDITOR-001`) | Covered by |
|----------|------------------------------------------------------|------------|
| `FR-CR1-01` | `FR-BE-01`; `§6` out-of-scope (pools/lanes) | `TC-CR1-01` |
| `FR-CR1-02` | new | `TC-CR1-02` |
| `FR-CR1-03` | new | `TC-CR1-03` |
| `FR-CR1-04` | `FR-BE-04` (flow types) | `TC-CR1-04` |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. Delta SRS for CR-001: `FR-CR1-01..04` (pool create / lanes / membership / cross-pool message flow), `NFR-CR1-01/-02` (renderer-safe / round-trip); scope, acceptance, supersession map to parent `FR-BE-01`/`FR-BE-04` + `§6`. |

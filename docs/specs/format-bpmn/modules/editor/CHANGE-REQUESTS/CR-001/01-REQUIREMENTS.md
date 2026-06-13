---
title: "BPMN Editor CR-001 — Pools / participants & lanes: Requirements"
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
  - DESIGN-BPMN-EDITOR-CR-001
  - TEST-BPMN-EDITOR-CR-001
  - PLAN-BPMN-EDITOR-CR-001
  - FEAT-BPMN-EDITOR-001
  - DESIGN-BPMN-EDITOR-001
  - TEST-BPMN-EDITOR-001
  - PLAN-BPMN-EDITOR-001
  - BPMN-MAP-001
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
  - pools
  - lanes
  - collaboration
  - message-flow
  - acceptance-criteria
---

# BPMN Editor CR-001 — Pools / participants & lanes: Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-EDITOR-CR-001` |
| Version           | 0.1 |
| Status            | **Proposed** — not yet raised (v1 baseline `*-BPMN-EDITOR-001` pending) |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Severity          | **Medium** — deliberate scope extension (the largest deferred item) |
| Type              | **Enhancement** (deferred from v1; not corrective) |
| Related Documents | `DESIGN-BPMN-EDITOR-CR-001` (design), `TEST-BPMN-EDITOR-CR-001` (V&V), `PLAN-BPMN-EDITOR-CR-001` (close-out plan); parent baseline `PROD-/FEAT-/DESIGN-/TEST-/PLAN-BPMN-EDITOR-001` |

---

## Part A — Introduction

> **What this folder is.** `CR-001/` is a **self-contained mini engineering-spec** for one change to
> the `bpmn-editor` spec (`BPMN-EDITOR-001`). It uses its own mini-spec layout — `01-REQUIREMENTS` →
> `02-DESIGN` → `03-TEST` → `04-PLAN` — scoped to this change. This Part A doubles as the
> **change record** (status + decision log). Per the parent change-control rule
> (`FEAT-BPMN-EDITOR-001` Annex B), any change to baselined clauses is raised here and re-baselined on
> close.

### A.1 Purpose & motivation

The v1 BPMN editor models a single process. A great deal of real-world BPMN is **collaboration** —
multiple **participants** (pools), each subdivided into **lanes** (roles/systems), with **message
flows** crossing pool boundaries. `demo.bpmn.io` exposes "Create pool/participant" in its palette.
`FEAT-BPMN-EDITOR-001` §1.5 and §7 **deferred** the laning model from v1
(consistent with `FEAT-BPMN-DSL-001`'s own pools/lanes deferral). This CR adds it.

`BPMN-MAP-001` already defines the rendering — `participant` (pool) → rectangle + vertical label band;
`lane` → sub-rectangle + label band; `messageFlow` → dashed line with hollow-circle/open-arrow — so
the renderer needs **no change**; this CR adds the **interaction** to create and manage them.

**Intended outcome.** Authors can place a pool, split it into lanes, drag elements into lanes, and draw
message flows across pools — all by direct manipulation, round-trip-safe via `toBpmn`/`parseBpmn`.

### A.2 Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-REQUIREMENTS.md` | `FEAT-BPMN-EDITOR-CR-001` | This doc — motivation, change record (Part A) + requirements (Part B). |
| `02-DESIGN.md` | `DESIGN-BPMN-EDITOR-CR-001` | How — pool/lane creation, lane membership, cross-pool message-flow selection; golden-safety; risks. |
| `03-TEST.md` | `TEST-BPMN-EDITOR-CR-001` | V&V — `TC-CR1-01..04`, regression gates, traceability matrix. |
| `04-PLAN.md` | `PLAN-BPMN-EDITOR-CR-001` | Close-out plan — phases, risk register, files, verification gate, worklog. |

### A.3 Relationship to the bpmn-editor baseline

CR-001 is a change-request against the (to-be-)baselined `bpmn-editor` spec (`BPMN-EDITOR-001`). It
**supersedes** these clauses (named here; the parent docs are edited only at close-out, under
`PLAN-BPMN-EDITOR-CR-001`):

| Clause | Doc | Change |
|--------|-----|--------|
| §1.5 Non-goals / §7 Out-of-scope | `FEAT-BPMN-EDITOR-001` | Move pools/lanes from out-of-scope to in-scope; add the laning requirements; drop pools/lanes from non-goals; extend `SN-BE-01/02` to participants/lanes |
| §4/§6 | `DESIGN-BPMN-EDITOR-001` | Add pool/lane creation, lane membership, cross-pool message-flow selection |
| Annex B Q2 | `PLAN-BPMN-EDITOR-001` | Resolve "message flows before pools" — message flows become meaningful here |

This mini-spec's own item IDs are **CR-local** (`FR-CR1-`/`NFR-CR1-`/`TC-CR1-`/`RK-CR1-`) and map to the
parent `FR-BE`/`NFR-BE` clauses they extend (see Part B §5).

### A.4 Reading guide

- **Approver:** read §A.1 + §A.3 here, then Part B §2/§5.
- **Implementer (on approval):** `DESIGN-BPMN-EDITOR-CR-001` → `PLAN-BPMN-EDITOR-CR-001`, verify
  against `TEST-BPMN-EDITOR-CR-001`.
- **Reviewer:** `TEST-BPMN-EDITOR-CR-001 §5` traceability + the §A.5 change record below.

### A.5 Status & change record

**Status: Proposed** · Severity **Medium** · Type **Enhancement**. Pre-logged as the largest
deferred-from-v1 item; not yet raised (the v1 baseline is still Draft). On approval, the laning model
is built per `DESIGN-BPMN-EDITOR-CR-001` and the parent clauses in §A.3 are re-baselined.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Proposed.** Mini-spec authored (`01`–`05`). Awaiting v1 baseline + assessment/approval. |

---

## Part B — Requirements

> **Delta SRS.** States the requirements *for the CR-001 change only*. Each `FR-CR1` maps to the
> baselined `FEAT-BPMN-EDITOR-001` clause it extends/supersedes (§B.5). It does **not** re-state the
> whole feature.

### B.1 Stakeholder needs

CR-001 serves the existing `bpmn-editor` stakeholder needs (`FEAT-BPMN-EDITOR-001` §2), extended to
collaboration:

- `SN-BE-01` (place elements from a palette) — extended to **pools/participants and lanes**.
- `SN-BE-02` (edit in place) — extended to **lane membership** and **cross-pool message flows**.

### B.2 Functional requirements (`FR-CR1`)

| ID | Requirement | Source need | Extends / supersedes |
|----|-------------|-------------|----------------------|
| `FR-CR1-01` | The palette/context-pad SHALL create a **pool / participant** as a `participant` container (`BPMN-MAP-001`) with a vertical label band; existing elements MAY be enclosed. | `SN-BE-01` | extends `FR-BE-01` (palette), `FEAT §6` (removes pools/lanes from out-of-scope) |
| `FR-CR1-02` | A pool SHALL be splittable into **lanes** that can be added, **resized, and reordered**, staying `BPMN-MAP-001`-conformant. | `SN-BE-01` | new (laning) |
| `FR-CR1-03` | Dragging an element into a lane SHALL set its **lane membership**; export SHALL nest it under the lane's flow-node refs. | `SN-BE-02` | new (laning) |
| `FR-CR1-04` | A flow drawn between elements in **different** pools SHALL be created as a **`messageFlow`** (not a sequence flow). | `SN-BE-02` | extends `FR-BE-04` (flows) |

### B.3 Non-functional requirements (`NFR-CR1`)

| ID | Requirement | Inherits |
|----|-------------|----------|
| `NFR-CR1-01` | **Renderer-safe.** Pools/lanes/message-flows are drawn by the existing `bpmn-*` renderers per `BPMN-MAP-001`; no renderer change, so Python/JS goldens + the BPMN corpus baseline stay byte-stable. | `NFR-BE-04` |
| `NFR-CR1-02` | **Round-trip.** A laned diagram exports via `toBpmn` (pools→`participant`, lanes→`lane`, cross-pool→`messageFlow`) and re-imports (`parseBpmn`) to an equivalent diagram. | `NFR-BE-03` |

### B.4 Scope

**In scope:** pool/participant creation, lane add/resize/reorder, lane membership by drag, and
cross-pool message-flow creation — over the existing engine/studio + `toBpmn`/`parseBpmn`.
**Out of scope:** collapsed participants (black-box pools) and choreography/conversation diagrams;
multi-diagram collaboration files beyond a single `collaboration`. Other deferred items remain in
their own CRs (color `CR-002`, lint `CR-003`, copy/paste `CR-004`, auto-layout `CR-005`).

### B.5 Acceptance criteria

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
| 0.1     | 2026-06-06 | Vũ Anh | Consolidated `01-INTRO.md` (FEAT-BPMN-EDITOR-CR-001) into Part A and `02-REQUIREMENT.md` (FEAT-BPMN-EDITOR-CR-001) into Part B; deleted source files; renamed `03-DESIGN`→`02-DESIGN`, `04-TEST`→`03-TEST`, `05-PLAN`→`04-PLAN`. |

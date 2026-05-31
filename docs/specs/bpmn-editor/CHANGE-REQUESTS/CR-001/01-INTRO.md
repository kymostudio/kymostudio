---
title: "BPMN Editor CR-001 — Pools / participants & lanes: Overview & Change Record"
document_id: INTRO-BPMN-EDITOR-CR-001
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: bpmn-editor maintainers / reviewers; the approver of the baseline; the engineer closing CR-001
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-BPMN-EDITOR-CR-001
  - DESIGN-BPMN-EDITOR-CR-001
  - TEST-BPMN-EDITOR-CR-001
  - PLAN-BPMN-EDITOR-CR-001
  - PROD-BPMN-EDITOR-001
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
  - bpmn-editor
  - pools
  - lanes
  - collaboration
---

# BPMN Editor CR-001 — Pools / participants & lanes: Overview & Change Record

| Field             | Value |
|-------------------|-------|
| Document ID       | `INTRO-BPMN-EDITOR-CR-001` |
| Version           | 0.1 |
| Status            | **Proposed** — not yet raised (v1 baseline `*-BPMN-EDITOR-001` pending) |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Severity          | **Medium** — deliberate scope extension (the largest deferred item) |
| Type              | **Enhancement** (deferred from v1; not corrective) |
| Related Documents | `FEAT-BPMN-EDITOR-CR-001` (requirements), `DESIGN-BPMN-EDITOR-CR-001` (design), `TEST-BPMN-EDITOR-CR-001` (V&V), `PLAN-BPMN-EDITOR-CR-001` (close-out plan); parent baseline `PROD-/FEAT-/DESIGN-/TEST-/PLAN-BPMN-EDITOR-001` |

> **What this folder is.** `CR-001/` is a **self-contained mini engineering-spec** for one change to
> the `bpmn-editor` spec (`BPMN-EDITOR-001`). It mirrors the parent folder's layout — `01-INTRO` →
> `02-REQUIREMENT` → `03-DESIGN` → `04-TEST` → `05-PLAN` — scoped to this change. This `01-INTRO`
> doubles as the **change record** (status + decision log). Per the parent change-control rule
> (`INTRO-BPMN-EDITOR-001 §5`), any change to baselined clauses is raised here and re-baselined on
> close.

---

## 1. Purpose & motivation

The v1 BPMN editor models a single process. A great deal of real-world BPMN is **collaboration** —
multiple **participants** (pools), each subdivided into **lanes** (roles/systems), with **message
flows** crossing pool boundaries. `demo.bpmn.io` exposes "Create pool/participant" in its palette.
`PROD-BPMN-EDITOR-001` §3 and `FEAT-BPMN-EDITOR-001` §6 **deferred** the laning model from v1
(consistent with `FEAT-BPMN-DSL-001`'s own pools/lanes deferral). This CR adds it.

`BPMN-MAP-001` already defines the rendering — `participant` (pool) → rectangle + vertical label band;
`lane` → sub-rectangle + label band; `messageFlow` → dashed line with hollow-circle/open-arrow — so
the renderer needs **no change**; this CR adds the **interaction** to create and manage them.

**Intended outcome.** Authors can place a pool, split it into lanes, drag elements into lanes, and draw
message flows across pools — all by direct manipulation, round-trip-safe via `toBpmn`/`parseBpmn`.

## 2. Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-INTRO.md` | `INTRO-BPMN-EDITOR-CR-001` | This doc — motivation, map, supersession summary, **change record**. |
| `02-REQUIREMENT.md` | `FEAT-BPMN-EDITOR-CR-001` | The change as requirements (`FR-CR1-01..04`, `NFR-CR1-*`), scope, acceptance, supersession table. |
| `03-DESIGN.md` | `DESIGN-BPMN-EDITOR-CR-001` | How — pool/lane creation, lane membership, cross-pool message-flow selection; golden-safety; risks. |
| `04-TEST.md` | `TEST-BPMN-EDITOR-CR-001` | V&V — `TC-CR1-01..04`, regression gates, traceability matrix. |
| `05-PLAN.md` | `PLAN-BPMN-EDITOR-CR-001` | Close-out plan — phases, risk register, files, verification gate, worklog. |

## 3. Relationship to the bpmn-editor baseline

CR-001 is a change-request against the (to-be-)baselined `bpmn-editor` spec (`BPMN-EDITOR-001`). It
**supersedes** these clauses (named here; the parent docs are edited only at close-out, under
`PLAN-BPMN-EDITOR-CR-001`):

| Clause | Doc | Change |
|--------|-----|--------|
| §3 Goals / §6 Out-of-scope | `FEAT-BPMN-EDITOR-001` | Move pools/lanes from out-of-scope to in-scope; add the laning requirements |
| §3 Non-goals | `PROD-BPMN-EDITOR-001` | Drop pools/lanes from non-goals; extend `SN-BE-01/02` to participants/lanes |
| §4/§6 | `DESIGN-BPMN-EDITOR-001` | Add pool/lane creation, lane membership, cross-pool message-flow selection |
| Annex B Q2 | `PLAN-BPMN-EDITOR-001` | Resolve "message flows before pools" — message flows become meaningful here |

This mini-spec's own item IDs are **CR-local** (`FR-CR1-`/`NFR-CR1-`/`TC-CR1-`/`RK-CR1-`) and map to the
parent `FR-BE`/`NFR-BE` clauses they extend (see `FEAT-BPMN-EDITOR-CR-001 §5`).

## 4. Reading guide

- **Approver:** read §1 + §3 here, then `FEAT-BPMN-EDITOR-CR-001 §2/§5`.
- **Implementer (on approval):** `DESIGN-BPMN-EDITOR-CR-001` → `PLAN-BPMN-EDITOR-CR-001`, verify
  against `TEST-BPMN-EDITOR-CR-001`.
- **Reviewer:** `TEST-BPMN-EDITOR-CR-001 §5` traceability + the §5 change record below.

## 5. Status & change record

**Status: Proposed** · Severity **Medium** · Type **Enhancement**. Pre-logged as the largest
deferred-from-v1 item; not yet raised (the v1 baseline is still Draft). On approval, the laning model
is built per `DESIGN-BPMN-EDITOR-CR-001` and the parent clauses in §3 are re-baselined.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Proposed.** Mini-spec authored (`01`–`05`). Awaiting v1 baseline + assessment/approval. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. Authored CR-001 as a self-contained mini-spec (`01-INTRO`/`02-REQUIREMENT`/`03-DESIGN`/`04-TEST`/`05-PLAN`, `BPMN-EDITOR-CR-001` series); the laning model (pools/participants + lanes + cross-pool message flows). Names the superseded parent clauses. |

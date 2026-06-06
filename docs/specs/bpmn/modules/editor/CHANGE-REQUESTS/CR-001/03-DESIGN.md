---
title: "BPMN Editor CR-001 — Design (delta): Pools & lanes"
document_id: DESIGN-BPMN-EDITOR-CR-001
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the laning model (`website/app/`)
review_cycle: Until CR-001 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-CR-001
  - FEAT-BPMN-EDITOR-CR-001
  - TEST-BPMN-EDITOR-CR-001
  - PLAN-BPMN-EDITOR-CR-001
  - DESIGN-BPMN-EDITOR-001
  - BPMN-MAP-001
  - FEAT-BPMN-EXPORT-001
authors:
  - Vũ Anh
language: en
keywords:
  - design
  - change-request
  - bpmn-editor
  - pools
  - lanes
  - containment
  - message-flow
---

# BPMN Editor CR-001 — Design (delta): Pools & lanes

| Field             | Value |
|-------------------|-------|
| Document ID       | `DESIGN-BPMN-EDITOR-CR-001` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-BPMN-EDITOR-CR-001` (requirements), `TEST-BPMN-EDITOR-CR-001` (V&V), `DESIGN-BPMN-EDITOR-001` (the baselined design this extends), `BPMN-MAP-001` |

> **Delta design.** How CR-001 is built, as an extension of `DESIGN-BPMN-EDITOR-001`. Same invariant:
> compose over the engine + `bpmn-*` renderers; no renderer change.

---

## 1. Context

`BPMN-MAP-001` already renders `participant`/`lane`/`messageFlow`. The work is the **interaction**:
create a pool, manage lanes, assign membership, and pick the right flow type across pool boundaries —
all via the `Editor` facade (`createShape`/`updateShape`), extending `DESIGN-BPMN-EDITOR-001` §4–§6.

## 2. Pool & lane creation (FR-CR1-01/02)

- Add pool/lane creators to the BPMN palette group (`ui/tools.ts`) and to the context pad
  (`ui/ContextPad.tsx`, "add lane").
- `engine/bpmn-tools.ts` places a pool as a `participant` `Region` (default container geometry from
  `BPMN-MAP-001`); "add lane" subdivides it into `lane` sub-regions; lanes resize/reorder by drag
  (engine drag + bounds recompute), with the pool's total bounds kept consistent.

## 3. Lane membership (FR-CR1-03)

`engine/bpmn-ops.ts` records membership when an element is dragged into a lane (point-in-bounds test
against lane regions). Membership is model state used by export — it does **not** change the element's
glyph. Moving a pool/lane moves its members.

## 4. Cross-pool message flows (FR-CR1-04)

Extend the connect-mode flow-type selection (`DESIGN-BPMN-EDITOR-001 §6`): if the two endpoints belong
to **different** participants, create a `messageFlow`; otherwise a sequence flow. The choice is keyed
to `BPMN-MAP-001`'s flow classification.

## 5. Export / round-trip (NFR-CR1-02)

`toBpmn` (`FEAT-BPMN-EXPORT-001`) already emits `<bpmn:collaboration>` with participants when pools are
present, plus lanes and message flows. The editor produces the model `toBpmn` expects (pools as
`participant`, lane membership as flow-node refs); no exporter change is anticipated, but the close-out
plan verifies the round-trip and files an exporter sub-task if a gap is found.

## 6. Golden-safety & what is NOT touched

- The `bpmn-*` renderers and `BPMN-MAP-001` are consumed, never modified → Python/JS goldens + the
  BPMN corpus baseline stay byte-stable (`NFR-CR1-01`).
- The engine internals are untouched (only `Editor`/`Store`/`ShapeUtil` used).

## 7. Risks (detail in `PLAN-BPMN-EDITOR-CR-001 §4`)

- Lane resize/reorder geometry is the trickiest part (keeping pool bounds + member positions
  consistent) — `RK-CR1-01`.
- Round-trip of lane membership / message flows must be proven against `toBpmn`/`parseBpmn` —
  `RK-CR1-02`.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. Delta design: pool/lane creators (`ui/tools.ts`/`ContextPad.tsx`), lane geometry + membership (`bpmn-tools.ts`/`bpmn-ops.ts`), cross-pool message-flow selection; export via `toBpmn` collaboration; renderer untouched. |

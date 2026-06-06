---
title: "BPMN Animation CR-003 — Requirements scaffold (activation & gateway semantics)"
document_id: FEAT-BPMN-ANIMATE-003
version: "0.2"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers who will implement activation & gateway semantics; reviewers
review_cycle: Until promoted to Open or rejected
supersedes: null
related_documents:
  - INTRO-BPMN-ANIMATE-003
  - FEAT-BPMN-ANIMATE-001
  - FEAT-BPMN-ANIMATE-002
  - KYMOANIM-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - scaffold
  - change-request
  - activation
  - gateway-branching
  - kymo.anim
  - bpmn-animate
---

# BPMN Animation CR-003 — Requirements scaffold (activation & gateway semantics)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-ANIMATE-003` |
| Version           | 0.2 |
| Status            | **Proposed** (scaffold) |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-BPMN-ANIMATE-003` (change record), `FEAT-BPMN-ANIMATE-001` (parent SRS), `FEAT-BPMN-ANIMATE-002` (the descriptor + SVG this extends), `KYMOANIM-MAP-001` (format), `FEAT-BPMN-ANIMATE-001` (needs) |

> **Scaffold delta SRS.** Provisional requirements to fix scope and IDs. Refined (with acceptance
> criteria + full traceability) when CR-003 is **promoted to Open**.

## 1. Stakeholder needs

Serves `SN-BPMN-ANIMATE-01` (animate the way the process runs — here, activation + branching) over
the explicit descriptor (`SN-BPMN-ANIMATE-02`).

## 2. Functional requirements (`FR-CR3`, provisional)

| ID | Requirement | Realises |
|----|-------------|----------|
| **`FR-CR3-01`** | A `node` timeline step with `activate:true` SHALL render an **activation** cue — a task glow/pulse while active — keyed to the step's position in the descriptor timeline. | `FR-1`, `FR-5` (SVG) |
| **`FR-CR3-02`** | **Start/end events** SHALL be emphasised on token entry/exit (per their timeline steps). | `FR-1`, `FR-5` (SVG) |
| **`FR-CR3-03`** | A `gateway` step's **`branch`** SHALL advance the token along **one** outgoing flow (exclusive); a parallel gateway SHALL advance **all** outgoing flows. The choice is the descriptor's explicit, illustrative value — **not** evaluated from `<conditionExpression>` or data. | `FR-1`, `FR-5` (SVG) |
| **`FR-CR3-04`** | All cues SHALL remain **no-JavaScript** (CSS only) and **golden-safe** (rendered only when a descriptor is supplied), inheriting the CR-002 discipline. | `FR-5` (SVG); `NFR-1`, `NFR-2` |

## 3. Scope

**In scope:** rendering the descriptor's `activate` (task/event) and `branch` (exclusive/parallel)
timeline fields; no-JS CSS; golden-safety. **Out of scope:** condition/data evaluation (illustrative
only); the interactive viewer (`CR-BPMN-ANIMATE-004`) and WebP (`CR-BPMN-ANIMATE-005`); any change to
the `kymo.anim` format (the fields already exist in `KYMOANIM-MAP-001`).

## 4. Traceability (provisional)

| `FR-CR3` | Realises (parent `FEAT-BPMN-ANIMATE-001`) |
|----------|-------------------------------------------|
| `FR-CR3-01..03` | `FR-1` (semantics) + `FR-5` (SVG) |
| `FR-CR3-04` | `FR-5` (SVG), `NFR-1`, `NFR-2` |

*(Test cases `TC-CR3-*` and acceptance criteria authored on promotion to Open.)*

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Provisional scaffold SRS: task/event activation; exclusive/parallel illustrative branching; no-JS/golden-safe. |
| 0.2     | 2026-05-31 | Vũ Anh | **Re-framed** around the descriptor: `FR-CR3-01..04` now render the `kymo.anim` `activate`/`branch` timeline fields (defined in CR-002); realises parent `FR-1` + `FR-5` SVG. |

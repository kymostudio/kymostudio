---
title: "BPMN Animation CR-003 — Activation & gateway semantics: Requirements"
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
  - FEAT-BPMN-ANIMATE-001
  - FEAT-BPMN-ANIMATE-002
  - DESIGN-BPMN-ANIMATE-001
  - KYMOANIM-MAP-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - introduction
  - change-record
  - requirements
  - scaffold
  - activation
  - gateway-branching
  - kymo.anim
  - bpmn-animate
---

# BPMN Animation CR-003 — Activation & gateway semantics: Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-ANIMATE-003` |
| Version           | 0.2 |
| Status            | **Proposed** — registered & scaffolded; awaiting promotion to Open |
| Owner             | `diagrams/` project |
| Type              | **Enhancement** (increment of the bpmn-animate feature) |
| Related Documents | `FEAT-BPMN-ANIMATE-003` (requirement scaffold); the format `KYMOANIM-MAP-001`; parent baseline `FEAT-/DESIGN-BPMN-ANIMATE-001`; depends on `FEAT-BPMN-ANIMATE-002` (descriptor + SVG) |

---

## Part A — Introduction

> **Scaffold CR.** Registered now (`01-REQUIREMENTS` only) to fix scope and IDs; its
> `02-DESIGN`/`03-TEST`/`04-PLAN` are authored when the CR is **promoted to Open** and picked up.

### A.1 Purpose & motivation

`CR-BPMN-ANIMATE-002` defines the `kymo.anim` descriptor and renders a token traversing `flow`
steps, but treats `node`/`gateway` steps minimally. CR-003 adds the **visual semantics** for the
descriptor's `activate` and `branch` fields — what makes the animation read as *the process running*:

- **Activation cues** — a `node` step with `activate:true` makes a task **glow/pulse while active**;
  start/end events are **emphasised** on entry/exit.
- **Gateway branching (illustrative)** — a `gateway` step's `branch` advances the token along **one**
  outgoing flow (exclusive) or, for parallel gateways, the descriptor advances **all** outgoing
  flows. Branch is the descriptor's explicit choice — **not** evaluated from `<conditionExpression>`
  or data.

Both are already **fields in the `kymo.anim` format** (`KYMOANIM-MAP-001`, defined in CR-002); CR-003
gives them their rendering.

**Intended outcome.** On top of CR-002's descriptor-driven token-flow, `activate`/`branch` steps
visibly activate tasks/events and branch gateways — still a no-JS animated SVG, still golden-safe.
Realises parent **`FR-1`** (the `activate`/`branch` semantics) and **`FR-5`** SVG.

### A.2 Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-REQUIREMENTS.md` | `FEAT-BPMN-ANIMATE-003` | This doc — motivation, change record (Part A) + requirement scaffold (Part B). |
| `02-DESIGN.md` | `DESIGN-BPMN-ANIMATE-003` | *(authored on promotion to Open)* |
| `03-TEST.md` | `TEST-BPMN-ANIMATE-003` | *(authored on promotion to Open)* |
| `04-PLAN.md` | `PLAN-BPMN-ANIMATE-003` | *(authored on promotion to Open)* |

### A.3 Relationship to the baseline & dependencies

CR-003 **realises** the `activate`/`branch` rendering of parent `FR-1` + `FR-5` SVG. It **depends on**
`CR-BPMN-ANIMATE-002` (the descriptor, validator, and SVG compiler it extends), so it follows CR-002
in the delivery sequence (`PLAN-BPMN-ANIMATE-001 §3`).

### A.4 Status & change record

**Status: Proposed.** Scaffolded only; no design/test/plan or code yet.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Registered.** (v0.1) activation cues + illustrative gateway branching. |
| 2026-05-31 | Vũ Anh | **Re-framed** (v0.2) as the rendering of the descriptor's `activate`/`branch` timeline fields (defined in CR-002 / `KYMOANIM-MAP-001`). Still Proposed. |

---

## Part B — Requirements

> **Scaffold delta SRS.** Provisional requirements to fix scope and IDs. Refined (with acceptance
> criteria + full traceability) when CR-003 is **promoted to Open**.

### B.1 Stakeholder needs

Serves `SN-BPMN-ANIMATE-01` (animate the way the process runs — here, activation + branching) over
the explicit descriptor (`SN-BPMN-ANIMATE-02`).

### B.2 Functional requirements (`FR-CR3`, provisional)

| ID | Requirement | Realises |
|----|-------------|----------|
| **`FR-CR3-01`** | A `node` timeline step with `activate:true` SHALL render an **activation** cue — a task glow/pulse while active — keyed to the step's position in the descriptor timeline. | `FR-1`, `FR-5` (SVG) |
| **`FR-CR3-02`** | **Start/end events** SHALL be emphasised on token entry/exit (per their timeline steps). | `FR-1`, `FR-5` (SVG) |
| **`FR-CR3-03`** | A `gateway` step's **`branch`** SHALL advance the token along **one** outgoing flow (exclusive); a parallel gateway SHALL advance **all** outgoing flows. The choice is the descriptor's explicit, illustrative value — **not** evaluated from `<conditionExpression>` or data. | `FR-1`, `FR-5` (SVG) |
| **`FR-CR3-04`** | All cues SHALL remain **no-JavaScript** (CSS only) and **golden-safe** (rendered only when a descriptor is supplied), inheriting the CR-002 discipline. | `FR-5` (SVG); `NFR-1`, `NFR-2` |

### B.3 Scope

**In scope:** rendering the descriptor's `activate` (task/event) and `branch` (exclusive/parallel)
timeline fields; no-JS CSS; golden-safety. **Out of scope:** condition/data evaluation (illustrative
only); the interactive viewer (`CR-BPMN-ANIMATE-004`) and WebP (`CR-BPMN-ANIMATE-005`); any change to
the `kymo.anim` format (the fields already exist in `KYMOANIM-MAP-001`).

### B.4 Traceability (provisional)

| `FR-CR3` | Realises (parent `FEAT-BPMN-ANIMATE-001`) |
|----------|-------------------------------------------|
| `FR-CR3-01..03` | `FR-1` (semantics) + `FR-5` (SVG) |
| `FR-CR3-04` | `FR-5` (SVG), `NFR-1`, `NFR-2` |

*(Test cases `TC-CR3-*` and acceptance criteria authored on promotion to Open.)*

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Registered scaffold: activation & gateway semantics; depends on the token schedule. |
| 0.2     | 2026-05-31 | Vũ Anh | **Re-framed** around the explicit descriptor: renders the `kymo.anim` `activate`/`branch` fields; depends on `CR-BPMN-ANIMATE-002`; realises parent `FR-1` + `FR-5` SVG. |
| 0.2     | 2026-06-06 | Vũ Anh | Consolidated `01-INTRO.md` (FEAT-BPMN-ANIMATE-003) into Part A and `02-REQUIREMENT.md` (FEAT-BPMN-ANIMATE-003) into Part B; deleted source files. |

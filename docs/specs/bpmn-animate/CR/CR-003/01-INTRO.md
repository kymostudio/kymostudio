---
title: "BPMN Animation CR-003 — Activation & gateway semantics: Overview & Change Record"
document_id: INTRO-BPMN-ANIMATE-003
version: "0.2"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: bpmn-animate maintainers / reviewers; the approver who promotes this CR to Open
review_cycle: Until promoted to Open (then build) or rejected
supersedes: null
related_documents:
  - FEAT-BPMN-ANIMATE-003
  - INTRO-BPMN-ANIMATE-001
  - FEAT-BPMN-ANIMATE-001
  - DESIGN-BPMN-ANIMATE-001
  - INTRO-BPMN-ANIMATE-002
  - KYMOANIM-MAP-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - introduction
  - change-record
  - activation
  - gateway-branching
  - kymo.anim
  - bpmn-animate
---

# BPMN Animation CR-003 — Activation & gateway semantics: Overview & Change Record

| Field             | Value |
|-------------------|-------|
| Document ID       | `INTRO-BPMN-ANIMATE-003` |
| Version           | 0.2 |
| Status            | **Proposed** — registered & scaffolded; awaiting promotion to Open |
| Owner             | `diagrams/` project |
| Type              | **Enhancement** (increment of the bpmn-animate feature) |
| Related Documents | `FEAT-BPMN-ANIMATE-003` (requirement scaffold); the format `KYMOANIM-MAP-001`; parent baseline `FEAT-/DESIGN-BPMN-ANIMATE-001`; depends on `INTRO-BPMN-ANIMATE-002` (descriptor + SVG) |

> **Scaffold CR.** Registered now (`01-INTRO` + `02-REQUIREMENT`) to fix scope and IDs; its
> `03-DESIGN`/`04-TEST`/`05-PLAN` are authored when the CR is **promoted to Open** and picked up.

## 1. Purpose & motivation

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

## 2. Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-INTRO.md` | `INTRO-BPMN-ANIMATE-003` | This doc — motivation, map, change record. |
| `02-REQUIREMENT.md` | `FEAT-BPMN-ANIMATE-003` | Requirement scaffold (`FR-CR3-*`), scope, traceability. |
| `03-DESIGN.md` | `DESIGN-BPMN-ANIMATE-003` | *(authored on promotion to Open)* |
| `04-TEST.md` | `TEST-BPMN-ANIMATE-003` | *(authored on promotion to Open)* |
| `05-PLAN.md` | `PLAN-BPMN-ANIMATE-003` | *(authored on promotion to Open)* |

## 3. Relationship to the baseline & dependencies

CR-003 **realises** the `activate`/`branch` rendering of parent `FR-1` + `FR-5` SVG. It **depends on**
`CR-BPMN-ANIMATE-002` (the descriptor, validator, and SVG compiler it extends), so it follows CR-002
in the delivery sequence (`PLAN-BPMN-ANIMATE-001 §3`).

## 4. Status & change record

**Status: Proposed.** Scaffolded only; no design/test/plan or code yet.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Registered.** (v0.1) activation cues + illustrative gateway branching. |
| 2026-05-31 | Vũ Anh | **Re-framed** (v0.2) as the rendering of the descriptor's `activate`/`branch` timeline fields (defined in CR-002 / `KYMOANIM-MAP-001`). Still Proposed. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Registered scaffold: activation & gateway semantics; depends on the token schedule. |
| 0.2     | 2026-05-31 | Vũ Anh | **Re-framed** around the explicit descriptor: renders the `kymo.anim` `activate`/`branch` fields; depends on `CR-BPMN-ANIMATE-002`; realises parent `FR-1` + `FR-5` SVG. |

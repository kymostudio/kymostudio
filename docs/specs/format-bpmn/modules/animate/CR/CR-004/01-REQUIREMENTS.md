---
title: "BPMN Animation CR-004 — Interactive HTML viewer: Requirements"
document_id: FEAT-BPMN-ANIMATE-004
version: "0.2"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers who will implement the interactive viewer; reviewers
review_cycle: Until promoted to Open or rejected
supersedes: null
related_documents:
  - FEAT-BPMN-ANIMATE-001
  - FEAT-BPMN-ANIMATE-002
  - DESIGN-BPMN-ANIMATE-001
  - KYMOANIM-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - introduction
  - change-record
  - requirements
  - scaffold
  - interactive-viewer
  - playback-controls
  - kymo.anim
  - bpmn-animate
---

# BPMN Animation CR-004 — Interactive HTML viewer: Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-ANIMATE-004` |
| Version           | 0.2 |
| Status            | **Proposed** — registered & scaffolded; awaiting promotion to Open |
| Owner             | `diagrams/` project |
| Type              | **Enhancement** (increment of the bpmn-animate feature) |
| Related Documents | `FEAT-BPMN-ANIMATE-004` (requirement scaffold); the format `KYMOANIM-MAP-001`; parent baseline `FEAT-/DESIGN-BPMN-ANIMATE-001`; consumes the descriptor from `FEAT-BPMN-ANIMATE-002` |

---

## Part A — Introduction

> **Scaffold CR.** Registered now (`01-REQUIREMENTS` only) to fix scope and IDs;
> `02-DESIGN`/`03-TEST`/`04-PLAN` are authored when the CR is **promoted to Open** and picked up.

### A.1 Purpose & motivation

The no-JS animated SVG (`CR-BPMN-ANIMATE-002/003`) plays a fixed loop. CR-004 adds an **interactive
standalone HTML viewer** that lets a reader *drive* the run — the angle of the `bpmn-visualize`
reference artifact (a self-contained d3/JS HTML) — by **consuming the same `kymo.anim` descriptor**:

- **Playback controls** — play / pause / **step** through the descriptor `timeline`, honouring its
  `controls` (`autoplay`/`loop`/`speed`) as defaults.
- **Token simulation** — the token advances step-by-step under user control.
- **Path highlighting** — the traversed / selected path is highlighted; selecting a node/flow
  surfaces it.

This is the **browser-interactive layer** and is **JS-driven** — exempt from the no-JavaScript rule
that binds only the SVG path (`FEAT-BPMN-ANIMATE-001 NFR-2`). Hosted in `website/app/`.

**Intended outcome.** An interactive viewer in `website/app/` that loads a self-contained
`kymo.anim` file and lets the user play/pause/step the token run with path highlighting.
Realises the interactive part of parent **`FR-5`**.

### A.2 Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-REQUIREMENTS.md` | `FEAT-BPMN-ANIMATE-004` | This doc — motivation, change record (Part A) + requirement scaffold (Part B). |
| `02-DESIGN.md` | `DESIGN-BPMN-ANIMATE-004` | *(authored on promotion to Open)* |
| `03-TEST.md` | `TEST-BPMN-ANIMATE-004` | *(authored on promotion to Open)* |
| `04-PLAN.md` | `PLAN-BPMN-ANIMATE-004` | *(authored on promotion to Open)* |

### A.3 Relationship to the baseline & dependencies

CR-004 **realises** the interactive part of parent `FR-5`. It **consumes** the `kymo.anim` descriptor
(`controls` + `timeline`) and validator from `CR-BPMN-ANIMATE-002`, so it follows CR-002 and can
proceed in parallel with `CR-BPMN-ANIMATE-005` (`PLAN-BPMN-ANIMATE-001 §3`).

### A.4 Status & change record

**Status: Proposed.** Scaffolded only; no design/test/plan or code yet.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Registered.** (v0.1) interactive viewer: play/pause/step, token simulation, highlighting. |
| 2026-05-31 | Vũ Anh | **Re-framed** (v0.2) to consume the `kymo.anim` descriptor's `controls`/`timeline`. Still Proposed. |

---

## Part B — Requirements

> **Scaffold delta SRS.** Provisional requirements to fix scope and IDs. Refined (with acceptance
> criteria + full traceability) when CR-004 is **promoted to Open**.

### B.1 Stakeholder needs

Serves `SN-BPMN-ANIMATE-04` (the interactive in-browser output form) — driving the run rather than
watching a fixed loop — over the explicit descriptor (`SN-BPMN-ANIMATE-02`).

### B.2 Functional requirements (`FR-CR4`, provisional)

| ID | Requirement | Realises |
|----|-------------|----------|
| **`FR-CR4-01`** | An **interactive viewer** in `website/app/` SHALL load a self-contained `kymo.anim` file and play the token run from its `timeline`. | `FR-5` (interactive) |
| **`FR-CR4-02`** | The viewer SHALL provide **play / pause / step** over the timeline, honouring the descriptor `controls` (`autoplay`/`loop`/`speed`) as defaults. | `FR-5` |
| **`FR-CR4-03`** | The viewer SHALL provide **path highlighting** — the traversed/selected path is highlighted; selecting a node/flow surfaces it. | `FR-5` |
| **`FR-CR4-04`** | The viewer MAY be exportable as a **self-contained standalone HTML** (the `bpmn-visualize` artifact form) bundling the `kymo.anim` file for offline sharing. | `FR-5` |

> **Note.** This form is **JS-driven**; the no-JavaScript rule (`NFR-2`) binds only the SVG path. The
> viewer SHOULD still follow the playground's dependency conventions. The descriptor is **validated**
> (CR-002 validator) before playback.

### B.3 Scope

**In scope:** an interactive token-run viewer (play/pause/step + highlighting) in `website/app/`,
driven by the `kymo.anim` descriptor; optional standalone-HTML export. **Out of scope:** the no-JS
SVG (`CR-BPMN-ANIMATE-002`); WebP (`CR-BPMN-ANIMATE-005`); changes to the `kymo.anim` format; any
execution semantics.

### B.4 Traceability (provisional)

| `FR-CR4` | Realises (parent `FEAT-BPMN-ANIMATE-001`) |
|----------|-------------------------------------------|
| `FR-CR4-01..04` | `FR-5` (interactive form) |

*(Test cases `TC-CR4-*` — incl. `website/app/e2e` smoke tests — and acceptance criteria authored on
promotion to Open.)*

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Registered scaffold: interactive HTML viewer; consumes the token schedule. |
| 0.2     | 2026-05-31 | Vũ Anh | **Re-framed** around the descriptor: viewer loads + plays the `kymo.anim` `timeline`, honours `controls`, validates before playback; realises parent `FR-5` (interactive). |
| 0.2     | 2026-06-06 | Vũ Anh | Consolidated `01-INTRO.md` (FEAT-BPMN-ANIMATE-004) into Part A and `02-REQUIREMENT.md` (FEAT-BPMN-ANIMATE-004) into Part B; deleted source files. |

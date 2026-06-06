---
title: "BPMN Animation CR-004 — Interactive HTML viewer: Overview & Change Record"
document_id: INTRO-BPMN-ANIMATE-004
version: "0.2"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: bpmn-animate maintainers / reviewers; the approver who promotes this CR to Open
review_cycle: Until promoted to Open (then build) or rejected
supersedes: null
related_documents:
  - FEAT-BPMN-ANIMATE-004
  - FEAT-BPMN-ANIMATE-001
  - DESIGN-BPMN-ANIMATE-001
  - INTRO-BPMN-ANIMATE-002
  - KYMOANIM-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - introduction
  - change-record
  - interactive-viewer
  - playback-controls
  - kymo.anim
  - bpmn-animate
---

# BPMN Animation CR-004 — Interactive HTML viewer: Overview & Change Record

| Field             | Value |
|-------------------|-------|
| Document ID       | `INTRO-BPMN-ANIMATE-004` |
| Version           | 0.2 |
| Status            | **Proposed** — registered & scaffolded; awaiting promotion to Open |
| Owner             | `diagrams/` project |
| Type              | **Enhancement** (increment of the bpmn-animate feature) |
| Related Documents | `FEAT-BPMN-ANIMATE-004` (requirement scaffold); the format `KYMOANIM-MAP-001`; parent baseline `FEAT-/DESIGN-BPMN-ANIMATE-001`; consumes the descriptor from `INTRO-BPMN-ANIMATE-002` |

> **Scaffold CR.** Registered now (`01-INTRO` + `02-REQUIREMENT`) to fix scope and IDs;
> `03-DESIGN`/`04-TEST`/`05-PLAN` are authored when the CR is **promoted to Open** and picked up.

## 1. Purpose & motivation

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

## 2. Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-INTRO.md` | `INTRO-BPMN-ANIMATE-004` | This doc — motivation, map, change record. |
| `02-REQUIREMENT.md` | `FEAT-BPMN-ANIMATE-004` | Requirement scaffold (`FR-CR4-*`), scope, traceability. |
| `03-DESIGN.md` | `DESIGN-BPMN-ANIMATE-004` | *(authored on promotion to Open)* |
| `04-TEST.md` | `TEST-BPMN-ANIMATE-004` | *(authored on promotion to Open)* |
| `05-PLAN.md` | `PLAN-BPMN-ANIMATE-004` | *(authored on promotion to Open)* |

## 3. Relationship to the baseline & dependencies

CR-004 **realises** the interactive part of parent `FR-5`. It **consumes** the `kymo.anim` descriptor
(`controls` + `timeline`) and validator from `CR-BPMN-ANIMATE-002`, so it follows CR-002 and can
proceed in parallel with `CR-BPMN-ANIMATE-005` (`PLAN-BPMN-ANIMATE-001 §3`).

## 4. Status & change record

**Status: Proposed.** Scaffolded only; no design/test/plan or code yet.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Registered.** (v0.1) interactive viewer: play/pause/step, token simulation, highlighting. |
| 2026-05-31 | Vũ Anh | **Re-framed** (v0.2) to consume the `kymo.anim` descriptor's `controls`/`timeline`. Still Proposed. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Registered scaffold: interactive HTML viewer; consumes the token schedule. |
| 0.2     | 2026-05-31 | Vũ Anh | **Re-framed** around the explicit descriptor: viewer consumes `kymo.anim` `controls`/`timeline`; depends on `CR-BPMN-ANIMATE-002`; realises the interactive part of parent `FR-5`. |

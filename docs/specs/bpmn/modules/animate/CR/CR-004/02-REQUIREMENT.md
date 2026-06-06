---
title: "BPMN Animation CR-004 — Requirements scaffold (interactive HTML viewer)"
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
  - INTRO-BPMN-ANIMATE-004
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
  - interactive-viewer
  - playback-controls
  - kymo.anim
  - bpmn-animate
---

# BPMN Animation CR-004 — Requirements scaffold (interactive HTML viewer)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-ANIMATE-004` |
| Version           | 0.2 |
| Status            | **Proposed** (scaffold) |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-BPMN-ANIMATE-004` (change record), `FEAT-BPMN-ANIMATE-001` (parent SRS), `FEAT-BPMN-ANIMATE-002` (the descriptor consumed), `KYMOANIM-MAP-001` (format), `FEAT-BPMN-ANIMATE-001` (needs) |

> **Scaffold delta SRS.** Provisional requirements to fix scope and IDs. Refined (with acceptance
> criteria + full traceability) when CR-004 is **promoted to Open**.

## 1. Stakeholder needs

Serves `SN-BPMN-ANIMATE-04` (the interactive in-browser output form) — driving the run rather than
watching a fixed loop — over the explicit descriptor (`SN-BPMN-ANIMATE-02`).

## 2. Functional requirements (`FR-CR4`, provisional)

| ID | Requirement | Realises |
|----|-------------|----------|
| **`FR-CR4-01`** | An **interactive viewer** in `website/app/` SHALL load a self-contained `kymo.anim` file and play the token run from its `timeline`. | `FR-5` (interactive) |
| **`FR-CR4-02`** | The viewer SHALL provide **play / pause / step** over the timeline, honouring the descriptor `controls` (`autoplay`/`loop`/`speed`) as defaults. | `FR-5` |
| **`FR-CR4-03`** | The viewer SHALL provide **path highlighting** — the traversed/selected path is highlighted; selecting a node/flow surfaces it. | `FR-5` |
| **`FR-CR4-04`** | The viewer MAY be exportable as a **self-contained standalone HTML** (the `bpmn-visualize` artifact form) bundling the `kymo.anim` file for offline sharing. | `FR-5` |

> **Note.** This form is **JS-driven**; the no-JavaScript rule (`NFR-2`) binds only the SVG path. The
> viewer SHOULD still follow the playground's dependency conventions. The descriptor is **validated**
> (CR-002 validator) before playback.

## 3. Scope

**In scope:** an interactive token-run viewer (play/pause/step + highlighting) in `website/app/`,
driven by the `kymo.anim` descriptor; optional standalone-HTML export. **Out of scope:** the no-JS
SVG (`CR-BPMN-ANIMATE-002`); WebP (`CR-BPMN-ANIMATE-005`); changes to the `kymo.anim` format; any
execution semantics.

## 4. Traceability (provisional)

| `FR-CR4` | Realises (parent `FEAT-BPMN-ANIMATE-001`) |
|----------|-------------------------------------------|
| `FR-CR4-01..04` | `FR-5` (interactive form) |

*(Test cases `TC-CR4-*` — incl. `website/app/e2e` smoke tests — and acceptance criteria authored on
promotion to Open.)*

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Provisional scaffold SRS: interactive viewer; play/pause/step; highlighting; optional standalone-HTML export. |
| 0.2     | 2026-05-31 | Vũ Anh | **Re-framed** around the descriptor: viewer loads + plays the `kymo.anim` `timeline`, honours `controls`, validates before playback; realises parent `FR-5` (interactive). |

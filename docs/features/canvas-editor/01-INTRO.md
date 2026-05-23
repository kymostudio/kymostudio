---
title: Interactive Canvas Editor — Introduction & Document Map
document_id: INTRO-CANVAS-001
version: "0.1"
issue_date: 2026-05-23
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone new to the canvas-editor feature; engineers, reviewers
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - FEAT-CANVAS-001
  - PLAN-CANVAS-001
  - DESIGN-CANVAS-001
  - TEST-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - introduction
  - index
  - reading-guide
  - iso-12207
  - canvas-editor
  - document-map
---

# Interactive Canvas Editor — Introduction & Document Map

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | INTRO-CANVAS-001                                                |
| Version           | 0.1                                                              |
| Issue Date        | 2026-05-23                                                       |
| Status            | Draft                                                           |
| Classification    | Internal                                                        |
| Owner             | `diagrams/` project                                             |
| Audience          | Newcomers to the feature; engineers & reviewers                 |
| Related Documents | `FEAT-CANVAS-001`, `PLAN-CANVAS-001`, `DESIGN-CANVAS-001`, `TEST-CANVAS-001` |

> Start here. This document orients a reader to the **canvas-editor** feature, maps the folder's
> documents to **ISO/IEC/IEEE 12207** life-cycle processes, and gives the recommended reading order.

---

## 1. Purpose

The **canvas-editor** feature evolves the kymo web playground (`website/app/`) from a one-way
`.kymo` → SVG previewer into an **interactive canvas editor**: a kymo diagram editable both as
`.kymo` text and directly on a tldraw canvas (two-way synced), coexisting with a freeform
whiteboard — single-player and static. The *why* and the phase plan are in `PLAN-CANVAS-001`.

This folder is documented to the spirit of ISO/IEC/IEEE 12207 (life-cycle processes), with
information items per ISO/IEC/IEEE 15289, quality attributes per ISO/IEC 25010, and test structure
per ISO/IEC/IEEE 29119 — **tailored** to a single-maintainer OSS feature (not every 12207 process
yields a separate document).

## 2. Document map (ISO 12207 process → information item)

| # | Document | document_id | ISO/IEC/IEEE 12207 process | Answers |
|---|----------|-------------|----------------------------|---------|
| 01 | `01-INTRO.md` | `INTRO-CANVAS-001` | 6.3.6 Information Management (orientation/index) | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-CANVAS-001` | 6.4.2 Stakeholder Needs + 6.4.3 System/SW Requirements | *what must it do?* |
| 03 | `03-DESIGN.md` | `DESIGN-CANVAS-001` | 6.4.4 Architecture Definition + 6.4.5 Design Definition | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-CANVAS-001` | 6.4.9 Verification + 6.4.11 Validation + 6.3.8 QA + 6.3.6 Traceability | *how do we know it's right?* |
| 05 | `05-PLAN.md` | `PLAN-CANVAS-001` | 6.4.1 Mission Analysis + 6.3.1 Project Planning + 6.3.4 Risk Management | *why, in what order, at what risk?* |

Cross-document references use **`document_id`** (never file paths), so the numeric `NN-` prefixes are
purely a reading-order aid and can be renumbered without breaking links.

## 3. Reading guide

Read in numeric order:

1. **`01-INTRO`** (this doc) — orientation + map.
2. **`02-FEATURE`** — the functional (`FR-CE-NN`) and non-functional (`NFR-CE-NN`, ISO 25010)
   requirements, each with an acceptance criterion.
3. **`03-DESIGN`** — architecture & data flow, the kymo↔tldraw mapping, the sync engine, and the
   `Diagram → .kymo` serializer (the crux).
4. **`04-TEST`** — the V&V approach, test cases (`TC-NN`), and the requirement→test traceability
   matrix.
5. **`05-PLAN`** — mission rationale, the React + tldraw decision, the phased plan, and the
   risk register.

Quick paths: *implementer* → 02 → 03 → 05 §5; *reviewer* → 02 → 04; *stakeholder* → 05.

## 4. Status & ownership

- **Status:** Draft — design phase; no code written yet. Phase 0 (`PLAN-CANVAS-001` §4) is the first
  build step.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** every requirement in `FEAT-CANVAS-001` has ≥ 1 covering test in
  `TEST-CANVAS-001` §5.

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial introduction + document map.     |

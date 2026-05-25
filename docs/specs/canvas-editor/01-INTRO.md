---
title: Interactive Canvas Editor — Specification: Overview & Document Map
document_id: INTRO-CANVAS-001
version: "1.1"
issue_date: 2026-05-25
status: Baselined
classification: Internal
owner: diagrams/ project
audience: Anyone new to the canvas-editor feature; engineers, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - PROD-CANVAS-001
  - FEAT-CANVAS-001
  - DESIGN-CANVAS-001
  - TEST-CANVAS-001
  - PLAN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - specification
  - introduction
  - index
  - reading-guide
  - iso-12207
  - iso-15289
  - canvas-editor
  - document-map
---

# Interactive Canvas Editor — Specification: Overview & Document Map

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | INTRO-CANVAS-001                                                |
| Version           | 1.1                                                             |
| Issue Date        | 2026-05-25                                                       |
| Status            | Baselined                                                       |
| Classification    | Internal                                                        |
| Owner             | `diagrams/` project                                             |
| Related Documents | `PROD-CANVAS-001`, `FEAT-CANVAS-001`, `DESIGN-CANVAS-001`, `TEST-CANVAS-001`, `PLAN-CANVAS-001` |

> Start here. This folder (`docs/specs/canvas-editor/`) is the **baselined specification** of the
> **canvas-editor** feature — *what it is, how it's built, how it's verified*. The **implementation
> plan** that delivers it (phases, risks, change-requests, worklog) lives separately in
> `docs/specs/canvas-editor/` (`PLAN-CANVAS-001`).

---

## 1. Purpose

The **canvas-editor** feature evolves the kymo web playground (`website/app/`) from a one-way
`.kymo` → SVG previewer into an **interactive canvas editor**: a kymo diagram editable both as
`.kymo` text and directly on a tldraw canvas (two-way synced), coexisting with a freeform
whiteboard — single-player and static.

This folder is documented to the spirit of **ISO/IEC/IEEE 12207** (life-cycle processes), with
information items per **ISO/IEC/IEEE 15289**, requirements per **ISO/IEC/IEEE 29148**, architecture
per **ISO/IEC/IEEE 42010**, quality attributes per **ISO/IEC 25010**, and test structure per
**ISO/IEC/IEEE 29119** — **tailored** to a single-maintainer OSS feature.

## 2. Document map

This feature's docs use a two-layer model in this folder — a **baselined spec** (`00-PRODUCT`–`04-TEST`)
and a **living plan** (`PLAN.md` + `CR/`). The documents for canvas-editor:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 00 | `00-PRODUCT.md` | `PROD-CANVAS-001` | *what product problem & whose needs (`SN-CE`)?* |
| 01 | `01-INTRO.md` | `INTRO-CANVAS-001` | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-CANVAS-001` | *what must it do? (SRS, `FR-CE`/`NFR-CE`)* |
| 03 | `03-DESIGN.md` | `DESIGN-CANVAS-001` | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-CANVAS-001` | *how do we know it's right? (`TC-NN`)* |
| — | `docs/specs/canvas-editor/PLAN.md` | `PLAN-CANVAS-001` | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Cross-document references use **`document_id`** (never file paths), so docs can move between layers
without breaking links; the numeric `NN-` prefixes are a reading-order aid only.

## 4. Reading guide

Spec: **`01-INTRO`** (this doc) → **`00-PRODUCT`** (the product context + `SN-CE` needs) →
**`02-FEATURE`** (the `FR-CE`/`NFR-CE` requirements) → **`03-DESIGN`** (architecture, the kymo↔tldraw
mapping, sync engine, serializer) → **`04-TEST`** (V&V, `TC-NN`, traceability). For delivery status &
history, read **`PLAN-CANVAS-001`** in `docs/specs/canvas-editor/`.

Quick paths: *implementer* → 00 → 02 → 03 → `PLAN`; *reviewer* → 02 → 04; *stakeholder* → 00 → `PLAN`.

## 5. Status & ownership

- **Status:** Baselined v1.0 — the spec reflects the delivered feature (Phases 0–4, per
  `PLAN-CANVAS-001`). Further changes go through a change-request → re-baseline.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** every requirement in `FEAT-CANVAS-001` has ≥ 1 covering test in
  `TEST-CANVAS-001` §5.
- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/canvas-editor/CR/` and re-baselined (bump version + record in Annex A).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial introduction + document map.     |
| 0.2     | 2026-05-23 | Vũ Anh | Map row: PLAN also covers 6.3.2 (Annex C Worklog). |
| 1.0     | 2026-05-23 | Vũ Anh | **Baselined.** Split docs into two layers — Specification (`docs/specs/`) vs Implementation plan (`docs/plans/`, `PLAN-CANVAS-001`); added the ISO management model (baseline/CM, traceability, change-management). |
| 1.1     | 2026-05-25 | Vũ Anh | **Doc reorganization.** §2 trimmed to a document map and adds `00-PRODUCT` (`PROD-CANVAS-001`); ex-§3 (ISO management) folded into the document map; reading guide + change-management updated; docs consolidated per feature under `docs/specs/`. |

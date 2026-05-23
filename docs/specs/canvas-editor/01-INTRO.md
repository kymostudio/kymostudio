---
title: Interactive Canvas Editor — Specification: Overview & Document Map
document_id: INTRO-CANVAS-001
version: "1.0"
issue_date: 2026-05-23
status: Baselined
classification: Internal
owner: diagrams/ project
audience: Anyone new to the canvas-editor feature; engineers, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
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
| Version           | 1.0                                                             |
| Issue Date        | 2026-05-23                                                       |
| Status            | Baselined                                                       |
| Classification    | Internal                                                        |
| Owner             | `diagrams/` project                                             |
| Related Documents | `FEAT-CANVAS-001`, `DESIGN-CANVAS-001`, `TEST-CANVAS-001`, `PLAN-CANVAS-001` |

> Start here. This folder (`docs/specs/canvas-editor/`) is the **baselined specification** of the
> **canvas-editor** feature — *what it is, how it's built, how it's verified*. The **implementation
> plan** that delivers it (phases, risks, change-requests, worklog) lives separately in
> `docs/plans/canvas-editor/` (`PLAN-CANVAS-001`).

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

## 2. Two document layers (ISO 15289 information-item classes)

The feature's documents are split into two layers, by ISO information-item class:

| Layer | Folder | 15289 class | 12207 processes | Answers |
|-------|--------|-------------|-----------------|---------|
| **Specification** (this folder) | `docs/specs/canvas-editor/` | Specification / Description — **baselined** | §6.4 Technical Processes | *what must it be / how is it built / how is it verified?* |
| **Implementation plan** | `docs/plans/canvas-editor/` | Plan + Records — **living** | §6.3 Technical Management | *why, in what order, at what risk, what's done?* |

### 2.1 Specification layer — document map (this folder)

| # | Document | document_id | ISO/IEC/IEEE 12207 process | Answers |
|---|----------|-------------|----------------------------|---------|
| 01 | `01-INTRO.md` | `INTRO-CANVAS-001` | 6.3.6 Information Management (orientation/index) | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-CANVAS-001` | 6.4.2 Stakeholder Needs + 6.4.3 System/SW Requirements (SRS, 29148) | *what must it do?* |
| 03 | `03-DESIGN.md` | `DESIGN-CANVAS-001` | 6.4.4 Architecture Definition (42010) + 6.4.5 Design Definition | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-CANVAS-001` | 6.4.9 Verification + 6.4.11 Validation + 6.3.8 QA + 6.3.6 Traceability | *how do we know it's right?* |

### 2.2 Implementation-plan layer (separate folder)

| Document | document_id | ISO/IEC/IEEE 12207 process | Answers |
|----------|-------------|----------------------------|---------|
| `docs/plans/canvas-editor/PLAN.md` | `PLAN-CANVAS-001` | 6.4.1 Mission Analysis + 6.3.1 Project Planning (16326) + 6.3.4 Risk + 6.3.2 Assessment & Control (worklog) | *why, in what order, at what risk, what's done?* |

Cross-document references use **`document_id`** (never file paths), so docs can move between layers
without breaking links; the numeric `NN-` prefixes are a reading-order aid only.

## 3. How the two layers are managed (ISO)

- **Baseline + Configuration Management (12207 §6.3.5).** The specification (this folder) is
  **baselined** and versioned; the plan and its change-requests reference a specific spec baseline.
  This spec is at **baseline v1.0** (the feature is delivered — Phases 0–4).
- **Bidirectional traceability (29148).** Every requirement (`FR-CE`/`NFR-CE`, owned by
  `FEAT-CANVAS-001`) → design element (`DESIGN-CANVAS-001`) → test case (`TC-NN`, `TEST-CANVAS-001`)
  → delivery work item (a milestone/PR in `PLAN-CANVAS-001`). The matrix lives in `TEST-CANVAS-001` §5.
- **Change management.** A change to this baselined spec is raised as a **change-request** in the
  implementation-plan layer (`PLAN-CANVAS-001`), assessed (impact/risk), approved, implemented, then
  the spec is **re-baselined** (version bump). New requirement/test IDs are minted **here** (the spec
  owns them); the plan never re-defines them.
- **Information Management (§6.3.6).** Uniform identification — `document_id`, `version`, `status`,
  `owner`, `related_documents` — in each doc's frontmatter + control table.

## 4. Reading guide

Spec, in numeric order: **`01-INTRO`** (this doc) → **`02-FEATURE`** (the `FR-CE`/`NFR-CE`
requirements) → **`03-DESIGN`** (architecture, the kymo↔tldraw mapping, sync engine, serializer) →
**`04-TEST`** (V&V, `TC-NN`, traceability). For delivery status & history, read **`PLAN-CANVAS-001`**
in `docs/plans/canvas-editor/`.

Quick paths: *implementer* → 02 → 03 → `PLAN`; *reviewer* → 02 → 04; *stakeholder* → `PLAN`.

## 5. Status & ownership

- **Status:** Baselined v1.0 — the spec reflects the delivered feature (Phases 0–4, per
  `PLAN-CANVAS-001`). Further changes go through a change-request → re-baseline.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** every requirement in `FEAT-CANVAS-001` has ≥ 1 covering test in
  `TEST-CANVAS-001` §5.

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial introduction + document map.     |
| 0.2     | 2026-05-23 | Vũ Anh | Map row: PLAN also covers 6.3.2 (Annex C Worklog). |
| 1.0     | 2026-05-23 | Vũ Anh | **Baselined.** Split docs into two layers — Specification (`docs/specs/`) vs Implementation plan (`docs/plans/`, `PLAN-CANVAS-001`); added the ISO management model (baseline/CM, traceability, change-management). |

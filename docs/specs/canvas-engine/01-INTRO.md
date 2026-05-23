---
title: In-House Canvas Engine — Specification: Overview & Document Map
document_id: INTRO-ENGINE-001
version: "0.2"
issue_date: 2026-05-23
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone new to the canvas-engine effort; engineers, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-ENGINE-001
  - DESIGN-ENGINE-001
  - TEST-ENGINE-001
  - PLAN-ENGINE-001
  - INTRO-FIGJAM-001
  - DESIGN-CANVAS-001
  - PLAN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - specification
  - introduction
  - index
  - reading-guide
  - canvas-engine
  - tldraw-replacement
  - vendor-independence
  - document-map
---

# In-House Canvas Engine — Specification: Overview & Document Map

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | INTRO-ENGINE-001                                                  |
| Version           | 0.2                                                               |
| Issue Date        | 2026-05-23                                                        |
| Status            | Draft                                                             |
| Classification    | Internal                                                          |
| Owner             | `diagrams/` project                                              |
| Related Documents | `FEAT-ENGINE-001`, `DESIGN-ENGINE-001`, `TEST-ENGINE-001`, `PLAN-ENGINE-001`, `INTRO-FIGJAM-001` (sibling) |

> Start here. This folder (`docs/specs/canvas-engine/`) specifies the **render/interaction core** of
> an in-house canvas engine that replaces the **tldraw** dependency behind the already-delivered
> canvas-editor (`DESIGN-CANVAS-001`, `PLAN-CANVAS-001`). The goal is **vendor independence**: no
> license key, no production watermark, no CDN-hosted assets, and a far smaller committed bundle —
> while preserving the canvas-editor's behaviour. This feature lands the **key-free rendering board**
> (Phases 1–7); the parity completion (tldraw removal) and the **FigJam freeform-authoring** half are
> the sibling feature **`INTRO-FIGJAM-001`** (`docs/specs/canvas-figjam/`). The implementation plan
> that delivers this feature (phases, risks, worklog) lives in `docs/plans/canvas-engine/`
> (`PLAN-ENGINE-001`).

---

## 1. Purpose & motivation

The canvas-editor (`PLAN-CANVAS-001`, Phases 0–4, baselined) runs on the **tldraw** SDK. That choice
left one open, accepted limitation — **`RK-02`**: tldraw v5 **requires a license key in production**;
with no key the board renders only on `localhost` and is **blank on the deployed domain**. The public
deploy (`kymostudio.github.io`) is therefore blank today.

This effort removes that dependency by building the **minimal canvas engine** the canvas-editor
actually uses — *not* a tldraw clone. The driving insight (quantified in `DESIGN-ENGINE-001` §3): the
editor consumes a **small, enumerable slice** of the tldraw API. We re-implement exactly that slice
behind a stable adapter seam, then swap the implementation with **no changes to `Board.tsx`, the
custom shapes, or `Inspector.tsx`**.

Documented to the spirit of **ISO/IEC/IEEE 12207** (life-cycle processes), with information items per
**ISO/IEC/IEEE 15289**, requirements per **ISO/IEC/IEEE 29148**, architecture per **ISO/IEC/IEEE
42010**, quality attributes per **ISO/IEC 25010**, test structure per **ISO/IEC/IEEE 29119** —
**tailored** to a single-maintainer OSS feature.

## 2. Two document layers (ISO 15289 information-item classes)

| Layer | Folder | 15289 class | 12207 processes | Answers |
|-------|--------|-------------|-----------------|---------|
| **Specification** (this folder) | `docs/specs/canvas-engine/` | Specification / Description | §6.4 Technical Processes | *what must it be / how is it built / how is it verified?* |
| **Implementation plan** | `docs/plans/canvas-engine/` | Plan + Records — **living** | §6.3 Technical Management | *why, in what order, at what risk, what's done?* |

### 2.1 Specification layer — document map (this folder)

| # | Document | document_id | ISO/IEC/IEEE 12207 process | Answers |
|---|----------|-------------|----------------------------|---------|
| 01 | `01-INTRO.md` | `INTRO-ENGINE-001` | 6.3.6 Information Management | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-ENGINE-001` | 6.4.2 Stakeholder Needs + 6.4.3 Requirements (SRS, 29148) | *what must it do?* |
| 03 | `03-DESIGN.md` | `DESIGN-ENGINE-001` | 6.4.4 Architecture (42010) + 6.4.5 Design Definition | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-ENGINE-001` | 6.4.9 Verification + 6.4.11 Validation + 6.3.6 Traceability | *how do we know it's right?* |

### 2.2 Implementation-plan layer (separate folder)

| Document | document_id | ISO/IEC/IEEE 12207 process | Answers |
|----------|-------------|----------------------------|---------|
| `docs/plans/canvas-engine/PLAN.md` | `PLAN-ENGINE-001` | 6.4.1 Mission Analysis + 6.3.1 Project Planning + 6.3.4 Risk + 6.3.2 Worklog | *why, in what order, at what risk, what's done?* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only.

## 3. Relationship to the canvas-editor specification

This engine is a **substitution under the canvas-editor**, not a new product. The canvas-editor
requirements (`FEAT-CANVAS-001`) and round-trip design (`DESIGN-CANVAS-001` §5–§9, the kymo↔shape
mapping, `patchDsl`, the sync engine) **remain authoritative and unchanged**. What changes is the
substrate they sit on:

- `DESIGN-CANVAS-001` **§10** (tldraw assets / license / watermark) and **§11** (tldraw
  `persistenceKey`) are **superseded** by this engine's own persistence and zero-asset model.
- `RK-02` (no-key blank board) **closes at the render level** in this feature (Phase 7 — the engine
  renders the board, needing no key); it is **fully retired** when the sibling feature physically
  removes tldraw.

The engine's job is to satisfy the canvas-editor's behaviour with an implementation we own.

### 3.1 Sibling feature — `canvas-figjam` (`INTRO-FIGJAM-001`)

The programme was split (v0.2) to honour the ≤50-SP/feature cap. **This feature** is the
render/interaction core that lands the key-free board. The **sibling** (`docs/specs/canvas-figjam/`)
*completes* the engine — built-in shape consolidation, undo/redo, board export, the **physical
tldraw removal + full `TEST-CANVAS-001` parity**, footprint — and adds the **FigJam freeform
authoring** tools. Its first phase's entry gate is **this feature's Phase 7 complete**. Requirements
re-homed there (`FR-EN-06/10/11`, `NFR-EN-01/02`) become `FR-FJ-`/`NFR-FJ-` and are retired here.

## 4. Reading guide

Spec, in numeric order: **`01-INTRO`** (this doc) → **`02-FEATURE`** (the `FR-EN`/`NFR-EN`
requirements, incl. the tldraw-surface parity contract) → **`03-DESIGN`** (store, editor facade,
viewport, ShapeUtil parity, interaction, persistence, the adapter seam) → **`04-TEST`** (V&V,
`TC-EN-NN`, traceability). For delivery status & history, read **`PLAN-ENGINE-001`**.

Quick paths: *implementer* → 02 → 03 → `PLAN`; *reviewer* → 02 → 04; *stakeholder* → `PLAN`.

## 5. Status & ownership

- **Status:** Draft — design-before-code. No engine code exists yet; tldraw remains bundled behind
  the adapter **throughout this feature** (Phases 1–7), its physical removal being the sibling
  feature (`PLAN-FIGJAM-001`).
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** every requirement in `FEAT-ENGINE-001` will have ≥ 1 covering test in
  `TEST-ENGINE-001` §5 before the engine is declared at parity.

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial introduction + document map for the in-house canvas engine. |
| 0.2     | 2026-05-24 | Vũ Anh | **Feature split** at the key-free-board seam: rescoped to the render/interaction core; added §3.1 sibling-feature relationship to `INTRO-FIGJAM-001`; `RK-02` now closes at render level here. |

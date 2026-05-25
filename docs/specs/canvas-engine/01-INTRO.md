---
title: In-House Canvas Engine — Specification: Overview & Document Map
document_id: INTRO-ENGINE-001
version: "0.3"
issue_date: 2026-05-25
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone new to the canvas-engine effort; engineers, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - PROD-ENGINE-001
  - FEAT-ENGINE-001
  - DESIGN-ENGINE-001
  - TEST-ENGINE-001
  - PLAN-ENGINE-001
  - INTRO-JAM-001
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
| Version           | 0.3                                                               |
| Issue Date        | 2026-05-25                                                        |
| Status            | Draft                                                             |
| Classification    | Internal                                                          |
| Owner             | `diagrams/` project                                              |
| Related Documents | `PROD-ENGINE-001`, `FEAT-ENGINE-001`, `DESIGN-ENGINE-001`, `TEST-ENGINE-001`, `PLAN-ENGINE-001`, `INTRO-JAM-001` (sibling) |

> Start here. This folder (`docs/specs/canvas-engine/`) specifies the **render/interaction core** of
> an in-house canvas engine that replaces the **tldraw** dependency behind the already-delivered
> canvas-editor (`DESIGN-CANVAS-001`, `PLAN-CANVAS-001`). The goal is **vendor independence**: no
> license key, no production watermark, no CDN-hosted assets, and a far smaller committed bundle —
> while preserving the canvas-editor's behaviour. This feature lands the **key-free rendering board**
> (Phases 1–7); the parity completion (tldraw removal) and the **FigJam freeform-authoring** half are
> the sibling feature **`INTRO-JAM-001`** (`docs/specs/canvas-jam/`). The implementation plan
> that delivers this feature (phases, risks, worklog) lives in `docs/specs/canvas-engine/`
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

## 2. Document map

This feature's docs use a two-layer model in this folder — a **baselined spec** (`00-PRODUCT`–`04-TEST`)
and a **living plan** (`PLAN.md` + `CR/`). The documents for canvas-engine:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 00 | `00-PRODUCT.md` | `PROD-ENGINE-001` | *what product problem & whose needs (`SN-EN`)?* |
| 01 | `01-INTRO.md` | `INTRO-ENGINE-001` | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-ENGINE-001` | *what must it do? (SRS, `FR-EN`/`NFR-EN`)* |
| 03 | `03-DESIGN.md` | `DESIGN-ENGINE-001` | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-ENGINE-001` | *how do we know it's right? (`TC-EN`)* |
| 05 | `05-BENCHMARK.md` | `BENCH-ENGINE-001` | *how fast is it? (performance benchmark)* |
| — | `docs/specs/canvas-engine/PLAN.md` | `PLAN-ENGINE-001` | *why, in what order, at what risk, what's done? (+ `CR/`)* |

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

### 3.1 Sibling feature — `canvas-jam` (`INTRO-JAM-001`)

The programme was split (v0.2) to honour the ≤50-SP/feature cap. **This feature** is the
render/interaction core that lands the key-free board. The **sibling** (`docs/specs/canvas-jam/`)
*completes* the engine — built-in shape consolidation, undo/redo, board export, the **physical
tldraw removal + full `TEST-CANVAS-001` parity**, footprint — and adds the **FigJam freeform
authoring** tools. Its first phase's entry gate is **this feature's Phase 7 complete**. Requirements
re-homed there (`FR-EN-06/10/11`, `NFR-EN-01/02`) become `FR-J-`/`NFR-J-` and are retired here.

## 4. Reading guide

Spec: **`01-INTRO`** (this doc) → **`00-PRODUCT`** (the product context + `SN-EN` needs) →
**`02-FEATURE`** (the `FR-EN`/`NFR-EN` requirements, incl. the tldraw-surface parity contract) →
**`03-DESIGN`** (store, editor facade, viewport, ShapeUtil parity, interaction, persistence, the
adapter seam) → **`04-TEST`** (V&V, `TC-EN-NN`, traceability). For delivery status & history, read
**`PLAN-ENGINE-001`**.

Quick paths: *implementer* → 00 → 02 → 03 → `PLAN`; *reviewer* → 02 → 04; *stakeholder* → 00 → `PLAN`.

## 5. Status & ownership

- **Status:** Draft — design-before-code. No engine code exists yet; tldraw remains bundled behind
  the adapter **throughout this feature** (Phases 1–7), its physical removal being the sibling
  feature (`PLAN-JAM-001`).
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** every requirement in `FEAT-ENGINE-001` will have ≥ 1 covering test in
  `TEST-ENGINE-001` §5 before the engine is declared at parity.
- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/canvas-engine/CR/` and re-baselined (bump version + record in Annex A).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial introduction + document map for the in-house canvas engine. |
| 0.2     | 2026-05-24 | Vũ Anh | **Feature split** at the key-free-board seam: rescoped to the render/interaction core; added §3.1 sibling-feature relationship to `INTRO-JAM-001`; `RK-02` now closes at render level here. |
| 0.3     | 2026-05-25 | Vũ Anh | **Doc reorganization.** §2 trimmed to a document map and adds `00-PRODUCT` (`PROD-ENGINE-001`) + a `05` benchmark row; reading guide + change-management updated; docs consolidated per feature under `docs/specs/`. |

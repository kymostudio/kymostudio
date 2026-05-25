---
title: Canvas Jam — Specification: Overview & Document Map
document_id: INTRO-JAM-001
version: "0.2"
issue_date: 2026-05-25
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone new to the canvas-jam effort; engineers, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - PROD-JAM-001
  - FEAT-JAM-001
  - DESIGN-JAM-001
  - TEST-JAM-001
  - PLAN-JAM-001
  - INTRO-ENGINE-001
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
  - canvas-jam
  - freeform-authoring
  - tldraw-removal
  - document-map
---

# Canvas Jam — Specification: Overview & Document Map

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | INTRO-JAM-001                                                 |
| Version           | 0.2                                                              |
| Issue Date        | 2026-05-25                                                       |
| Status            | Draft                                                           |
| Classification    | Internal                                                        |
| Owner             | `diagrams/` project                                            |
| Related Documents | `PROD-JAM-001`, `FEAT-JAM-001`, `DESIGN-JAM-001`, `TEST-JAM-001`, `PLAN-JAM-001`, `INTRO-ENGINE-001` (sibling) |

> Start here. This folder (`docs/specs/canvas-jam/`) specifies the **second half** of the in-house
> canvas-engine programme: it **completes** the tldraw replacement begun in `INTRO-ENGINE-001`
> (built-in shape consolidation, undo/redo, board export, the **physical tldraw removal + full
> `TEST-CANVAS-001` parity**, footprint) and then adds the **FigJam freeform-authoring** tools —
> draw/pen, sticky notes, and text — the "whiteboard half" tldraw gave for free. The implementation
> plan that delivers it (phases, risks, worklog) lives in `docs/specs/canvas-jam/`
> (`PLAN-JAM-001`).

---

## 1. Purpose & motivation

The programme was **split** to honour the maintainer's **≤ 50-SP-per-feature** cap (the whole engine
was ≈ 91 SP). The render/interaction core — adapter seam → store → ShapeUtil + viewport →
interaction + persistence → a **key-free rendering board** — is the sibling feature
`INTRO-ENGINE-001` (≈ 42 SP). **This feature** (≈ 44 SP) picks up where that ends:

- **Finish the replacement.** Consolidate the built-in shapes onto custom `kymo-region`/`kymo-edge`,
  add the undo/redo stack and board export, then **remove tldraw entirely** and prove the **full**
  canvas-editor V&V (`TEST-CANVAS-001`, `TC-01..19`) green on the engine, and shrink the bundle.
- **Add the FigJam half.** Build the freeform whiteboard **authoring** tools (draw/pen, sticky, text)
  that the kymo "freeform layer" (`DESIGN-CANVAS-001` §3) currently depends on tldraw to create.

Documented to the spirit of **ISO/IEC/IEEE 12207**, with requirements per **29148**, architecture
per **42010**, quality attributes per **25010**, test structure per **29119** — tailored to a
single-maintainer OSS feature, exactly as the sibling doc-set.

## 2. Document map

This feature's docs use a two-layer model in this folder — a **baselined spec** (`00-PRODUCT`–`04-TEST`)
and a **living plan** (`PLAN.md` + `CR/`). The documents for canvas-jam:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 00 | `00-PRODUCT.md` | `PROD-JAM-001` | *what product problem & whose needs (`SN-J`)?* |
| 01 | `01-INTRO.md` | `INTRO-JAM-001` | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-JAM-001` | *what must it do? (SRS, `FR-J`/`NFR-J`)* |
| 03 | `03-DESIGN.md` | `DESIGN-JAM-001` | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-JAM-001` | *how do we know it's right? (`TC-J`)* |
| — | `docs/specs/canvas-jam/PLAN.md` | `PLAN-JAM-001` | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only.

## 3. Relationship to the canvas-engine specification

This feature is the **continuation of `INTRO-ENGINE-001`**, not a new product. They are two halves of
one programme, split at the **KEY-FREE BOARD** milestone:

- **Entry gate:** this feature's first phase begins only when the sibling's **Phase 7** is complete —
  i.e. the engine already renders and drives the public board with no license key.
- **Inherited requirements:** the engine's deferred requirements are **re-homed here** with new IDs —
  `FR-EN-06` → `FR-J-01` (built-in consolidation), `FR-EN-10` → `FR-J-02` (undo/redo), `FR-EN-11`
  → `FR-J-03` (board export), `NFR-EN-01/02` → `NFR-J-` (perf, footprint). `FEAT-JAM-001` owns
  these IDs; `FEAT-ENGINE-001` retired them.
- **Built on:** the design here reuses the engine's store/editor/viewport/persist (`DESIGN-ENGINE-001`)
  unchanged; it adds the consolidation, history stack, export, and the freeform tool layer.
- **`RK-02` (no-key blank board)** is **fully retired** in this feature when tldraw is physically
  removed (it had already closed at the render level in the sibling's Phase 7).

## 4. Reading guide

Spec: **`01-INTRO`** (this doc) → **`00-PRODUCT`** (the product context + `SN-J` needs) →
**`02-FEATURE`** (the `FR-J`/`NFR-J` requirements + the re-homing map) → **`03-DESIGN`**
(consolidation, undo stack, export, removal, footprint, freeform tools) → **`04-TEST`** (V&V,
`TC-J-NN`, the full parity re-run, traceability). For delivery status & history, read **`PLAN-JAM-001`**.

Quick paths: *implementer* → 00 → 02 → 03 → `PLAN`; *reviewer* → 02 → 04; *stakeholder* → 00 → `PLAN`.

## 5. Status & ownership

- **Status:** Draft — design-before-code; **blocked on** the sibling's Phase 7 (key-free board).
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** every requirement in `FEAT-JAM-001` will have ≥ 1 covering test in
  `TEST-JAM-001` before the feature is declared done.
- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/canvas-jam/CR/` and re-baselined (bump version + record in Annex A).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial introduction + document map for canvas-jam (the engine-completion + FigJam-authoring half spun out of `INTRO-ENGINE-001` at the key-free-board seam). |
| 0.2     | 2026-05-25 | Vũ Anh | **Doc reorganization.** §2 trimmed to a document map and adds `00-PRODUCT` (`PROD-JAM-001`); reading guide + change-management updated; docs consolidated per feature under `docs/specs/`. |

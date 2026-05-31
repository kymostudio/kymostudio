---
title: BPMN Editor — Specification: Overview & Document Map
document_id: INTRO-BPMN-EDITOR-001
version: "0.1"
issue_date: 2026-05-31
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone new to the bpmn-editor feature; engineers, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - PROD-BPMN-EDITOR-001
  - FEAT-BPMN-EDITOR-001
  - DESIGN-BPMN-EDITOR-001
  - TEST-BPMN-EDITOR-001
  - PLAN-BPMN-EDITOR-001
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
  - bpmn-editor
  - document-map
---

# BPMN Editor — Specification: Overview & Document Map

| Field             | Value |
|-------------------|-------|
| Document ID       | `INTRO-BPMN-EDITOR-001` |
| Version           | 0.1 |
| Issue Date        | 2026-05-31 |
| Status            | Draft |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Related Documents | `PROD-BPMN-EDITOR-001`, `FEAT-BPMN-EDITOR-001`, `DESIGN-BPMN-EDITOR-001`, `TEST-BPMN-EDITOR-001`, `PLAN-BPMN-EDITOR-001` |

> Start here. This folder (`docs/specs/bpmn-editor/`) is the **specification** of the **bpmn-editor**
> feature — *what it is, how it's built, how it's verified*. The **implementation plan** that delivers
> it (phases, risks, change-requests, worklog) is `PLAN-BPMN-EDITOR-001` in the same folder.

---

## 1. Purpose

The **bpmn-editor** feature adds an **interactive BPMN modeling surface** to the kymo web editor
(`website/app/`), modeled on the reference public modeler `demo.bpmn.io`: a palette to place BPMN
elements, a context pad + direct editing to revise them, and `.bpmn` open/save — all by direct
manipulation, single-player and static. It is a **composition** of the existing editor stack (engine,
studio chrome, freeform tools) and the BPMN parser/exporter; it does **not** change the engine or the
`bpmn-*` renderers.

This folder is documented to the spirit of **ISO/IEC/IEEE 12207** (life-cycle processes), with
information items per **ISO/IEC/IEEE 15289**, requirements per **ISO/IEC/IEEE 29148**, architecture
per **ISO/IEC/IEEE 42010**, quality attributes per **ISO/IEC 25010**, and test structure per
**ISO/IEC/IEEE 29119** — **tailored** to a single-maintainer OSS feature.

## 2. Document map

This feature's docs use a two-layer model in this folder — a **spec** (`00-PRODUCT`–`04-TEST`) and a
**living plan** (`PLAN.md` + `CHANGE-REQUESTS/`):

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 00 | `00-PRODUCT.md` | `PROD-BPMN-EDITOR-001` | *what product problem & whose needs (`SN-BE`)?* |
| 01 | `01-INTRO.md` | `INTRO-BPMN-EDITOR-001` | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-BPMN-EDITOR-001` | *what must it do? (SRS, `FR-BE`/`NFR-BE`)* |
| 03 | `03-DESIGN.md` | `DESIGN-BPMN-EDITOR-001` | *how is it built (composition over the stack)?* |
| 04 | `04-TEST.md` | `TEST-BPMN-EDITOR-001` | *how do we know it's right? (`TC-NN`)* |
| — | `PLAN.md` | `PLAN-BPMN-EDITOR-001` | *why, in what order, at what risk, what's done? (+ `CHANGE-REQUESTS/`)* |

Cross-document references use **`document_id`** (never file paths), so docs can move without breaking
links; the numeric `NN-` prefixes are a reading-order aid only.

## 3. Relationship to sibling specs

The bpmn-editor stands on already-delivered features and an existing normative mapping. It composes
them rather than re-implementing anything:

| Sibling | document_id | What bpmn-editor reuses |
|---------|-------------|--------------------------|
| canvas-engine | `FEAT-ENGINE-001` | The substrate: reactive `Store`, the `Editor` facade (`createShape`/`updateShape`/`deleteShape`/`zoomToFit`/`run`), `ShapeUtil` custom shapes, viewport/camera, selection/drag, React `<Canvas>` bindings. |
| canvas-studio | `FEAT-STUDIO-001` | The UI shell: top bar, **tool rail + registry** (`website/app/src/ui/tools.ts`, which already reserves *disabled* create-tool slots), status bar, design tokens, on-canvas item styling. |
| canvas-jam | `FEAT-JAM-001` | The tool-pattern precedent (draw/sticky/text place freeform shapes), **undo/redo**, and **board SVG export**. |
| bpmn-parser | `FEAT-BPMN-PARSER-001` | `parseBpmn(xml) → Diagram` for the **open** path. |
| bpmn-export | `FEAT-BPMN-EXPORT-001` | `toBpmn(Diagram) → xml` for the **save** path. |
| bpmn element mapping | `BPMN-MAP-001` | The normative element↔glyph mapping + default geometry the palette/context-pad must honor. |

> **Distinct from generic create-tools.** The studio tool rail reserves disabled create-tool slots
> labelled *"coming in canvas-create-tools"* — a *generic* shape/edge palette. The bpmn-editor adds a
> **BPMN-specific** palette + context pad keyed to `BPMN-MAP-001`; where the two overlap (the connect
> tool, in-place editing), the bpmn-editor reuses the generic primitive rather than forking it.

## 4. Reading guide

Spec: **`01-INTRO`** (this doc) → **`00-PRODUCT`** (product context + `SN-BE` needs) →
**`02-FEATURE`** (the `FR-BE`/`NFR-BE` requirements, grouped by the three pillars) → **`03-DESIGN`**
(composition over the engine/studio/parser/exporter) → **`04-TEST`** (V&V, `TC-NN`, traceability).
For delivery status & history, read **`PLAN-BPMN-EDITOR-001`**.

Quick paths: *implementer* → 00 → 02 → 03 → `PLAN`; *reviewer* → 02 → 04; *stakeholder* → 00 → `PLAN`.

## 5. Status & ownership

- **Status:** Draft v0.1 — newly specified; not yet implemented. Phasing in `PLAN-BPMN-EDITOR-001`.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** every requirement in `FEAT-BPMN-EDITOR-001` has ≥ 1 covering test in
  `TEST-BPMN-EDITOR-001` §5.
- **Change management:** a change to this spec (once baselined) is raised as a change-request in
  `CHANGE-REQUESTS/` and re-baselined (bump version + record in Annex A). Five post-v1 enhancements are
  already logged as **proposed** CR mini-specs (`CR-001/`..`CR-005/`) — see `CHANGE-REQUESTS/README.md`.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Initial introduction + document map; positions bpmn-editor as a composition over `FEAT-ENGINE-001` / `FEAT-STUDIO-001` / `FEAT-JAM-001` / `FEAT-BPMN-PARSER-001` / `FEAT-BPMN-EXPORT-001` / `BPMN-MAP-001`, distinct from the generic `canvas-create-tools` palette. |

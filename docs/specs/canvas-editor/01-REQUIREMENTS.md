---
title: Interactive Canvas Editor — Requirements
document_id: FEAT-CANVAS-001
version: "1.1"
issue_date: 2026-05-25
status: Baselined
classification: Internal
owner: diagrams/ project
audience: Engineers implementing & verifying the canvas editor (`website/app/`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - PLAN-CANVAS-001
  - DESIGN-CANVAS-001
  - TEST-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - features
  - functional-requirements
  - non-functional-requirements
  - iso-25010
  - canvas-editor
  - acceptance-criteria
  - conops
  - stakeholder-requirements
  - introduction
  - index
  - reading-guide
  - iso-12207
  - iso-15289
---

# Canvas Editor — Requirements

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | FEAT-CANVAS-001                                                 |
| Version           | 1.1                                                              |
| Issue Date        | 2026-05-25                                                       |
| Status            | Baselined                                                       |
| Classification    | Internal                                                        |
| Owner             | `diagrams/` project                                             |
| Audience          | Engineers implementing & verifying the editor                   |
| Related Documents | `PLAN-CANVAS-001` (plan/risk), `DESIGN-CANVAS-001` (design), `TEST-CANVAS-001` (V&V) |

> This is the consolidated requirements document for the canvas-editor feature, merging the
> product description (ConOps & stakeholder needs), the document map / introduction, and the
> requirements specification (SRS). Structured per ISO/IEC/IEEE 12207 §6.4.2/§6.4.3. Each
> requirement is atomic, verifiable, and stably identified so `TEST-CANVAS-001` can trace a test
> case to it. Non-functional requirements are framed by **ISO/IEC 25010** quality characteristics.

---

## Part A — Product context (ConOps & Stakeholder Requirements)

### 1. Problem & motivation

The kymo web playground (`website/app/`) was a one-way `.kymo` → SVG previewer: a `<textarea>` of
`.kymo` DSL on the left, a live SVG preview on the right. Authors could not edit a diagram *directly*
— only by editing text — and there was no freeform whiteboard around it. The feature evolves the
playground into an **interactive canvas editor**: a kymo diagram editable both as `.kymo` text and
directly on a tldraw canvas (two-way synced), coexisting with a freeform whiteboard — single-player
and static.

Two facts from the code force the architecture: `renderSVG()` returns a **monolithic SVG string**
with no per-element ids (so the canvas must be **model-driven**, not SVG-driven), and **no
`Diagram → .kymo` serializer existed** anywhere in the repo — "drag a node → update the source"
required writing one from scratch, the central cost of the project.

### 2. Users & context of operations (ConOps)

- **Who:** authors of `.kymo`/BPMN diagrams using the client-side playground who want to edit on a
  canvas (drag, select, inspect) as well as in text, with a freeform whiteboard on the same board.
- **Substrate it builds on:** the `packages/js` public API (`parseDiagram`, `parseBpmn`, `renderSVG`,
  `getIcon`, the `Diagram`/`Component`/`Region`/`Edge` model — carrying resolved absolute positions
  after parse) and the existing playground's `?script=` share links and static GitHub-Pages deploy.
- **Constraint:** **single-player / static** — GitHub Pages, no backend; the committed
  `kymo.bundle.js` is what deploys (no CI build step). `.kymo` text stays the source of truth for the
  **diagram layer**; the **freeform layer** (sticky notes, freehand, frames) has no DSL
  representation and persists in the canvas store only.

### 3. Goals & non-goals

- **Goals:** a two-way-synced canvas editor — text→canvas live render, canvas→text round-trip
  (drag/rename a node → update the `.kymo`, byte-preserving comments and untouched lines via a
  surgical patch), a coexisting freeform whiteboard, board persistence, undo/redo across both layers,
  `?script=` share compatibility, samples, SVG export, BPMN import — all static and offline-capable.
- **Non-goals:** multiplayer / real-time collaboration (needs a backend); serializing the freeform
  layer into `.kymo`; a future v3-grammar target.

### 4. Stakeholder needs (`SN-CE`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-CE-01` | Authors must be able to edit a kymo diagram **directly on a canvas** (drag, select, inspect), not only by editing `.kymo` text. | The playground was a one-way previewer; a model-driven canvas (`renderSVG` has no per-element ids) is the only way to hit-test/select nodes. |
| `SN-CE-02` | A canvas edit must **round-trip back into the `.kymo` source** so text stays the source of truth, **preserving comments and untouched lines**. | "Sync with file" is the headline goal; no `Diagram → .kymo` serializer existed, and lossy regeneration would degrade hand-authored `.kymo`. |
| `SN-CE-03` | A **freeform whiteboard** (sticky notes, freehand strokes, frames) must coexist with the diagram on the same board — and **never** leak into the `.kymo` text. | The FigJam-like whiteboard half is part of the product; freeform content has no DSL representation (`KYMO-DSL-001` §6), so source-of-truth integrity must hold. |
| `SN-CE-04` | The editor must stay **single-player and static** — deployable as the committed bundle via the existing Pages workflow, with **no backend and no CI build step**. | Preserves the existing deploy model and zero-backend constraint. |
| `SN-CE-05` | Existing playground behaviour must be **preserved** — `?script=` share links keep working, built-in samples load, SVG export and BPMN import work, and edits feel live. | The rewrite must not regress what the previewer already did; existing share links must still load. |
| `SN-CE-06` | The board and camera must **survive a page reload**, and **undo/redo** must work across both layers. | Persistence and undo are baseline editor expectations; kymo shapes re-derive from text and reconcile by id (no duplicates). |

### 5. Scope

**In scope (product level):** the interactive canvas editor — live text→canvas render, canvas→text
round-trip (surgical patch), the coexisting freeform whiteboard, board persistence, undo/redo across
layers, `?script=` compatibility, samples, SVG export, BPMN import — **single-player / static**.
**Out of scope:** multiplayer / real-time collaboration, serializing the freeform layer into `.kymo`,
and a v3-grammar serializer target (the SRS Part C §6 restates these).

---

## Part B — Introduction

### 1. Purpose

The **canvas-editor** feature evolves the kymo web playground (`website/app/`) from a one-way
`.kymo` → SVG previewer into an **interactive canvas editor**: a kymo diagram editable both as
`.kymo` text and directly on a tldraw canvas (two-way synced), coexisting with a freeform
whiteboard — single-player and static.

This folder is documented to the spirit of **ISO/IEC/IEEE 12207** (life-cycle processes), with
information items per **ISO/IEC/IEEE 15289**, requirements per **ISO/IEC/IEEE 29148**, architecture
per **ISO/IEC/IEEE 42010**, quality attributes per **ISO/IEC 25010**, and test structure per
**ISO/IEC/IEEE 29119** — **tailored** to a single-maintainer OSS feature.

### 2. Document map

This feature's docs use a two-layer model in this folder — a **baselined spec** and a **living plan**
(`04-PLAN.md` + `CR/`). The documents for canvas-editor (post 4-file normalization):

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` | `FEAT-CANVAS-001` | *what product problem, whose needs (`SN-CE`), and what must it do? (SRS, `FR-CE`/`NFR-CE`)* |
| 02 | `02-DESIGN.md` | `DESIGN-CANVAS-001` | *how is it built?* |
| 03 | `03-TEST.md` | `TEST-CANVAS-001` | *how do we know it's right? (`TC-NN`)* |
| — | `04-PLAN.md` | `PLAN-CANVAS-001` | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Cross-document references use **`document_id`** (never file paths), so docs can move between layers
without breaking links; the numeric `NN-` prefixes are a reading-order aid only.

### 4. Reading guide

Spec: **`01-REQUIREMENTS`** (this doc — product context, introduction, SRS) →
**`02-DESIGN`** (`DESIGN-CANVAS-001` — architecture, the kymo↔tldraw mapping, sync engine, serializer) →
**`03-TEST`** (`TEST-CANVAS-001` — V&V, `TC-NN`, traceability). For delivery status & history, read
**`PLAN-CANVAS-001`** in `04-PLAN.md`.

Quick paths: *implementer* → Part A → Part C → `04-PLAN`; *reviewer* → Part C → `03-TEST`;
*stakeholder* → Part A → `04-PLAN`.

### 5. Status & ownership

- **Status:** Baselined v1.0 — the spec reflects the delivered feature (Phases 0–4, per
  `PLAN-CANVAS-001`). Further changes go through a change-request → re-baseline.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** every requirement in Part C has ≥ 1 covering test in
  `TEST-CANVAS-001` §5.
- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/canvas-editor/CR/` and re-baselined (bump version + record in Annex A).

---

## Part C — Requirements (SRS)

> This is the **requirements specification** (ISO/IEC/IEEE 12207 §6.4.2/§6.4.3). Each requirement is
> atomic, verifiable, and stably identified so `TEST-CANVAS-001` can trace a test case to it.
> Non-functional requirements are framed by **ISO/IEC 25010** quality characteristics.

### 1. Scope

Requirements for evolving the playground (`website/app/`) into an interactive canvas editor: a kymo
diagram, editable both as `.kymo` text and directly on a tldraw canvas (two-way synced), coexisting
with a freeform whiteboard. Single-player, static. Rationale and phasing: `PLAN-CANVAS-001`.

Stakeholder needs (`SN-CE-01..06`, ISO 29148 §6.4.2 ConOps) are owned by the product description
in **Part A** of this document; each requirement below traces back to them.

### 2. Definitions

- **kymo-diagram layer** — canvas shapes derived from the parsed `Diagram`; bound to `.kymo` text.
- **Freeform layer** — tldraw-native content (sticky notes, draw, frames) with no `.kymo` representation.
- **Round-trip** — a canvas edit re-expressed as `.kymo` text, re-parseable to the same `Diagram`.
- **Source of truth** — `.kymo` text for the diagram layer (only).

### 3. Functional requirements

Each `FR-CE-NN` has an acceptance criterion (AC) and the `DESIGN-CANVAS-001` section that realises it.

| ID | Requirement | Acceptance criterion | Design § |
|----|-------------|----------------------|----------|
| FR-CE-01 | Render `.kymo`/BPMN text to the canvas live | Editing text updates the rendered diagram within one debounce interval; parse errors surface without losing the last good render | §3, §7 |
| FR-CE-02 | Sync canvas edits back to text | Dragging/renaming a kymo shape updates the `.kymo` text such that re-parsing reproduces the change | §7, §8 |
| FR-CE-03 | Two-layer model | kymo-layer shapes are tagged `meta.kymo`; freeform shapes are not; sync only ever touches tagged shapes | §3, §5 |
| FR-CE-04 | Freeform whiteboard tools | User can add sticky notes, freehand strokes, and frames on the same board as the diagram | §3 |
| FR-CE-05 | `Diagram → .kymo` serializer (Tier-1) | `shapesToDsl` emits a conformant `.kymo` that `parseDiagram` accepts; node positions round-trip | §8.1 |
| FR-CE-06 | Surgical patch preserves source (Tier-2) | After moving one node, comments and all untouched lines in `.kymo` are byte-identical | §8.2, §9 |
| FR-CE-07 | `?script=` share compatibility | A link produced by the current playground still loads; new links round-trip the `.kymo` text | §3 (`share.ts`), §11 |
| FR-CE-08 | Sample loading | Built-in samples load into the editor and render | §3 (`samples.ts`) |
| FR-CE-09 | SVG export | User can export the current diagram to a standalone SVG (via `renderSVG`) | §3 |
| FR-CE-10 | BPMN import | A `.bpmn` file parses and renders as today (`parseBpmn`) | §3 |
| FR-CE-11 | Board persistence | Freeform-layer shapes and the camera survive a page reload (tldraw `persistenceKey`); kymo shapes are re-derived from text and reconciled by id (no duplicates), upholding NFR-CE-07 | §3, §7 |
| FR-CE-12 | Undo/redo across layers | Undo/redo reverts freeform edits natively; undoing a kymo-node move returns it to its prior position and the text round-trips (as an explicit `@`, per RK-06) | §7 |

### 4. Non-functional requirements (ISO/IEC 25010)

| ID | Quality characteristic | Requirement | Acceptance criterion | Design § |
|----|------------------------|-------------|----------------------|----------|
| NFR-CE-01 | Performance efficiency | Edits feel live | Debounce ≤ ~220 ms; text→canvas updates apply as an **incremental diff**, not a full wipe-and-recreate | §7, §12 |
| NFR-CE-02 | Compatibility / portability | Static, zero-backend | Deploys as the committed `kymo.bundle.js` via the existing Pages workflow; **no CI build step** | §10 |
| NFR-CE-03 | Reliability | No sync oscillation | A programmatic apply never re-triggers a canvas→text write (no A→B→A); stale async parses are dropped | §7 |
| NFR-CE-04 | Maintainability | Re-targetable serializer | The DSL-emitting logic is isolated to one module so a future v3 grammar is a localised change | §8, RK-04 |
| NFR-CE-05 | Usability | Offline icons | Built-in (vector) icons render with **zero network**; only file-backed icons fetch from the CDN | §6 |
| NFR-CE-06 | Performance / footprint | Bounded bundle | Committed bundle stays within budget (target ≤ ~3 MB); tldraw is lazy-loaded where feasible | §10, RK-03 |
| NFR-CE-07 | Functional correctness (invariant) | Source-of-truth integrity | Freeform-layer content is **never** serialized into `.kymo`; a sticky note never appears in the text | §3, §11 |
| NFR-CE-08 | Usability (interaction capability) | Full-viewport layout | Header + split panes fill **100 % of the viewport** height/width with no dead space at any window size; < 760 px stacks editor/canvas vertically (each pane sharing the height) | §10 |

### 5. Constraints & assumptions

- Tooling: esbuild bundles `.tsx` (automatic JSX); deps are devDeps; `node_modules` git-ignored.
- The `packages/js` public API (`parseDiagram`, `renderSVG`, `getIcon`, model types) is reused as-is.
- tldraw licensing must be resolved before Phase 1 (`PLAN-CANVAS-001` RK-02).
- Serializer targets `KYMO-DSL-001` v2.0 (not a future v3) for now.

### 6. Out of scope

- Multiplayer / real-time collaboration (needs a backend).
- Serializing the freeform layer into `.kymo`.
- A v3-grammar target.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial requirements draft (FEAT-CANVAS-001). |
| 0.2     | 2026-05-23 | Vũ Anh | Added NFR-CE-08 (full-viewport layout) after a Phase-0 regression. |
| 0.3     | 2026-05-23 | Vũ Anh | Added FR-CE-11 (board persistence) for Phase 4. |
| 0.4     | 2026-05-23 | Vũ Anh | Added FR-CE-12 (undo/redo across layers); Phase 4 closed (reduced scope). |
| 1.0     | 2026-05-23 | Vũ Anh | **Baselined** & relocated to `docs/specs/canvas-editor/` (single-source spec; owns FR-CE/NFR-CE ids). |
| 1.1     | 2026-05-25 | Vũ Anh | **Doc reorganization.** Moved §1 stakeholder needs to `FEAT-CANVAS-001` (SN ids feature-scoped, `SN-CE-01..06`); §1 (Scope) now points there. No requirement content changed. |
| 0.1 (PROD) | 2026-05-25 | Vũ Anh | Initial product description (FEAT-CANVAS-001). Derived faithfully from `FEAT-CANVAS-001` §1 (purpose/substrate) and the `FEAT-CANVAS-001` §1 Scope + FR/NFR rationale; minted feature-scoped needs `SN-CE-01..06` — no new scope invented. |
| 0.1 (INTRO) | 2026-05-23 | Vũ Anh | Initial introduction + document map (FEAT-CANVAS-001). |
| 0.2 (INTRO) | 2026-05-23 | Vũ Anh | Map row: PLAN also covers 6.3.2 (Annex C Worklog). |
| 1.0 (INTRO) | 2026-05-23 | Vũ Anh | **Baselined.** Split docs into two layers — Specification (`docs/specs/`) vs Implementation plan (`docs/plans/`, `PLAN-CANVAS-001`); added the ISO management model (baseline/CM, traceability, change-management). |
| 1.1 (INTRO) | 2026-05-25 | Vũ Anh | **Doc reorganization.** §2 trimmed to a document map and adds `00-PRODUCT` (`FEAT-CANVAS-001`); ex-§3 (ISO management) folded into the document map; reading guide + change-management updated; docs consolidated per feature under `docs/specs/`. |
| 1.2     | 2026-06-06 | Vũ Anh | Consolidated FEAT-CANVAS-001 + FEAT-CANVAS-001 + FEAT-CANVAS-001 into single 01-REQUIREMENTS (FEAT-CANVAS-001); 4-file structure normalization. |

## Annex B — Document Control

### B.1 Scope & purpose

This document (`FEAT-CANVAS-001`) is the single consolidated requirements artifact for the
canvas-editor feature. It supersedes the three previously separate files `FEAT-CANVAS-001`
(`00-PRODUCT.md`), `FEAT-CANVAS-001` (`01-INTRO.md`), and `FEAT-CANVAS-001` (`02-FEATURE.md`),
which were merged into this file as part of a 4-file structure normalization on 2026-06-06.

### B.2 Status & lifecycle

- **Status:** Baselined. Changes must be raised as a change-request in `CR/` and result in a
  version bump + Annex A entry.
- **Lifecycle:** ISO/IEC/IEEE 12207 §6.4.2–§6.4.3 (Requirements Definition & Analysis).

### B.3 Related documents

| document_id | Role |
|-------------|------|
| `DESIGN-CANVAS-001` | Architecture and engineering design — how requirements are realized |
| `TEST-CANVAS-001` | V&V plan — how requirements are verified; traceability matrix |
| `PLAN-CANVAS-001` | Implementation plan, risk register, worklog, change-requests |
| `KYMO-DSL-001` | Serializer target grammar (external reference) |

### B.4 Change management

A change to this baselined document is raised as a change-request in
`docs/specs/canvas-editor/CR/` (raise → assess → approve → implement → re-baseline). The
document_id `FEAT-CANVAS-001` is stable; the `version` field and Annex A are updated on each
re-baseline.

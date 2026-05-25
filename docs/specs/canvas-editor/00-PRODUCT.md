---
title: Interactive Canvas Editor — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-CANVAS-001
version: "0.1"
issue_date: 2026-05-25
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for the interactive canvas editor; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-CANVAS-001
  - FEAT-CANVAS-001
  - KYMO-DSL-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - canvas-editor
  - whiteboard
  - round-trip
---

# Interactive Canvas Editor — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-CANVAS-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-CANVAS-001`, `FEAT-CANVAS-001` (the SRS derived from the needs below) |

> This doc owns the `SN-CE-NN` stakeholder
> needs; the SRS (`FEAT-CANVAS-001`) derives `FR-CE`/`NFR-CE` from them.

## 1. Problem & motivation

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

## 2. Users & context of operations (ConOps)

- **Who:** authors of `.kymo`/BPMN diagrams using the client-side playground who want to edit on a
  canvas (drag, select, inspect) as well as in text, with a freeform whiteboard on the same board.
- **Substrate it builds on:** the `packages/js` public API (`parseDiagram`, `parseBpmn`, `renderSVG`,
  `getIcon`, the `Diagram`/`Component`/`Region`/`Edge` model — carrying resolved absolute positions
  after parse) and the existing playground's `?script=` share links and static GitHub-Pages deploy.
- **Constraint:** **single-player / static** — GitHub Pages, no backend; the committed
  `kymo.bundle.js` is what deploys (no CI build step). `.kymo` text stays the source of truth for the
  **diagram layer**; the **freeform layer** (sticky notes, freehand, frames) has no DSL
  representation and persists in the canvas store only.

## 3. Goals & non-goals

- **Goals:** a two-way-synced canvas editor — text→canvas live render, canvas→text round-trip
  (drag/rename a node → update the `.kymo`, byte-preserving comments and untouched lines via a
  surgical patch), a coexisting freeform whiteboard, board persistence, undo/redo across both layers,
  `?script=` share compatibility, samples, SVG export, BPMN import — all static and offline-capable.
- **Non-goals:** multiplayer / real-time collaboration (needs a backend); serializing the freeform
  layer into `.kymo`; a future v3-grammar target.

## 4. Stakeholder needs (`SN-CE`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-CE-01` | Authors must be able to edit a kymo diagram **directly on a canvas** (drag, select, inspect), not only by editing `.kymo` text. | The playground was a one-way previewer; a model-driven canvas (`renderSVG` has no per-element ids) is the only way to hit-test/select nodes. |
| `SN-CE-02` | A canvas edit must **round-trip back into the `.kymo` source** so text stays the source of truth, **preserving comments and untouched lines**. | "Sync with file" is the headline goal; no `Diagram → .kymo` serializer existed, and lossy regeneration would degrade hand-authored `.kymo`. |
| `SN-CE-03` | A **freeform whiteboard** (sticky notes, freehand strokes, frames) must coexist with the diagram on the same board — and **never** leak into the `.kymo` text. | The FigJam-like whiteboard half is part of the product; freeform content has no DSL representation (`KYMO-DSL-001` §6), so source-of-truth integrity must hold. |
| `SN-CE-04` | The editor must stay **single-player and static** — deployable as the committed bundle via the existing Pages workflow, with **no backend and no CI build step**. | Preserves the existing deploy model and zero-backend constraint. |
| `SN-CE-05` | Existing playground behaviour must be **preserved** — `?script=` share links keep working, built-in samples load, SVG export and BPMN import work, and edits feel live. | The rewrite must not regress what the previewer already did; existing share links must still load. |
| `SN-CE-06` | The board and camera must **survive a page reload**, and **undo/redo** must work across both layers. | Persistence and undo are baseline editor expectations; kymo shapes re-derive from text and reconcile by id (no duplicates). |

## 5. Scope

**In scope (product level):** the interactive canvas editor — live text→canvas render, canvas→text
round-trip (surgical patch), the coexisting freeform whiteboard, board persistence, undo/redo across
layers, `?script=` compatibility, samples, SVG export, BPMN import — **single-player / static**.
**Out of scope:** multiplayer / real-time collaboration, serializing the freeform layer into `.kymo`,
and a v3-grammar serializer target (the SRS §6 restates these).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-25 | Vũ Anh | Initial product description. Derived faithfully from `INTRO-CANVAS-001` §1 (purpose/substrate) and the `FEAT-CANVAS-001` §1 Scope + FR/NFR rationale (the feature's `02-FEATURE` §1 is "Scope", not "Stakeholder needs"); minted feature-scoped needs `SN-CE-01..06` — no new scope invented. |

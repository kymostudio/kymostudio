---
title: In-House Canvas Engine — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-ENGINE-001
version: "0.1"
issue_date: 2026-05-25
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for the in-house canvas engine; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-ENGINE-001
  - FEAT-ENGINE-001
  - INTRO-JAM-001
  - FEAT-CANVAS-001
  - DESIGN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - canvas-engine
  - tldraw-replacement
  - vendor-independence
---

# In-House Canvas Engine — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-ENGINE-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-ENGINE-001`, `FEAT-ENGINE-001` (the SRS derived from the needs below) |

> This doc owns the `SN-EN-NN` stakeholder
> needs; the SRS (`FEAT-ENGINE-001`) derives `FR-EN`/`NFR-EN` from them.

## 1. Problem & motivation

The canvas-editor (`PLAN-CANVAS-001`, Phases 0–4, baselined) runs on the **tldraw** SDK. That choice
left one open, accepted limitation — **`RK-02`**: tldraw v5 **requires a license key in production**;
with no key the board renders only on `localhost` and is **blank on the deployed domain**. The public
deploy (`kymostudio.github.io`) is therefore blank today.

This effort removes that dependency by building the **minimal canvas engine** the canvas-editor
actually uses — *not* a tldraw clone. The driving insight (quantified in `DESIGN-ENGINE-001` §3): the
editor consumes a **small, enumerable slice** of the tldraw API. We re-implement exactly that slice
behind a stable adapter seam, then swap the implementation with **no changes to `Board.tsx`, the
custom shapes, or `Inspector.tsx`**. The goal is **vendor independence** — no license key, no
production watermark, no CDN-hosted assets, and a far smaller committed bundle — while preserving the
canvas-editor's behaviour.

## 2. Users & context of operations (ConOps)

- **Who:** users of the deployed public board (today blank) and the canvas-editor that sits on top of
  the canvas substrate; the maintainer who must own the dependency.
- **Substrate it builds on (unchanged):** the canvas-editor requirements (`FEAT-CANVAS-001`) and the
  round-trip design (`DESIGN-CANVAS-001` §5–§9 — the kymo↔shape mapping, `patchDsl`, the sync engine)
  **remain authoritative**. What changes is the substrate they sit on: tldraw's asset/license model
  (`DESIGN-CANVAS-001` §10) and `persistenceKey` (§11) are superseded by the engine's own zero-asset
  persistence.
- **Constraint:** the swap is **incremental and reversible** behind a single adapter seam — never a
  big-bang. This feature is the **render/interaction core** that lands a key-free board (Phases 1–7);
  tldraw stays bundled behind the adapter throughout. The sibling **`canvas-jam`** (`INTRO-JAM-001`)
  completes the replacement (tldraw removal, footprint) and adds the freeform-authoring tools.

## 3. Goals & non-goals

- **Goals:** a render/interaction core — reactive store, editor facade, viewport, custom-shape API,
  pointer interaction, IndexedDB persistence — that makes the public board **render with no license
  key, no watermark, and zero-network assets**, preserving the canvas-editor's round-trip behaviour.
- **Non-goals (deferred to `canvas-jam`):** built-in shape consolidation, undo/redo, board export,
  the **physical tldraw removal + full `TEST-CANVAS-001` parity**, footprint/perf, and the FigJam
  freeform-authoring tools. **Out of scope (whole programme):** multiplayer/CRDT, vector path
  editing, arrow binding/auto-reroute, rich-text styling beyond plain labels.

## 4. Stakeholder needs (`SN-EN`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-EN-01` | The deployed public board must **render** (today it is blank — `RK-02`). | The headline product failure: no-key tldraw blanks the public deploy. |
| `SN-EN-02` | The project must not depend on a **third-party license key**, **watermark**, or **CDN-hosted assets** for the canvas to work. | Vendor independence — own the substrate, render with zero network. |
| `SN-EN-03` | The existing canvas-editor behaviour (two-way `.kymo` sync, freeform layer, persistence, undo) must be **preserved** — no regression in `FEAT-CANVAS-001`. | The engine is a substitution, not a new product; the editor must keep working. |
| `SN-EN-04` | The committed `kymo.bundle.js` should **shrink** materially from the ~2.0 MB tldraw baseline. | A committed-in-git artifact; tldraw bloats the repo and first load. |
| `SN-EN-05` | The swap should be **incremental and reversible** — never a big-bang that breaks the editor for the duration. | De-risks the rewrite; an adapter seam keeps every step shippable. |

## 5. Scope

**In scope (product level):** the render/interaction core — store, editor facade, ShapeUtil,
viewport, interaction, persistence — behind a single adapter seam, making the public board render
with no key. tldraw stays bundled behind the adapter. **Out of scope → sibling `canvas-jam`:**
built-in shape consolidation, undo/redo, board export, the physical tldraw removal + full parity,
footprint, and the freeform-authoring tools (the SRS §5 maps each). **Out of scope (programme):**
multiplayer/CRDT, vector path editing, arrow binding/auto-reroute, rich-text beyond plain labels.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-25 | Vũ Anh | Initial product description. Extracted from `INTRO-ENGINE-001` §1 (purpose/motivation) and `FEAT-ENGINE-001` §1 (stakeholder needs); renamed needs `SN-1..5` → `SN-EN-01..05` (feature-scoped). |

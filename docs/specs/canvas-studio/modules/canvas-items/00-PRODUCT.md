---
title: Canvas Items — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-ITEMS-001
version: "0.1"
issue_date: 2026-05-28
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for on-canvas item styling + selection; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-ITEMS-001
  - INTRO-STUDIO-001
  - PROD-STUDIO-001
  - INTRO-JAM-001
  - INTRO-ENGINE-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - canvas-items
  - item-styling
  - selection-affordances
---

# Canvas Items — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-ITEMS-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-ITEMS-001`, `FEAT-ITEMS-001` (the SRS derived from the needs below — *pending*), `PROD-STUDIO-001` (the umbrella product description these needs re-home from) |

> This doc owns the `SN-IT-NN` stakeholder needs; the SRS (`FEAT-ITEMS-001`, *pending*) will derive
> `FR-IT`/`NFR-IT` from them. The needs **re-home** the item-styling / selection slice of
> `PROD-STUDIO-001` (`SN-CS-03`).

## 1. Problem & motivation

The live playground renders diagrams over the headless engine, but the on-canvas **items** must (a)
carry the kymo **visual language** so the live board agrees with the exported SVG (`renderSVG`), and
(b) give the user clear **selection affordances** when a shape is picked. This is the slice of the
shipped hi-fi Editor that `canvas-studio` delivered as P4 (item styling) + P5 (selection); it is
re-homed here so item visuals have one owner separate from the chrome (`canvas-toolbar`) and the output
(`canvas-export`).

## 2. Users & context of operations (ConOps)

- **Who:** users of the client-side playground who author and arrange `.kymo`/BPMN diagrams and expect
  the board to *look like* the export and to show what is selected.
- **Substrate it builds on (unchanged):** the headless render/interaction **engine**
  (`INTRO-ENGINE-001`, complete) and its shape layer (`engine/shapes.tsx`, `engine/react.tsx`); the
  freeform-tool **capability** (`INTRO-JAM-001`, complete).
- **Constraint:** **client-only**, **golden-safe** — item styling is matched *to* `renderSVG`, never
  modifies it; no new runtime deps.

## 3. Goals & non-goals

- **Goals:** on-canvas items carry the kymo visual language matched to `renderSVG` (`kymo-node` glyph +
  name; `kymo-region` outer-slate / inner-purple-dashed; `kymo-edge` flow-dash); a selected shape shows
  a selection rectangle + corner resize handles + a `W × H` size badge that track a drag.
- **Non-goals (owned elsewhere):** the chrome around the board (`canvas-toolbar`), the export/share of
  the board (`canvas-export`), interactive resize/transform and node/edge **creation**
  (`canvas-create-tools`), and the right inspector panel (`canvas-inspector`). Selection handles are
  **presentational** in the MVP.

## 4. Stakeholder needs (`SN-IT`)

| ID | Need | ⊇ former (canvas-studio) |
|----|------|--------------------------|
| `SN-IT-01` | On-canvas **items** (nodes / regions / edges) must carry the kymo visual language, **matched to the exported `renderSVG`** so the live board agrees with the export. | `SN-CS-03` (styling part) |
| `SN-IT-02` | A **selected** shape must show clear **selection affordances** — a selection rectangle, corner handles, and a `W × H` size badge that track the shape as it is dragged. | `SN-CS-03` (selection part) |

## 5. Scope

**In scope (product level):** on-canvas item styling (node glyph, region styling, edge flow-dash) +
selection affordances (rectangle, handles, size badge) — all **client-only**, **golden-safe**.
**Out of scope:** chrome (`canvas-toolbar`), export/share (`canvas-export`), interactive resize and
creation tools (`canvas-create-tools`), the inspector (`canvas-inspector`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-28 | Vũ Anh | Initial **skeleton** product description for canvas-items. Re-homes the item-styling / selection slice of `PROD-STUDIO-001` `SN-CS-03` → `SN-IT-01`/`SN-IT-02`. AS-BUILT (shipped under canvas-studio P4/P5). The SRS (`FEAT-ITEMS-001`) deriving `FR-IT`/`NFR-IT` is pending. |

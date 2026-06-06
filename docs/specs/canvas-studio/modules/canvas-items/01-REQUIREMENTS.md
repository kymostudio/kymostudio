---
title: Canvas Items — Requirements (ConOps, StRS & Introduction)
document_id: FEAT-ITEMS-001
version: "0.1"
issue_date: 2026-05-28
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for on-canvas item styling + selection; engineers, reviewers, stakeholders
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-STUDIO-001
  - FEAT-TOOLBAR-001
  - FEAT-EXPORT-001
  - FEAT-JAM-001
  - FEAT-ENGINE-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - specification
  - introduction
  - canvas-items
  - item-styling
  - selection-affordances
  - document-map
---

# Canvas Items — Requirements (ConOps, StRS & Introduction)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-ITEMS-001` |
| Version           | 0.1 |
| Status            | Draft — **skeleton** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-STUDIO-001` (umbrella requirements), `FEAT-TOOLBAR-001` (sibling — the chrome frame), `FEAT-EXPORT-001` (sibling — export/share), `FEAT-JAM-001` / `FEAT-ENGINE-001` (the render core, complete) |

> This document consolidates the product description (ConOps & StRS) and specification overview for canvas-items. The full SRS (`FR-IT`/`NFR-IT` requirements) is **pending** — see §B.2 for the planned document map. The `SN-IT-NN` stakeholder needs are defined in Part A and are re-homed from `FEAT-STUDIO-001`.

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

The live playground renders diagrams over the headless engine, but the on-canvas **items** must (a)
carry the kymo **visual language** so the live board agrees with the exported SVG (`renderSVG`), and
(b) give the user clear **selection affordances** when a shape is picked. This is the slice of the
shipped hi-fi Editor that `canvas-studio` delivered as P4 (item styling) + P5 (selection); it is
re-homed here so item visuals have one owner separate from the chrome (`canvas-toolbar`) and the output
(`canvas-export`).

### A.2 Users & context of operations (ConOps)

- **Who:** users of the client-side playground who author and arrange `.kymo`/BPMN diagrams and expect
  the board to *look like* the export and to show what is selected.
- **Substrate it builds on (unchanged):** the headless render/interaction **engine**
  (`FEAT-ENGINE-001`, complete) and its shape layer (`engine/shapes.tsx`, `engine/react.tsx`); the
  freeform-tool **capability** (`FEAT-JAM-001`, complete).
- **Constraint:** **client-only**, **golden-safe** — item styling is matched *to* `renderSVG`, never
  modifies it; no new runtime deps.

### A.3 Goals & non-goals

- **Goals:** on-canvas items carry the kymo visual language matched to `renderSVG` (`kymo-node` glyph +
  name; `kymo-region` outer-slate / inner-purple-dashed; `kymo-edge` flow-dash); a selected shape shows
  a selection rectangle + corner resize handles + a `W × H` size badge that track a drag.
- **Non-goals (owned elsewhere):** the chrome around the board (`canvas-toolbar`), the export/share of
  the board (`canvas-export`), interactive resize/transform and node/edge **creation**
  (`canvas-create-tools`), and the right inspector panel (`canvas-inspector`). Selection handles are
  **presentational** in the MVP.

### A.4 Stakeholder needs (`SN-IT`)

| ID | Need | ⊇ former (canvas-studio) |
|----|------|--------------------------|
| `SN-IT-01` | On-canvas **items** (nodes / regions / edges) must carry the kymo visual language, **matched to the exported `renderSVG`** so the live board agrees with the export. | `SN-CS-03` (styling part) |
| `SN-IT-02` | A **selected** shape must show clear **selection affordances** — a selection rectangle, corner handles, and a `W × H` size badge that track the shape as it is dragged. | `SN-CS-03` (selection part) |

### A.5 Scope

**In scope (product level):** on-canvas item styling (node glyph, region styling, edge flow-dash) +
selection affordances (rectangle, handles, size badge) — all **client-only**, **golden-safe**.
**Out of scope:** chrome (`canvas-toolbar`), export/share (`canvas-export`), interactive resize and
creation tools (`canvas-create-tools`), the inspector (`canvas-inspector`).

---

## Part B — Introduction

### B.1 Purpose & motivation

`canvas-studio` shipped the whole hi-fi editor chrome as one feature (P1–P7). To keep each module under
the maintainer's **≤ 50-SP-per-feature** cap and give each concern one home, `canvas-studio` becomes an
**umbrella** and its IDs are **re-homed** into three sibling modules (the same containment move that
split `canvas-engine`→`canvas-jam`):

- **`canvas-toolbar`** (`FEAT-TOOLBAR-001`) — the chrome frame: top bar, tool rail, status bar.
- **`canvas-export`** (`FEAT-EXPORT-001`) — the editor's output: board→SVG export + URL share.
- **`canvas-items`** (this module) — on-canvas **item styling + selection affordances**.

**This module** owns how on-canvas items *look* and how a *selected* shape is *adorned* — it does not
own the engine's interaction model (that is `canvas-engine` / `canvas-jam`) nor the chrome around the
board (`canvas-toolbar`). As an as-built carve-out it re-homes the relevant `canvas-studio` IDs (see §B.3)
and inherits its golden-safe / client-only contract verbatim.

Documented to the spirit of **ISO/IEC/IEEE 12207**, with requirements per **29148**, architecture per
**42010**, quality attributes per **25010**, test structure per **29119** — tailored to a
single-maintainer OSS module, as the sibling doc-sets.

### B.2 Document map

This module's docs use the two-layer model in this folder — a **baselined spec** and a **living
plan** (`PLAN.md` + `CHANGE-REQUESTS/`). The documents for canvas-items:

| # | File | document_id | Status | Answers |
|---|------|-------------|--------|---------|
| 01 | `01-REQUIREMENTS.md` | `FEAT-ITEMS-001` | authored | *what product problem & whose needs (`SN-IT`)? + where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-ITEMS-001` (SRS section) | **pending** | *what must it do? (SRS, `FR-IT`/`NFR-IT`)* |
| 03 | `03-DESIGN.md` | `DESIGN-ITEMS-001` | **pending** | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-ITEMS-001` | **pending** | *how do we know it's right? (`TC-IT`)* |
| — | `PLAN.md` | `PLAN-ITEMS-001` | **pending** | *why, in what order, at what risk, what's done?* |
| — | `CHANGE-REQUESTS/` | — | as needed | *change-requests against the baseline.* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only.

### B.3 Relationship to the canvas-studio umbrella & siblings

`canvas-items` is a **module of the `canvas-studio` umbrella** (`FEAT-STUDIO-001`), a **sibling of
`canvas-toolbar` and `canvas-export`**, built on the same stack:

```
canvas-studio (FEAT-STUDIO-001)    →  umbrella: the hi-fi editor chrome (shipped P1–P7)
        ├── canvas-toolbar (FEAT-TOOLBAR-001) →  top bar · tool rail · status bar
        ├── canvas-export  (FEAT-EXPORT-001)  →  the editor's OUTPUT: board→SVG + URL share
        └── canvas-items   (this spec)        →  on-canvas item styling + selection affordances
```

**Re-homing summary (from `canvas-studio`)**

The relevant `canvas-studio` IDs are **re-homed** into this module with new `ITEMS` IDs; the umbrella's
studio IDs are the historical source (to be cited via the **⊇ former** columns once the full SRS is
authored):

| Former (canvas-studio) | Re-homed here | What |
|------------------------|---------------|------|
| `FR-CS-04` | `FR-IT-01` | on-canvas item styling matched to `renderSVG` (node glyph; region outer-slate / inner-purple-dashed; edge flow-dash) |
| `FR-CS-05` | `FR-IT-02` | selection rectangle + 4 corner handles + `W × H` size badge in the canvas layer |
| `SN-CS-03` | `SN-IT-01`/`SN-IT-02` | item visual language; clear selection affordances |

- **Built on, unchanged:** the engine's per-record reactivity (`DESIGN-ENGINE-001`) and shape layer
  (`engine/shapes.tsx`, `engine/react.tsx`).
- **Golden-safe boundary:** the DSL renderer `renderSVG` (`packages/js`) is **out of scope and
  untouched** — item styling is matched *to* it, but does not modify it.

### B.4 Reading guide

Spec: **`01-REQUIREMENTS`** (this doc — product context + `SN-IT` needs + introduction) → the full
SRS (`FR-IT`/`NFR-IT` requirements — *pending*). For delivery status & history, read **`PLAN-ITEMS-001`**
(*pending*).

### B.5 Status & ownership

- **Status:** Draft — **skeleton / AS-BUILT.** The behaviour shipped under `canvas-studio` (P4 item
  styling + P5 selection); only `01-REQUIREMENTS` is authored here. Authoring the remaining
  baselined-spec items is tracked against the umbrella plan.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** to hold once the full SRS is authored — every `FR-IT-*` will have ≥ 1
  covering `TC-IT-*`.
- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/canvas-studio/modules/canvas-items/CHANGE-REQUESTS/` and re-baselined (bump version +
  record in Annex A).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-06 | Vũ Anh | **Consolidation.** Merged `00-PRODUCT.md` (FEAT-ITEMS-001) and `01-INTRO.md` (FEAT-ITEMS-001) into this single `01-REQUIREMENTS.md` under minted document_id `FEAT-ITEMS-001`. Part A carries the ConOps/StRS (from FEAT-ITEMS-001, preserving `SN-IT-01`/`SN-IT-02`); Part B carries the overview & introduction (from FEAT-ITEMS-001). Removed `FEAT-ITEMS-001`/`FEAT-ITEMS-001` from `related_documents` (now consolidated here). The full SRS (`FR-IT`/`NFR-IT`) remains pending. |

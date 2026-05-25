---
title: Canvas Jam — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-JAM-001
version: "0.1"
issue_date: 2026-05-25
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for the engine-completion + freeform tools; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-JAM-001
  - FEAT-JAM-001
  - INTRO-ENGINE-001
  - FEAT-CANVAS-001
  - DESIGN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - canvas-jam
  - freeform-authoring
  - tldraw-removal
---

# Canvas Jam — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-JAM-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-JAM-001`, `FEAT-JAM-001` (the SRS derived from the needs below) |

> This doc owns the `SN-J-NN` stakeholder
> needs; the SRS (`FEAT-JAM-001`) derives `FR-J`/`NFR-J` from them.

## 1. Problem & motivation

The in-house canvas-engine programme was **split** to honour the maintainer's **≤ 50-SP-per-feature**
cap (the whole engine was ≈ 91 SP). The render/interaction core — adapter seam → store → ShapeUtil +
viewport → interaction + persistence → a **key-free rendering board** — is the sibling feature
`INTRO-ENGINE-001` (≈ 42 SP), where the public board already renders with no license key but **tldraw
is still bundled behind the adapter**. This feature (≈ 44 SP) picks up there: it *completes* the
tldraw replacement and adds the **FigJam freeform-authoring** tools that tldraw gave for free.

Two things remain after the key-free board: (a) **finish the replacement** — consolidate the built-in
shapes onto custom `kymo-region`/`kymo-edge`, add the undo/redo stack and board export, then **remove
tldraw entirely** and prove the **full** canvas-editor V&V (`TEST-CANVAS-001`, `TC-01..19`) green on
the engine, and shrink the bundle; and (b) **add the FigJam half** — the freeform whiteboard
**authoring** tools (draw/pen, sticky, text) that the kymo "freeform layer" (`DESIGN-CANVAS-001` §3)
currently depends on tldraw to create.

## 2. Users & context of operations (ConOps)

- **Who:** the maintainer who wants the vendor dependency fully gone, and users who want to **author
  freeform content** (draw, sticky notes, text) on the board — the FigJam half — without tldraw.
- **Substrate it builds on (unchanged):** the engine core from `INTRO-ENGINE-001` — reactive store +
  source/history *tagging*, editor facade, geometry, camera/viewport/render, custom-shape API,
  persistence, adapter seam (`DESIGN-ENGINE-001`) — and the canvas-editor's `patchDsl` + sync engine
  (`DESIGN-CANVAS-001`). This feature adds modules on top; it does not re-design the engine.
- **Constraint:** the **entry gate** is the sibling's Phase 7 complete (the key-free board); the
  programme stays **client-only / static** (committed bundle, no CI build). Freeform shapes are
  always freeform-layer (`meta.kymo == null`) and MUST never serialise into `.kymo`. Phased one
  freeform tool at a time so value lands incrementally.

## 3. Goals & non-goals

- **Goals:** complete the tldraw replacement (built-in consolidation, undo/redo, board export,
  **physical tldraw removal + full `TEST-CANVAS-001` parity**, footprint/perf to ~60 fps) and add the
  freeform-authoring tools (draw/pen, sticky, text) — each persisting across reload and never leaking
  into `.kymo`.
- **Non-goals (whole programme):** multiplayer/CRDT; vector (Figma-style) path editing; arrow
  binding/auto-reroute (edges stay static); rich-text styling beyond plain labels; richer FigJam
  primitives (connectors, frames, shape library) — a possible later feature.

## 4. Stakeholder needs (`SN-J`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-J-01` | The project must depend on **no tldraw code at all** — no license key, no watermark, no `@tldraw/assets`, nothing in `package.json` (finishes `RK-02`). | Vendor independence; `RK-02` is only fully retired when tldraw is physically gone. |
| `SN-J-02` | The canvas-editor's **full** behaviour (`FEAT-CANVAS-001`, `TC-01..19` incl. undo and export) must be **preserved** once tldraw is gone — zero regression. | Removal must never break the delivered editor; parity is the gate before deletion. |
| `SN-J-03` | The committed `kymo.bundle.js` should **shrink** materially from the ~2.0 MB tldraw baseline. | A committed-in-git artifact; the point of removing tldraw is a smaller, owned bundle. |
| `SN-J-04` | Users must be able to **author freeform content** (draw, sticky notes, text) on the board — the FigJam half — without tldraw. | The freeform layer depended on tldraw's tools; the product still needs whiteboard authoring. |

## 5. Scope

**In scope (product level):** built-in shape consolidation, undo/redo, board export, the physical
tldraw removal + full `TEST-CANVAS-001` parity, the footprint/perf pass, and the **freeform
authoring tools** (draw/pen, sticky, text). **Out of scope (programme):** multiplayer/CRDT, vector
path editing, arrow binding/auto-reroute, rich-text beyond plain labels, and richer FigJam primitives
(connectors, frames, shape library) — a possible later feature (the SRS §5 restates these).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-25 | Vũ Anh | Initial product description. Extracted from `INTRO-JAM-001` §1 (purpose/motivation) and `FEAT-JAM-001` §1 (stakeholder needs); renamed needs `SN-1..4` → `SN-J-01..04` (feature-scoped). |

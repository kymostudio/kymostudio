---
title: Canvas Studio — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-STUDIO-001
version: "0.2"
issue_date: 2026-05-25
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for the hi-fi editor shell; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-STUDIO-001
  - FEAT-STUDIO-001
  - INTRO-JAM-001
  - INTRO-ENGINE-001
  - FEAT-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - canvas-studio
  - editor-shell
  - hi-fi-ui
---

# Canvas Studio — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-STUDIO-001` |
| Version           | 0.2 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-STUDIO-001`, `FEAT-STUDIO-001` (the SRS derived from the needs below) |

> This doc owns the `SN-CS-NN` stakeholder needs; the SRS (`FEAT-STUDIO-001`) derives `FR-CS`/`NFR-CS`
> from them.

## 1. Problem & motivation

A hi-fi design prototype of a "collaborative diagram studio" exists (React via Babel-standalone, not
wired to logic) showing an **Editor** screen — top bar, left tool rail + bottom toolbar, a white
canvas of richly-styled items, a right inspector, an animation timeline, and a status bar. The
functional substrate is already in the repo and complete, but the live playground (`website/app/`,
`FEAT-CANVAS-001`) still **looks like a bare split-pane**, not a product. What is missing is the
**product chrome** — top bar, tool rail, on-canvas item styling, and status bar — that turns the
playground into the prototype's Editor.

## 2. Users & context of operations (ConOps)

- **Who:** users of the client-side playground who author `.kymo`/BPMN diagrams and want a real
  editor experience in the browser.
- **Substrate it builds on (unchanged):** the headless render/interaction **engine**
  (`INTRO-ENGINE-001`, complete), the freeform-tool **capability** (`INTRO-JAM-001`, complete, tldraw
  removed), and the **playground host** (`FEAT-CANVAS-001`) — a split-pane with a `.kymo`/BPMN
  `<textarea>`, a live `EngineBoard`, `?script=` share links, IndexedDB persistence, static
  GitHub-Pages deploy.
- **Constraint:** **client-only** — no backend, no new runtime deps, the same static deploy. Built as
  one feature (≈ 42 SP) decomposed by the canvas's **UI regions** (top bar, left sidebar, items,
  status bar), each a phase ≤ 10 SP — the same containment move as `canvas-jam`.

## 3. Goals & non-goals

- **Goals:** ship the prototype's hi-fi Editor *chrome* over the existing engine — design-token
  surface, top bar, tool rail, on-canvas item styling + selection affordances, status bar — with full
  light/dark parity and **zero regression** to the DSL renderer (`renderSVG`) and the engine.
- **Non-goals (deferred to named siblings):** the right **inspector** panel
  (`canvas-inspector` — needs a reactive selection signal the engine lacks), the animation
  **timeline** (`canvas-timeline`), node/edge **creation** tools (`canvas-create-tools`), and anything
  needing a **backend** (presence, live cursors, comment threads, account-sharing, dashboard, AI
  prompt→diagram).

## 4. Stakeholder needs (`SN-CS`)

| ID | Need |
|----|------|
| `SN-CS-01` | The playground must look and feel like the hi-fi prototype's **Editor** — a real product chrome (top bar, tool rail, status bar), not a bare split-pane — while staying **client-only**. |
| `SN-CS-02` | The engine's existing tools (select, pan, draw, sticky, text) must be **discoverable** in a tool rail with tooltips + keyboard shortcuts, with room for future creation tools to slot in. |
| `SN-CS-03` | On-canvas **items** (nodes / regions / edges) should carry the prototype's visual language (tile stripe + glyph, dashed container, flowing-dash edge) and show clear **selection affordances**. |
| `SN-CS-04` | Standard editor **actions** (undo/redo, theme, export, share) and persistent **status** (node/edge counts, autosave, zoom, fit) must be one click away in the chrome. |
| `SN-CS-05` | **Zero regression** to the DSL renderer (golden-safe) and the engine; no new runtime deps; the committed-bundle / static-deploy contract is preserved. |

## 5. Scope

**In scope (product level):** the editor chrome — design tokens, top bar, tool rail + bottom toolbar
(wired to existing engine tools), on-canvas item styling + selection handles/size badge, status bar —
all **client-only**. **Out of scope:** the inspector, timeline, creation tools, and all
backend-implying capabilities (see §3 non-goals; the SRS §4 maps each to its sibling spec).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-25 | Vũ Anh | Initial product description. Extracted from `INTRO-STUDIO-001` §1 (purpose/substrate) and `FEAT-STUDIO-001` §1 (stakeholder needs); renamed needs `SN-1..5` → `SN-CS-01..05` (feature-scoped). |
| 0.2     | 2026-05-25 | Vũ Anh | **Renumber for reading order.** Renamed `00-PRODUCT.md` → `02-PRODUCT.md` so the `NN-` prefix follows the actual reading order (`01-INTRO` first); content unchanged. See `INTRO-STUDIO-001` §2. |

---
title: Canvas Toolbar — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-TOOLBAR-001
version: "0.1"
issue_date: 2026-05-27
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for the editor chrome frame; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-TOOLBAR-001
  - INTRO-EXPORT-001
  - INTRO-ITEMS-001
  - INTRO-STUDIO-001
  - FEAT-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - canvas-toolbar
  - editor-chrome
  - top-bar
  - tool-rail
  - status-bar
---

# Canvas Toolbar — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-TOOLBAR-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-TOOLBAR-001`, `FEAT-TOOLBAR-001` (the SRS derived from the needs below), `INTRO-STUDIO-001` (the umbrella the needs were carved from) |

> This doc owns the `SN-TB-NN` stakeholder needs; the SRS (`FEAT-TOOLBAR-001`) derives `FR-TB`/`NFR-TB`
> from them. The needs are **carved from `canvas-studio`** (`SN-CS-*`) and re-homed for the chrome
> frame; the `⊇ former` column records the canvas-studio need each one subsumes.

## 1. Problem & motivation

A hi-fi design prototype of a "collaborative diagram studio" showed an **Editor** screen — top bar,
left tool rail, a white canvas of richly-styled items, a status bar. The live playground
(`website/app/`, `FEAT-CANVAS-001`) once looked like a bare split-pane, not a product. `canvas-studio`
fixed that, shipping the full editor chrome over the complete engine. As that shipped feature is split
into modules, **this module owns the chrome frame** — the top bar, the left tool rail, the status bar,
the design-token surface, and the chrome de-dup / appearance control — i.e. everything around the
canvas that makes the playground look and feel like a product. The on-canvas item styling/selection
(now `canvas-items`) and the export/share capability the top bar hosts (now `canvas-export`) are
sibling modules.

## 2. Users & context of operations (ConOps)

- **Who:** users of the client-side playground who author `.kymo`/BPMN diagrams and want a real
  editor experience in the browser.
- **Substrate it builds on (unchanged):** the headless render/interaction **engine**
  (`INTRO-ENGINE-001`, complete), the freeform-tool **capability** (`INTRO-JAM-001`, complete), and the
  **playground host** (`FEAT-CANVAS-001`) — a split-pane with a `.kymo`/BPMN `<textarea>`, a live
  `EngineBoard`, `?script=` share links, IndexedDB persistence, static GitHub-Pages deploy.
- **Constraint:** **client-only** — no backend, no new runtime deps, the same static deploy. The
  chrome frame shipped as the canvas-studio phases P1 (tokens) / P2 (top bar) / P3 (tool rail) /
  P6 (status bar) / P7 (chrome de-dup), each ≤ 10 SP.

## 3. Goals & non-goals

- **Goals:** the prototype's hi-fi Editor *chrome frame* over the existing engine — a design-token
  surface, a top bar, a left tool rail, a status bar, and a single appearance control — with full
  light/dark parity and **zero regression** to the DSL renderer (`renderSVG`) and the engine.
- **Non-goals (owned by siblings / deferred):** the on-canvas **item styling + selection** affordances
  (`canvas-items`, `FEAT-ITEMS-001`), the **export/share** behaviour the top bar hosts
  (`canvas-export`, `FEAT-EXPORT-001`), the right **inspector** panel (`canvas-inspector` — needs a
  reactive selection signal the engine lacks), the animation **timeline** (`canvas-timeline`), node/edge
  **creation** tools (`canvas-create-tools`), and anything needing a **backend** (presence, live
  cursors, comment threads, account-sharing, dashboard, AI prompt→diagram).

## 4. Stakeholder needs (`SN-TB`)

| ID | Need | ⊇ former |
|----|------|----------|
| `SN-TB-01` | The playground must look and feel like the hi-fi prototype's **Editor** chrome — a real product frame (top bar, tool rail, status bar), not a bare split-pane — while staying **client-only**. | ⊇ `SN-CS-01` |
| `SN-TB-02` | The engine's existing tools (select, pan, draw, sticky, text) must be **discoverable** in a tool rail with tooltips + keyboard shortcuts, with room for future creation tools to slot in. | ⊇ `SN-CS-02` |
| `SN-TB-03` | Standard editor **actions** (undo/redo, theme/appearance) and persistent **status** (node/edge counts, autosave, zoom, fit) must be one click away in the chrome. *(Export/share is hosted in the top bar but owned by `canvas-export`.)* | ⊇ `SN-CS-04` (partial — export/share re-homed) |
| `SN-TB-04` | **Zero regression** to the DSL renderer (golden-safe) and the engine; no new runtime deps; the committed-bundle / static-deploy contract is preserved. | ⊇ `SN-CS-05` |

## 5. Scope

**In scope (product level):** the editor chrome frame — design tokens, top bar, tool rail (wired to
existing engine tools), status bar (counts, autosave, zoom, fit), and the chrome de-dup / 3-mode
appearance control — all **client-only**. **Out of scope:** the on-canvas item styling/selection
(`canvas-items`), the export/share behaviour (`canvas-export`), and the inspector / timeline /
creation tools / backend-implying capabilities (see §3 non-goals; the SRS §4 maps each to its
sibling spec).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-27 | Vũ Anh | Initial product description. Carved from `PROD-STUDIO-001` via the canvas-studio umbrella decomposition; re-homes `SN-CS-01/02/04/05` → `SN-TB-01..04` (chrome-frame scope). `SN-CS-03` (item styling/selection) re-homes to `canvas-items`; the export/share half of `SN-CS-04` re-homes to `canvas-export`. As-built. |

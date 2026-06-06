---
title: Canvas Toolbar — Requirements (ConOps, StRS & Introduction)
document_id: FEAT-TOOLBAR-001
version: "0.1"
issue_date: 2026-05-27
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for the editor chrome frame; engineers, reviewers, stakeholders
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-STUDIO-001
  - FEAT-EXPORT-001
  - FEAT-ITEMS-001
  - FEAT-CANVAS-001
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
  - canvas-toolbar
  - editor-chrome
  - top-bar
  - tool-rail
  - status-bar
  - document-map
---

# Canvas Toolbar — Requirements (ConOps, StRS & Introduction)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-TOOLBAR-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-STUDIO-001` (the umbrella the needs were carved from), `FEAT-EXPORT-001` (sibling — export/share), `FEAT-ITEMS-001` (sibling — item styling/selection), `FEAT-CANVAS-001` (the playground host) |

> This document consolidates the product description (ConOps & StRS) and specification overview for canvas-toolbar. It owns the `SN-TB-NN` stakeholder needs. The full SRS (`FR-TB`/`NFR-TB`) is held in `02-FEATURE.md` per the document map.

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

A hi-fi design prototype of a "collaborative diagram studio" showed an **Editor** screen — top bar,
left tool rail, a white canvas of richly-styled items, a status bar. The live playground
(`website/app/`, `FEAT-CANVAS-001`) once looked like a bare split-pane, not a product. `canvas-studio`
fixed that, shipping the full editor chrome over the complete engine. As that shipped feature is split
into modules, **this module owns the chrome frame** — the top bar, the left tool rail, the status bar,
the design-token surface, and the chrome de-dup / appearance control — i.e. everything around the
canvas that makes the playground look and feel like a product. The on-canvas item styling/selection
(now `canvas-items`) and the export/share capability the top bar hosts (now `canvas-export`) are
sibling modules.

### A.2 Users & context of operations (ConOps)

- **Who:** users of the client-side playground who author `.kymo`/BPMN diagrams and want a real
  editor experience in the browser.
- **Substrate it builds on (unchanged):** the headless render/interaction **engine**
  (`FEAT-ENGINE-001`, complete), the freeform-tool **capability** (`FEAT-JAM-001`, complete), and the
  **playground host** (`FEAT-CANVAS-001`) — a split-pane with a `.kymo`/BPMN `<textarea>`, a live
  `EngineBoard`, `?script=` share links, IndexedDB persistence, static GitHub-Pages deploy.
- **Constraint:** **client-only** — no backend, no new runtime deps, the same static deploy. The
  chrome frame shipped as the canvas-studio phases P1 (tokens) / P2 (top bar) / P3 (tool rail) /
  P6 (status bar) / P7 (chrome de-dup), each ≤ 10 SP.

### A.3 Goals & non-goals

- **Goals:** the prototype's hi-fi Editor *chrome frame* over the existing engine — a design-token
  surface, a top bar, a left tool rail, a status bar, and a single appearance control — with full
  light/dark parity and **zero regression** to the DSL renderer (`renderSVG`) and the engine.
- **Non-goals (owned by siblings / deferred):** the on-canvas **item styling + selection** affordances
  (`canvas-items`, `FEAT-ITEMS-001`), the **export/share** behaviour the top bar hosts
  (`canvas-export`, `FEAT-EXPORT-001`), the right **inspector** panel (`canvas-inspector` — needs a
  reactive selection signal the engine lacks), the animation **timeline** (`canvas-timeline`), node/edge
  **creation** tools (`canvas-create-tools`), and anything needing a **backend** (presence, live
  cursors, comment threads, account-sharing, dashboard, AI prompt→diagram).

### A.4 Stakeholder needs (`SN-TB`)

| ID | Need | ⊇ former |
|----|------|----------|
| `SN-TB-01` | The playground must look and feel like the hi-fi prototype's **Editor** chrome — a real product frame (top bar, tool rail, status bar), not a bare split-pane — while staying **client-only**. | ⊇ `SN-CS-01` |
| `SN-TB-02` | The engine's existing tools (select, pan, draw, sticky, text) must be **discoverable** in a tool rail with tooltips + keyboard shortcuts, with room for future creation tools to slot in. | ⊇ `SN-CS-02` |
| `SN-TB-03` | Standard editor **actions** (undo/redo, theme/appearance) and persistent **status** (node/edge counts, autosave, zoom, fit) must be one click away in the chrome. *(Export/share is hosted in the top bar but owned by `canvas-export`.)* | ⊇ `SN-CS-04` (partial — export/share re-homed) |
| `SN-TB-04` | **Zero regression** to the DSL renderer (golden-safe) and the engine; no new runtime deps; the committed-bundle / static-deploy contract is preserved. | ⊇ `SN-CS-05` |

### A.5 Scope

**In scope (product level):** the editor chrome frame — design tokens, top bar, tool rail (wired to
existing engine tools), status bar (counts, autosave, zoom, fit), and the chrome de-dup / 3-mode
appearance control — all **client-only**. **Out of scope:** the on-canvas item styling/selection
(`canvas-items`), the export/share behaviour (`canvas-export`), and the inspector / timeline /
creation tools / backend-implying capabilities (see §A.3 non-goals; the SRS §4 maps each to its
sibling spec).

---

## Part B — Introduction

### B.1 Purpose & motivation

`canvas-studio` re-skinned the bare playground split-pane into the hi-fi prototype's **Editor** —
top bar, left tool rail, richly-styled canvas items, status bar — client-only, over the unchanged
engine. It shipped complete (P1–P7). To keep the roadmap manageable, the maintainer is splitting that
shipped feature into **three sibling modules**, mirroring how `canvas-engine` re-homed `FR-EN-06 →
FR-J-01` into `canvas-jam` at the ≤ 50-SP-per-feature cap:

- **`canvas-toolbar`** (this module) — the **chrome frame**: design tokens/theming, the top bar, the
  left tool rail, the status bar, and the chrome de-dup / 3-mode appearance control.
- **`canvas-export`** (`FEAT-EXPORT-001`) — the **export/share capability**: board/DSL export and
  the `?script=` share link. The toolbar *renders* the Export/Share buttons in the top bar, but their
  **behaviour is owned there**.
- **`canvas-items`** (`FEAT-ITEMS-001`) — the on-canvas **item styling + selection affordances**.

This module is the surrounding **chrome** only; it never re-designs the engine and never touches the
DSL renderer. As an as-built carve-out it re-homes the relevant `canvas-studio` IDs (see §B.3) and
inherits its golden-safe / client-only contract verbatim.

Documented to the spirit of **ISO/IEC/IEEE 12207**, with requirements per **29148**, architecture
per **42010**, quality attributes per **25010**, test structure per **29119** — tailored to a
single-maintainer OSS module, as the sibling doc-sets.

### B.2 Document map

This module's docs use the two-layer model in this folder — a **baselined spec** and a **living
plan** (`PLAN.md` + `CHANGE-REQUESTS/`). The documents for canvas-toolbar:

| # | File | document_id | Answers |
|---|------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` | `FEAT-TOOLBAR-001` | *what product problem & whose needs (`SN-TB`)? + where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-TOOLBAR-001` (SRS) | *what must it do? (SRS, `FR-TB`/`NFR-TB`)* |
| 03 | `03-DESIGN.md` | `DESIGN-TOOLBAR-001` | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-TOOLBAR-001` | *how do we know it's right? (`TC-TB`)* |
| — | `PLAN.md` | `PLAN-TOOLBAR-001` | *why, in what order, at what risk, what's done?* |
| — | `CHANGE-REQUESTS/` | — | *change-requests against the baseline (raise → assess → re-baseline).* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only.

### B.3 Relationship to the canvas-studio umbrella & sibling modules

`canvas-toolbar` is a **module of the `canvas-studio` umbrella** (`FEAT-STUDIO-001`), a **sibling of
`canvas-export` (`FEAT-EXPORT-001`) and `canvas-items` (`FEAT-ITEMS-001`)**, built on the same stack
canvas-studio sat over:

```
canvas-engine  (FEAT-ENGINE-001)  →  headless render/interaction core           [complete]
        ↓ builds on
canvas-jam     (FEAT-JAM-001)      →  freeform-tool capability; tldraw removed   [complete]
        ↓ builds on
canvas-studio  (FEAT-STUDIO-001)    →  UMBRELLA — the hi-fi editor shell, shipped [umbrella]
        ├── canvas-toolbar (this)   →  the editor CHROME FRAME                     [as-built]
        ├── canvas-export           →  export/share capability (FR-EX-*)           [as-built]
        └── canvas-items            →  on-canvas item styling + selection          [as-built]
```

- **Built on, unchanged:** the engine's store/editor/camera/per-record reactivity
  (`DESIGN-ENGINE-001`), the freeform tools + `toSvg` export (`DESIGN-JAM-001`), and the playground's
  sync engine + `patchDsl` + persistence (`FEAT-CANVAS-001`). This module **owns the React chrome
  frame** only; it does not re-design the engine.
- **`canvas-studio` is NOT renamed — it becomes the umbrella.** Its `…-STUDIO-001` `document_id`s
  stay; the three modules are new siblings, the same containment move that split
  `canvas-engine` → `canvas-jam` at the ≤ 50-SP cap.
- **Cross-module dependency:** the top bar **hosts** the Export/Share buttons, but the export/share
  **feature** is owned by `canvas-export` (`FEAT-EXPORT-001`, `FR-EX-01`/`FR-EX-02`) — the toolbar
  renders the buttons; their behaviour is specified there. On-canvas item styling/selection is owned
  by `canvas-items` (`FEAT-ITEMS-001`).
- **Golden-safe boundary:** the DSL renderer `renderSVG` (`packages/js`) is **out of scope and
  untouched** — `canvas-toolbar` only adds chrome.

**Re-homing summary (from `canvas-studio`)**

The relevant `canvas-studio` IDs are **re-homed** into this module with new IDs; `FEAT-STUDIO-001`
retired them for the chrome-frame surface:

| Former (canvas-studio) | Re-homed here | What |
|------------------------|---------------|------|
| `FR-CS-01` | `FR-TB-01` | design-token surface + light/dark parity (`[data-theme]`) |
| `FR-CS-02` | `FR-TB-02` | top bar (brand, editable title, Code toggle, undo/redo, theme) |
| `FR-CS-03` | `FR-TB-03` | left tool rail + registry + V/H/P/S/T shortcuts |
| `FR-CS-06` | `FR-TB-04` | status bar (counts · autosave · zoom · Fit) |
| `FR-CS-07` | `FR-TB-05` | chrome de-dup — one owner per control; 3-mode appearance |

`FR-CS-04`/`FR-CS-05` (item styling, selection) re-home to **`canvas-items`**; the export/share
behaviour the top bar hosts re-homes to **`canvas-export`** (`FR-EX-01`/`FR-EX-02`). `NFR-CS-01..05`
→ `NFR-TB-01..05`, `SN-CS-*` → `SN-TB-*`, `TC-CS-*` → `TC-TB-*` (see `FEAT/TEST-TOOLBAR-001`).

### B.4 Reading guide

Spec: **`01-REQUIREMENTS`** (this doc — product context + `SN-TB` needs + overview) →
**`02-FEATURE`** (the `FR-TB`/`NFR-TB` requirements + the re-homing map) → **`03-DESIGN`** (tokens, top
bar, tool rail, status bar, chrome consolidation) → **`04-TEST`** (V&V, `TC-TB-NN`, golden-safety,
traceability). For delivery status & history, read **`PLAN-TOOLBAR-001`**.

Quick paths: *implementer* → Part A → `02-FEATURE` → `03-DESIGN` → `PLAN`; *reviewer* → `02-FEATURE` →
`04-TEST`; *stakeholder* → Part A → `PLAN`.

### B.5 Status & ownership

- **Status:** Draft — **as-built**. The chrome frame shipped under `canvas-studio` (P1/P2/P3/P6/P7);
  these docs document what exists, re-homed. No new code is implied by the carve-out.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** every requirement in `FEAT-TOOLBAR-001` has ≥ 1 covering test in
  `TEST-TOOLBAR-001`.
- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/canvas-studio/modules/canvas-toolbar/CHANGE-REQUESTS/` and re-baselined (bump version + record in Annex A). The two
  open/closed CRs migrating from canvas-studio are logged there.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-06 | Vũ Anh | **Consolidation.** Merged `00-PRODUCT.md` (FEAT-TOOLBAR-001) and `01-INTRO.md` (FEAT-TOOLBAR-001) into this single `01-REQUIREMENTS.md` under minted document_id `FEAT-TOOLBAR-001`. Part A carries the ConOps/StRS (from FEAT-TOOLBAR-001, preserving `SN-TB-01..04`); Part B carries the overview & introduction (from FEAT-TOOLBAR-001). Removed `FEAT-TOOLBAR-001`/`FEAT-TOOLBAR-001` from `related_documents` (now consolidated here). |

## Annex B — FEAT-TOOLBAR-001 Revision History (merged)

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-27 | Vũ Anh | Initial introduction + document map for canvas-toolbar — the editor **chrome frame** (tokens, top bar, tool rail, status bar, chrome de-dup) carved out of `canvas-studio` (`FEAT-STUDIO-001`) via an umbrella + re-home decomposition; sibling of `canvas-export` / `canvas-items`. As-built (P1/P2/P3/P6/P7 shipped under canvas-studio); re-homes `FR-CS-01/02/03/06/07 → FR-TB-01..05`. |
| 0.2     | 2026-05-28 | Vũ Anh | **Restructure to repo-norm layout.** Realigned the module files to the repo's canonical order (`02-PRODUCT`→`00-PRODUCT`, `03-FEATURE`→`02-FEATURE`, `04-DESIGN`→`03-DESIGN`, `05-TEST`→`04-TEST`, `06-PLAN`→`PLAN.md`); the module now lives under `docs/specs/canvas-studio/modules/canvas-toolbar/`. Updated §2 document map + §4 reading guide + the self-paths. `document_id`s unchanged. See `FEAT-STUDIO-001` Annex B 0.4. |

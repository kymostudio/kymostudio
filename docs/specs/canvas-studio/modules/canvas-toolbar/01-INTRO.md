---
title: Canvas Toolbar — Specification: Overview & Document Map
document_id: INTRO-TOOLBAR-001
version: "0.2"
issue_date: 2026-05-27
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone new to the canvas-toolbar module; engineers, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - PROD-TOOLBAR-001
  - INTRO-EXPORT-001
  - INTRO-ITEMS-001
  - INTRO-STUDIO-001
  - INTRO-JAM-001
  - INTRO-ENGINE-001
authors:
  - Vũ Anh
language: en
keywords:
  - specification
  - introduction
  - index
  - reading-guide
  - canvas-toolbar
  - editor-chrome
  - top-bar
  - tool-rail
  - status-bar
  - document-map
---

# Canvas Toolbar — Specification: Overview & Document Map

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | INTRO-TOOLBAR-001                                                |
| Version           | 0.2                                                              |
| Issue Date        | 2026-05-27                                                       |
| Status            | Draft                                                            |
| Classification    | Internal                                                         |
| Owner             | `diagrams/` project                                              |
| Related Documents | `PROD-TOOLBAR-001`, `FEAT-TOOLBAR-001`, `DESIGN-TOOLBAR-001`, `TEST-TOOLBAR-001`, `PLAN-TOOLBAR-001`, `INTRO-EXPORT-001` (sibling), `INTRO-ITEMS-001` (sibling), `INTRO-STUDIO-001` (the umbrella), `INTRO-JAM-001` / `INTRO-ENGINE-001` (the render core, complete) |

> Start here. This folder (`docs/specs/canvas-studio/modules/canvas-toolbar/`) specifies the editor **chrome frame** of the
> live playground (`website/app/`, `FEAT-CANVAS-001`): the design-token surface, the top bar, the left
> tool rail, the status bar, and the chrome de-dup / 3-mode appearance control. It is a **module
> carved out of `canvas-studio` (`INTRO-STUDIO-001`)** — the hi-fi editor shell, which is being split
> into three sibling modules (`canvas-toolbar`, `canvas-export`, `canvas-items`) so the roadmap is
> easier to manage. The chrome already **shipped** under canvas-studio (phases P1/P2/P3/P6/P7), so
> these docs are **AS-BUILT** — they document what exists, re-homed under new IDs. The implementation
> plan (phases, risks, worklog) lives in `PLAN-TOOLBAR-001`.

---

## 1. Purpose & motivation

`canvas-studio` re-skinned the bare playground split-pane into the hi-fi prototype's **Editor** —
top bar, left tool rail, richly-styled canvas items, status bar — client-only, over the unchanged
engine. It shipped complete (P1–P7). To keep the roadmap manageable, the maintainer is splitting that
shipped feature into **three sibling modules**, mirroring how `canvas-engine` re-homed `FR-EN-06 →
FR-J-01` into `canvas-jam` at the ≤ 50-SP-per-feature cap:

- **`canvas-toolbar`** (this module) — the **chrome frame**: design tokens/theming, the top bar, the
  left tool rail, the status bar, and the chrome de-dup / 3-mode appearance control.
- **`canvas-export`** (`INTRO-EXPORT-001`) — the **export/share capability**: board/DSL export and
  the `?script=` share link. The toolbar *renders* the Export/Share buttons in the top bar, but their
  **behaviour is owned here**.
- **`canvas-items`** (`INTRO-ITEMS-001`) — the on-canvas **item styling + selection affordances**.

This module is the surrounding **chrome** only; it never re-designs the engine and never touches the
DSL renderer. As an as-built carve-out it re-homes the relevant `canvas-studio` IDs (see §3) and
inherits its golden-safe / client-only contract verbatim.

Documented to the spirit of **ISO/IEC/IEEE 12207**, with requirements per **29148**, architecture
per **42010**, quality attributes per **25010**, test structure per **29119** — tailored to a
single-maintainer OSS module, as the sibling doc-sets.

## 2. Document map

This module's docs use the two-layer model in this folder — a **baselined spec** (`00-PRODUCT`–`04-TEST`)
and a **living plan** (`PLAN.md` + `CHANGE-REQUESTS/`). The documents for canvas-toolbar:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 00 | `00-PRODUCT.md` | `PROD-TOOLBAR-001` | *what product problem & whose needs (`SN-TB`)?* |
| 01 | `01-INTRO.md` | `INTRO-TOOLBAR-001` | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-TOOLBAR-001` | *what must it do? (SRS, `FR-TB`/`NFR-TB`)* |
| 03 | `03-DESIGN.md` | `DESIGN-TOOLBAR-001` | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-TOOLBAR-001` | *how do we know it's right? (`TC-TB`)* |
| — | `PLAN.md` | `PLAN-TOOLBAR-001` | *why, in what order, at what risk, what's done?* |
| — | `CHANGE-REQUESTS/` | — | *change-requests against the baseline (raise → assess → re-baseline).* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only.

## 3. Relationship to the canvas-studio umbrella & sibling modules

`canvas-toolbar` is a **module of the `canvas-studio` umbrella** (`INTRO-STUDIO-001`), a **sibling of
`canvas-export` (`INTRO-EXPORT-001`) and `canvas-items` (`INTRO-ITEMS-001`)**, built on the same stack
canvas-studio sat over:

```
canvas-engine  (INTRO-ENGINE-001)  →  headless render/interaction core           [complete]
        ↓ builds on
canvas-jam     (INTRO-JAM-001)      →  freeform-tool capability; tldraw removed   [complete]
        ↓ builds on
canvas-studio  (INTRO-STUDIO-001)   →  UMBRELLA — the hi-fi editor shell, shipped [umbrella]
        ├── canvas-toolbar (this)   →  the editor CHROME FRAME                     [as-built]
        ├── canvas-export           →  export/share capability (FR-EX-*)          [as-built]
        └── canvas-items            →  on-canvas item styling + selection         [as-built]
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

### Re-homing summary (from `canvas-studio`)

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
→ `NFR-TB-01..05`, `SN-CS-*` → `SN-TB-*`, `TC-CS-*` → `TC-TB-*` (see `PROD/FEAT/TEST-TOOLBAR-001`).

## 4. Reading guide

Spec: **`00-PRODUCT`** (the product context + `SN-TB` needs) → **`01-INTRO`** (this doc) →
**`02-FEATURE`** (the `FR-TB`/`NFR-TB` requirements + the re-homing map) → **`03-DESIGN`** (tokens, top
bar, tool rail, status bar, chrome consolidation) → **`04-TEST`** (V&V, `TC-TB-NN`, golden-safety,
traceability). For delivery status & history, read **`PLAN-TOOLBAR-001`**.

Quick paths: *implementer* → 00 → 02 → 03 → PLAN; *reviewer* → 02 → 04; *stakeholder* → 00 → PLAN.

## 5. Status & ownership

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

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-27 | Vũ Anh | Initial introduction + document map for canvas-toolbar — the editor **chrome frame** (tokens, top bar, tool rail, status bar, chrome de-dup) carved out of `canvas-studio` (`INTRO-STUDIO-001`) via an umbrella + re-home decomposition; sibling of `canvas-export` / `canvas-items`. As-built (P1/P2/P3/P6/P7 shipped under canvas-studio); re-homes `FR-CS-01/02/03/06/07 → FR-TB-01..05`. |
| 0.2     | 2026-05-28 | Vũ Anh | **Restructure to repo-norm layout.** Realigned the module files to the repo's canonical order (`02-PRODUCT`→`00-PRODUCT`, `03-FEATURE`→`02-FEATURE`, `04-DESIGN`→`03-DESIGN`, `05-TEST`→`04-TEST`, `06-PLAN`→`PLAN.md`); the module now lives under `docs/specs/canvas-studio/modules/canvas-toolbar/`. Updated §2 document map + §4 reading guide + the self-paths. `document_id`s unchanged. See `INTRO-STUDIO-001` Annex A 0.4. |

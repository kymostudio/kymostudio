---
title: Canvas Export — Specification: Overview & Document Map
document_id: INTRO-EXPORT-001
version: "0.2"
issue_date: 2026-05-27
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone new to the canvas-export module; engineers, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - PROD-EXPORT-001
  - FEAT-EXPORT-001
  - INTRO-TOOLBAR-001
  - INTRO-ITEMS-001
  - INTRO-STUDIO-001
  - INTRO-JAM-001
  - DESIGN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - specification
  - introduction
  - index
  - reading-guide
  - canvas-export
  - svg-export
  - url-share
  - document-map
---

# Canvas Export — Specification: Overview & Document Map

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | INTRO-EXPORT-001                                                  |
| Version           | 0.2                                                              |
| Issue Date        | 2026-05-27                                                       |
| Status            | Draft                                                           |
| Classification    | Internal                                                        |
| Owner             | `diagrams/` project                                            |
| Related Documents | `PROD-EXPORT-001`, `FEAT-EXPORT-001`, `DESIGN-EXPORT-001`, `TEST-EXPORT-001`, `PLAN-EXPORT-001`, `INTRO-STUDIO-001` (umbrella), `INTRO-TOOLBAR-001` (sibling), `INTRO-ITEMS-001` (sibling) |

> Start here. This folder (`docs/specs/canvas-studio/modules/canvas-export/`) specifies the editor's **output** — the one
> way to get a diagram *out* of the playground: **export the board to SVG** (a single entry point) and
> **share it via a `?script=` URL**. It is a small module **carved out of `canvas-studio`**
> (`INTRO-STUDIO-001`) — the shipped, baselined hi-fi editor chrome — when that feature was split into
> three siblings. The behaviour already exists in `website/app/` (it shipped under canvas-studio P2 +
> P7), so this doc-set is **AS-BUILT**: it re-homes the Export/Share parts of the studio requirements
> into a self-contained module with its own `EXPORT` IDs.

---

## 1. Purpose & motivation

`canvas-studio` (`INTRO-STUDIO-001`) shipped the whole hi-fi editor chrome — top bar, tool rail,
on-canvas item styling, status bar, and the editor's output (Export/Share) — as one feature (P1–P7).
To keep each module under the maintainer's **≤ 50-SP-per-feature** cap and give each concern one
home, `canvas-studio` becomes an **umbrella** and its IDs are **re-homed** into three sibling modules
(the same containment move that split `canvas-engine`→`canvas-jam`):

- **`canvas-toolbar`** (`INTRO-TOOLBAR-001`) — the top bar + tool rail + status-bar chrome.
- **`canvas-export`** (this module, ≈ 3 SP) — the editor's **output**: board→SVG export + URL share.
- **`canvas-items`** (`INTRO-ITEMS-001`) — on-canvas item styling + selection affordances.

**This module** owns the *behaviour* of the editor's output. It does **not** own the buttons'
chrome: the top bar renders the **Export** and **Share** buttons (`canvas-toolbar`,
`FEAT-TOOLBAR-001`); this module owns what those buttons *do* — `onDownload` (export the live board
to SVG, with a DSL-render fallback, downloading `diagram.svg`) and `onShare` (compress the source
into a `?script=` link, copied to the clipboard). It is built on **canvas-jam's** board export
`toSvg` aggregation (`INTRO-JAM-001` / `DESIGN-JAM-001` §4) over the headless **engine**
(`INTRO-ENGINE-001`) and the **playground host** (`FEAT-CANVAS-001`). **Golden-safe boundary:** the
DSL renderer `renderSVG` (`packages/js`) is **untouched and out of scope** — only the *fallback*
calls it; the live-board path goes through the engine's `toSvg`.

Documented to the spirit of **ISO/IEC/IEEE 12207**, with requirements per **29148**, architecture
per **42010**, quality attributes per **25010**, test structure per **29119** — tailored to a
single-maintainer OSS module, exactly as the umbrella + sibling doc-sets.

## 2. Document map

This module's docs use the two-layer model in this folder — a **baselined spec** (`00-PRODUCT`–`04-TEST`)
and a **living plan** (`PLAN.md` + `CHANGE-REQUESTS/`). The documents for canvas-export:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 00 | `00-PRODUCT.md` | `PROD-EXPORT-001` | *what product problem & whose needs (`SN-EX`)?* |
| 01 | `01-INTRO.md` | `INTRO-EXPORT-001` | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-EXPORT-001` | *what must it do? (SRS, `FR-EX`/`NFR-EX`)* |
| 03 | `03-DESIGN.md` | `DESIGN-EXPORT-001` | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-EXPORT-001` | *how do we know it's right? (`TC-EX`)* |
| — | `PLAN.md` | `PLAN-EXPORT-001` | *why, in what order, at what risk, what's done?* |
| — | `CHANGE-REQUESTS/` | — | *change-requests against the baseline (raise → assess → re-baseline).* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only.

## 3. Relationship to the canvas-studio umbrella & siblings

`canvas-export` is a **module of the `canvas-studio` umbrella**, not a new product — it owns one
slice of the chrome that already shipped:

```
canvas-studio (INTRO-STUDIO-001)   →  umbrella: the hi-fi editor chrome (shipped P1–P7)
        ├── canvas-toolbar (INTRO-TOOLBAR-001) →  top bar · tool rail · status bar
        ├── canvas-export  (this spec)         →  the editor's OUTPUT: board→SVG + URL share
        └── canvas-items   (INTRO-ITEMS-001)   →  on-canvas item styling + selection
```

- **Re-homed, not re-invented:** this module **re-homes** the Export/Share parts of the studio
  requirements with new `EXPORT` IDs — the Export part of `FR-CS-02` + the single-Export of
  `FR-CS-07` → `FR-EX-01`; the Share part of `FR-CS-02` → `FR-EX-02`; `NFR-CS-03`/`NFR-CS-04` →
  `NFR-EX-01`/`NFR-EX-02`; `SN-CS-04` (partial) / `SN-CS-05` → `SN-EX-01`/`SN-EX-02`. `FEAT-EXPORT-001`
  owns these IDs; the umbrella's studio IDs are the historical source (cited via the **⊇ former**
  columns).
- **Built on, unchanged:** the design reuses **canvas-jam's** board export `toSvg` aggregation
  (`INTRO-JAM-001` / `DESIGN-JAM-001` §4) over the headless engine (`INTRO-ENGINE-001`), and the
  playground host's sync engine + `onShare`/`onDownload` plumbing (`FEAT-CANVAS-001`,
  `DESIGN-CANVAS-001`).
- **Button-render seam:** the **buttons** are rendered by the top bar (`canvas-toolbar`,
  `INTRO-TOOLBAR-001`); this module owns only their **behaviour** (the handlers). The top bar merely
  wires `onExport`/`onShare` to the handlers this module defines.
- **Golden-safe boundary:** the DSL renderer `renderSVG` (`packages/js`) is **out of scope and
  untouched** — only the fallback path reads its bytes; the live-board export goes through the
  engine's `toSvg`. The Figma / Excalidraw / WebP exporters (`packages/python`) are a different
  programme entirely and out of scope here.

## 4. Reading guide

Spec: **`00-PRODUCT`** (the product context + `SN-EX` needs) → **`01-INTRO`** (this doc) →
**`02-FEATURE`** (the `FR-EX`/`NFR-EX` requirements + the re-homing map) → **`03-DESIGN`** (the export
flow, the share flow, the button-render seam, golden-safety) → **`04-TEST`** (V&V, `TC-EX-NN`,
regression gates, traceability). For delivery status & history, read **`PLAN-EXPORT-001`**.

Quick paths: *implementer* → 00 → 02 → 03 → PLAN; *reviewer* → 02 → 04; *stakeholder* → 00 → PLAN.

## 5. Status & ownership

- **Status:** Draft — **AS-BUILT**. The behaviour shipped under `canvas-studio` (P2 Export/Share
  reuse + P7 single Export); this doc-set carves it into its own module.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** every requirement in `FEAT-EXPORT-001` has ≥ 1 covering test in
  `TEST-EXPORT-001` (it does — `FR-EX-01`/`02` → `TC-EX-01`/`02`).
- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/canvas-studio/modules/canvas-export/CHANGE-REQUESTS/` and re-baselined (bump version + record in Annex A).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-27 | Vũ Anh | Initial introduction + document map for canvas-export — the editor's output (board→SVG export + `?script=` URL share), carved from `canvas-studio` (`INTRO-STUDIO-001`) via an umbrella + re-home decomposition. Sibling of `canvas-toolbar` (`INTRO-TOOLBAR-001`) + `canvas-items` (`INTRO-ITEMS-001`); built on canvas-jam's `toSvg` (`INTRO-JAM-001`). AS-BUILT (shipped under canvas-studio P2/P7). |
| 0.2     | 2026-05-28 | Vũ Anh | **Restructure to repo-norm layout.** Realigned the module files to the repo's canonical order (`02-PRODUCT`→`00-PRODUCT`, `03-FEATURE`→`02-FEATURE`); the module now lives under `docs/specs/canvas-studio/modules/canvas-export/`. Updated §2 document map + §4 reading guide + the self-paths. `document_id`s unchanged. See `INTRO-STUDIO-001` Annex A 0.4. |

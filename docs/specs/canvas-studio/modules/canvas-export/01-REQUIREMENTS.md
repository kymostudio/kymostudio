---
title: Canvas Export — Requirements (ConOps, StRS & SRS)
document_id: FEAT-EXPORT-001
version: "0.2"
issue_date: 2026-05-27
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the editor's output (`website/app/`); reviewers; stakeholders
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-STUDIO-001
  - FEAT-TOOLBAR-001
  - FEAT-JAM-001
  - FEAT-CANVAS-001
  - DESIGN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - requirements
  - srs
  - iso-29148
  - canvas-export
  - svg-export
  - url-share
  - acceptance-criteria
---

# Canvas Export — Requirements (ConOps, StRS & SRS)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-EXPORT-001` |
| Version           | 0.2 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-STUDIO-001` (umbrella requirements), `FEAT-TOOLBAR-001` (renders the Export/Share buttons), `FEAT-JAM-001` (the board `toSvg` it reuses), `FEAT-CANVAS-001` (the playground host) |

> This document consolidates the product description (ConOps & StRS), specification overview, and feature requirements (SRS) for canvas-export. It owns the `SN-EX-NN` stakeholder needs and the `FR-EX`/`NFR-EX` requirement IDs.

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

The playground (`website/app/`, `FEAT-CANVAS-001`) lets users author a `.kymo`/BPMN diagram and see
it live. To be useful past the browser tab, a user needs to get the diagram **out** — as a file they
can keep or embed, and as a **link** they can hand to someone else. The hi-fi editor chrome
(`canvas-studio` umbrella) ships exactly this: an **Export** button (download the board as SVG) and a
**Share** button (a `?script=` URL on the clipboard) in the top bar. `canvas-export` is the module
that owns that **output behaviour**.

### A.2 Users & context of operations (ConOps)

- **Who:** users of the client-side playground who have authored a diagram and want to **save it as a
  file** or **send it to someone**.
- **Substrate it builds on (unchanged):** **canvas-jam's** board export `toSvg` aggregation
  (`FEAT-JAM-001`) over the headless **engine** (`FEAT-ENGINE-001`); the **playground host**
  (`FEAT-CANVAS-001`) — its `onShare`/`onDownload` plumbing, `?script=` share links, IndexedDB
  persistence, static GitHub-Pages deploy; and the **top bar** (`canvas-toolbar`) which renders the
  Export/Share buttons.
- **Constraint:** **client-only** — no backend, no accounts, no new runtime deps, the same static
  deploy. A small module (≈ 3 SP), **AS-BUILT** (the behaviour already shipped under canvas-studio).

### A.3 Goals & non-goals

- **Goals:** one-click **export** of the current board to a faithful SVG file (`diagram.svg`) and
  one-click **share** of the source as a `?script=` link on the clipboard — from the editor chrome,
  **client-only**, with **zero regression** to the canonical render (`renderSVG`) and **no new
  runtime deps**.
- **Non-goals:** any **backend** sharing (accounts, hosted boards, short links, server-rendered
  exports); the **Figma / Excalidraw / WebP** exporters (those live in `packages/python`, a separate
  programme); and the **DSL renderer** `renderSVG` itself (golden-frozen, out of scope — only the
  fallback reads it). The Export/Share **buttons' chrome** belongs to `canvas-toolbar`; this module
  owns only their behaviour.

### A.4 Stakeholder needs (`SN-EX`)

| ID | Need | ⊇ former |
|----|------|----------|
| `SN-EX-01` | A user must be able to **export the diagram** as a file **and share it via a link** — one click from the editor chrome, no backend, no account. | SN-CS-04 (partial) |
| `SN-EX-02` | The export must stay **faithful to the canonical render** (WYSIWYG with what's on the board), with **zero regression** to the DSL renderer (golden-safe) and **no new runtime deps** / unchanged committed-bundle + static-deploy contract. | SN-CS-05 |

### A.5 Scope

**In scope (product level):** the editor's output — board→SVG **export** (single entry point, with a
DSL-render fallback, downloading `diagram.svg`) and **share** via a `?script=` URL on the clipboard —
all **client-only**. **Out of scope:** any backend/account sharing, the Figma/Excalidraw/WebP
exporters (`packages/python`), and the DSL renderer `renderSVG` (golden-frozen). The Export/Share
buttons' rendering is `canvas-toolbar`'s; see §A.3 non-goals and §C.4.

---

## Part B — Introduction

### B.1 Purpose & motivation

`canvas-studio` (`FEAT-STUDIO-001`) shipped the whole hi-fi editor chrome — top bar, tool rail,
on-canvas item styling, status bar, and the editor's output (Export/Share) — as one feature (P1–P7).
To keep each module under the maintainer's **≤ 50-SP-per-feature** cap and give each concern one
home, `canvas-studio` becomes an **umbrella** and its IDs are **re-homed** into three sibling modules
(the same containment move that split `canvas-engine`→`canvas-jam`):

- **`canvas-toolbar`** (`FEAT-TOOLBAR-001`) — the top bar + tool rail + status-bar chrome.
- **`canvas-export`** (this module, ≈ 3 SP) — the editor's **output**: board→SVG export + URL share.
- **`canvas-items`** (`FEAT-ITEMS-001`) — on-canvas item styling + selection affordances.

**This module** owns the *behaviour* of the editor's output. It does **not** own the buttons'
chrome: the top bar renders the **Export** and **Share** buttons (`canvas-toolbar`,
`FEAT-TOOLBAR-001`); this module owns what those buttons *do* — `onDownload` (export the live board
to SVG, with a DSL-render fallback, downloading `diagram.svg`) and `onShare` (compress the source
into a `?script=` link, copied to the clipboard). It is built on **canvas-jam's** board export
`toSvg` aggregation (`FEAT-JAM-001` / `DESIGN-JAM-001` §4) over the headless **engine**
(`FEAT-ENGINE-001`) and the **playground host** (`FEAT-CANVAS-001`). **Golden-safe boundary:** the
DSL renderer `renderSVG` (`packages/js`) is **untouched and out of scope** — only the *fallback*
calls it; the live-board path goes through the engine's `toSvg`.

Documented to the spirit of **ISO/IEC/IEEE 12207**, with requirements per **29148**, architecture
per **42010**, quality attributes per **25010**, test structure per **29119** — tailored to a
single-maintainer OSS module, exactly as the umbrella + sibling doc-sets.

### B.2 Document map

This module's docs use the two-layer model in this folder — a **baselined spec** and a **living
plan** (`PLAN.md` + `CHANGE-REQUESTS/`). The documents for canvas-export:

| # | File | document_id | Answers |
|---|------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` | `FEAT-EXPORT-001` | *what product problem & whose needs (`SN-EX`)? + what must it do? (`FR-EX`/`NFR-EX`)* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only.

### B.3 Relationship to the canvas-studio umbrella & siblings

`canvas-export` is a **module of the `canvas-studio` umbrella**, not a new product — it owns one
slice of the chrome that already shipped:

```
canvas-studio (FEAT-STUDIO-001)    →  umbrella: the hi-fi editor chrome (shipped P1–P7)
        ├── canvas-toolbar (FEAT-TOOLBAR-001) →  top bar · tool rail · status bar
        ├── canvas-export  (this spec)         →  the editor's OUTPUT: board→SVG + URL share
        └── canvas-items   (FEAT-ITEMS-001)    →  on-canvas item styling + selection
```

- **Re-homed, not re-invented:** this module **re-homes** the Export/Share parts of the studio
  requirements with new `EXPORT` IDs — the Export part of `FR-CS-02` + the single-Export of
  `FR-CS-07` → `FR-EX-01`; the Share part of `FR-CS-02` → `FR-EX-02`; `NFR-CS-03`/`NFR-CS-04` →
  `NFR-EX-01`/`NFR-EX-02`; `SN-CS-04` (partial) / `SN-CS-05` → `SN-EX-01`/`SN-EX-02`. `FEAT-EXPORT-001`
  owns these IDs; the umbrella's studio IDs are the historical source (cited via the **⊇ former**
  columns).
- **Built on, unchanged:** the design reuses **canvas-jam's** board export `toSvg` aggregation
  (`FEAT-JAM-001` / `DESIGN-JAM-001` §4) over the headless engine (`FEAT-ENGINE-001`), and the
  playground host's sync engine + `onShare`/`onDownload` plumbing (`FEAT-CANVAS-001`,
  `DESIGN-CANVAS-001`).
- **Button-render seam:** the **buttons** are rendered by the top bar (`canvas-toolbar`,
  `FEAT-TOOLBAR-001`); this module owns only their **behaviour** (the handlers). The top bar merely
  wires `onExport`/`onShare` to the handlers this module defines.
- **Golden-safe boundary:** the DSL renderer `renderSVG` (`packages/js`) is **out of scope and
  untouched** — only the fallback path reads its bytes; the live-board export goes through the
  engine's `toSvg`. The Figma / Excalidraw / WebP exporters (`packages/python`) are a different
  programme entirely and out of scope here.

### B.4 Reading guide

Spec: **`01-REQUIREMENTS`** (this doc — product context + `SN-EX` needs + `FR-EX`/`NFR-EX`
requirements + the re-homing map). For delivery status & history, read **`PLAN-EXPORT-001`**.

Quick paths: *implementer* → Part A → Part C; *reviewer* → Part C; *stakeholder* → Part A.

### B.5 Status & ownership

- **Status:** Draft — **AS-BUILT**. The behaviour shipped under `canvas-studio` (P2 Export/Share
  reuse + P7 single Export); this doc-set carves it into its own module.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** every requirement in `FEAT-EXPORT-001` has ≥ 1 covering test in
  `TEST-EXPORT-001` (it does — `FR-EX-01`/`02` → `TC-EX-01`/`02`).
- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/canvas-studio/modules/canvas-export/CHANGE-REQUESTS/` and re-baselined (bump version + record in Annex A).

---

## Part C — Requirements (SRS)

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `FEAT-EXPORT-001` |
| Version           | 0.2 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-TOOLBAR-001` (renders the Export/Share buttons), `FEAT-JAM-001` (the board `toSvg` it reuses), `FEAT-CANVAS-001` (the playground host) |

> Requirements per **ISO/IEC/IEEE 29148**. IDs: functional **`FR-EX-NN`**, non-functional
> **`NFR-EX-NN`**. This module owns the editor's **output behaviour** (board→SVG export + URL share);
> it is **client-only** — no backend, no new runtime deps, the same static deploy. The Export/Share
> **buttons** are rendered by `canvas-toolbar` (`FEAT-TOOLBAR-001`); this document owns only what they
> *do*. This document owns the `FR-EX`/`NFR-EX` IDs; `PLAN-EXPORT-001` never re-defines them. IDs are
> **re-homed** from the `canvas-studio` umbrella (`FEAT-STUDIO-001`) — the **⊇ former** columns cite
> the source.

### C.1 Stakeholder needs

Stakeholder needs (`SN-EX-01..02`, ISO 29148 §6.4.2 ConOps) are owned by Part A of this document.
Each requirement below traces back via the **Source need** column, and to its umbrella origin via
**⊇ former**.

### C.2 Functional requirements (`FR-EX`)

| ID | Requirement | Source need | ⊇ former |
|----|-------------|-------------|----------|
| **FR-EX-01** | The app SHALL **export the current board to SVG** from a **single** entry point (the top-bar **Export**; the old floating `SVG`/`#download` button has been removed). Export reuses the board **`toSvg`** aggregation (canvas-jam, `DESIGN-JAM-001` §4) via `engine/export.ts` `boardToSvg(editor, utils)` — which walks the page shapes, pre-warms the glyph cache, collects bounds, calls each `ShapeUtil`'s `toSvg`, and frames the lot in one `<svg>` — with a **DSL-render fallback** (the last canonical `renderSVG` output) when no board export is available. It SHALL download the result as **`diagram.svg`**. | SN-EX-01 | FR-CS-02 (Export part) + FR-CS-07 (single-Export) |
| **FR-EX-02** | The app SHALL produce a **shareable `?script=` URL** — the diagram **source**, deflate-compressed (`CompressionStream "deflate-raw"`) and base64url-encoded, written to the address bar — and **copy it to the clipboard** (`navigator.clipboard.writeText`), with a toast on success/failure. (`share.ts` `syncURL`; decode on load via `loadFromURL`.) | SN-EX-01 | FR-CS-02 (Share part) |

> **Button-render seam.** `FR-EX-01`/`FR-EX-02` own the **behaviour** of Export/Share. The **buttons**
> themselves (their placement, label, icon, and the `onExport`/`onShare` wiring) are rendered by the
> top bar — `canvas-toolbar`, `FEAT-TOOLBAR-001`. The seam: the top bar calls the handlers this module
> defines (`onDownload`/`onShare` in `App.tsx`); this module never owns the chrome.

### C.3 Non-functional requirements (`NFR-EX`)

| ID | Attribute (ISO 25010) | Requirement | ⊇ former |
|----|-----------------------|-------------|----------|
| **NFR-EX-01** | Maintainability / correctness | **Golden-safe / WYSIWYG export.** The DSL renderer `renderSVG` (`packages/js`) MUST be **untouched** (its bytes byte-identical before/after); the live-board export tracks the board via the engine `toSvg`, and the **fallback** reuses `renderSVG`'s last output as-is. The export must not change any `packages/js` / `packages/python` golden. | NFR-CS-03 |
| **NFR-EX-02** | Portability / footprint | **No new runtime dependencies** (share uses the platform `CompressionStream`/`navigator.clipboard`; export reuses the engine + the icon library already bundled); the committed `kymo.bundle.js`, `build.sh`, and the static GitHub-Pages deploy (`deploy-website.yml`) are unchanged. | NFR-CS-04 |

### C.4 Scope

**In scope (this module):** board→SVG **export** (single entry point, board `toSvg` + DSL-render
fallback, `diagram.svg` download) and **share** via a `?script=` URL on the clipboard. All
**client-only**.

**Out of scope:**

| Out | Where it lives | Why out |
|-----|----------------|---------|
| Any **backend** sharing — accounts, hosted boards, short links, server-rendered exports | — (needs a backend) | Excluded by the **client-only** decision; deferred (`PLAN-EXPORT-001` Annex B). |
| The **Figma / Excalidraw / WebP** exporters | `packages/python` (`to_figma.py`/`to_excalidraw.py`/`to_webp.py`) | A separate programme; the JS playground exports SVG only. |
| The **DSL renderer** `renderSVG` | `packages/js` | Golden-frozen; only the export **fallback** reads its output (`NFR-EX-01`). |
| The Export/Share **buttons' chrome** (placement, icon, wiring) | `canvas-toolbar` (`FEAT-TOOLBAR-001`) | The top bar renders them; this module owns only their behaviour. |

### C.5 Acceptance criteria (feature-level)

1. **Export** from the top bar downloads a board `<svg>` named `diagram.svg`; there is **exactly one**
   Export entry point (the old floating `#download` button is gone) (`FR-EX-01`).
2. The exported SVG tracks the live board (the engine `toSvg` aggregation), falling back to the last
   `renderSVG` output when no board export is available (`FR-EX-01`, `NFR-EX-01`).
3. **Share** writes a `?script=` URL to the address bar and copies it to the clipboard, with a toast;
   reloading that URL restores the source (`FR-EX-02`).
4. **Golden-safe & client-only:** `packages/js` + `packages/python` goldens are byte-identical, no new
   runtime deps land in `website/app/package.json`, and the build/deploy contract is unchanged
   (`NFR-EX-01/02`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-27 | Vũ Anh | Initial SRS for canvas-export — `FR-EX-01` (single-entry board→SVG export via `boardToSvg`, DSL-render fallback, `diagram.svg`), `FR-EX-02` (`?script=` URL share + clipboard), `NFR-EX-01` (golden-safe / WYSIWYG), `NFR-EX-02` (footprint / no new deps), scope, acceptance. Carved from the `canvas-studio` umbrella (`FEAT-STUDIO-001`): re-homes the Export part of `FR-CS-02` + the single-Export of `FR-CS-07` → `FR-EX-01`, the Share part of `FR-CS-02` → `FR-EX-02`, `NFR-CS-03/04` → `NFR-EX-01/02`. AS-BUILT (shipped under canvas-studio P2/P7). |
| 0.2     | 2026-06-06 | Vũ Anh | **Consolidation.** Merged `00-PRODUCT.md` (FEAT-EXPORT-001), `01-INTRO.md` (FEAT-EXPORT-001), and `02-FEATURE.md` (FEAT-EXPORT-001) into this single `01-REQUIREMENTS.md` under document_id `FEAT-EXPORT-001`. Part A carries the ConOps/StRS; Part B carries the overview & introduction; Part C carries the SRS. Removed `FEAT-EXPORT-001`/`FEAT-EXPORT-001` from `related_documents` (now consolidated here). |

## Annex B — FEAT-EXPORT-001 Revision History (merged)

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-27 | Vũ Anh | Initial introduction + document map for canvas-export — the editor's output (board→SVG export + `?script=` URL share), carved from `canvas-studio` (`FEAT-STUDIO-001`) via an umbrella + re-home decomposition. Sibling of `canvas-toolbar` (`FEAT-TOOLBAR-001`) + `canvas-items` (`FEAT-ITEMS-001`); built on canvas-jam's `toSvg` (`FEAT-JAM-001`). AS-BUILT (shipped under canvas-studio P2/P7). |
| 0.2     | 2026-05-28 | Vũ Anh | **Restructure to repo-norm layout.** Realigned the module files to the repo's canonical order (`02-PRODUCT`→`00-PRODUCT`, `03-FEATURE`→`02-FEATURE`); the module now lives under `docs/specs/canvas-studio/modules/canvas-export/`. Updated §2 document map + §4 reading guide + the self-paths. `document_id`s unchanged. See `FEAT-STUDIO-001` Annex B 0.4. |

---
title: Canvas Export — Feature & Requirements (SRS)
document_id: FEAT-EXPORT-001
version: "0.1"
issue_date: 2026-05-27
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the editor's output (`website/app/`); reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - PROD-EXPORT-001
  - INTRO-EXPORT-001
  - DESIGN-EXPORT-001
  - TEST-EXPORT-001
  - PLAN-EXPORT-001
  - FEAT-TOOLBAR-001
  - FEAT-JAM-001
  - FEAT-CANVAS-001
  - FEAT-STUDIO-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - srs
  - iso-29148
  - canvas-export
  - svg-export
  - url-share
  - acceptance-criteria
---

# Canvas Export — Feature & Requirements (SRS)

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | FEAT-EXPORT-001                                                  |
| Version           | 0.1                                                             |
| Status            | Draft                                                           |
| Owner             | `diagrams/` project                                            |
| Related Documents | `PROD-EXPORT-001` (stakeholder needs), `DESIGN-EXPORT-001` (how), `TEST-EXPORT-001` (V&V), `FEAT-TOOLBAR-001` (renders the Export/Share buttons), `FEAT-JAM-001` (the board `toSvg` it reuses), `FEAT-CANVAS-001` (the playground host) |

> Requirements per **ISO/IEC/IEEE 29148**. IDs: functional **`FR-EX-NN`**, non-functional
> **`NFR-EX-NN`**. This module owns the editor's **output behaviour** (board→SVG export + URL share);
> it is **client-only** — no backend, no new runtime deps, the same static deploy. The Export/Share
> **buttons** are rendered by `canvas-toolbar` (`FEAT-TOOLBAR-001`); this document owns only what they
> *do*. This document owns the `FR-EX`/`NFR-EX` IDs; `PLAN-EXPORT-001` never re-defines them. IDs are
> **re-homed** from the `canvas-studio` umbrella (`FEAT-STUDIO-001`) — the **⊇ former** columns cite
> the source.

---

## 1. Stakeholder needs

Stakeholder needs (`SN-EX-01..02`, ISO 29148 §6.4.2 ConOps) are owned by the product description
**`PROD-EXPORT-001`** (`02-PRODUCT.md`). Each requirement below traces back via the **Source need**
column, and to its umbrella origin via **⊇ former**.

## 2. Functional requirements (`FR-EX`)

| ID | Requirement | Source need | ⊇ former |
|----|-------------|-------------|----------|
| **FR-EX-01** | The app SHALL **export the current board to SVG** from a **single** entry point (the top-bar **Export**; the old floating `SVG`/`#download` button has been removed). Export reuses the board **`toSvg`** aggregation (canvas-jam, `DESIGN-JAM-001` §4) via `engine/export.ts` `boardToSvg(editor, utils)` — which walks the page shapes, pre-warms the glyph cache, collects bounds, calls each `ShapeUtil`'s `toSvg`, and frames the lot in one `<svg>` — with a **DSL-render fallback** (the last canonical `renderSVG` output) when no board export is available. It SHALL download the result as **`diagram.svg`**. | SN-EX-01 | FR-CS-02 (Export part) + FR-CS-07 (single-Export) |
| **FR-EX-02** | The app SHALL produce a **shareable `?script=` URL** — the diagram **source**, deflate-compressed (`CompressionStream "deflate-raw"`) and base64url-encoded, written to the address bar — and **copy it to the clipboard** (`navigator.clipboard.writeText`), with a toast on success/failure. (`share.ts` `syncURL`; decode on load via `loadFromURL`.) | SN-EX-01 | FR-CS-02 (Share part) |

> **Button-render seam.** `FR-EX-01`/`FR-EX-02` own the **behaviour** of Export/Share. The **buttons**
> themselves (their placement, label, icon, and the `onExport`/`onShare` wiring) are rendered by the
> top bar — `canvas-toolbar`, `FEAT-TOOLBAR-001`. The seam: the top bar calls the handlers this module
> defines (`onDownload`/`onShare` in `App.tsx`); this module never owns the chrome.

## 3. Non-functional requirements (`NFR-EX`)

| ID | Attribute (ISO 25010) | Requirement | ⊇ former |
|----|-----------------------|-------------|----------|
| **NFR-EX-01** | Maintainability / correctness | **Golden-safe / WYSIWYG export.** The DSL renderer `renderSVG` (`packages/js`) MUST be **untouched** (its bytes byte-identical before/after); the live-board export tracks the board via the engine `toSvg`, and the **fallback** reuses `renderSVG`'s last output as-is. The export must not change any `packages/js` / `packages/python` golden. | NFR-CS-03 |
| **NFR-EX-02** | Portability / footprint | **No new runtime dependencies** (share uses the platform `CompressionStream`/`navigator.clipboard`; export reuses the engine + the icon library already bundled); the committed `kymo.bundle.js`, `build.sh`, and the static GitHub-Pages deploy (`deploy-website.yml`) are unchanged. | NFR-CS-04 |

## 4. Scope

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

## 5. Acceptance criteria (feature-level)

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

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-27 | Vũ Anh | Initial SRS for canvas-export — `FR-EX-01` (single-entry board→SVG export via `boardToSvg`, DSL-render fallback, `diagram.svg`), `FR-EX-02` (`?script=` URL share + clipboard), `NFR-EX-01` (golden-safe / WYSIWYG), `NFR-EX-02` (footprint / no new deps), scope, acceptance. Carved from the `canvas-studio` umbrella (`FEAT-STUDIO-001`): re-homes the Export part of `FR-CS-02` + the single-Export of `FR-CS-07` → `FR-EX-01`, the Share part of `FR-CS-02` → `FR-EX-02`, `NFR-CS-03/04` → `NFR-EX-01/02`. AS-BUILT (shipped under canvas-studio P2/P7). |

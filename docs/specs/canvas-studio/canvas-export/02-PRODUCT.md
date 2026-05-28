---
title: Canvas Export — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-EXPORT-001
version: "0.1"
issue_date: 2026-05-27
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for the editor's output; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-EXPORT-001
  - FEAT-EXPORT-001
  - INTRO-STUDIO-001
  - INTRO-TOOLBAR-001
  - INTRO-JAM-001
  - FEAT-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - canvas-export
  - svg-export
  - url-share
---

# Canvas Export — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-EXPORT-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-EXPORT-001`, `FEAT-EXPORT-001` (the SRS derived from the needs below), `INTRO-STUDIO-001` (umbrella) |

> This doc owns the `SN-EX-NN` stakeholder needs; the SRS (`FEAT-EXPORT-001`) derives `FR-EX`/`NFR-EX`
> from them. The needs are **re-homed** from the `canvas-studio` umbrella (`PROD-STUDIO-001`) — the
> **⊇ former** column cites the original `SN-CS` source.

## 1. Problem & motivation

The playground (`website/app/`, `FEAT-CANVAS-001`) lets users author a `.kymo`/BPMN diagram and see
it live. To be useful past the browser tab, a user needs to get the diagram **out** — as a file they
can keep or embed, and as a **link** they can hand to someone else. The hi-fi editor chrome
(`canvas-studio` umbrella) ships exactly this: an **Export** button (download the board as SVG) and a
**Share** button (a `?script=` URL on the clipboard) in the top bar. `canvas-export` is the module
that owns that **output behaviour**.

## 2. Users & context of operations (ConOps)

- **Who:** users of the client-side playground who have authored a diagram and want to **save it as a
  file** or **send it to someone**.
- **Substrate it builds on (unchanged):** **canvas-jam's** board export `toSvg` aggregation
  (`INTRO-JAM-001`) over the headless **engine** (`INTRO-ENGINE-001`); the **playground host**
  (`FEAT-CANVAS-001`) — its `onShare`/`onDownload` plumbing, `?script=` share links, IndexedDB
  persistence, static GitHub-Pages deploy; and the **top bar** (`canvas-toolbar`) which renders the
  Export/Share buttons.
- **Constraint:** **client-only** — no backend, no accounts, no new runtime deps, the same static
  deploy. A small module (≈ 3 SP), **AS-BUILT** (the behaviour already shipped under canvas-studio).

## 3. Goals & non-goals

- **Goals:** one-click **export** of the current board to a faithful SVG file (`diagram.svg`) and
  one-click **share** of the source as a `?script=` link on the clipboard — from the editor chrome,
  **client-only**, with **zero regression** to the canonical render (`renderSVG`) and **no new
  runtime deps**.
- **Non-goals:** any **backend** sharing (accounts, hosted boards, short links, server-rendered
  exports); the **Figma / Excalidraw / WebP** exporters (those live in `packages/python`, a separate
  programme); and the **DSL renderer** `renderSVG` itself (golden-frozen, out of scope — only the
  fallback reads it). The Export/Share **buttons' chrome** belongs to `canvas-toolbar`; this module
  owns only their behaviour.

## 4. Stakeholder needs (`SN-EX`)

| ID | Need | ⊇ former |
|----|------|----------|
| `SN-EX-01` | A user must be able to **export the diagram** as a file **and share it via a link** — one click from the editor chrome, no backend, no account. | SN-CS-04 (partial) |
| `SN-EX-02` | The export must stay **faithful to the canonical render** (WYSIWYG with what's on the board), with **zero regression** to the DSL renderer (golden-safe) and **no new runtime deps** / unchanged committed-bundle + static-deploy contract. | SN-CS-05 |

## 5. Scope

**In scope (product level):** the editor's output — board→SVG **export** (single entry point, with a
DSL-render fallback, downloading `diagram.svg`) and **share** via a `?script=` URL on the clipboard —
all **client-only**. **Out of scope:** any backend/account sharing, the Figma/Excalidraw/WebP
exporters (`packages/python`), and the DSL renderer `renderSVG` (golden-frozen). The Export/Share
buttons' rendering is `canvas-toolbar`'s; see §3 non-goals and `FEAT-EXPORT-001` §4.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-27 | Vũ Anh | Initial product description for canvas-export. Carved from the `canvas-studio` umbrella (`PROD-STUDIO-001`); re-homes the export/share parts of the needs — `SN-CS-04` (partial) → `SN-EX-01`, `SN-CS-05` → `SN-EX-02`. AS-BUILT (shipped under canvas-studio P2/P7). |

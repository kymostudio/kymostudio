---
title: "Canvas Studio CR-003 — Design"
document_id: DESIGN-STUDIO-003
version: "0.1"
issue_date: 2026-05-29
status: Closed
classification: Internal
owner: diagrams/ project
audience: Engineer implementing the CR-003 layout change (`website/app/`)
review_cycle: Until CR-003 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-STUDIO-003
  - FEAT-STUDIO-003
  - TEST-STUDIO-003
  - PLAN-STUDIO-003
  - DESIGN-STUDIO-001
authors:
  - Vũ Anh
language: en
keywords:
  - technical-design
  - change-request
  - editor-chrome
  - code-pane
  - layout
  - golden-safe
  - canvas-studio
---

# Canvas Studio CR-003 — Design

| Field             | Value |
|-------------------|-------|
| Document ID       | `DESIGN-STUDIO-003` |
| Version           | 0.1 |
| Status            | **Closed** (implemented) |
| Owner             | `diagrams/` project |
| Audience          | Engineer implementing the layout change (`website/app/`) |
| Related Documents | `FEAT-STUDIO-003` (requirements), `TEST-STUDIO-003` (V&V), `PLAN-STUDIO-003` (phases), `DESIGN-STUDIO-001` (the baselined design this amends — §1/§8) |

---

## 1. Scope & as-built reality

CR-003 touches only the editor layout (`website/app/`); the render core (`renderSVG`/`svgBackground`)
is untouched (`NFR-CR3-01`). The current layout, verified:

| Concern | As-built | Evidence |
|---|---|---|
| DOM order | `.pane.editor` first, `.pane.view` (rail + canvas) second | `App.tsx:239`, `App.tsx:258` |
| Grid | `grid-template-columns: minmax(280px, 38%) 1fr` (collapses to `1fr` when `main.code-hidden`) | `index.html:194` / `:196` |
| Editor border / responsive | `.pane.editor { border-right }`; flips to `border-bottom` at `max-width:760px` | `index.html:198` / `~:353` |

## 2. Code pane on the right — `FR-CR3-01`

Three coordinated edits so the canvas leads and code docks right:

- **DOM order** (`App.tsx:237–274`): render `<section className="pane view">` (rail + canvas)
  **before** the `{showCode && (<section className="pane editor">…)}` block inside `<main>` — swap the
  two blocks; keep the `{showCode && ( … editor … )}` guard on the editor block untouched.
- **Grid** (`index.html:194`): `minmax(280px, 38%) 1fr` → `1fr minmax(280px, 38%)` (canvas column
  first, code column second). `main.code-hidden { grid-template-columns: 1fr; }` (`:196`) is unchanged,
  so the code-hidden state still collapses the canvas to full-width.
- **Border** (`index.html:198`): `.pane.editor { border-right … }` → `border-left …`; flip the
  `max-width:760px` responsive rule (`~:353`) so the stacked editor's divider stays correct when the
  panes wrap vertically.

**Supersedes** `DESIGN-STUDIO-001 §1` (layout ASCII — code pane left of canvas) and `§8` (the
`code | canvas | reserved` column order → `canvas | code`).

## 3. Component structure & state

No new components, no state change. `App.tsx` keeps the `showCode` boolean and `onToggleCode` handler
exactly as-built (CR-003 does **not** touch the default — that is CR-002's `FR-CR2-02`); only the two
`<section>` blocks are reordered. `index.html` changes are CSS-only (grid column order + border side +
responsive divider). The `tool` state, rail, status bar, sample picker, tabs and 3-mode background
control are unchanged.

## 4. Golden-safety, build & deploy

All change is in `website/app/*` (React + CSS). `renderSVG`/`svgBackground` are not imported by the
edited code paths, so the Python/JS render goldens stay byte-identical (`NFR-CR3-01`) and the
render-guard stays green (`NFR-CR3-02`). Deploy is unchanged: rebuild and commit
`website/app/kymo.bundle.js` (the committed-bundle deploy contract — no CI build).

## 5. Risks / open questions

| ID | Risk / question | Mitigation / decision |
|----|------------------|------------------------|
| `RK-CR3-01` | Rebuilt bundle / CSS churns committed `kymo.bundle.js` beyond intent | Diff the bundle; change confined to chrome React + CSS; `renderSVG` untouched. |
| `RK-CR3-02` | Reordering panes breaks existing E2E selectors | Update `e2e/chrome.spec.ts` in lockstep; run `test:e2e` before ship. |
| `RK-CR3-03` | The responsive `max-width:760px` stacked layout shows the divider on the wrong edge after the border flip | Verify the stacked (narrow) breakpoint visually in P2; flip the responsive rule alongside the desktop one. |
| `RK-CR3-Q1` | Land order vs CR-002 (which also reorders the same `App.tsx` panes) | Independent edits; whichever lands first, the other rebases its `App.tsx`/`index.html` hunk. No semantic conflict — CR-002 owns the default + tabs, CR-003 owns the side. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-29 | Vũ Anh | Initial design for CR-003: §2 code pane right (DOM reorder + grid swap + border flip + responsive divider) — `FR-CR3-01`; golden-safety (§4) and risks `RK-CR3-01..03` + open question `RK-CR3-Q1` (land order vs CR-002). Maps onto baselined `DESIGN-STUDIO-001 §1/§8`. Carried over the technical edits from `CR-STUDIO-002 §4` (now removed there). |

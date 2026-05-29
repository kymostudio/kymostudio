---
title: "Canvas Studio CR-002 — Design"
document_id: DESIGN-STUDIO-002
version: "0.2"
issue_date: 2026-05-27
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineer implementing the CR-002 chrome change (`website/app/`)
review_cycle: Until CR-002 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-STUDIO-002
  - FEAT-STUDIO-002
  - TEST-STUDIO-002
  - PLAN-STUDIO-002
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

# Canvas Studio CR-002 — Design

| Field             | Value |
|-------------------|-------|
| Document ID       | `DESIGN-STUDIO-002` |
| Version           | 0.2 |
| Status            | **Open** |
| Owner             | `diagrams/` project |
| Audience          | Engineer implementing the chrome change (`website/app/`) |
| Related Documents | `FEAT-STUDIO-002` (requirements), `TEST-STUDIO-002` (V&V), `PLAN-STUDIO-002` (phases), `DESIGN-STUDIO-001` (the baselined design this amends — §1/§3/§8/§11) |

---

## 1. Scope & as-built reality

CR-002 touches only the editor chrome (`website/app/`); the render core (`renderSVG`/`svgBackground`)
is untouched (`NFR-CR2-01`). The current chrome, verified:

| Concern | As-built | Evidence |
|---|---|---|
| Default pane state | `showCode` initial = `true` (code shown) | `App.tsx:36` |
| Code-hidden collapse | `main.code-hidden { grid-template-columns: 1fr }` (canvas full-width when code hidden) | `index.html:196`; `App.tsx:237` |
| Tabs | `tab-code` (`onToggleCode`) + `tab-preview` (no-op when code hidden) | `ui/TopBar.tsx:86–105` |

> The code-pane *side* (DOM order, grid columns, border) is handled in `CR-STUDIO-003` (`DESIGN-STUDIO-003 §2`), not here.

## 2. Single `Code` toggle — `FR-CR2-01`

In `ui/TopBar.tsx` (lines 86–105): **remove** the `tab-preview` `<button>` (the `Play`-icon button,
`:95–104`); keep `tab-code` as the sole control — `data-testid="tab-code"`, `className={showCode ?
"active" : ""}`, `onClick={onToggleCode}`. Drop the now-orphaned `Play` icon import. The `Code` button
already toggles bidirectionally via `onToggleCode` (`App.tsx:230` `setShowCode((c) => !c)`), so no new
handler is needed. **Supersedes** `DESIGN-STUDIO-001 §3` (center tabs = `Code` + `Preview`) and `§11`
(truthful-tabs clause: `Preview` active ⇔ `!showCode` — no longer applicable).

## 3. Default code-hidden — `FR-CR2-02`

In `App.tsx:36`: `useState(true)` → `useState(false)`. The existing `main.code-hidden { grid-template-
columns: 1fr; }` (`index.html:196`) and `<main className={showCode ? undefined : "code-hidden"}>`
(`App.tsx:237`) already render the canvas full-width when code is hidden, so the default flip needs no
further layout change. **Supersedes** the implicit code-shown default (`DESIGN-STUDIO-001 §8` `showCode`
flag description).

## 4. Component structure & state

No new components or state. `App.tsx` keeps the single `showCode` boolean (default now `false`) and the
`onToggleCode` handler; `TopBar` loses the `Preview` button and its conditional handler. The `tool`
state, rail, status bar, sample picker and 3-mode background control (from P3/P7) are unchanged.

## 5. Golden-safety, build & deploy

All change is in `website/app/*` (React + CSS). `renderSVG`/`svgBackground` are not imported by the
edited code paths, so the Python/JS render goldens stay byte-identical (`NFR-CR2-01`) and the
render-guard stays green (`NFR-CR2-02`). Deploy is unchanged: rebuild and commit
`website/app/kymo.bundle.js` (the committed-bundle deploy contract — no CI build).

## 6. Risks / open questions

| ID | Risk / question | Mitigation / decision |
|----|------------------|------------------------|
| `RK-CR2-01` | Rebuilt bundle / CSS churns committed `kymo.bundle.js` beyond intent | Diff the bundle; change confined to chrome React + CSS; `renderSVG` untouched. |
| `RK-CR2-02` | Removing `tab-preview` breaks existing E2E selectors | Update `e2e/chrome.spec.ts` in lockstep; run `test:e2e` before ship. |
| `RK-CR2-03` | A layout/styling tweak leaks into `renderSVG` → golden churn | All change in `website/app/*`; goldens run in V&V (`TEST-STUDIO-002 §3`). |
| `RK-CR2-Q1` | Should the `Code` label/icon change now it is a sole toggle? | **Open** — keep the `Code` label + icon (least churn); revisit only if UX review asks. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-27 | Vũ Anh | Initial design for CR-002: §2 single `Code` toggle (remove `tab-preview`, drop `Play` import) — `FR-CR2-01`; §3 default code-hidden (`App.tsx:36`) — `FR-CR2-02`; §4 code pane right (DOM reorder + grid swap + border flip) — `FR-CR2-03`; golden-safety (§6) and risks `RK-CR2-01..03` + open question `RK-CR2-Q1`. Maps onto baselined `DESIGN-STUDIO-001 §1/§3/§8/§11`. |
| 0.2     | 2026-05-29 | Vũ Anh | Removed §4 (code pane on the right) — moved to `DESIGN-STUDIO-003 §2` (`CR-STUDIO-003`); renumbered §5→§4, §6→§5, §7→§6. Trimmed the as-built table to default-pane / code-hidden-collapse / tabs (DOM-order/grid/border rows moved to CR-003). `RK-CR2-02` no longer mentions pane reorder. Now maps onto `DESIGN-STUDIO-001 §3/§8/§11` only (§1 layout = CR-003). |

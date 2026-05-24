---
title: Canvas Studio — Verification & Validation
document_id: TEST-STUDIO-001
version: "0.1"
issue_date: 2026-05-24
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the editor chrome; reviewers
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-STUDIO-001
  - FEAT-STUDIO-001
  - DESIGN-STUDIO-001
  - PLAN-STUDIO-001
  - TEST-JAM-001
  - TEST-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - verification
  - validation
  - iso-29119
  - test-cases
  - traceability
  - golden-safe
  - canvas-studio
---

# Canvas Studio — Verification & Validation

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | TEST-STUDIO-001                                                  |
| Version           | 0.1                                                            |
| Status            | Draft                                                          |
| Owner             | `diagrams/` project                                           |
| Related Documents | `FEAT-STUDIO-001` (requirements), `DESIGN-STUDIO-001` (design), `TEST-JAM-001` (the engine/freeform V&V this builds on), `TEST-CANVAS-001` (the editor V&V — must stay green) |

> V&V per **ISO/IEC/IEEE 29119**. Test cases **`TC-CS-NN`**. This document covers the chrome
> (top bar, tool rail, item styling, selection affordances, status bar) and owns two **regression
> gates**: the DSL-render goldens stay **byte-identical**, and the existing engine/editor suites
> (`TEST-JAM-001`, `TEST-CANVAS-001`) stay **green**.

---

## 1. Strategy

Reuses the rings from the siblings: **unit** (`node --test` in `website/app` / `packages/js-canvas`),
**E2E** (Playwright, `website/app/e2e/`, per the project's trusted-event conventions), and the
**regression bar** (`packages/js` + `packages/python` goldens unchanged; `packages/js-canvas` tests
green). New surface to cover:

1. **Tokens / theme** — the ported token surface resolves in both `[data-theme]` states.
2. **Top bar** — undo/redo/theme/export/share + the Code panel toggle drive the right behaviour.
3. **Tool rail** — click + keyboard select the engine tool; placeholders stay inert.
4. **Item styling** — nodes/regions/edges render the prototype language (visual check).
5. **Selection** — handles + size badge appear and track a drag.
6. **Status bar** — counts, zoom/Fit, autosave reflect engine state.

> **E2E conventions (from project memory).** Drive with **trusted events** (Playwright), **wait for
> the tool button to show `active`** before driving the canvas, and use `elementsFromPoint` for
> `pointer-events:none` hit-tests. These are load-bearing for the tool-rail and selection cases.

## 2. Feature test cases (`TC-CS`)

| TC | Requirement | Ring | Assertion |
|----|-------------|------|-----------|
| **TC-CS-01** | FR-CS-01 | unit/E2E | With `[data-theme="dark"]` then `"light"`, the ported token custom-properties resolve to the expected values on `:root`; key chrome surfaces (`--bg`, `--accent`, `--tok-*`) are non-empty in both; toggling theme flips them. |
| **TC-CS-02** | FR-CS-02 | E2E | The top bar renders. **Undo/redo:** drag a `kymo-node` → Undo restores its origin **and** the `.kymo` text round-trips (re-uses `TC-18`/`TC-J-02` behaviour); Redo re-applies. **Theme** toggle flips `[data-theme]`. **Export** downloads a board `<svg>`; **Share** writes a `?script=` link. The **Code** tab hides/shows the `.kymo` pane (`Preview` stays). The bar is **client-only** — it has **no** breadcrumb/star/Comments/Versions/presence chrome. |
| **TC-CS-03** | FR-CS-03 | E2E | Clicking an enabled rail tool sets it active **and** the canvas enters that tool (draw → pointer-drag makes a `freedraw`; `hand` → grab cursor, drag pans); its keyboard shortcut (V/H/P/S/T) selects the same tool; a shortcut typed **inside** the `.kymo` `<textarea>` does **not** switch tools; a disabled placeholder tool does not activate on click. |
| **TC-CS-04** | FR-CS-04 | E2E/visual | For the AIQ sample: a `kymo-node` renders the real cloud-icon glyph + name; a `kymo-region` matches `renderSVG` — inner (`dash:"dashed"`) is purple `#7c3aed` dashed + purple label, outer is slate `#cbd5e1` solid; a `kymo-edge` is `#94a3b8` with a running flow-dash (`getComputedStyle(line).animationName === "kymo-edge-flow"`, `stroke-dasharray="6 4"`). chrome-MCP screenshot visually matches `renderSVG`. |
| **TC-CS-05** | FR-CS-05 | E2E | Selecting a shape shows a selection rect with **four corner handles** and a **`W × H` size badge**; dragging the shape keeps the handles + badge tracking it frame-for-frame (they ride the in-wrapper outline). |
| **TC-CS-06** | FR-CS-06 | E2E | The status bar shows the correct **node/edge counts** for the AIQ sample; `+`/`−` change `editor` camera zoom and the `%` readout; **Fit** calls `zoomToFit` (diagram fits the viewport); the **autosave** indicator transitions after a user edit. |

## 3. Regression gates (must stay green)

| Suite | What it proves still holds |
|-------|----------------------------|
| `TEST-CANVAS-001` (`TC-01..19`) | The editor round-trip, two-layer no-leak, layout, persistence, undo, BPMN embed are **unchanged** under the new chrome. |
| `TEST-JAM-001` (`TC-J-01..07`) | Built-in shapes, undo/redo, export, and the freeform draw/sticky/text tools still pass — the rail now drives them through the registry. |
| Engine render-guard E2E (`NFR-J-01`) | A 1-node drag still re-renders **only** that shape — chrome state (top bar / status bar / tool) does **not** re-render the canvas shape layer (`NFR-CS-02`). |

## 4. Non-functional verification

| NFR | Method |
|-----|--------|
| **NFR-CS-01** (usability) | Manual + E2E: every tool/action has a `title`/tooltip; the active tool has a distinct state; light/dark both legible (contrast spot-check). |
| **NFR-CS-02** (perf) | The render-guard E2E (above) asserts chrome changes don't re-render shapes; chrome-MCP real-GPU drag on the AIQ sample holds ~60 fps. |
| **NFR-CS-03** (golden-safe) | `cd packages/python && uv run --group dev python -m pytest -q` and `cd packages/js && npm test` — **byte-identical** golden SVGs (the renderer is untouched). |
| **NFR-CS-04** (footprint) | `git diff website/app/package.json` shows **no new runtime dep**; `gzip -c website/app/kymo.bundle.js \| wc -c` stays in the canvas-jam band (~107 KB gzip ± chrome); `build.sh` / `deploy-website.yml` unchanged. |
| **NFR-CS-05** (theme parity) | `TC-CS-01` + a chrome-MCP screenshot pass in both themes with no missing/garbled surfaces. |

## 5. Traceability matrix

Every requirement → ≥ 1 covering test (the `FEAT-STUDIO-001` invariant).

| Requirement | Covering test(s) |
|-------------|------------------|
| FR-CS-01 | TC-CS-01; §4 (NFR-CS-05) |
| FR-CS-02 | TC-CS-02; `TC-18` (round-trip via Undo) |
| FR-CS-03 | TC-CS-03 |
| FR-CS-04 | TC-CS-04; §3 (golden gate) |
| FR-CS-05 | TC-CS-05 |
| FR-CS-06 | TC-CS-06 |
| NFR-CS-01 | §4 |
| NFR-CS-02 | §3 (render-guard); §4 |
| NFR-CS-03 | §4 (golden gate) |
| NFR-CS-04 | §4 |
| NFR-CS-05 | TC-CS-01; §4 |

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial V&V: `TC-CS-01..06` (tokens/theme, top bar, tool rail, item styling, selection affordances, status bar), the regression gates (`TEST-CANVAS-001`/`TEST-JAM-001`/render-guard) + golden-safety, NFR methods, traceability. **P2 build:** `TC-CS-02` updated for the client-only top-bar trim (no breadcrumb/star/Comments/Versions/presence). **P3 build:** `TC-CS-03` updated for the left rail + `hand`/grab-pan + V/H/P/S/T shortcuts. **P4 build:** `TC-CS-04` updated for renderSVG-matched items (glyph node, purple-dashed inner region, flow-dash edge). |

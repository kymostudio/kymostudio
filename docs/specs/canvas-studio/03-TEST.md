---
title: Canvas Studio — Verification & Validation
document_id: TEST-STUDIO-001
version: "0.6"
issue_date: 2026-05-24
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the editor chrome; reviewers
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
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
| Version           | 0.6                                                            |
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
7. **Chrome de-dup** — one owner per control: no floating toolbar; sample + background in the top
   bar; a single Export; a single `Code` toggle (no `Preview` tab, code hidden on first load —
   `CR-STUDIO-002`).

> **E2E conventions (from project memory).** Drive with **trusted events** (Playwright), **wait for
> the tool button to show `active`** before driving the canvas, and use `elementsFromPoint` for
> `pointer-events:none` hit-tests. These are load-bearing for the tool-rail and selection cases.

## 2. Feature test cases (`TC-CS`)

| TC | Requirement | Ring | Assertion |
|----|-------------|------|-----------|
| **TC-CS-01** | FR-CS-01 | unit/E2E | With `[data-theme="dark"]` then `"light"`, the ported token custom-properties resolve to the expected values on `:root`; key chrome surfaces (`--bg`, `--accent`, `--tok-*`) are non-empty in both; toggling theme flips them. |
| **TC-CS-02** | FR-CS-02 | E2E | The top bar renders. **Undo/redo:** drag a `kymo-node` → Undo restores its origin **and** the `.kymo` text round-trips (re-uses `TC-18`/`TC-J-02` behaviour); Redo re-applies. **Theme** toggle flips `[data-theme]`. **Export** downloads a board `<svg>`; **Share** writes a `?script=` link. The **Code** toggle hides/shows the `.kymo` pane (single control — no `Preview` tab, `CR-STUDIO-002`/`TC-CR2-01`; default code-hidden, `TC-CR2-02`). The bar is **client-only** — it has **no** breadcrumb/star/Comments/Versions/presence chrome. |
| **TC-CS-03** | FR-CS-03 | E2E | Clicking an enabled rail tool sets it active **and** the canvas enters that tool (draw → pointer-drag makes a `freedraw`; `hand` → grab cursor, drag pans); its keyboard shortcut (V/H/P/S/T) selects the same tool; a shortcut typed **inside** the `.kymo` `<textarea>` does **not** switch tools; a disabled placeholder tool does not activate on click. |
| **TC-CS-04** | FR-CS-04 | E2E/visual | For the AIQ sample: a `kymo-node` renders the real cloud-icon glyph + name; a `kymo-region` matches `renderSVG` — inner (`dash:"dashed"`) is purple `#7c3aed` dashed + purple label, outer is slate `#cbd5e1` solid; a `kymo-edge` is `#94a3b8` with a running flow-dash (`getComputedStyle(line).animationName === "kymo-edge-flow"`, `stroke-dasharray="6 4"`). chrome-MCP screenshot visually matches `renderSVG`. |
| **TC-CS-05** | FR-CS-05 | E2E | Selecting a `kymo-node` shows the **`selection-size`** badge (text `/^\d+ × \d+$/`) + **four `selection-handle`** corner squares; dragging the node keeps the badge tracking it (boundingBox shifts with the drag); clicking empty canvas clears it. (`e2e/selection.spec.ts`, 3 cases.) |
| **TC-CS-06** | FR-CS-06 | E2E | `status-counts` shows non-zero `N nodes · M edges` (AIQ = 19/20); reading `status-zoom`, `status-zoom-in` raises the `%` and `status-zoom-fit` re-zooms; (chrome-anhv) wheel/buttons update the `%` with **0 shape re-renders**, and the autosave chip flips `Saving…`→`Saved` on edit. (`e2e/status.spec.ts`, 2 cases.) |
| **TC-CS-07** | FR-CS-07 | E2E | No floating `.toolbar` exists in the DOM; the top bar holds `topbar-sample` and a 3-mode background control — `topbar-bg-light`/`-dark` flip `[data-theme]`, `topbar-bg-transparent` flips the canvas bg **without** changing `[data-theme]`; **exactly one** Export control exists (the old floating `#download` is gone); a single `tab-code` toggles the `.kymo` pane both ways (its `active` ⇔ pane shown) with **no** `tab-preview` in the DOM, and first load is canvas-first (code hidden) — `CR-STUDIO-002`/`TC-CR2-01`/`TC-CR2-02`. (`e2e/chrome.spec.ts`.) |

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
| FR-CS-07 | TC-CS-07 |
| NFR-CS-01 | §4 |
| NFR-CS-02 | §3 (render-guard); §4 |
| NFR-CS-03 | §4 (golden gate) |
| NFR-CS-04 | §4 |
| NFR-CS-05 | TC-CS-01; §4 |

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial V&V: `TC-CS-01..06` (tokens/theme, top bar, tool rail, item styling, selection affordances, status bar), the regression gates (`TEST-CANVAS-001`/`TEST-JAM-001`/render-guard) + golden-safety, NFR methods, traceability. **P2 build:** `TC-CS-02` updated for the client-only top-bar trim (no breadcrumb/star/Comments/Versions/presence). **P3 build:** `TC-CS-03` updated for the left rail + `hand`/grab-pan + V/H/P/S/T shortcuts. **P4 build:** `TC-CS-04` updated for renderSVG-matched items (glyph node, purple-dashed inner region, flow-dash edge). **P5 build:** `TC-CS-05` → `e2e/selection.spec.ts` (size badge + 4 handles + drag-track + clear-on-empty). **P6 build:** `TC-CS-06` → `e2e/status.spec.ts` (counts + zoom-in/% + fit). **All `TC-CS-01..06` covered; canvas-studio complete.** |
| 0.2     | 2026-05-25 | Vũ Anh | **P7 build:** added **`TC-CS-07`** → `e2e/chrome.spec.ts` (4 cases): no floating toolbar · single Export · sample + 3-mode background in the top bar · truthful `Code`/`Preview` tabs. Added the §1 strategy bullet 7 and the `FR-CS-07 → TC-CS-07` traceability row. |
| 0.3     | 2026-05-25 | Vũ Anh | **Renumber for reading order.** Renamed `04-TEST.md` → `05-TEST.md` so the `NN-` prefix follows the reading order (`01-INTRO` first); content unchanged. See `FEAT-STUDIO-001` §2. |
| 0.4     | 2026-05-25 | Vũ Anh | **TC-CS-07 now backed by a real test (`CR-STUDIO-001`).** `e2e/chrome.spec.ts` (4 cases) exists and passes — the 0.2 "P7 build" entry is now factual (previously design-ahead, the file did not exist). Full suite **21/21** green. No test scope change. |
| 0.5     | 2026-05-28 | Vũ Anh | **Restructure to repo-norm layout.** Renamed `05-TEST.md` → `04-TEST.md`; the §5 traceability matrix is retained as the RTM (ISO/IEC/IEEE 29148 / 15289, right-sized as a section). No test scope change. See `FEAT-STUDIO-001` Annex A 0.4. |
| 0.6     | 2026-05-31 | Vũ Anh | **`CR-STUDIO-002` re-baseline — editor-chrome simplification.** `TC-CS-02` Code-tab assertion → single `Code` toggle (no `Preview`; default code-hidden), citing `TC-CR2-01`/`TC-CR2-02`. `TC-CS-07` updated: a single `tab-code` toggles both ways with **no** `tab-preview` in the DOM and first load is canvas-first (dropped the `tab-preview`-inverse assertion + the stale "4 cases" count). §1 strategy bullet 7 reworded. Full suite **23/23** green; `js` goldens byte-identical. |

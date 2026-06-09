---
title: Kymo Editor (editor.kymo.studio) — Verification & Validation
document_id: TEST-KEDITOR-001
version: "0.1"
issue_date: 2026-06-10
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the live flowchart editor and the kymo-mcp Worker; reviewers
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - FEAT-KEDITOR-001
  - DESIGN-KEDITOR-001
  - PLAN-KEDITOR-001
authors:
  - Vũ Anh
language: en
keywords:
  - verification
  - validation
  - iso-29119
  - test-cases
  - traceability
  - kymo-editor
  - websocket
  - mcp
  - durable-objects
---

# Kymo Editor (editor.kymo.studio) — Verification & Validation

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `TEST-KEDITOR-001` |
| Version           | 0.1 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (requirements), `DESIGN-KEDITOR-001` (design), `PLAN-KEDITOR-001` (plan) |

> V&V per **ISO/IEC/IEEE 29119**. Test cases are `TC-KE-NN`. kymo-editor adds **no renderer**, so its primary correctness gate is that the **engine output is unchanged** — the existing `kymostudio` (`npm test`) and Python golden suites stay green. This document additionally specifies smoke/E2E cases for the client page and integration cases for the live-sync + MCP Worker.

---

## 1. Strategy

- **Client smoke / E2E** — manual or browser-driven checks against editor.kymo.studio (or a local `dist/` served statically): render a sample, debounce, download, error surface, offline render.
- **Worker integration** — drive the room over its raw channels (`/set`, `/get`, `/ws`) and over MCP (`/mcp`), asserting persistence, fan-out, and echo behaviour.
- **Regression gate** — the engine that produces the SVG is reused unchanged; the relevant golden/`node --test` suites in `packages/js` and `packages/python` MUST stay byte-identical (no editor change should touch them).

## 2. Feature test cases (`TC-KE`)

| ID | Case | Steps / expectation | Verifies |
|----|------|---------------------|----------|
| **TC-KE-01** | Client render | Type a `flowchart TD { … }` block → SVG appears in the preview; status reads `OK · <bytes> · <ms>ms`. | FR-KE-01, FR-KE-02 |
| **TC-KE-02** | Debounce | Rapid keystrokes → render fires once ~120 ms after the last keystroke, not per keystroke. | FR-KE-02 |
| **TC-KE-03** | Offline render | Disconnect network after first load, edit source → still renders (no roundtrip). | FR-KE-01, NFR-KE-01 |
| **TC-KE-04** | Download | Click download → `flowchart.svg` saved; bytes equal the displayed SVG. | FR-KE-03 |
| **TC-KE-05** | Icon CDN | A diagram using an icon resolves art from the jsDelivr base URL (no local asset). | FR-KE-04 |
| **TC-KE-06** | Error surface | Enter malformed source → status shows the engine message in error state; page does not crash. | FR-KE-05 |
| **TC-KE-07** | Two-tab live sync | Open two tabs; edit in tab A → tab B adopts the source and re-renders; tab A is **not** overwritten by its own echo. | FR-KE-06, FR-KE-07 |
| **TC-KE-08** | Empty-room seed | First tab into an empty room → room adopts that tab's source (subsequent `get`/connect returns it). | FR-KE-08 |
| **TC-KE-09** | Persist & replay | `POST /set` a source, then open `/ws` (or reload a tab) → the new socket receives the persisted source as a `doc` from origin `server`. | FR-KE-09 |
| **TC-KE-10** | Reconnect | Drop the socket → client clears live state and reconnects within ~2 s (`⚡` returns). | FR-KE-06, NFR-KE-04 |
| **TC-KE-11** | `set_diagram` | From an MCP host call `set_diagram(source)` → every open tab updates; tool returns `Pushed <n> chars … (<k> live tab(s) updated)`. | FR-KE-10 |
| **TC-KE-12** | `get_diagram` | Call `get_diagram()` → returns the on-screen source, or `(editor is empty)` for an empty room. | FR-KE-11 |
| **TC-KE-13** | Transports | `/mcp` completes an MCP handshake (Streamable HTTP); `/sse` serves the legacy transport; `/` returns the banner; unknown path → 404. | FR-KE-12 |
| **TC-KE-14** | Deploy shape | A push touching `packages/editor/web/**` triggers `deploy-editor.yml`; it builds wasm → js → editor and `pages deploy`s `dist/` to project `kymo-editor`. | NFR-KE-02, NFR-KE-03 |

## 3. Regression gates (must stay green)

| Gate | Command | Expectation |
|------|---------|-------------|
| JS engine | `cd packages/js && npm test` | Unchanged — editor does not modify the engine. |
| Python goldens | `cd packages/python && uv run --group dev python -m pytest -q` | Byte-identical goldens (`test_diagrams.py`, `test_layout.py`, `test_edges.py`) unaffected. |

If either gate moves because of an editor change, the change is **out of scope** for kymo-editor and must be re-reviewed.

## 4. Non-functional verification

- **NFR-KE-01 (performance):** the `<ms>ms` in the status line is in the tens on a typical laptop; TC-KE-03 confirms no network dependency.
- **NFR-KE-02 (operability):** TC-KE-14 confirms static-Pages + serverless-Worker deploy with no server.
- **NFR-KE-03 (portability):** `dist/` is `index.html` + one ESM `app.js` with wasm inlined (inspect the build output).
- **NFR-KE-04 (reliability):** TC-KE-10 (reconnect) + DO hibernation/restore via TC-KE-09.
- **NFR-KE-05 (compatibility):** §3 regression gates — output is the unchanged `kymostudio` engine.

## 5. Traceability matrix

| Requirement | Test case(s) |
|-------------|--------------|
| FR-KE-01 | TC-KE-01, TC-KE-03 |
| FR-KE-02 | TC-KE-01, TC-KE-02 |
| FR-KE-03 | TC-KE-04 |
| FR-KE-04 | TC-KE-05 |
| FR-KE-05 | TC-KE-06 |
| FR-KE-06 | TC-KE-07, TC-KE-10 |
| FR-KE-07 | TC-KE-07 |
| FR-KE-08 | TC-KE-08 |
| FR-KE-09 | TC-KE-09 |
| FR-KE-10 | TC-KE-11 |
| FR-KE-11 | TC-KE-12 |
| FR-KE-12 | TC-KE-13 |
| NFR-KE-01 | TC-KE-03 |
| NFR-KE-02 | TC-KE-14 |
| NFR-KE-03 | TC-KE-14 |
| NFR-KE-04 | TC-KE-09, TC-KE-10 |
| NFR-KE-05 | §3 regression gates |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial V&V. `TC-KE-01..14` covering client render/debounce/offline/download/error, two-tab live sync, empty-room seed, persist/replay, reconnect, `set_diagram`/`get_diagram`, transports, and deploy shape. Regression gates pin the unchanged engine output. Full FR/NFR → TC traceability. |

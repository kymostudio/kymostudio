---
title: Kymo Editor (editor.kymo.studio) — Verification & Validation
document_id: TEST-KEDITOR-001
version: "0.3"
issue_date: 2026-06-12
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the live diagram editor and the kymo-mcp Worker; reviewers
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
  - d1
  - kroki
  - url-sharing
---

# Kymo Editor (editor.kymo.studio) — Verification & Validation

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `TEST-KEDITOR-001` |
| Version           | 0.3 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (requirements), `DESIGN-KEDITOR-001` (design), `PLAN-KEDITOR-001` (plan) |

> V&V per **ISO/IEC/IEEE 29119**. Test cases are `TC-KE-NN`. kymo-editor adds **no renderer**, so its primary correctness gate is that the **engine output is unchanged** — the existing `kymostudio` (`npm test`) and Python golden suites stay green. `packages/editor` itself carries **no automated test suite**: the cases below are **manual procedures** (browser-driven against editor.kymo.studio or a locally served `dist/`, plus raw-channel/MCP drives against the Worker), and the deploy workflow's build success is the only per-push gate. Automating the share-codec round-trip (TC-KE-15) and the room protocol (TC-KE-07..09) is the standing candidate for a future CI ring.

---

## 1. Strategy

- **Client smoke / E2E (manual)** — drive editor.kymo.studio (or `build.sh` output served statically): render, debounce, kinds, editing surface, sharing, export, accounts, library.
- **Worker integration (manual)** — drive a room over `/ws` and the REST APIs, and the MCP endpoint over `/mcp` from a real host (Claude), asserting ownership, persistence, fan-out, and echo behaviour.
- **Regression gate (automated, indirect)** — the engine producing the kymo SVG is reused unchanged; the golden/`node --test` suites in `packages/js` and `packages/python` MUST stay green (no editor change may touch them).
- **Deploy gate (automated)** — `deploy-editor.yml` must build wasm → js → bundle on every relevant push; a red deploy blocks the site from updating.
- **Two accounts needed** for the ownership cases (TC-KE-19): one owner, one intruder.

## 2. Feature test cases (`TC-KE`)

| ID | Case | Steps / expectation | Verifies |
|----|------|---------------------|----------|
| **TC-KE-01** | Kymo client render | Type a `flowchart TD { … }` block → SVG appears; status reads `OK · <bytes> · <ms>ms`. | FR-KE-01, FR-KE-02 |
| **TC-KE-02** | Debounce & stale guard | Rapid keystrokes → one render ~120 ms after the last (kymo) / ~450 ms (kroki kind). With a slow kroki response in flight, keep typing → the older response never paints over the newer one. | FR-KE-02 |
| **TC-KE-03** | Offline kymo render | Load the editor route (engine chunk fetched), disconnect network, edit kymo source → still renders. (Kroki kinds legitimately fail offline.) | FR-KE-01, NFR-KE-01 |
| **TC-KE-04** | SVG export | Export → To SVG → `<title>.svg` saved; bytes equal the displayed SVG. | FR-KE-03 |
| **TC-KE-05** | Icon CDN | A kymo diagram using an icon resolves art from the jsDelivr base URL (no local asset, network panel shows cdn.jsdelivr.net). | FR-KE-04 |
| **TC-KE-06** | Error surface | Malformed kymo source → engine message in the status line (error state). Malformed Mermaid → kroki's error text shown. Page never crashes. | FR-KE-05 |
| **TC-KE-07** | Two-tab live sync | Same account, two tabs on one `?d=` → edit in A appears in B (and vice versa); neither tab is overwritten by its own echo; `⚡` shows while connected. | FR-KE-06, FR-KE-07 |
| **TC-KE-08** | Fresh-room seed + auto-title | Open + New (empty room): the sample renders but is **not** persisted (reload another tab → still empty). Type one edit → room seeds; for kymo the header title becomes the first node label. | FR-KE-08 |
| **TC-KE-09** | Persist & replay | Edit, wait > 30 s or close the tab → `/diagrams` shows the diagram with current title/kind/timestamp; reopening `?d=` replays the source (DO), and a brand-new session lists it (D1). | FR-KE-09, NFR-KE-04 |
| **TC-KE-10** | Socket loss behaviour | Kill the WS (devtools/offline) → `⚡` clears; editing continues locally; navigating to the room again (or token refresh) re-establishes the socket. *No timed auto-reconnect is expected* (risk R10). | FR-KE-06 |
| **TC-KE-11** | MCP create + live edit | From an OAuth'd MCP host: `new_diagram` returns id + URL; open it; `edit_diagram(source)` updates the open tab live and reports the live-tab count. | FR-KE-10, SN-KE-04 |
| **TC-KE-12** | MCP read/list/delete | `get_diagram` returns the on-screen source + kind; `list_diagrams` lists most-recent first with URLs; `delete_diagram` removes it from `/diagrams` and closes its room sockets. | FR-KE-10 |
| **TC-KE-13** | Transports & routing | `/mcp` completes a Streamable-HTTP MCP handshake behind OAuth (`/authorize` → GIS → `/token`); `/sse` serves the legacy transport; `/` returns the banner; `/set`/`/get` are **not** reachable as public Worker routes (404). | FR-KE-11, FR-KE-12 |
| **TC-KE-14** | Deploy shape | A push touching `packages/editor/web/**` triggers `deploy-editor.yml`: wasm → js → `build.sh` → `pages deploy` to project `kymo-editor`. `dist/` contains the SPA `_redirects`, cache-busted asset URLs, and a separate `chunks/engine-*.js`. | NFR-KE-02, NFR-KE-03 |
| **TC-KE-15** | Share round-trip | Edit signed-out → address bar gains `?s=` (300 ms); open that URL in a private window → identical source + kind restored; a kroki.io GET payload pasted into `?s=` decodes; a corrupted payload shows the invalid-link error. | FR-KE-25, FR-KE-26, NFR-KE-07 |
| **TC-KE-16** | Share popover | Open Share → the working URL is already in the clipboard and the popover shows it (select-on-focus field + Copy, per-variant "Copied" state); Copy Markdown link yields `[<title>](<url>)`; on a non-kymo kind, Copy Markdown image yields a `https://kroki.io/<kind>/svg/<payload>` GET URL that renders the same diagram when fetched; a link > 2 000 chars shows the truncation warning; with clipboard blocked, the prompt fallback appears. | FR-KE-27 (re-baselined as `FR-SH-03` v0.2) |
| **TC-KE-17** | Kind switch + samples | Select Mermaid → Mermaid sample loads, renders via kroki.io, syntax highlight switches; the library row shows the kind badge. `?k=` on a share link restores the kind (unknown `k` ignored → kymo). | FR-KE-13, FR-KE-14, FR-KE-15 |
| **TC-KE-18** | Editing surface | Line numbers, undo/redo (Ctrl/Cmd-Z), bracket match, Tab indents; drag the splitter (clamps 15–85 %), reload → position kept; double-click → 50/50. | FR-KE-15, FR-KE-16 |
| **TC-KE-19** | Ownership enforcement | Account B opens A's `?d=` URL → WS refused (403), no content leaks; B's REST `DELETE`/`PATCH` on A's diagram → 403/forbidden; B's MCP `edit_diagram(id)` → "isn't yours". | FR-KE-19, NFR-KE-06 |
| **TC-KE-20** | Sign-in / sign-out | Signed out: editing + sharing + export all work; Sign in → header shows account; `/` redirects to the most-recent diagram; Sign out → token cleared, GIS auto-select disabled, signed-out mode returns. Expired token (exp − 30 s) treated as signed out. | FR-KE-17, FR-KE-18, FR-KE-21 |
| **TC-KE-21** | Library page | `/diagrams`: rows sorted by recency with relative times; search filters by title; switching workspace tabs filters; move selector re-homes a row; delete (with confirm) removes row + room; window re-focus refreshes the list. | FR-KE-20 |
| **TC-KE-22** | Workspaces | Create (name ≤ 40), rename, delete a workspace; deletion moves its diagrams back to Personal; + New lands in the selected workspace; a deleted-but-stored `kymo_ws` falls back to Personal. | FR-KE-23, FR-KE-24 |
| **TC-KE-23** | PNG / source export | Export → To PNG → `<title>.png` at 2× with white background; Export → Source → `<title>.kymo` (kymo) / `<title>.<kind>.txt` (other kinds), bytes equal the buffer. | FR-KE-28, FR-KE-29 |
| **TC-KE-24** | Kroki SVG sanitization | Craft a Mermaid (or other kroki-kind) source whose labels embed `<script>`, an event-handler attribute (e.g. `onload`/`onerror`), and a `javascript:` link; open it via a `?s=` share link in a fresh session → the diagram renders but **nothing executes** and the injected preview DOM contains no script/handler/`javascript:` URL; an ordinary Mermaid diagram with `htmlLabels` (foreignObject) still shows all its labels. | FR-RD-09 (`FEAT-KRENDER-001` v0.2), NFR-KE-06 |

## 3. Regression gates (must stay green)

| Gate | Command | Expectation |
|------|---------|-------------|
| JS engine | `cd packages/js && npm test` | Unchanged — editor does not modify the engine. |
| Python goldens | `cd packages/python && uv run --group dev python -m pytest -q` | Byte-identical goldens (`test_diagrams.py`, `test_layout.py`, `test_edges.py`) unaffected. |
| Editor build | `deploy-editor.yml` on push | wasm + js + bundle build green; deploy completes. |

If an engine gate moves because of an editor change, the change is **out of scope** for kymo-editor and must be re-reviewed.

## 4. Non-functional verification

- **NFR-KE-01 (performance):** the `<ms>ms` for kymo renders is in the tens on a typical laptop; TC-KE-03 confirms no network dependency for kymo; TC-KE-02 confirms kroki latency never blocks or misorders the UI.
- **NFR-KE-02 (operability):** TC-KE-14 confirms static-Pages + serverless-Worker deploy with no server.
- **NFR-KE-03 (portability):** inspect `dist/` — SPA shell + split chunks, engine (wasm-inlined) in its own chunk, `?v=` cache-busted URLs; load `/diagrams` cold and confirm the engine chunk is not fetched.
- **NFR-KE-04 (reliability):** TC-KE-09 — DO hibernation/restore plus the D1 flush on disconnect.
- **NFR-KE-05 (compatibility):** §3 regression gates — kymo output is the unchanged `kymostudio` engine.
- **NFR-KE-06 (security):** TC-KE-19; additionally confirm a forged/expired ID token is rejected (401) on `/ws` and `/api/*`. Client-side, TC-KE-24 covers the third-party-SVG surface (kroki output sanitized before DOM injection — FR-RD-09).
- **NFR-KE-07 (share compatibility):** TC-KE-15's kroki-payload interchange in both directions.

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
| FR-KE-10 | TC-KE-11, TC-KE-12 |
| FR-KE-11 | TC-KE-13 |
| FR-KE-12 | TC-KE-13 |
| FR-KE-13 | TC-KE-17 |
| FR-KE-14 | TC-KE-17 |
| FR-KE-15 | TC-KE-17, TC-KE-18 |
| FR-KE-16 | TC-KE-18 |
| FR-KE-17 | TC-KE-20 |
| FR-KE-18 | TC-KE-20 |
| FR-KE-19 | TC-KE-19 |
| FR-KE-20 | TC-KE-21 |
| FR-KE-21 | TC-KE-20 |
| FR-KE-22 | TC-KE-08 (auto-title), TC-KE-09 (persists) |
| FR-KE-23 | TC-KE-22 |
| FR-KE-24 | TC-KE-21, TC-KE-22 |
| FR-KE-25 | TC-KE-15 |
| FR-KE-26 | TC-KE-15 |
| FR-KE-27 | TC-KE-16 |
| FR-KE-28 | TC-KE-23 |
| FR-KE-29 | TC-KE-23 |
| FR-RD-09 (`FEAT-KRENDER-001`) | TC-KE-24 |
| NFR-KE-01 | TC-KE-02, TC-KE-03 |
| NFR-KE-02 | TC-KE-14 |
| NFR-KE-03 | TC-KE-14, §4 |
| NFR-KE-04 | TC-KE-09 |
| NFR-KE-05 | §3 regression gates |
| NFR-KE-06 | TC-KE-19, TC-KE-24, §4 |
| NFR-KE-07 | TC-KE-15 |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial V&V. `TC-KE-01..14` covering client render/debounce/offline/download/error, two-tab live sync, empty-room seed, persist/replay, reconnect, `set_diagram`/`get_diagram`, transports, and deploy shape. Regression gates pin the unchanged engine output. Full FR/NFR → TC traceability. |
| 0.2     | 2026-06-12 | Vũ Anh | **Re-baseline alongside `FEAT-KEDITOR-001` v0.2.** Revised `TC-KE-02` (per-kind debounce + stale guard), `TC-KE-04` (title-named SVG), `TC-KE-07..09` (per-diagram rooms, lazy-seed + auto-title, DO + D1 persistence), `TC-KE-10` (socket-loss expectation — **no timed reconnect**, replacing the v0.1 reconnect case), `TC-KE-11..13` (per-user MCP tool set behind OAuth; `/set`/`/get` no longer public), `TC-KE-14` (split chunks + cache-bust). Added `TC-KE-15..23` (share round-trip + button, kinds/samples/highlighting, editing surface, ownership, sign-in/out, library, workspaces, PNG/source export). Strategy now states honestly that `packages/editor` has **no automated suite** (manual procedures + engine/deploy gates) and names the automation candidates. Traceability extended to `FR-KE-13..29`, `NFR-KE-06..07`. |
| 0.3     | 2026-06-12 | Vũ Anh | **Kroki-integration reconciliation.** Added **`TC-KE-24`** — kroki SVG sanitization (malicious `?s=` source → scripts/handlers/`javascript:` stripped, nothing executes; Mermaid `htmlLabels` foreignObject content survives) — covering the previously untested `FR-RD-09` (`FEAT-KRENDER-001` v0.2) and extending the NFR-KE-06 surface client-side. Revised **`TC-KE-16`** to the shipped share popover (auto-copy on open, Markdown link/image variants incl. the kroki.io GET URL, > 2 000-char warning — `FR-SH-03`, `FEAT-KSHARE-001` v0.2). Traceability rows added for both. |

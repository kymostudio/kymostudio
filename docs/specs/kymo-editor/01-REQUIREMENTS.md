---
title: Kymo Editor (editor.kymo.studio) — Requirements (ConOps, StRS & SRS)
document_id: FEAT-KEDITOR-001
version: "0.3"
issue_date: 2026-06-12
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the live diagram editor (`packages/editor/`) and the kymo-mcp Worker (`packages/mcp/`); reviewers; stakeholders
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - DESIGN-KEDITOR-001
  - TEST-KEDITOR-001
  - PLAN-KEDITOR-001
  - FEAT-KRENDER-001
  - FEAT-KSHARE-001
  - FEAT-KLIVE-001
  - FEAT-KLIBRARY-001
  - FEAT-KEMCP-001
  - FEAT-FLOWCHART-001
  - FEAT-KYMOJSON-001
  - FEAT-KMCP-001
  - FEAT-CANVAS-001
  - FEAT-STUDIO-001
  - REF-KROKI-001
  - RES-MCP-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - umbrella
  - conops
  - stakeholder-requirements
  - requirements
  - srs
  - iso-29148
  - kymo-editor
  - editor-kymo-studio
  - react-spa
  - client-side-render
  - wasm
  - codemirror
  - kroki
  - google-sign-in
  - workspaces
  - d1
  - url-sharing
  - cloudflare-pages
  - mcp
  - durable-objects
  - live-sync
  - acceptance-criteria
---

# Kymo Editor (editor.kymo.studio) — Requirements (ConOps, StRS & SRS)

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `FEAT-KEDITOR-001` |
| Version           | 0.3 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `DESIGN-KEDITOR-001` (how), `TEST-KEDITOR-001` (V&V), `PLAN-KEDITOR-001` (plan), `FEAT-KRENDER-001` / `FEAT-KSHARE-001` / `FEAT-KLIVE-001` / `FEAT-KLIBRARY-001` / `FEAT-KEMCP-001` (the five modules — see §B.7), `FEAT-FLOWCHART-001` (the native DSL), `FEAT-KYMOJSON-001` (the engine intermediate), `FEAT-KMCP-001` (the sibling *local* npx MCP server), `FEAT-CANVAS-001` / `FEAT-STUDIO-001` (sibling canvas editors), `REF-KROKI-001` (the external render gateway), `RES-MCP-001` (MCP landscape) |

> This document consolidates the product description (ConOps & StRS), specification overview, and feature requirements (SRS) for **kymo-editor** — the diagram editor at **editor.kymo.studio** and its serverless backend (the `kymo-mcp` Cloudflare Worker at mcp.kymo.studio). It owns the `SN-KE-NN` stakeholder needs and the `FR-KE`/`NFR-KE` requirement IDs, and is the **normative reference** for the shipped system. Version 0.2 **re-baselines** the spec for the product as shipped on 2026-06-12: a React SPA with Google accounts, a per-user multi-diagram library organised into workspaces, CodeMirror editing, 28 kroki.io diagram kinds beside the native kymo DSL, account-free URL sharing, and a per-diagram live-sync + MCP channel (v0.1 described the predecessor: a single textarea, no accounts, one shared room). Since v0.3, kymo-editor is an **umbrella**: the SRS surface is decomposed into five as-built modules under `modules/` (§B.7); this document remains the baseline of record until a module re-baselines its own carve-out.

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

kymo authors a diagram-as-code DSL; the fastest way to feel that loop is to type source and watch the diagram appear. v0.1 of this product solved that minimally — a static page that renders the kymo `flowchart{}`/`bpmn{}` blocks in-browser (wasm) plus one shared live room an LLM could draw into. Three pressures pushed past it:

1. **Real use needs documents.** One shared canvas means any two visitors clobber each other; nothing is named, owned, or findable again. The product needed accounts, many diagrams per user, titles, and a place to come back to.
2. **Real diagrams aren't all kymo.** Authors switch between Mermaid, PlantUML, D2, GraphViz and friends; making the editor a one-stop diagram pad multiplies its daily utility at near-zero cost by delegating non-kymo rendering to the kroki.io API (`REF-KROKI-001`).
3. **Sharing must not require sign-in.** A reader given a link should see (and tweak) the diagram with no account — solved kroki-style by compressing the whole source into the URL.

The result keeps the v0.1 spine — static CDN page, client-side wasm render for kymo, one serverless Worker — and grows a thin product around it: Google sign-in, a D1-backed diagram library with workspaces, CodeMirror editing, a kind switcher with per-kind samples, export to SVG/PNG/source, and `?s=` share links.

### A.2 Users & context of operations (ConOps)

- **Anonymous authors** open `https://editor.kymo.studio`, pick a diagram kind, type source on the left and see the render on the right. They can export SVG/PNG/source and copy a **share link** that embeds the entire diagram in the URL (`?s=…`, plus `&k=<kind>` for non-kymo kinds) — no account, no server-side document. Opening someone else's `?s=` link drops the source into the editor, editable and re-shareable; the address bar keeps itself up to date as they type.
- **Signed-in authors** (Google) get a persistent **diagram library**: every diagram is its own document (`?d=<id>`) that autosaves as they type, syncs live across their open tabs, can be renamed in the header, and is listed at `/diagrams` (search, kind badge, relative timestamps, delete). Diagrams can be grouped into named **workspaces** ("Personal" is the default bucket).
- **LLM hosts (Claude Desktop, Cursor, claude.ai)** connect to the remote MCP endpoint (mcp.kymo.studio, Google-OAuth-gated) and manage the *signed-in user's own* diagrams: `new_diagram`, `list_diagrams`, `edit_diagram`, `get_diagram`, `delete_diagram`. Edits pushed by the agent appear live in the user's open editor tabs.
- **Operators** deploy two artefacts and leave them alone: a static `dist/` to Cloudflare Pages (`kymo-editor` project → editor.kymo.studio) and one Cloudflare Worker (`kymo-mcp` → mcp.kymo.studio) with its Durable Objects, a D1 database, and a KV namespace. There is still no VM, container, or render service to run.

### A.3 Goals & non-goals

**Goals.**
- Instant in-browser render of the kymo DSL (`flowchart{}` / `bpmn{}`) — no server roundtrip, render parity with the published `kymostudio` JS engine.
- A practical multi-language diagram pad: 28 kroki.io kinds (Mermaid, PlantUML, D2, GraphViz, …) beside kymo, each with a starter sample and syntax highlighting.
- Accounts and a per-user, workspace-organised diagram library that autosaves and syncs live across tabs.
- Account-free sharing: the whole diagram travels in the URL, kroki-compatible encoding.
- LLM-authorable in real time via remote MCP, scoped to the signed-in user's diagrams.
- Zero-ops hosting: static CDN page + one serverless Worker (+ D1/KV/DO state).

**Non-goals (this version).**
- No collaborative cursors, comments, or presence; live sync is last-writer-wins document state for one owner's tabs (and their agent).
- No durable version history (D1 keeps only the latest snapshot per diagram).
- No multi-user sharing of *server-side* documents — a `?d=` room is owner-only; cross-user sharing is the `?s=` URL payload.
- No self-hosted kroki — non-kymo kinds are delegated to the public kroki.io API.
- No server-side render or export pipeline (export is client-side SVG/PNG/source).
- No DSL coverage beyond what the engine renders (kymo) or what kroki.io accepts (other kinds).

### A.4 Stakeholder needs (`SN-KE`)

| ID | Need |
|----|------|
| **SN-KE-01** | An author wants to type diagram source and see the result **immediately**, with no install and no perceptible render delay. |
| **SN-KE-02** | An author wants to **share** a diagram by sending a single URL, and to **download** the rendered SVG. |
| **SN-KE-03** | An LLM host wants to **create, list, edit, read, and delete** the user's diagrams over a standard MCP transport, with the user watching changes land live. |
| **SN-KE-04** | A viewer wants a diagram pushed by an agent (or typed in another of their tabs) to appear in their open tab **in real time**. |
| **SN-KE-05** | An operator wants **nothing to run or pay for** beyond static hosting and serverless functions — no VM, no render server. |
| **SN-KE-06** | The team wants the kymo output to **match** the `kymostudio` engine exactly (no second renderer to keep in sync). |
| **SN-KE-07** | An author wants to **sign in** and keep **many named diagrams** that are still there tomorrow, from any device. |
| **SN-KE-08** | An author with many diagrams wants to **organise them into workspaces** and find one again by **search** and recency. |
| **SN-KE-09** | An author wants to write **other diagram languages** (Mermaid, PlantUML, D2, GraphViz, …) in the same editor. |
| **SN-KE-10** | A recipient of a shared link wants to **open, edit, and re-share** the diagram **without an account**, and the link must not depend on any stored document. |
| **SN-KE-11** | An author wants to **export PNG** (for docs/slides) and the **source text**, not just SVG. |
| **SN-KE-12** | An author wants a **professional editing surface**: syntax highlighting, line numbers, undo/redo, bracket matching, and an adjustable code/preview split. |

### A.5 Scope

In scope: the client SPA (`packages/editor/web/`), its static build/deploy (`build.sh`, `deploy-editor.yml`, Cloudflare Pages `kymo-editor`), and the `kymo-mcp` Worker (`packages/mcp/`: `EditorRoom` Durable Objects, the diagrams/workspaces REST API, the D1 store, Google-OAuth-gated MCP). Out of scope: the engine itself (`packages/js`, `packages/rust/kymostudio-core` — reused unchanged, specified elsewhere), the kroki.io service (external dependency, surveyed in `REF-KROKI-001`), the *local* npx MCP render server (`FEAT-KMCP-001`), and the legacy server stack (`server.js`, `render_kymo.py`, `mcp-server.js` — retained in-tree as history, not part of the shipped product).

---

## Part B — Introduction

### B.1 Purpose & motivation

This part frames the spec: what kymo-editor is, how the four KEDITOR documents fit together, and how the feature relates to the engine it renders with and the sibling editors.

### B.2 Document map

- `FEAT-KEDITOR-001` (this doc) — the *what*: ConOps, stakeholder needs, SRS.
- `DESIGN-KEDITOR-001` — the *how*: the SPA module map, render paths, share codec, room protocol, D1/REST/MCP backend, build/deploy.
- `TEST-KEDITOR-001` — the *V&V*: test cases and traceability.
- `PLAN-KEDITOR-001` — the *delivery*: the (retrospective) phased history and risk register.
- `modules/` — the five as-built sub-module doc-sets (§B.7): `editor-render`, `editor-share`, `editor-live`, `editor-library`, `editor-mcp`.

### B.3 Relationship to the engine and sibling products

kymo-editor is a **thin shell over renderers it does not own**. Kymo kinds call `parseDiagram` + `renderSVG` from the `kymostudio` package (`FEAT-KYMOJSON-001`), which delegates layout to the `kymostudio-core` wasm; the accepted native DSL is the flowchart block (`FEAT-FLOWCHART-001`). All other kinds are POSTed to kroki.io (`REF-KROKI-001`). It is a **distinct product** from `canvas-editor` / `canvas-studio` (`FEAT-CANVAS-001` / `FEAT-STUDIO-001`) — those are object-graph canvas editors; kymo-editor is text-first with a live preview. Its **remote** MCP channel (this spec) is likewise distinct from the **local** stdio MCP render server (`FEAT-KMCP-001`): the remote channel edits hosted documents the user is watching; the local server renders files on the user's machine.

### B.4 Reading guide

Engineers maintaining the page: Part C §C.1–C.3, §C.7–C.8 + `DESIGN-KEDITOR-001` §2–5. Engineers touching accounts, persistence, live sync, or MCP: Part C §C.4–C.6, §C.9 + `DESIGN-KEDITOR-001` §6–10. Reviewers: Part A + §C.11 acceptance.

### B.5 Status & ownership

Implemented and shipped (see `PLAN-KEDITOR-001` §4). Owned by the `diagrams/` project. This document is the normative reference; `packages/editor/README.md` (the retired Python/server render stack) remains superseded for architecture.

### B.6 Glossary

- **Editor page** — the React SPA route `/` (`packages/editor/web/EditorPage.tsx`): code pane, splitter, preview pane, header chrome.
- **Library page** — the route `/diagrams` (`DiagramsPage.tsx`): the signed-in user's diagram list with workspace tabs.
- **kind** — the diagram language of a document: `kymo` (native, wasm-rendered) or one of 28 kroki.io types.
- **wasm core** — `kymostudio-core` compiled to WebAssembly; performs layout; loaded lazily on the editor route.
- **room** — one diagram's live channel: an **`EditorRoom` Durable Object** keyed by the diagram id, holding the live source/title/kind, the owner, and the connected WebSockets.
- **share link** — a URL carrying the whole diagram source: `?s=<deflate+base64url>` (+ `&k=<kind>` when not kymo). No server document involved.
- **room link** — `?d=<id>`: opens a named diagram (owner-only, requires sign-in).
- **kymo-mcp** — the Cloudflare **Worker** (`packages/mcp`) hosting the rooms, the REST API, and the OAuth-gated MCP agent, at mcp.kymo.studio.
- **D1 index** — the Worker's database of record: `diagrams` and `workspaces` tables (metadata + latest source snapshot).
- **origin id** — a per-tab random token used to suppress WebSocket echo.
- **umbrella / module** — `kymo-editor` is the umbrella (system); `editor-render`/`editor-share`/`editor-live`/`editor-library`/`editor-mcp` are its modules (system elements) under `modules/`.

### B.7 Module decomposition (umbrella)

Since v0.3, the shipped feature is decomposed into **five as-built modules** — the same containment move as the `canvas-studio` umbrella (`FEAT-STUDIO-001` → toolbar/export/items). Each module is a stub doc-set (`01-REQUIREMENTS` only) that **re-homes** its SN/FR/NFR IDs from this document; the *how* stays in `DESIGN-KEDITOR-001` and the V&V in `TEST-KEDITOR-001` until a module grows its own 02/03/04. This document remains the v0.2 baseline of record; new work on a module's surface is specified and re-baselined **in that module**.

```
kymo-editor (FEAT-KEDITOR-001) → UMBRELLA — the shipped editor.kymo.studio product
        ├── editor-render   (FEAT-KRENDER-001)  → authoring & rendering surface   [as-built]
        ├── editor-share    (FEAT-KSHARE-001)   → URL sharing & export            [as-built]
        ├── editor-live     (FEAT-KLIVE-001)    → accounts, rooms & persistence   [as-built]
        ├── editor-library  (FEAT-KLIBRARY-001) → library & workspaces            [as-built]
        └── editor-mcp      (FEAT-KEMCP-001)    → remote MCP channel              [as-built]
```

Dependency direction: `editor-library` and `editor-mcp` build on the `editor-live` spine; `editor-render` and `editor-share` work signed-out, independent of it.

**Re-homing map** (former → new; requirement text is carried verbatim in each module's Part C):

| Module | Stakeholder needs | Functional | Non-functional |
|--------|-------------------|------------|----------------|
| `editor-render` | `SN-KE-01/06/09/12 → SN-RD-01..04` | `FR-KE-01/02/04/05/13/14/15/16 → FR-RD-01..08` | `NFR-KE-01/05 → NFR-RD-01..02` |
| `editor-share` | `SN-KE-02/10/11 → SN-SH-01..03` | `FR-KE-25/26/27/03/28/29 → FR-SH-01..06` | `NFR-KE-07 → NFR-SH-01` |
| `editor-live` | `SN-KE-04/07(partial) → SN-LV-01..02` | `FR-KE-17/18/19/06/07/08/09 → FR-LV-01..07` | `NFR-KE-04/06 → NFR-LV-01..02` |
| `editor-library` | `SN-KE-07(partial)/08 → SN-LB-01..02` | `FR-KE-20..24 → FR-LB-01..05` | — (inherits) |
| `editor-mcp` | `SN-KE-03 → SN-MC-01` | `FR-KE-10..12 → FR-MC-01..03` | — (inherits) |

**Retained by the umbrella (not re-homed):** `SN-KE-05` (zero-ops hosting) and `NFR-KE-02/03` (operability, portability/build) — the platform/deploy contract spans every module, as do `DESIGN-KEDITOR-001` §11–12 and the deploy gate in `TEST-KEDITOR-001`.

---

## Part C — Requirements (SRS)

Requirements use RFC-2119 keywords. Each maps to the stakeholder need(s) it satisfies. IDs `FR-KE-01..12` are carried over from v0.1 (semantics revised where the product moved — revisions are noted inline); `FR-KE-13+` are new in v0.2. **Since v0.3** every `FR-KE`/most `NFR-KE` are additionally **re-homed** into a module ID (§B.7); this Part C stays the v0.2 baseline of record, but changes to a module's surface are specified against the module's IDs.

### C.1 Functional requirements — Render (`FR-KE-01..05`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-01** | The editor SHALL render the kymo `flowchart { }` / `bpmn { }` DSL to SVG **entirely in the browser**, via `parseDiagram(source)` → `renderSVG(...)` from the `kymostudio` package with the `kymostudio-core` wasm initialised once on first use. The engine module SHALL be **lazy-loaded** (dynamic import) so the wasm chunk is fetched only on the editor route. There SHALL be no server roundtrip for kymo rendering. *(v0.2: lazy load added.)* | SN-KE-01, SN-KE-06 |
| **FR-KE-02** | The editor SHALL re-render on input with a debounce of **120 ms for kymo** and **450 ms for kroki kinds**, SHALL discard stale async render responses (a sequence guard), and SHALL show a status line `OK · <n> bytes · <ms>ms` on success. *(v0.2: per-kind debounce + stale guard.)* | SN-KE-01 |
| **FR-KE-03** | The editor SHALL let the user **download** the last successfully rendered SVG, named after the diagram title (`<title>.svg`, falling back to `flowchart.svg`). | SN-KE-02 |
| **FR-KE-04** | The editor SHALL resolve icon art from a CDN base URL (`setIconBaseURL` → jsDelivr `gh/kymostudio/kymostudio@main/packages/icons`), so no icon assets are bundled or served locally. | SN-KE-05, SN-KE-06 |
| **FR-KE-05** | On a parse/render error (engine exception or a kroki error response), the editor SHALL surface the message in the status line (error state) and SHALL NOT crash the page. | SN-KE-01 |

### C.2 Functional requirements — Diagram kinds & samples (`FR-KE-13..14`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-13** | The editor SHALL offer a **kind selector** with `kymo` plus the 28 kroki kinds enumerated in `web/kroki.ts` (ActDiag … WireViz). Non-kymo kinds SHALL render by `POST https://kroki.io/<kind>/svg` with the raw source as the body; a non-OK response SHALL surface as a render error (FR-KE-05). | SN-KE-09 |
| **FR-KE-14** | Switching kind SHALL load that kind's **starter sample** (`web/samples.ts`; each verified to render on kroki.io) into the editor and render it — mirroring kroki.io's own selector behaviour. The current kind SHALL be persisted with the diagram and shown as a badge in the library list. | SN-KE-09 |

### C.3 Functional requirements — Editing surface (`FR-KE-15..16`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-15** | The code pane SHALL be a **CodeMirror 6** editor with line numbers, active-line highlight, undo/redo history, bracket matching, line wrapping, indent-with-Tab, and **per-kind syntax highlighting** (a generic diagram-DSL tokenizer parameterised by keyword set for DSL-ish kinds; JSON/XML/YAML/Clojure/LaTeX/Verilog modes for the rest), themed on the brand palette. External document changes (room updates, kind switch, share-link load) SHALL replace the buffer without echoing back as user edits. | SN-KE-12 |
| **FR-KE-16** | The code/preview split SHALL be adjustable by a **draggable divider** (clamped 15–85 %), persisted to `localStorage` (`kymo_split`), with double-click resetting to 50/50. | SN-KE-12 |

### C.4 Functional requirements — Live sync (`FR-KE-06..09`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-06** | While a signed-in user has a diagram open (`?d=<id>`), the editor SHALL maintain a **WebSocket** to that diagram's room (`wss://mcp.kymo.studio/ws?id_token=…&d=<id>`) and SHALL show a live indicator (`⚡`) while connected. The socket is re-established on room or token change; there is **no timed auto-reconnect** (a v0.1 behaviour dropped in the SPA rewrite — recorded as risk R10 in `PLAN-KEDITOR-001`). *(v0.2: per-diagram room; reconnect behaviour revised.)* | SN-KE-04 |
| **FR-KE-07** | On local edits the editor SHALL push `{type:"set", source, kind, origin}` to the room; it SHALL tag messages with a **per-tab `origin` id** and SHALL **ignore echoes** of its own origin so a tab never overwrites itself. The server SHALL additionally broadcast to all-but-sender. | SN-KE-04 |
| **FR-KE-08** | A brand-new (empty) room SHALL NOT adopt the local starter sample automatically: the sample stays local until the user **actually edits**, at which point the room is seeded and — for kymo sources — a title is **auto-derived from the first node label** (`titleFrom`, e.g. `A[Nhận đơn hàng]` → "Nhận đơn hàng") and sent as a rename. On receiving a non-empty `doc` from another origin, the tab SHALL adopt the incoming source (and kind) and re-render. *(v0.2: lazy-seed + auto-title replaces v0.1's eager seeding.)* | SN-KE-04, SN-KE-07 |
| **FR-KE-09** | The room SHALL **persist** its live state (source, title, kind, owner, diagram id) to Durable Object storage and replay it to a newly connected tab; it SHALL additionally **upsert a snapshot row into D1** — immediately on rename, kind change, and API writes; throttled (≥ 30 s apart) during typing; and flushed when a tab disconnects — so the library index and a later session see current content. *(v0.2: D1 index added beside DO storage.)* | SN-KE-04, SN-KE-07 |

### C.5 Functional requirements — Accounts & ownership (`FR-KE-17..19`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-17** | The SPA SHALL support **Google Sign-In** (GIS): the ID token is kept in `localStorage` (`kymo_idtoken`) and treated as absent when its `exp` is within 30 s; sign-out SHALL clear the token, disable GIS auto-select, and re-offer the prompt. The header SHALL show the account (avatar initial, email) with a sign-out menu. | SN-KE-07 |
| **FR-KE-18** | **Signed-out mode SHALL remain fully usable for authoring**: editing, rendering, kind switching, export, and `?s=` share links MUST work with no account. Only room-backed features (library, autosave, live sync, rename) require sign-in. | SN-KE-01, SN-KE-10 |
| **FR-KE-19** | The backend SHALL verify the Google ID token **server-side** (JWKS, issuer + audience) on every WebSocket connect and REST call, SHALL bind a room to its **first authenticated writer as owner**, and SHALL refuse other accounts' access to the room, its REST records, and its MCP operations (403). An `ALLOWED_EMAILS` allowlist (empty = open) MAY gate the deployment. | SN-KE-07 |

### C.6 Functional requirements — Library & workspaces (`FR-KE-20..24`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-20** | The `/diagrams` **library page** SHALL list the signed-in user's diagrams most-recent first with title, kind badge, relative timestamp, a workspace **move** selector, and **delete** (confirm prompt; destroys the room and the D1 row). It SHALL filter by a **search box** and by the selected workspace tab, and SHALL refresh on window focus / visibility. | SN-KE-08 |
| **FR-KE-21** | Opening `/` signed-in without `?d`/`?s` SHALL redirect to the user's **most-recently updated** diagram, or to a fresh id when they have none. **+ New** SHALL create a fresh id (16 random base62 chars ≈ 95 bits — the id doubles as the room's capability secret), pre-assign it to the current workspace, and navigate to it; the server row is created lazily on first write. | SN-KE-07, SN-KE-08 |
| **FR-KE-22** | The diagram SHALL be **renameable in the header** (click-to-edit, Enter/blur commits, ≤ 60 chars); the rename broadcasts to other tabs (`meta`) and updates the index. | SN-KE-07 |
| **FR-KE-23** | Workspaces SHALL support **create / rename / delete** (name ≤ 40 chars); deleting a workspace moves its diagrams back to Personal. The current workspace (`kymo_ws` in `localStorage`) scopes the library view, the header switcher, and where **+ New** lands; a stored workspace that no longer exists falls back to Personal. | SN-KE-08 |
| **FR-KE-24** | The diagrams and workspaces APIs SHALL be **owner-scoped REST endpoints** on the Worker (`/api/diagrams`, `/api/workspaces`; GET/POST/PATCH/DELETE, CORS-enabled, ID token via query or Bearer) backed by the D1 tables. | SN-KE-07, SN-KE-08 |

### C.7 Functional requirements — URL sharing (`FR-KE-25..27`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-25** | The editor SHALL encode share links **kroki-style**: source → raw-deflate (`CompressionStream("deflate")`, zlib) → **base64url** (`+`→`-`, `/`→`_`, padding stripped) → `/?s=<payload>`, with `&k=<kind>` prepended for non-kymo kinds (omitted for kymo). Decoding SHALL accept payloads lifted from kroki.io GET URLs unchanged; an undecodable payload SHALL surface as a status-line error. | SN-KE-10 |
| **FR-KE-26** | When editing **without a room** (signed out, or a shared link), the editor SHALL keep the address bar a **working share link** — re-encoding into `?s=` via `history.replaceState` on a 300 ms debounce. A `?d=` room link takes precedence over `?s=` when both are present. | SN-KE-10 |
| **FR-KE-27** | A **Share** action SHALL copy the current share URL to the clipboard (with a prompt fallback) and confirm visually ("Copied!"). | SN-KE-02, SN-KE-10 |

### C.8 Functional requirements — Export (`FR-KE-28..29`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-28** | The Export menu SHALL produce a **PNG** of the last rendered SVG at 2× scale (canvas rasterise, white background, `viewBox` fallback for dimensions), named `<title>.png`. | SN-KE-11 |
| **FR-KE-29** | The Export menu SHALL download the **source text** (`<title>.kymo` for kymo; `<title>.<kind>.txt` otherwise) and SHALL also offer the SVG download (FR-KE-03). | SN-KE-11 |

### C.9 Functional requirements — MCP channel (`FR-KE-10..12`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-10** | The Worker SHALL expose **per-user diagram tools** over MCP — `new_diagram(title?, source?, kind?)`, `list_diagrams()`, `edit_diagram(source?, title?, id?, kind?)`, `get_diagram(id?)`, `delete_diagram(id)` — operating only on the authenticated user's diagrams; `edit_diagram`/`get_diagram` default to the user's **most recent** diagram when `id` is omitted. Content writes broadcast live to the user's open tabs and report the live-tab count; create/edit responses include the `?d=` URL. *(v0.2: replaces the single-room `set_diagram`/`get_diagram` pair.)* | SN-KE-03, SN-KE-04 |
| **FR-KE-11** | MCP access SHALL be gated by **Google OAuth**: the Worker serves an OAuth authorization flow (`/authorize` with a GIS login page, `/token`, `/register`) and binds the session's `email` as the tool-call identity. *(v0.2: replaces unauthenticated MCP.)* | SN-KE-03 |
| **FR-KE-12** | The Worker SHALL serve MCP over **Streamable HTTP at `/mcp`** and legacy **SSE at `/sse`**, the live channel at **`/ws`** (WebSocket, routed before the OAuth layer), and the REST APIs of FR-KE-24. The room's raw `/set`/`/get`/`/destroy` handlers SHALL be internal (reachable only via the Worker's own DO stubs), not public routes. *(v0.2: `/set`/`/get` are no longer public.)* | SN-KE-03 |

### C.10 Non-functional requirements (ISO/IEC 25010) (`NFR-KE`)

| ID | Attribute | Requirement |
|----|-----------|-------------|
| **NFR-KE-01** | Performance efficiency | A kymo render MUST complete in the order of tens of milliseconds on a typical laptop and MUST NOT depend on any network call. Kroki renders are network-bound by design and MUST NOT block the UI (async, stale responses dropped). |
| **NFR-KE-02** | Operability | The product MUST run as a **static asset + one serverless Worker** (+ managed D1/KV/DO state) — no VM/container/render server. Deploys are automated on push (`deploy-editor.yml`; `wrangler deploy` for the Worker). |
| **NFR-KE-03** | Portability | The client MUST ship as a static esbuild bundle with **code splitting**: the wasm-bearing engine chunk loads only on the editor route (`--loader:.wasm=binary` inlines the wasm into its chunk); the engine carries zero runtime dependencies. Asset URLs MUST be cache-busted per deploy (Pages serves `max-age=14400`). |
| **NFR-KE-04** | Reliability | The `EditorRoom` MUST be hibernatable (survives idle) and restore its state from storage on wake; D1 MUST receive a flush of the latest source when a tab disconnects, so the index never lags a closed session. |
| **NFR-KE-05** | Compatibility | Kymo output MUST be produced by the **same `kymostudio` engine** the npm package ships — no second renderer. |
| **NFR-KE-06** | Security | ID tokens MUST be verified server-side against Google's JWKS (issuer + audience) on every connect/call; rooms, REST records, and MCP operations MUST be owner-scoped; the room id's entropy (≈ 95 bits) MUST be preserved as it doubles as the access capability. |
| **NFR-KE-07** | Compatibility (sharing) | The `?s=` payload encoding MUST remain **kroki-compatible** (deflate + base64url) so payloads interchange with kroki.io URLs in both directions. |

### C.11 Out of scope / deferred

Collaborative cursors / comments / presence; durable version history; cross-user sharing of server-side documents (use `?s=` links); self-hosted kroki; server-side render/export; timed WebSocket auto-reconnect (dropped in the SPA rewrite — risk R10); offline editing of room-backed documents.

### C.12 Acceptance criteria (feature-level)

1. Typing a `flowchart TD { … }` block renders client-side within ~120 ms of pausing, with the byte/ms status line — and kymo rendering works **offline** after the engine chunk has loaded.
2. Switching the kind to (e.g.) Mermaid loads the Mermaid sample, renders it via kroki.io, highlights its syntax, and shows the kind badge in the library.
3. Signed out: editing keeps the address bar a working `?s=` link; opening that link in a private window reproduces the diagram; Share copies it; Export produces SVG, PNG, and source files named after the title.
4. Signed in: `/` lands on the most-recent diagram; + New creates one in the current workspace; rename in the header sticks; `/diagrams` lists, searches, moves, and deletes; a second tab on the same `?d=` adopts edits live without overwriting itself.
5. A second Google account opening someone else's `?d=` link is refused (403); the owner is unaffected.
6. From an MCP host (after Google OAuth): `new_diagram` returns an id + URL; `edit_diagram` updates the open tab live and reports the tab count; `list_diagrams`/`get_diagram`/`delete_diagram` behave as specified.
7. The deployed system is a Cloudflare Pages static site + the `kymo-mcp` Worker (D1/KV/DO) only.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial requirements for the shipped kymo-editor. Owns `SN-KE-01..06`, `FR-KE-01..12` (browser render, live sync, MCP channel), `NFR-KE-01..05`. Documents the client-side-render + Cloudflare-Pages + `kymo-mcp`-Worker architecture as the normative reference and records that it **supersedes** the Python/server stack described in `packages/editor/README.md`. Retrospective spec for the P-set delivered across commits `466db60` → `47ecb4c` → `0860ace` → `7543db7` (see `PLAN-KEDITOR-001` §4). |
| 0.2     | 2026-06-12 | Vũ Anh | **Re-baseline for the 2026-06-12 product** (commits `58cca51..a3dae51`, P4–P9 in `PLAN-KEDITOR-001`): React SPA + `/diagrams` library, Google accounts, per-diagram owner-scoped rooms, D1 store, workspaces, CodeMirror, 28 kroki kinds + samples, export menu, kroki-style `?s=` URL sharing. Added `SN-KE-07..12`; revised `FR-KE-01..02, 06, 08..12` (per-kind debounce, per-diagram rooms, lazy-seed + auto-title, D1 persistence, per-user MCP tool set, OAuth gating, `/set`/`/get` no longer public); added `FR-KE-13..29` (kinds/samples, CodeMirror/splitter, accounts/ownership, library/workspaces, sharing, export); revised `NFR-KE-01/03` and added `NFR-KE-06/07` (security, share-encoding compatibility). v0.1 non-goals *auth, accounts, named documents, persistence* are now in scope; new non-goals recorded in §A.3. |
| 0.3     | 2026-06-12 | Vũ Anh | **Umbrella decomposition.** kymo-editor becomes an **umbrella** with five as-built modules under `modules/` — `editor-render` (`FEAT-KRENDER-001`), `editor-share` (`FEAT-KSHARE-001`), `editor-live` (`FEAT-KLIVE-001`), `editor-library` (`FEAT-KLIBRARY-001`), `editor-mcp` (`FEAT-KEMCP-001`) — mirroring the `canvas-studio` decomposition. Added §B.7 (module tree + re-homing map), the `modules/` row in §B.2, and the umbrella/module glossary entry; Part C marked as the v0.2 baseline of record with module IDs as the forward change surface. `SN-KE-05` + `NFR-KE-02/03` (platform/deploy) stay umbrella-owned. No requirement content changed. |

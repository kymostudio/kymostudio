---
title: Kymo Editor (editor.kymo.studio) — Requirements (ConOps, StRS & SRS)
document_id: FEAT-KEDITOR-001
version: "0.1"
issue_date: 2026-06-10
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the live flowchart editor (`packages/editor/`) and the kymo-mcp Worker (`packages/mcp/`); reviewers; stakeholders
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - DESIGN-KEDITOR-001
  - TEST-KEDITOR-001
  - PLAN-KEDITOR-001
  - FEAT-FLOWCHART-001
  - FEAT-KYMOJSON-001
  - FEAT-CANVAS-001
  - FEAT-STUDIO-001
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
  - kymo-editor
  - editor-kymo-studio
  - flowchart
  - client-side-render
  - wasm
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
| Version           | 0.1 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `DESIGN-KEDITOR-001` (how), `TEST-KEDITOR-001` (V&V), `PLAN-KEDITOR-001` (plan), `FEAT-FLOWCHART-001` (the DSL it renders), `FEAT-KYMOJSON-001` (the engine intermediate), `FEAT-CANVAS-001` / `FEAT-STUDIO-001` (sibling playground / hi-fi editor) |

> This document consolidates the product description (ConOps & StRS), specification overview, and feature requirements (SRS) for **kymo-editor** — the live, browser-based kymo flowchart editor at **editor.kymo.studio** and its remote MCP live-sync channel (the `kymo-mcp` Cloudflare Worker). It owns the `SN-KE-NN` stakeholder needs and the `FR-KE`/`NFR-KE` requirement IDs. It is the **normative reference** for the shipped system and **supersedes** the architecture described in `packages/editor/README.md` (a retired Python/server render stack).

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

kymo authors a diagram-as-code DSL; the fastest way to feel that loop is to type source and watch the diagram appear. Until now that meant either a local CLI (`uv run kymo …`) or a server-rendered playground. Both have friction: the CLI is not shareable, and a render server is something to operate, pay for, and keep alive (the project went through a Hetzner/Python deployment that proved this — see `PLAN-KEDITOR-001` §4).

**kymo-editor** removes the server entirely. The kymo flowchart DSL renders **in the browser** via the `kymostudio` JS engine plus the `kymostudio-core` WebAssembly layout core (inlined into the bundle), so the page is a static asset on a CDN with no render roundtrip. On top of that, a thin serverless **live-sync channel** lets an LLM host (Claude, via MCP `set_diagram`) push a flowchart into every open editor tab in real time — the editor becomes a live canvas an agent can draw on.

### A.2 Users & context of operations (ConOps)

- **DSL authors** open `https://editor.kymo.studio`, type a `flowchart TD { … }` block on the left, and see the rendered SVG on the right, updating as they type. They can download the SVG. No install, no account.
- **LLM hosts (Claude Desktop, Cursor, claude.ai)** connect to the `kymo-mcp` MCP endpoint and call `set_diagram(source)` to author a diagram and `get_diagram()` to read back what is on screen. The user watching the editor sees the diagram appear live.
- **Operators** deploy two artefacts and then leave them alone: a static `dist/` to Cloudflare Pages (`kymo-editor` project) and one Cloudflare Worker (`kymo-mcp`). There is no VM, container, or render service to run.

### A.3 Goals & non-goals

**Goals.**
- Instant, in-browser render of the kymo `flowchart { }` / `bpmn { }` blocks — no server roundtrip.
- Zero-install, shareable single URL; static hosting on a CDN.
- LLM-authorable in real time via an MCP `set_diagram` / `get_diagram` channel.
- Render parity with the published `kymostudio` JS engine (same parser, same `renderSVG`).

**Non-goals (this version).**
- No authentication, accounts, or per-user documents.
- No multi-room / named-document model — a single shared room (`"default"`).
- No persistence model beyond the room's last-source snapshot in Durable Object storage.
- No server-side render (deliberately removed — see `PLAN-KEDITOR-001` Annex A).
- No DSL coverage beyond what the engine renders today (`flowchart` / `bpmn` blocks).
- No collaborative cursors, comments, or presence (backend-implying — see §C.4).

### A.4 Stakeholder needs (`SN-KE`)

| ID | Need |
|----|------|
| **SN-KE-01** | An author wants to type kymo flowchart source and see the diagram **immediately**, with no install and no perceptible render delay. |
| **SN-KE-02** | An author wants to **share** the editor by sending a single URL, and to **download** the rendered SVG. |
| **SN-KE-03** | An LLM host wants to **author and push** a diagram into the live editor, and **read back** the current source, over a standard MCP transport. |
| **SN-KE-04** | A viewer wants the diagram an agent pushes to appear in their open tab **in real time**, across every open tab. |
| **SN-KE-05** | An operator wants **nothing to run or pay for** beyond static hosting and a serverless function — no VM, no render server. |
| **SN-KE-06** | The team wants the editor's output to **match** the `kymostudio` engine exactly (no second renderer to keep in sync). |

### A.5 Scope

In scope: the client editor page (`packages/editor/web/`), its static build/deploy
(`build.sh`, `deploy-editor.yml`, Cloudflare Pages `kymo-editor`), and the live-sync +
MCP Worker (`packages/mcp/`: `EditorRoom`, `KymoMCP`). Out of scope: the engine itself
(`packages/js`, `packages/rust/kymostudio-core` — reused unchanged, specified elsewhere),
the legacy server stack (`server.js`, `render_kymo.py`, `mcp-server.js` — retained in-tree
as history, not part of the shipped product), and any backend-implying collaboration features.

---

## Part B — Introduction

### B.1 Purpose & motivation

This part frames the spec: what kymo-editor is, how the four KEDITOR documents fit together, and how the feature relates to the engine it renders with and the sibling editors.

### B.2 Document map

- `FEAT-KEDITOR-001` (this doc) — the *what*: ConOps, stakeholder needs, SRS.
- `DESIGN-KEDITOR-001` — the *how*: client render path, build/deploy, the live-sync protocol, the MCP Worker.
- `TEST-KEDITOR-001` — the *V&V*: test cases and traceability.
- `PLAN-KEDITOR-001` — the *delivery*: the (retrospective) phased history and risk register.

### B.3 Relationship to the engine and sibling editors

kymo-editor is a **thin shell over the engine**. It calls `parseDiagram` + `renderSVG` from the `kymostudio` package (`FEAT-KYMOJSON-001`), which delegates layout to the `kymostudio-core` wasm. The DSL it accepts is the flowchart block (`FEAT-FLOWCHART-001`). It is a **distinct product** from `canvas-editor` / `canvas-studio` (`FEAT-CANVAS-001` / `FEAT-STUDIO-001`), the `website/app/` canvas playground — kymo-editor is flowchart-text-first and adds the MCP live channel; the canvas editors are object-graph editors.

### B.4 Reading guide

Engineers maintaining the page: Part C *Browser render* + `DESIGN-KEDITOR-001` §2–4. Engineers touching live sync / MCP: Part C *Live sync* + *MCP channel* + `DESIGN-KEDITOR-001` §5–7. Reviewers: Part A + §C.5 acceptance.

### B.5 Status & ownership

Implemented and shipped (see `PLAN-KEDITOR-001` §4). Owned by the `diagrams/` project. This document is the normative reference; `packages/editor/README.md` is superseded for architecture.

### B.6 Glossary

- **Editor page** — the static client at editor.kymo.studio (`packages/editor/web/app.js`, `index.html`).
- **wasm core** — `kymostudio-core` compiled to WebAssembly; performs layout; inlined into the bundle.
- **EditorRoom** — a Cloudflare **Durable Object** holding the single shared DSL source and the set of connected WebSockets.
- **kymo-mcp** — the Cloudflare **Worker** (`packages/mcp`) hosting `EditorRoom` and the `KymoMCP` MCP agent.
- **Streamable HTTP MCP** — the MCP transport served at `/mcp`; `/sse` is the legacy Server-Sent-Events transport.
- **origin id** — a per-tab random token used to suppress WebSocket echo.

---

## Part C — Requirements (SRS)

Requirements use RFC-2119 keywords. Each maps to the stakeholder need(s) it satisfies.

### C.1 Functional requirements — Browser render (`FR-KE`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-01** | The editor SHALL render the kymo `flowchart { }` (and the sibling `bpmn { }`) DSL to SVG **entirely in the browser**, via `parseDiagram(source)` → `renderSVG(...)` from the `kymostudio` package, with the `kymostudio-core` wasm initialised once at load (`initSync(wasmBytes)`). There SHALL be **no server roundtrip** for rendering. | SN-KE-01, SN-KE-06 |
| **FR-KE-02** | The editor SHALL re-render on input with a **120 ms debounce**, and SHALL show a status line reporting `OK · <n> bytes · <ms>ms` on success. | SN-KE-01 |
| **FR-KE-03** | The editor SHALL let the user **download** the last successfully rendered SVG as `flowchart.svg`. | SN-KE-02 |
| **FR-KE-04** | The editor SHALL resolve icon art from a CDN base URL (`setIconBaseURL` → jsDelivr `gh/kymostudio/kymostudio@main/packages/icons`), so no icon assets are bundled or served locally. | SN-KE-05, SN-KE-06 |
| **FR-KE-05** | On a parse/render error, the editor SHALL surface the engine's message in the status line (error state) and SHALL NOT crash the page. | SN-KE-01 |

### C.2 Functional requirements — Live sync (`FR-KE`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-06** | The editor SHALL maintain a **WebSocket** to the `kymo-mcp` room (`wss://…/ws`) and SHALL **auto-reconnect** (≈2 s backoff) on close. While connected it SHALL show a live indicator (`⚡`). | SN-KE-04 |
| **FR-KE-07** | On local edits the editor SHALL push `{type:"set", source, origin}` to the room; it SHALL tag messages with a **per-tab `origin` id** and SHALL **ignore echoes** of its own origin so a tab never overwrites itself. | SN-KE-04 |
| **FR-KE-08** | On receiving an empty room snapshot, a tab that holds content SHALL **seed** the room with its own source (so a fresh room adopts the first author's diagram). On receiving a non-empty `doc` from another origin, the tab SHALL adopt the incoming source and re-render. | SN-KE-04 |
| **FR-KE-09** | The room SHALL **persist** its last source to Durable Object storage and SHALL replay it to a newly connected tab, so a reload or a later visitor sees the current diagram. | SN-KE-04 |

### C.3 Functional requirements — MCP channel (`FR-KE`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-10** | The Worker SHALL expose an MCP tool **`set_diagram(source: string)`** that writes the source to the room, persists it, broadcasts it to all connected tabs, and returns a confirmation reporting bytes and the number of live tabs updated. | SN-KE-03, SN-KE-04 |
| **FR-KE-11** | The Worker SHALL expose an MCP tool **`get_diagram()`** that returns the room's current source (or an "(editor is empty)" sentinel). | SN-KE-03 |
| **FR-KE-12** | The Worker SHALL serve MCP over **Streamable HTTP at `/mcp`** and legacy **SSE at `/sse`**, and SHALL expose the raw room channels `/ws` (WebSocket), `/set` (POST), `/get` (GET). | SN-KE-03 |

### C.4 Non-functional requirements (ISO/IEC 25010) (`NFR-KE`)

| ID | Attribute | Requirement |
|----|-----------|-------------|
| **NFR-KE-01** | Performance efficiency | A single render MUST complete in the order of tens of milliseconds on a typical laptop and MUST NOT depend on any network call (render is local wasm). |
| **NFR-KE-02** | Operability | The product MUST run as a **static asset + one serverless Worker** — no VM/container/render server. Deploy is automated on push (`deploy-editor.yml`) and `wrangler deploy`. |
| **NFR-KE-03** | Portability | The client MUST ship as a single ESM bundle with the wasm **inlined** (`esbuild --loader:.wasm=binary`); the engine carries **zero runtime dependencies**. |
| **NFR-KE-04** | Reliability | The WebSocket MUST auto-reconnect; the `EditorRoom` MUST be hibernatable (survives idle) and MUST restore its source from storage on wake. |
| **NFR-KE-05** | Compatibility | The rendered output MUST be produced by the **same `kymostudio` engine** the npm package ships — no second renderer. |

### C.5 Out of scope / deferred (backend-implying)

Auth & accounts; multiple named rooms / documents; durable version history; collaborative
cursors / comments / presence; server-side render or export beyond client SVG download. All
require state or compute beyond the single shared room and are explicitly deferred.

### C.6 Acceptance criteria (feature-level)

1. Typing a `flowchart TD { … }` block renders an SVG client-side within ~120 ms of pausing, with the byte/ms status line — and works **offline** after first load (no render network call).
2. The SVG download produces the exact bytes shown.
3. With two tabs open, an edit in one appears in the other; neither tab overwrites its own edits (echo-suppressed).
4. A reload, or a freshly opened tab, shows the room's last source (DO-persisted).
5. From an MCP host, `set_diagram` updates every open tab and returns the live-tab count; `get_diagram` returns the on-screen source.
6. The deployed system is a Cloudflare Pages static site + the `kymo-mcp` Worker only.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial requirements for the shipped kymo-editor. Owns `SN-KE-01..06`, `FR-KE-01..12` (browser render, live sync, MCP channel), `NFR-KE-01..05`. Documents the client-side-render + Cloudflare-Pages + `kymo-mcp`-Worker architecture as the normative reference and records that it **supersedes** the Python/server stack described in `packages/editor/README.md`. Retrospective spec for the P-set delivered across commits `466db60` → `47ecb4c` → `0860ace` → `7543db7` (see `PLAN-KEDITOR-001` §4). |

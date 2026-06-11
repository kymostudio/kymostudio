---
title: kymostudio-mcp (local MCP render server) — Requirements (ConOps, StRS & SRS)
document_id: FEAT-KMCP-001
version: "0.1"
issue_date: 2026-06-11
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers building the npx-installable MCP server (`packages/mcp-server/`); reviewers; stakeholders
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - DESIGN-KMCP-001
  - TEST-KMCP-001
  - PLAN-KMCP-001
  - RES-STRATEGY-001
  - RES-MCP-001
  - FEAT-KEDITOR-001
  - FEAT-FLOWCHART-001
  - FEAT-KYMOJSON-001
  - FEAT-ICONS-001
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
  - mcp
  - model-context-protocol
  - stdio
  - npx
  - render
  - mermaid
  - d2
  - dot
  - bpmn
  - acceptance-criteria
---

# kymostudio-mcp (local MCP render server) — Requirements (ConOps, StRS & SRS)

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `FEAT-KMCP-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `DESIGN-KMCP-001` (how), `TEST-KMCP-001` (V&V), `PLAN-KMCP-001` (plan), `RES-STRATEGY-001` (why — W1), `RES-MCP-001` (MCP landscape), `FEAT-KEDITOR-001` (hosted Worker + live canvas), `FEAT-FLOWCHART-001` (import hub), `FEAT-KYMOJSON-001` (IR), `FEAT-ICONS-001` (icon catalogue) |

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

`RES-STRATEGY-001` sets the direction: position kymostudio as **the diagram renderer for AI
agents**, distributed through the MCP channel. Today that channel is blocked: the only local MCP
server (`packages/editor/mcp-server.js`, already superseded per `FEAT-KEDITOR-001` §A.5) renders
by spawning a local **Python** subprocess and a local Rust binary — it cannot be installed with
one command — while the hosted Worker (`FEAT-KEDITOR-001`) manages live diagrams but exposes
**no general rendering tools**. Meanwhile every capability needed for a self-contained server
already exists in the JS engine + wasm core: parse `.kymo`/Mermaid/BPMN/`.kymo.json`, D2/DOT via
the flowchart hub (`FEAT-FLOWCHART-001`), SVG/PNG output, bundled icons.

### A.2 Users & context of operations (ConOps)

An **agent operator** adds one entry to their MCP host config (Claude Code, Claude Desktop,
Cursor, …) that runs `npx kymostudio-mcp`. The **agent** then renders any diagram source it can
produce — Mermaid it already writes fluently, or `.kymo` for icon-rich animated output — getting
back an animated SVG or a PNG, inline or written to a file in the workspace. Rendering happens
entirely in-process (Node + wasm); nothing else is installed and no network is touched.

### A.3 Goals & non-goals

**Goals**

1. One-command install: a single `npx kymostudio-mcp` stdio server, no Python, no native binary.
2. Render **every** source grammar the engine understands: `.kymo`, Mermaid, D2, DOT, BPMN, `.kymo.json`.
3. Outputs that differentiate: **animated** SVG by default-capable, PNG for hosts that need raster.
4. Make agents productive in the kymo grammar: icon discovery, actionable errors (the
   "familiarity tax" of `RES-MCP-001` §4).
5. Format conversion as a bonus surface (Mermaid → D2/DOT/draw.io, any → draw.io/BPMN/`.kymo.json`).

**Non-goals (this feature)**

- Render parity on the hosted Worker (deferred phase, `PLAN-KMCP-001` §4).
- MCP Apps / inline interactive canvases; HTTP/SSE transports (stdio only).
- Structured authoring tools (`add_node`-style); the source text is the interface.
- The Claude Code skill and `llms.txt` (workstream W2 of `RES-STRATEGY-001`, own spec later).

### A.4 Stakeholder needs (`SN-KM`)

| ID | Need |
|----|------|
| **SN-KM-01** | An agent operator wants the server running from **one `npx` line** in any MCP host config — no Python, no compiled binary, no post-install steps. |
| **SN-KM-02** | An agent wants to submit source in a grammar it **already writes well** (Mermaid above all; also D2, DOT, BPMN XML) and get a polished kymo render — without learning `.kymo` first. |
| **SN-KM-03** | An agent wants the result as an **animated SVG** or a **PNG**, returned inline and/or saved to a workspace path it names. |
| **SN-KM-04** | An agent authoring `.kymo` wants to **discover icon keys** from the 2,460-icon catalogue so it can produce icon-rich diagrams without guessing addresses. |
| **SN-KM-05** | A user wants the agent to **convert** between diagram grammars (e.g. their Mermaid file to D2 or draw.io) using the same hub. |
| **SN-KM-06** | On invalid source, the agent wants an **actionable error message** (what failed, where, what was expected) so it can self-correct in the next call. |
| **SN-KM-07** | The team wants the server's output produced by the **same `kymostudio` engine** the npm package ships — no second renderer to keep in sync. |
| **SN-KM-08** | An operator wants rendering to work **offline** — icons and wasm resolve from the installed package, never the network. |

### A.5 Scope

In scope: the new npm package `kymostudio-mcp` (`packages/mcp-server/`) — its stdio MCP server,
tool surface, format detection, render/convert/icon-search paths, and packaging. Out of scope:
the engine itself (`packages/js`, `packages/rust/kymostudio-core` — reused; the one required
exposure change is listed in `DESIGN-KMCP-001` §5), the hosted Worker and live-canvas product
(`FEAT-KEDITOR-001`), and the retired legacy stdio server (`packages/editor/mcp-server.js`).

---

## Part B — Introduction

### B.1 Purpose & motivation

This part frames the spec: what kymostudio-mcp is, how the four KMCP documents fit together,
and how the feature relates to the engine and the hosted MCP Worker.

### B.2 Document map

- `FEAT-KMCP-001` (this doc) — the *what*: ConOps, stakeholder needs, SRS.
- `DESIGN-KMCP-001` — the *how*: package shape, tool schemas, dispatch, icon resolution.
- `TEST-KMCP-001` — the *V&V*: test cases and traceability.
- `PLAN-KMCP-001` — the *delivery*: phases, release wiring, risk register.

### B.3 Relationship to the engine and the hosted Worker

kymostudio-mcp is a **thin tool surface over the engine**: `parseDiagram`/`parseMermaid`/
`parseBpmn`/`parseKymoJson` + `renderSVG` from the `kymostudio` package, with `kymostudio-core`
wasm for layout, D2/DOT import, and rasterization. It is the **local, stateless** sibling of the
hosted `kymo-mcp` Worker (`FEAT-KEDITOR-001`): the Worker owns identity, persistence, and the
live shared canvas; this server owns install-anywhere rendering. The two may converge on tool
naming in the Worker-parity phase (`PLAN-KMCP-001` §4, deferred).

### B.4 Reading guide

Engineers implementing the server: Part C + `DESIGN-KMCP-001` §3–6. Engineers touching the JS
engine exposure: `DESIGN-KMCP-001` §5. Reviewers: Part A + §C.7 acceptance.

### B.5 Status & ownership

Draft — specified ahead of implementation (workstream W1 of `RES-STRATEGY-001`). Owned by the
`diagrams/` project.

### B.6 Glossary

- **MCP host** — an agent runtime that connects to MCP servers (Claude Code, Claude Desktop, Cursor, …).
- **stdio transport** — MCP served over the child process's stdin/stdout, the standard local transport.
- **source grammar** — one of: `kymo` (the `.kymo` DSL), `mermaid`, `d2`, `dot`, `bpmn`, `kymo-json`.
- **wasm core** — `kymostudio-core` compiled to WebAssembly; layout, importers, `svgToPng`.
- **icon address** — `prefix:name` key into the icon catalogue (`FEAT-ICONS-001`).

---

## Part C — Requirements (SRS)

Requirements use RFC-2119 keywords. Each maps to the stakeholder need(s) it satisfies.

### C.1 Functional requirements — Rendering (`FR-KM`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KM-01** | The server SHALL expose an MCP tool **`render_diagram`** that renders diagram source text **entirely in-process** via the `kymostudio` JS engine and the `kymostudio-core` wasm — no subprocess, no network call. | SN-KM-01, SN-KM-07, SN-KM-08 |
| **FR-KM-02** | `render_diagram` SHALL accept source in all six grammars — `kymo`, `mermaid`, `d2`, `dot`, `bpmn`, `kymo-json` — selected by an optional **`source_format`** parameter. | SN-KM-02 |
| **FR-KM-03** | When `source_format` is omitted the server SHALL **auto-detect** the grammar using the ordered heuristic of `DESIGN-KMCP-001` §4, and SHALL name the detected grammar in the result so a mis-detection is visible and correctable. | SN-KM-02, SN-KM-06 |
| **FR-KM-04** | `render_diagram` SHALL return **SVG** text or **PNG** (base64 image content) per a `format` parameter (default `png`), SHALL support a `scale` factor for PNG, and SHALL write the artifact to an absolute **`output_path`** when one is given, returning the path. | SN-KM-03 |
| **FR-KM-05** | D2 and DOT sources SHALL be imported through the **`.kymo.json` IR** (`FEAT-KYMOJSON-001`) and rendered with the engine's `renderSVG` — so every grammar gets kymo styling, icons, and edge animation — not via the core's bare flowchart-SVG path. | SN-KM-02, SN-KM-07 |
| **FR-KM-06** | Icon art SHALL resolve **offline** from the installed `kymostudio` package (bundled manifest + `sets/`); a render MUST NOT fetch icons from the network. | SN-KM-08 |

### C.2 Functional requirements — Conversion (`FR-KM`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KM-07** | The server SHALL expose an MCP tool **`convert_diagram`** that returns converted source text: Mermaid → `d2` \| `dot` \| `drawio` (the hub's transpilers), and any parseable grammar → `drawio` \| `kymo-json` (and → `bpmn` for diagrams using BPMN glyphs). | SN-KM-05 |

### C.3 Functional requirements — Icon discovery (`FR-KM`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KM-08** | The server SHALL expose an MCP tool **`search_icons`** that matches a query against the icon manifest (address, name, collection) and returns up to `limit` icon **addresses** (`prefix:name`) with their collections, suitable for direct use in `.kymo` source. | SN-KM-04 |

### C.4 Functional requirements — Live-canvas hand-off (`FR-KM`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KM-09** | When (and only when) the operator sets **`KYMO_EDITOR_URL`**, the server SHALL additionally expose a **`push_to_editor`** tool that POSTs source to that endpoint's `/set` channel (the `FEAT-KEDITOR-001` room protocol) and reports the result. Without the variable the tool SHALL NOT be registered. | SN-KM-03 |

### C.5 Functional requirements — Errors (`FR-KM`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KM-10** | On parse or render failure the server SHALL return an MCP **tool error** carrying the engine's message — including line/position and expectation where the engine provides them — plus the grammar it attempted; the server process SHALL NOT crash on any input. | SN-KM-06 |

### C.6 Non-functional requirements (ISO/IEC 25010) (`NFR-KM`)

| ID | Attribute | Requirement |
|----|-----------|-------------|
| **NFR-KM-01** | Portability | The package MUST run on stock Node.js (the same engines floor as `kymostudio`) with **no Python, no native binary, and no node-gyp** — runtime deps are the MCP SDK, `kymostudio`, the `kymostudio-core` wasm, and schema validation only. |
| **NFR-KM-02** | Installability | `npx kymostudio-mcp` (equivalently `claude mcp add … -- npx kymostudio-mcp`) MUST start a working stdio server with zero configuration; README MUST carry copy-paste config for Claude Code, Claude Desktop, and Cursor. |
| **NFR-KM-03** | Performance efficiency | Cold start (npx resolution aside) including wasm init MUST be ≤ ~2 s; a typical render MUST complete in tens of milliseconds (the engine's normal cost). |
| **NFR-KM-04** | Compatibility | Output MUST be produced by the unchanged `kymostudio` engine; the package MUST carry the monorepo's **lockstep version** and depend on `kymostudio-core` per the caret-to-MINOR convention (`docs/RELEASING.md`). |
| **NFR-KM-05** | Maintainability | Every tool input MUST be schema-validated (zod) before touching the engine; the format-dispatch table MUST be the single point where grammars are added. |

### C.7 Out of scope / deferred

Worker render parity and shared tool naming (deferred phase); MCP Apps inline rendering; HTTP/
Streamable-HTTP transport; structured authoring tools; PDF/WebP/Figma/Excalidraw output formats
(the engine has them — adding them to the tool surface is a follow-up once SVG/PNG proves out).

### C.8 Acceptance criteria (feature-level)

1. Adding the one-line `npx kymostudio-mcp` entry to Claude Code registers the server; `render_diagram`, `convert_diagram`, and `search_icons` appear (and `push_to_editor` only when `KYMO_EDITOR_URL` is set).
2. Each of the six grammars renders from a `samples/` fixture; the SVG for an edge-bearing diagram contains the engine's flow-animation markers.
3. A Mermaid source with `source_format` omitted is auto-detected, and the result names the grammar used.
4. `format: "png"` returns valid PNG content (magic bytes), and `output_path` writes the same artifact to disk.
5. `search_icons("lambda")` returns `prefix:name` addresses usable verbatim in `.kymo` source.
6. Malformed source returns a tool error with the engine message; the server keeps serving subsequent calls.
7. A render performed with networking disabled succeeds, icons included.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-11 | Vũ Anh | Initial requirements for the npx-installable local MCP render server (workstream W1 of `RES-STRATEGY-001`). Owns `SN-KM-01..08`, `FR-KM-01..10` (rendering, conversion, icon discovery, live-canvas hand-off, errors), `NFR-KM-01..05`. Drafted ahead of implementation. |

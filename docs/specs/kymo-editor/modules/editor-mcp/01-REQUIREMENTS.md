---
title: Editor MCP Channel — Requirements (ConOps, StRS & SRS)
document_id: FEAT-KEMCP-001
version: "0.2"
issue_date: 2026-06-13
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the kymo-mcp Worker's MCP surface (`packages/mcp/`); reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-KEDITOR-001
  - DESIGN-KEDITOR-001
  - TEST-KEDITOR-001
  - FEAT-KRENDER-001
  - FEAT-KSHARE-001
  - FEAT-KLIVE-001
  - FEAT-KLIBRARY-001
  - FEAT-KHOME-001
  - FEAT-KMCP-001
  - RES-MCP-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - requirements
  - srs
  - kymo-editor
  - editor-mcp
  - mcp
  - oauth
  - streamable-http
  - sse
  - durable-objects
  - tools
---

# Editor MCP Channel — Requirements (ConOps, StRS & SRS)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-KEMCP-001` |
| Version           | 0.2 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (the umbrella the needs were carved from), `FEAT-KLIVE-001` (sibling — accounts & live documents; this module builds on it), `FEAT-KLIBRARY-001` (sibling — library & workspaces), `FEAT-KRENDER-001` / `FEAT-KSHARE-001` / `FEAT-KHOME-001` (siblings), `FEAT-KMCP-001` (the **distinct local npx MCP render server** — see §B.3), `RES-MCP-001` (MCP landscape) |

> **Module of the `kymo-editor` umbrella** (`FEAT-KEDITOR-001`). This module owns the **remote MCP channel** at mcp.kymo.studio: the Google-OAuth gate, the Streamable-HTTP/SSE transports and Worker routing, and the five per-user diagram tools an LLM host drives while the user watches edits land live. It owns the `SN-MC` and `FR-MC` IDs, re-homed as-built from `FEAT-KEDITOR-001` (see §B.3). **Not to be confused with `FEAT-KMCP-001`** — the sibling *local* stdio MCP render server. This is a **stub doc-set** (01 only): the *how* and *V&V* remain in `DESIGN-KEDITOR-001` §8/§10 and `TEST-KEDITOR-001` until this module grows its own 02/03/04.

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

The original reason kymo-editor grew a Worker at all (P3) was to let an **LLM author into the editor live** — the user watches the agent's diagram appear as it is written. v0.1 exposed one unauthenticated room; the shipped product (P4/P5) replaced that with a **Google-OAuth-gated, per-user tool set** operating on the same owned documents the editor shows. As the shipped feature is split into modules, **this module owns the agent-facing surface**: OAuth, transports/routing, and the tool semantics. The rooms it writes into and the ownership it enforces are the `editor-live` spine; the index it lists is the same D1 the library queries.

### A.2 Users & context of operations (ConOps)

- **Who:** LLM hosts (Claude Desktop, Cursor, claude.ai) connecting to `https://mcp.kymo.studio/mcp` (or legacy `/sse`) on behalf of a signed-in Google account.
- **Mechanics:** OAuth (`/authorize` GIS page → `/token`; `/register` for DCR) binds the session's `email` as the tool identity; tools fan out through the same `EditorRoom` DOs the browser tabs hold open, so writes appear live; create/edit responses link back to `https://editor.kymo.studio/?d=<id>`.
- **Constraint:** strictly the *signed-in user's own* diagrams — the channel is a second client of the user's library, not a cross-user surface.

### A.3 Goals & non-goals

- **Goals:** create/list/edit/read/delete over standard MCP transports; edits visible in open tabs in real time (with a live-tab count in responses); sensible defaulting (`edit_diagram`/`get_diagram` target the most-recent diagram when `id` is omitted).
- **Non-goals (owned by siblings / umbrella):** rendering on the user's machine from files (`FEAT-KMCP-001`, the local npx server); the room protocol and ownership rules themselves (`FEAT-KLIVE-001`); the browser library UX (`FEAT-KLIBRARY-001`); any tool surface beyond the five diagram tools (no workspace tools, no render tools — deferred). 

### A.4 Stakeholder needs (`SN-MC`)

| ID | Need | ⊇ former |
|----|------|----------|
| `SN-MC-01` | An LLM host wants to **create, list, edit, read, and delete** the user's diagrams over a standard MCP transport, with the user watching changes land live. | ⊇ `SN-KE-03` (the live-landing half also traces `SN-KE-04` → `SN-LV-01`) |

### A.5 Scope

**In scope:** the `KymoMCP` `McpAgent` (five zod-typed tools), the OAuth provider wiring (`/authorize`, `/token`, `/register`), and the Worker routing of `/mcp`, `/sse`, `/ws`, and the internal-only room handlers. **Out of scope:** everything in §A.3 non-goals; JWKS verification and ownership binding are specified in `FEAT-KLIVE-001` (`FR-LV-03`) and reused here.

---

## Part B — Introduction

### B.1 Purpose & motivation

Part of the six-module decomposition of the shipped `kymo-editor` (see `FEAT-KEDITOR-001` and `FEAT-KRENDER-001` §B.1 for the rationale and the module tree). This module is the **agent door** into the `editor-live` spine. As an as-built carve-out it re-homes the relevant `FEAT-KEDITOR-001` IDs (§B.3) and changes no behaviour.

### B.2 Document map

Stub doc-set: only this `01-REQUIREMENTS.md` exists. The *how* lives in `DESIGN-KEDITOR-001` §8 (OAuth) and §10 (the tool table); the V&V in `TEST-KEDITOR-001` (TC-KE-11..13), until a change warrants module-local `02-DESIGN` / `03-TEST` / `04-PLAN`. Cross-document references use **`document_id`** (never file paths).

### B.3 Relationship to the kymo-editor umbrella & sibling modules

See the module tree in `FEAT-KRENDER-001` §B.3 (identical for all six siblings). Dependency direction: this module **builds on `editor-live`** — tool identity is the OAuth session's `email`, writes go through the rooms of `FR-LV-04..07`, and ownership refusals are `FR-LV-03`'s.

**Naming note:** `FEAT-KEMCP-001` (this module — the **remote**, hosted channel at mcp.kymo.studio) is distinct from `FEAT-KMCP-001` (the **local** npx stdio MCP server that renders files on the user's machine, doc-set `docs/specs/kymo-mcp/`). The remote channel edits hosted documents the user is watching; the local server renders local files.

**Re-homing summary (from `FEAT-KEDITOR-001`)** — requirement text carried over verbatim in Part C:

| Former (kymo-editor) | Re-homed here | What |
|----------------------|---------------|------|
| `FR-KE-10` | `FR-MC-01` | the five per-user diagram tools |
| `FR-KE-11` | `FR-MC-02` | Google-OAuth gating |
| `FR-KE-12` | `FR-MC-03` | transports & Worker routing |

### B.4 Status & ownership

- **Status:** Implemented — **as-built carve-out**; shipped under kymo-editor P3 (origin), P4 (OAuth), P5 (per-user tool set), P8 (server renamed `kymostudio`) (`PLAN-KEDITOR-001`).
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability:** `FR-MC-*` are covered by `TEST-KEDITOR-001` TC-KE-11..13 (via the former IDs in its matrix).
- **Change management:** changes are raised as CRs under `docs/specs/kymo-editor/CR/` (umbrella) or module-local `CR/` once this doc-set grows, and re-baselined here (bump version + Annex A).

---

## Part C — Requirements (SRS)

Requirements use RFC-2119 keywords; text is carried over as-built from `FEAT-KEDITOR-001` v0.2 (internal references rewritten to module IDs).

### C.1 Functional requirements — MCP channel (`FR-MC-01..03`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-MC-01** | The Worker SHALL expose **per-user diagram tools** over MCP — `new_diagram(title?, source?, kind?)`, `list_diagrams()`, `edit_diagram(source?, title?, id?, kind?)`, `get_diagram(id?)`, `delete_diagram(id)` — operating only on the authenticated user's diagrams; `edit_diagram`/`get_diagram` default to the user's **most recent** diagram when `id` is omitted. Content writes broadcast live to the user's open tabs and report the live-tab count; create/edit responses include the `?d=` URL. *(v0.2: `delete_diagram` is a **soft** delete — it moves the diagram to Trash, recoverable for 30 days, the same `destroyDiagram` path the browser uses — `FR-LV-09`. The tool set is unchanged otherwise: no folder or trash-management tools are exposed.)* | SN-MC-01 |
| **FR-MC-02** | MCP access SHALL be gated by **Google OAuth**: the Worker serves an OAuth authorization flow (`/authorize` with a GIS login page, `/token`, `/register`) and binds the session's `email` as the tool-call identity. | SN-MC-01 |
| **FR-MC-03** | The Worker SHALL serve MCP over **Streamable HTTP at `/mcp`** and legacy **SSE at `/sse`**, the live channel at **`/ws`** (WebSocket, routed before the OAuth layer), and the REST APIs of `FR-LB-05`. The room's raw `/set`/`/get`/`/destroy` handlers SHALL be internal (reachable only via the Worker's own DO stubs), not public routes. | SN-MC-01 |

### C.2 Non-functional requirements

No module-owned NFRs. Inherited and still binding: `NFR-LV-02` (owner-scoping; tool identity is the verified OAuth `email`) and the umbrella's `NFR-KE-02` (the channel stays serverless — one Worker).

### C.3 Acceptance criteria (module-level)

1. From an MCP host after Google OAuth: `new_diagram` returns an id + URL; opening it and calling `edit_diagram(source)` updates the open tab live and reports the live-tab count.
2. `get_diagram` returns the on-screen source + kind; `list_diagrams` lists most-recent first with URLs; `delete_diagram` **soft-deletes** — the diagram leaves `/diagrams` and appears in `/trash` (recoverable), and its room sockets close; another user's `id` is refused ("isn't yours").
3. `/mcp` completes a Streamable-HTTP handshake behind OAuth (`/authorize` → GIS → `/token`); `/sse` serves the legacy transport; `/set`/`/get` are **not** reachable as public Worker routes.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-12 | Vũ Anh | Initial **as-built carve-out** from `FEAT-KEDITOR-001` v0.2 under the kymo-editor umbrella decomposition. Re-homes `SN-KE-03 → SN-MC-01`, `FR-KE-10..12 → FR-MC-01..03`. Stub doc-set (01 only); design/V&V remain in `DESIGN-KEDITOR-001` / `TEST-KEDITOR-001`. Records the naming distinction from `FEAT-KMCP-001` (local npx server). |
| 0.2     | 2026-06-13 | Vũ Anh | **Soft-delete reconciliation (P17).** `FR-MC-01`: `delete_diagram` is now a **soft** delete (moves to Trash, recoverable for 30 days — the shared `destroyDiagram` path, `FR-LV-09` in `FEAT-KLIVE-001`); tool set otherwise unchanged (no folder/trash tools). Acceptance #2 updated. Transports, OAuth gating, and routing (`FR-MC-02/03`) unchanged. |

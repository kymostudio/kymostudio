---
title: Editor AI (Connect AI) — Requirements (ConOps, StRS & SRS)
document_id: FEAT-KAI-001
version: "0.2"
issue_date: 2026-06-20
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the Connect AI panel (`packages/editor/web/`) and the `UserChannel` control plane in the kymo-mcp Worker (`packages/mcp/`); reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-KEDITOR-001
  - FEAT-KEMCP-001
  - FEAT-KLIVE-001
  - FEAT-KLIBRARY-001
  - FEAT-KHOME-001
  - DESIGN-KAI-001
  - CR-KAI-001
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
  - editor-ai
  - connect-ai
  - mcp
  - userchannel
  - durable-objects
  - live-activity
  - ui_status
  - wait_for_user_message
  - reverse-channel
  - sessions
  - window-targeting
  - ui-simulation
  - chat-composer
  - user-stories
---

# Editor AI (Connect AI) — Requirements (ConOps, StRS & SRS)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-KAI-001` |
| Version           | 0.2 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (the umbrella the needs were carved from), `FEAT-KEMCP-001` (sibling — the remote MCP channel this module **builds on**: OAuth, transports, diagram/project tools, the `ui_*` family + `/userws` channel), `FEAT-KLIVE-001` (sibling — accounts & rooms; the OAuth identity reused here), `FEAT-KLIBRARY-001` (sibling — the project/folder data the simulation drives), `FEAT-KHOME-001` (sibling), `DESIGN-KAI-001` (the *how* — UserChannel DO, protocol, panel), `RES-MCP-001` (MCP landscape) |

> **Module of the `kymo-editor` umbrella** (`FEAT-KEDITOR-001`). This module owns **"Connect AI"** — the editor-side panel and the per-user **control plane** that turn the editor into a place you *drive an AI from, and watch it work in*. It sits **on top of `editor-mcp`** (`FEAT-KEMCP-001`): that module is the agent's **data door** (OAuth + the diagram/project tools + the base `ui_*` editor-control family over the `/userws` UserChannel, `FR-MC-05`); this module adds the **presence, the reverse channel (web→agent), window targeting, UI-simulation, and the visible panel**. It owns the `SN-AI`, `FR-AI`, `NFR-AI`, and `US-AI` IDs. As-built carve-out — describes what shipped (PRs ~#514→#598); changes no other module's behaviour.

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

`editor-mcp` (`FEAT-KEMCP-001`) let an LLM host *write into* the user's diagrams and live-switch their open tabs. But the connection was **one-directional and invisible**: the user could not tell an agent was acting, could not see *why* it did something, could not message it back from the editor, and — with several editor windows open — could not say *which* window the agent should act in. Connect AI closes those gaps:

1. **Make the agent visible.** Surface the agent's **request → reasoning → action** as a live feed in the editor, so a watching user understands what is happening.
2. **Make it two-directional.** Let the user **type to the agent from the editor** (web → agent), not only from the AI client — but only when an agent is actually listening, so messages never vanish into a void.
3. **Make it targetable.** With multiple windows open, let the user **pin which window** the AI controls.
4. **Make destructive/creative actions legible.** Optionally have the agent **perform the real UI** (open the switcher and type a project name; open Manage-projects and click delete) instead of mutating silently — and keep the editor **in sync without page reloads**.
5. **Make connecting easy.** Give in-editor **instructions** to wire up a client (Claude web/desktop, **Claude Code**, Cursor, ChatGPT).

### A.2 Users & context of operations (ConOps)

- **Who:** a signed-in author with the editor open, plus their **AI client** — either an external MCP host (Claude/Cursor/ChatGPT) or a **Claude Code session** acting as a listener.
- **Mechanics:** the editor opens a per-user **`UserChannel`** WebSocket (`wss://api.kymo.studio/userws`, keyed by the OAuth `email`). The agent's MCP tools push control messages through that channel to the **pinned** (else most-recently-focused) window; the window pushes focus/pin/context and **typed prompts** back. The agent narrates with `ui_status`; it receives the user's typed messages by long-polling `wait_for_user_message`.
- **Constraint:** strictly the signed-in user's own session — the channel is per-`email`, reusing `editor-mcp`/`editor-live` ownership; this module adds no cross-user surface.

### A.3 Goals & non-goals

- **Goals:** a live activity feed; a web→agent reverse channel that is **gated on an active listener**; per-window targeting; optional **UI-simulation** of project create/delete with **no reloads**; a self-contained **Connect AI panel** (Chat/Connection/Setup) with connect instructions.
- **Non-goals (owned by siblings / umbrella):** the diagram/project **data tools** and OAuth/transports (`FEAT-KEMCP-001`); rooms, ownership, and document persistence (`FEAT-KLIVE-001`); the project/folder data model the simulation drives (`FEAT-KLIBRARY-001`); global editor keyboard shortcuts and the activity-bar Settings menu (these are **`editor-render`** / a separate CR, not Connect AI); running the agent itself (that is the user's AI client / Claude Code).

### A.4 Stakeholder needs (`SN-AI`)

| ID | Need |
|----|------|
| **SN-AI-01** | A user wants to **drive the editor by chatting with an AI** (create/edit diagrams and projects) and **watch the agent's request, reasoning, and actions** appear live in the editor. |
| **SN-AI-02** | A user wants to **send a message to their agent from the editor** (web → agent) — and to be stopped from typing into a void when no agent is listening, with a clear signal if a sent message is not picked up. |
| **SN-AI-03** | A user with **several editor windows** open wants to choose **which window** the AI acts in. |
| **SN-AI-04** | A user optionally wants AI-driven **create/delete to look like the real UI**, and wants the editor to **stay in sync (switcher, lists) without a page reload**. |
| **SN-AI-05** | A user wants **clear instructions** to connect their AI client to the editor, including **Claude Code**. |
| **SN-AI-06** | A user with one or more AI clients wired to their account wants to see **how many MCP clients are connected** and **how many are outdated** (built against a superseded server, long idle, or on an old protocol/client version) so they know which to reconnect. *(realised by `CR-KAI-001`)* |

### A.5 Scope

**In scope:** the **Connect AI panel** (`web/connectai.tsx`), the shared signal hub (`web/mcpstatus.tsx`), the control-channel client (`web/userchannel.tsx`), the Manage-projects modal (`web/ProjectsModal.tsx`) and the new-project inline UI + simulator (`web/addressbar.tsx`), and the **`UserChannel` Durable Object** + the agent-facing tools it backs in the Worker (`packages/mcp/src/index.ts`): `ui_status`, `ui_list_sessions`, `ui_switch_session`, `wait_for_user_message`, the `simulate` path of `new_project`/`delete_project`, and the narrate-first tool descriptions. **Out of scope:** everything in §A.3 non-goals; the base diagram/project tools and `ui_open_diagram`/`ui_open_project`/`ui_list_open_files`/`ui_close_file` (specified in `FEAT-KEMCP-001` `FR-MC-01..05`, reused here).

---

## Part B — Introduction

### B.1 Purpose & motivation

Part of the `kymo-editor` umbrella (`FEAT-KEDITOR-001`). This is the **AI-experience** module: it makes the agent connection visible, two-directional, and targetable, and gives it a home in the UI. It depends on `editor-mcp` for the transport and tool base.

### B.2 Document map

`01-REQUIREMENTS` (this doc) — the *what*. `DESIGN-KAI-001` (`02-DESIGN`) — the *how*: the `UserChannel` Durable Object, the message protocol, the panel components, the simulation drivers, and the listener-gating. V&V is in `TEST-KAI-001` (`03-TEST`) where present, else the umbrella `TEST-KEDITOR-001`. Cross-document references use **`document_id`**, never file paths.

### B.3 Relationship to the kymo-editor umbrella & sibling modules

The 7th module of the umbrella (see the module tree in `FEAT-KEDITOR-001` §B.7). **Dependency direction:** `editor-ai` **builds on `editor-mcp`** — it reuses the OAuth `email` identity and transports (`FR-MC-02/03`), and **extends** the `ui_*` editor-control family and the `/userws` channel (`FR-MC-05`) with presence, sessions, a reverse channel, and simulation. It reuses `editor-live`'s ownership (`FR-LV-03`) and drives `editor-library`'s project data (`FR-LB-*`). It introduces no new transport or auth.

### B.4 Status & ownership

- **Status:** Implemented — as-built; shipped incrementally over PRs ~#514→#598 (Connect AI panel, window targeting, `ui_status` feed, `wait_for_user_message` reverse channel, project UI-simulation, listener-gated composer, settings gear).
- **Owner:** `diagrams/` project (Vũ Anh).
- **Change management:** changes raised as CRs under `docs/specs/kymo-editor/CR/` (umbrella) or a module-local `CR/`, re-baselined here (bump version + Annex A).

---

## Part C — Requirements (SRS)

Requirements use RFC-2119 keywords. Because Connect AI is UI/UX-heavy, the functional requirements (`FR-AI`) are paired with a user-story layer (`US-AI`, §C.4) — the stories ADD intent alongside the FRs (the same convention `editor-home` uses with `US-HM`), they do not replace them.

### C.1 Functional requirements — Agent-facing channel (`FR-AI-01..05`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-AI-01** | The Worker SHALL expose **`ui_status(text, kind?)`** which pushes a line onto the user's **Live Activity feed** in the editor; `kind ∈ {user, thinking, action, result}`. Every write/UI tool SHALL additionally **auto-narrate** an `action` line via a server-side `feed()` helper, and each such tool's **description SHALL instruct the client to narrate first** — call `ui_status(kind:"user", <request>)` then `ui_status(kind:"thinking", <plan>)` before acting — so the feed reads request → reasoning → action without relying on agent memory. The editor renders the feed as chat bubbles (user right/accent, agent left) and drops consecutive duplicate lines. | SN-AI-01 |
| **FR-AI-02** | Each open editor window SHALL carry a short **session id** (sessionStorage, stable across reload) and report its project/diagram context over `/userws`. The Worker SHALL expose **`ui_list_sessions()`** (enumerate open windows with project/diagram + which is the AI target) and **`ui_switch_session(session)`** (pin the target). The ✨ activity-bar button and the panel's **Connection** tab SHALL let the user pin "this window". Control messages (the `ui_*` family of `FR-MC-05` + this module's pushes) SHALL route to the **pinned** window, falling back to the **most-recently-focused** window, else broadcast. | SN-AI-03 |
| **FR-AI-03** | The Worker SHALL expose **`wait_for_user_message()`** — a ~25 s long-poll of a **durable per-user inbox** — by which an agent receives messages the user types in the editor. The panel composer SHALL send `{type:"prompt", text, simulate}` over `/userws`; the Worker SHALL queue `{text, simulate}` (latest 50) and `wait_for_user_message` SHALL return the queued text plus, when `simulate` is set, a `[Simulate UI = ON]` hint telling the agent to pass `simulate:true`. | SN-AI-01, SN-AI-02 |
| **FR-AI-04** | **`new_project(name, simulate?)`** and **`delete_project(project, simulate?)`** SHALL accept `simulate` (default **false**). With `simulate:false` they mutate server-side and return the result (and live-switch / refresh the editor — `FR-AI-05`). With `simulate:true` **and a live window**, the Worker SHALL push `{type:"ui-new-project", name}` / `{type:"ui-delete-project", id}` so the editor **animates the real UI** — new: open the project switcher → type the name into an inline input → submit; delete: open Manage-projects → filter to the project → click delete → confirm — performing the actual mutation through the browser's own code path, **with no page reload**; with no live window it falls back to the server-side mutation. | SN-AI-04 |
| **FR-AI-05** | A server-side project mutation (`new_project`, `rename_project`, `delete_project` without simulation) SHALL push a control message (`{type:"open-project", id}` and/or `{type:"projects-changed"}`) so every open window **refetches its project list** — the switcher and the Manage-projects modal update live, **without a reload**; the editor SHALL refetch the list **before** switching to a newly-created project so it is present. | SN-AI-04 |

### C.2 Functional requirements — Connect AI panel (`FR-AI-06..10`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-AI-06** | The editor SHALL provide a **Connect AI panel** docked on the right (VS Code Copilot-style), toggled by the **✨ activity-bar button** (which also reflects live/target state). The panel SHALL have three tabs — **Chat**, **Connection**, **Setup** — and a header **settings gear** holding the **Simulate UI** toggle; when Simulate is on the gear SHALL highlight and show a **"UI" badge**. The Chat tab SHALL render the Live Activity feed (`FR-AI-01`). | SN-AI-01, SN-AI-04 |
| **FR-AI-07** | The Chat tab SHALL provide a **composer** (auto-growing textarea; Enter sends, Shift+Enter newlines) that sends the typed message via `FR-AI-03`. The composer SHALL be **disabled until a process is listening** — the Worker pushes `{type:"listening"}` on each `wait_for_user_message` poll and the editor treats listening as fresh for ~35 s — with a placeholder explaining how to start a listener. After a send with no response in ~20 s, the panel SHALL surface a **"no response" warning** (the message likely was not picked up); a send while the socket is down SHALL surface an **offline** warning. | SN-AI-02 |
| **FR-AI-08** | Project management SHALL be a **modal** (filter box + open / rename / delete-with-confirm), opened from the switcher's "Manage projects…"; it SHALL be the surface the delete-project simulation (`FR-AI-04`) drives, and SHALL reflect live project-list changes (`FR-AI-05`). | SN-AI-04 |
| **FR-AI-09** | The **Setup** tab SHALL show the MCP server URL (copyable), a sign-in hint, and per-client connect steps — **Claude (web & desktop)**, **Claude Code** (the one-line `claude mcp add --transport http kymostudio <url>` + `/mcp` → Authenticate), **Cursor** (SSE), **ChatGPT** — plus a config-JSON block (with an `mcp-remote` bridge variant). The **Chat** empty state SHALL show a short how-to-connect guide with a link to Setup. | SN-AI-05 |
| **FR-AI-10** | The editor SHALL surface **agent presence**: the ✨ button and the open file-tab badge reflect recent agent activity (a ~2-min activity window, pinged by every control message and `edit_diagram` origin); the **Connection** tab SHALL show Connected/Waiting, the pin/target toggle, and the window's session id. | SN-AI-01, SN-AI-03 |
| **FR-AI-11** | The Worker SHALL maintain a **per-user MCP connection registry** in the `UserChannel` DO, keyed per connection, recording the client `name`/`version`, negotiated **protocol** version, the **server** version at connect time, and first-/last-seen timestamps. Registration SHALL be driven by the **connection lifecycle, not by tool calls** — register when the MCP `initialize` handshake completes (`oninitialized`), refresh on agent wake (`onStart`, covering idle SSE reconnects), and **deregister on clean disconnect** (the MCP `DELETE` → `agent.destroy()`) — so a client reconnect/disconnect is reflected **immediately, without the agent calling any tool**; tool calls additionally refresh last-seen. Each change SHALL be **pushed** to open editor windows over `/userws` (`{type:"mcp-connections"}`) and rendered **live, without polling**; a DO **alarm** SHALL age out ungracefully-dropped connections, and entries idle beyond a hard TTL SHALL be pruned. A connection is **connected** if seen within the freshness window and **outdated** if **any** of four reasons hold — `server` (superseded server version), `stale` (idle beyond the window), `protocol` (host below the server's protocol), or `client` (below a recommended-minimum client version, best-effort). The **Connection** tab SHALL surface **"N connected · M outdated"** with a per-connection list + outdated-reason badge; `GET /api/connections` (auth-scoped to `email`) SHALL remain for non-WS/debug use. *(realised by `CR-KAI-001`)* | SN-AI-06 |

### C.3 Non-functional requirements

| ID | Attribute | Requirement |
|----|-----------|-------------|
| **NFR-AI-01** | Reliability / UX | A message MUST NOT be silently lost: the composer is **gated on an active listener** (`FR-AI-07`), and exactly one drainer is expected (only one `wait_for_user_message` should run per user — two compete for the same inbox). |
| **NFR-AI-02** | Reliability | All Connect AI live updates (feed, target, open/close, project-list, simulation) MUST arrive over the `UserChannel` WebSocket and apply **without a page reload**. |

Inherited and still binding: `NFR-LV-02` (owner-scoping; the channel identity is the verified OAuth `email`) and the umbrella's `NFR-KE-02` (serverless — one Worker, plus the per-user Durable Object).

### C.4 User stories (`US-AI`)

UI/UX user-story layer (`As a … I want … so that …` + Given/When/Then), citing the FR it realises.

- **US-AI-01** *(→ FR-AI-01)* — **As** a user watching an agent, **I want** to see its request, reasoning, and each action as a live feed, **so that** I understand what it is doing.
  *Given* a connected agent narrating, *when* it runs a tool, *then* the Chat feed shows the user line, a thinking line, and an action line in order.
- **US-AI-02** *(→ FR-AI-07, FR-AI-03)* — **As** a user, **I want** to type to my agent from the editor, **so that** I can drive it without switching apps.
  *Given* a process is listening, *when* I type and Send, *then* the agent receives it; *given* none is listening, *then* the composer is disabled with guidance; *given* I sent but nothing replies in ~20 s, *then* I see a "no response" warning.
- **US-AI-03** *(→ FR-AI-02)* — **As** a user with two editor windows, **I want** to pick which one the AI controls, **so that** commands don't hit the wrong project.
  *Given* two windows, *when* I pin window A (✨ / Connection tab / `ui_switch_session`), *then* `ui_*` actions affect only A.
- **US-AI-04** *(→ FR-AI-04, FR-AI-05)* — **As** a user, **I want** AI create/delete to play out as the real UI and the lists to stay current, **so that** it feels native and I never have to reload.
  *Given* Simulate UI is on, *when* the agent creates/deletes a project, *then* the editor animates the switcher / Manage-projects flow and the lists update without a reload.
- **US-AI-05** *(→ FR-AI-09)* — **As** a new user, **I want** clear steps to connect my client (incl. Claude Code), **so that** I can get started.
  *Given* the Setup tab, *when* I copy the Claude Code command and run `/mcp → Authenticate`, *then* my client is connected to my account.
- **US-AI-06** *(→ FR-AI-11)* — **As** a user with one or more AI clients wired up, **I want** to see how many are connected and how many are outdated, **so that** I know which to reconnect (e.g. after a deploy). *(realised by `CR-KAI-001`)*
  *Given* the Connection tab, *when* clients have acted on my account, *then* I see "N connected · M outdated" and a row per connection (client + version, protocol, last seen); *given* a connection built against an old server build, *then* its row shows an Outdated badge with the reason and a reconnect hint.

### C.5 Acceptance criteria (module-level)

1. With an agent connected and narrating: the Chat feed shows request → reasoning → action bubbles (user right, agent left); duplicate lines collapse.
2. Two windows open: pinning one (✨ / Connection / `ui_switch_session`) routes `ui_open_diagram`/`ui_status`/etc. to it only; `ui_list_sessions` lists both with the target flagged.
3. The composer is disabled with a "waiting for a listener" placeholder until an agent calls `wait_for_user_message`; once listening, typing + Send delivers the message; a send with no reply in ~20 s shows the no-response warning.
4. `new_project(name, simulate:true)` with a window open animates the switcher (types the name, submits) and switches with no reload; `delete_project(project, simulate:true)` animates Manage-projects (filter → delete → confirm). With `simulate:false`, the project is created/deleted server-side and the switcher + modal update without a reload.
5. The Setup tab shows the MCP URL + Claude Code / Claude / Cursor / ChatGPT steps + config JSON; the gear shows a "UI" badge while Simulate is on.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-20 | Vũ Anh | Initial **as-built carve-out** under the kymo-editor umbrella (7th module). Owns `SN-AI-01..05`, `FR-AI-01..10`, `NFR-AI-01..02`, `US-AI-01..05`. Documents the Connect AI panel + the `UserChannel` control plane (live feed `ui_status`; window sessions `ui_list_sessions`/`ui_switch_session`; reverse channel `wait_for_user_message` + durable inbox + `listening` gating; `new_project`/`delete_project` `simulate`; live project-list sync; connect instructions incl. Claude Code) as shipped over PRs ~#514→#598. Builds on `FEAT-KEMCP-001` (`FR-MC-05` `ui_*` family + `/userws`). Design in `DESIGN-KAI-001`. |
| 0.2     | 2026-06-20 | Vũ Anh | Added **`SN-AI-06` / `FR-AI-11` / `US-AI-06`** — a server-side **MCP connection registry** (per-user view of how many MCP clients are connected and how many are outdated: server / stale / protocol / client). `FR-AI-11` is **lifecycle-driven + live-pushed** (register on connect/`oninitialized`, drop on clean disconnect/`DELETE`, push over `/userws`, no polling) so reconnect/disconnect shows with no tool call. Per `CR-KAI-001` (Open); design in `DESIGN-KAI-001` §7, states in `DESIGN-KAI-002` CS-07. |

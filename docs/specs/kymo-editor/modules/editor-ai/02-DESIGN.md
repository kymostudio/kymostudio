---
title: Editor AI (Connect AI) — Design
document_id: DESIGN-KAI-001
version: "0.4"
issue_date: 2026-06-20
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the Connect AI panel + the UserChannel control plane
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-KAI-001
  - FEAT-KEMCP-001
  - FEAT-KLIVE-001
  - FEAT-KLIBRARY-001
  - DESIGN-KEDITOR-001
  - DESIGN-KAI-002
  - CR-KAI-001
authors:
  - Vũ Anh
language: en
keywords:
  - design
  - architecture
  - userchannel
  - durable-objects
  - websocket
  - long-poll
  - control-plane
  - connect-ai
  - simulation
---

# Editor AI (Connect AI) — Design

| Field | Value |
|-------|-------|
| Document ID | `DESIGN-KAI-001` |
| Realises | `FEAT-KAI-001` (`FR-AI-01..10`, `NFR-AI-01..02`) |
| Builds on | `FEAT-KEMCP-001` (`FR-MC-02/03` transport+OAuth, `FR-MC-05` `ui_*` + `/userws`), `FEAT-KLIVE-001` (ownership), `FEAT-KLIBRARY-001` (project data) |

> The *how* for Connect AI. The data tools, OAuth, and the per-diagram `EditorRoom` live in `editor-mcp`/`editor-live` (`DESIGN-KEDITOR-001` §8/§6); this document covers the **per-user control plane** (`UserChannel`), the **panel**, and the **simulation** drivers.

## 1. Architecture overview

Two live channels, by scope:

- **`EditorRoom`** (per *diagram*, keyed by diagram id) — document content live-sync + `edit_diagram` fan-out. Owned by `editor-live` / `editor-mcp`. *(unchanged here)*
- **`UserChannel`** (per *user*, keyed by OAuth `email`) — the **control plane** this module adds: presence, window targeting, the `ui_status` feed, open/close/open-project control, project-list invalidation, the UI-simulation triggers, and the **reverse channel** (web→agent prompt inbox + `listening` signal).

```
AI client ──MCP (mcp.kymo.studio)──► KymoMCP (McpAgent)
                                       │  ui_status / ui_list_sessions / ui_switch_session
                                       │  wait_for_user_message / new_project,delete_project(simulate)
                                       ▼
                              UserChannel DO  (per email)
                                       ▲  WebSocket  wss://api.kymo.studio/userws
                                       │  push: status/open/open-project/close/ai-target/
                                       │        listening/projects-changed/ui-new-project/ui-delete-project
                                       │  recv: focus/hello/ctx/pin/unpin/prompt
                              Editor window(s)  (userchannel.tsx ↔ mcpstatus.tsx ↔ connectai.tsx)
```

Files: Worker `packages/mcp/src/index.ts` (`UserChannel`, `KymoMCP`); editor `packages/editor/web/{userchannel,mcpstatus,connectai,ProjectsModal,addressbar}.tsx`.

## 2. `UserChannel` Durable Object

One instance per user (`idFromName(email)`). Uses the WebSocket **hibernation** API (`acceptWebSocket`); per-socket state survives hibernation via `serializeAttachment`/`deserializeAttachment`:

```
SockMeta = { focusedAt, pinned, pinnedAt, session?, project?, projectName?, diagram?, title? }
```

**`webSocketMessage(ws, msg)`** handles editor→server messages:

| type | effect |
|------|--------|
| `focus` | `focusedAt = now` (used as the routing fallback) |
| `hello` / `ctx` | store `session` + project/diagram context (for `ui_list_sessions`) |
| `pin` | set this socket `pinned`, clear others, `notifyTarget()` (echo `{ai-target}`) |
| `unpin` | clear this socket's pin, `notifyTarget()` |
| `prompt` | push `{text, simulate}` onto the durable `inbox` (kept ≤ 50) |

**Endpoints** (`fetch`, internal — reached only via the Worker's own DO stub):

| path | purpose |
|------|---------|
| `POST /push` | deliver a control message; `pickTarget()` chooses the destination, returns `clients` (count reached) |
| `GET /sessions` | list open windows for `ui_list_sessions` (session, project, diagram, pinned) |
| `POST /target` | pin a session for `ui_switch_session` |
| `POST /inbox-wait` | the `wait_for_user_message` long-poll: **broadcast `{type:"listening"}`** to all sockets, then drain the inbox (≤ 32 × 800 ms ≈ 25 s); return `messages` or `[]` |
| `POST /mcp-seen` · `POST /mcp-gone` · `GET /mcp-connections` | the MCP connection registry (`FR-AI-11`) — see §7 |

**`pickTarget()`** — most-recent **pinned** socket → else highest **`focusedAt`** → else `null` (caller broadcasts). Used by `/push` and by the `ui_*` tools so control lands on the chosen window (`FR-AI-02`).

## 3. Message protocol (server → editor pushes)

| push | trigger | editor effect |
|------|---------|---------------|
| `status {kind,text,ts}` | `ui_status` + every write/UI tool's `feed()` | append to Live Activity feed (`FR-AI-01`) |
| `open {id}` / `open-project {id}` / `close {id}` | `ui_open_diagram` / `ui_open_project` / `ui_close_file` (`FR-MC-05`) | open/switch/close tab; `open-project` refetches list then switches |
| `ai-target {pinned}` | pin/unpin | reconcile the window's pin state |
| `listening` | each `/inbox-wait` | refresh the 35 s "a process is listening" signal → enable composer (`FR-AI-07`) |
| `projects-changed` | server-side rename/delete | refetch project list (`FR-AI-05`) |
| `ui-new-project {name}` / `ui-delete-project {id}` | `new_project`/`delete_project` with `simulate:true` | run the UI-simulation driver (`FR-AI-04`) |

## 4. Editor signal hub (`mcpstatus.tsx`)

A dependency-free module of tiny pub/sub signals + registries (so React components and the WS client share state without prop-drilling):

- **presence:** `pingMcp` / `useMcpActive` (2-min window) — `FR-AI-10`.
- **target/pin:** `requestPin` / `useAiTarget` / `setPinned` / `registerPinSender` — `FR-AI-02`.
- **session/ctx:** `sessionIdValue` (sessionStorage), `setSessionCtx` / `registerCtxSender` — `FR-AI-02`.
- **feed:** `pushStatus` (dedup consecutive) / `useStatusFeed` / `clearStatus` / `feedLength` — `FR-AI-01`.
- **reverse:** `sendPrompt` / `registerPromptSender` — `FR-AI-03`.
- **simulate pref:** `simulateValue` / `setSimulate` / `useSimulate` (localStorage `kymo_ai_simulate`) — `FR-AI-06`.
- **listening:** `pingListening` / `useListening` (35 s freshness) — `FR-AI-07`.
- **registries** the simulation/UI hooks register into: `registerNewProjectSimulator`, `registerDeleteProjectSimulator`, `registerProjectsModalOpener`, plus editor-global `registerConnectToggle` etc.

`userchannel.tsx` owns the `/userws` socket: registers the pin/ctx/prompt senders, reports focus, and dispatches inbound pushes to the signals above (`pingListening` on `listening`, `runNewProjectSim`/`runDeleteProjectSim` on the `ui-*-project` messages, `refresh()` on `projects-changed`/`open-project`). No timed auto-reconnect (parity with `editor-live` risk R10 — a reload re-establishes).

## 5. Reverse channel & listener gating (`FR-AI-03`, `FR-AI-07`)

The composer's Send pushes `{type:"prompt", text, simulate}`; the DO queues `{text, simulate}`. `wait_for_user_message` long-polls `/inbox-wait`, which **also broadcasts `listening`** — so the act of an agent waiting is what enables the composer (`useListening`, 35 s). The composer is otherwise **disabled by default** (`NFR-AI-01`). A **no-response watchdog** in `connectai.tsx` snapshots `feedLength()` on send and, if unchanged after ~20 s, pushes a warning line.

## 6. UI-simulation drivers (`FR-AI-04`)

- **new project** (`addressbar.tsx`): the switcher dropdown's "New project" is an **inline input** (replaces `window.prompt`); `simulateNewProject(name)` opens the switcher, types the name char-by-char, then submits via `createProject` → `setCurrentProject` → SPA navigate (no reload). Registered through `registerNewProjectSimulator`. *(Note: keydown propagation is stopped inside the menu so Space doesn't trigger the command palette.)*
- **delete project** (`ProjectsModal.tsx`): an always-mounted Manage-projects modal; `simulate(id)` opens it, types the project name into the filter, clicks the row's delete (`[data-pm-del]`), then accepts the `useConfirm` dialog (`.confirm-foot .btn-danger`). Registered through `registerDeleteProjectSimulator`.

Both are driven by the worker only when a live window receives the push; otherwise the tool falls back to a direct server mutation. SVG/lucide icons inside these surfaces need `svg { flex: none }` (else they collapse to width 0).

## 7. MCP connection registry (`FR-AI-11`, `CR-KAI-001`)

A per-user view of **how many MCP clients are connected and how many are outdated**.
Because MCP is stateless HTTP there is no socket to count (`DESIGN-KAI-002` §1); each
client connection is a separate `KymoMCP` (`McpAgent`) DO with **no per-user index**.
So the registry records **last activity per connection** in the one per-user place that
already exists — the `UserChannel` DO — and derives "connected" as *seen recently*.

**Record** (in `UserChannel` `ctx.storage`, key `conn:<connId>` — **not**
`serializeAttachment`, since MCP clients hold no WebSocket here, only internal `fetch`):

```
McpConn = { connId, client, clientVersion, protocol, serverVersion, connectedAt, lastSeenAt }
```

- `connId` — the registry **key**: the **OAuth `client_id`** (Dynamic Client Registration), which is *stable across reconnects* for an install — so a `/mcp` reconnect updates one row instead of leaving a ghost per session. Sources: grant `props` (`oauthReq.clientId` at `completeAuthorization`) → `extra.authInfo.clientId` (captured on a tool call + persisted, for pre-existing tokens) → the rotating session id (last resort). The `Mcp-Session-Id` is kept as a debug-only `sessionId`. *(`clientInfo {name,version}` is not an id; the session id rotates each reconnect — neither is a stable per-install key.)*
- `client`/`clientVersion`/`protocol` — `clientInfo` from the live handshake (`server.getClientVersion()`) + protocol from the persisted `initialize` request.
- `serverVersion` — the `McpServer` version at connect time (`index.ts` `new McpServer({version})`).

**Capture — bound to the connection lifecycle, not to tool calls** (so a reconnect/disconnect shows in the editor **immediately, with no tool call**):

| event | hook in `KymoMCP` | effect |
|-------|-------------------|--------|
| **connect** | `this.server.server.oninitialized` (fires once the `initialize` handshake completes — `clientInfo` is populated by then) | `POST /mcp-seen` → register |
| **wake / idle SSE reconnect** | `onStart()` override (runs on every DO wake; Cloudflare recycles an idle SSE stream ~every 5 min) | `POST /mcp-seen` → refresh `lastSeenAt` so an alive-but-idle client isn't aged out |
| **clean disconnect** | `destroy()` override — the MCP `DELETE` (client quit / `/mcp` reconnect) routes to `agent.destroy()` | `POST /mcp-gone` → drop the record |
| **any tool call** | the `this.server.tool` wrapper | `POST /mcp-seen` → refresh `lastSeenAt` (carries the live protocol header) |

`POST /mcp-seen` upserts (`connectedAt` set once, always bump `lastSeenAt`); both it and `/mcp-gone` then **push** the new snapshot to every open editor window over `/userws` (no polling).

**Endpoints** (added to the §2 table):

| path | purpose |
|------|---------|
| `POST /mcp-seen` | upsert a connection record (from the lifecycle hooks above) → `broadcastConns()` |
| `POST /mcp-gone` | delete a connection (clean disconnect via `destroy()`) → `broadcastConns()` |
| `GET /mcp-connections` | `snapshotConns()` — prune entries older than `HARD_TTL`; return `{connections[], summary:{total,connected,outdated}}` (the `/api/connections` path uses this) |

**Liveness without polling.** `UserChannel` keeps a DO **alarm** armed at `lastSeen + STALE_MS` whenever a record is upserted; `alarm()` re-pushes the snapshot and reschedules while any record remains — so an **ungraceful** drop (crash/network loss → no `DELETE`) ages out of `connected` on its own. A freshly-opened editor tab is sent the current snapshot on `/userws` connect. The editor renders from these pushes (`mcpstatus.tsx` `useConnections` signal), so there is **no `setInterval` poll**.

> Limit (inherent to stateless MCP): only a **clean** disconnect (the client sends `DELETE`) is instant; an ungraceful drop is detected via the `STALE_MS` alarm, not instantly. Reconnect is always instant (new session → `oninitialized`).

**Outdated reasons** (a connection is outdated if **any** hold), computed at read time
against current constants:

| reason | test |
|--------|------|
| `server` | `rec.serverVersion !== CURRENT_SERVER_VERSION` (built against a superseded build → reconnect) |
| `stale` | `now − rec.lastSeenAt > STALE_MS` (idle beyond the freshness window) |
| `protocol` | `rec.protocol < MIN_PROTOCOL` (host below the server's advertised protocol) |
| `client` | `clientVersion < MIN_CLIENT[client]` (best-effort; only for clients in the map) |

Thresholds (one place, tunable): `STALE_MS = 10 min`, `HARD_TTL = 60 min`,
`CURRENT_SERVER_VERSION` = the `McpServer` version, `MIN_PROTOCOL` = latest supported,
`MIN_CLIENT` = small per-client map (initially advisory). `connected` = seen within `STALE_MS`.

**Browser surface.** `userchannel.tsx` dispatches the `{type:"mcp-connections"}` push
into the `mcpstatus.tsx` `useConnections` signal; the **Connection** tab (`connectai.tsx`)
renders it live — **"N connected · M outdated"** + a row per connection (client + version,
protocol, last seen) with an outdated-reason badge; a `server`-outdated row links to
**Setup** to reconnect. The `GET /api/connections` route (auth via `resolveAuth` → `email`,
CORS like the other `/api/*`; forwards to `UserChannel /mcp-connections`) remains for
non-WS/debug use and the localhost stub. This is the server-side, per-connection
counterpart of the client-side activity signal CS-02 — see `DESIGN-KAI-002` **CS-07**.

> Limit (inherent to stateless MCP): only a **clean** disconnect (client `DELETE`) is
> instant; an ungraceful drop ages out via the `STALE_MS` alarm. "Outdated" is advisory
> (the user reconnects the client). The registry does not gate any tool.

## 8. Traceability

| FR | Worker | Editor |
|----|--------|--------|
| FR-AI-01 | `ui_status` tool, `feed()`, `NARRATE` const | `pushStatus`/`useStatusFeed`, `connectai.tsx` feed |
| FR-AI-02 | `ui_list_sessions`/`ui_switch_session`, `pickTarget`, `/sessions`,`/target` | pin signals, ✨ button, Connection tab |
| FR-AI-03 | `wait_for_user_message`, `/inbox-wait`, inbox | `sendPrompt`/`registerPromptSender`, composer |
| FR-AI-04 | `new_project`/`delete_project` `simulate` → `ui-*-project` push | `simulateNewProject`/`ProjectsModal.simulate` |
| FR-AI-05 | `open-project`/`projects-changed` push | `refresh()` on those messages |
| FR-AI-06..10 | — | `connectai.tsx` (panel/tabs/gear), `mcpstatus.tsx`, `sidebar.tsx` (✨) |
| FR-AI-11 | `KymoMCP` heartbeat, `UserChannel` `/mcp-seen` + `/mcp-connections`, `/api/connections` | `connectai.tsx` Connection tab (connection list + outdated badges) |

## Annex A — Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-06-20 | Vũ Anh | Initial as-built design for Connect AI: `UserChannel` DO + protocol, editor signal hub, reverse channel + listener gating, UI-simulation drivers. Realises `FEAT-KAI-001`. |
| 0.2 | 2026-06-20 | Vũ Anh | Added **§7 MCP connection registry** (`FR-AI-11`, `CR-KAI-001`): per-user `McpConn` records in `UserChannel` storage, heartbeat from `KymoMCP` (`POST /mcp-seen`), `GET /mcp-connections` + `/api/connections`, the four outdated reasons (server / stale / protocol / client) + thresholds, Connection-tab surface. Renumbered Traceability → §8 and added its `FR-AI-11` row. |
| 0.4 | 2026-06-20 | Vũ Anh | §7 registry **keyed by OAuth `client_id`** (stable per install) instead of the rotating session id (`CR-KAI-001` v1.2) — a `/mcp` reconnect updates one row, no ghost-per-reconnect; `client_id` from grant props → `authInfo` cache → session id; `Mcp-Session-Id` retained as debug-only `sessionId`. |
| 0.3 | 2026-06-20 | Vũ Anh | §7 reworked to **lifecycle + live push** (`CR-KAI-001` v1.1): register on `oninitialized`, refresh on `onStart` (idle SSE wake), drop on `destroy()` (clean `DELETE`); `POST /mcp-gone` + `broadcastConns()` push `{type:"mcp-connections"}` over `/userws`; DO **alarm** ages out ungraceful drops; editor renders from the `useConnections` signal (**no poll**). Endpoints added to §2. |

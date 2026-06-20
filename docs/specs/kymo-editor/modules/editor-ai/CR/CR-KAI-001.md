---
title: "Connect AI CR-001 — Server-side MCP connection registry: per-user view of how many clients are connected and how many are outdated"
document_id: CR-KAI-001
version: "1.1"
issue_date: 2026-06-20
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the Connect AI panel (`packages/editor/web/`) and the `UserChannel` control plane + `KymoMCP` agent in the kymo-mcp Worker (`packages/mcp/`); reviewers
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-KAI-001
  - DESIGN-KAI-001
  - DESIGN-KAI-002
  - DESIGN-KAI-003
  - FEAT-KEMCP-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - connect-ai
  - mcp
  - connection-registry
  - presence
  - userchannel
  - mcpagent
  - heartbeat
  - outdated
  - stale-session
  - server-version
  - protocol-version
  - client-version
---

# CR-KAI-001 — Server-side MCP connection registry

> Change-request against the baselined `editor-ai` module (`FEAT-KAI-001`),
> extending the connection model documented in `DESIGN-KAI-001` (control plane) and
> `DESIGN-KAI-002` (connection states). Self-contained (motivation → findings →
> proposed change → amended clauses → acceptance → record), per the `CR/`
> one-file-per-CR convention. Cross-references use `document_id`, not file paths.
> **Status: Open** — design baselined here; code lands as a follow-up.

## 1. Motivation

A user can wire **several** MCP clients to one account — Claude (web/desktop),
Claude Code, Cursor, ChatGPT — each a separate connection to `mcp.kymo.studio`.
Today the editor surfaces only **recent activity** (`DESIGN-KAI-002` CS-02, a 120 s
window): "an AI did something here in the last 2 minutes". It cannot answer the two
questions an operator actually has:

1. **How many MCP clients does this user currently have connected?**
2. **How many of those are outdated** — running against a superseded server build,
   long idle, or on an old protocol/client version — and should reconnect?

This matters in practice because a Worker redeploy **drops the MCP connector**
(see [[mcp-connector-drops-on-redeploy]]): after a deploy, a client that connected
against the old build keeps a stale session until it reconnects. The user has no way
to see "you have 2 connections, 1 is on an old build — reconnect it".

## 2. Findings (current architecture, as-built)

| # | Fact | Evidence |
|---|------|----------|
| 1 | Each MCP client connection is a **separate `KymoMCP` (`McpAgent`) Durable Object instance** (one DO per session), keyed by the transport's session — but there is **no per-user index** enumerating them. | `packages/mcp/src/index.ts` `class KymoMCP extends McpAgent<…>`; `agents/mcp` runtime (one agent DO per MCP session) |
| 2 | The only per-user, name-addressable place that already spans *all* of a user's surfaces is the **`UserChannel` DO** (`idFromName(email)`), today holding editor windows + the prompt inbox. | `DESIGN-KAI-001` §2; `index.ts` `class UserChannel` |
| 3 | MCP is **stateless Streamable-HTTP/SSE** — there is **no disconnect event**. "Connected" can only be inferred from **recent tool activity**; the editor already does this client-side (`pingMcp`, 120 s) but never server-side, and never per-connection. | `DESIGN-KAI-002` §1; `index.ts` `feed()` → `UserChannel /push` |
| 4 | The MCP handshake (`initialize`) carries the client's **`clientInfo {name, version}`** and a **negotiated protocol version**; the server advertises its own `version` (`new McpServer({ name, version })`). None of this is recorded anywhere. | `index.ts:762` `new McpServer({ name: "kymostudio", version: "0.4.1" })`; MCP spec `initialize` |
| 5 | `KymoMCP` already calls into `UserChannel` over an internal `fetch` for side-effects (`feed()`, `projects-changed`) — the same channel a registry write would use; no new transport needed. | `index.ts` `this.env.USER_CHANNEL.get(idFromName(me())).fetch("https://chan/push", …)` |

**Consequence.** The data needed (client name/version, protocol, server build,
first-seen, last-seen) exists at the moment each tool runs; it is simply never
captured into a per-user place. The fix is an **upsert-on-activity registry** in the
DO that already exists per user.

## 3. Proposed change (not yet implemented)

Add a **per-user MCP connection registry** to the `UserChannel` DO, fed by a
**heartbeat** from `KymoMCP` on every tool call (and on each `wait_for_user_message`
long-poll, so an idle-but-listening agent still counts as connected). Surface it in
the Connect AI panel's **Connection** tab as "*N connected · M outdated*", with a
per-connection list and a reason badge on each outdated one.

### 3.1 Registry record

Stored in `UserChannel` `ctx.storage`, one entry per connection, key `conn:<connId>`:

```ts
type McpConn = {
  connId: string;         // MCP Mcp-Session-Id (fallback: the KymoMCP DO id) — stable per session
  client: string;         // clientInfo.name      → "Claude Code" / "Cursor" / "ChatGPT" / "claude-ai"
  clientVersion: string;  // clientInfo.version
  protocol: string;       // negotiated MCP protocol version (e.g. "2025-06-18")
  serverVersion: string;  // KymoMCP server version at connect time (today "0.4.1")
  connectedAt: number;    // first heartbeat
  lastSeenAt: number;     // most-recent heartbeat
};
```

Storage choice: **`ctx.storage`, not `serializeAttachment`** — MCP clients do not hold
a WebSocket to `UserChannel` (they reach it via internal `fetch`), so the per-socket
attachment used for editor windows (`DESIGN-KAI-001` §2) does not apply here.

### 3.2 Capture — bound to the connection lifecycle (no tool call required)

The requirement is that a **reconnect or disconnect is reflected in the editor
immediately, without the agent calling any tool**. So capture hooks the MCP/DO
lifecycle, not (only) tool calls. `connId` = the transport session id
(`KymoMCP` DO name `streamable-http:<id>` / `sse:<id>` → `this.getSessionId()`).

| event | hook in `KymoMCP` | effect |
|-------|-------------------|--------|
| **connect** | `this.server.server.oninitialized` (fires when the `initialize` handshake completes — `clientInfo` is populated) | `POST /mcp-seen` → register |
| **wake / idle SSE reconnect** | `onStart()` override (every DO wake; Cloudflare recycles an idle SSE stream ~every 5 min) | `POST /mcp-seen` → refresh `lastSeenAt` so an alive-but-idle client isn't aged out |
| **clean disconnect** | `destroy()` override — the MCP `DELETE` (client quit / `/mcp` reconnect) routes to `agent.destroy()` | `POST /mcp-gone` → drop the record |
| **any tool call** | the `this.server.tool` wrapper | `POST /mcp-seen` → refresh `lastSeenAt` |

`POST /mcp-seen` upserts (`connectedAt` once, always bump `lastSeenAt`); `POST /mcp-gone`
deletes. Both then **push** the new snapshot to open editor windows (see §3.4). The
fetches are fire-and-forget, like `feed()`.

> **Honest limitation.** Only a **clean** disconnect (client sends `DELETE` — Claude
> Code does on quit / `/mcp` reconnect) is instant. An **ungraceful** drop (crash,
> network loss) sends no `DELETE`, so it is detected by the `STALE_MS` alarm (§3.4),
> not instantly — unavoidable with stateless HTTP (no reliable transport-close event).
> Reconnect is always instant (a new session fires `oninitialized`).

### 3.3 Read + outdated computation

`UserChannel.snapshotConns()` (served by **`GET /mcp-connections`** and reused by the
push): read all `conn:*`, **prune** any with `lastSeenAt` older than `HARD_TTL` (treated
as gone), then for each remaining record compute the **four** outdated reasons (a
connection is outdated if **any** hold):

| Reason | Test | Meaning |
|--------|------|---------|
| `server` | `rec.serverVersion !== CURRENT_SERVER_VERSION` | session built against a superseded server (post-redeploy) → reconnect to refresh tools/schema |
| `stale` | `now − rec.lastSeenAt > STALE_MS` | no activity in the freshness window → likely dead/idle |
| `protocol` | `rec.protocol < MIN_PROTOCOL` | host on an MCP protocol older than the server advertises |
| `client` | `lt(rec.clientVersion, MIN_CLIENT[rec.client])` | known client below its recommended-minimum version (**best-effort**: only for clients in the map; no map entry → no opinion) |

Returns `{ connections: McpConn[] & {outdated, reasons[]}, summary: {total, connected, outdated} }`
where `connected` = records seen within `STALE_MS`.

Thresholds (initial): `STALE_MS = 10 min`, `HARD_TTL = 60 min`,
`CURRENT_SERVER_VERSION` = the `McpServer` version constant, `MIN_PROTOCOL` = the
latest protocol the server supports, `MIN_CLIENT` = a small per-client map (initially
empty / advisory). All tunable in one place.

### 3.4 Live push + browser surface (Connection tab) — no polling

- On every `/mcp-seen` and `/mcp-gone`, `UserChannel.broadcastConns()` sends
  `{type:"mcp-connections", connections, summary}` to **all** open editor windows over
  the existing `/userws` socket; a freshly-opened tab is sent the snapshot on connect.
- **Liveness without a reader:** `UserChannel` arms a DO **alarm** at
  `lastSeen + STALE_MS` on each upsert; `alarm()` re-pushes the snapshot (re-evaluating
  freshness) and reschedules while any record remains — so an **ungraceful** drop ages
  out of `connected` on its own.
- `web/userchannel.tsx` routes the push into a `web/mcpstatus.tsx` `useConnections`
  signal; the **Connection** tab (`web/connectai.tsx`) renders it **live (no poll)**:
  a header **"N connected · M outdated"**, then a row per connection — client + version,
  protocol, "last seen 2m ago" — with an **Outdated** badge whose tooltip lists the
  reason(s); a `server`-outdated row links to the **Setup** tab to reconnect. This sits
  **above** the existing per-window pin/target controls (CS-04), which are unchanged.
- `GET /api/connections` (auth via `resolveAuth` → `email`) remains for non-WS/debug
  use + the localhost stub.

### 3.5 Why this is consistent with "there is no connected flag" (`DESIGN-KAI-002`)

`DESIGN-KAI-002` §1 stands: MCP is stateless; we still cannot observe a live socket.
The registry does **not** invent a true presence flag — it records **last activity per
connection** and derives "connected" as *seen within `STALE_MS`*, exactly the
freshness-window model the editor already uses for CS-02, but **server-side and
per-connection** rather than client-side and aggregate. It is a new **CS-07**
(registered connections) in that doc, not a contradiction of §1.

### 3.6 Out of scope / unaffected

- **MCP OAuth / transport** (`FEAT-KEMCP-001` `FR-MC-02/03`) — unchanged; the registry
  only *observes* tool activity, it gates nothing.
- **Editor-window sessions** (`ui_list_sessions`, CS-04 pin/target) — orthogonal; this
  registry is about **MCP clients**, not browser windows.
- **Forcing a disconnect** — out of scope. Stateless MCP has no server-initiated close;
  "outdated" is advisory (the user reconnects the client).
- **Cross-user / admin views** — out of scope; strictly the signed-in user's own `email`.

## 4. Baseline clauses touched (on close)

| Clause | Doc | Change |
|--------|-----|--------|
| `SN-AI-06` (new) | `FEAT-KAI-001` | Add need: a user wants to see how many MCP clients are connected to their account and how many are outdated. |
| `FR-AI-11` (new) | `FEAT-KAI-001` | Add requirement: server-side MCP connection registry (heartbeat upsert in `UserChannel`; `/mcp-connections` + `/api/connections`; the four outdated reasons; Connection-tab surface). |
| `US-AI-06` (new) | `FEAT-KAI-001` | Add user story for the Connection-tab connection list. |
| §8 (new) | `DESIGN-KAI-001` | Add the registry design (record, heartbeat, endpoints, thresholds, panel). |
| `CS-07` (new) | `DESIGN-KAI-002` | Add the registered-connections signal + the outdated reasons; nuance §1 (server-side per-connection freshness, still not a socket flag). |
| C? (new) | `DESIGN-KAI-003` | Add the registry to the component table + key flows (heartbeat → registry → panel). |

No requirement/clause text is amended while this CR is **Open**; the re-baseline
(clause wording + module Annex A bumps) happens when the code lands and the CR is
**Closed**. (As-built docs in this session are pre-staged with these additions marked
*realised by CR-KAI-001*.)

## 5. Acceptance / verification

- **Capture.** With one MCP client connected and running a tool, `GET /api/connections`
  returns one record with the correct `client`/`clientVersion`/`protocol`/`serverVersion`
  and `connectedAt ≤ lastSeenAt`.
- **Count.** Two distinct clients (e.g. Claude Code + Cursor) acting on the same account
  → `summary.connected == 2`.
- **Idle → stale.** A connection with no activity for `> STALE_MS` reports
  `outdated` with reason `stale`; after `> HARD_TTL` it is pruned (absent from the list).
- **Server outdated.** After a Worker redeploy bumps `CURRENT_SERVER_VERSION`, a
  still-using session that connected on the old build reports reason `server` until it
  reconnects.
- **Listening keepalive.** An agent parked on `wait_for_user_message` (no other tool
  calls) stays `connected` (heartbeat from the long-poll), not `stale`.
- **Panel.** The Connection tab shows "N connected · M outdated", one row per
  connection with reason badges; a `server`-outdated row offers a reconnect link.
- **No regressions.** CS-01..CS-06 (`DESIGN-KAI-002`), the pin/target flow, the feed,
  and the reverse channel are unchanged; signed-out authoring unaffected.

## 6. Change record

| Date | Actor | Decision |
|------|-------|----------|
| 2026-06-20 | Vũ Anh | **Opened.** Root-caused the gap: each MCP client is its own `KymoMCP` DO with no per-user index, and MCP statelessness means only *activity* is observable. Proposed an upsert-on-activity **connection registry** in the existing per-user `UserChannel` DO, fed by a heartbeat from `KymoMCP` (per tool call + `wait_for_user_message` keepalive), read via `/mcp-connections` → `/api/connections`, with **four** outdated reasons (server / stale / protocol / client) surfaced in the Connection tab as "N connected · M outdated". Defined `SN-AI-06` / `FR-AI-11` / `US-AI-06` and the design additions to `DESIGN-KAI-001/002/003`. Code is a follow-up; CR stays Open until it lands and the baseline is re-based. |
| 2026-06-20 | Vũ Anh | **Reworked to lifecycle + live push** (user requirement: a reconnect/disconnect must be detected by the browser **immediately, without calling any tool**). Capture now hooks the MCP/DO lifecycle — register on `server.oninitialized` (connect), refresh on `onStart` (idle SSE wake), drop on `destroy()` (the clean MCP `DELETE`) — instead of relying on tool calls. Added `POST /mcp-gone` + `broadcastConns()` pushing `{type:"mcp-connections"}` over `/userws`, a DO **alarm** backstop for ungraceful drops, and snapshot-on-tab-connect; the editor renders from a `useConnections` signal with **no polling**. Documented the honest limit (clean disconnect instant; ungraceful → `STALE_MS` alarm). First implementation landed (worker + editor). |

## Annex A — Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-20 | Vũ Anh | Initial — server-side MCP connection registry CR. Finding: each MCP client is a separate `KymoMCP` DO with no per-user index; stateless MCP exposes only activity. Proposed a heartbeat-fed registry in `UserChannel` (record `McpConn`; `POST /mcp-seen` upsert; `GET /mcp-connections` + `GET /api/connections`), with four outdated reasons (server / stale / protocol / client; thresholds `STALE_MS`/`HARD_TTL`/`MIN_PROTOCOL`/`MIN_CLIENT`) surfaced in the Connection tab. Identified `SN-AI-06`/`FR-AI-11`/`US-AI-06` + `DESIGN-KAI-001 §8` / `DESIGN-KAI-002 CS-07` / `DESIGN-KAI-003` as the additions to baseline on close. Status Open. |
| 1.1 | 2026-06-20 | Vũ Anh | Reworked capture to the **connection lifecycle** (register on `oninitialized`, refresh on `onStart`, drop on `destroy()`/`DELETE`) so reconnect/disconnect is detected with **no tool call**; added **live push** over `/userws` (`broadcastConns` + `POST /mcp-gone` + snapshot-on-connect) and a DO **alarm** backstop, replacing the 15 s poll. Stated the clean-vs-ungraceful disconnect limit. First implementation landed. |

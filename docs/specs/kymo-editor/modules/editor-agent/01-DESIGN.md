---
title: Editor Agent — Design Proposal (local Claude Code chat bridge)
document_id: FEAT-KAGENT-001
version: "0.1"
issue_date: 2026-06-16
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers building kymo-editor's in-editor agent chat (`packages/editor/web/`, new `packages/agent-bridge/`); reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-KEDITOR-001
  - FEAT-KLIVE-001
  - FEAT-KEMCP-001
authors:
  - Vũ Anh
language: en
keywords:
  - editor-agent
  - claude-code
  - headless
  - stream-json
  - websocket
  - localhost
  - bridge
  - mcp
  - openclaw
---

# Editor Agent — Design Proposal (local Claude Code chat bridge)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-KAGENT-001` |
| Version           | 0.1 (Proposed) |
| Status            | Proposed — design only, not yet built |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (umbrella), `FEAT-KLIVE-001` (live channel + Google auth reused), `FEAT-KEMCP-001` (the MCP tools the local agent calls) |

> **Module of the `kymo-editor` umbrella.** Adds an **in-editor Agent chat panel** that drives the user's **local Claude Code** (the `claude` CLI in headless mode) through a small **bridge daemon** running on the user's own machine. The agent the user is chatting with is *their* Claude Code — same account, same machine, same tools — and it stays connected to `mcp.kymo.studio`, so any diagram it creates/edits shows up live in the very tab the chat lives in (via the existing `UserChannel`/`EditorRoom` channels). This is the "openclaw" model: a local HTTP/WS bridge wrapping the Claude Code CLI, with a web UI as the front end.

---

## 1. Concept of Operations (ConOps)

**Actor.** A signed-in kymo-editor user who *also* runs Claude Code on the same machine the browser is on.

**Job.** *"Let me chat with my own Claude Code from inside the diagram editor, and have the diagrams it draws appear right here — without alt-tabbing to a terminal."*

**Decided shape (this proposal).**
- **Transport:** the editor tab opens a WebSocket **directly to `ws://127.0.0.1:<port>`** — a bridge daemon on the same machine. No kymo cloud/Worker changes are required for v1.
- **Bridge runtime:** the daemon wraps the **`claude` CLI headless** (`claude -p --output-format stream-json`), not the SDK.
- **Same-machine only:** because the browser talks to `localhost`, this works only when the editor tab and Claude Code are on the **same machine**. Remote (phone → desktop) is explicitly out of scope for v1 — it would need the cloud-relay variant (see §8).

**Why this stays in sync for free.** The local Claude Code is configured with the kymo MCP server (`mcp.kymo.studio`). When the agent calls `new_diagram` / `open_diagram` / sets source, the existing `EditorRoom` + `UserChannel` Durable Objects push those changes to the user's open tab (see `FEAT-KLIVE-001`, `userchannel.tsx`, `room.ts`). The chat panel does **not** need to render diagrams itself — it only carries the conversation; the canvas updates through the channel that already exists.

```
flowchart TD {
  U[User types in chat panel] --> EUI[Editor chat UI\n(editor.kymo.studio tab)]
  EUI -->|ws://127.0.0.1:PORT\nprompt frames| BR[Local bridge daemon\n(packages/agent-bridge)]
  BR -->|spawn claude -p\n--output-format stream-json| CC[Local Claude Code]
  CC -->|NDJSON events on stdout| BR
  BR -->|event frames| EUI
  CC -->|MCP tools over HTTPS| MCP[mcp.kymo.studio\nnew_diagram / open_diagram / set]
  MCP -->|EditorRoom + UserChannel push| EUI
}
```

---

## 2. Components

### 2.1 Local bridge daemon — new package `packages/agent-bridge/`

A tiny Node CLI the user installs and runs once (e.g. `npx kymo-agent-bridge` or a global install). Responsibilities:

1. **Listen** on `127.0.0.1:<port>` (default `4517`, configurable) — **bind to loopback only**, never `0.0.0.0`.
2. **Gate every connection** (see §5 Security): verify a shared **pairing token** and an **`Origin` allowlist**.
3. On a `prompt` frame, **spawn** `claude` headless in a configured working directory and **stream** its output:
   ```bash
   claude -p "<prompt>" \
     --output-format stream-json \
     --input-format stream-json \
     --verbose \
     [--resume <session_id>] \
     --permission-mode <mode> \
     [--allowedTools "<list>"]
   ```
4. **Parse** stdout NDJSON line-by-line and forward each line to the WS client as an `event` frame. Capture `session_id` from the `system/init` line and the final `result` line.
5. **Multi-turn:** keep the `session_id` per chat and pass `--resume <session_id>` on the next prompt (v1, simplest). *Alternative for later:* hold one long-lived process and feed turns over `--input-format stream-json` stdin.

The bridge owns the **working directory** Claude Code runs in (fixed/whitelisted in bridge config). The web UI must **not** be able to choose an arbitrary `cwd` — that would let a web page point the agent at any path.

### 2.2 Editor chat panel — `packages/editor/web/`

- **`agentchat.tsx`** — a collapsible chat panel in the editor layout (next to the existing sidebar/preview). Renders the conversation: streamed assistant text (`text_delta`), tool-use chips (which MCP/Bash tool ran, collapsed), and the final result/cost line.
- **`useAgentBridge` hook** (sibling to `useRoom` in `room.ts` and `UserChannel` in `userchannel.tsx`) — owns the `ws://127.0.0.1:<port>` socket, send/stream, reconnect policy, and connection state.
- **Disconnected state UX** — when the bridge isn't reachable, the panel shows a short "Start your local bridge" guide + the pairing step, instead of an error.
- **`const.ts`** — add `AGENT_WS_PORT` / default URL builder. Pairing token stored in `localStorage`.

No `packages/mcp/` (Worker) changes for v1 — the cloud is untouched.

---

## 3. Message protocol (WebSocket frames)

JSON text frames, mirroring the lightweight style already used by `room.ts`/`userchannel.tsx`.

**Editor → bridge**
| `type`     | Fields                                  | Meaning |
|------------|-----------------------------------------|---------|
| `hello`    | `token`, `clientId`                     | First frame; bridge validates token + `Origin`, else closes. |
| `prompt`   | `text`, `sessionId?`                    | Run a turn. `sessionId` continues a prior conversation. |
| `cancel`   | `sessionId`                             | Abort the running `claude` process for this chat. |

**Bridge → editor**
| `type`     | Fields                                  | Meaning |
|------------|-----------------------------------------|---------|
| `ready`    | `cwd`, `model?`, `version`              | Handshake accepted; what the agent is pointed at. |
| `event`    | `line` (one parsed NDJSON object)       | A passthrough Claude Code stream-json event (`system`, `assistant`, `stream_event`, `tool_use`, …). |
| `result`   | `sessionId`, `costUsd`, `isError`       | Turn finished; persist `sessionId` for the next prompt. |
| `error`    | `message`                               | Bridge-level failure (spawn failed, token bad, etc.). |

The editor renders `event` frames; the only ones it needs to special-case for UX are `stream_event` text deltas (live typing) and `tool_use`/`tool_result` (chips). Everything else can be logged/debug-only.

---

## 4. Session & permission model

- **Session continuity:** first `result` returns `session_id`; the panel stores it and sends it back on the next `prompt` so the bridge adds `--resume`. One `sessionId` per chat thread.
- **Permissions (no interactive prompt available):** a web bridge can't show Claude Code's normal y/n prompt. v1 ships a **conservative default** set in the bridge config, not chosen by the web page:
  - `--permission-mode acceptEdits` (or `default` + a fixed `--allowedTools` list) so common edit/read/MCP tools run, and
  - rely on the user's own `.claude/settings.json` `allow`/`deny` rules in the bridge's working directory.
  - **Later:** route Claude Code's `--permission-prompt-tool` (an MCP tool) back through the bridge so the chat panel can show an **Approve/Deny** card for risky tools. Tracked as a phase-2 item (§7).
- **Bypass is opt-in only:** `bypassPermissions` must never be the default; if offered, it's a per-bridge config flag the user sets knowingly.

---

## 5. Security model — the load-bearing section for localhost

Talking to `ws://localhost` from an HTTPS page means **any website the user visits could also try to reach the bridge port**. The bridge gives Claude Code the power to edit files and run Bash, so an unguarded port is effectively remote code execution. Mandatory mitigations:

1. **Loopback bind only.** Listen on `127.0.0.1`, never a routable interface. No inbound LAN/WAN exposure.
2. **Shared pairing token (required).** The bridge prints a strong random token on first run; the user pastes it into the editor's chat settings once (stored in `localStorage`). Every `hello` frame must carry it; mismatches are closed immediately. Treat the token like an SSH key.
3. **`Origin` allowlist.** The bridge checks the WS handshake `Origin` header and accepts only `https://editor.kymo.studio` (plus `http://localhost:*` for editor dev). This blocks drive-by pages even if they guess the port — browsers send a truthful `Origin` on WS handshakes.
4. **Private Network Access (PNA).** Chromium is rolling out preflights for public→private (`localhost`) requests. The bridge must answer the CORS/PNA preflight with `Access-Control-Allow-Private-Network: true` and `Access-Control-Allow-Origin: https://editor.kymo.studio`. Document this; without it the connection may be blocked in newer Chrome.
5. **Mixed content note.** `ws://127.0.0.1` from an `https://` page is allowed today because `localhost` is a "potentially trustworthy" origin — so no cert is needed. If a future browser tightens this, fall back to a locally-trusted `wss://` cert (documented, not built in v1).
6. **Fixed working directory.** The web UI cannot set `cwd`; the bridge decides what repo the agent operates in.
7. **No secrets to the cloud.** The token and all chat traffic stay between browser and localhost; kymo's Worker never sees them (v1 has no cloud component).

> **Threat to call out in the README:** if the pairing token leaks, a malicious page passing the `Origin` check could drive the user's Claude Code. Token rotation (regenerate in the bridge, re-pair) must be a one-command operation.

---

## 6. File-by-file change list (v1)

**New package — `packages/agent-bridge/`**
- `package.json` (bin: `kymo-agent-bridge`), `README.md` (install + pairing + security warning).
- `src/server.ts` — loopback WS server, token + `Origin` + PNA gating, frame routing.
- `src/claude.ts` — spawn `claude -p --output-format stream-json …`, NDJSON line parser, session/cancel handling.
- `src/config.ts` — port, working dir, permission mode, token storage (`~/.config/kymo-agent-bridge`).

**Editor — `packages/editor/web/`**
- `agentchat.tsx` (new) — chat panel UI + streamed rendering + pairing/disconnected states.
- `useAgentBridge` (new hook; could live in `agentchat.tsx` or its own `agentbridge.ts`) — socket lifecycle, mirroring `room.ts` conventions.
- `const.ts` — add `AGENT_WS_PORT` / URL builder.
- `EditorPage.tsx` / `sidebar.tsx` — mount the panel + a toggle button.
- `localdb.ts` — (optional) persist pairing token + last `sessionId`.
- `styles.css` — panel styling.

**Build/docs**
- `packages/editor/build.sh` — include the new component (esbuild entry already globs `web/`; verify).
- This spec + a `CHANGELOG.md` entry; cross-link from `docs/products/kymo-editor/agent-mcp.md` (the agent user-group doc) and the `editor-agent` module index.

**No changes** to `packages/mcp/` for v1.

---

## 7. Phasing

- **Phase 1 (MVP):** loopback bridge + chat panel; `acceptEdits` permission default; one-prompt-per-turn with `--resume`; text + tool chips; token pairing + `Origin` gate.
- **Phase 2:** interactive permission cards via `--permission-prompt-tool`; cancel/stop; cost/usage display; multiple working dirs / project picker (whitelisted).
- **Phase 3 (separate proposal):** cloud-relay transport (see §8) for remote/phone → desktop, reusing a new email-keyed Durable Object alongside `UserChannel`.

---

## 8. Rejected / deferred alternatives

- **Cloud relay via `api.kymo.studio` (deferred to Phase 3).** Local bridge dials *out* to a new `/agentws` Durable Object (keyed by email); the tab connects to the same DO; the DO relays both ways. Works from any network/device and opens no inbound port — but needs Worker changes and an auth story for the bridge. Deferred because v1's "same machine" scope doesn't need it.
- **Agent SDK instead of CLI.** Rejected for v1 per decision — the `claude` CLI headless is language-agnostic and thin; structured streaming via `--output-format stream-json` is sufficient. (SDK remains a clean swap behind `src/claude.ts` if desired.)
- **MCP `sampling`/`elicitation` to push from editor into an agent turn.** Not viable: MCP is client-initiated; the server can't start an agent turn from the editor side. (See the prior analysis that motivated this whole module.)

---

## 9. Open questions

1. **Distribution** of the bridge: `npx` one-off vs. a persistent daemon/service (launchd/systemd) vs. bundling into the existing `packages/desktop-app`? The desktop app could host the bridge and remove the separate-install friction.
2. **Working-directory selection** UX: single fixed dir (simplest, safest) vs. a whitelisted picker.
3. **Pairing UX:** paste-token vs. a short-lived `claude`-style code shown by the bridge and typed into the editor.
4. **Auth coupling:** should the bridge require the same Google identity as the tab (so chat ⇄ diagrams are provably the same user), or is loopback + token enough? For v1, loopback + token is enough since both ends are the same machine/user.

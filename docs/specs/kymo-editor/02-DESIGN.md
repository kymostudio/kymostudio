---
title: Kymo Editor (editor.kymo.studio) — Design
document_id: DESIGN-KEDITOR-001
version: "0.1"
issue_date: 2026-06-10
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the live flowchart editor (`packages/editor/`) and the kymo-mcp Worker (`packages/mcp/`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - FEAT-KEDITOR-001
  - TEST-KEDITOR-001
  - PLAN-KEDITOR-001
  - FEAT-FLOWCHART-001
  - FEAT-KYMOJSON-001
authors:
  - Vũ Anh
language: en
keywords:
  - technical-design
  - kymo-editor
  - client-side-render
  - wasm
  - esbuild
  - cloudflare-pages
  - cloudflare-workers
  - durable-objects
  - websocket
  - mcp
  - streamable-http
  - live-sync
---

# Kymo Editor (editor.kymo.studio) — Design

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `DESIGN-KEDITOR-001` |
| Version           | 0.1 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (requirements), `TEST-KEDITOR-001` (V&V), `PLAN-KEDITOR-001` (plan/why), `FEAT-FLOWCHART-001` (the DSL), `FEAT-KYMOJSON-001` (the engine reused unchanged) |

> **The *how* that complements `FEAT-KEDITOR-001`.** kymo-editor adds **no renderer** — it reuses the `kymostudio` JS engine + `kymostudio-core` wasm unchanged and adds (a) a client page, (b) a static build/deploy, and (c) a serverless live-sync + MCP channel. File references are to the shipped tree: `packages/editor/web/app.js`, `packages/editor/build.sh`, `.github/workflows/deploy-editor.yml`, `packages/mcp/src/index.ts`, `packages/mcp/wrangler.jsonc`.

---

## 1. Scope & relationship to the engine

Two independent deployables, one shared DSL:

```
┌────────────────────────┐         wss://…/ws          ┌──────────────────────────────┐
│ editor.kymo.studio      │  ◀───────────────────────▶  │ kymo-mcp Worker (packages/mcp)│
│ (Cloudflare Pages)      │   {type:"set"|"doc",...}    │                              │
│  packages/editor/web    │                             │  EditorRoom (Durable Object) │
│  • parseDiagram         │                             │   • source (+ DO storage)    │
│  • renderSVG (wasm)     │                             │   • WebSocket fan-out        │
└────────────────────────┘                             │  KymoMCP (MCP agent)         │
                                                        │   • set_diagram / get_diagram │
   MCP host (Claude) ───── /mcp (Streamable HTTP) ────▶ └──────────────────────────────┘
```

The engine (`packages/js`, `packages/rust/kymostudio-core`) is reused **unchanged**; this design owns only the page, the build, and the Worker.

## 2. Client render path (`packages/editor/web/app.js`) — FR-KE-01..05

- **Init (once at load).** `initSync(wasmBytes)` boots the wasm core from the inlined binary; `setManifest(manifest)` loads the icon index; `setIconBaseURL("https://cdn.jsdelivr.net/gh/kymostudio/kymostudio@main/packages/icons")` points icon resolution at the CDN (`app.js:5-11`). → FR-KE-01, FR-KE-04.
- **Render.** `render()` reads the textarea, and on non-empty input runs `const svg = await renderSVG(parseDiagram(source))`, injects it into the preview, and writes `OK · <svg.length> bytes · <ms>ms` to the status line. A `try/catch` routes engine errors to the status line in an error state (`app.js:34-44`). → FR-KE-01, FR-KE-02, FR-KE-05.
- **Debounce.** The `input` listener clears and resets a 120 ms timer that calls `render()` then `pushDoc()` (`app.js:46-50`). → FR-KE-02.
- **Download.** The download button blobs `lastSvg` as `image/svg+xml` and triggers an `a.download = "flowchart.svg"` click (`app.js:51-56`). → FR-KE-03.

## 3. Build & bundle (`packages/editor/build.sh`) — NFR-KE-03

`build.sh` clears `dist/`, copies `web/index.html`, and esbuild-bundles `web/app.js`:

```bash
npx esbuild web/app.js --bundle --format=esm --target=es2022 \
  --loader:.wasm=binary --minify --outfile=dist/app.js
```

`--loader:.wasm=binary` **inlines** the `kymostudio-core` wasm into `app.js`, so `dist/` is just `index.html` + one self-contained ESM module — no separate wasm fetch, fully static. The editor's `package.json` declares `file:` links to `../js` and `../rust/kymostudio-core/pkg`, so the bundle picks up the freshly built engine.

## 4. Deploy (`.github/workflows/deploy-editor.yml`) — NFR-KE-02

On push to `main` touching `packages/editor/web/**`, `build.sh`, `package.json`, `packages/js/**`, `packages/rust/kymostudio-core/**`, or the workflow itself (plus `workflow_dispatch`), the job:

1. **Builds the wasm core** — `wasm-pack build --target web … --features wasm` in `packages/rust/kymostudio-core`.
2. **Builds `packages/js`** against that fresh core (`npm ci` + `npm install --no-save ../rust/kymostudio-core/pkg` + `npm run build`) — necessary because the published npm engine predates `flowchart{}`.
3. **Builds the editor** — `npm install` + `./build.sh` in `packages/editor`.
4. **Deploys** `dist/` via `cloudflare/wrangler-action` → `pages deploy dist --project-name=kymo-editor --branch=main` (→ editor.kymo.studio). `concurrency: editor-deploy` with `cancel-in-progress`.

The `kymo-mcp` Worker deploys separately via `wrangler deploy` (`packages/mcp/package.json`).

## 5. Live-sync protocol & EditorRoom (`packages/mcp/src/index.ts:15-70`) — FR-KE-06..09

**Message shapes** (JSON over the WebSocket):

- Client → room: `{ type:"set", source, origin }` — push local edits.
- Room → client: `{ type:"doc", source, origin }` — broadcast current source (origin is the writer: `"server"` on connect, `"mcp"`, `"browser"`, or a tab id).

**`EditorRoom` (Durable Object).**
- Constructor restores `source` from `ctx.storage` under `blockConcurrencyWhile` (`:18-23`) → persistence/replay, FR-KE-09.
- `/ws` — accepts a hibernatable WebSocket (`ctx.acceptWebSocket`) and immediately sends the current source as a `doc` from origin `"server"` (`:27-34`) → seed-on-connect, FR-KE-09.
- `/set` (POST) — sets + persists source, broadcasts a `doc`, returns `{ ok, bytes, clients }` (`:35-41`).
- `/get` — returns `{ source, clients }` (`:42-44`).
- `webSocketMessage` — on `{type:"set"}` it stores, persists, and `broadcast(…, ws)` to **all sockets except the sender** (`:48-57`) → echo suppression at the server, complementing the client-side origin check (FR-KE-07).
- `broadcast(obj, except?)` iterates `ctx.getWebSockets()`, skipping `except`, best-effort send (`:63-69`).

**Client side (`app.js:58-86`).** A per-tab `myId` tags every `set`. `connect()` opens the socket, sets `live=true` on open (→ `⚡`), and on close sets `live=false` and retries after 2 s (FR-KE-06). On `message`: ignore non-`doc` and own-origin frames (FR-KE-07); if the incoming source is empty, `pushDoc()` to seed the room with this tab's content (FR-KE-08); otherwise adopt the source and `render()`.

## 6. MCP server (`KymoMCP`, `packages/mcp/src/index.ts:76-106`) — FR-KE-10..12

`KymoMCP extends McpAgent` with `server = new McpServer({ name:"kymo-editor" })`. `init()` registers two tools (zod-typed args):

- **`set_diagram({ source })`** — `fetch("https://room/set", POST, {source, origin:"mcp"})` against the room stub, then returns `Pushed <bytes> chars … (<clients> live tab(s) updated)` (`:80-93`). → FR-KE-10.
- **`get_diagram()`** — `fetch("https://room/get")`, returns the source or `"(editor is empty)"` (`:95-104`). → FR-KE-11.

`roomStub(env)` resolves the single room via `EDITOR_ROOM.idFromName("default")` (`:11,72-74`) — one shared room by design.

## 7. Worker routing & bindings (`fetch`, `wrangler.jsonc`) — FR-KE-12

`export default { fetch }` routes by path (`:108-125`):

| Path | Handler |
|------|---------|
| `/ws`, `/set`, `/get` | `roomStub(env).fetch(request)` → `EditorRoom` |
| `/mcp` | `KymoMCP.serve("/mcp")` — Streamable HTTP MCP |
| `/sse`, `/sse/message` | `KymoMCP.serveSSE("/sse")` — legacy SSE MCP |
| `/` | plain-text banner |
| else | 404 |

`wrangler.jsonc` binds two Durable Objects (`KymoMCP` → `MCP_OBJECT`, `EditorRoom` → `EDITOR_ROOM`) with a `new_sqlite_classes` migration, `nodejs_compat`, and observability enabled.

---

## Annex A — Key decisions & ADR

- **ADR-1 — Render moved from server to client.** The product went `466db60` (Cloudflare Functions `/api/render`) → `47ecb4c` (Hetzner Python `render_kymo.py` + SSH auto-deploy) → `0860ace` (client-side wasm, no server). The wasm core makes the render fast enough in-browser, eliminating a paid/operated render service (SN-KE-05) and a network roundtrip (NFR-KE-01). **Consequence:** `packages/editor/README.md` (which still documents the Python `/api/render` + stdio `render_flowchart` stack) is **superseded** by this spec for architecture; it is retained as history and a candidate for a follow-up doc-sync.
- **ADR-2 — Single shared `"default"` room.** Live sync uses one room keyed by name `"default"` — the simplest thing that demos LLM→editor push. Multiple/named rooms are deferred (§C.5 of `FEAT-KEDITOR-001`); the trade-off is that all viewers share one canvas (a known risk in `PLAN-KEDITOR-001` §5).
- **ADR-3 — DO storage as the only persistence.** The room snapshots its last source to Durable Object storage so reloads/late joiners see current state, without a database. No version history.
- **ADR-4 — Echo suppression on both ends.** The server broadcasts to all-but-sender *and* the client filters its own `origin` — belt-and-braces so an in-flight `set` can never clobber the tab that just typed it.
- **ADR-5 — wasm inlined into one ESM file.** Keeps `dist/` to two files and avoids a second network fetch / MIME-type config on Pages (NFR-KE-03), at the cost of a larger `app.js`.

## Annex B — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial design. Documents the client render path, esbuild static build, Cloudflare Pages deploy workflow, the WebSocket live-sync protocol + `EditorRoom` DO, and the `KymoMCP` MCP server/routing — all grounded in the shipped tree. ADRs record the server→client migration and the single-room/DO-storage choices. |

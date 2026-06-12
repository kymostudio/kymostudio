---
title: Kymo Editor (editor.kymo.studio) — Design
document_id: DESIGN-KEDITOR-001
version: "0.3"
issue_date: 2026-06-12
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the live diagram editor (`packages/editor/`) and the kymo-mcp Worker (`packages/mcp/`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - FEAT-KEDITOR-001
  - TEST-KEDITOR-001
  - PLAN-KEDITOR-001
  - FEAT-FLOWCHART-001
  - FEAT-KYMOJSON-001
  - REF-KROKI-001
authors:
  - Vũ Anh
language: en
keywords:
  - technical-design
  - kymo-editor
  - react-spa
  - client-side-render
  - wasm
  - esbuild
  - code-splitting
  - codemirror
  - kroki
  - share-codec
  - cloudflare-pages
  - cloudflare-workers
  - durable-objects
  - d1
  - websocket
  - oauth
  - mcp
  - streamable-http
  - live-sync
---

# Kymo Editor (editor.kymo.studio) — Design

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `DESIGN-KEDITOR-001` |
| Version           | 0.3 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (requirements), `TEST-KEDITOR-001` (V&V), `PLAN-KEDITOR-001` (plan/why), `FEAT-FLOWCHART-001` (the native DSL), `FEAT-KYMOJSON-001` (the engine reused unchanged), `REF-KROKI-001` (the external render gateway) |

> **The *how* that complements `FEAT-KEDITOR-001`.** kymo-editor adds **no renderer** — kymo kinds reuse the `kymostudio` JS engine + `kymostudio-core` wasm unchanged; other kinds delegate to kroki.io. What this design owns: (a) a React SPA, (b) a static build/deploy, (c) the `kymo-mcp` Worker (per-diagram rooms, D1 store, REST APIs, OAuth-gated MCP). File references are to the shipped tree: `packages/editor/web/*.tsx|ts`, `packages/editor/build.sh`, `.github/workflows/deploy-editor.yml`, `packages/mcp/src/index.ts`, `packages/mcp/wrangler.jsonc`.

---

## 1. Scope & architecture

```
┌──────────────────────────────────┐                ┌──────────────────────────────────────────┐
│ editor.kymo.studio (CF Pages)    │ wss /ws?d=<id> │ kymo-mcp Worker — mcp.kymo.studio        │
│ packages/editor/web (React SPA)  │◀──────────────▶│                                          │
│  /          EditorPage           │   set/doc/     │  EditorRoom DO (one per diagram id)      │
│  /diagrams  DiagramsPage         │   rename/meta  │   • source/title/kind/owner (DO storage) │
│                                  │                │   • WebSocket fan-out, echo-suppress     │
│  kymo render: kymostudio JS      │ REST /api/*    │   • D1 snapshot upsert (throttled)       │
│   + kymostudio-core wasm (lazy)  │◀──────────────▶│  /api/diagrams, /api/workspaces ──▶ D1   │
│  share codec: ?s= deflate+b64url │                │  KymoMCP (McpAgent): 5 per-user tools    │
└───────────┬──────────────────────┘                │  OAuthProvider: /authorize /token /reg.  │
            │ POST <kind>/svg                       └──────────────┬───────────────────────────┘
            ▼                                                      ▼
   kroki.io (28 non-kymo kinds)              MCP host (Claude) ── /mcp (Streamable HTTP) · /sse
   jsDelivr CDN (icon art)
```

The engine (`packages/js`, `packages/rust/kymostudio-core`) is reused **unchanged**. State of record: Durable Object storage for the live room, **D1** (`kymo-editor` database: `diagrams`, `workspaces`) for the queryable index + latest snapshot, KV (`OAUTH_KV`) for OAuth state, the `last:<email>` most-recent pointer, and legacy-migration flags.

## 2. Client app structure (`packages/editor/web/`)

`main.tsx` mounts `BrowserRouter > AuthProvider > WorkspaceProvider > Routes` with two routes: `/` → `EditorPage`, `/diagrams` → `DiagramsPage`.

| Module | Responsibility |
|--------|----------------|
| `EditorPage.tsx` | The editor route: URL-mode resolution (`?d`/`?s`/`?k`), render orchestration + debounce, room wiring, header chrome (workspace switcher, rename, account, + New, Share, Export), pane splitter, boot loader. |
| `DiagramsPage.tsx` | The library route: owner's list (sorted by `updatedAt` desc), search filter, workspace pill tabs, move/delete per row, refresh on focus/visibility, relative timestamps, kind badges. |
| `codeeditor.tsx` | CodeMirror 6 wrapper — FR-KE-15: extension set (line numbers, active line, history, bracket matching, `indentWithTab`, line wrapping), a brand-palette theme, per-kind language via a `Compartment` (generic keyword-parameterised `StreamLanguage` for DSL-ish kinds; `json`/`xml`/legacy `yaml`/`clojure`/`stex`/`verilog` for the rest), `applyingExternal` flag so external `value` swaps don't echo as user edits. |
| `engine.ts` | The lazy kymo render path — FR-KE-01: `initSync(wasmBytes)` once, `setManifest`, `setIconBaseURL(jsDelivr)`, exports `renderDiagram = renderSVG ∘ parseDiagram`. Reached only via `import("./engine")`. |
| `kroki.ts` | `KINDS` (kymo + 28 kroki kinds), `kindLabel`, `renderKroki(kind, source)` = `POST https://kroki.io/<kind>/svg`, error text propagated — FR-KE-13. Also `sanitizeSvg` (DOMPurify) — the third-party-SVG hygiene of `FR-RD-09` (see §3 and ADR-9). |
| `samples.ts` | Per-kind starter sources (kroki.io-verified) — FR-KE-14. |
| `share.ts` | The share codec + `shareUrl` — FR-KE-25 (see §5). |
| `room.ts` | `useRoom(roomId, idToken, handlers)` — the WebSocket hook (see §6). |
| `auth.tsx` | GIS integration — FR-KE-17: idempotent `initialize` (parent/child effect order), `kymo_idtoken` storage, `tokenValid` (exp − 30 s), `signOut`, `claims` parsed client-side from the JWT payload, `GoogleButton`, avatar `colorFor`. |
| `workspace.tsx` | `WorkspaceProvider`/`useWorkspace` — FR-KE-23/24: CRUD against `WORKSPACES_API`, `kymo_ws` persistence, fall-back-to-Personal on dangling id, `assignDiagram` (fire-and-forget PATCH), `WorkspaceSwitcher` header dropdown. |
| `const.ts` | Endpoints (`MCP_WS`, `DIAGRAMS_API`, `WORKSPACES_API` — all mcp.kymo.studio), `GOOGLE_CLIENT_ID`, the default kymo `SAMPLE`. |
| `util.ts` | `newId(16)` — base62, ≈ 95 bits (the id is the room capability — FR-KE-21); `titleFrom(source)` — first node label, ≤ 60 chars (FR-KE-08). |
| `index.html` / `styles.css` | Single HTML shell (GIS script tag, Inter + JetBrains Mono), CSS-variable design system on the brand palette. |

**URL modes** (resolved in `EditorPage`): `?d=<id>` → room mode (precedence over `?s`); `?s=<payload>[&k=<kind>]` → share mode; neither + signed in → redirect to the most-recent diagram id (or a fresh `newId()`) via `replace` navigation; neither + signed out → local sample editing. Per-room state (source/kind/title/flags) resets on `?d` change; a 5 s `syncing` failsafe holds the boot loader between "room requested" and "first doc".

## 3. Render orchestration (`EditorPage.doRender`) — FR-KE-01/02/05

One debounced effect re-renders and (in room mode) pushes the source: **120 ms** for kymo, **450 ms** for kroki kinds. `doRender` routes by kind — `renderRef.current` (the lazily imported engine) for kymo, `renderKroki` otherwise — and guards async completion with a **sequence counter** (`renderSeq`): a response older than the latest request is dropped, so a slow kroki render can never paint over a newer one. The kroki path passes the response through **`sanitizeSvg` (DOMPurify) before it reaches `dangerouslySetInnerHTML`** — the SVG is third-party markup rendered from possibly-untrusted `?s=` source (`FR-RD-09`, ADR-9); kymo output (trusted local engine) is injected as-is. Success writes `OK · <bytes> · <ms>ms`; failure writes the message in error state. The status bar prefixes `⚡` while the room socket is live.

## 4. Pane splitter — FR-KE-16

Pointer-captured drag on the divider sets the source-pane flex basis in % (clamped 15–85), `localStorage.kymo_split` persists on pointer-up, double-click resets 50/50. A `body.splitting` class disables text selection during the drag.

## 5. Share codec (`share.ts`) — FR-KE-25..27

- **Encode:** UTF-8 → `CompressionStream("deflate")` (zlib wrapper — the same "deflate" kroki uses) → `btoa` → base64url (`+`→`-`, `/`→`_`, `=` padding stripped).
- **Decode:** the inverse via `DecompressionStream`; failures surface as a status error ("Link share không hợp lệ").
- **URL shape:** `shareUrl()` = `/?s=<payload>` for kymo, `/?k=<kind>&s=<payload>` otherwise. Payloads are **interchangeable with kroki.io GET URLs** in both directions (NFR-KE-07).
- **Address-bar sync** (FR-KE-26): when no room is active and the user has actually edited (or arrived via `?s=`), a 300 ms-debounced `history.replaceState` rewrites the URL — the address bar is always a working share link. Loading a `?s=` link sets `userEdited` so subsequent edits keep syncing; `?d` suppresses the whole path.
- **Share popover** (FR-KE-27, re-baselined as `FR-SH-03` in `FEAT-KSHARE-001` v0.2): opening Share encodes the payload and **auto-copies the link** (`navigator.clipboard.writeText`, `window.prompt` fallback); the popover offers the URL in a select-on-focus field + Copy, a truncation warning when the link exceeds 2 000 chars, **Copy Markdown link**, and — non-kymo kinds — **Copy Markdown image**: a kroki.io **GET** URL (`https://kroki.io/<kind>/svg/<payload>`) reusing the same `?s=` payload (NFR-KE-07 interchange). Per-variant 1.6 s "Copied" state.

## 6. Live sync — client hook + room protocol — FR-KE-06..09

**Client (`room.ts`).** `useRoom` opens `MCP_WS + "?id_token=…&d=<roomId>"` when both `roomId` and `idToken` exist; a per-tab `myId` (random) tags outbound frames. Handlers are kept in a ref so the socket effect re-runs only on room/token change. Outbound: `{type:"set", source, kind, origin}` and `{type:"rename", title, origin}`. Inbound: `meta` → title; `doc` → `onDoc(source, title, fromSelf = origin===myId, kind)`. `open`/`close` toggle the live flag. **No timed reconnect** — a dropped socket stays down until the room or token changes (risk R10 in `PLAN-KEDITOR-001`).

**Doc-adoption rules (`EditorPage.onDoc`).** Self-echoes are ignored. An **empty** snapshot marks the room `fresh` — the local sample stays local (nothing persisted) until the user edits; the first real edit seeds the room and, for kymo, auto-titles via `titleFrom` + `sendRename` (FR-KE-08). A non-empty snapshot adopts source (+ kind) with an `applyingRemote` flag so the adoption itself isn't pushed back.

**Server (`EditorRoom`, `packages/mcp/src/index.ts`).** One DO per diagram (`EDITOR_ROOM.idFromName(id)`; a missing `?d` falls back to the literal name `"default"`). State `source/owner/title/diagramId/kind` is restored from DO storage under `blockConcurrencyWhile`. Endpoints (all internal except `/ws`):

| Path | Behaviour |
|------|-----------|
| `/ws` | Verifies the Google ID token (§8); first authenticated connector becomes **owner**, others get 403; accepts a hibernatable WebSocket and immediately sends the current state as `{type:"doc", …, origin:"server"}`. |
| `/set` (POST) | MCP/API writes: owner check, partial update of source/title/kind, broadcast `doc` (or `meta` for title-only), immediate D1 upsert, returns `{ok, bytes, clients}`. |
| `/get` | Owner check; returns `{source, title, owner, kind}`. |
| `/destroy` (POST) | Owner check; closes all sockets (`1000, "deleted"`), `storage.deleteAll()`, resets in-memory state. |

`webSocketMessage` handles browser frames: `set` persists source (+ kind) and broadcasts to **all-but-sender** (echo suppression server-side, complementing the client origin check — FR-KE-07); `rename` persists + broadcasts `meta`. **D1 upsert cadence** (FR-KE-09/NFR-KE-04): immediately on rename, kind change, and `/set`; throttled to ≥ 30 s during typing (`lastIdx`); flushed in `webSocketClose`.

## 7. Persistence — D1 schema & index

D1 database `kymo-editor` (binding `DB`), provisioned out-of-band (no migration file in-tree — schema below is the observed shape used by every query):

```sql
diagrams  (id TEXT PRIMARY KEY, owner TEXT, title TEXT, kind TEXT, ws TEXT, source TEXT, updated_at INTEGER)
workspaces(id TEXT, owner TEXT, name TEXT, created_at INTEGER)
```

Helper layer in `src/index.ts`: `listIndex` (owner's rows, `updated_at` desc), `touchIndex` (upsert metadata + bump `last:<email>` KV pointer — the "most recent" used by FR-KE-10/21), `removeFromIndex`, `destroyDiagram` (room `/destroy` then row delete), `assignWorkspace` (creates the row if the diagram isn't indexed yet — supports + New's pre-assignment). `migrateKvToD1` runs once per user (guarded by a `d1done:<email>` KV flag) and folds the legacy KV layout (`idx:*`, `wss:*`, `wsmap:*`, room sources) into D1.

## 8. Accounts & authorization

- **Browser sign-in (`auth.tsx`)**: GIS One Tap + rendered button; the ID token (a Google JWT) is the *only* client credential — stored in `localStorage.kymo_idtoken`, discarded when `exp` is within 30 s, parsed client-side for display claims only.
- **Server verification**: every `/ws` connect and `/api/*` call verifies the token with `jose` against Google's remote JWKS (issuer `accounts.google.com`, audience = `GOOGLE_CLIENT_ID`); `ALLOWED_EMAILS` (CSV var, empty = open) gates accounts. Identity = verified `email` (NFR-KE-06).
- **Ownership**: rooms bind to the first authenticated writer; D1 queries are always `WHERE owner = ?`; MCP tools act as the OAuth session's `email`.
- **MCP OAuth (`OAuthProvider`)**: `/mcp` + `/sse` are wrapped by `@cloudflare/workers-oauth-provider` (`/authorize` serves a GIS login page whose POST verifies the credential and completes authorization with `props: {email, name}`; `/token`, `/register` standard). `/ws` is routed **before** the provider — it would otherwise eat the WebSocket upgrade.

## 9. REST APIs (`/api/diagrams`, `/api/workspaces`) — FR-KE-24

CORS `*`; token via `?id_token=` or `Authorization: Bearer`. Diagrams: `GET` → `{email, diagrams, workspaces}` (migration runs first); `PATCH {id, ws}` → move (`""` = Personal); `DELETE ?id=` → destroy. Workspaces: `GET` list; `POST {name}` (≤ 40 chars, 8-char `randomUUID` id); `PATCH {id, name}` rename; `DELETE ?id=` — its diagrams are bulk-moved back to Personal.

## 10. MCP server (`KymoMCP`) — FR-KE-10

`McpAgent` subclass (`server = new McpServer({name:"kymostudio", version:"0.4.1"})`), identity from OAuth `props.email`. Five zod-typed tools, all owner-scoped, all linking back to `https://editor.kymo.studio/?d=<id>`:

| Tool | Behaviour |
|------|-----------|
| `new_diagram(title?, source?, kind?)` | 8-char id, seeds the room via `/set` (scaffold source if none), `touchIndex`, returns id + URL. |
| `list_diagrams()` | `listIndex`, most-recent first, with kind + updated-at. |
| `edit_diagram(source?, title?, id?, kind?)` | Targets `id` or the `last:<email>` pointer; partial `/set`; reports what changed + live-tab count. |
| `get_diagram(id?)` | Room `/get`; returns source + kind (or "(empty)"). |
| `delete_diagram(id)` | `destroyDiagram`; 403 surfaces as "isn't yours". |

## 11. Build & bundle (`build.sh`) — NFR-KE-03

`dist/` = `index.html` (+ a `diagrams.html` copy), `styles.css`, brand favicons, a Pages `_redirects` SPA rule (`/* /index.html 200`), and the esbuild output:

```bash
npx esbuild web/main.tsx --bundle --format=esm --splitting --outdir=dist \
  --loader:.wasm=binary --jsx=automatic --jsx-import-source=react \
  --target=es2022 --minify --entry-names="[name]" --chunk-names="chunks/[name]-[hash]"
```

`--splitting` + the dynamic `import("./engine")` put the wasm-bearing engine in its own `chunks/engine-<hash>.js`, loaded only on the editor route (`/diagrams` never pays for it); `--loader:.wasm=binary` inlines the wasm bytes into that chunk. A timestamp query (`?v=$(date +%s)`) is sed-ed onto the JS/CSS URLs — Pages serves assets with `max-age=14400`, so versioned URLs make every deploy take effect immediately.

## 12. Deploy (`deploy-editor.yml`) — NFR-KE-02

On push to `main` touching `packages/editor/{web/**,build.sh,package.json}`, `packages/js/**`, `packages/rust/kymostudio-core/**`, or the workflow (plus `workflow_dispatch`); `concurrency: editor-deploy` with cancel-in-progress:

1. **wasm core** — `wasm-pack build --target web … --features wasm` in `packages/rust/kymostudio-core`.
2. **`packages/js`** against the fresh core (`npm ci` + `npm install --no-save ../rust/kymostudio-core/pkg` + `npm run build`) — the published npm engine predates `flowchart{}`.
3. **Editor** — `npm install --no-package-lock` + `./build.sh`.
4. **Deploy** — `cloudflare/wrangler-action` → `pages deploy dist --project-name=kymo-editor --branch=main` (→ editor.kymo.studio).

The Worker deploys separately: `wrangler deploy` in `packages/mcp` (`wrangler.jsonc`: custom domain `mcp.kymo.studio`, DO bindings `KymoMCP`/`EditorRoom` with `new_sqlite_classes`, KV `OAUTH_KV`, D1 `kymo-editor`, vars `GOOGLE_CLIENT_ID`/`ALLOWED_EMAILS`, observability on).

---

## Annex A — Key decisions & ADR

- **ADR-1 — Render moved from server to client.** (v0.1, stands.) `466db60` (Pages Function) → `47ecb4c` (Hetzner Python) → `0860ace` (client wasm). No render service to operate (SN-KE-05); `packages/editor/README.md` remains superseded as architecture.
- **ADR-2 — ~~Single shared `"default"` room~~ → per-diagram owner-scoped rooms.** *(Superseded in v0.2, commits `334a8fb`/`5e8dd0d`.)* One DO per diagram id, bound to the first authenticated writer; the id's entropy (`newId(16)`, ≈ 95 bits) is the capability. The literal `"default"` room remains only as the no-`?d` fallback path in the Worker.
- **ADR-3 — ~~DO storage as the only persistence~~ → D1 as database of record, DO for live state.** *(Superseded in v0.2, commit `583520d`.)* DO storage still backs the live room across hibernation; D1 holds the queryable index + latest source snapshot (throttled upserts, flush on disconnect). A KV→D1 one-time migration covers pre-D1 users. Rationale: listing/search/workspace queries don't fit per-room KV/DO state.
- **ADR-4 — Echo suppression on both ends.** (v0.1, stands.) Server broadcasts all-but-sender *and* the client filters its own `origin`.
- **ADR-5 — wasm inlined, now into a split chunk.** *(Revised in v0.2.)* `--loader:.wasm=binary` still avoids a separate `.wasm` fetch/MIME config; `--splitting` + dynamic import confine the cost to the editor route (NFR-KE-03).
- **ADR-6 — Non-kymo kinds delegate to kroki.io.** *(New in v0.2, commit `7f76fd0`.)* 28 languages for the cost of one `fetch`; no engines to host or update (see `REF-KROKI-001`). Trade-offs accepted: availability coupling and source-privacy (the text is POSTed to a third party) — risks R6 in `PLAN-KEDITOR-001`. Self-hosting kroki is the documented escape hatch.
- **ADR-7 — The Google ID token is the only client credential.** *(New in v0.2.)* No session cookies or backend session store: the GIS JWT rides every WS/REST call and is JWKS-verified server-side; MCP wraps the same identity in OAuth. Cheap and stateless; the trade-off (token in query strings → logs) is risk R9.
- **ADR-8 — Lazy room creation.** *(New in v0.2, commit `335e7b3`.)* + New navigates to a fresh id without creating server state; the row/room materialise on first write (and `assignWorkspace` can pre-create the row for workspace placement). Abandoned "new" clicks cost nothing.
- **ADR-9 — Third-party SVG is sanitized with DOMPurify.** *(New in v0.3, commits `51d08ec`/`a5ff7b5` — documents `FR-RD-09`.)* A `?s=` share link carries arbitrary source, so the SVG kroki.io renders from it is **attacker-controllable markup** headed for `dangerouslySetInnerHTML`. `sanitizeSvg` strips scripts, event handlers, and `javascript:` URLs (`USE_PROFILES: svg+svgFilters+html`) while **keeping `foreignObject`**: Mermaid's `htmlLabels` put every node/edge label in HTML inside one, so dropping it (DOMPurify's default — `foreignObject` is not an HTML integration point) would blank Mermaid diagrams; instead `HTML_INTEGRATION_POINTS` is extended so its content is sanitized with the html profile. Trade-offs accepted: `dompurify` becomes a runtime dependency of `packages/editor` (the engine in `packages/js` stays dependency-free), and trusted kymo output skips the pass (engine-escaped, no third party involved).

## Annex B — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial design. Documents the client render path, esbuild static build, Cloudflare Pages deploy workflow, the WebSocket live-sync protocol + `EditorRoom` DO, and the `KymoMCP` MCP server/routing — all grounded in the shipped tree. ADRs record the server→client migration and the single-room/DO-storage choices. |
| 0.2     | 2026-06-12 | Vũ Anh | **Re-baseline for the React-SPA product** (P4–P9): module map for `web/` (replaces the `app.js` walkthrough), render orchestration (per-kind debounce + stale-response guard), CodeMirror integration, splitter, the kroki-compatible share codec + address-bar sync, the per-diagram room protocol (`doc`/`meta`/`set`/`rename`, owner binding, no timed reconnect), D1 schema + upsert cadence + KV→D1 migration, GIS/JWKS auth + OAuth-gated MCP, REST APIs, the five per-user MCP tools, code-split build with cache-busting, and the two-target deploy. ADR-2/3 superseded (per-diagram rooms; D1 of record); ADR-5 revised (split chunk); ADR-6/7/8 added (kroki delegation, ID-token-only auth, lazy room creation). |
| 0.3     | 2026-06-12 | Vũ Anh | **Kroki-integration reconciliation (docs-only).** §3 now documents the **`sanitizeSvg` (DOMPurify) pass** on the kroki render path before `dangerouslySetInnerHTML` (with the §2 `kroki.ts` row updated) and **ADR-9** records the decision (strip scripts/handlers/`javascript:`; keep `foreignObject` for Mermaid `htmlLabels` via `HTML_INTEGRATION_POINTS`; `dompurify` accepted as an editor runtime dep) — shipped in `51d08ec`/`a5ff7b5`, previously undocumented; the requirement is `FR-RD-09` (`FEAT-KRENDER-001` v0.2). §5 Share bullet re-baselined to the shipped popover (auto-copy on open, copy variants incl. the kroki.io GET image URL, > 2 000-char warning — `FR-SH-03`, `FEAT-KSHARE-001` v0.2). |

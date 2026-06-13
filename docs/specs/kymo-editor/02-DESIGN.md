---
title: Kymo Editor (editor.kymo.studio) — Design
document_id: DESIGN-KEDITOR-001
version: "0.5"
issue_date: 2026-06-13
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
  - FEAT-KRAPI-001
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
  - render-api
  - mermaid-wasm
  - folder-tree
  - trash
  - soft-delete
  - drafts
  - thumbnails
  - vscode-shell
  - zoom-pan
---

# Kymo Editor (editor.kymo.studio) — Design

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `DESIGN-KEDITOR-001` |
| Version           | 0.5 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (requirements), `TEST-KEDITOR-001` (V&V), `PLAN-KEDITOR-001` (plan/why), `FEAT-FLOWCHART-001` (the native DSL), `FEAT-KYMOJSON-001` (the engine reused unchanged), `FEAT-KRAPI-001` (the render.kymo.studio Worker), `REF-KROKI-001` (the upstream render gateway, now a fallback) |

> **The *how* that complements `FEAT-KEDITOR-001`.** kymo-editor adds **almost no renderer** — kymo kinds reuse the `kymostudio` JS engine + `kymostudio-core` wasm unchanged; **Mermaid renders in-browser** (the `kymo-mermaid` *merman* wasm slice for plain flowcharts, `mermaid.js` otherwise); every other kind delegates to **render.kymo.studio** (`FEAT-KRAPI-001`, which itself falls back to kroki.io). What this design owns: (a) a React SPA (now a VSCode-style shell with a folder tree, template gallery, draft-first authoring, Trash, and a zoom/pan preview), (b) a static build/deploy, (c) the `kymo-mcp` Worker (per-diagram rooms, D1 store with folders + soft-delete, REST APIs incl. Trash, a daily purge cron, OAuth-gated MCP). File references are to the shipped tree: `packages/editor/web/*.tsx|ts`, `packages/editor/build.sh`, `.github/workflows/deploy-editor.yml`, `packages/mcp/src/index.ts`, `packages/mcp/wrangler.jsonc`. **v0.5 reconciles this design to the 2026-06-13 product**; the in-browser-Mermaid + render.kymo.studio render path, folder tree, Trash, drafts, shell, zoom, and thumbnails are new since v0.4 (ADR-11..18).

---

## 1. Scope & architecture

```
┌────────────────────────────────────────┐  wss /ws?d=<id> ┌────────────────────────────────────────────┐
│ editor.kymo.studio (CF Pages)          │ set/doc/        │ kymo-mcp Worker — mcp.kymo.studio          │
│ packages/editor/web (React SPA)        │◀───────────────▶│                                            │
│  VSCode shell: activity bar +          │  rename/meta    │  EditorRoom DO (one per diagram id)        │
│   Explorer(folder tree)/Search/Templates│                 │   • source/title/kind/owner/thumb (DO)     │
│  routes: / · /diagrams · /trash · /login│  REST /api/*    │   • WebSocket fan-out, echo-suppress       │
│  kymo render: kymostudio-core wasm(lazy)│◀───────────────▶│   • D1 snapshot upsert (throttled)+thumb   │
│  mermaid: kymo-mermaid wasm / mermaid.js│                 │  /api/diagrams · /api/workspaces(folders)  │
│  preview: pan/zoom · draft-first save   │                 │  /api/trash(restore/purge) · /…/thumb ─▶ D1│
│  share codec: ?s= deflate+b64url        │                 │  KymoMCP (McpAgent): 5 per-user tools      │
└──────────┬──────────────────────────────┘                │  OAuthProvider: /authorize /token /reg.    │
           │ POST /<kind>/svg (+Bearer)                     │  cron 0 3 * * * → purge >30d soft-deleted  │
           ▼                                                └───────────────┬────────────────────────────┘
  render.kymo.studio Worker (FEAT-KRAPI-001)                                ▼
   • edge render + kroki.io fallback + cache         MCP host (Claude) ── /mcp (Streamable HTTP) · /sse
  jsDelivr CDN (icon art)
```

The engine (`packages/js`, `packages/rust/kymostudio-core`) and the Mermaid wasm slice (`packages/rust/kymo-mermaid`) are reused **unchanged**. Non-kymo, non-Mermaid kinds are POSTed to **render.kymo.studio** (`FEAT-KRAPI-001`) — a separate deployable, not part of this design — with the Google ID token as a `Bearer` (for the higher signed-in rate tier) and a transparent fallback to kroki.io on a render-Worker 5xx/network error. State of record: Durable Object storage for the live room, **D1** (`kymo-editor` database: `diagrams`, `workspaces` — both now carrying `parent_id`/`deleted`/`thumb` columns, §7) for the queryable index + latest snapshot + thumbnail, KV (`OAUTH_KV`) for OAuth state, the `last:<email>` most-recent pointer, and legacy-migration flags. A daily **cron** purges soft-deleted rows older than 30 days.

## 2. Client app structure (`packages/editor/web/`)

`main.tsx` mounts `BrowserRouter > AuthProvider > WorkspaceProvider > ConfirmProvider > Routes` with **four** routes: `/` → `EditorPage`, `/diagrams` → `DiagramsPage`, `/trash` → `TrashPage`, `/login` → `LoginPage`.

| Module | Responsibility |
|--------|----------------|
| `EditorPage.tsx` | The editor route: URL-mode resolution (`?d`/`?s`/`?k` + draft), render orchestration + debounce + auto-detect, room wiring, **draft-first save** (`save()` mints an id and promotes a draft to a room — FR-LV-08), header chrome (folder switcher, rename, account, + New → template gallery, Share, Export), the VSCode shell wiring, pane splitter, boot loader, Share-open cache warm-up (§5). |
| `DiagramsPage.tsx` | The library route: owner's list (sorted by `updatedAt` desc), search filter, move/delete per row (soft delete via the confirm modal), **thumbnails**, refresh on focus/visibility, relative timestamps, kind badges; 401 → `expireSession()` → `/login`. |
| `sidebar.tsx` | The **VSCode-style shell** (FR-LB-06): the activity bar (Explorer / Search / Templates + account/settings footer) and its panels — `ExplorerPanel` (recursive folder tree: expand/collapse, drag-to-move, context menu New-subfolder/Rename/Delete; draggable diagram rows), `SearchPanel` (live title filter), `TemplatesPanel` (filterable type list). Panel + expansion state in `localStorage` (`kymo_panel`, `kymo_expanded`). |
| `templates.tsx` | The **template gallery** (FR-LB-02): `TEMPLATES` (≈ 28 diagram types, each `{name, kind, via, glyph, source}`), the modal (filter box, grid), and the `pendingTemplate` hand-off into a fresh `/` draft. |
| `preview.tsx` | The **zoom/pan preview** (FR-RD-11): `dangerouslySetInnerHTML` of the SVG in a `translate()/scale()` layer; wheel/pinch zoom (0.1×–8×), drag-pan, fit-to-view on `fitKey` change (`<d|"shared">:<kind>`) + `ResizeObserver` re-fit, controls cluster (±20 %, %, Fit; double-click toggles fit↔100 %). |
| `confirm.tsx` | `ConfirmProvider`/`useConfirm` — a promise-based styled confirm modal (Esc cancels, Enter confirms, danger styling) replacing `window.confirm` across delete flows. |
| `detect.ts` | `sniffKind(text)` (FR-RD-10): ordered heuristics (BPMN XML, PlantUML `@start…`, JSON diagram shapes, kymo `flowchart …{`, GraphViz, Mermaid headers/`%%{`, BlockDiag family, DBML, Structurizr, D2) returning a kind or `null`. |
| `mermaid.ts` | **In-browser Mermaid** (FR-RD-05 revised, ADR-12): `renderMermaid(source)` routes plain `flowchart`/`graph` (no directives) to the `kymo-mermaid` wasm slice (a *merman* port, pinned to `mermaid@~11.15` parity) and everything else to a prebundled `mermaid.js` (`securityLevel:"strict"`); a 900 ms early-response race (`EARLY_WINDOW_MS`) adopts a warm share-link render before falling back to local. |
| `codeeditor.tsx` | CodeMirror 6 wrapper — FR-KE-15: extension set (line numbers, active line, history, bracket matching, `indentWithTab`, line wrapping), a brand-palette theme, per-kind language via a `Compartment` (generic keyword-parameterised `StreamLanguage` for DSL-ish kinds; `json`/`xml`/legacy `yaml`/`clojure`/`stex`/`verilog` for the rest), `applyingExternal` flag so external `value` swaps don't echo as user edits, and an `onPaste(text, fullReplace)` hook feeding the auto-detect (FR-RD-10). |
| `engine.ts` | The lazy kymo render path — FR-KE-01 (revised as `FR-RD-01` v0.3): `init(wasmUrl)` once, `setManifest`, `setIconBaseURL(jsDelivr)`, exports `renderDiagram = renderSVG ∘ parseDiagram`. Reached only via `import("./engine")` from `loadEngine()` on the **first kymo render** — non-kymo sessions never fetch the chunk. |
| `kroki.ts` | `KINDS` (kymo + 28 non-kymo kinds), `kindLabel`, `renderKroki(kind, source)` = `POST {RENDER_API}/<kind>/svg` (render.kymo.studio, `Bearer` ID token when present) **with a kroki.io fallback** on a 5xx/network error — FR-KE-13/`FR-RD-05`; `earlyResponse` adoption for warm share links. Also `sanitizeSvg` (DOMPurify) — the third-party-SVG hygiene of `FR-RD-09` (see §3 and ADR-9). |
| `samples.ts` | Per-kind starter sources — FR-KE-14. |
| `share.ts` | The share codec + `shareUrl` — FR-KE-25 (see §5). |
| `room.ts` | `useRoom(roomId, idToken, handlers)` — the WebSocket hook (see §6). |
| `auth.tsx` | GIS integration — FR-KE-17: idempotent `initialize`, `kymo_idtoken` storage, `tokenValid` (exp − 30 s), `signOut`, `claims` parsed client-side, `GoogleButton`, avatar `colorFor`, plus **`expireSession()`** + an expiry **watchdog timer** that clears the token ~30 s before `exp` and re-prompts (FR-LV-10, ADR-18). |
| `LoginPage.tsx` | The `/login` route (FR-LV-10): a sign-in panel that auto-prompts One Tap and, on `claims`, navigates to a same-app `?next=` (default `/diagrams`). |
| `TrashPage.tsx` | The `/trash` route (FR-LB-08): merged soft-deleted diagrams + folders sorted by `deletedAt`, per-item Restore / Delete-forever, Empty-trash, the "purged after 30 days" note; drives `/api/trash`. |
| `workspace.tsx` | `WorkspaceProvider`/`useWorkspace` — the **folder tree** (FR-KE-23/`FR-LB-04`): the `Folder` type + tree helpers (`childFoldersOf`, `folderPath`, `descendantFolderIds`, `flattenTree`, client-side `wouldCycle`), CRUD/move against `WORKSPACES_API`, `kymo_folder` persistence, fall-back-to-root on dangling id, `assignDiagram` (fire-and-forget PATCH), `WorkspaceSwitcher` (folder-path breadcrumb dropdown). |
| `const.ts` | Endpoints (`MCP_WS`, `DIAGRAMS_API`, `WORKSPACES_API`, `TRASH_API` — all mcp.kymo.studio; `RENDER_API` = `https://render.kymo.studio`), `GOOGLE_CLIENT_ID`, the default kymo `SAMPLE`. |
| `util.ts` | `newId(16)` — base62, ≈ 95 bits (the id is the room capability — FR-KE-21); `titleFrom(source)` — first node label, ≤ 60 chars (FR-KE-08). |
| `index.html` / `styles.css` | Single HTML shell (GIS script tag, Inter + JetBrains Mono), CSS-variable design system on the brand palette. Carries a `preconnect` to render.kymo.studio and the **early render kick-off** inline script: on a `?k=…&s=…` URL (no `?d`, kind ≠ kymo, `DecompressionStream` available) it decodes the payload and fires the `render.kymo.studio` POST (with the `kymo_idtoken` `Bearer` if present) **before the bundle downloads**, parking the promise on `window.__earlyKroki` for `renderKroki` / `renderMermaid` to adopt (§3). |

**URL modes** (resolved in `EditorPage`): `?d=<id>` → room mode (precedence over `?s`); `?s=<payload>[&k=<kind>]` → share mode; neither + signed in **with** diagrams → redirect to the most-recent diagram id via `replace` navigation; neither (signed out, or signed in with none, or a freshly-picked template) → a **draft** — local editing with no server document, the URL kept a working `?s=` link (FR-SH-02) until **Save** promotes it (`save()` → `newId()`, `pendingImport` carries source/kind/title, `assignDiagram` places it in the current folder, navigate to `?d=`). A picked template arrives via a module-level `pendingTemplate`/`pendingImport` hand-off consumed by the `?d`-change effect. Per-room state (source/kind/title/flags) resets on `?d` change; a 5 s `syncing` failsafe holds the boot loader between "room requested" and "first doc". Auth-walled fetches that 401 call `expireSession()` and route to `/login?next=<path>` (§8).

## 3. Render orchestration (`EditorPage.doRender`) — FR-KE-01/02/05

One debounced effect re-renders and (in room mode) pushes the source: **120 ms** for kymo, **450 ms** for non-kymo kinds; the **first render of a session fires immediately** (no debounce — ADR-10). `doRender` routes by kind (v0.5, ADR-11/12):

- **kymo** → `renderRef.current` (the lazily imported `engine.ts`), injected as-is (trusted local engine).
- **mermaid** → `renderMermaid` (`mermaid.ts`): in-browser, plain `flowchart`/`graph` via the `kymo-mermaid` wasm slice, every other Mermaid grammar via `mermaid.js`; output sanitized.
- **any other kind** → `renderKroki` (`kroki.ts`): `POST {RENDER_API}/<kind>/svg` to **render.kymo.studio** with the `kymo_idtoken` `Bearer` when present, transparently **falling back to `kroki.io`** on a render-Worker 5xx/network error; output sanitized.

Async completion is guarded by a **sequence counter** (`renderSeq`): a response older than the latest request is dropped, so a slow render can never paint over a newer one. The mermaid and render.kymo.studio paths pass the SVG through **`sanitizeSvg` (DOMPurify) before it reaches `dangerouslySetInnerHTML`** — it is third-party / engine markup rendered from possibly-untrusted `?s=` source (`FR-RD-09`, ADR-9); kymo output is injected as-is. **Status line** (v0.5): success writes the plain word **`Rendered`** with the `<bytes> bytes · <ms> ms` detail on its hover `title`; failure writes the message in error state; the bar prefixes `⚡` while the room socket is live. **Paste auto-detect** (FR-RD-10): `codeeditor.tsx` reports a full-buffer paste (`onPaste(text, fullReplace)`); on `fullReplace`, `sniffKind(text)` (`detect.ts`) may switch the kind and surface a transient "auto-detected …" chip (~4 s).

**Share-link first load** (`ef02c04`, ADR-10): the first render of a session skips the debounce; a `?s=` link seeds `kind`/`source` at mount (the cycle never touches the kymo sample); the kymo engine chunk loads via `loadEngine()` on the **first kymo render only** — a Mermaid/other-kind share link never pays for the 2.5 MB kymo wasm (a Mermaid link instead pulls the smaller `kymo-mermaid` slice / `mermaid.js` for the in-browser render); and `renderKroki`/`renderMermaid` first check **`window.__earlyKroki`** — the **render.kymo.studio** POST the HTML shell fired pre-bundle — adopting the in-flight response when kind+source match exactly (single use; for Mermaid the adoption races a 900 ms window before falling back to the local render; mismatch leaves it for a later render; a dead warm-up falls back to a fresh request). The adopted response flows through the same `sanitizeSvg` pass.

## 4. Pane splitter — FR-KE-16

Pointer-captured drag on the divider sets the source-pane flex basis in % (clamped 15–85), `localStorage.kymo_split` persists on pointer-up, double-click resets 50/50. A `body.splitting` class disables text selection during the drag.

## 5. Share codec (`share.ts`) — FR-KE-25..27

- **Encode:** UTF-8 → `CompressionStream("deflate")` (zlib wrapper — the same "deflate" kroki uses) → `btoa` → base64url (`+`→`-`, `/`→`_`, `=` padding stripped).
- **Decode:** the inverse via `DecompressionStream`; failures surface as a status error ("Link share không hợp lệ").
- **URL shape:** `shareUrl()` = `/?s=<payload>` for kymo, `/?k=<kind>&s=<payload>` otherwise. Payloads are **interchangeable with kroki.io GET URLs** in both directions (NFR-KE-07).
- **Address-bar sync** (FR-KE-26): when no room is active and the user has actually edited (or arrived via `?s=`), a 300 ms-debounced `history.replaceState` rewrites the URL — the address bar is always a working share link. Loading a `?s=` link sets `userEdited` so subsequent edits keep syncing; `?d` suppresses the whole path.
- **Share popover** (FR-KE-27, re-baselined as `FR-SH-03` in `FEAT-KSHARE-001`): opening Share encodes the payload and **auto-copies the link** (`navigator.clipboard.writeText`, `window.prompt` fallback); the popover offers the URL in a select-on-focus field + Copy, a truncation warning when the link exceeds 2 000 chars, **Copy Markdown link**, and — non-kymo kinds — **Copy Markdown image**: a **render.kymo.studio GET** URL (`https://render.kymo.studio/<kind>/svg/<payload>`) reusing the same `?s=` payload (the `NFR-SH-01` interchange — render.kymo.studio accepts the kroki GET encoding). Per-variant 1.6 s "Copied" state. *(v0.5: opening Share also fires a fire-and-forget warm-up POST of the current kind+source to render.kymo.studio (`warmedShare` dedupe), so the recipient's first paint and GitHub's image fetch hit a warm content-hash cache.)*

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

`webSocketMessage` handles browser frames: `set` persists source (+ kind) and broadcasts to **all-but-sender** (echo suppression server-side, complementing the client origin check — FR-KE-07); `rename` persists + broadcasts `meta`. **D1 upsert cadence** (FR-KE-09/NFR-KE-04): immediately on rename, kind change, and `/set`; throttled to ≥ 30 s during typing (`lastIdx`); flushed in `webSocketClose`. Each upsert also refreshes a **thumbnail** (`thumbFor`): the room POSTs the source to **render.kymo.studio**, memoizes by source (`lastThumbSrc`, skipped on rename-only), and stores the SVG in the `thumb` column when ≤ 40 KB (FR-LB-07).

**Drafts (FR-LV-08).** A draft has **no room and no socket** — nothing reaches `EditorRoom` until the user Saves. Save mints the id and seeds the new room on first write, so the lazy-seed + auto-title rules above run exactly as for a `+ New` room.

## 7. Persistence — D1 schema & index

D1 database `kymo-editor` (binding `DB`), provisioned out-of-band (no migration file in-tree — schema below is the observed shape used by every query; the newer columns are added at runtime by idempotent `ensure*Column()` helpers that swallow duplicate-column errors and guard with an in-memory flag — risk R8):

```sql
diagrams  (id TEXT PRIMARY KEY, owner TEXT, title TEXT, kind TEXT,
           ws TEXT,            -- parent folder id ("" = root); the diagram's place in the tree
           source TEXT, updated_at INTEGER,
           thumb TEXT,         -- v0.4: cached SVG thumbnail (ensureThumbColumn)
           deleted INTEGER)    -- v0.4: soft-delete timestamp, NULL = live (ensureDeletedColumn)
workspaces(id TEXT, owner TEXT, name TEXT, created_at INTEGER,
           parent_id TEXT,     -- v0.4: parent folder id ("" / NULL = root) → the folder TREE (ensureFolderColumn)
           deleted INTEGER)    -- v0.4: soft-delete timestamp (ensureDeletedColumn)
```

The `workspaces` table is the **folder tree** (the UI calls them folders); a diagram's `ws` is its parent folder. Helper layer in `src/index.ts`:

- **Index/most-recent:** `listIndex` (owner's **live** rows — `deleted IS NULL` — `updated_at` desc, exposing `hasThumb`), `touchIndex` (upsert metadata + bump `last:<email>` KV pointer used by FR-KE-10/21), `removeFromIndex`.
- **Folders:** `listWorkspaces` (live folders), `assignWorkspace` (move a diagram; creates the row if not yet indexed — supports + New / Save pre-placement), `wouldCycle` (walks `parent_id` to reject a re-parent that would form a cycle).
- **Soft delete / Trash / purge:** `destroyDiagram` = **soft** delete (`deleted = Date.now()`, owner-checked); a folder delete cascades the timestamp to the folder's whole subtree (descendant folders + their diagrams); the Trash restore re-homes a restored folder to root if its parent is gone; `hardDeleteDiagram` (room `/destroy` then row delete) and `purgeOldDeleted(env, cutoff)` (hard-delete rows with `deleted < cutoff`) are the permanent path — the latter is the daily cron's worker (`cutoff = now − 30 days`).
- **Migration:** `migrateKvToD1` runs once per user (guarded by a `d1done:<email>` KV flag) and folds the legacy KV layout (`idx:*`, `wss:*`, `wsmap:*`, room sources) into D1.

## 8. Accounts & authorization

- **Browser sign-in (`auth.tsx`)**: GIS One Tap + rendered button; the ID token (a Google JWT) is the *only* client credential — stored in `localStorage.kymo_idtoken`, discarded when `exp` is within 30 s, parsed client-side for display claims only. **Session expiry (FR-LV-10, ADR-18):** a **watchdog timer** fires ~30 s before `exp`, calling `expireSession()` (clear the token, re-`prompt()` — unlike `signOut`, which also disables auto-select) so a stale token is gone *before* it can 401; auth-walled routes (`/diagrams`, `/trash`) that still hit a 401 call `expireSession()` and redirect to **`/login?next=<path>`** (`LoginPage` auto-prompts One Tap and returns to `next` on sign-in).
- **Server verification**: every `/ws` connect and `/api/*` call verifies the token with `jose` against Google's remote JWKS (issuer `accounts.google.com`, audience = `GOOGLE_CLIENT_ID`); `ALLOWED_EMAILS` (CSV var, empty = open) gates accounts. Identity = verified `email` (NFR-KE-06).
- **Ownership**: rooms bind to the first authenticated writer; D1 queries are always `WHERE owner = ?`; MCP tools act as the OAuth session's `email`.
- **MCP OAuth (`OAuthProvider`)**: `/mcp` + `/sse` are wrapped by `@cloudflare/workers-oauth-provider` (`/authorize` serves a GIS login page whose POST verifies the credential and completes authorization with `props: {email, name}`; `/token`, `/register` standard). `/ws` is routed **before** the provider — it would otherwise eat the WebSocket upgrade.

## 9. REST APIs (`/api/diagrams`, `/api/workspaces`) — FR-KE-24

CORS `*`; token via `?id_token=` or `Authorization: Bearer`; every query is owner-scoped. **Diagrams** (`/api/diagrams`): `GET` → `{email, diagrams, workspaces}` (live rows only; migration runs first); `PATCH {id, ws}` → move to folder (`""` = root); `DELETE ?id=` → **soft** delete. **Diagram thumbnail** (`/api/diagrams/thumb?id=`): `GET` → the cached `thumb` SVG (FR-LB-07). **Workspaces / folders** (`/api/workspaces`): `GET` list (live); `POST {name, parentId?}` create a (possibly nested) folder (name ≤ 40 chars, `randomUUID`-derived id); `PATCH {id, name?, parentId?}` rename and/or **reparent** (`parentId:""` = root; server-side `wouldCycle` rejects a cycle); `DELETE ?id=` → **soft-delete the folder and its entire subtree** (descendant folders + their diagrams). **Trash** (`/api/trash`, FR-LB-08): `GET` → `{diagrams, folders}` soft-deleted, newest first; `POST {kind:"diagram"|"folder", id}` → restore (a folder restores its subtree, re-homed to root if its parent is gone); `DELETE ?id=&kind=` → permanently purge one; `DELETE ?all` → purge all the user's soft-deleted items.

## 10. MCP server (`KymoMCP`) — FR-KE-10

`McpAgent` subclass (`server = new McpServer({name:"kymostudio", version:"0.4.1"})`), identity from OAuth `props.email`. Five zod-typed tools, all owner-scoped, all linking back to `https://editor.kymo.studio/?d=<id>`:

| Tool | Behaviour |
|------|-----------|
| `new_diagram(title?, source?, kind?)` | 8-char id, seeds the room via `/set` (scaffold source if none), `touchIndex`, returns id + URL. |
| `list_diagrams()` | `listIndex`, most-recent first, with kind + updated-at. |
| `edit_diagram(source?, title?, id?, kind?)` | Targets `id` or the `last:<email>` pointer; partial `/set`; reports what changed + live-tab count. |
| `get_diagram(id?)` | Room `/get`; returns source + kind (or "(empty)"). |
| `delete_diagram(id)` | `destroyDiagram` — a **soft** delete (moves to Trash, recoverable for 30 days), same as the browser; 403 surfaces as "isn't yours". |

## 11. Build & bundle (`build.sh`) — NFR-KE-03

`dist/` = `index.html` (+ a `diagrams.html` copy), `styles.css`, brand favicons, a Pages `_redirects` SPA rule (`/* /index.html 200`), and the esbuild output:

```bash
npx esbuild web/main.tsx --bundle --format=esm --splitting --outdir=dist \
  --loader:.wasm=binary --jsx=automatic --jsx-import-source=react \
  --target=es2022 --minify --entry-names="[name]" --chunk-names="chunks/[name]-[hash]"
```

`--splitting` + the dynamic `import("./engine")` put the wasm-bearing kymo engine in its own `chunks/engine-<hash>.js`, loaded only on a kymo render (`/diagrams` and non-kymo sessions never pay for it); `--loader:.wasm=binary` inlines the wasm bytes into that chunk. The **Mermaid** paths are likewise split: a `mermaid.js` chunk (a single flattened, prebundled ESM vendor file) and the smaller `kymo-mermaid` wasm slice load only when a Mermaid diagram first renders — neither is fetched on a kymo or render.kymo.studio-kind session. Post-build (`ef02c04`): a `_headers` rule serves `chunks/*` (content-hashed names) as `max-age=31536000, immutable`; `<link rel="modulepreload">` is injected for `main.js`'s statically-imported shared chunks (never the engine chunk — share links must not preload the wasm), removing a serial network hop; and the JS/CSS URLs are versioned by a **content hash** (`?v=<md5(main.js+styles.css)>`) — Pages serves entries with `max-age=14400`, so a deploy that changes a file takes effect immediately while unchanged deploys keep every client's cache.

## 12. Deploy (`deploy-editor.yml`) — NFR-KE-02

On push to `main` touching `packages/editor/{web/**,build.sh,package.json}`, `packages/js/**`, `packages/rust/kymostudio-core/**`, or the workflow (plus `workflow_dispatch`); `concurrency: editor-deploy` with cancel-in-progress:

1. **wasm core** — `wasm-pack build --target web … --features wasm` in `packages/rust/kymostudio-core`.
2. **`packages/js`** against the fresh core (`npm ci` + `npm install --no-save ../rust/kymostudio-core/pkg` + `npm run build`) — the published npm engine predates `flowchart{}`.
3. **Editor** — `npm install --no-package-lock` + `./build.sh`.
4. **Deploy** — `cloudflare/wrangler-action` → `pages deploy dist --project-name=kymo-editor --branch=main` (→ editor.kymo.studio).

The Worker deploys separately: `wrangler deploy` in `packages/mcp` (`wrangler.jsonc`: custom domain `mcp.kymo.studio`, DO bindings `MCP_OBJECT`→`KymoMCP` / `EDITOR_ROOM`→`EditorRoom` with `new_sqlite_classes`, KV `OAUTH_KV`, D1 `kymo-editor`, vars `GOOGLE_CLIENT_ID`/`ALLOWED_EMAILS`, **`triggers.crons: ["0 3 * * *"]`** for the daily Trash purge, observability on). The **render.kymo.studio** Worker (`packages/render-api`, `FEAT-KRAPI-001`) is a **third deployable** with its own workflow — out of scope here.

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
- **ADR-10 — A share link's first paint must not wait for the bundle.** *(New in v0.4, commit `ef02c04`.)* Cold-loading a kroki share link on 4G spent ~4.3 s mostly on things the page never uses. Three moves cut it to ~2.4 s: the wasm engine loads on **first kymo render** instead of editor mount (revising ADR-5's "loads on the editor route" — a Mermaid link never fetches it); an **inline script in the HTML shell** fires the render POST while the bundle is still downloading (`window.__earlyKroki`, adopted on exact match — behaviour-preserving: same request, same sanitization); and caching moved from per-deploy timestamps to **content hashes** + immutable chunk headers + modulepreload. Trade-offs accepted: the share-codec decode logic is duplicated in the inline script (drift risk — kept tiny and matching `share.ts`), and first-load numbers are tracked by an **online** bench snapshot (`benches/editor`), not a CI gate.
- **ADR-11 — Non-kymo rendering delegates to render.kymo.studio, not kroki.io directly.** *(New in v0.5, commits `bfc287c`/`d60cfd0`/`07f7d9a`.)* The public kroki.io is one origin with a queue and bad days, and source POSTed to it leaves the device. The editor now POSTs to the **render.kymo.studio** Worker (`FEAT-KRAPI-001`) — edge-local rendering for the kinds whose engines run in `workerd`, content-hash caching, and **kroki.io only as an internal fallback**. The editor attaches the Google ID token as a `Bearer` so the render Worker can apply the higher signed-in rate tier. Client-side, `renderKroki` itself also falls back to kroki.io on a render-Worker 5xx/network error (belt-and-braces). Trade-off: a third deployable to operate (but it's `FEAT-KRAPI-001`'s concern). **The `kymo-mcp` Worker's own earlier `/api/render` kroki-caching proxy (`d60cfd0`) is superseded by this and slated for removal** (risk R14).
- **ADR-12 — Mermaid renders in-browser (merman wasm + mermaid.js), kroki demoted to warm-up.** *(New in v0.5, commits `9b9fb62`/`9059021`/`a919cbc`/`4f544ac`.)* Mermaid is the most-used non-kymo kind, and kroki renders it through a puppeteer-driven headless Chrome (~2.5 s, network-bound). The editor now renders it client-side: a **Rust slice of *merman*** (`kymo-mermaid` wasm, pinned to `mermaid@~11.15` parity) for plain `flowchart`/`graph` sources, the full **`mermaid.js`** bundle (`securityLevel:"strict"`) for every other grammar (and as the slice's fallback). For a share link, a 900 ms **early-response race** adopts a warm render.kymo.studio result if it answers first, else the local path wins. Trade-offs: two Mermaid code paths to keep at parity, and a version pin coupling `kymo-mermaid` to `mermaid@11.15`. Mermaid now works **fully offline**.
- **ADR-13 — Flat workspaces → a nested folder tree.** *(New in v0.5, commit `c5bbc7e`.)* A flat list doesn't scale. The `workspaces` table gained a `parent_id` (added by an idempotent runtime migration), making it a tree; diagrams point at a parent folder via `ws`. Re-parenting is **cycle-safe** on both ends (`wouldCycle` client + server). The table keeps the name `workspaces` for migration continuity even though the UI calls them folders. Trade-off: schema still provisioned out-of-band (R8), now with more columns.
- **ADR-14 — Deletes are soft, with a Trash and a 30-day purge cron.** *(New in v0.5, commits `effd174`/`e0e6f73`.)* An immediate destroy is unforgiving. Delete now stamps a `deleted` timestamp (cascading to a folder's subtree); `/trash` lists/restores/purges; a Cloudflare **cron `0 3 * * *`** hard-deletes rows older than 30 days (`purgeOldDeleted`). A styled `confirm.tsx` modal replaces `window.confirm`. Trade-off: soft-deleted rows linger in D1 for up to 30 days.
- **ADR-15 — Draft-first authoring.** *(New in v0.5, commits `3ddfc92`/`aaafc69`/`992e1bd`.)* Creating a server room on every `+ New` litters the library with empty diagrams. A picked template or `/` visit is now a **draft** — no room, no socket, the URL carrying it as `?s=` — promoted to a saved, folder-placed document only on explicit **Save** (which mints the id and seeds the room). Extends ADR-8's lazy-room idea to the pre-room phase. Trade-off: a draft isn't autosaved or live until saved (the "Unsaved" indicator makes this explicit).
- **ADR-16 — A VSCode-style shell.** *(New in v0.5, commits `b38904d`/`d7bed20`.)* The folder tree, search, and template gallery needed a home. An **activity bar** toggles **Explorer / Search / Templates** panels (+ account/settings footer); state persists in `localStorage` (`kymo_panel`, `kymo_expanded`); the shell collapses on mobile. The header navbar was restructured around this hierarchy (`127d68a`, `2e80d9d`).
- **ADR-17 — Library thumbnails are rendered server-side by the room.** *(New in v0.5, commit `744acf2`.)* A text list is hard to scan. On each D1 upsert the `EditorRoom` POSTs the source to render.kymo.studio and caches the SVG in a `thumb` column (≤ 40 KB, memoized by source); the library/Search panel show it via `/api/diagrams/thumb`. Trade-off: an extra render per save (deduped by source, capped by size).
- **ADR-18 — Proactive session-expiry watchdog + `/login`.** *(New in v0.5, commit `c83aa75`.)* A 1-hour Google ID token used to fail silently mid-session. A **watchdog timer** now clears the token ~30 s before `exp` and re-prompts; auth-walled routes that still 401 redirect to a dedicated **`/login?next=…`**. Trade-off: a timer per session; the token is still bearer-in-query on the WS handshake (R9, unchanged).

## Annex B — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial design. Documents the client render path, esbuild static build, Cloudflare Pages deploy workflow, the WebSocket live-sync protocol + `EditorRoom` DO, and the `KymoMCP` MCP server/routing — all grounded in the shipped tree. ADRs record the server→client migration and the single-room/DO-storage choices. |
| 0.2     | 2026-06-12 | Vũ Anh | **Re-baseline for the React-SPA product** (P4–P9): module map for `web/` (replaces the `app.js` walkthrough), render orchestration (per-kind debounce + stale-response guard), CodeMirror integration, splitter, the kroki-compatible share codec + address-bar sync, the per-diagram room protocol (`doc`/`meta`/`set`/`rename`, owner binding, no timed reconnect), D1 schema + upsert cadence + KV→D1 migration, GIS/JWKS auth + OAuth-gated MCP, REST APIs, the five per-user MCP tools, code-split build with cache-busting, and the two-target deploy. ADR-2/3 superseded (per-diagram rooms; D1 of record); ADR-5 revised (split chunk); ADR-6/7/8 added (kroki delegation, ID-token-only auth, lazy room creation). |
| 0.3     | 2026-06-12 | Vũ Anh | **Kroki-integration reconciliation (docs-only).** §3 now documents the **`sanitizeSvg` (DOMPurify) pass** on the kroki render path before `dangerouslySetInnerHTML` (with the §2 `kroki.ts` row updated) and **ADR-9** records the decision (strip scripts/handlers/`javascript:`; keep `foreignObject` for Mermaid `htmlLabels` via `HTML_INTEGRATION_POINTS`; `dompurify` accepted as an editor runtime dep) — shipped in `51d08ec`/`a5ff7b5`, previously undocumented; the requirement is `FR-RD-09` (`FEAT-KRENDER-001` v0.2). §5 Share bullet re-baselined to the shipped popover (auto-copy on open, copy variants incl. the kroki.io GET image URL, > 2 000-char warning — `FR-SH-03`, `FEAT-KSHARE-001` v0.2). |
| 0.4     | 2026-06-12 | Vũ Anh | **Share-link first-load re-baseline** (commit `ef02c04`, P11): §3 documents the no-debounce first render, `?s=`-seeded mount state, engine-on-first-kymo-render (`loadEngine`), and the **early kroki kick-off** (`window.__earlyKroki` adoption, sanitization unchanged); §2 rows for `engine.ts` / `index.html` updated (preconnect kroki.io, inline kick-off script); §11 build re-baselined (content-hash `?v=`, immutable `chunks/*` `_headers`, modulepreload injection — engine chunk never preloaded). **ADR-10** added (first paint must not wait for the bundle; ADR-5's route-level lazy load revised to render-level). |
| 0.5     | 2026-06-13 | Vũ Anh | **Re-baseline to the 2026-06-13 product (second growth pass).** §1 architecture diagram + substrate redrawn (render.kymo.studio, in-browser Mermaid, folder tree, Trash, purge cron, thumbnails); §2 module map adds `sidebar.tsx`/`templates.tsx`/`preview.tsx`/`confirm.tsx`/`detect.ts`/`mermaid.ts`/`LoginPage.tsx`/`TrashPage.tsx` and revises `EditorPage`/`DiagramsPage`/`kroki.ts`/`workspace.tsx`/`auth.tsx`/`const.ts`/`index.html`; four routes; draft URL mode. §3 render orchestration adds the Mermaid + render.kymo.studio routing (with kroki.io fallback), the `Rendered` status wording, and paste auto-detect. §5 share popover → render.kymo.studio GET image URL + Share-open warm-up. §6 adds thumbnails + drafts. §7 D1 schema gains `parent_id`/`deleted`/`thumb` + folder/soft-delete/purge helpers. §8 adds the expiry watchdog + `/login`. §9 REST adds folders (nested, cycle-safe), `/api/diagrams/thumb`, and `/api/trash`. §10 `delete_diagram` is a soft delete. §11 notes the Mermaid chunks; §12 adds the purge cron + the third (render-api) deployable. **ADR-11..18** added. |

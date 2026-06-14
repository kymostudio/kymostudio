---
title: Kymo Editor (editor.kymo.studio) — Requirements (ConOps, StRS & SRS)
document_id: FEAT-KEDITOR-001
version: "0.5"
issue_date: 2026-06-13
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the live diagram editor (`packages/editor/`) and the kymo-mcp Worker (`packages/mcp/`); reviewers; stakeholders
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - DESIGN-KEDITOR-001
  - TEST-KEDITOR-001
  - PLAN-KEDITOR-001
  - FEAT-KRENDER-001
  - FEAT-KSHARE-001
  - FEAT-KLIVE-001
  - FEAT-KLIBRARY-001
  - FEAT-KEMCP-001
  - FEAT-KHOME-001
  - FEAT-FLOWCHART-001
  - FEAT-KYMOJSON-001
  - FEAT-KMCP-001
  - FEAT-CANVAS-001
  - FEAT-STUDIO-001
  - FEAT-KRAPI-001
  - REF-KROKI-001
  - RES-MCP-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - umbrella
  - conops
  - stakeholder-requirements
  - requirements
  - srs
  - iso-29148
  - kymo-editor
  - editor-kymo-studio
  - react-spa
  - client-side-render
  - wasm
  - codemirror
  - kroki
  - google-sign-in
  - workspaces
  - folders
  - folder-tree
  - trash
  - soft-delete
  - templates
  - drafts
  - thumbnails
  - auto-detect
  - in-browser-mermaid
  - render-api
  - vscode-shell
  - zoom-pan
  - d1
  - url-sharing
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
| Version           | 0.5 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `DESIGN-KEDITOR-001` (how), `TEST-KEDITOR-001` (V&V), `PLAN-KEDITOR-001` (plan), `FEAT-KRENDER-001` / `FEAT-KSHARE-001` / `FEAT-KLIVE-001` / `FEAT-KLIBRARY-001` / `FEAT-KEMCP-001` / `FEAT-KHOME-001` (the six modules — see §B.7), `FEAT-FLOWCHART-001` (the native DSL), `FEAT-KYMOJSON-001` (the engine intermediate), `FEAT-KMCP-001` (the sibling *local* npx MCP server), `FEAT-CANVAS-001` / `FEAT-STUDIO-001` (sibling canvas editors), `FEAT-KRAPI-001` (the **render.kymo.studio** Worker the editor now delegates non-kymo rendering to), `REF-KROKI-001` (the upstream render gateway, now a fallback behind `FEAT-KRAPI-001`), `RES-MCP-001` (MCP landscape) |

> This document consolidates the product description (ConOps & StRS), specification overview, and feature requirements (SRS) for **kymo-editor** — the diagram editor at **editor.kymo.studio** and its serverless backend (the `kymo-mcp` Cloudflare Worker at mcp.kymo.studio). It owns the `SN-KE-NN` stakeholder needs and the `FR-KE`/`NFR-KE` requirement IDs, and is the **normative reference** for the shipped system. Version 0.2 **re-baselines** the spec for the product as shipped on 2026-06-12: a React SPA with Google accounts, a per-user multi-diagram library organised into workspaces, CodeMirror editing, 28 kroki.io diagram kinds beside the native kymo DSL, account-free URL sharing, and a per-diagram live-sync + MCP channel (v0.1 described the predecessor: a single textarea, no accounts, one shared room). Since v0.3, kymo-editor is an **umbrella**: the SRS surface is decomposed into six as-built modules under `modules/` (§B.7); this document remains the baseline of record until a module re-baselines its own carve-out. **Version 0.4 re-baselines the product context (Part A), glossary, and module map for the 2026-06-13 product** — a substantial second growth pass on top of v0.2: non-kymo rendering moved off direct kroki.io to the dedicated **render.kymo.studio** Worker (`FEAT-KRAPI-001`, with kroki.io as fallback) and **Mermaid now renders in-browser** (a Rust slice of *merman* for plain flowcharts, `mermaid.js` for the rest); the flat workspaces became a **nested folder tree** in a **VSCode-style shell** (activity bar + Explorer/Search/Templates panels); deletes became **soft** with a **Trash** view and 30-day auto-purge; **+ New** opens a **template gallery** and authoring is now **draft-first** (no server document until the user saves); plus paste **auto-detect**, a **zoom/pan** preview, server-rendered **thumbnails**, and a **`/login`** route with a session-expiry watchdog. The new functional surface is specified in the modules (§B.7, §C.13); Part C's `FR-KE` numbering stays the v0.2 baseline of record, annotated where behaviour was revised.

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

kymo authors a diagram-as-code DSL; the fastest way to feel that loop is to type source and watch the diagram appear. v0.1 of this product solved that minimally — a static page that renders the kymo `flowchart{}`/`bpmn{}` blocks in-browser (wasm) plus one shared live room an LLM could draw into. Three pressures pushed past it:

1. **Real use needs documents.** One shared canvas means any two visitors clobber each other; nothing is named, owned, or findable again. The product needed accounts, many diagrams per user, titles, and a place to come back to.
2. **Real diagrams aren't all kymo.** Authors switch between Mermaid, PlantUML, D2, GraphViz and friends; making the editor a one-stop diagram pad multiplies its daily utility at near-zero cost by delegating non-kymo rendering to the kroki.io API (`REF-KROKI-001`).
3. **Sharing must not require sign-in.** A reader given a link should see (and tweak) the diagram with no account — solved kroki-style by compressing the whole source into the URL.

The result keeps the v0.1 spine — static CDN page, client-side wasm render for kymo, one serverless Worker — and grows a thin product around it: Google sign-in, a D1-backed diagram library with workspaces, CodeMirror editing, a kind switcher with per-kind samples, export to SVG/PNG/source, and `?s=` share links.

A **second growth pass** (v0.4, the 2026-06-13 product) answered the next round of pressures without changing that spine:

4. **One public render service is a single point of failure.** Non-kymo kinds were POSTed straight to the public kroki.io — one European origin, its own queue, bad days, and the source text leaving the device. The editor now delegates to a **dedicated render Worker, render.kymo.studio** (`FEAT-KRAPI-001`): it renders the kinds whose engines run in `workerd` at the edge PoP nearest the caller, **proxies the rest to kroki.io as a fallback**, and caches everything by content hash. **Mermaid moved fully in-browser** — a Rust slice of *merman* (`kymo-mermaid` wasm) for plain flowcharts, the `mermaid.js` reference bundle for every other Mermaid grammar — so the most-used non-kymo kind renders offline with no third party at all.
5. **A flat workspace list doesn't scale.** Authors with many diagrams need real organisation and a place to undo mistakes. Workspaces became a **nested folder tree** in a **VSCode-style shell** (an activity bar with Explorer / Search / Templates panels), and deletes became **soft** — a **Trash** view with restore and a 30-day auto-purge, so nothing is lost to a misclick.
6. **A blank textarea is a cold start.** **+ New** now opens a **template gallery** of diagram *types* (each seeds a working starter and sets the kind), authoring is **draft-first** (you edit immediately; no server document is created until you Save), and pasted source has its **language auto-detected**. The preview gained **pan/zoom**, the library gained server-rendered **thumbnails**, and an expired session lands on a dedicated **`/login`** page instead of failing silently.

### A.2 Users & context of operations (ConOps)

- **Anonymous authors** open `https://editor.kymo.studio`, pick a diagram **type** from a template gallery (or paste source and let the kind auto-detect), type on the left and see the render on the right — pannable and zoomable. Kymo renders in-browser (wasm); Mermaid renders in-browser too; every other kind renders through **render.kymo.studio** (`FEAT-KRAPI-001`). They edit **draft-first** (no server document is created), can export SVG/PNG/source, and copy a **share link** that embeds the entire diagram in the URL (`?s=…`, plus `&k=<kind>` for non-kymo kinds) — no account, no server-side document. Opening someone else's `?s=` link drops the source into the editor, editable and re-shareable; the address bar keeps itself up to date as they type.
- **Signed-in authors** (Google) get a persistent **diagram library** in a **VSCode-style shell**: every diagram is its own document (`?d=<id>`) that autosaves as they type, syncs live across their open tabs, can be renamed in the header, and is organised in an Explorer **folder tree** (drag to move; nest arbitrarily). The `/diagrams` page and a Search panel list them with **thumbnails**, kind badges, and relative timestamps; deleting moves a diagram (or a whole folder + its contents) to **Trash** (`/trash`), where it can be restored until a 30-day auto-purge. Draft work is promoted to a saved, folder-placed document on **Save**.
- **LLM hosts (Claude Desktop, Cursor, claude.ai)** connect to the remote MCP endpoint (mcp.kymo.studio, Google-OAuth-gated) and manage the *signed-in user's own* diagrams: `new_diagram`, `list_diagrams`, `edit_diagram`, `get_diagram`, `delete_diagram` (a soft delete). Edits pushed by the agent appear live in the user's open editor tabs.
- **Operators** deploy three artefacts and leave them alone: a static `dist/` to Cloudflare Pages (`kymo-editor` project → editor.kymo.studio), the `kymo-mcp` Cloudflare Worker (→ mcp.kymo.studio) with its Durable Objects, D1 database, KV namespace, and a daily purge cron, and the **render.kymo.studio** Worker (`FEAT-KRAPI-001`, deployed and specified separately). There is still no VM or container to run.

### A.3 Goals & non-goals

**Goals.**
- Instant in-browser render of the kymo DSL (`flowchart{}` / `bpmn{}`) — no server roundtrip, render parity with the published `kymostudio` JS engine.
- A practical multi-language diagram pad: 28 non-kymo kinds (Mermaid, PlantUML, D2, GraphViz, …), each with a starter sample and syntax highlighting; **Mermaid renders in-browser** (offline-capable), the rest through **render.kymo.studio** (`FEAT-KRAPI-001`).
- A low-friction start: a **template gallery** of diagram types, **draft-first** editing, and paste **auto-detect** of the kind.
- Accounts and a per-user diagram library organised as a **nested folder tree** in a **VSCode-style shell**, with **thumbnails**, search, autosave, and live sync across tabs.
- **Recoverable deletes**: soft delete → Trash → 30-day auto-purge, for both diagrams and whole folders.
- A pannable/zoomable preview.
- Account-free sharing: the whole diagram travels in the URL, kroki-compatible encoding.
- LLM-authorable in real time via remote MCP, scoped to the signed-in user's diagrams.
- Zero-ops hosting: static CDN page + serverless Workers (+ D1/KV/DO state).

**Non-goals (this version).**
- No collaborative cursors, comments, or presence; live sync is last-writer-wins document state for one owner's tabs (and their agent).
- No durable version history (D1 keeps only the latest snapshot per diagram; Trash is a 30-day recovery window, not history).
- No multi-user sharing of *server-side* documents — a `?d=` room is owner-only; cross-user sharing is the `?s=` URL payload.
- **Rendering of non-kymo, non-Mermaid kinds is delegated to render.kymo.studio** (`FEAT-KRAPI-001`, which falls back to kroki.io) — the editor hosts no render engine for them, and the render Worker's rate limits/abuse controls are that feature's concern, not this one's.
- No server-side export pipeline (export is client-side SVG/PNG/source; the only server render the editor triggers is the library thumbnail).
- No DSL coverage beyond what the engine renders (kymo / in-browser Mermaid) or what render.kymo.studio/kroki.io accept (other kinds).

### A.4 Stakeholder needs (`SN-KE`)

| ID | Need |
|----|------|
| **SN-KE-01** | An author wants to type diagram source and see the result **immediately**, with no install and no perceptible render delay. |
| **SN-KE-02** | An author wants to **share** a diagram by sending a single URL, and to **download** the rendered SVG. |
| **SN-KE-03** | An LLM host wants to **create, list, edit, read, and delete** the user's diagrams over a standard MCP transport, with the user watching changes land live. |
| **SN-KE-04** | A viewer wants a diagram pushed by an agent (or typed in another of their tabs) to appear in their open tab **in real time**. |
| **SN-KE-05** | An operator wants **nothing to run or pay for** beyond static hosting and serverless functions — no VM, no render server. |
| **SN-KE-06** | The team wants the kymo output to **match** the `kymostudio` engine exactly (no second renderer to keep in sync). |
| **SN-KE-07** | An author wants to **sign in** and keep **many named diagrams** that are still there tomorrow, from any device. |
| **SN-KE-08** | An author with many diagrams wants to **organise them into workspaces** and find one again by **search** and recency. |
| **SN-KE-09** | An author wants to write **other diagram languages** (Mermaid, PlantUML, D2, GraphViz, …) in the same editor. |
| **SN-KE-10** | A recipient of a shared link wants to **open, edit, and re-share** the diagram **without an account**, and the link must not depend on any stored document. |
| **SN-KE-11** | An author wants to **export PNG** (for docs/slides) and the **source text**, not just SVG. |
| **SN-KE-12** | An author wants a **professional editing surface**: syntax highlighting, line numbers, undo/redo, bracket matching, and an adjustable code/preview split. |
| **SN-KE-13** | An author wants **non-kymo rendering to be fast and resilient** — not hostage to a single public service's queue or outage — and wants the most common kind (Mermaid) to work **offline**, in-browser. *(v0.4)* |
| **SN-KE-14** | An author with many diagrams wants to **organise them into nested folders** (not a flat list) and rearrange by dragging. *(v0.4, evolves SN-KE-08.)* |
| **SN-KE-15** | An author wants to **recover a diagram or folder they deleted by mistake**, for a reasonable window, rather than losing it instantly. *(v0.4)* |
| **SN-KE-16** | An author wants a **fast start**: pick a diagram *type* from a gallery and get a working starter, edit immediately without first committing to a saved document, and have pasted source's **language detected automatically**. *(v0.4)* |
| **SN-KE-17** | An author wants to **pan and zoom** a large diagram in the preview, and to **recognise diagrams by a thumbnail** in the library. *(v0.4)* |
| **SN-KE-18** | An author whose **session has expired** wants a clear way to sign back in (not a silent failure), and to keep editing their draft meanwhile. *(v0.4)* |

### A.5 Scope

In scope: the client SPA (`packages/editor/web/`), its static build/deploy (`build.sh`, `deploy-editor.yml`, Cloudflare Pages `kymo-editor`), and the `kymo-mcp` Worker (`packages/mcp/`: `EditorRoom` Durable Objects, the diagrams / folders / **trash** REST API, the D1 store, the daily **purge cron**, Google-OAuth-gated MCP). Out of scope: the engine itself (`packages/js`, `packages/rust/kymostudio-core` — reused unchanged, specified elsewhere) and the in-browser Mermaid wasm slice (`packages/rust/kymo-mermaid` — a port of *merman*, specified with the engine); the **render.kymo.studio render Worker** (`packages/render-api`, `FEAT-KRAPI-001`) the editor delegates non-kymo rendering to; the kroki.io service (now the render Worker's upstream fallback, surveyed in `REF-KROKI-001`); the *local* npx MCP render server (`FEAT-KMCP-001`); and the legacy server stack (`server.js`, `render_kymo.py`, `mcp-server.js` — retained in-tree as history, not part of the shipped product). **Note:** the `kymo-mcp` Worker's own `/api/render` kroki-caching proxy (added before `render.kymo.studio` existed) is **superseded** and slated for removal (`FEAT-KRAPI-001` §C; risk R14 in `PLAN-KEDITOR-001`).

---

## Part B — Introduction

### B.1 Purpose & motivation

This part frames the spec: what kymo-editor is, how the four KEDITOR documents fit together, and how the feature relates to the engine it renders with and the sibling editors.

### B.2 Document map

- `FEAT-KEDITOR-001` (this doc) — the *what*: ConOps, stakeholder needs, SRS.
- `DESIGN-KEDITOR-001` — the *how*: the SPA module map, render paths, share codec, room protocol, D1/REST/MCP backend, build/deploy.
- `TEST-KEDITOR-001` — the *V&V*: test cases and traceability.
- `PLAN-KEDITOR-001` — the *delivery*: the (retrospective) phased history and risk register.
- `modules/` — the six as-built sub-module doc-sets (§B.7): `editor-render`, `editor-share`, `editor-live`, `editor-library`, `editor-mcp`, `editor-home`.

### B.3 Relationship to the engine and sibling products

kymo-editor is a **thin shell over renderers it does not own**. Kymo kinds call `parseDiagram` + `renderSVG` from the `kymostudio` package (`FEAT-KYMOJSON-001`), which delegates layout to the `kymostudio-core` wasm; the accepted native DSL is the flowchart block (`FEAT-FLOWCHART-001`). All other kinds are POSTed to kroki.io (`REF-KROKI-001`). It is a **distinct product** from `canvas-editor` / `canvas-studio` (`FEAT-CANVAS-001` / `FEAT-STUDIO-001`) — those are object-graph canvas editors; kymo-editor is text-first with a live preview. Its **remote** MCP channel (this spec) is likewise distinct from the **local** stdio MCP render server (`FEAT-KMCP-001`): the remote channel edits hosted documents the user is watching; the local server renders files on the user's machine.

### B.4 Reading guide

Engineers maintaining the page: Part C §C.1–C.3, §C.7–C.8 + `DESIGN-KEDITOR-001` §2–5. Engineers touching accounts, persistence, live sync, or MCP: Part C §C.4–C.6, §C.9 + `DESIGN-KEDITOR-001` §6–10. Reviewers: Part A + §C.10 (v0.4 additions) + §C.13 acceptance.

### B.5 Status & ownership

Implemented and shipped (see `PLAN-KEDITOR-001` §4). Owned by the `diagrams/` project. This document is the normative reference; `packages/editor/README.md` (the retired Python/server render stack) remains superseded for architecture.

### B.6 Glossary

- **Editor page** — the React SPA route `/` (`packages/editor/web/EditorPage.tsx`): code pane, splitter, preview pane, header chrome.
- **Library page** — the route `/diagrams` (`DiagramsPage.tsx`): the signed-in user's diagram list with workspace tabs.
- **kind** — the diagram language of a document: `kymo` (native, wasm-rendered), `mermaid` (in-browser, wasm/`mermaid.js`), or one of the other 27 kinds (rendered via **render.kymo.studio**).
- **wasm core** — `kymostudio-core` compiled to WebAssembly; performs layout; loaded lazily on the editor route.
- **room** — one diagram's live channel: an **`EditorRoom` Durable Object** keyed by the diagram id, holding the live source/title/kind, the owner, and the connected WebSockets.
- **share link** — a URL carrying the whole diagram source: `?s=<deflate+base64url>` (+ `&k=<kind>` when not kymo). No server document involved.
- **room link** — `?d=<id>`: opens a named diagram (owner-only, requires sign-in).
- **kymo-mcp** — the Cloudflare **Worker** (`packages/mcp`) hosting the rooms, the REST API, and the OAuth-gated MCP agent, at mcp.kymo.studio.
- **D1 index** — the Worker's database of record: `diagrams` and `workspaces` tables (metadata + latest source snapshot).
- **origin id** — a per-tab random token used to suppress WebSocket echo.
- **umbrella / module** — `kymo-editor` is the umbrella (system); `editor-render`/`editor-share`/`editor-live`/`editor-library`/`editor-mcp`/`editor-home` are its modules (system elements) under `modules/`.
- **render.kymo.studio** — the dedicated **render Worker** (`FEAT-KRAPI-001`, `packages/render-api`) the editor POSTs non-kymo, non-Mermaid sources to; renders at the edge where it can, proxies to kroki.io otherwise, caches by content hash. Replaces the v0.2 direct-to-kroki.io path.
- **in-browser Mermaid** — Mermaid renders client-side: `kymo-mermaid` (a Rust *merman* port compiled to wasm) for plain `flowchart`/`graph` sources, the `mermaid.js` reference bundle for every other Mermaid grammar.
- **draft** — a diagram being edited at `/` with **no `?d` and no server document**; the URL carries it as a `?s=` share payload. A draft becomes a saved diagram only on explicit **Save**.
- **template gallery** — the modal **+ New** opens: a grid of diagram *types*, each seeding a working starter source and the matching kind (`web/templates.tsx`).
- **Welcome home** — the VS Code-style landing at `/` (`web/welcome.tsx`) shown for an untouched starter draft: Start / Recent / Templates / Learn; the guest sign-in entry point. Owned by `editor-home` (`FEAT-KHOME-001`).
- **folder / folder tree** — the nesting unit for a user's diagrams; a `workspaces` D1 row with a `parent_id`. The UI calls them folders (Explorer panel); the REST/D1 layer still names the table `workspaces`.
- **Trash** — `/trash`: soft-deleted diagrams and folders (D1 `deleted` timestamp), restorable until a daily cron purges anything older than 30 days.
- **activity bar / panels** — the VSCode-style left rail (Explorer / Search / Templates + account/settings) and the panel it toggles (`web/sidebar.tsx`); state in `localStorage` (`kymo_panel`, `kymo_expanded`).
- **thumbnail** — a small SVG render of a diagram stored in D1 (`thumb`), produced by the room via render.kymo.studio and shown in the library/Search panel.

### B.7 Module decomposition (umbrella)

Since v0.3, the shipped feature is decomposed into **six as-built modules** (v0.5 added `editor-home`) — the same containment move as the `canvas-studio` umbrella (`FEAT-STUDIO-001` → toolbar/export/items). Each module is a stub doc-set (`01-REQUIREMENTS` only) that **re-homes** its SN/FR/NFR IDs from this document; the *how* stays in `DESIGN-KEDITOR-001` and the V&V in `TEST-KEDITOR-001` until a module grows its own 02/03/04 — **`editor-home` is the first to do so**, carrying a full `01`–`04` set (`DESIGN-KHOME-001` / `TEST-KHOME-001` / `PLAN-KHOME-001`). This document remains the v0.2 baseline of record; new work on a module's surface is specified and re-baselined **in that module**.

```
kymo-editor (FEAT-KEDITOR-001) → UMBRELLA — the shipped editor.kymo.studio product
        ├── editor-render   (FEAT-KRENDER-001)  → authoring & rendering surface   [as-built]
        ├── editor-share    (FEAT-KSHARE-001)   → URL sharing & export            [as-built]
        ├── editor-live     (FEAT-KLIVE-001)    → accounts, rooms & persistence   [as-built]
        ├── editor-library  (FEAT-KLIBRARY-001) → library & workspaces            [as-built]
        ├── editor-mcp      (FEAT-KEMCP-001)    → remote MCP channel              [as-built]
        └── editor-home     (FEAT-KHOME-001)    → landing / Welcome home          [as-built]
```

Dependency direction: `editor-library` and `editor-mcp` build on the `editor-live` spine; `editor-render` and `editor-share` work signed-out, independent of it; `editor-home` (the landing surface) sits over `editor-library`/`editor-render`/`editor-live`.

**Re-homing map** (former → new; requirement text is carried verbatim in each module's Part C):

| Module | Stakeholder needs | Functional | Non-functional |
|--------|-------------------|------------|----------------|
| `editor-render` | `SN-KE-01/06/09/12 → SN-RD-01..04` | `FR-KE-01/02/04/05/13/14/15/16 → FR-RD-01..08` | `NFR-KE-01/05 → NFR-RD-01..02` |
| `editor-share` | `SN-KE-02/10/11 → SN-SH-01..03` | `FR-KE-25/26/27/03/28/29 → FR-SH-01..06` | `NFR-KE-07 → NFR-SH-01` |
| `editor-live` | `SN-KE-04/07(partial) → SN-LV-01..02` | `FR-KE-17/18/19/06/07/08/09 → FR-LV-01..07` | `NFR-KE-04/06 → NFR-LV-01..02` |
| `editor-library` | `SN-KE-07(partial)/08 → SN-LB-01..02` | `FR-KE-20..24 → FR-LB-01..05` | — (inherits) |
| `editor-mcp` | `SN-KE-03 → SN-MC-01` | `FR-KE-10..12 → FR-MC-01..03` | — (inherits) |
| `editor-home` | `SN-HM-01` (module-native, elaborates `SN-KE-16`) | `FR-HM-01..02` + `US-HM-01..04` (module-native; UI/UX user-story layer) | — (inherits) |

**Retained by the umbrella (not re-homed):** `SN-KE-05` (zero-ops hosting) and `NFR-KE-02/03` (operability, portability/build) — the platform/deploy contract spans every module, as do `DESIGN-KEDITOR-001` §11–12 and the deploy gate in `TEST-KEDITOR-001`.

**v0.4 module-native additions (post-decomposition, see §C.10):** the second growth pass added requirements that are **module-native** — they have no v0.2 `FR-KE` ancestor and are specified directly in the modules: `FR-RD-10` (auto-detect) and `FR-RD-11` (zoom/pan) in `editor-render`; `FR-LB-06` (VSCode shell), `FR-LB-07` (thumbnails), `FR-LB-08` (Trash UX) in `editor-library`; `FR-LV-08` (draft-first), `FR-LV-09` (soft delete + purge), `FR-LV-10` (session expiry + `/login`) in `editor-live`. The in-browser-Mermaid + render.kymo.studio render path is a revision of `FR-RD-05` plus the external `FEAT-KRAPI-001`.

**v0.5 module addition:** the **Welcome home** landing surface — previously undocumented (and contradicted by `FR-KE-21`'s redirect clause) — is specified in the new **`editor-home`** module (`FEAT-KHOME-001`): `FR-HM-01` (Welcome home), `FR-HM-02` (Open file → draft), plus a user-story layer `US-HM-01..04` (the UI/UX convention: stories ADDED alongside the FRs, not instead).

---

## Part C — Requirements (SRS)

Requirements use RFC-2119 keywords. Each maps to the stakeholder need(s) it satisfies. IDs `FR-KE-01..12` are carried over from v0.1 (semantics revised where the product moved — revisions are noted inline); `FR-KE-13+` are new in v0.2. **Since v0.3** every `FR-KE`/most `NFR-KE` are additionally **re-homed** into a module ID (§B.7); this Part C stays the v0.2 baseline of record, but changes to a module's surface are specified against the module's IDs.

### C.1 Functional requirements — Render (`FR-KE-01..05`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-01** | The editor SHALL render the kymo `flowchart { }` / `bpmn { }` DSL to SVG **entirely in the browser**, via `parseDiagram(source)` → `renderSVG(...)` from the `kymostudio` package with the `kymostudio-core` wasm initialised once on first use. The engine module SHALL be **lazy-loaded** (dynamic import) so the wasm chunk is fetched only on the editor route. There SHALL be no server roundtrip for kymo rendering. *(v0.2: lazy load added.)* | SN-KE-01, SN-KE-06 |
| **FR-KE-02** | The editor SHALL re-render on input with a debounce of **120 ms for kymo** and **450 ms for kroki kinds**, SHALL discard stale async render responses (a sequence guard), and SHALL show a success status line. *(v0.2: per-kind debounce + stale guard. v0.4: the status text is now the plain word **`Rendered`**, with the `<bytes> bytes · <ms> ms` detail moved to its hover `title` — see `FR-RD-02`. The first render of a session fires without the debounce — v0.3.)* | SN-KE-01 |
| **FR-KE-03** | The editor SHALL let the user **download** the last successfully rendered SVG, named after the diagram title (`<title>.svg`, falling back to `flowchart.svg`). | SN-KE-02 |
| **FR-KE-04** | The editor SHALL resolve icon art from a CDN base URL (`setIconBaseURL` → jsDelivr `gh/kymostudio/kymostudio@main/packages/icons`), so no icon assets are bundled or served locally. | SN-KE-05, SN-KE-06 |
| **FR-KE-05** | On a parse/render error (engine exception or a kroki error response), the editor SHALL surface the message in the status line (error state) and SHALL NOT crash the page. | SN-KE-01 |

### C.2 Functional requirements — Diagram kinds & samples (`FR-KE-13..14`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-13** | The editor SHALL offer a **kind selector** with `kymo` plus the 28 non-kymo kinds enumerated in `web/kroki.ts` (ActDiag … WireViz, incl. C4-PlantUML). *(v0.4 — render path re-baselined, see `FR-RD-05`/`FR-RD-10`:)* **Mermaid** SHALL render **in-browser** — a Rust *merman* slice (`kymo-mermaid` wasm) for plain `flowchart`/`graph` sources, the `mermaid.js` bundle for every other Mermaid grammar; **all other non-kymo kinds** SHALL render by `POST https://render.kymo.studio/<kind>/svg` (`FEAT-KRAPI-001`), attaching the Google ID token as a `Bearer` for the higher signed-in rate tier when present, **with a transparent fallback to `https://kroki.io/<kind>/svg`** on a render-Worker 5xx/network error. A non-OK final response SHALL surface as a render error (FR-KE-05). | SN-KE-09, SN-KE-13 |
| **FR-KE-14** | Switching kind SHALL load that kind's **starter sample** (`web/samples.ts`) into the editor and render it. The current kind SHALL be persisted with the diagram and shown as a badge in the library list. *(v0.4: see also `FR-RD-10` — pasting a full source body **auto-detects** the kind via `sniffKind` and switches the selector, surfacing a transient "auto-detected …" chip.)* | SN-KE-09, SN-KE-16 |

### C.3 Functional requirements — Editing surface (`FR-KE-15..16`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-15** | The code pane SHALL be a **CodeMirror 6** editor with line numbers, active-line highlight, undo/redo history, bracket matching, line wrapping, indent-with-Tab, and **per-kind syntax highlighting** (a generic diagram-DSL tokenizer parameterised by keyword set for DSL-ish kinds; JSON/XML/YAML/Clojure/LaTeX/Verilog modes for the rest), themed on the brand palette. External document changes (room updates, kind switch, share-link load) SHALL replace the buffer without echoing back as user edits. | SN-KE-12 |
| **FR-KE-16** | The code/preview split SHALL be adjustable by a **draggable divider** (clamped 15–85 %), persisted to `localStorage` (`kymo_split`), with double-click resetting to 50/50. | SN-KE-12 |

### C.4 Functional requirements — Live sync (`FR-KE-06..09`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-06** | While a signed-in user has a diagram open (`?d=<id>`), the editor SHALL maintain a **WebSocket** to that diagram's room (`wss://mcp.kymo.studio/ws?id_token=…&d=<id>`) and SHALL show a live indicator (`⚡`) while connected. The socket is re-established on room or token change; there is **no timed auto-reconnect** (a v0.1 behaviour dropped in the SPA rewrite — recorded as risk R10 in `PLAN-KEDITOR-001`). *(v0.2: per-diagram room; reconnect behaviour revised.)* | SN-KE-04 |
| **FR-KE-07** | On local edits the editor SHALL push `{type:"set", source, kind, origin}` to the room; it SHALL tag messages with a **per-tab `origin` id** and SHALL **ignore echoes** of its own origin so a tab never overwrites itself. The server SHALL additionally broadcast to all-but-sender. | SN-KE-04 |
| **FR-KE-08** | A brand-new (empty) room SHALL NOT adopt the local starter sample automatically: the sample stays local until the user **actually edits**, at which point the room is seeded and — for kymo sources — a title is **auto-derived from the first node label** (`titleFrom`, e.g. `A[Nhận đơn hàng]` → "Nhận đơn hàng") and sent as a rename. On receiving a non-empty `doc` from another origin, the tab SHALL adopt the incoming source (and kind) and re-render. *(v0.2: lazy-seed + auto-title replaces v0.1's eager seeding.)* | SN-KE-04, SN-KE-07 |
| **FR-KE-09** | The room SHALL **persist** its live state (source, title, kind, owner, diagram id) to Durable Object storage and replay it to a newly connected tab; it SHALL additionally **upsert a snapshot row into D1** — immediately on rename, kind change, and API writes; throttled (≥ 30 s apart) during typing; and flushed when a tab disconnects — so the library index and a later session see current content. *(v0.2: D1 index added beside DO storage.)* | SN-KE-04, SN-KE-07 |

### C.5 Functional requirements — Accounts & ownership (`FR-KE-17..19`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-17** | The SPA SHALL support **Google Sign-In** (GIS): the ID token is kept in `localStorage` (`kymo_idtoken`) and treated as absent when its `exp` is within 30 s; sign-out SHALL clear the token, disable GIS auto-select, and re-offer the prompt. The header SHALL show the account (avatar initial, email) with a sign-out menu. *(v0.5 as-built — see `FR-LV-01`: sign-out does **not** re-prompt (that is the `expireSession` path), and the account menu lives in the **activity-bar footer**, not the header.)* | SN-KE-07 |
| **FR-KE-18** | **Signed-out mode SHALL remain fully usable for authoring**: editing, rendering, kind switching, export, and `?s=` share links MUST work with no account. Only room-backed features (library, autosave, live sync, rename) require sign-in. | SN-KE-01, SN-KE-10 |
| **FR-KE-19** | The backend SHALL verify the Google ID token **server-side** (JWKS, issuer + audience) on every WebSocket connect and REST call, SHALL bind a room to its **first authenticated writer as owner**, and SHALL refuse other accounts' access to the room, its REST records, and its MCP operations (403). An `ALLOWED_EMAILS` allowlist (empty = open) MAY gate the deployment. | SN-KE-07 |

### C.6 Functional requirements — Library & workspaces (`FR-KE-20..24`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-20** | The `/diagrams` **library page** SHALL list the signed-in user's diagrams most-recent first with title, kind badge, relative timestamp, and a move/delete affordance. It SHALL filter by a **search box** and SHALL refresh on window focus / visibility. *(v0.4 — see `FR-LB-01`/`FR-LB-06`/`FR-LB-07`:)* the list SHALL show a server-rendered **thumbnail** per row; organisation is a **nested folder tree** (Explorer panel) rather than flat tabs; and **delete is now soft** — it moves the diagram to **Trash** (a styled confirm modal replaces `window.confirm`), recoverable for 30 days, not an immediate destroy. | SN-KE-08, SN-KE-14, SN-KE-15, SN-KE-17 |
| **FR-KE-21** | Opening `/` signed-in without `?d`/`?s` SHALL redirect to the user's **most-recently updated** diagram, or to a fresh draft when they have none. **+ New** SHALL open a **template gallery** of diagram types; picking one seeds a working starter and sets the kind. *(v0.4 — draft-first, see `FR-LB-02`:)* a picked template is a **draft** — edited in-place at `/` with no server document — and is promoted to a saved diagram (a fresh 16-char ≈ 95-bit id that doubles as the room capability, placed in the current folder) **only on explicit Save** (Cmd/Ctrl-S); Save while signed-out first prompts sign-in. *(v0.5 as-built — `/` now lands on the **Welcome home** (`FR-HM-01`, module `FEAT-KHOME-001`), whose Recent list surfaces the most-recent diagram, rather than auto-redirecting.)* | SN-KE-07, SN-KE-16 |
| **FR-KE-22** | The diagram SHALL be **renameable in the header** (click-to-edit, Enter/blur commits, ≤ 60 chars); the rename broadcasts to other tabs (`meta`) and updates the index. | SN-KE-07 |
| **FR-KE-23** | The library SHALL support grouping diagrams. *(v0.4 — re-baselined from flat workspaces to a nested folder tree, see `FR-LB-04`:)* **folders** SHALL support **create / rename / delete / move** with arbitrary **nesting** (each folder carries a `parent_id`), deleting a folder soft-deletes the folder and its entire subtree (folders + diagrams) to Trash, and re-parenting SHALL be **cycle-safe** (a folder cannot become its own descendant). The current folder (`kymo_folder` in `localStorage`) scopes where **+ New** / Save lands; a stored folder that no longer exists falls back to root. | SN-KE-08, SN-KE-14 |
| **FR-KE-24** | The diagrams and workspaces APIs SHALL be **owner-scoped REST endpoints** on the Worker (`/api/diagrams`, `/api/workspaces`; GET/POST/PATCH/DELETE, CORS-enabled, ID token via query or Bearer) backed by the D1 tables. | SN-KE-07, SN-KE-08 |

### C.7 Functional requirements — URL sharing (`FR-KE-25..27`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-25** | The editor SHALL encode share links **kroki-style**: source → raw-deflate (`CompressionStream("deflate")`, zlib) → **base64url** (`+`→`-`, `/`→`_`, padding stripped) → `/?s=<payload>`, with `&k=<kind>` prepended for non-kymo kinds (omitted for kymo). Decoding SHALL accept payloads lifted from kroki.io GET URLs unchanged; an undecodable payload SHALL surface as a status-line error. | SN-KE-10 |
| **FR-KE-26** | When editing **without a room** (signed out, or a shared link), the editor SHALL keep the address bar a **working share link** — re-encoding into `?s=` via `history.replaceState` on a 300 ms debounce. A `?d=` room link takes precedence over `?s=` when both are present. | SN-KE-10 |
| **FR-KE-27** | A **Share** action SHALL copy the current share URL to the clipboard (with a prompt fallback) and confirm visually ("Copied!"). *(v0.5 as-built — see `FR-SH-03`: a popover with Copy / Markdown-link / **Markdown-image (any kind)** + a render.kymo.studio warm-up; the image option is not gated to non-kymo kinds.)* | SN-KE-02, SN-KE-10 |

### C.8 Functional requirements — Export (`FR-KE-28..29`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-28** | The Export menu SHALL produce a **PNG** of the last rendered SVG at 2× scale (canvas rasterise, white background, `viewBox` fallback for dimensions), named `<title>.png`. | SN-KE-11 |
| **FR-KE-29** | The Export menu SHALL download the **source text** (`<title>.kymo` for kymo; `<title>.<kind>.txt` otherwise) and SHALL also offer the SVG download (FR-KE-03). | SN-KE-11 |

### C.9 Functional requirements — MCP channel (`FR-KE-10..12`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KE-10** | The Worker SHALL expose **per-user diagram tools** over MCP — `new_diagram(title?, source?, kind?)`, `list_diagrams()`, `edit_diagram(source?, title?, id?, kind?)`, `get_diagram(id?)`, `delete_diagram(id)` — operating only on the authenticated user's diagrams; `edit_diagram`/`get_diagram` default to the user's **most recent** diagram when `id` is omitted. Content writes broadcast live to the user's open tabs and report the live-tab count; create/edit responses include the `?d=` URL. *(v0.2: replaces the single-room `set_diagram`/`get_diagram` pair.)* | SN-KE-03, SN-KE-04 |
| **FR-KE-11** | MCP access SHALL be gated by **Google OAuth**: the Worker serves an OAuth authorization flow (`/authorize` with a GIS login page, `/token`, `/register`) and binds the session's `email` as the tool-call identity. *(v0.2: replaces unauthenticated MCP.)* | SN-KE-03 |
| **FR-KE-12** | The Worker SHALL serve MCP over **Streamable HTTP at `/mcp`** and legacy **SSE at `/sse`**, the live channel at **`/ws`** (WebSocket, routed before the OAuth layer), and the REST APIs of FR-KE-24. The room's raw `/set`/`/get`/`/destroy` handlers SHALL be internal (reachable only via the Worker's own DO stubs), not public routes. *(v0.2: `/set`/`/get` are no longer public.)* | SN-KE-03 |

### C.10 Functional additions since v0.2 (v0.4 — full text in the modules)

Per the umbrella convention, new functional surface is specified against **module** IDs (§B.7); this catalogue is the umbrella's index of what shipped after the v0.2 baseline. Each row's normative text lives in the cited module.

| Capability | Module requirement | Summary |
|------------|--------------------|---------|
| In-browser Mermaid + render.kymo.studio delegation | `FR-RD-05` (revised), `FEAT-KRAPI-001` | Mermaid renders in-browser (`kymo-mermaid` wasm for plain flowcharts, `mermaid.js` otherwise); other non-kymo kinds POST to render.kymo.studio with a `Bearer` ID token and a kroki.io fallback. |
| Paste auto-detect | `FR-RD-10` | A full-buffer paste runs `sniffKind`; on a confident match the kind selector switches and a transient "auto-detected …" chip shows. |
| Zoom / pan preview | `FR-RD-11` | The preview pane supports wheel/pinch zoom (0.1×–8×), drag-pan, fit-to-view on diagram/kind change, and a controls cluster (±, %, Fit; double-click toggles fit↔100 %). |
| Folder tree | `FR-LB-04` (re-baselined) | Nested folders (`parent_id`), create/rename/move/delete, drag-to-move, cycle-safe re-parenting; the flat-workspace model is retired. |
| VSCode-style shell | `FR-LB-06` | Activity bar with **Explorer** (folder tree), **Search**, and **Templates** panels + account/settings; panel state persisted (`kymo_panel`, `kymo_expanded`). |
| Library thumbnails | `FR-LB-07` | The library and Search panel show a server-rendered SVG thumbnail per diagram. |
| Template gallery + draft-first | `FR-LB-02` (re-baselined), `FR-LV-08` | **+ New** opens a type gallery; a picked template is a draft (no server document) until explicit Save promotes it into the current folder. |
| Soft delete + Trash + purge | `FR-LB-08`, `FR-LV-09` | Delete is soft (`deleted` timestamp); `/trash` lists, restores (folder restore re-homes the subtree), and permanently purges; a daily cron purges items > 30 days old. |
| `/login` + session expiry | `FR-LV-10` | A token-expiry watchdog clears the stale token before it can 401; auth-walled pages redirect to `/login?next=…` with a Google sign-in prompt. |
| Welcome home | `FR-HM-01` (`FEAT-KHOME-001`) | `/` lands on a VS Code-style Welcome (Start / Recent / Templates / Learn); guest Recent shows a sign-in CTA; the editor opens on a start action — supersedes the `FR-KE-21` redirect. A UI/UX-heavy surface, so it also carries a user-story layer (`US-HM-01..04`). |

### C.11 Non-functional requirements (ISO/IEC 25010) (`NFR-KE`)

| ID | Attribute | Requirement |
|----|-----------|-------------|
| **NFR-KE-01** | Performance efficiency | A kymo render MUST complete in the order of tens of milliseconds on a typical laptop and MUST NOT depend on any network call. Kroki renders are network-bound by design and MUST NOT block the UI (async, stale responses dropped). |
| **NFR-KE-02** | Operability | The product MUST run as a **static asset + one serverless Worker** (+ managed D1/KV/DO state) — no VM/container/render server. Deploys are automated on push (`deploy-editor.yml`; `wrangler deploy` for the Worker). |
| **NFR-KE-03** | Portability | The client MUST ship as a static esbuild bundle with **code splitting**: the wasm-bearing engine chunk loads only on the editor route (`--loader:.wasm=binary` inlines the wasm into its chunk); the engine carries zero runtime dependencies. Asset URLs MUST be cache-busted per deploy (Pages serves `max-age=14400`). |
| **NFR-KE-04** | Reliability | The `EditorRoom` MUST be hibernatable (survives idle) and restore its state from storage on wake; D1 MUST receive a flush of the latest source when a tab disconnects, so the index never lags a closed session. |
| **NFR-KE-05** | Compatibility | Kymo output MUST be produced by the **same `kymostudio` engine** the npm package ships — no second renderer. |
| **NFR-KE-06** | Security | ID tokens MUST be verified server-side against Google's JWKS (issuer + audience) on every connect/call; rooms, REST records, and MCP operations MUST be owner-scoped; the room id's entropy (≈ 95 bits) MUST be preserved as it doubles as the access capability. |
| **NFR-KE-07** | Compatibility (sharing) | The `?s=` payload encoding MUST remain **kroki-compatible** (deflate + base64url) so payloads interchange with kroki.io URLs in both directions. |

### C.12 Out of scope / deferred

Collaborative cursors / comments / presence; durable version history (Trash is a 30-day recovery window, not history); cross-user sharing of server-side documents (use `?s=` links); the render-Worker substrate itself and its rate-limiting/abuse controls (`FEAT-KRAPI-001`); server-side export pipeline (only the library thumbnail is server-rendered); timed WebSocket auto-reconnect (dropped in the SPA rewrite — risk R10); offline editing of room-backed documents.

### C.13 Acceptance criteria (feature-level)

1. Typing a `flowchart TD { … }` block renders client-side within ~120 ms of pausing, with the byte/ms status line — and kymo rendering works **offline** after the engine chunk has loaded.
2. Switching the kind to Mermaid loads the Mermaid sample and renders it **in-browser** (no network); switching to (e.g.) PlantUML renders via **render.kymo.studio** (kroki.io only if the render Worker is down); both highlight their syntax and show the kind badge in the library. Pasting a complete diagram source **auto-detects** the kind.
3. Signed out: editing keeps the address bar a working `?s=` link; opening that link in a private window reproduces the diagram; Share copies it; Export produces SVG, PNG, and source files named after the title.
4. Signed in: `/` shows the **Welcome home** (Recent lists the most-recent diagram); + New creates one in the current workspace; rename in the header sticks; `/diagrams` lists, searches, moves, and deletes; a second tab on the same `?d=` adopts edits live without overwriting itself.
5. A second Google account opening someone else's `?d=` link is refused (403); the owner is unaffected.
6. From an MCP host (after Google OAuth): `new_diagram` returns an id + URL; `edit_diagram` updates the open tab live and reports the tab count; `list_diagrams`/`get_diagram`/`delete_diagram` behave as specified.
7. The deployed system is a Cloudflare Pages static site + the `kymo-mcp` Worker (D1/KV/DO + a daily purge cron) + the `render.kymo.studio` Worker (`FEAT-KRAPI-001`) — no VM or container.
8. **+ New** opens the template gallery; picking a type seeds a starter editable immediately with no `?d` (a draft); Save (after sign-in) promotes it to a `?d=` document in the current folder; the address bar carries the draft as `?s=` until then.
9. The Explorer shows a nested folder tree; folders create/rename/drag-move and nest; deleting a diagram or folder moves it (and a folder's subtree) to **`/trash`**, where Restore returns it and Delete-forever purges it; items left in Trash disappear after 30 days.
10. The preview pans and zooms (wheel/pinch/drag, Fit, double-click); library rows and the Search panel show a thumbnail; an expired session lands on `/login?next=…` and resumes the prior page after sign-in.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial requirements for the shipped kymo-editor. Owns `SN-KE-01..06`, `FR-KE-01..12` (browser render, live sync, MCP channel), `NFR-KE-01..05`. Documents the client-side-render + Cloudflare-Pages + `kymo-mcp`-Worker architecture as the normative reference and records that it **supersedes** the Python/server stack described in `packages/editor/README.md`. Retrospective spec for the P-set delivered across commits `466db60` → `47ecb4c` → `0860ace` → `7543db7` (see `PLAN-KEDITOR-001` §4). |
| 0.2     | 2026-06-12 | Vũ Anh | **Re-baseline for the 2026-06-12 product** (commits `58cca51..a3dae51`, P4–P9 in `PLAN-KEDITOR-001`): React SPA + `/diagrams` library, Google accounts, per-diagram owner-scoped rooms, D1 store, workspaces, CodeMirror, 28 kroki kinds + samples, export menu, kroki-style `?s=` URL sharing. Added `SN-KE-07..12`; revised `FR-KE-01..02, 06, 08..12` (per-kind debounce, per-diagram rooms, lazy-seed + auto-title, D1 persistence, per-user MCP tool set, OAuth gating, `/set`/`/get` no longer public); added `FR-KE-13..29` (kinds/samples, CodeMirror/splitter, accounts/ownership, library/workspaces, sharing, export); revised `NFR-KE-01/03` and added `NFR-KE-06/07` (security, share-encoding compatibility). v0.1 non-goals *auth, accounts, named documents, persistence* are now in scope; new non-goals recorded in §A.3. |
| 0.3     | 2026-06-12 | Vũ Anh | **Umbrella decomposition.** kymo-editor becomes an **umbrella** with five as-built modules under `modules/` — `editor-render` (`FEAT-KRENDER-001`), `editor-share` (`FEAT-KSHARE-001`), `editor-live` (`FEAT-KLIVE-001`), `editor-library` (`FEAT-KLIBRARY-001`), `editor-mcp` (`FEAT-KEMCP-001`) — mirroring the `canvas-studio` decomposition. Added §B.7 (module tree + re-homing map), the `modules/` row in §B.2, and the umbrella/module glossary entry; Part C marked as the v0.2 baseline of record with module IDs as the forward change surface. `SN-KE-05` + `NFR-KE-02/03` (platform/deploy) stay umbrella-owned. No requirement content changed. |
| 0.4     | 2026-06-13 | Vũ Anh | **Re-baseline for the 2026-06-13 product (second growth pass).** Reconciled Part A (ConOps, goals/non-goals, scope), the glossary, and the module map to the as-built after the v0.2/v0.3 docs: **non-kymo rendering delegates to render.kymo.studio** (`FEAT-KRAPI-001`, kroki.io fallback) and **Mermaid renders in-browser** (`kymo-mermaid` wasm + `mermaid.js`); flat workspaces → **nested folder tree** in a **VSCode-style shell**; **soft delete + Trash + 30-day purge cron**; **template gallery + draft-first** authoring; paste **auto-detect**; **zoom/pan** preview; library **thumbnails**; **`/login`** + session-expiry watchdog. Added `SN-KE-13..18`; annotated `FR-KE-02/13/14/20/21/23` with their v0.4 revisions; added §C.10 (catalogue of the new functional surface, full text in modules: `FR-RD-10/11`, `FR-LB-06/07/08`, `FR-LV-08/09/10`); renumbered the trailing sections (NFR → C.11, deferred → C.12, acceptance → C.13) and added acceptance #8–10. Resolved the `FEAT-KRENDER-001` collision by re-id'ing the render Worker to `FEAT-KRAPI-001`. Operators now deploy **three** artefacts. `FR-KE`/`NFR-KE` numbering stays the v0.2 baseline of record. |
| 0.5     | 2026-06-15 | Vũ Anh | **Register the `editor-home` module + reconcile guest-flow drift (from the as-built audit).** Added a **sixth** module `editor-home` (`FEAT-KHOME-001`) owning the **Welcome home** landing surface — previously undocumented and contradicted by `FR-KE-21`'s redirect clause; it carries `FR-HM-01/02` plus a `US-HM-01..04` **user-story layer** (the UI/UX convention: stories ADDED alongside FRs). Updated §B.2/§B.6/§B.7 (module tree + re-homing map + glossary, five→six), added the Welcome-home row to §C.10, and annotated `FR-KE-17` (sign-out does not re-prompt; account in activity-bar footer), `FR-KE-21` (Welcome home, not redirect), `FR-KE-27` (share popover; Markdown-image for any kind), and acceptance §C.13 #4. Sibling docs `editor-live` 0.3 / `editor-share` 0.4 / `editor-library` 0.3 re-baselined; `editor-render` / `editor-mcp` swept for the new sibling. Docs-only — no code/behaviour change. |

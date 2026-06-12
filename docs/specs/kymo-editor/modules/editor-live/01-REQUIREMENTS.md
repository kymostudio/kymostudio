---
title: Editor Live — Requirements (ConOps, StRS & SRS)
document_id: FEAT-KLIVE-001
version: "0.1"
issue_date: 2026-06-12
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining kymo-editor's accounts, rooms, and persistence (`packages/editor/web/`, `packages/mcp/`); reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-KEDITOR-001
  - DESIGN-KEDITOR-001
  - TEST-KEDITOR-001
  - FEAT-KRENDER-001
  - FEAT-KSHARE-001
  - FEAT-KLIBRARY-001
  - FEAT-KEMCP-001
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
  - editor-live
  - google-sign-in
  - jwks
  - ownership
  - durable-objects
  - websocket
  - live-sync
  - d1
  - persistence
---

# Editor Live — Requirements (ConOps, StRS & SRS)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-KLIVE-001` |
| Version           | 0.1 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (the umbrella the needs were carved from), `FEAT-KRENDER-001` (sibling — render & editing surface), `FEAT-KSHARE-001` (sibling — sharing & export), `FEAT-KLIBRARY-001` (sibling — library & workspaces, built on this module), `FEAT-KEMCP-001` (sibling — MCP channel, built on this module) |

> **Module of the `kymo-editor` umbrella** (`FEAT-KEDITOR-001`). This module owns the **account & live-document spine**: Google identity (GIS in the browser, JWKS verification server-side), room ownership, the per-diagram `EditorRoom` WebSocket protocol (echo suppression, lazy seeding, auto-title), and persistence (DO storage for live state, D1 snapshots). It owns the `SN-LV`, `FR-LV`, and `NFR-LV` IDs, re-homed as-built from `FEAT-KEDITOR-001` (see §B.3). This is a **stub doc-set** (01 only): the *how* and *V&V* remain in `DESIGN-KEDITOR-001` §6–8 and `TEST-KEDITOR-001` until this module grows its own 02/03/04.

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

One shared canvas can't serve two people: real use needs documents that are owned, durable, and live. kymo-editor grew this spine in P4/P8: Google sign-in as the only client credential, **one Durable Object room per diagram** with the random id as capability and the first authenticated writer as owner, WebSocket fan-out so edits land in every open tab (and from the user's agent), and **D1 as database of record** beside DO live state. As the shipped feature is split into modules, **this module owns identity, ownership, the room protocol, and persistence** — the substrate the library (`editor-library`) and the MCP channel (`editor-mcp`) are built on. The signed-out authoring path stays fully usable and is deliberately a requirement *here* (FR-LV-02): this module defines exactly where the account boundary sits.

### A.2 Users & context of operations (ConOps)

- **Who:** signed-in authors whose diagrams autosave and sync across their open tabs; the Worker enforcing ownership; agents pushing edits (via `editor-mcp`).
- **Mechanics:** GIS ID token in `localStorage`, JWKS-verified on every WS connect and REST call; `wss://mcp.kymo.studio/ws?…&d=<id>` per open diagram; `{set/rename}` out, `{doc/meta}` in, per-tab `origin` echo suppression; DO storage replays state to a newly connected tab; D1 upserts throttled while typing and flushed on disconnect.
- **Constraint:** last-writer-wins for one owner's tabs — no multi-user collaboration, no presence, no version history (umbrella non-goals).

### A.3 Goals & non-goals

- **Goals:** sign in once and keep diagrams that are still there tomorrow; edits visible in other tabs in real time; strict owner-scoping of rooms/records; signed-out authoring untouched.
- **Non-goals (owned by siblings / umbrella / deferred):** the library UI and workspace CRUD (`FEAT-KLIBRARY-001`); the MCP tool set (`FEAT-KEMCP-001`); cross-user sharing of server-side documents (use `?s=` — `FEAT-KSHARE-001`); collaborative cursors/comments/presence; durable version history; timed WebSocket auto-reconnect (risk R10 in `PLAN-KEDITOR-001` — the standing follow-up on this surface).

### A.4 Stakeholder needs (`SN-LV`)

| ID | Need | ⊇ former |
|----|------|----------|
| `SN-LV-01` | A viewer wants a diagram pushed by an agent (or typed in another of their tabs) to appear in their open tab **in real time**. | ⊇ `SN-KE-04` |
| `SN-LV-02` | An author wants to **sign in** and keep **many named diagrams** that are still there tomorrow, from any device. | ⊇ `SN-KE-07` (partial — identity, ownership & durability; the *finding/organising* half re-homes to `FEAT-KLIBRARY-001`) |

### A.5 Scope

**In scope:** GIS sign-in + token lifecycle (`web/auth.tsx`), the `useRoom` hook (`web/room.ts`) and doc-adoption rules, the `EditorRoom` DO (state, `/ws` `/set` `/get` `/destroy`, fan-out, ownership binding), JWKS verification + `ALLOWED_EMAILS`, DO storage + the D1 snapshot cadence. **Out of scope:** everything in §A.3 non-goals; the D1 *query* surface (`/api/*` REST) is owned by `FEAT-KLIBRARY-001`.

---

## Part B — Introduction

### B.1 Purpose & motivation

Part of the five-module decomposition of the shipped `kymo-editor` (see `FEAT-KEDITOR-001` and `FEAT-KRENDER-001` §B.1 for the rationale and the module tree). This module is the **spine**: both `editor-library` and `editor-mcp` operate on the identity, ownership, and persistence it defines. As an as-built carve-out it re-homes the relevant `FEAT-KEDITOR-001` IDs (§B.3) and changes no behaviour.

### B.2 Document map

Stub doc-set: only this `01-REQUIREMENTS.md` exists. The *how* lives in `DESIGN-KEDITOR-001` §6 (live sync + room protocol), §7 (D1 schema), §8 (accounts & authorization); the V&V in `TEST-KEDITOR-001` (TC-KE-07..10, 19, 20), until a change warrants module-local `02-DESIGN` / `03-TEST` / `04-PLAN`. Cross-document references use **`document_id`** (never file paths).

### B.3 Relationship to the kymo-editor umbrella & sibling modules

See the module tree in `FEAT-KRENDER-001` §B.3 (identical for all five siblings). Dependency direction: **`editor-library` and `editor-mcp` build on this module** (its ownership rules and D1/DO state); `editor-render` and `editor-share` are independent of it (they work signed-out by FR-LV-02).

**Re-homing summary (from `FEAT-KEDITOR-001`)** — requirement text carried over verbatim in Part C:

| Former (kymo-editor) | Re-homed here | What |
|----------------------|---------------|------|
| `FR-KE-17` | `FR-LV-01` | Google Sign-In + token lifecycle |
| `FR-KE-18` | `FR-LV-02` | signed-out mode fully usable |
| `FR-KE-19` | `FR-LV-03` | server-side verification + room ownership |
| `FR-KE-06` | `FR-LV-04` | per-diagram WebSocket + live indicator |
| `FR-KE-07` | `FR-LV-05` | set push + two-sided echo suppression |
| `FR-KE-08` | `FR-LV-06` | lazy room seeding + auto-title |
| `FR-KE-09` | `FR-LV-07` | DO persistence + D1 snapshot cadence |
| `NFR-KE-04` | `NFR-LV-01` | reliability (hibernation, flush) |
| `NFR-KE-06` | `NFR-LV-02` | security (JWKS, owner-scoping, id entropy) |

### B.4 Status & ownership

- **Status:** Implemented — **as-built carve-out**; shipped under kymo-editor P3/P4/P5/P8 (`PLAN-KEDITOR-001`). **Note:** the post-v0.2 commit `c83aa75` (expire stale sessions + `/login`) lands on this surface and is the first candidate re-baseline of this module. Open risks living here: R9 (token in query strings), R10 (no WS auto-reconnect), R8 (D1 schema out-of-band).
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability:** `FR-LV-*` are covered by `TEST-KEDITOR-001` TC-KE-07..10, 19, 20 (via the former IDs in its matrix).
- **Change management:** changes are raised as CRs under `docs/specs/kymo-editor/CR/` (umbrella) or module-local `CR/` once this doc-set grows, and re-baselined here (bump version + Annex A).

---

## Part C — Requirements (SRS)

Requirements use RFC-2119 keywords; text is carried over as-built from `FEAT-KEDITOR-001` v0.2 (internal references rewritten to module IDs).

### C.1 Functional requirements — Accounts & ownership (`FR-LV-01..03`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-LV-01** | The SPA SHALL support **Google Sign-In** (GIS): the ID token is kept in `localStorage` (`kymo_idtoken`) and treated as absent when its `exp` is within 30 s; sign-out SHALL clear the token, disable GIS auto-select, and re-offer the prompt. The header SHALL show the account (avatar initial, email) with a sign-out menu. | SN-LV-02 |
| **FR-LV-02** | **Signed-out mode SHALL remain fully usable for authoring**: editing, rendering, kind switching, export, and `?s=` share links MUST work with no account. Only room-backed features (library, autosave, live sync, rename) require sign-in. | SN-LV-02 |
| **FR-LV-03** | The backend SHALL verify the Google ID token **server-side** (JWKS, issuer + audience) on every WebSocket connect and REST call, SHALL bind a room to its **first authenticated writer as owner**, and SHALL refuse other accounts' access to the room, its REST records, and its MCP operations (403). An `ALLOWED_EMAILS` allowlist (empty = open) MAY gate the deployment. | SN-LV-02 |

### C.2 Functional requirements — Live sync (`FR-LV-04..07`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-LV-04** | While a signed-in user has a diagram open (`?d=<id>`), the editor SHALL maintain a **WebSocket** to that diagram's room (`wss://mcp.kymo.studio/ws?id_token=…&d=<id>`) and SHALL show a live indicator (`⚡`) while connected. The socket is re-established on room or token change; there is **no timed auto-reconnect** (risk R10 in `PLAN-KEDITOR-001`). | SN-LV-01 |
| **FR-LV-05** | On local edits the editor SHALL push `{type:"set", source, kind, origin}` to the room; it SHALL tag messages with a **per-tab `origin` id** and SHALL **ignore echoes** of its own origin so a tab never overwrites itself. The server SHALL additionally broadcast to all-but-sender. | SN-LV-01 |
| **FR-LV-06** | A brand-new (empty) room SHALL NOT adopt the local starter sample automatically: the sample stays local until the user **actually edits**, at which point the room is seeded and — for kymo sources — a title is **auto-derived from the first node label** (`titleFrom`, e.g. `A[Nhận đơn hàng]` → "Nhận đơn hàng") and sent as a rename. On receiving a non-empty `doc` from another origin, the tab SHALL adopt the incoming source (and kind) and re-render. | SN-LV-01, SN-LV-02 |
| **FR-LV-07** | The room SHALL **persist** its live state (source, title, kind, owner, diagram id) to Durable Object storage and replay it to a newly connected tab; it SHALL additionally **upsert a snapshot row into D1** — immediately on rename, kind change, and API writes; throttled (≥ 30 s apart) during typing; and flushed when a tab disconnects — so the library index and a later session see current content. | SN-LV-01, SN-LV-02 |

### C.3 Non-functional requirements (`NFR-LV`)

| ID | Attribute | Requirement |
|----|-----------|-------------|
| **NFR-LV-01** | Reliability | The `EditorRoom` MUST be hibernatable (survives idle) and restore its state from storage on wake; D1 MUST receive a flush of the latest source when a tab disconnects, so the index never lags a closed session. |
| **NFR-LV-02** | Security | ID tokens MUST be verified server-side against Google's JWKS (issuer + audience) on every connect/call; rooms, REST records, and MCP operations MUST be owner-scoped; the room id's entropy (≈ 95 bits) MUST be preserved as it doubles as the access capability. |

### C.4 Acceptance criteria (module-level)

1. Two tabs on the same `?d=`: an edit in A appears in B (and vice versa); neither tab is overwritten by its own echo; `⚡` shows while connected.
2. A fresh room does not persist the local sample; the first real edit seeds it and (for kymo) auto-titles from the first node label.
3. After > 30 s of typing or closing the tab, a new session sees current content (D1); reopening `?d=` replays the source (DO).
4. A second Google account opening someone else's `?d=` link is refused (403) on WS, REST, and MCP; a forged/expired token is rejected (401).
5. Signed out, the full authoring + sharing + export loop works with no account.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-12 | Vũ Anh | Initial **as-built carve-out** from `FEAT-KEDITOR-001` v0.2 under the kymo-editor umbrella decomposition. Re-homes `SN-KE-04/07(partial) → SN-LV-01..02`, `FR-KE-17/18/19/06/07/08/09 → FR-LV-01..07`, `NFR-KE-04/06 → NFR-LV-01..02`. Stub doc-set (01 only); design/V&V remain in `DESIGN-KEDITOR-001` / `TEST-KEDITOR-001`. Post-v0.2 session-expiry/`/login` commit noted as the first candidate re-baseline. |

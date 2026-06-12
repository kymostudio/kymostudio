---
title: Editor Library — Requirements (ConOps, StRS & SRS)
document_id: FEAT-KLIBRARY-001
version: "0.1"
issue_date: 2026-06-12
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining kymo-editor's diagram library & workspaces (`packages/editor/web/`, `packages/mcp/`); reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-KEDITOR-001
  - DESIGN-KEDITOR-001
  - TEST-KEDITOR-001
  - FEAT-KRENDER-001
  - FEAT-KSHARE-001
  - FEAT-KLIVE-001
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
  - editor-library
  - diagram-library
  - workspaces
  - rest-api
  - d1
  - search
---

# Editor Library — Requirements (ConOps, StRS & SRS)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-KLIBRARY-001` |
| Version           | 0.1 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (the umbrella the needs were carved from), `FEAT-KLIVE-001` (sibling — accounts & live documents; this module builds on it), `FEAT-KRENDER-001` (sibling — render & editing surface), `FEAT-KSHARE-001` (sibling — sharing & export), `FEAT-KEMCP-001` (sibling — MCP channel) |

> **Module of the `kymo-editor` umbrella** (`FEAT-KEDITOR-001`). This module owns **finding and organising diagrams**: the `/diagrams` library page, header rename, **+ New** / most-recent routing, workspaces (CRUD + move + switcher), and the owner-scoped `/api/diagrams` + `/api/workspaces` REST surface over D1. It owns the `SN-LB` and `FR-LB` IDs, re-homed as-built from `FEAT-KEDITOR-001` (see §B.3). This is a **stub doc-set** (01 only): the *how* and *V&V* remain in `DESIGN-KEDITOR-001` §2/§7/§9 and `TEST-KEDITOR-001` until this module grows its own 02/03/04.

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

Once diagrams are owned and durable (`editor-live`), the next gap is *coming back*: nothing useful is unfindable. kymo-editor grew a per-user **library** in P5/P7 — every diagram its own document, listed most-recent first with title, kind badge, search, relative timestamps — and **workspaces** as the grouping unit ("Personal" the default bucket). As the shipped feature is split into modules, **this module owns the library UX and the REST surface it queries**. The identity/ownership rules and the D1 snapshots it lists are owned by `editor-live`; this module is the query-and-organise layer over them.

### A.2 Users & context of operations (ConOps)

- **Who:** signed-in authors with more than one diagram.
- **Mechanics:** `/diagrams` lists the owner's rows from D1 (search box, workspace pill tabs, move/delete per row, refresh on focus); the header offers click-to-edit rename, a workspace switcher, and **+ New**; `/` signed-in redirects to the most-recently-updated diagram.
- **Constraint:** strictly owner-scoped — the library never lists or touches another account's diagrams (`FR-LV-03`).

### A.3 Goals & non-goals

- **Goals:** a diagram library that is findable (search + recency), organisable (workspaces), and maintainable (rename, move, delete) — from any device.
- **Non-goals (owned by siblings / umbrella):** identity, ownership, autosave, and live sync (`FEAT-KLIVE-001`); agent-side listing (`FEAT-KEMCP-001`, `list_diagrams`); sharing a library entry with another user (umbrella non-goal — use `?s=`, `FEAT-KSHARE-001`); version history (umbrella non-goal).

### A.4 Stakeholder needs (`SN-LB`)

| ID | Need | ⊇ former |
|----|------|----------|
| `SN-LB-01` | An author wants to keep **many named diagrams** and find each one again tomorrow, from any device. | ⊇ `SN-KE-07` (partial — the *finding/organising* half; identity & durability re-homed to `FEAT-KLIVE-001`) |
| `SN-LB-02` | An author with many diagrams wants to **organise them into workspaces** and find one again by **search** and recency. | ⊇ `SN-KE-08` |

### A.5 Scope

**In scope:** `DiagramsPage.tsx` (list, search, tabs, move, delete), header rename + workspace switcher + **+ New** routing (`EditorPage`/`workspace.tsx`), and the Worker REST endpoints `/api/diagrams` + `/api/workspaces` with their D1 helper layer (`listIndex`, `touchIndex`, `assignWorkspace`, `destroyDiagram`, KV→D1 migration). **Out of scope:** everything in §A.3 non-goals; the D1 *write* cadence from live rooms is `FR-LV-07`.

---

## Part B — Introduction

### B.1 Purpose & motivation

Part of the five-module decomposition of the shipped `kymo-editor` (see `FEAT-KEDITOR-001` and `FEAT-KRENDER-001` §B.1 for the rationale and the module tree). This module is the **organisation layer** over the `editor-live` spine. As an as-built carve-out it re-homes the relevant `FEAT-KEDITOR-001` IDs (§B.3) and changes no behaviour.

### B.2 Document map

Stub doc-set: only this `01-REQUIREMENTS.md` exists. The *how* lives in `DESIGN-KEDITOR-001` §2 (`DiagramsPage`, `workspace.tsx`), §7 (D1 schema & helpers), §9 (REST APIs); the V&V in `TEST-KEDITOR-001` (TC-KE-21, 22, plus TC-KE-20's routing assertions), until a change warrants module-local `02-DESIGN` / `03-TEST` / `04-PLAN`. Cross-document references use **`document_id`** (never file paths).

### B.3 Relationship to the kymo-editor umbrella & sibling modules

See the module tree in `FEAT-KRENDER-001` §B.3 (identical for all five siblings). Dependency direction: this module **builds on `editor-live`** — it queries the D1 rows that `FR-LV-07` writes and inherits the owner-scoping of `FR-LV-03`; the kind badges it shows come from the kind selector (`FEAT-KRENDER-001`, `FR-RD-06`).

**Re-homing summary (from `FEAT-KEDITOR-001`)** — requirement text carried over verbatim in Part C:

| Former (kymo-editor) | Re-homed here | What |
|----------------------|---------------|------|
| `FR-KE-20` | `FR-LB-01` | `/diagrams` library page |
| `FR-KE-21` | `FR-LB-02` | most-recent routing + **+ New** + id minting |
| `FR-KE-22` | `FR-LB-03` | header rename |
| `FR-KE-23` | `FR-LB-04` | workspace CRUD + scoping |
| `FR-KE-24` | `FR-LB-05` | owner-scoped REST endpoints |

### B.4 Status & ownership

- **Status:** Implemented — **as-built carve-out**; shipped under kymo-editor P5 + P7 + P8 (`PLAN-KEDITOR-001`). **Note:** the post-v0.2 commit `127d68a` (navbar restructure) touches the header chrome this module owns and is a candidate re-baseline.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability:** `FR-LB-*` are covered by `TEST-KEDITOR-001` TC-KE-21, 22 (and TC-KE-20 for routing) via the former IDs in its matrix.
- **Change management:** changes are raised as CRs under `docs/specs/kymo-editor/CR/` (umbrella) or module-local `CR/` once this doc-set grows, and re-baselined here (bump version + Annex A).

---

## Part C — Requirements (SRS)

Requirements use RFC-2119 keywords; text is carried over as-built from `FEAT-KEDITOR-001` v0.2 (internal references rewritten to module IDs).

### C.1 Functional requirements — Library & workspaces (`FR-LB-01..05`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-LB-01** | The `/diagrams` **library page** SHALL list the signed-in user's diagrams most-recent first with title, kind badge, relative timestamp, a workspace **move** selector, and **delete** (confirm prompt; destroys the room and the D1 row). It SHALL filter by a **search box** and by the selected workspace tab, and SHALL refresh on window focus / visibility. | SN-LB-02 |
| **FR-LB-02** | Opening `/` signed-in without `?d`/`?s` SHALL redirect to the user's **most-recently updated** diagram, or to a fresh id when they have none. **+ New** SHALL create a fresh id (16 random base62 chars ≈ 95 bits — the id doubles as the room's capability secret), pre-assign it to the current workspace, and navigate to it; the server row is created lazily on first write. | SN-LB-01, SN-LB-02 |
| **FR-LB-03** | The diagram SHALL be **renameable in the header** (click-to-edit, Enter/blur commits, ≤ 60 chars); the rename broadcasts to other tabs (`meta`) and updates the index. | SN-LB-01 |
| **FR-LB-04** | Workspaces SHALL support **create / rename / delete** (name ≤ 40 chars); deleting a workspace moves its diagrams back to Personal. The current workspace (`kymo_ws` in `localStorage`) scopes the library view, the header switcher, and where **+ New** lands; a stored workspace that no longer exists falls back to Personal. | SN-LB-02 |
| **FR-LB-05** | The diagrams and workspaces APIs SHALL be **owner-scoped REST endpoints** on the Worker (`/api/diagrams`, `/api/workspaces`; GET/POST/PATCH/DELETE, CORS-enabled, ID token via query or Bearer) backed by the D1 tables. | SN-LB-01, SN-LB-02 |

### C.2 Non-functional requirements

No module-owned NFRs. Inherited and still binding: `NFR-LV-02` (owner-scoping of every REST record), `NFR-LV-01` (the index never lags a closed session), and the umbrella's `NFR-KE-02` (the REST surface stays serverless — Worker + D1 only).

### C.3 Acceptance criteria (module-level)

1. Signed in: `/` lands on the most-recent diagram; **+ New** creates one in the current workspace; rename in the header sticks and propagates to other tabs.
2. `/diagrams` lists by recency with kind badges and relative times; search filters by title; workspace tabs filter; move re-homes a row; delete (with confirm) removes row + room; window re-focus refreshes the list.
3. Workspace create/rename/delete behave (≤ 40 chars; deletion moves diagrams back to Personal); a stale stored workspace falls back to Personal.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-12 | Vũ Anh | Initial **as-built carve-out** from `FEAT-KEDITOR-001` v0.2 under the kymo-editor umbrella decomposition. Re-homes `SN-KE-07(partial)/08 → SN-LB-01..02`, `FR-KE-20..24 → FR-LB-01..05`. Stub doc-set (01 only); design/V&V remain in `DESIGN-KEDITOR-001` / `TEST-KEDITOR-001`. Post-v0.2 navbar-restructure commit noted as a candidate re-baseline. |

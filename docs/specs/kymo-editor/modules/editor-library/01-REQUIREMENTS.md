---
title: Editor Library — Requirements (ConOps, StRS & SRS)
document_id: FEAT-KLIBRARY-001
version: "0.2"
issue_date: 2026-06-13
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
  - folder-tree
  - vscode-shell
  - trash
  - soft-delete
  - templates
  - thumbnails
  - rest-api
  - d1
  - search
---

# Editor Library — Requirements (ConOps, StRS & SRS)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-KLIBRARY-001` |
| Version           | 0.2 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (the umbrella the needs were carved from), `FEAT-KLIVE-001` (sibling — accounts & live documents; this module builds on it; owns the draft/soft-delete data model), `FEAT-KRENDER-001` (sibling — render & editing surface; thumbnails reuse its render paths), `FEAT-KSHARE-001` (sibling — sharing & export), `FEAT-KEMCP-001` (sibling — MCP channel), `FEAT-KRAPI-001` (the render Worker that produces thumbnails) |

> **Module of the `kymo-editor` umbrella** (`FEAT-KEDITOR-001`). This module owns **finding and organising diagrams**: the `/diagrams` library page, the **VSCode-style shell** (activity bar + Explorer / Search / Templates panels), a **nested folder tree** (CRUD + drag-move + switcher), the **template gallery**, **Trash** (`/trash`), library **thumbnails**, header rename, **+ New** / most-recent routing, and the owner-scoped `/api/diagrams` + `/api/workspaces` + `/api/trash` REST surface over D1. It owns the `SN-LB` and `FR-LB` IDs, re-homed as-built from `FEAT-KEDITOR-001` (see §B.3). This is a **stub doc-set** (01 only): the *how* and *V&V* remain in `DESIGN-KEDITOR-001` §2/§7/§9 and `TEST-KEDITOR-001` until this module grows its own 02/03/04.

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

Once diagrams are owned and durable (`editor-live`), the next gap is *coming back*: nothing useful is unfindable. kymo-editor grew a per-user **library** in P5/P7 — every diagram its own document, listed most-recent first with title, kind badge, search, relative timestamps — and **workspaces** as the grouping unit ("Personal" the default bucket). As the shipped feature is split into modules, **this module owns the library UX and the REST surface it queries**. The identity/ownership rules and the D1 snapshots it lists are owned by `editor-live`; this module is the query-and-organise layer over them.

**Second growth pass (v0.2, P14–P17).** The flat list scaled poorly and was unforgiving. This module re-baselined into: a **VSCode-style shell** (an activity bar toggling **Explorer** / **Search** / **Templates** panels); a **nested folder tree** (drag-to-move, arbitrary nesting, cycle-safe) replacing flat workspaces; **library thumbnails** so diagrams are recognisable at a glance; a **template gallery** behind **+ New** (working with the draft-first model owned by `editor-live`); and **Trash** (`/trash`) — soft delete with restore and a 30-day auto-purge — so a mis-deleted diagram or folder is recoverable. The folder/soft-delete *data model* (the `parent_id`/`deleted`/`thumb` columns, the purge cron) lives in `editor-live` (`FR-LV-07/09`); this module owns the *UX and REST surface* over it.

### A.2 Users & context of operations (ConOps)

- **Who:** signed-in authors with more than one diagram.
- **Mechanics:** the Explorer panel shows a **folder tree**; `/diagrams` and the Search panel list the owner's live rows from D1 with **thumbnails**, kind badges, and relative times (refresh on focus); deleting moves a diagram (or a folder + subtree) to **Trash** via a styled confirm; the header offers click-to-edit rename, a folder switcher, and **+ New** → the **template gallery**; `/` signed-in redirects to the most-recently-updated diagram (or a fresh **draft**).
- **Constraint:** strictly owner-scoped — the library never lists or touches another account's diagrams (`FR-LV-03`); lists exclude soft-deleted rows.

### A.3 Goals & non-goals

- **Goals:** a diagram library that is findable (search + recency + thumbnails), organisable (a nested folder tree), recoverable (Trash with restore + 30-day purge), quick to start (template gallery), and maintainable (rename, move, delete) — from any device, in a familiar shell.
- **Non-goals (owned by siblings / umbrella):** identity, ownership, autosave, live sync, and the **draft / soft-delete / thumbnail data model + purge cron** (`FEAT-KLIVE-001`); the render paths thumbnails reuse (`FEAT-KRENDER-001` / `FEAT-KRAPI-001`); agent-side listing (`FEAT-KEMCP-001`, `list_diagrams`); sharing a library entry with another user (umbrella non-goal — use `?s=`, `FEAT-KSHARE-001`); durable version history (umbrella non-goal — Trash is a 30-day window, not history).

### A.4 Stakeholder needs (`SN-LB`)

| ID | Need | ⊇ former |
|----|------|----------|
| `SN-LB-01` | An author wants to keep **many named diagrams** and find each one again tomorrow, from any device. | ⊇ `SN-KE-07` (partial — the *finding/organising* half; identity & durability re-homed to `FEAT-KLIVE-001`) |
| `SN-LB-02` | An author with many diagrams wants to **organise them into a nested folder tree** and find one again by **search**, recency, and a recognisable **thumbnail**. | ⊇ `SN-KE-08`, `SN-KE-14`, `SN-KE-17` (partial) |
| `SN-LB-03` | An author wants to **recover a diagram or folder deleted by mistake**, for a reasonable window, rather than losing it instantly. *(v0.2)* | ⊇ `SN-KE-15` |
| `SN-LB-04` | An author wants a **fast start** — pick a diagram type from a gallery and get a working starter — without first committing to a saved document. *(v0.2)* | ⊇ `SN-KE-16` (partial; the draft mechanics are `FEAT-KLIVE-001`) |

### A.5 Scope

**In scope:** `DiagramsPage.tsx` (list, search, move, delete, thumbnails), the VSCode shell `sidebar.tsx` (activity bar + Explorer/Search/Templates panels), the folder tree (`workspace.tsx` helpers + switcher), the template gallery (`templates.tsx`), `TrashPage.tsx`, the styled confirm modal (`confirm.tsx`), header rename + **+ New** routing (`EditorPage`), and the Worker REST endpoints `/api/diagrams` (+ `/thumb`) · `/api/workspaces` (nested, cycle-safe) · `/api/trash` with their D1 helper layer (`listIndex`, `touchIndex`, `listWorkspaces`, `assignWorkspace`, `wouldCycle`, `destroyDiagram`/`hardDeleteDiagram`, `purgeOldDeleted`, KV→D1 migration). **Out of scope:** everything in §A.3 non-goals; the D1 *write* cadence + thumbnail production + soft-delete/draft semantics from live rooms are `FR-LV-07/08/09`; thumbnail rendering is `FEAT-KRAPI-001`.

---

## Part B — Introduction

### B.1 Purpose & motivation

Part of the five-module decomposition of the shipped `kymo-editor` (see `FEAT-KEDITOR-001` and `FEAT-KRENDER-001` §B.1 for the rationale and the module tree). This module is the **organisation layer** over the `editor-live` spine. As an as-built carve-out it re-homes the relevant `FEAT-KEDITOR-001` IDs (§B.3) and changes no behaviour.

### B.2 Document map

Stub doc-set: only this `01-REQUIREMENTS.md` exists. The *how* lives in `DESIGN-KEDITOR-001` §2 (`DiagramsPage`, `sidebar.tsx`, `templates.tsx`, `TrashPage.tsx`, `workspace.tsx`), §7 (D1 schema, folder/soft-delete/purge helpers), §9 (REST APIs incl. folders + Trash); the V&V in `TEST-KEDITOR-001` (TC-KE-21, 22, **28, 29, 30, 32**, plus TC-KE-20's routing assertions), until a change warrants module-local `02-DESIGN` / `03-TEST` / `04-PLAN`. Cross-document references use **`document_id`** (never file paths).

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

**v0.2 module-native additions (no former `FR-KE`):** `FR-LB-06` (VSCode shell), `FR-LB-07` (library thumbnails), `FR-LB-08` (soft delete + Trash UX). `FR-LB-02` (template gallery + draft-first) and `FR-LB-04` (folder tree) are **re-baselines** of the original re-homed text. The data-model halves they build on are `FEAT-KLIVE-001` (`FR-LV-08` draft, `FR-LV-09` soft delete + purge cron, `FR-LV-07` thumbnail production).

### B.4 Status & ownership

- **Status:** Implemented — shipped under kymo-editor P5 + P7 + P8 (the carve-out) and **P14–P17** (the v0.2 second growth pass: thumbnails, template gallery, VSCode shell + folder tree, Trash). The previously-flagged `127d68a` (navbar restructure) is folded into P16.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability:** `FR-LB-*` are covered by `TEST-KEDITOR-001` TC-KE-21, 22, 28, 29, 30, 32 (and TC-KE-20 for routing).
- **Change management:** changes are raised as CRs under `docs/specs/kymo-editor/CR/` (umbrella) or module-local `CR/` once this doc-set grows, and re-baselined here (bump version + Annex A).

---

## Part C — Requirements (SRS)

Requirements use RFC-2119 keywords; text is carried over as-built from `FEAT-KEDITOR-001` v0.2 (internal references rewritten to module IDs).

### C.1 Functional requirements — Library & workspaces (`FR-LB-01..05`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-LB-01** | The `/diagrams` **library page** SHALL list the signed-in user's **live** diagrams most-recent first with title, kind badge, relative timestamp, a **thumbnail** (FR-LB-07), a folder **move** affordance, and **delete** (a styled confirm — FR-LB-08 — that **soft-deletes** to Trash, not an immediate destroy). It SHALL filter by a **search box** and SHALL refresh on window focus / visibility. *(v0.2: thumbnails; delete is soft; folder tree replaces workspace tabs.)* | SN-LB-02 |
| **FR-LB-02** | Opening `/` signed-in without `?d`/`?s` SHALL redirect to the user's **most-recently updated** diagram, or to a fresh **draft** when they have none. **+ New** SHALL open a **template gallery** (`web/templates.tsx`) of diagram types (filterable); picking one seeds a working starter + sets the kind as a **draft** (no server document — the draft model is `FR-LV-08`). The draft is promoted to a saved diagram — a fresh 16-char ≈ 95-bit id (the room capability), placed in the **current folder** (`assignDiagram`) — only on explicit **Save**; the server row materialises on first write. *(v0.2: + New → template gallery + draft-first, re-baselined from "create a fresh id immediately".)* | SN-LB-01, SN-LB-04 |
| **FR-LB-03** | The diagram SHALL be **renameable in the header** (click-to-edit, Enter/blur commits, ≤ 60 chars); the rename broadcasts to other tabs (`meta`) and updates the index. | SN-LB-01 |
| **FR-LB-04** | Diagrams SHALL be organised in a **nested folder tree** (the D1 `workspaces` table + `parent_id`; UI: the Explorer panel). Folders SHALL support **create / rename / delete / move** with arbitrary **nesting** (name ≤ 40 chars); a diagram's folder is its `ws`. Re-parenting SHALL be **cycle-safe** (client `wouldCycle` + server check — a folder cannot move under its own descendant). Deleting a folder **soft-deletes the folder and its entire subtree** (descendant folders + their diagrams) to Trash (FR-LB-08). The current folder (`kymo_folder` in `localStorage`) scopes the switcher and where **+ New** / Save lands; a stored folder that no longer exists falls back to root. *(v0.2: re-baselined from flat workspaces — ADR-13.)* | SN-LB-02 |
| **FR-LB-05** | The diagrams, folders, and trash APIs SHALL be **owner-scoped REST endpoints** on the Worker — `/api/diagrams` (GET list; PATCH move `{id, ws}`; DELETE soft-delete; `/thumb` GET), `/api/workspaces` (GET; POST `{name, parentId?}`; PATCH rename/reparent `{id, name?, parentId?}`; DELETE soft-delete folder + subtree), and `/api/trash` (GET; POST restore `{kind, id}`; DELETE purge `?id=&kind=` or `?all`) — CORS-enabled, ID token via query or Bearer, backed by the D1 tables. | SN-LB-01, SN-LB-02, SN-LB-03 |
| **FR-LB-06** | The signed-in editor SHALL present a **VSCode-style shell** (`web/sidebar.tsx`): an **activity bar** toggling an **Explorer** panel (the folder tree — expand/collapse, **drag-to-move** folders and diagrams, context menu New-subfolder/Rename/Delete), a **Search** panel (live title filter with kind labels + thumbnails), and a **Templates** panel (filterable type list), with an account + settings footer. The active panel and expanded-folder set SHALL persist (`localStorage`: `kymo_panel`, `kymo_expanded`); the shell SHALL collapse on small viewports. *(v0.2 — ADR-16; not present in the umbrella's flat-tab v0.2.)* | SN-LB-02 |
| **FR-LB-07** | Library rows and the Search panel SHALL show a **thumbnail** — a small SVG render of the diagram cached in D1 (`thumb`), produced by the room on each snapshot upsert (`FR-LV-07`) and served by `GET /api/diagrams/thumb?id=`. A brand-new unsaved draft has none. *(v0.2 — ADR-17.)* | SN-LB-02 |
| **FR-LB-08** | Delete SHALL be **soft** and recoverable. A delete (diagram or folder) SHALL prompt a **styled confirm modal** (`web/confirm.tsx`, Esc cancels / Enter confirms, replacing `window.confirm`) and then stamp the row's `deleted` (cascading to a folder's subtree). The **`/trash` page** (`web/TrashPage.tsx`) SHALL list soft-deleted diagrams + folders newest-first with a "deleted N days ago" note, and offer **Restore** (a folder restores its subtree, re-homed to root if its parent is gone), **Delete forever**, and **Empty trash**; it SHALL note the **30-day auto-purge** (the cron is `FR-LV-09`). *(v0.2 — ADR-14.)* | SN-LB-03 |

### C.2 Non-functional requirements

No module-owned NFRs. Inherited and still binding: `NFR-LV-02` (owner-scoping of every REST record), `NFR-LV-01` (the index never lags a closed session), and the umbrella's `NFR-KE-02` (the REST surface stays serverless — Worker + D1 only).

### C.3 Acceptance criteria (module-level)

1. Signed in: `/` lands on the most-recent diagram; **+ New** opens the template gallery and a picked type is a draft until Save promotes it into the current folder; rename in the header sticks and propagates to other tabs.
2. `/diagrams` lists by recency with kind badges, relative times, and **thumbnails**; search (box / Search panel) filters by title; the Explorer **folder tree** scopes the view; move re-homes a row; delete (styled confirm) sends it to Trash; window re-focus refreshes the list.
3. Folder create / rename / nest / drag-move behave (≤ 40 chars; cycle-safe); deleting a folder sends the folder + subtree to Trash; a stale stored `kymo_folder` falls back to root.
4. `/trash` lists soft-deleted diagrams + folders; Restore returns them (folder restore rebuilds its subtree); Delete-forever / Empty-trash purge; items left 30 days are auto-purged.
5. The VSCode shell toggles Explorer / Search / Templates; the active panel and expanded folders persist across reloads.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-12 | Vũ Anh | Initial **as-built carve-out** from `FEAT-KEDITOR-001` v0.2 under the kymo-editor umbrella decomposition. Re-homes `SN-KE-07(partial)/08 → SN-LB-01..02`, `FR-KE-20..24 → FR-LB-01..05`. Stub doc-set (01 only); design/V&V remain in `DESIGN-KEDITOR-001` / `TEST-KEDITOR-001`. Post-v0.2 navbar-restructure commit noted as a candidate re-baseline. |
| 0.2     | 2026-06-13 | Vũ Anh | **Second growth pass re-baseline (P14–P17).** Added `SN-LB-03` (recover deletes) and `SN-LB-04` (fast start from templates). **Re-baselined `FR-LB-02`** (+ New → template gallery + draft-first) and **`FR-LB-04`** (flat workspaces → nested, cycle-safe **folder tree** with drag-move + subtree soft-delete). **Added `FR-LB-06`** (VSCode shell — activity bar + Explorer/Search/Templates), **`FR-LB-07`** (library thumbnails), **`FR-LB-08`** (soft delete + styled confirm + Trash restore/purge). Extended `FR-LB-01`/`FR-LB-05` (thumbnails, soft delete; `/api/trash` + nested-folder + `/thumb` endpoints). Scope/goals/ConOps updated; acceptance rewritten (5 items); folded `127d68a` into P16. V&V → TC-KE-21/22/28/29/30/32 (`TEST-KEDITOR-001` v0.5). Data-model halves owned by `FEAT-KLIVE-001` (`FR-LV-07/08/09`); thumbnail rendering by `FEAT-KRAPI-001`. See ADR-13/14/15/16/17 in `DESIGN-KEDITOR-001` v0.5. |

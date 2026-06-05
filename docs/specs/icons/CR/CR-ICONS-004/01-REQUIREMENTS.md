---
title: "Icons CR-004 — P3 IconifyJSON manifest + on-demand loading: scope, rationale & schedule"
document_id: CR-ICONS-004
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: kymo Icons v2 maintainers / reviewers; engineers building the per-set IconifyJSON manifest and the on-demand loader
review_cycle: Until closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - DESIGN-ICONS-CR004          # CR design — CR-ICONS-004/02-DESIGN
  - TEST-ICONS-CR004            # CR verification (TC-2, TC-4, TC-8) — CR-ICONS-004/03-TEST
  - PLAN-ICONS-CR004            # CR plan (phase P3) — CR-ICONS-004/04-PLAN
  - FEAT-ICONS-001              # Baseline requirements — realises FR-2, FR-3, FR-5, FR-9, NFR-4 (no new FR)
  - DESIGN-ICONS-001            # Baseline design — §3 format, §6 loader
  - TEST-ICONS-001              # Baseline test — TC-2, TC-4, TC-8
  - PLAN-ICONS-001              # Baseline plan — phase P3
  - RES-ICONS-001               # Prior-art research (Iconify §2 format, §5 loading)
  - CR-ICONS-003                # P2 — the generator this phase enriches
  - CR-ICONS-001                # P6 CLI — its read-trio depends on this manifest
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - iconify-json
  - metadata
  - on-demand
  - batching
  - cache
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# Icons CR-004 — P3 IconifyJSON manifest + on-demand loading

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | CR-ICONS-004                                       |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-ICONS-CR004, TEST-ICONS-CR004, PLAN-ICONS-CR004, FEAT-ICONS-001, DESIGN-ICONS-001, TEST-ICONS-001, PLAN-ICONS-001, RES-ICONS-001, CR-ICONS-003, CR-ICONS-001 |

> **Implementation change-request** realising **baseline phase P3** of `PLAN-ICONS-001`. Adds **no
> requirement**: it schedules, designs, and verifies the existing **FR-2, FR-3, FR-5, FR-9,
> NFR-4**. On completion the P3 row flips to **Done** (Annex C) — no requirement re-base.
> **Status: Open** — raised, not started; **depends on P2 (CR-ICONS-003)**. P3 is the **enabling
> phase for the `kymo icons` CLI (CR-ICONS-001)** — its `list`/`search`/`describe` are only
> meaningful once this manifest carries `info`/aliases/tags/dims. Sibling layers:
> [`02-DESIGN`](02-DESIGN.md) (`DESIGN-ICONS-CR004`) ·
> [`03-TEST`](03-TEST.md) (`TEST-ICONS-CR004`, TC-2/TC-4/TC-8) ·
> [`04-PLAN`](04-PLAN.md) (`PLAN-ICONS-CR004`, phase P3).

The key words **SHALL**, **SHOULD**, **MAY** are used per ISO drafting conventions.

## 1. Motivation

P1 made icons addressable and P2 unified the build, but the artifact is still close to a
`key → path` map: it carries **no dimensions, aliases metadata, `info`, or tags**, so no picker UI
or CLI can search or filter it, and the client still loads the whole manifest up front
(RES-ICONS-001 §6). P3 turns the generated artifact into **per-set IconifyJSON** (FR-2/FR-3) with
searchable metadata (FR-5) and gives the JS loader **on-demand / batched** fetching with caching
and a `missing` set (FR-9, NFR-4). This is the phase that makes the catalogue *queryable* and
*scalable* — and the precondition for the `kymo icons` discovery CLI (CR-ICONS-001).

## 2. Change (summary)

- **Per-set IconifyJSON** (FR-2) — one JSON per set (`aws.json`, `gcp.json`…) with `prefix`, root
  dimension/transform defaults, an `icons` map, an `aliases` map, and an `info` block
  (counts/author/license).
- **Sparse records** (FR-3) — each icon is `{ body, width?, height? }`; dimensions/transforms appear
  **only when they differ** from the set root (a minify pass hoists common values).
- **Searchable metadata** (FR-5) — per-icon/per-set dimensions, aliases, `info`, category/tags,
  sufficient for a picker UI / the CLI to search and filter (the UI itself stays out of scope).
- **On-demand loader** (FR-9, NFR-4) — the JS loader collects referenced `prefix:name`s, batches
  **one request per prefix** for only those icons, caches `prefix → { icons, missing }` (memory +
  `localStorage` where available), and never re-requests a recorded miss.

The IconifyJSON shape, the minify/sparse rules, and the loader's batching/caching are in
**DESIGN-ICONS-CR004**.

## 3. Baseline requirements realised (no new requirement)

| Baseline req | Statement (unchanged) | Verified by |
|--------------|------------------------|-------------|
| **FR-2** | Per-set IconifyJSON: `prefix`, root defaults, `icons`, `aliases`, `info` | TC-2 |
| **FR-3** | Sparse `{ body, width, height }` records; dims present only when differing from root | TC-2 |
| **FR-5** | Searchable metadata (dims, aliases, `info`, category/tags) | TC-4 |
| **FR-9** | On-demand / batched loading + cache + `missing` set | TC-8 |
| **NFR-4** | Small per-icon payload; no whole-catalogue up-front load | TC-8 |

## 4. Constraints, assumptions, out-of-scope

- **Depends on P2.** The generator (CR-ICONS-003) emits this manifest; P3 enriches its output, it
  does not re-introduce a scanner.
- **Metadata source.** `info`/license come from the upstream sets; tags/category from the source
  taxonomy. Where a set lacks tags, the field is present-but-empty (still queryable).
- **No picker UI / no hosted API** — FR-5 makes the catalogue searchable; the UI (FEAT §7) and an
  Iconify-style HTTP service are out of scope. The client may batch from static files / a CDN base.
- **Enables, does not include, the CLI.** `kymo icons` (CR-ICONS-001) consumes this manifest but is
  a separate phase (P6).

## 5. Acceptance

- Each per-set artifact has `prefix`/root defaults/`icons`/`aliases`/`info`; records are sparse — TC-2.
- Dimensions, aliases, `info`, category/tags are present and queryable for a sample set — TC-4.
- A page referencing K icons of a set fetches those K (batched, one request/prefix), caches them,
  records misses, and does **not** pull the whole catalogue up front — TC-8, NFR-4.

## 6. Change record

| Date | Actor | Decision |
|------|-------|----------|
| 2026-06-05 | Vũ Anh | **Raised (Open).** Maps baseline phase P3 onto an implementation CR realising FR-2/FR-3/FR-5/FR-9/NFR-4; depends on P2 (CR-ICONS-003); enables the CLI (CR-ICONS-001). Not started. |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial raise — P3 IconifyJSON manifest + on-demand loading, mapped from PLAN-ICONS-001 phase P3. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-004/01-REQUIREMENTS.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
Implementation CR; no requirement IDs of its own. On completion, flip the P3 row of
`PLAN-ICONS-001` to Done + append Annex C. Until then, edits increment `version` and append to Annex A.

### B.4 Backwards Compatibility
FR-2/FR-3/FR-5/FR-9/NFR-4 IDs are owned by `FEAT-ICONS-001` and unchanged here.

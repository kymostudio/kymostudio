---
title: kymo Icons v2 — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-ICONS-001
version: "0.1"
issue_date: 2026-06-04
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for kymo's icon subsystem redesign; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-ICONS-001             # Introduction
  - FEAT-ICONS-001              # Requirements (SRS derived from the needs below)
  - DESIGN-ICONS-001            # Design
  - TEST-ICONS-001              # Test documentation
  - PLAN-ICONS-001              # Plan
  - RES-ICONS-001               # Prior-art research (Iconify) — the evidence base
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - icons
  - iconify
  - icon-catalogue
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# kymo Icons v2 — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-ICONS-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-ICONS-001`, `FEAT-ICONS-001` (the SRS derived from the needs below), `RES-ICONS-001` (prior-art evidence base) |

> This doc owns the `SN-ICONS-NN` stakeholder needs; the SRS (`FEAT-ICONS-001`)
> derives `FR`/`NFR` from them. The mechanics are evidenced by the Iconify research
> note `RES-ICONS-001`.

## 1. Problem & motivation

kymo's icon subsystem is simple and works at its current size, but every scaling
property of an icon catalogue applies once it grows. As diagnosed in `RES-ICONS-001` §6,
the root `icons/` directory holds ~2,460 files / ~38 MB that are **99.9% raster PNG**, and
the flat `<provider>-<name>` key (category folder dropped, last-write-wins) yields **2,300
manifest keys for 2,457 PNGs** — so **~157 icons are silently unreachable**, a collision
rate that only grows with the catalogue. PNGs cannot be recoloured to a diagram theme,
do not scale crisply, and inline at ~10× the payload of an SVG body. Two hand-maintained
scanners (`_scan_icons_dir` in Python, `build-manifest.mjs` in JS) must be kept
byte-compatible by convention, and the manifest is a bare `key → path` map with no
dimensions, aliases, or tags — so no picker UI can search or filter the catalogue.

The Iconify research (`RES-ICONS-001`) establishes the prior art: store a normalized
**icon record** (`{ body, width, height }` + sparse transforms) rather than a *file*, and
nearly every scaling property — small payloads, recolouring, dedup via aliases, on-demand
fetch — falls out of that one decision. **kymo Icons v2** adopts that model.

## 2. Users & context of operations (ConOps)

- **Who:** authors who reference icons in `.kymo`/BPMN diagrams; engineers maintaining
  kymo's icon catalogue and loaders (Python and JS) at parity; future tooling such as an
  icon-picker UI in the playground / VS Code extension.
- **The artifact:** an **IconifyJSON-style icon catalogue** — per-set manifests carrying
  normalized vector icon records (`{ body, width, height }`), `prefix:name` namespacing,
  aliases, and metadata (`info`, dimensions, category/tags) — generated **once** and
  consumed by both the Python renderer and the JS loader, with **on-demand / batched**
  loading on the client.
- **Substrate it builds on:** the existing icon resolution in
  `packages/python/src/kymo/icons.py` and `packages/js/src/icons-loader.ts` (+
  `icons-builtin.ts`, `scripts/build-manifest.mjs`), and the "two implementations at
  parity" rule in `CLAUDE.md`. It follows the established norm of a normalized icon-record
  format (Iconify, `RES-ICONS-001`) over a folder-of-files.

## 3. Goals & non-goals

- **Goals:** eliminate silent icon collisions; make icons recolourable and crisp at any
  scale; carry searchable metadata; generate the catalogue from one source consumed by
  both implementations; load on demand at scale; preserve byte-stable rendered output for
  diagrams whose icons are unaffected.
- **Non-goals (v1):** building the icon-picker UI itself (this enables it); auto-tracing
  the 2,400 raster PNGs into vectors (the realistic path is **sourcing vector originals**,
  per `RES-ICONS-001` §7.1); becoming a hosted Iconify-compatible API service. The
  detailed boundary is in `FEAT-ICONS-001` §4.

## 4. Stakeholder needs (`SN-ICONS`)

| ID | Need |
|----|------|
| `SN-ICONS-01` | **No icon SHALL be silently unreachable.** Every vendored icon SHALL be addressable; the ~157 collisions caused by the flat `<provider>-<name>` key SHALL be eliminated. |
| `SN-ICONS-02` | Icons SHALL be **recolourable to the diagram theme and crisp at any scale** — i.e. vector with `currentColor`, not fixed-size raster. |
| `SN-ICONS-03` | The catalogue SHALL be **searchable and filterable** (carry dimensions, aliases, `info`, category/tags) so a picker UI can browse thousands of icons. |
| `SN-ICONS-04` | The icon data SHALL be a **single source of truth** consumed identically by the Python and JS implementations — no two hand-maintained scanners that can drift. |
| `SN-ICONS-05` | The catalogue SHALL **scale to thousands of icons** without bloating rendered output or up-front load — small per-icon payloads, on-demand/batched fetch, caching. |

## 5. Scope

**In scope (product level):** an IconifyJSON-style icon catalogue (normalized vector
records, `prefix:name` namespacing, aliases, metadata), a single generator that emits it,
both Python and JS consuming that artifact, and on-demand/batched client loading — mirrored
across `packages/python` and `packages/js`. **Out of scope (v1):** see §3 non-goals; the
SRS (`FEAT-ICONS-001` §4) carries the detailed constraints/out-of-scope list.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-04 | Vũ Anh | Initial product description. Derived from the Iconify prior-art research `RES-ICONS-001` (§6 diagnosis, §7 lessons); minted feature-scoped needs `SN-ICONS-01..05`. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/00-PRODUCT.md`; the authoritative source is the
main-branch working tree, with history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the spec it anchors; available to anyone with repository
read access.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set
(`INTRO`/`FEAT`/`DESIGN`/`TEST`/`PLAN`) consistent; increment `version`; append a row to
Annex A. New stakeholder needs are minted here only, through a baseline or an approved
change-request.

### B.4 Backwards Compatibility
This is the product context; on any feature change, reconcile it with `FEAT-ICONS-001`
(requirements) and `DESIGN-ICONS-001` (design) before release.

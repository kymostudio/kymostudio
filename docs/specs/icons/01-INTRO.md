---
title: kymo Icons v2 — Introduction
document_id: INTRO-ICONS-001
version: "0.1"
issue_date: 2026-06-04
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers and reviewers of kymo's icon catalogue, generator, and loaders
review_cycle: On phase completion, or on scope change
supersedes: null
related_documents:
  - PROD-ICONS-001              # Product description (ConOps + StRS)
  - FEAT-ICONS-001              # Requirements
  - DESIGN-ICONS-001            # Design
  - TEST-ICONS-001              # Test documentation
  - PLAN-ICONS-001              # Plan
  - RES-ICONS-001               # Prior-art research (Iconify) — the evidence base
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - iconify
  - icon-catalogue
  - prefix-name
  - on-demand-loading
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# kymo Icons v2 — Introduction

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | INTRO-ICONS-001                                            |
| Version      | 0.1                                                        |
| Status       | Draft                                                      |
| Issue Date   | 2026-06-04                                                 |
| Owner        | `diagrams/` project                                        |
| Related      | PROD-ICONS-001, FEAT-ICONS-001, DESIGN-ICONS-001, TEST-ICONS-001, PLAN-ICONS-001, RES-ICONS-001 |

## 1. Purpose and scope

This document introduces **kymo Icons v2** — a redesign of kymo's icon subsystem along the
lines proven by Iconify — and is the entry point to its document set. It states the
problem, the concept, and the terminology, and maps the reader to the product description
(PROD-ICONS-001), the requirements (FEAT-ICONS-001), the design (DESIGN-ICONS-001), the
test documentation (TEST-ICONS-001), and the plan (PLAN-ICONS-001). The evidence base is
the prior-art research note RES-ICONS-001; this set conforms to ISO/IEC/IEEE 12207:2017 and
15289:2019.

## 2. Background

kymo currently ships ~2,460 vendored icons through a deliberately simple mechanism: files
on disk (99.9% raster PNG), inlined verbatim at render time, addressed by a flat
`<provider>-<name>` key built by two hand-maintained scanners (Python `_scan_icons_dir`,
JS `build-manifest.mjs`). RES-ICONS-001 §6 diagnoses the resulting scale gaps: ~157 icons
are silently unreachable to last-write-wins key collisions; PNGs can be neither recoloured
to a theme nor scaled crisply; the manifest is a bare `key → path` map with no metadata for
a picker; and the JS SVG inliner dumps whole raw documents, colliding on element `id`s.

Iconify reaches **~250,000 icons across 150+ sets** from one data model by never storing a
*file* — it stores a normalized **icon record** (`{ body, width, height }` + sparse
transforms) and assembles an `<svg>` at render time (RES-ICONS-001 §2). kymo Icons v2 adopts
that model and its build/distribution mechanics.

## 3. Feature concept

An **IconifyJSON-style icon catalogue** for kymo:

- **Normalized vector records** — each icon is stored as `{ body, width, height }` (inner
  SVG only), recolourable via `currentColor` and crisp at any size (RES-ICONS-001 §2, §7.1).
- **`prefix:name` namespacing + aliases** — globally addressable, collision-proof keys, with
  aliases collapsing synonyms and transformed variants instead of duplicating art
  (RES-ICONS-001 §3, §7.2). This is what stops the ~157 silent losses.
- **Self-describing, searchable** — per-set manifests carry `info`, dimensions, aliases, and
  category/tags so a future picker can search and filter (RES-ICONS-001 §7.3).
- **One source of truth** — a single generator emits the catalogue; both the Python renderer
  and the JS loader consume that artifact rather than each re-scanning `icons/`
  (RES-ICONS-001 §7.4).
- **On-demand at scale** — the client fetches per-set / batched records and caches them,
  rather than loading the whole manifest up front (RES-ICONS-001 §5, §7.3).

Behaviour is specified in FEAT-ICONS-001; the architecture in DESIGN-ICONS-001; the
prior-art mechanics in RES-ICONS-001.

## 4. Audience

Engineers implementing or reviewing kymo's icon catalogue, generator, and the two loaders
(Python and JS), and maintainers verifying cross-language parity and byte-stable rendered
output.

## 5. Terms and abbreviations

- **Icon record** — the stored unit: `{ body, width, height }` + sparse transforms; *not* a
  file. The renderer wraps `body` in `<svg viewBox="left top width height">…</svg>`.
- **Body** — the inner SVG (`<path>`, `<g>`…) without the `<svg>` wrapper.
- **IconifyJSON** — the per-set JSON format: `prefix`, root defaults, `icons`, `aliases`,
  `info`, optional `chars` (RES-ICONS-001 §2).
- **`prefix:name`** — the global icon address (e.g. `mdi:home`); collision-proof namespace.
- **Alias** — `{ parent, …transforms? }`: a synonym or transformed variant resolved by
  walking the parent chain (RES-ICONS-001 §3).
- **Batch loading** — fetching only the referenced icons of a set in one request, then
  caching (RES-ICONS-001 §5).

## 6. Document map

This feature's docs use a two-layer model in this folder — a **baselined spec**
(`00-PRODUCT`–`04-TEST`) and a **living plan** (`PLAN.md` + `CR/`). The documents for icons:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 00 | `00-PRODUCT.md` | `PROD-ICONS-001` | *what product problem & whose needs (`SN-ICONS`)?* |
| 01 | `01-INTRO.md` | `INTRO-ICONS-001` | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-ICONS-001` | *what must it do? (SRS, `FR`/`NFR`)* |
| 03 | `03-DESIGN.md` | `DESIGN-ICONS-001` | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-ICONS-001` | *how do we know it's right?* |
| — | `docs/specs/icons/PLAN.md` | `PLAN-ICONS-001` | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-`
prefixes are a reading-order aid only. The prior-art evidence base is **RES-ICONS-001**.

**Change management:** a change to this baselined spec is raised as a change-request in
`docs/specs/icons/CR/` and re-baselined (bump version + record in Annex A).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-04 | Vũ Anh | Initial issue — introduces kymo Icons v2, the IconifyJSON-style catalogue redesign, derived from RES-ICONS-001. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/01-INTRO.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in alongside the spec; available to all repository readers.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set (PROD/FEAT/DSN/TST/PLAN)
consistent; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This is an informative overview; on any feature change, reconcile it with FEAT-ICONS-001
(requirements) and DESIGN-ICONS-001 (design) before release.

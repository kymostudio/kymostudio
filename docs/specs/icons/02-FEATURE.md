---
title: kymo Icons v2 — Requirements
document_id: FEAT-ICONS-001
version: "0.1"
issue_date: 2026-06-04
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the kymo icon catalogue, generator, and loaders
review_cycle: On phase completion, or on scope change
supersedes: null
related_documents:
  - PROD-ICONS-001              # Product description (owns the SN- stakeholder needs)
  - INTRO-ICONS-001             # Introduction
  - DESIGN-ICONS-001            # Design
  - TEST-ICONS-001              # Test documentation
  - PLAN-ICONS-001              # Plan
  - RES-ICONS-001               # Prior-art research (Iconify) — the evidence base
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - requirements
  - iconify
  - prefix-name
  - aliases
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# kymo Icons v2 — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-ICONS-001                                     |
| Version      | 0.1                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-06-04                                         |
| Owner        | `diagrams/` project                                |
| Related      | PROD-ICONS-001 (stakeholder needs), INTRO-ICONS-001, DESIGN-ICONS-001, TEST-ICONS-001, PLAN-ICONS-001, RES-ICONS-001 |

The key words **SHALL**, **SHOULD**, **MAY** are used per ISO drafting conventions.
Each requirement carries a stable ID for traceability from TEST-ICONS-001. Concept:
INTRO-ICONS-001; evidence base: RES-ICONS-001; realisation: DESIGN-ICONS-001.

## 1. Scope and stakeholder needs

Stakeholder needs (`SN-ICONS-01..05`, ISO 29148 §6.4.2 ConOps) are owned by the product
description **`PROD-ICONS-001`** (`00-PRODUCT.md`): make every icon reachable, recolourable,
crisp, searchable, single-sourced across Python and JS, and scalable to thousands without
bloating output or up-front load. This document specifies the catalogue format, generator,
loader behaviour, and surface that meets those needs; the scope/out-of-scope boundary is in
§4. The mechanics are evidenced by RES-ICONS-001 §2–§5 and prioritised by §7.

## 2. Functional requirements

**Catalogue format (RES-ICONS-001 §2, §3)**
- **FR-1** Icons SHALL be addressed by a collision-proof **`prefix:name`** key; the legacy
  flat `<provider>-<name>` last-write-wins key SHALL be replaced so that **no vendored icon
  is silently unreachable** (closes the ~157 collisions of RES-ICONS-001 §6).
- **FR-2** The catalogue SHALL be stored as **per-set IconifyJSON**: `prefix`, root
  dimension/transform defaults, an `icons` map of records, an `aliases` map, and an `info`
  block (counts, author, license), per RES-ICONS-001 §2.
- **FR-3** Each icon SHALL be a normalized **`{ body, width, height }`** record storing only
  the inner SVG body (no `<svg>` wrapper), with width/height/transform present **only when
  they differ** from the set root (sparse + root defaults; `minifyIconSet`-style).
- **FR-4** **Aliases** SHALL express synonyms and transformed variants as
  `{ parent, …transforms? }`, resolved by walking the parent chain with cycle guards, so
  near-duplicate art is not stored twice (RES-ICONS-001 §3).
- **FR-5** The catalogue SHALL carry **searchable metadata** — per-icon/per-set dimensions,
  aliases, `info`, and category/tags — sufficient for a picker UI to search and filter
  (RES-ICONS-001 §7.3); the picker UI itself is out of scope (§4).

**Rendering (RES-ICONS-001 §7.1)**
- **FR-6** The renderer SHALL assemble `<svg viewBox="left top width height">{body}</svg>`
  from a record at the requested size, and icons SHALL be **recolourable** via
  `currentColor` and **crisp at any scale** (vector, not fixed-size raster `<image>`).
- **FR-7** Inlining SHALL be **`id`/`defs`-safe**: repeated icons in one document SHALL NOT
  collide on element identifiers (replacing the whole-document `_svg_as_inline()` behaviour
  of RES-ICONS-001 §6).

**Build & distribution (RES-ICONS-001 §4, §5)**
- **FR-8** A **single generator** SHALL produce the catalogue from source art through a
  normalize pipeline (`cleanupSVG → parseColors(currentColor) → SVGO/minify → validate →
  deduplicate-to-aliases → minify-to-root`), and **both** the Python renderer and the JS
  loader SHALL consume that one artifact rather than each re-scanning `icons/` — replacing
  the two hand-maintained scanners (RES-ICONS-001 §7.4).
- **FR-9** The client loader SHALL support **on-demand / batched** loading — fetching only
  the referenced icons of a set and **caching** the result (in memory; `localStorage` where
  available), with a recorded **missing** set so a name is not re-requested
  (RES-ICONS-001 §5).

**Surface & parity**
- **FR-10** The feature SHALL exist with **equivalent functionality** in both
  `packages/python` and `packages/js` (per `CLAUDE.md`'s two-implementations-at-parity rule).
- **FR-11** Existing diagram sources SHALL keep resolving: legacy `<provider>-<name>` keys
  SHALL continue to work (via a compatibility mapping / aliases) so authored `.kymo`/BPMN
  diagrams do not break on upgrade.

## 3. Non-functional requirements

- **NFR-1** **Cross-language parity** — the catalogue artifact and resolved icon records
  SHALL be identical for Python and JS, enforced by the golden conformance suite (Python is
  the reference impl and sole golden writer, per `CLAUDE.md`), not by trust.
- **NFR-2** **Byte-stable goldens** — diagrams whose icons are unaffected SHALL render
  byte-identical output; feature-specific CSS/defs SHALL be injected conditionally so the
  golden SVG / BPMN-corpus baselines do not churn (per `CLAUDE.md` gotchas).
- **NFR-3** **Dependency posture** — `packages/js` SHALL remain **zero runtime dependencies**
  (ESM + `.d.ts`); SVG-normalization tooling (SVGO, `@iconify/tools`-equivalent) MAY be a
  **build-time** dependency of the generator only.
- **NFR-4** **Payload & scale** — a per-icon payload SHALL be the SVG **body** (hundreds of
  bytes), not a full base64 PNG/SVG document; up-front load SHALL NOT require pulling the
  whole catalogue (RES-ICONS-001 §1, §6).

## 4. Constraints, assumptions, out-of-scope (v1)

- **Vectorization is sourced, not traced** — the catalogue assumes **vector originals** (the
  upstream `mingrammer/diagrams` / cloud-vendor SVGs); auto-tracing the ~2,400 raster PNGs is
  **out of scope** (RES-ICONS-001 §7.1 caveat).
- **No picker UI** — FR-5 makes the catalogue searchable; building the icon-picker UI in the
  playground / VS Code extension is a separate feature.
- **Not a hosted API** — kymo ships static per-set artifacts; running an Iconify-style HTTP
  API service is out of scope (the client may still batch from static files / a CDN base).
- **Migration** beyond legacy-key compatibility (FR-11) — bulk renaming authored diagrams is
  out of scope; aliases bridge old → new.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-04 | Vũ Anh | Initial issue — requirements for kymo Icons v2, derived from PROD-ICONS-001 needs and RES-ICONS-001 §7 lessons; traced in TEST-ICONS-001. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/02-FEATURE.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the spec; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant FR/NFR (preserving IDs); update
TEST-ICONS-001's traceability matrix and DESIGN-ICONS-001 as needed; increment `version`;
append a row to Annex A.

### B.4 Backwards Compatibility
Requirement IDs are stable; a removed requirement SHALL be marked withdrawn (not re-used)
so traceability links remain valid.

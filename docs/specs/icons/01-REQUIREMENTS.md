---
title: kymo Icons v2 — Requirements (ConOps, Stakeholder Needs & SRS)
document_id: FEAT-ICONS-001
version: "0.3"
issue_date: 2026-06-05
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers and reviewers implementing, verifying, and contextualising the kymo icon catalogue, generator, and loaders; stakeholders
review_cycle: On phase completion, or on scope change
supersedes: null
related_documents:
  - DESIGN-ICONS-001            # Design
  - TEST-ICONS-001              # Test documentation
  - PLAN-ICONS-001              # Plan
  - RES-ICONS-001               # Prior-art research (Iconify) — the evidence base
  - CR-ICONS-001                # Change-request — `kymo icons` CLI (FR-12..FR-15, proposed)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - requirements
  - conops
  - stakeholder-needs
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

# kymo Icons v2 — Requirements (ConOps, Stakeholder Needs & SRS)

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-ICONS-001                                     |
| Version      | 0.3                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-ICONS-001, TEST-ICONS-001, PLAN-ICONS-001, RES-ICONS-001, CR-ICONS-001 |

The key words **SHALL**, **SHOULD**, **MAY** are used per ISO drafting conventions. This document
is the **single requirements doc** for kymo Icons v2: it states the problem and concept (ConOps,
ISO 29148 §6.4.2), owns the `SN-ICONS` stakeholder needs, and derives the `FR`/`NFR` software
requirements (SRS) from them. Each requirement carries a stable ID for traceability from
TEST-ICONS-001; design realisation in DESIGN-ICONS-001; evidence base RES-ICONS-001; sequencing in
PLAN-ICONS-001. The `kymo icons` CLI surface (FR-12..FR-15), introduced by CR-ICONS-001, has been
**re-based into this baseline** (2026-06-05) and is now part of §5.

## 1. Problem & motivation

kymo's icon subsystem is simple and works at its current size, but every scaling property of an
icon catalogue applies once it grows. As diagnosed in RES-ICONS-001 §6, the root `icons/`
directory holds ~2,460 files / ~38 MB that are **99.9% raster PNG**, and the flat
`<provider>-<name>` key (category folder dropped, last-write-wins) yields **2,300 manifest keys
for 2,457 PNGs** — so **~157 icons are silently unreachable**, a collision rate that only grows
with the catalogue. PNGs cannot be recoloured to a diagram theme, do not scale crisply, and inline
at ~10× the payload of an SVG body. Two hand-maintained scanners (`_scan_icons_dir` in Python,
`build-manifest.mjs` in JS) must be kept byte-compatible by convention, and the manifest is a bare
`key → path` map with no dimensions, aliases, or tags — so no picker UI can search or filter it.

The Iconify research (RES-ICONS-001) establishes the prior art: store a normalized **icon record**
(`{ body, width, height }` + sparse transforms) rather than a *file*, and nearly every scaling
property — small payloads, recolouring, dedup via aliases, on-demand fetch — falls out of that one
decision. **kymo Icons v2** adopts that model and its build/distribution mechanics.

## 2. Concept & context of operations (ConOps)

- **Who:** authors who reference icons in `.kymo`/BPMN diagrams; engineers maintaining kymo's icon
  catalogue and loaders (Python and JS) at parity; future tooling such as an icon-picker UI in the
  playground / VS Code extension.
- **The artifact:** an **IconifyJSON-style icon catalogue** — per-set manifests carrying
  normalized vector icon records (`{ body, width, height }`), `prefix:name` namespacing, aliases,
  and metadata (`info`, dimensions, category/tags) — generated **once** and consumed by both the
  Python renderer and the JS loader, with **on-demand / batched** loading on the client.
- **The model (RES-ICONS-001 §2–§5):** never store a *file*; store a record and assemble an
  `<svg viewBox="left top width height">{body}</svg>` at render time. `prefix:name` makes keys
  collision-proof; aliases collapse synonyms/transformed variants instead of duplicating art;
  per-set `info`/tags make the catalogue searchable; a single generator emits the data both
  implementations read; the client fetches per-set/batched records and caches them.
- **Substrate it builds on:** the existing icon resolution in `packages/python/src/kymo/icons.py`
  and `packages/js/src/icons-loader.ts` (+ `icons-builtin.ts`), the generator + catalogue in the
  shared `packages/icons` package (`scripts/build-manifest.mjs` — see CR-ICONS-008), and the
  "two implementations at parity" rule in `CLAUDE.md`.

## 3. Goals & non-goals

- **Goals:** eliminate silent icon collisions; make icons recolourable and crisp at any scale;
  carry searchable metadata; generate the catalogue from one source consumed by both
  implementations; load on demand at scale; preserve byte-stable rendered output for diagrams
  whose icons are unaffected.
- **Non-goals (v1):** building the icon-picker UI itself (this enables it); auto-tracing the 2,400
  raster PNGs into vectors (the realistic path is **sourcing vector originals**, per RES-ICONS-001
  §7.1); becoming a hosted Iconify-compatible API service. The detailed boundary is §7.

## 4. Stakeholder needs (`SN-ICONS`)

| ID | Need |
|----|------|
| `SN-ICONS-01` | **No icon SHALL be silently unreachable.** Every vendored icon SHALL be addressable; the ~157 collisions caused by the flat `<provider>-<name>` key SHALL be eliminated. |
| `SN-ICONS-02` | Icons SHALL be **recolourable to the diagram theme and crisp at any scale** — i.e. vector with `currentColor`, not fixed-size raster. |
| `SN-ICONS-03` | The catalogue SHALL be **searchable and filterable** (carry dimensions, aliases, `info`, category/tags) so a picker UI can browse thousands of icons. |
| `SN-ICONS-04` | The icon data SHALL be a **single source of truth** consumed identically by the Python and JS implementations — no two hand-maintained scanners that can drift. |
| `SN-ICONS-05` | The catalogue SHALL **scale to thousands of icons** without bloating rendered output or up-front load — small per-icon payloads, on-demand/batched fetch, caching. |

## 5. Functional requirements

**Catalogue format (RES-ICONS-001 §2, §3 — SN-ICONS-01, 03)**
- **FR-1** Icons SHALL be addressed by a collision-proof **`prefix:name`** key; the legacy flat
  `<provider>-<name>` last-write-wins key SHALL be replaced so that **no vendored icon is silently
  unreachable** (closes the ~157 collisions of RES-ICONS-001 §6).
- **FR-2** The catalogue SHALL be stored as **per-set IconifyJSON**: `prefix`, root
  dimension/transform defaults, an `icons` map of records, an `aliases` map, and an `info` block
  (counts, author, license), per RES-ICONS-001 §2.
- **FR-3** Each icon SHALL be a normalized **`{ body, width, height }`** record storing only the
  inner SVG body (no `<svg>` wrapper), with width/height/transform present **only when they
  differ** from the set root (sparse + root defaults; `minifyIconSet`-style).
- **FR-4** **Aliases** SHALL express synonyms and transformed variants as
  `{ parent, …transforms? }`, resolved by walking the parent chain with cycle guards, so
  near-duplicate art is not stored twice (RES-ICONS-001 §3).
- **FR-5** The catalogue SHALL carry **searchable metadata** — per-icon/per-set dimensions,
  aliases, `info`, and category/tags — sufficient for a picker UI to search and filter
  (RES-ICONS-001 §7.3); the picker UI itself is out of scope (§7).

**Rendering (RES-ICONS-001 §7.1 — SN-ICONS-02)**
- **FR-6** The renderer SHALL assemble `<svg viewBox="left top width height">{body}</svg>` from a
  record at the requested size, and icons SHALL be **recolourable** via `currentColor` and **crisp
  at any scale** (vector, not fixed-size raster `<image>`).
- **FR-7** Inlining SHALL be **`id`/`defs`-safe**: repeated icons in one document SHALL NOT collide
  on element identifiers (replacing the whole-document `_svg_as_inline()` behaviour of
  RES-ICONS-001 §6).

**Build & distribution (RES-ICONS-001 §4, §5 — SN-ICONS-04, 05)**
- **FR-8** A **single generator** SHALL produce the catalogue from source art through a normalize
  pipeline (`cleanupSVG → parseColors(currentColor) → SVGO/minify → validate → deduplicate-to-aliases
  → minify-to-root`), and **both** the Python renderer and the JS loader SHALL consume that one
  artifact rather than each re-scanning `icons/` — replacing the two hand-maintained scanners
  (RES-ICONS-001 §7.4).
- **FR-9** The client loader SHALL support **on-demand / batched** loading — fetching only the
  referenced icons of a set and **caching** the result (in memory; `localStorage` where available),
  with a recorded **missing** set so a name is not re-requested (RES-ICONS-001 §5).

**Surface & parity (SN-ICONS-04)**
- **FR-10** The feature SHALL exist with **equivalent functionality** in both `packages/python`
  and `packages/js` (per `CLAUDE.md`'s two-implementations-at-parity rule).
- **FR-11** Existing diagram sources SHALL keep resolving: legacy `<provider>-<name>` keys SHALL
  continue to work (via a compatibility mapping / aliases) so authored `.kymo`/BPMN diagrams do not
  break on upgrade.

**CLI surface (CR-ICONS-001 — `kymo icons` command group; re-based into this baseline 2026-06-05)**
- **FR-12** The CLI SHALL expose an icon command **namespace `kymo icons <verb>`** with verbs
  `list`, `search`, `describe`, `download`. `icons` SHALL be the **only** reserved first token; any
  other first token SHALL be treated as a converter source path, so the verb-less converter grammar
  is unchanged. The namespace SHALL exist with equivalent verbs/output in both packages (parity, FR-10).
- **FR-13** `kymo icons list [provider]` SHALL enumerate icon sets with their `info` (count/
  categories); with `provider` it SHALL list that set's icons; `--json` SHALL emit a stable list.
- **FR-14** `kymo icons search <query>` SHALL match name/alias/category and return `prefix:name`,
  resolving **offline** by default; `--remote` MAY additionally query the Iconify API; `--provider`/
  `--limit`/`--json` filter/format. An empty result is success (exit 0, empty list).
- **FR-15** `kymo icons describe <prefix:name>` SHALL print the resolved record metadata (dims,
  alias chain, set `info`, category, source path), `--json` for machine use; `kymo icons download
  <prefix:name>...` SHALL vendor icons, running the FR-8 normalize pipeline when `--from iconify`
  and re-syncing the manifest; `-o`/`-y` set the directory / skip the prompt.

## 6. Non-functional requirements

- **NFR-1** **Cross-language parity** — the catalogue artifact and resolved icon records SHALL be
  identical for Python and JS, enforced by the golden conformance suite (Python is the reference
  impl and sole golden writer, per `CLAUDE.md`), not by trust.
- **NFR-2** **Byte-stable goldens** — diagrams whose icons are unaffected SHALL render
  byte-identical output; feature-specific CSS/defs SHALL be injected conditionally so the golden
  SVG / BPMN-corpus baselines do not churn (per `CLAUDE.md` gotchas).
- **NFR-3** **Dependency posture** — `packages/js` SHALL remain **zero runtime dependencies**
  (ESM + `.d.ts`); SVG-normalization tooling (SVGO, `@iconify/tools`-equivalent) MAY be a
  **build-time** dependency of the generator only.
- **NFR-4** **Payload & scale** — a per-icon payload SHALL be the SVG **body** (hundreds of bytes),
  not a full base64 PNG/SVG document; up-front load SHALL NOT require pulling the whole catalogue
  (RES-ICONS-001 §1, §6).

## 7. Constraints, assumptions, out-of-scope (v1)

- **Vectorization is sourced, not traced** — the catalogue assumes **vector originals** (the
  upstream `mingrammer/diagrams` / cloud-vendor SVGs); auto-tracing the ~2,400 raster PNGs is **out
  of scope** (RES-ICONS-001 §7.1 caveat).
- **No picker UI** — FR-5 makes the catalogue searchable; building the icon-picker UI in the
  playground / VS Code extension is a separate feature.
- **Not a hosted API** — kymo ships static per-set artifacts; running an Iconify-style HTTP API
  service is out of scope (the client may still batch from static files / a CDN base).
- **Migration** beyond legacy-key compatibility (FR-11) — bulk renaming authored diagrams is out of
  scope; aliases bridge old → new.

## 8. Terms and abbreviations

- **Icon record** — the stored unit: `{ body, width, height }` + sparse transforms; *not* a file.
  The renderer wraps `body` in `<svg viewBox="left top width height">…</svg>`.
- **Body** — the inner SVG (`<path>`, `<g>`…) without the `<svg>` wrapper.
- **IconifyJSON** — the per-set JSON format: `prefix`, root defaults, `icons`, `aliases`, `info`,
  optional `chars` (RES-ICONS-001 §2).
- **`prefix:name`** — the global icon address (e.g. `mdi:home`); collision-proof namespace.
- **Alias** — `{ parent, …transforms? }`: a synonym or transformed variant resolved by walking the
  parent chain (RES-ICONS-001 §3).
- **Batch loading** — fetching only the referenced icons of a set in one request, then caching
  (RES-ICONS-001 §5).

## 9. Document map

This feature uses a two-layer model in this folder — a **baselined spec** (`01-REQUIREMENTS` →
`03-TEST`) and a **living plan** (`04-PLAN.md` + `CR/`):

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` | `FEAT-ICONS-001` | *what problem, whose needs (`SN-ICONS`), and what must it do (`FR`/`NFR`)?* |
| 02 | `02-DESIGN.md` | `DESIGN-ICONS-001` | *how is it built?* |
| 03 | `03-TEST.md` | `TEST-ICONS-001` | *how do we know it's right?* |
| 04 | `04-PLAN.md` | `PLAN-ICONS-001` | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are
a reading-order aid only. The prior-art evidence base is **RES-ICONS-001**. A change to this
baselined spec is raised as a change-request folder under `docs/specs/icons/CR/` and re-baselined
(bump version + record in Annex A).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-04 | Vũ Anh | Initial issue (as `02-FEATURE.md`) — requirements FR-1..FR-11/NFR-1..NFR-4 for kymo Icons v2, derived from the `SN-ICONS` needs and RES-ICONS-001 §7. |
| 0.2     | 2026-06-05 | Vũ Anh | Consolidated the spec set: merged the product description (`FEAT-ICONS-001` — problem, ConOps, goals, `SN-ICONS-01..05`) and the introduction (`FEAT-ICONS-001` — concept, terms, document map) into this single requirements document; renamed to `01-REQUIREMENTS.md`. Both former document_ids are retired; FR/NFR/SN IDs unchanged. |
| 0.3     | 2026-06-05 | Vũ Anh | Re-based CR-ICONS-001 into the baseline: FR-12..FR-15 (`kymo icons` CLI) added to §5; the §5 "proposed" note removed. Implemented + verified across P1–P6. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/01-REQUIREMENTS.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the spec; available to all repository readers.

### B.3 Change Control
Adding/changing a need or requirement requires: edit the relevant SN/FR/NFR (preserving IDs);
update TEST-ICONS-001's traceability matrix and DESIGN-ICONS-001 / PLAN-ICONS-001 as needed;
increment `version`; append a row to Annex A. New stakeholder needs are minted here, through a
baseline or an approved change-request under `CR/`.

### B.4 Backwards Compatibility
SN/FR/NFR IDs are stable; a removed item SHALL be marked withdrawn (not re-used) so traceability
links remain valid. The retired `FEAT-ICONS-001` / `FEAT-ICONS-001` document_ids are not re-used.

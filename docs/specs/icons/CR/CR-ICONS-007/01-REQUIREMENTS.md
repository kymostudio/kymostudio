---
title: "Icons CR-007 — Vendored inline sets + the `ai` group: scope & rationale"
document_id: CR-ICONS-007
version: "0.1"
issue_date: 2026-06-06
status: Implemented
classification: Internal
owner: diagrams/ project
audience: kymo Icons v2 maintainers / reviewers; engineers adding non-file-backed (inline) icon sets
review_cycle: Until closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - DESIGN-ICONS-CR007          # CR design — CR-ICONS-007/02-DESIGN
  - TEST-ICONS-CR007            # CR verification — CR-ICONS-007/03-TEST
  - PLAN-ICONS-CR007            # CR plan — CR-ICONS-007/04-PLAN
  - ICONS-MAP-001               # Catalogue-format doc — updated with §2.1 vendored inline sets
  - FEAT-ICONS-001              # Baseline requirements — realises FR-2/FR-3/FR-6/FR-7/FR-13/FR-15
  - DESIGN-ICONS-001            # Baseline design
  - CR-ICONS-004                # P3 — per-set IconifyJSON + collections index (extended here)
  - CR-ICONS-005                # P4 — vector record rendering (reused for inline bodies)
  - CR-ICONS-001                # P6 — kymo icons CLI (list/describe surface the inline set)
  - RES-ICONS-001               # Prior-art research (Iconify distribution model)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - iconify-json
  - inline-body
  - vendored-set
  - brand-logos
  - ai
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# Icons CR-007 — Vendored inline sets + the `ai` group

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | CR-ICONS-007                                       |
| Version      | 0.1                                                |
| Status       | Implemented                                        |
| Issue Date   | 2026-06-06                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-ICONS-CR007, TEST-ICONS-CR007, PLAN-ICONS-CR007, ICONS-MAP-001, FEAT-ICONS-001, CR-ICONS-004, CR-ICONS-005, CR-ICONS-001 |

> **Implementation change-request** adding a **vendored inline icon set** capability — a set
> distributed the way Iconify itself distributes one (`@iconify-json/<prefix>`): a single
> `sets/<prefix>.json` whose records carry the SVG **`body` inline**, with no backing files under
> `icons/`. It lands the first such set, **`ai`**, with three foundation-model brand logos. Sibling
> layers: [`02-DESIGN`](02-DESIGN.md) (`DESIGN-ICONS-CR007`) · [`03-TEST`](03-TEST.md)
> (`TEST-ICONS-CR007`) · [`04-PLAN`](04-PLAN.md) (`PLAN-ICONS-CR007`).

The key words **SHALL**, **SHOULD**, **MAY** are used per ISO drafting conventions.

## 1. Motivation

The catalogue (P1–P4) addresses **file-backed** sets only: every address resolves to a raster/vector
file scanned from `icons/<provider>/`. Some sets — notably **brand logos** — are best vendored the
way Iconify ships them: one self-contained `icons.json` with the SVG `body` inline, brand fills and
gradients intact, no raster intermediary. kymo's IconifyJSON shape (P3) and its inline-record
renderer (P4, `render_record`) already support this; what is missing is (a) a loader path that
resolves an **inline** address whose set has no source files, and (b) generator/index handling so a
hand-authored set survives `npm run build-manifest`. This CR closes that gap and uses it to add an
`ai` group of model-provider logos, as requested.

## 2. Change (summary)

- **Inline set resolution** — both loaders resolve a `prefix:name` address that is **not** in the
  flat manifest by loading its `sets/<prefix>.json` on demand; when the record carries `body` it is
  rendered via the P4 record path (id-safe per use, FR-7), never fetched as a file.
- **Generator** — `build-manifest.mjs` folds vendored inline `sets/*.json` (those it did not
  generate from `icons/`) into `icons-collections.json`, with deterministic sorted keys, so they are
  not dropped on rebuild.
- **The `ai` set** — `packages/icons/sets/ai.json` (the catalogue's source-of-truth package — see
  CR-ICONS-008), three icons under category `provider`: `ai:openai`, `ai:anthropic`, `ai:gemini`,
  sourced from Iconify's `logos` collection (CC0-1.0), brand colours preserved. Discoverable through
  `kymo icons list ai` / `describe`.
- **Catalogue-format doc** — `ICONS-MAP-001` gains §2.1 documenting vendored inline sets.

The mechanism, loader changes, and provenance are detailed in **DESIGN-ICONS-CR007**.

## 3. Baseline requirements realised

No new requirement ID. This CR exercises existing baseline FRs for a new class of set:
**FR-2/FR-3** (per-set IconifyJSON, sparse records), **FR-6/FR-7** (themeable/crisp record render,
id-safe inlining — here brand art is rendered verbatim, ids still namespaced), **FR-13/FR-15**
(`list`/`describe` over the set). Verification is **TEST-ICONS-CR007** plus the unchanged full suite.

## 4. Constraints, assumptions, out-of-scope

- **Byte-stable goldens (NFR-2).** No existing diagram uses `ai:` icons, and no `icons/` file is
  added, so `icons-manifest.json` and every `sets/<provider>.json` stay byte-identical; only
  `icons-collections.json` gains the `ai` row. Golden SVG / BPMN baselines SHALL NOT churn.
- **Zero runtime deps (NFR-3).** The set is vendored as static JSON; sourcing used the build-time
  CLI / Iconify API, not a runtime dependency.
- **Brand colour.** Vendored brand art keeps its own fills/gradients — the `currentColor` recolour
  SHALL NOT be applied to it (it is not a monochrome glyph).
- **Out of scope.** Aliases for the `ai` set, additional providers/categories, and migrating
  file-backed sets to inline — future increments.

## 5. Acceptance

- `ai:openai`, `ai:anthropic`, `ai:gemini` resolve and render as inline `<svg viewBox=…>` in **both**
  implementations, with brand colours and per-use unique ids.
- `kymo icons list` shows `ai` (3 icons, `provider`); `list ai` and `describe ai:openai` work offline
  on both sides; `npm run build-manifest` keeps `ai` in the collections index.
- Full Python + JS suites green; goldens and BPMN baselines unchanged.

## 6. Change record

| Date | Actor | Decision |
|------|-------|----------|
| 2026-06-06 | Vũ Anh | **Raised + implemented.** Add vendored inline-set capability and the `ai` group (openai/anthropic/gemini, logos/CC0); generator folds inline sets into collections; format doc §2.1 added. |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial — vendored inline IconifyJSON sets + the `ai` brand-logo group. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-007/01-REQUIREMENTS.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
Implementation CR; mints no requirement IDs of its own. Edits increment `version` and append to
Annex A.

### B.4 Backwards Compatibility
Additive — a new set and a new resolution path; alters no existing address, artifact byte-image
(beyond the `ai` collections row), or rendered output.

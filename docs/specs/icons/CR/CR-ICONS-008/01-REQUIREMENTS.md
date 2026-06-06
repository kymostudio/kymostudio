---
title: "Icons CR-008 — Catalogue extracted to packages/icons (single source of truth)"
document_id: CR-ICONS-008
version: "0.1"
issue_date: 2026-06-06
status: Implemented
classification: Internal
owner: diagrams/ project
audience: kymo Icons v2 maintainers / reviewers; engineers touching the catalogue, generator, or either loader's resolution paths
review_cycle: Until closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - DESIGN-ICONS-CR008          # CR design — CR-ICONS-008/02-DESIGN
  - TEST-ICONS-CR008            # CR verification — CR-ICONS-008/03-TEST
  - PLAN-ICONS-CR008            # CR plan — CR-ICONS-008/04-PLAN
  - ICONS-MAP-001               # Catalogue-format doc — §2 rewritten for packages/icons
  - DESIGN-ICONS-001            # Baseline design — §1/§4 generator location reconciled
  - CR-ICONS-003                # P2 — single generator / source of truth (this relocates that artifact)
  - CR-ICONS-007                # Vendored inline sets + ai group (shipped together)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - monorepo
  - source-of-truth
  - packages/icons
  - build-copy
  - packaging
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# Icons CR-008 — Catalogue extracted to `packages/icons`

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | CR-ICONS-008                                       |
| Version      | 0.1                                                |
| Status       | Implemented                                        |
| Issue Date   | 2026-06-06                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-ICONS-CR008, TEST-ICONS-CR008, PLAN-ICONS-CR008, ICONS-MAP-001, DESIGN-ICONS-001, CR-ICONS-003, CR-ICONS-007 |

> **Implementation change-request** consolidating the icon catalogue — **raw art, the generator,
> and the generated index** — into a single shared package, `packages/icons`, as the one committed
> source of truth for both implementations (previously split across the repo-root `icons/` art and
> the `packages/js` catalogue). Sibling layers: [`02-DESIGN`](02-DESIGN.md) (`DESIGN-ICONS-CR008`) ·
> [`03-TEST`](03-TEST.md) (`TEST-ICONS-CR008`) · [`04-PLAN`](04-PLAN.md) (`PLAN-ICONS-CR008`).

The key words **SHALL**, **SHOULD**, **MAY** are used per ISO drafting conventions.

## 1. Motivation

P2 (CR-ICONS-003) made one generator the single source of truth, but its **output and inputs stayed
inside `packages/js`** (catalogue) and the **repo root** (art), while `packages/python` reached
*into* the JS package to read them. That coupling is backwards: the catalogue is shared data owned by
neither language package. Promoting it to its own package makes the ownership explicit, lets either
implementation depend on it symmetrically, and removes the cross-package reach.

## 2. Change (summary)

- **New package `packages/icons`** (private `@kymostudio/icons`) holds `icons/<provider>/…` art,
  `scripts/build-manifest.mjs`, and the generated index (`icons-manifest.json`,
  `icons-collections.json`, `sets/`). It is the **only committed copy**.
- **Python** resolves the catalogue from `packages/icons` (`_ICONS_PKG`); `_REPO_ROOT` stays the real
  repo root for `docs/`/`samples/`/`bin/` lookups.
- **JS** build-copies only the **index** (not the art) into `packages/js` at `prebuild`/`prepack`
  (`scripts/sync-icons.mjs`); the copies are **git-ignored**, so the published npm tarball is
  self-contained while `packages/js` keeps **zero runtime dependencies** (NFR-3). The `kymo icons`
  CLI reads `packages/icons` when present, else its own bundled copies.
- **Website** points the inlined manifest + the jsDelivr base URL at `…@main/packages/icons`
  (this also fixes on-demand per-set fetches — e.g. inline `ai:` — that previously resolved against
  the repo root).
- **CI** runs the icon-freshness gate against `packages/icons`.

The package layout, resolution rules, and packaging mechanics are in **DESIGN-ICONS-CR008** and the
reconciled **ICONS-MAP-001 §2**.

## 3. Baseline requirements realised

No new requirement ID. This relocates the artifact that realises **FR-8 / NFR-1** (single source of
truth, record parity) and preserves **NFR-2** (byte-stable goldens) and **NFR-3** (zero runtime deps).

## 4. Constraints, assumptions, out-of-scope

- **Pure move (NFR-2).** Manifest path strings (`icons/<provider>/…`) are unchanged — only the base
  they resolve against moves — so `icons-manifest.json` / `sets/*.json` are byte-identical and
  goldens / BPMN baselines SHALL NOT churn. Git records the ~2,460 files as renames.
- **Zero runtime deps (NFR-3).** `packages/js` SHALL NOT gain a runtime dependency on
  `packages/icons`; it build-copies the index instead.
- **Graceful degradation.** A pip-installed Python tree without `packages/icons` falls back to the
  hand-coded built-in glyphs, as before.
- **Out of scope.** Publishing `packages/icons` to a registry; moving `samples/`/other root assets.

## 5. Acceptance

- The catalogue lives only in `packages/icons`; both implementations resolve through it; `packages/js`
  copies are git-ignored and reproduced by `sync-icons`.
- `npm run build-manifest` (in `packages/icons`) regenerates byte-identical output; the CI freshness
  gate runs there. Full Python + JS suites green; goldens + BPMN baselines unchanged.
- The published `packages/js` tarball still ships the index and stays zero-runtime-dep.

## 6. Change record

| Date | Actor | Decision |
|------|-------|----------|
| 2026-06-06 | Vũ Anh | **Raised + implemented.** Extract art + generator + index into `packages/icons` (SSOT); Python reads it directly, JS build-copies the git-ignored index; website/CI/CLI repointed. Shipped with CR-ICONS-007. |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial — catalogue consolidation into `packages/icons`. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-008/01-REQUIREMENTS.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
Implementation CR; mints no requirement IDs of its own. Edits increment `version` and append to
Annex A.

### B.4 Backwards Compatibility
Additive/relocating — no address, artifact byte-image, or rendered output changes; only file
locations and resolution bases move.

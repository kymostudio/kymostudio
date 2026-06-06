---
title: kymo Icons v2 — Test Documentation
document_id: TEST-ICONS-001
version: "0.2"
issue_date: 2026-06-04
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the kymo icon catalogue, generator, renderer, and loaders
review_cycle: On phase completion, or on scope change
supersedes: null
related_documents:
  - FEAT-ICONS-001              # Requirements (ConOps + SN + SRS; traced below)
  - DESIGN-ICONS-001            # Design
  - PLAN-ICONS-001              # Plan
  - RES-ICONS-001               # Prior-art research (Iconify)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - test
  - conformance
  - traceability
  - parity
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# kymo Icons v2 — Test Documentation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-ICONS-001                                     |
| Version      | 0.2                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-06-04                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-ICONS-001, DESIGN-ICONS-001, PLAN-ICONS-001 |

Verifies FEAT-ICONS-001 (FR/NFR IDs). Covers 12207 Verification & Validation. The headline
checks are **no unreachable icons**, **cross-language record parity**, and **byte-stable
goldens for unaffected diagrams**.

## 1. Test approach and levels

- **Unit** — `prefix:name` parsing/validation; sparse + root-default resolution; alias chain
  resolution (synonym, transform, cycle guard); `<svg>` assembly from a record at a target
  size; `currentColor` recolouring; `id`/`defs`-safe inlining.
- **Catalogue** — generator output is deterministic; every source icon is addressable (no
  collisions); legacy `<provider>-<name>` keys still resolve.
- **Cross-language conformance** — Python and JS resolve the **same record** (body +
  effective dims) for the same `prefix:name`; rides the golden conformance suite with Python
  as sole golden writer.
- **Regression** — golden SVG + BPMN-corpus baselines stay byte-identical for diagrams whose
  icons are unaffected (feature defs/CSS injected only when used).

## 2. Test items, environment, tooling

`packages/python` (`uv run --group dev python -m pytest` — icon unit tests +
`tests/test_conformance.py`, golden `tests/test_diagrams.py` / `test_bpmn_corpus.py`),
`packages/js` (`npm test` → `node --test` — icon loader tests + `conformance.test.js`), and
the generator (`packages/icons/scripts/`, the shared source-of-truth package — CR-ICONS-008).
No new **runtime** dependency (NFR-3).

## 3. Test cases

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-1** | No unreachable icons | FR-1 | Every source icon is addressable by a unique `prefix:name`; the ~157 legacy collisions are gone (count source icons == count addressable keys) |
| **TC-2** | IconifyJSON shape | FR-2, FR-3 | Per-set artifact has `prefix`/root defaults/`icons`/`aliases`/`info`; records are sparse (dims present only when differing from root) |
| **TC-3** | Alias resolution | FR-4 | Synonym → parent body; transform alias applies `rotate`/`hFlip`/`vFlip`; a cycle is rejected, not looped |
| **TC-4** | Searchable metadata | FR-5 | Dimensions, aliases, `info`, category/tags are present and queryable for a sample set |
| **TC-5** | Render & recolour | FR-6 | A record renders as `<svg viewBox=…>{body}</svg>` at the requested size; `currentColor` adopts the theme colour; output scales without raster blur |
| **TC-6** | `id`/`defs`-safe inlining | FR-7 | The same icon used N times in one document produces no duplicate/colliding element `id`s |
| **TC-7** | One source of truth | FR-8, NFR-1 | Both implementations consume the generated artifact (no second scanner); resolved records match across Python/JS in the conformance suite |
| **TC-8** | On-demand / batched load | FR-9, NFR-4 | A page referencing K icons of a set fetches those K (batched, one request/prefix) and caches; `missing` prevents re-request; whole catalogue not pulled up front |
| **TC-9** | Parity surface | FR-10 | Equivalent icon API exists and behaves equivalently in `packages/python` and `packages/js` |
| **TC-10** | Legacy keys still resolve | FR-11 | Existing `.kymo`/BPMN diagrams using `<provider>-<name>` keys render unchanged |
| **TC-11** | Byte-stable goldens | NFR-2 | Golden SVG + BPMN-corpus baselines unchanged for diagrams whose icons are unaffected |
| **TC-12** | Dependency posture | NFR-3 | `packages/js` carries zero new **runtime** deps; normalization tooling is build-time only |
| **TC-13** | `icons list` enumeration | FR-12, FR-13 | `kymo icons list` lists every set with counts/categories; `list <provider>` filters; `--json` stable; exit 0 |
| **TC-14** | `icons search` offline + remote | FR-14 | `search lambda` finds `aws:…lambda` offline; `--remote` merges Iconify matches; `--provider`/`--limit` constrain; empty result exits 0 with empty list |
| **TC-15** | `icons describe` + errors | FR-15 | `describe <addr>` reports dims/alias chain/set `info`/category/source; `--json` stable; unknown/malformed key exits non-zero |
| **TC-16** | `icons download` pipeline + parity | FR-12, FR-15 | `download --from iconify` writes a **normalized** record (currentColor, not raw) and re-syncs; Python and JS yield equivalent `--json`/exit codes; the converter stays byte-identical (only `icons` is reserved) |

> TC-13..16 were introduced by CR-ICONS-001 and **re-based into this baseline** (2026-06-05).

## 4. Pass/fail criteria

A phase passes when its mapped cases pass and the full Python suite + JS `npm test` are
green. A cross-language record mismatch is a **failure** to reconcile toward Python (sole
golden writer), not a re-baseline. A golden/baseline change is only accepted with an
intentional, reviewed regeneration (`KYMO_UPDATE_GOLDEN` / `KYMO_UPDATE_BPMN_BASELINE` /
`KYMO_UPDATE_CONFORMANCE`, per `CLAUDE.md`).

## 5. Requirements traceability matrix

| Requirement | Test case(s) |
|-------------|--------------|
| FR-1 | TC-1 |
| FR-2 | TC-2 |
| FR-3 | TC-2 |
| FR-4 | TC-3 |
| FR-5 | TC-4 |
| FR-6 | TC-5 |
| FR-7 | TC-6 |
| FR-8 | TC-7 |
| FR-9 | TC-8 |
| FR-10 | TC-9 |
| FR-11 | TC-10 |
| NFR-1 | TC-7 |
| NFR-2 | TC-11 |
| NFR-3 | TC-12 |
| NFR-4 | TC-8 |
| FR-12 | TC-13, TC-16 |
| FR-13 | TC-13 |
| FR-14 | TC-14 |
| FR-15 | TC-15, TC-16 |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-04 | Vũ Anh | Initial issue — test documentation for kymo Icons v2 (catalogue, generator, render/recolour, on-demand load, parity, byte-stable goldens). |
| 0.2     | 2026-06-05 | Vũ Anh | Re-based CR-ICONS-001: added TC-13..16 (`kymo icons` CLI) + their traceability rows (FR-12..15). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/03-TEST.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the spec; available to all repository readers.

### B.3 Change Control
When a requirement changes, update the affected test case(s) and the traceability matrix in
the same revision; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are stable; a removed case SHALL be marked withdrawn (not re-used) so
traceability links remain valid.

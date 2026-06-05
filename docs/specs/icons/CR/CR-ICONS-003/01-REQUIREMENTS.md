---
title: "Icons CR-003 — P2 One generator / single source of truth: scope, rationale & schedule"
document_id: CR-ICONS-003
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: kymo Icons v2 maintainers / reviewers; engineers building the icon generator and wiring both packages to it
review_cycle: Until closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - DESIGN-ICONS-CR003          # CR design — CR-ICONS-003/02-DESIGN
  - TEST-ICONS-CR003            # CR verification (TC-7, TC-9, TC-12) — CR-ICONS-003/03-TEST
  - PLAN-ICONS-CR003            # CR plan (phase P2) — CR-ICONS-003/04-PLAN
  - FEAT-ICONS-001              # Baseline requirements — realises FR-8, FR-10, NFR-1, NFR-3 (no new FR)
  - DESIGN-ICONS-001            # Baseline design — §4 generator
  - TEST-ICONS-001              # Baseline test — TC-7, TC-9, TC-12
  - PLAN-ICONS-001              # Baseline plan — phase P2
  - RES-ICONS-001               # Prior-art research (Iconify build pipeline §4)
  - CR-ICONS-002                # P1 — provides the key rule + legacy map this generator owns
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - generator
  - single-source-of-truth
  - parity
  - zero-dependency
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# Icons CR-003 — P2 One generator / single source of truth

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | CR-ICONS-003                                       |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-ICONS-CR003, TEST-ICONS-CR003, PLAN-ICONS-CR003, FEAT-ICONS-001, DESIGN-ICONS-001, TEST-ICONS-001, PLAN-ICONS-001, RES-ICONS-001, CR-ICONS-002 |

> **Implementation change-request** realising **baseline phase P2** of `PLAN-ICONS-001`. Adds **no
> requirement**: it schedules, designs, and verifies the existing **FR-8, FR-10, NFR-1, NFR-3**.
> On completion the P2 row of `PLAN-ICONS-001` flips to **Done** (Annex C worklog) — no requirement
> re-base. **Status: Open** — raised, not started; **depends on P1 (CR-ICONS-002)**. Sibling layers:
> [`02-DESIGN`](02-DESIGN.md) (`DESIGN-ICONS-CR003`) ·
> [`03-TEST`](03-TEST.md) (`TEST-ICONS-CR003`, TC-7/TC-9/TC-12) ·
> [`04-PLAN`](04-PLAN.md) (`PLAN-ICONS-CR003`, phase P2).

The key words **SHALL**, **SHOULD**, **MAY** are used per ISO drafting conventions.

## 1. Motivation

kymo maintains **two hand-written scanners** — `_scan_icons_dir()` (Python) and
`build-manifest.mjs` (JS) — kept byte-compatible **by convention** (RES-ICONS-001 §6, §7.4). They
*will* drift. P2 replaces them with a **single generator** that emits one artifact both the Python
renderer and the JS loader consume (FR-8), removing the divergence risk at the source and giving
the catalogue a deterministic, diffable build. It also locks the **parity** discipline (NFR-1) and
preserves the JS **zero-runtime-dependency** posture (NFR-3) by keeping normalization tooling
build-time only. P2 builds directly on the key rule + legacy map produced by P1 (CR-ICONS-002),
which the generator now owns.

## 2. Change (summary)

Promote `scripts/build-manifest.mjs` into a real **generator** and wire both packages to its output:

- **One generator** runs the importer/normalize pipeline (RES-ICONS-001 §4) and emits the
  catalogue artifact (FR-8); at P2 the output is at least the keyed/aliased manifest (the full
  IconifyJSON metadata lands in P3).
- **Both packages consume it** — `icons.py` and `icons-loader.ts` read the generated artifact
  instead of each re-scanning `icons/`; the second scanner is **retired**.
- **Parity gate** — resolved records are compared in the golden conformance suite, Python as sole
  golden writer (NFR-1).
- **Dependency posture** — `packages/js` stays zero-runtime-dep; SVGO / `@iconify/tools`-equivalent
  are build-time-only deps of the generator (NFR-3).

The generator architecture and the two-package wiring are in **DESIGN-ICONS-CR003**.

## 3. Baseline requirements realised (no new requirement)

| Baseline req | Statement (unchanged) | Verified by |
|--------------|------------------------|-------------|
| **FR-8** | A single generator produces the catalogue; both impls consume that one artifact (two scanners retired) | TC-7 |
| **FR-10** | Equivalent functionality in `packages/python` and `packages/js` (parity) | TC-9 |
| **NFR-1** | Cross-language parity enforced by the golden conformance suite (Python reference) | TC-7 |
| **NFR-3** | `packages/js` zero runtime deps; normalization tooling build-time only | TC-12 |

## 4. Constraints, assumptions, out-of-scope

- **Depends on P1.** The generator owns the P1 key rule + legacy map (CR-ICONS-002); P2 SHALL NOT
  start before P1's addressing lands.
- **Metadata is P3.** P2 unifies the *build*; enriching the artifact with `info`/aliases/tags/dims
  (IconifyJSON) is **P3 (CR-ICONS-004)**.
- **Vectorization is P4.** The normalize pipeline's color/SVGO steps only matter once vector source
  art exists; at P2 the pipeline scaffolding may be present but operates on whatever art exists.
- **Determinism.** Generator output SHALL be deterministic (stable ordering) so it is diffable and
  parity-checkable.

## 5. Acceptance

- Both `icons.py` and `icons-loader.ts` resolve from the **generated artifact**; the second scanner
  is deleted — TC-7.
- The conformance suite gates resolved-record parity across Python/JS — TC-7, NFR-1.
- `packages/js` declares **zero new runtime dependency**; generator deps are `devDependencies` only
  — TC-12.
- Equivalent icon API/behaviour in both packages — TC-9.

## 6. Change record

| Date | Actor | Decision |
|------|-------|----------|
| 2026-06-05 | Vũ Anh | **Raised (Open).** Maps baseline phase P2 onto an implementation CR realising FR-8/FR-10/NFR-1/NFR-3; depends on P1 (CR-ICONS-002). Not started. |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial raise — P2 single generator / single source of truth, mapped from PLAN-ICONS-001 phase P2. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-003/01-REQUIREMENTS.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
Implementation CR; no requirement IDs of its own. On completion, flip the P2 row of
`PLAN-ICONS-001` to Done + append Annex C. Until then, edits increment `version` and append to Annex A.

### B.4 Backwards Compatibility
FR-8/FR-10/NFR-1/NFR-3 IDs are owned by `FEAT-ICONS-001` and unchanged here.

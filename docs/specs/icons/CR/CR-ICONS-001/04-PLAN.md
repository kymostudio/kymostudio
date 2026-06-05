---
title: "Icons CR-001 — Implementation Plan: `kymo icons` command group"
document_id: PLAN-ICONS-CR001
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineer implementing the `kymo icons` CLI (packages/python cli.py + packages/js bin)
review_cycle: Until CR-ICONS-001 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-001                # CR lead doc — motivation + requirements (FR-12..FR-15)
  - DESIGN-ICONS-CR001          # CR design
  - TEST-ICONS-CR001            # CR verification
  - PLAN-ICONS-001              # Baseline plan (P1..P5) this delta extends with P6
  - RES-CLI-001                 # Prior-art research (FFmpeg CLI)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - cli
  - plan
  - phase
  - estimate
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-001 — Implementation Plan

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-ICONS-CR001                                   |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-001, DESIGN-ICONS-CR001, TEST-ICONS-CR001, PLAN-ICONS-001, RES-CLI-001 |

Plans the realisation of **CR-ICONS-001** / **DESIGN-ICONS-CR001**, verified by
**TEST-ICONS-CR001**. Adds a single phase **P6** to the baseline `PLAN-ICONS-001` (P1..P5
unchanged). **Status: proposed** — not started; gated behind baseline phase P3.

## 1. Scope and dependency

Add the `kymo icons` command namespace (`list`/`search`/`describe`/`download`) to both packages.
The phase is **dependency-ordered after baseline P3** (the FR-5 metadata manifest), because
`search`/`describe`/`list` are only meaningful once dims/aliases/`info`/tags exist; the
`download --from iconify` path additionally leans on the generator/normalize pipeline of
baseline **P2/P4**. P6 does **not** block P1..P5.

## 2. Work breakdown (sub-steps of P6)

| Step | Work | Reqs | Verifies |
|------|------|------|----------|
| **P6.1** | First-token dispatcher in `cli.py` (`argv[0]=="icons"` before converter path) + usage/help; the pathological `-i icons` escape | FR-12 | TC-16 (converter unaffected) |
| **P6.2** | `icons list` + `icons describe` over the per-set manifest (read-only, offline) incl. `--json` + exit codes | FR-13, FR-15 | TC-13, TC-15 |
| **P6.3** | `icons search` (offline match name/alias/tag/category) + `--provider`/`--limit`/`--json`; then `--remote` via Iconify `/search` (stdlib HTTP) | FR-14 | TC-14 |
| **P6.4** | `icons download` (local copy) then `--from iconify` through the FR-8 normalize pipeline + manifest re-sync | FR-15 | TC-16 |
| **P6.5** | New `packages/js` `bin` (hand-rolled parser, zero-dep) mirroring the verbs; parity suite | FR-12, NFR-1, NFR-3 | TC-16 (parity) |

## 3. Phase added to the baseline plan

| ID | Phase | Deliverables | Depends on | Reqs | Points | Status |
|----|-------|--------------|------------|------|--------|--------|
| **P6** | Icon CLI (`kymo icons`) | `list`/`search`/`describe`/`download` in both packages; hand-rolled JS arg parser + new `bin`; help, `--json`, exit codes; tests TC-13..TC-16 | baseline **P3** (metadata); `download --from iconify` also baseline **P2/P4** (pipeline) | FR-12..FR-15 | 8 | ⬜ Planned |

**Revised baseline estimate:** 34 → **42 pts** (P1 5 · P2 5 · P3 8 · P4 13 · P5 3 · **P6 8**).

## 4. Risks and mitigations

- **Premature without metadata** — shipping `search`/`describe` before P3 yields a thin surface
  over a `key→path` map (no tags/aliases). *Mitigation:* gate P6 behind P3; P6.2/P6.3 read the
  IconifyJSON manifest, not the legacy flat manifest.
- **Disambiguation surprise** — reserving `icons` could shadow a source file named `icons`.
  *Mitigation:* only the exact first token is reserved; `-i icons` / `./icons` escapes it;
  documented in help and covered by TC-16.
- **Converter byte-drift** — a CLI refactor in `cli.py` could perturb converter output.
  *Mitigation:* TC-16 asserts `kymo x.kymo` / `-t svg` stay byte-identical; golden suites gate.
- **JS zero-dep pressure** — a parser/HTTP lib would violate NFR-3. *Mitigation:* hand-rolled
  parser + built-in `fetch`; the flat verb grammar (DESIGN-ICONS-CR001 §2) keeps this tractable.
- **Live-network flakiness** — `--remote`/`--from` tests must not hit the real Iconify API.
  *Mitigation:* mock the endpoint; offline tests forbid the HTTP layer (TC-14).

## 5. Verification

Approach, cases (TC-13..TC-16), and the traceability delta are in **TEST-ICONS-CR001**. Headline:
read-trio offline, `download` applies the pipeline + re-sync, Python/JS parity, converter
unaffected.

## 6. Close-out

On completion: re-base FR-12..FR-15 into `FEAT-ICONS-001`, the CLI section into
`DESIGN-ICONS-001`, TC-13..TC-16 into `TEST-ICONS-001`, and phase P6 into `PLAN-ICONS-001`; then
set this CR (lead doc **CR-ICONS-001**) to **Closed**.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — plan for phase P6 (`kymo icons` CLI), sub-steps P6.1..P6.5, +8 pts, gated behind baseline P3. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-001/04-PLAN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
On phase progress or scope change: update the affected step/phase row; keep requirement and
test-case IDs consistent with CR-ICONS-001 / TEST-ICONS-CR001; increment `version`; append a
row to Annex A.

### B.4 Backwards Compatibility
The plan is informative; the normative surface is CR-ICONS-001 and DESIGN-ICONS-CR001.
Reconcile any deviation there before close-out.

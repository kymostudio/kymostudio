---
title: "Icons CR-002 — P1 Namespace `prefix:name` + aliases: scope, rationale & schedule"
document_id: CR-ICONS-002
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: kymo Icons v2 maintainers / reviewers; engineers implementing the icon key + alias layer across packages/python and packages/js
review_cycle: Until closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - DESIGN-ICONS-CR002          # CR design — CR-ICONS-002/02-DESIGN
  - TEST-ICONS-CR002            # CR verification (TC-1, TC-3, TC-10) — CR-ICONS-002/03-TEST
  - PLAN-ICONS-CR002            # CR plan (phase P1) — CR-ICONS-002/04-PLAN
  - FEAT-ICONS-001              # Baseline requirements — realises FR-1, FR-4, FR-11 (no new FR)
  - DESIGN-ICONS-001            # Baseline design — §3 catalogue format
  - TEST-ICONS-001              # Baseline test — TC-1, TC-3, TC-10
  - PLAN-ICONS-001              # Baseline plan — phase P1
  - RES-ICONS-001               # Prior-art research (Iconify) — the evidence base
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - prefix-name
  - aliases
  - namespacing
  - collision
  - backwards-compatibility
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# Icons CR-002 — P1 Namespace `prefix:name` + aliases

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | CR-ICONS-002                                       |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-ICONS-CR002, TEST-ICONS-CR002, PLAN-ICONS-CR002, FEAT-ICONS-001, DESIGN-ICONS-001, TEST-ICONS-001, PLAN-ICONS-001, RES-ICONS-001 |

> **Implementation change-request** — the lead document of the CR that realises **baseline phase P1**
> of `PLAN-ICONS-001`. Unlike a requirements-adding CR (cf. CR-ICONS-001), this CR **adds no
> requirement**: it schedules, designs-in-detail, and verifies the existing baseline requirements
> **FR-1, FR-4, FR-11** (and `SN-ICONS-01`). On completion the P1 row of `PLAN-ICONS-001` flips to
> **Done** and Annex C of that plan records the work — there is no requirement re-base.
> **Status: Open** — raised, not started. Sibling layers:
> [`02-DESIGN`](02-DESIGN.md) (`DESIGN-ICONS-CR002`) ·
> [`03-TEST`](03-TEST.md) (`TEST-ICONS-CR002`, TC-1/TC-3/TC-10) ·
> [`04-PLAN`](04-PLAN.md) (`PLAN-ICONS-CR002`, phase P1).

The key words **SHALL**, **SHOULD**, **MAY** are used per ISO drafting conventions.

## 1. Motivation

This is the **cheapest, highest-leverage** change in the Icons v2 plan and the one that **stops
data loss** (PLAN-ICONS-001 §1). As diagnosed in RES-ICONS-001 §6, the flat `<provider>-<name>`
key drops the category folder and resolves **last-write-wins**, yielding **2,300 manifest keys for
2,457 PNGs** — so **~157 icons are silently unreachable**, a rate that only grows with the
catalogue. Replacing that key with a collision-proof **`prefix:name`** address (FR-1) and adding an
**aliases** layer (FR-4) makes every vendored icon addressable without storing art twice; a
**legacy-key compatibility map** (FR-11) keeps authored `.kymo`/BPMN diagrams rendering across the
upgrade. P1 delivers this value **without** the generator (P2), the metadata manifest (P3), or
vectorization (P4).

## 2. Change (summary)

Replace the flat key with `prefix:name` and add aliases, in both packages, behind a compatibility
shim:

- **Key** — address icons as `prefix:name` matching `^[a-z0-9]+(-[a-z0-9]+)*$`, keeping the
  category inside the name so the last-write-wins collisions disappear (FR-1).
- **Aliases** — `{ parent, …transforms? }` synonyms/transformed variants, resolved by walking the
  parent chain with cycle guards (FR-4).
- **Compatibility** — a legacy `<provider>-<name>` → `prefix:name` map / alias layer so existing
  diagrams resolve unchanged (FR-11).

The full key grammar, alias-resolution algorithm, and the two-package realisation are in
**DESIGN-ICONS-CR002**.

## 3. Baseline requirements realised (no new requirement)

| Baseline req | Statement (unchanged — see FEAT-ICONS-001) | Verified by |
|--------------|---------------------------------------------|-------------|
| **FR-1** | Collision-proof `prefix:name` key; legacy flat key replaced; **no vendored icon silently unreachable** | TC-1 |
| **FR-4** | Aliases express synonyms/transformed variants as `{ parent, …transforms? }`, resolved with cycle guards | TC-3 |
| **FR-11** | Existing `<provider>-<name>` keys continue to resolve (compatibility map / aliases) | TC-10 |
| `SN-ICONS-01` | No icon SHALL be silently unreachable | TC-1 |

This CR does **not** mint or alter any FR/NFR/SN ID.

## 4. Constraints, assumptions, out-of-scope

- **No metadata yet.** P1 introduces `prefix:name` + aliases over the *current* catalogue shape;
  per-set `info`/tags/dims arrive in **P3** (CR-ICONS-004). The compatibility map may live as a
  generated side-file until the generator (P2) owns it.
- **No vectorization.** Icons remain PNG-backed; this CR changes only *addressing*, not the stored
  art (P4 / CR-ICONS-005).
- **Byte-stable goldens.** Re-keying must not change rendered bytes for diagrams whose icons are
  unaffected (NFR-2, TC-11) — the resolved fragment for a given icon is identical, only its address
  changes.
- **Parity.** The key + alias resolution SHALL behave equivalently in Python and JS (FR-10),
  reconciled toward Python (sole golden writer).

## 5. Acceptance

- Count of source icons **==** count of addressable `prefix:name` keys (the ~157 collisions gone) — TC-1.
- A synonym alias resolves to its parent body; a transform alias applies `rotate`/`hFlip`/`vFlip`;
  a cycle is rejected, not looped — TC-3.
- Every existing `.kymo`/BPMN sample using `<provider>-<name>` renders **byte-identical** — TC-10, TC-11.
- Python (`icons.py`) and JS (`icons-loader.ts`) resolve the same address/alias to the same
  fragment; both suites green.

## 6. Change record

| Date | Actor | Decision |
|------|-------|----------|
| 2026-06-05 | Vũ Anh | **Raised (Open).** Maps baseline phase P1 onto an implementation CR realising FR-1/FR-4/FR-11; first link in the P1→P2→P3→P4 chain. Not started. |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial raise — P1 namespace `prefix:name` + aliases + legacy compatibility, mapped from PLAN-ICONS-001 phase P1 onto a CR folder. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-002/01-REQUIREMENTS.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
This is an implementation CR; it carries **no requirement IDs of its own**. On completion, flip the
P1 row of `PLAN-ICONS-001` to Done and append its Annex C worklog; this folder is retained as the
phase record. Until then, edits increment `version` and append to Annex A.

### B.4 Backwards Compatibility
FR-1/FR-4/FR-11 IDs are owned by `FEAT-ICONS-001` and unchanged here. FR-11 is the compatibility
guarantee this CR delivers; re-keying SHALL NOT break authored diagrams.

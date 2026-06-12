---
title: Kymo Syntax (umbrella) — Requirements
document_id: FEAT-KYMO-SYNTAX-001
version: "1.0"
issue_date: 2026-06-12
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers working on the kymo syntax surfaces (.kymo DSL, .kymo.json); reviewers
review_cycle: On module addition/removal, or on scope change
supersedes: null
related_documents:
  - DESIGN-KYMO-SYNTAX-001   # Design (umbrella)
  - TEST-KYMO-SYNTAX-001     # V&V (umbrella)
  - PLAN-KYMO-SYNTAX-001     # Plan (umbrella)
  - FEAT-KYMO-DSL-001        # modules/dsl — the .kymo DSL front-end
  - FEAT-KYMOJSON-001        # modules/json — the .kymo.json interchange format
  - FEAT-KYMO-NREF-001       # modules/nref — the KYMO-DSL-001 reference restructure (completed)
  - KYMOJSON-MAP-001         # .kymo.json — the normative schema
authors:
  - Vũ Anh
language: en
keywords:
  - umbrella
  - requirements
  - dsl
  - kymo-json
  - syntax
  - serialization
  - document-map
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# Kymo Syntax (umbrella) — Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-KYMO-SYNTAX-001` |
| Version           | 1.0 |
| Status            | Released |
| Issue Date        | 2026-06-12 |
| Owner             | `diagrams/` project |
| Related Documents | DESIGN-TEST-PLAN-KYMO-SYNTAX-001; FEAT-KYMO-DSL-001 (dsl); FEAT-KYMOJSON-001 (json); FEAT-KYMO-NREF-001 (nref); KYMOJSON-MAP-001 |

> **Umbrella set.** kymo-syntax groups the engineering specs for the **syntax surfaces of the
> resolved diagram model** — the hand-authored `.kymo` DSL and the machine-oriented `.kymo.json`
> interchange format — which previously lived as the sibling top-level features `kymo-dsl` and
> `kymo-json`. The substantive stakeholder needs, requirements, designs, and tests live in the
> **modules** (Part B §2); this set owns only the umbrella scope, the module map, and the
> cross-module invariants. It mints no `SN`/`FR` numbering beyond the three umbrella requirements
> below.

---

## Part A — Product context (ConOps & Stakeholder Requirements)

### 1. Problem & motivation

One resolved model, two syntax surfaces. kymostudio compiles declarative sources into a
fully-resolved `Diagram`; that model is reachable through (a) the **`.kymo` DSL** — the primary,
hand-authored front-end (parse → layout → alignment) — and (b) **`.kymo.json`** — the lossless,
bidirectional serialization of the *resolved* model (cache, diff, exchange, machine authoring).
They are two ends of one pipeline and evolve together: a grammar change lands in the DSL, flows
into the resolved model, and surfaces in the serialization. Housing their spec sets as unrelated
top-level features hid that coupling; this umbrella makes it explicit and gives the
documentation-restructure record (`nref`) a home beside the language it reorganised.

### 2. Users & context of operations (ConOps)

Authors write `.kymo`; tools and agents read/write `.kymo.json`; both communities are served by
the same engine pair (Python reference + dependency-free JS) kept at parity. Engineers maintaining
the parser, resolver, serializer, or the normative references navigate this folder: the umbrella
for orientation, the module for substance.

### 3. Scope

**In scope:** the module map and the cross-module invariants (Part C). **Out of scope
(delegated to modules):** everything substantive — the DSL front-end (`FEAT-KYMO-DSL-001`), the
interchange format (`FEAT-KYMOJSON-001`), the reference restructure (`FEAT-KYMO-NREF-001`); and,
beyond them, the normative grammar (`KYMO-DSL-001`), the normative schema (`KYMOJSON-MAP-001`),
and the `bpmn { }` sub-language (`FEAT-BPMN-DSL-001`).

---

## Part B — Introduction

### 1. Document map (this folder)

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` | `FEAT-KYMO-SYNTAX-001` | *why one umbrella, what belongs here, what must hold across modules?* |
| 02 | `02-DESIGN.md` | `DESIGN-KYMO-SYNTAX-001` | *how the surfaces relate (one pipeline, two ends)* |
| 03 | `03-TEST.md` | `TEST-KYMO-SYNTAX-001` | *which gates verify the umbrella invariants* |
| — | `04-PLAN.md` | `PLAN-KYMO-SYNTAX-001` | *the folder-merge record + worklog* |

### 2. Modules

Each module is a complete 4-file spec set with its own `document_id` family, item IDs, and `CR/`
log; cross-document references use `document_id` (never file paths).

| Module | document_id set | What |
|--------|-----------------|------|
| `modules/dsl/` | `FEAT`/`DESIGN`/`TEST`/`PLAN-KYMO-DSL-001` (+ `CR/`) | The `.kymo` DSL front-end: declarative parse → `layout()` → `resolve_alignments()` → renderer hand-off, at Python↔JS parity. |
| `modules/json/` | `FEAT`/`DESIGN`/`TEST`/`PLAN-KYMOJSON-001` (+ `CR/`) | The `.kymo.json` interchange format: lossless, bidirectional serialization of the resolved `Diagram`. |
| `modules/nref/` | `FEAT`/`DESIGN`/`TEST`/`PLAN-KYMO-NREF-001` | The (completed) restructure of the `KYMO-DSL-001` language reference into the clause-per-file set under `docs/formats/kymo-dsl/`. |

### 3. Status & ownership

Released; all three modules are shipped features (dsl/json Released, nref completed). Owned by the
`diagrams/` project.

---

## Part C — Umbrella requirements

The key words **SHALL** etc. follow ISO/IEC/IEEE 29148:2018. Substantive `FR`/`NFR` live in the
modules; the umbrella states only the invariants that span them.

- **UR-1 (one model).** The two syntax surfaces SHALL describe the **same resolved model**: every
  construct the DSL can produce in a resolved `Diagram` SHALL be representable in `.kymo.json`
  losslessly (round-trip, per `FEAT-KYMOJSON-001`).
- **UR-2 (dual-source lockstep).** A grammar change SHALL land in `dsl.py` and `KYMO-DSL-001`
  (clause files) in lockstep, and — when it changes the resolved model — in `KYMOJSON-MAP-001` and
  the serializer in the same change set.
- **UR-3 (module shape).** Every module in this folder SHALL keep the repository's 4-file spec
  structure, its own stable `document_id` family, and its own `CR/` change-request log (nref,
  being completed, carries none).

---

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-06-12 | Vũ Anh | Initial issue — umbrella created by **merging the top-level features `kymo-dsl` and `kymo-json`** (plus the previously folded `kymo-dsl-nref`) into `docs/specs/kymo-syntax/` as `modules/{dsl,json,nref}`. All pre-existing document_ids unchanged; minted only `*-KYMO-SYNTAX-001` and `UR-1..3`. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-syntax/01-REQUIREMENTS.md`; the authoritative source is the
main-branch working tree, with history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the features it groups; available to anyone with repository read
access.

### B.3 Change Control
Adding/removing a module, or changing an umbrella invariant (`UR-`), requires: update Part B §2 /
Part C; keep the four umbrella docs consistent; increment `version`; append a row to Annex A.
Module-internal changes are governed by the module's own doc-control (and `CR/`), not this file.

### B.4 Backwards Compatibility
`UR-` IDs are stable; a removed invariant SHALL be marked withdrawn (not re-used). Module
document_ids are never renamed by umbrella reorganisations.

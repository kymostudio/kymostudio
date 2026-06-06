---
title: Pipeline & CLI Architecture — Plan
document_id: PLAN-PIPECLI-001
version: "0.1"
issue_date: 2026-06-06
status: Draft
classification: Internal
owner: packages/python (kymo CLI) · packages/js · packages/rust
audience: Engineers planning/executing the pipeline & CLI migration
review_cycle: On a phase being delivered
supersedes: null
related_documents:
  - FEAT-PIPECLI-001            # Requirements
  - DESIGN-PIPECLI-001          # Design
  - TEST-PIPECLI-001            # Test documentation
  - RES-PIPELINE-001            # Research: migration plan (§8)
  - RES-CLI-001                 # Research: CLI migration (§6)
authors:
  - Vũ Anh
language: en
keywords:
  - pipeline
  - cli
  - plan
  - migration
  - phases
  - roadmap
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Pipeline & CLI Architecture — Plan

| Field             | Value |
|-------------------|-------|
| Document ID       | `PLAN-PIPECLI-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `packages/python` · `packages/js` · `packages/rust` |
| Related Documents | `FEAT-PIPECLI-001`, `DESIGN-PIPECLI-001`, `TEST-PIPECLI-001`; migration evidence `RES-PIPELINE-001` §8, `RES-CLI-001` §6 |

## 1. Scope and approach

Deliver the registry-driven six-stage pipeline (`FR-PC-1..7`) and the verb-less CLI
(`FR-PC-8..17`) **incrementally**, so each step is observable from the outside as a no-op
until a new surface is opted in (`NFR-PC-1`, `SN-PC-07`). A big-bang rewrite would invalidate
the conformance corpus; instead each phase is gated by the golden/corpus oracle (`TC-PC-1`).
**Move-then-rewire**: existing modules relocate into the registry unchanged in behaviour
before any externally-visible grammar change.

## 2. Design

Per `DESIGN-PIPECLI-001`: stages `demux · decode · filter · encode · post · mux`; a single
intermediate `Diagram`; registries replacing the `cli.py` suffix switch (`:61–77`) and
boolean-flag chain (`:196–232`); the CLI grammar as the user-facing projection of the stages.

## 3. Phases (work breakdown)

Each phase ends green on the golden + BPMN corpus suites (`TC-PC-1`). The phase numbering
follows `RES-PIPELINE-001` §8.

| Phase | Deliverable | Realises | Exit gate |
|-------|-------------|----------|-----------|
| **P1 — Scaffold `pipeline/`** | Move importer/encoder modules into `pipeline/importers/`, `encoders/`; `cli.py` dispatch switches from if/elif to registry lookup. Public interface unchanged. | `FR-PC-1,2,4,7` | Golden/corpus byte-identical (`TC-PC-1,2,3`) |
| **P2 — Extract filters** | `layout`, `align`, `autosize`, `animate`, `theme` become real `Diagram → Diagram` filters; add the `diagram.resolved` flag (replaces `cli.py:193` suffix check). Legacy flag-path still calls them in the old order. | `FR-PC-3,6` | `TC-PC-4,5,6`; golden unchanged |
| **P3 — Filter-chain grammar** | Introduce `-vf` and `-filter_complex` alongside legacy flags (`--animate` still works). | `FR-PC-13` | `TC-PC-14` |
| **P4 — Mux & format control** | `-o <path\|->` (stdout), `-f` format override, `-t` target-as-value (one parse → many targets), `--anim` warn-not-drop, `-formats`/`-targets`/`-h`, `--probe`. | `FR-PC-9,10,11,12,14,15` | `TC-PC-7,10,12,13,15,16` |
| **P5 — New sources** | `.drawio` (port from JS), `.svg`, `stdin` — one PR each, one file + registry entry. | `FR-PC-2` | `TC-PC-3` per source |
| **P6 — JS & Rust parity** | JS `bin` exposing the same grammar; mirror the pipeline shape in the Rust CLI with `.kymo.json` as the shared wire format. | `FR-PC-17`, `NFR-PC-3` | `TC-PC-18` |
| **P7 — Clean break (opt-in)** | Retire legacy boolean flags after the deprecation window; verb-less grammar becomes the only surface. | `FR-PC-8`, `NFR-PC-5` | `TC-PC-11,17,20` |

P1–P2 are pure refactors (no user-visible change). P3–P5 are additive (new surface alongside
old). P6 extends parity. P7 is the only breaking step and is opt-in / windowed.

## 4. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Golden/corpus churn during the move (P1) | Move modules byte-for-byte; rewire dispatch only; gate on `TC-PC-1` every commit. |
| Filter extraction reorders passes and perturbs geometry | Preserve the exact today order `layout → bpmn_layout → align → autosize` (`cli.py:183–194`); the `resolved` flag mirrors the current suffix skip exactly. |
| Multi-input compose semantics under-specified (`concat`/`overlay` id-collisions) | Out of scope v1 (`FEAT` §4); land single-input first; resolve by `CR/` (open question `RES-PIPELINE-001` §9). |
| Filter-chain DSL grammar bikeshedding | Ship `-vf` parsing behind the additive P3 with the FFmpeg `name=k=v:k=v` form; revisit syntax via `CR/` if it proves too cramped. |
| JS/Rust drift from Python | `.kymo.json` parity oracle (`TC-PC-18`, `conformance/golden/`) gates P6. |
| Breaking users at P7 | Deprecation window + warnings during P3–P6; P7 is opt-in. |

## 5. Verification

`TEST-PIPECLI-001`: per-phase exit gates above; the golden/corpus suites as the
behaviour-preserving oracle (`NFR-PC-1`); per-stage unit isolation (`NFR-PC-2`); cross-language
parity (`NFR-PC-3`).

## 6. Estimate (complexity)

| Phase | Relative size | Note |
|-------|---------------|------|
| P1 | M | Mechanical move + registry wiring |
| P2 | M | Filter extraction; the `resolved` flag is the subtle part |
| P3 | M | `-vf` parser + filter-chain executor |
| P4 | L | Mux, format override, capability/help, `--probe`, multi-target |
| P5 | S each | One importer per PR |
| P6 | L | JS `bin` + Rust alignment + parity |
| P7 | S | Flag retirement after window |

Order is strict P1→P7; P5 sources can land in any order once P4 is in. No phase exceeds the
per-feature complexity guidance; if P4/P6 grow, split by sub-deliverable via `CR/`.

## 7. Change requests

None yet. Open design questions (filter-chain grammar, compose/id-collision semantics,
external layout engines, Rust filter-stage necessity, streaming) are tracked as research in
`RES-PIPELINE-001` §9 and become `CR/` entries here once a phase needs them resolved.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial plan. Seven-phase incremental migration (scaffold → filters → `-vf` → mux/format → new sources → parity → clean break), gated by the golden/corpus oracle; derived from `RES-PIPELINE-001` §8 and `RES-CLI-001` §6. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled in the project repository; authoritative source is the main-branch working
tree, history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it describes.

### B.3 Change Control
Changes require: update the affected phase/risk; keep `FEAT`/`DESIGN`/`TEST`-`PIPECLI`
consistent; increment `version`; append to Annex A. Scope changes are minted as `CR/` entries
against `FEAT-PIPECLI-001`.

### B.4 Backwards Compatibility
Every phase before P7 preserves the legacy surface (`NFR-PC-5`); P7 is the single opt-in
breaking step, taken only after the deprecation window.

## Annex C — Worklog

| Date | Phase | Note |
|------|-------|------|
| 2026-06-06 | — | Spec baselined from `RES-PIPELINE-001` + `RES-CLI-001`. No code yet. |

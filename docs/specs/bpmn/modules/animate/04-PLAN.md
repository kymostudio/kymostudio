---
title: BPMN Animation — Plan
document_id: PLAN-BPMN-ANIMATE-001
version: "0.3"
issue_date: 2026-05-31
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo.anim format, validator, generator, and players
review_cycle: On phase/CR completion
supersedes: null
related_documents:
  - FEAT-BPMN-ANIMATE-001    # Requirements
  - DESIGN-BPMN-ANIMATE-001  # Design
  - TEST-BPMN-ANIMATE-001    # Test documentation
  - KYMOANIM-MAP-001         # the kymo.anim descriptor format
  - PLAN-BPMN-EXPORT-001     # bpmn-export plan (records the deferral this picks up)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - animation
  - plan
  - phases
  - change-requests
  - kymo.anim
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Animation — Plan

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-BPMN-ANIMATE-001                              |
| Version      | 0.3                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-05-31                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-BPMN-ANIMATE-001, DESIGN-BPMN-ANIMATE-001, TEST-BPMN-ANIMATE-001, KYMOANIM-MAP-001 |

Requirements (FR/NFR): FEAT-BPMN-ANIMATE-001. Design:
DESIGN-BPMN-ANIMATE-001. Verification: TEST-BPMN-ANIMATE-001. Format: KYMOANIM-MAP-001.

## 1. Scope and approach

Deliver a **self-contained `kymo.anim` format** (`KYMOANIM-MAP-001`) — one schema-validated JSON
holding the diagram (nodes with `type` + explicit position, flows) **and** its animation, "Lottie for
process diagrams" — picking up the animation deferred by `PLAN-BPMN-EXPORT-001` /
`FEAT-BPMN-EXPORT-001` §4. Delivered as a **sequence of change-requests** (`CR/`). The headline
disciplines are **controllability + validation** (explicit, JSON-Schema-checked, semantically
validated before rendering) and **additivity** (existing `.bpmn`/`.kymo`/`.kymo.json` paths render
byte-identical, NFR-1).

## 2. Design

The self-contained format (KYMOANIM-MAP-001), the parse→validate→**build (no layout pass)**→render
pipeline, the diagram→anim generator, the validation strategy, and the no-JS CSS-Motion-Path technique
are specified in **DESIGN-BPMN-ANIMATE-001**; per-increment design detail is in each CR's `03-DESIGN`.
This plan covers only scope, sequencing, and risks.

## 3. Delivery increments (change-requests)

Each increment is raised, assessed, approved, implemented, and re-baselined as a change-request under
`CR/` (logged in `CR/README.md`). The baseline reserves the `-001` suffix, so CR folders start at
`CR-002`.

| CR | Increment | Realises | Status |
|----|-----------|----------|--------|
| `CR-BPMN-ANIMATE-002` (`CR-002/`) | **`kymo.anim` format + JSON Schema + validator + diagram→anim generator + no-JS SVG player** — foundational | FR-1..FR-4, FR-5 (SVG), FR-6, FR-7; NFR-1..NFR-4 | **Open** (raised; ready to build) |
| `CR-BPMN-ANIMATE-003` (`CR-003/`) | **Activation & gateway semantics** — render `activate`/`branch` timeline fields | FR-1, FR-5 (SVG) | Proposed |
| `CR-BPMN-ANIMATE-004` (`CR-004/`) | **Interactive viewer** — `controls` (play/pause/step) over the timeline | FR-5 (interactive) | Proposed |
| `CR-BPMN-ANIMATE-005` (`CR-005/`) | **WebP / playback player** — frames sampled from the timeline via `to_webp.py` | FR-5 (WebP) | Proposed |

Sequencing: **CR-002 first** (it defines the format + schema + validator + generator + SVG player
that every later increment reuses); **CR-003** adds the `activate`/`branch` rendering; **CR-004** and
**CR-005** are players consuming the same file and can proceed in parallel once CR-002 lands.

## 4. Risks and mitigations

- **Additivity (NFR-1)** — `kymo.anim` is a **new front-end**; existing `.bpmn`/`.kymo`/`.kymo.json`
  paths are untouched, so their goldens stay byte-identical. Gate on the golden-SVG + BPMN-corpus
  suites.
- **Validation without a library (FR-3)** — repo ships no JSON-Schema lib. Mitigation: a small
  built-in checker (Python + JS mirror) for structure + semantics; ship `kymo.anim.schema.json` for
  editors/external validators; keep dependency-free (NFR-2).
- **Internal-reference integrity** — references are internal to the file; the semantic validator
  rejects dangling `flow.from`/`to`/timeline ids and a `branch` that is not an outgoing flow, so a
  malformed file fails loudly rather than rendering wrong.
- **Loops / unreachable nodes in default-gen** — bounded walk; nodes unreachable from a start event
  emit after the main timeline or stay static.
- **Scope creep toward an engine** — keep `branch`/timings *illustrative* (FEAT §4); no condition/data
  evaluation.
- **Parity drift (FR-7)** — single language-neutral parse/validate/generate/compile spec mirrored in
  Python/JS; `pyRound` where Python rounds; cover with parity tests (TC-8).

## 5. Verification

Approach, levels, cases (TC-1…TC-12), and the requirements-traceability matrix are specified in
TEST-BPMN-ANIMATE-001. Each CR maps its CR-local cases back to these.

## 6. Estimate (indicative)

Relative complexity in **story points** (Fibonacci), refined per CR on assessment:

| Increment | Points (indicative) |
|-----------|---------------------|
| CR-002 — format + schema + validator + diagram→anim generator + no-JS SVG player (Python/JS) | 13 |
| CR-003 — activation & gateway semantics | 5 |
| CR-004 — interactive viewer | 8 |
| CR-005 — WebP / playback player | 5 |
| **Total** | **~31** |

CR-002 carries the core (the self-contained format, schema, validator, and generator everything
reuses) and the additivity/golden-safety discipline.

## 7. Change requests

Increments and any later changes to the baselined spec (`docs/specs/bpmn/modules/animate/`) are raised,
assessed, and logged in `CR/` (raise → assess → approve → implement → re-baseline). The four planned
increments are registered in `CR/README.md`; `CR-002` is **Open** and ready to build, `CR-003..005`
are **Proposed**.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-05-31 | Vũ Anh | Initial issue. Scope/approach, four-CR delivery sequence, risks, indicative estimate, change-request register. |
| 0.2     | 2026-05-31 | Vũ Anh | **Re-centered on the explicit `kymo.anim` descriptor.** §1 scope now leads with controllability + validation; §3 CR-002 is the format+schema+validator+generator+SVG core; §4 adds the no-library-validation and id-drift risks; §6 re-estimated (CR-002 13 pts; total ~31). |
| 0.3     | 2026-05-31 | Vũ Anh | **Re-architected to a self-contained format** ("Lottie for process diagrams"). §1/§2 now: one `kymo.anim` file holds the diagram (nodes/`type`/positions, flows) + animation; pipeline builds a `Diagram` from the explicit scene (no layout pass); §3 CR titles → diagram→anim generator + players; §4 risks → additivity + internal-reference integrity (dropped id-drift-vs-target). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn/modules/animate/04-PLAN.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On CR completion or scope change: update the affected clause + CR row; keep requirement IDs and the
TST traceability matrix consistent; increment `version`; append a row to Annex A (document edits) and
Annex C (the increment's implementation worklog).

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-BPMN-ANIMATE-001, DESIGN-BPMN-ANIMATE-001, and
KYMOANIM-MAP-001. Reconcile any deviation there before release.

## Annex C — Worklog

**Table C.1 — Implementation worklog.** Per-increment work as it happens — distinct from Annex A,
which records edits to *this document*. Newest entries at the bottom; dates ISO 8601.

| Date       | Increment | Work | Outcome / artifacts |
|------------|-----------|------|---------------------|
| 2026-05-31 | — (doc set) | Authored the baseline doc set + four-CR scaffold; framed BPMN animation as the owner of the `FEAT-BPMN-EXPORT-001` §4 deferral. | **Proposed** — no code yet. |
| 2026-05-31 | — (doc set) | **Re-centered on the explicit `kymo.anim` descriptor** (user direction: explicit JSON, controllable + validatable). Added the format reference `KYMOANIM-MAP-001` (`docs/formats/kymo.anim.md`); reworked PRODUCT/INTRO/FEATURE/DESIGN/TEST/PLAN + CR-002 around it. | **Proposed** — spec updated; build is CR-002. |
| 2026-05-31 | — (doc set) | **Re-architected to a self-contained format** ("Lottie for process diagrams"; user direction). `kymo.anim` now carries the whole diagram (nodes with `type`+explicit position, flows) **and** the animation in one file — no external diagram, no layout engine. Rewrote `KYMOANIM-MAP-001` (envelope `canvas`/`controls`/`nodes`/`flows`/`timeline` + new JSON Schema + Lottie prior-art) and PRODUCT/INTRO/FEATURE/DESIGN/TEST/PLAN + CR-002. | **Proposed** — spec updated; build is CR-002. |

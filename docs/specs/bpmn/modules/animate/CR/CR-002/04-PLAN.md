---
title: "BPMN Animation CR-002 — Plan (kymo.anim format + no-JS SVG player)"
document_id: PLAN-BPMN-ANIMATE-002
version: "0.3"
issue_date: 2026-05-31
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and closing out CR-002
review_cycle: Until CR-002 is closed
supersedes: null
related_documents:
  - FEAT-BPMN-ANIMATE-002
  - DESIGN-BPMN-ANIMATE-002
  - TEST-BPMN-ANIMATE-002
  - PLAN-BPMN-ANIMATE-001
  - KYMOANIM-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - plan
  - phases
  - change-request
  - kymo.anim
  - self-contained-format
  - bpmn-animate
---

# BPMN Animation CR-002 — Plan (kymo.anim format + no-JS SVG player)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PLAN-BPMN-ANIMATE-002` |
| Version           | 0.3 |
| Status            | **Open** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-BPMN-ANIMATE-002`, `FEAT-BPMN-ANIMATE-002`, `DESIGN-BPMN-ANIMATE-002`, `TEST-BPMN-ANIMATE-002`, `PLAN-BPMN-ANIMATE-001` (parent), `KYMOANIM-MAP-001` (format) |

Close-out plan for CR-002. Requirements: `FEAT-BPMN-ANIMATE-002`. Design: `DESIGN-BPMN-ANIMATE-002`.
Verification: `TEST-BPMN-ANIMATE-002`. Format: `KYMOANIM-MAP-001`.

## 1. Scope and approach

Build the `kymo.anim` foundation: parser, JSON Schema + two-layer validator, diagram→anim generator,
build-from-scene, and a no-JS SVG token player — mirrored in Python and JS, wired to the CLI/library —
additive and no-JS/dependency-free. Python-first (reference impl), then JS parity, then docs.

## 2. Phases (work breakdown)

| ID | Phase | Deliverables | Exit criteria | Reqs | Status |
|----|-------|--------------|---------------|------|--------|
| **P0** | Spike | Hand-write `order-flow.kymo.anim.json`; throwaway build→render with a token `offset-path` along one flow; eyeball in a browser | Token travels a flow, no-JS, positions explicit | `FR-CR2-04` | ⬜ Planned |
| **P1** | Format + validation (Python) | `from_kymoanim.parse`; `kymo.anim.schema.json` + structural checker; `anim_validate` (internal semantic); unit tests | `TC-CR2-01..04` green | `FR-CR2-01/-02` | ⬜ Planned |
| **P2** | Generator + build + SVG (Python) | `gen_anim`/`--anim-init`; `anim_build` (AnimDoc→Diagram, no layout); token CSS in `to_svg.py`; `load()` dispatch for `*.kymo.anim.json`; tests + additivity | `TC-CR2-05..07,-10` green; existing paths byte-identical | `FR-CR2-03/-04/-05`, `NFR-CR2-01/-04` | ⬜ Planned |
| **P3** | JS parity | Mirror parse/validate/generate/build/compile in `packages/js`; JS tests; parity vs Python | `npm test` green; `TC-CR2-08/-09` green; dep-free | `FR-CR2-05`, `NFR-CR2-02/-03` | ⬜ Planned |
| **P4** | Docs & close-out | Finalise `KYMOANIM-MAP-001` (ship `kymo.anim.schema.json`); per-format/user note; re-baseline parent (`FR-1..4`/`FR-6`/`FR-7` + `FR-5` SVG delivered, Annex A/C); flip CR Open→Closed + `CR/README.md` row | Docs updated; parent re-baselined; suites green | all | ⬜ Planned |

## 3. Risks and mitigations

- **`RK-CR2-01` Additivity** — `kymo.anim` is a new front-end; don't touch existing render paths; gate
  on golden-SVG + corpus suites.
- **`RK-CR2-02` Validation without a library** — ship `kymo.anim.schema.json` for editors; built-in
  structural+semantic checker (Python + JS); no new dependency (NFR-CR2-02).
- **`RK-CR2-03` Loop/unreachable in generator** — bounded walk; unreachable nodes after the main
  timeline or static; unit-test (TC-CR2-05).
- **`RK-CR2-04` Parity drift** — single language-neutral parse/validate/generate/build/compile spec;
  `pyRound`; parity test (TC-CR2-08).
- **`RK-CR2-05` `offset-path` renderer support** — fine in browsers; for the WebP raster path (CR-005)
  document the SMIL `<animateMotion>` fallback.

## 4. Files (anticipated)

- `packages/python/src/kymo/from_kymoanim.py`, `anim_validate.py`, `anim_gen.py`, `anim_build.py`.
- `packages/python/src/kymo/to_svg.py` — token CSS; `cli.py` — `*.kymo.anim.json` dispatch + `--anim-init`.
- `kymo.anim.schema.json` — shipped schema (with the package).
- `packages/js/src/from-kymoanim.ts`, `anim-validate.ts`, `anim-gen.ts`, `anim-build.ts`, `to-svg.ts` (+ `round.ts`).
- `packages/python/tests/` + `packages/js/tests/` — `TC-CR2-*`; a sample `order-flow.kymo.anim.json`.
- `docs/formats/kymo.anim.md` (`KYMOANIM-MAP-001`) — finalise on ship.

## 5. Verification gate

`TC-CR2-01..10` (`TEST-BPMN-ANIMATE-002`) pass; full Python suite incl. golden-SVG + BPMN-corpus gates
green; JS `npm test` green; ruff clean; no new runtime dependency; `kymo.anim.schema.json` validates
the sample file.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Spike → Python core → JS parity → docs. |
| 0.2     | 2026-05-31 | Vũ Anh | Re-scoped to a descriptor: format+validation → generator+SVG → JS parity → docs/ship-schema. |
| 0.3     | 2026-05-31 | Vũ Anh | **Re-architected to the self-contained format.** Phases now add `anim_build` (AnimDoc→Diagram, no layout) and `load()` dispatch for `*.kymo.anim.json`; generator is diagram→anim; risk `RK-CR2-01` recast as additivity. |

## Annex C — Worklog

**Table C.1 — Implementation worklog.** Newest at the bottom; ISO 8601 dates.

| Date       | Phase | Work | Outcome / artifacts |
|------------|-------|------|---------------------|
| 2026-05-31 | — (doc set) | Authored CR-002 mini-spec; re-architected to the self-contained `kymo.anim` format (format + schema + validator + diagram→anim generator + build-from-scene + no-JS SVG player). | **Open** — ready to build; no code yet (P0–P4 planned in §2). |

---
title: "BPMN Animation CR-002 — kymo.anim format + no-JS SVG player: Overview & Change Record"
document_id: INTRO-BPMN-ANIMATE-002
version: "0.3"
issue_date: 2026-05-31
status: Open
classification: Internal
owner: diagrams/ project
audience: bpmn-animate maintainers / reviewers; the approver of the baseline; the engineer building CR-002
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-BPMN-ANIMATE-002
  - DESIGN-BPMN-ANIMATE-002
  - TEST-BPMN-ANIMATE-002
  - PLAN-BPMN-ANIMATE-002
  - FEAT-BPMN-ANIMATE-001
  - DESIGN-BPMN-ANIMATE-001
  - TEST-BPMN-ANIMATE-001
  - PLAN-BPMN-ANIMATE-001
  - KYMOANIM-MAP-001
  - KYMOJSON-MAP-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - introduction
  - change-record
  - kymo.anim
  - self-contained-format
  - json-schema
  - no-js-svg
  - bpmn-animate
---

# BPMN Animation CR-002 — kymo.anim format + no-JS SVG player: Overview & Change Record

| Field             | Value |
|-------------------|-------|
| Document ID       | `INTRO-BPMN-ANIMATE-002` |
| Version           | 0.3 |
| Status            | **Open** — fully specified, ready to build |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Type              | **Enhancement** (foundational increment of the bpmn-animate feature) |
| Related Documents | `FEAT-BPMN-ANIMATE-002` (requirements), `DESIGN-BPMN-ANIMATE-002` (design), `TEST-BPMN-ANIMATE-002` (V&V), `PLAN-BPMN-ANIMATE-002` (plan); the format `KYMOANIM-MAP-001`; parent baseline `*-BPMN-ANIMATE-001` |

> **What this folder is.** `CR-002/` is a **self-contained mini engineering-spec** for the first,
> foundational increment (`01-INTRO`→`05-PLAN`). This `01-INTRO` doubles as the **change record**. Per
> the parent change-control rule (`FEAT-BPMN-ANIMATE-001 §1`), the baseline is re-baselined when this
> CR closes.

---

## 1. Purpose & motivation

The bpmn-animate baseline makes the animation a **self-contained, validatable `kymo.anim` JSON** — one
file holding the diagram (nodes with `type` + explicit position, flows) **and** its animation —
rather than something inferred. CR-002 builds that foundation, the parts every later increment reuses:

- the **`kymo.anim` format + JSON Schema** (`KYMOANIM-MAP-001`): `canvas`/`controls` + `nodes` +
  `flows` + `timeline`;
- a **two-layer validator** (structural schema + semantic internal-reference resolution), before render;
- a **diagram→anim generator** (`--anim-init`) that converts an existing `.bpmn`/`.kymo` into a valid
  starting file to edit;
- a **no-JavaScript SVG player**: build a `Diagram` from the explicit scene (no layout pass) and
  render a token travelling each `flow` per the timeline.

So it lands first. The full *visual* semantics of `activate`/`branch` are deferred to
`CR-BPMN-ANIMATE-003` (CR-002 carries those as timeline **fields** in the format + a basic token
traversal).

**Substrate (verified):**

| Concern | Current behaviour | Evidence |
|---|---|---|
| Explicit-geometry render | BPMN import renders from explicit coords, skipping `layout()`/`resolve_alignments()` | `cli.py` (BPMN branch), `BPMN-MAP-001` |
| Node/flow vocabulary | `bpmn-*` shapes + `bpmn_flow` kinds | `BPMN-MAP-001`, `model.py` |
| Animation primitive | `@keyframes kymo-edge-flow` (dash), CSS + SMIL; `ANIM_PRESETS` | `website/app/index.html:118`, `shapes.tsx:273,308`, `to_svg.py:112` |
| Validation infra | none (programmatic only) — this CR introduces the first schema + checker | repo grep: no `jsonschema`/`.xsd` |
| Token motion | none; `offset-path` (CSS Motion Path) unused → new | repo grep |

**Intended outcome.** `kymo order-flow.kymo --anim-init > order-flow.kymo.anim.json` emits a valid
file; the author edits it (positions, branch, timing); `validate` catches errors with the offending
id/step; `kymo order-flow.kymo.anim.json` renders a token traversing the process exactly as
specified, as a **no-JS SVG** — from the one self-contained file. Existing input paths are untouched
(additive); no new runtime dependency.

## 2. Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-INTRO.md` | `INTRO-BPMN-ANIMATE-002` | This doc — motivation, map, **change record**. |
| `02-REQUIREMENT.md` | `FEAT-BPMN-ANIMATE-002` | Requirements (`FR-CR2-*`, `NFR-CR2-*`), scope, acceptance, traceability. |
| `03-DESIGN.md` | `DESIGN-BPMN-ANIMATE-002` | How — parser, schema, validator, generator, build-from-scene, token CSS, Python/JS. |
| `04-TEST.md` | `TEST-BPMN-ANIMATE-002` | V&V — `TC-CR2-*`, validation + additivity gates, traceability. |
| `05-PLAN.md` | `PLAN-BPMN-ANIMATE-002` | Close-out plan — phases, risks, files, verification gate, worklog. |

The format itself is normative in **`KYMOANIM-MAP-001`** (`docs/formats/kymo.anim.md`).

## 3. Relationship to the bpmn-animate baseline

CR-002 **realises** baseline `FR-1` (define the self-contained format), `FR-2` (internal refs +
explicit coords), `FR-3` (validation), `FR-4` (diagram→anim generation), `FR-5` SVG (token along
flows), `FR-6` (self-contained input format + CLI/library + parity), `FR-7` (additive), and
`NFR-1..NFR-4`. It **excludes** the full `activate`/`branch` *visual* semantics
(`CR-BPMN-ANIMATE-003`), the interactive viewer (`-004`), and WebP (`-005`).

CR-local IDs: `FR-CR2-`/`NFR-CR2-`/`TC-CR2-`/`RK-CR2-`.

## 4. Reading guide

- **Approver:** §1 + §3 here, then `FEAT-BPMN-ANIMATE-002 §2/§5` and `KYMOANIM-MAP-001`.
- **Implementer (on approval):** `KYMOANIM-MAP-001` → `DESIGN-BPMN-ANIMATE-002` →
  `PLAN-BPMN-ANIMATE-002`, verify against `TEST-BPMN-ANIMATE-002`.

## 5. Status & change record

**Status: Open** · Type **Enhancement** (foundational increment). Fully specified; ready to build. On
approval, implementation lands under `PLAN-BPMN-ANIMATE-002`; status then flips **Open → Closed** + the
`CR/README.md` row, and the baseline is re-baselined.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Raised & specified.** (v0.1) Token-flow animated SVG. |
| 2026-05-31 | Vũ Anh | **Re-scoped** (v0.2) to an explicit `kymo.anim` descriptor (sidecar + `target`). |
| 2026-05-31 | Vũ Anh | **Re-architected** (v0.3) to the **self-contained** `kymo.anim` format: format + JSON Schema + validator + diagram→anim generator + no-JS SVG player (build a `Diagram` from the explicit scene, no layout pass). Awaiting build. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Raised; token-flow animated SVG. |
| 0.2     | 2026-05-31 | Vũ Anh | Re-scoped to an explicit descriptor (sidecar + `target` + id refs + validator + default-gen + descriptor-driven SVG). |
| 0.3     | 2026-05-31 | Vũ Anh | **Re-architected to the self-contained format**: parse `kymo.anim` (nodes/flows/timeline) → validate (schema + internal semantic) → build a `Diagram` from the explicit scene (no layout) → no-JS SVG token; diagram→anim generator (`--anim-init`); realises parent `FR-1..FR-7`. |

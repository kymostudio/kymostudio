---
title: "BPMN Animation CR-002 — kymo.anim format + no-JS SVG player: Requirements"
document_id: FEAT-BPMN-ANIMATE-002
version: "0.3"
issue_date: 2026-05-31
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo.anim format, validator, generator, and SVG player; reviewers
review_cycle: Until CR-002 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - DESIGN-BPMN-ANIMATE-002
  - TEST-BPMN-ANIMATE-002
  - PLAN-BPMN-ANIMATE-002
  - FEAT-BPMN-ANIMATE-001
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
  - requirements
  - srs
  - iso-29148
  - kymo.anim
  - self-contained-format
  - json-schema
  - no-js-svg
  - acceptance-criteria
  - bpmn-animate
---

# BPMN Animation CR-002 — kymo.anim format + no-JS SVG player: Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-ANIMATE-002` |
| Version           | 0.3 |
| Status            | **Open** — fully specified, ready to build |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Type              | **Enhancement** (foundational increment of the bpmn-animate feature) |
| Related Documents | `DESIGN-BPMN-ANIMATE-002` (design), `TEST-BPMN-ANIMATE-002` (V&V), `PLAN-BPMN-ANIMATE-002` (plan); the format `KYMOANIM-MAP-001`; parent baseline `*-BPMN-ANIMATE-001` |

---

## Part A — Introduction

> **What this folder is.** `CR-002/` is a **self-contained mini engineering-spec** for the first,
> foundational increment (`01-REQUIREMENTS`→`04-PLAN`). This Part A doubles as the **change record**. Per
> the parent change-control rule (`FEAT-BPMN-ANIMATE-001 §1`), the baseline is re-baselined when this
> CR closes.

### A.1 Purpose & motivation

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

### A.2 Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-REQUIREMENTS.md` | `FEAT-BPMN-ANIMATE-002` | This doc — motivation, change record (Part A) + requirements (Part B). |
| `02-DESIGN.md` | `DESIGN-BPMN-ANIMATE-002` | How — parser, schema, validator, generator, build-from-scene, token CSS, Python/JS. |
| `03-TEST.md` | `TEST-BPMN-ANIMATE-002` | V&V — `TC-CR2-*`, validation + additivity gates, traceability. |
| `04-PLAN.md` | `PLAN-BPMN-ANIMATE-002` | Close-out plan — phases, risks, files, verification gate, worklog. |

The format itself is normative in **`KYMOANIM-MAP-001`** (`docs/formats/kymo.anim.md`).

### A.3 Relationship to the bpmn-animate baseline

CR-002 **realises** baseline `FR-1` (define the self-contained format), `FR-2` (internal refs +
explicit coords), `FR-3` (validation), `FR-4` (diagram→anim generation), `FR-5` SVG (token along
flows), `FR-6` (self-contained input format + CLI/library + parity), `FR-7` (additive), and
`NFR-1..NFR-4`. It **excludes** the full `activate`/`branch` *visual* semantics
(`CR-BPMN-ANIMATE-003`), the interactive viewer (`-004`), and WebP (`-005`).

CR-local IDs: `FR-CR2-`/`NFR-CR2-`/`TC-CR2-`/`RK-CR2-`.

### A.4 Reading guide

- **Approver:** §A.1 + §A.3 here, then Part B §2/§5 and `KYMOANIM-MAP-001`.
- **Implementer (on approval):** `KYMOANIM-MAP-001` → `DESIGN-BPMN-ANIMATE-002` →
  `PLAN-BPMN-ANIMATE-002`, verify against `TEST-BPMN-ANIMATE-002`.

### A.5 Status & change record

**Status: Open** · Type **Enhancement** (foundational increment). Fully specified; ready to build. On
approval, implementation lands under `PLAN-BPMN-ANIMATE-002`; status then flips **Open → Closed** + the
`CR/README.md` row, and the baseline is re-baselined.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Raised & specified.** (v0.1) Token-flow animated SVG. |
| 2026-05-31 | Vũ Anh | **Re-scoped** (v0.2) to an explicit `kymo.anim` descriptor (sidecar + `target`). |
| 2026-05-31 | Vũ Anh | **Re-architected** (v0.3) to the **self-contained** `kymo.anim` format: format + JSON Schema + validator + diagram→anim generator + no-JS SVG player (build a `Diagram` from the explicit scene, no layout pass). Awaiting build. |

---

## Part B — Requirements

> **Delta SRS.** Requirements *for the CR-002 increment only* — the self-contained `kymo.anim` format,
> its validation, the diagram→anim generator, and a no-JS SVG player. Each `FR-CR2` realises a
> baselined `FEAT-BPMN-ANIMATE-001` clause (§B.5).

### B.1 Stakeholder needs

CR-002 serves `SN-BPMN-ANIMATE-01` (animate the way the process runs), `-02` (explicit, self-contained
scene+animation), `-03` (validatable), `-04` (no-JS SVG player), `-05` (self-contained + additive).

### B.2 Functional requirements (`FR-CR2`)

| ID | Requirement | Source need | Realises |
|----|-------------|-------------|----------|
| **`FR-CR2-01`** | Define and parse the **self-contained `kymo.anim`** format per `KYMOANIM-MAP-001`: envelope (`format`/`version`/`canvas`/`controls`) + **`nodes`** (`id`, `type`, explicit `at`, …) + **`flows`** (`id`, `from`/`to`, `kind`, optional `path`) + **`timeline`** (steps on `node`/`flow` by id, with `duration`/`token`/`activate`/`branch`). All references **internal** to the file; positions explicit. | `SN-01/02` | `FR-1`, `FR-2` |
| **`FR-CR2-02`** | Ship a **JSON Schema** (`kymo.anim.schema.json`, Draft 2020-12) and a **two-layer validator**: structural (schema) + semantic (every `flow.from`/`to` + timeline `node`/`flow`/`branch` resolves internally; `step` strictly increasing; `branch` is an outgoing flow; coords finite/in-canvas). Reports the offending id/step; runs **before** rendering; a player refuses an invalid file. | `SN-03` | `FR-3` |
| **`FR-CR2-03`** | Provide a **diagram→anim generator** — `gen_anim(diagram)` converts a resolved `.bpmn`/`.kymo` into a valid `kymo.anim` (nodes/types/positions from geometry, flows, default timeline), exposed as `--anim-init`. The generated file SHALL validate. | `SN-02` | `FR-4` |
| **`FR-CR2-04`** | Render a `kymo.anim` as a **no-JavaScript animated SVG**: build a `Diagram` from the explicit scene (`type`→shape, `at`→pos, `path`→points) **without** a layout pass, then animate a **token** along each `flow` via **CSS Motion Path** (`offset-path` + `offset-distance`), timed from the timeline (× `controls.speed`); the existing `kymo-edge-flow` dash is the trail. | `SN-04` | `FR-5` (SVG), `FR-2` |
| **`FR-CR2-05`** | `kymo.anim` SHALL be a **self-contained input format**: `kymo <file>.kymo.anim.json` renders; `--anim-init` generates. Library `parse`/`validate_anim`/`gen_anim` + SVG player; **equivalent in Python and JS**. **Additive**: existing `.bpmn`/`.kymo`/`.kymo.json` renders **byte-identical**. | `SN-05` | `FR-6`, `FR-7` |

> **Out of scope for CR-002 (deferred):** the full **visual** semantics of `activate` (task glow/
> pulse) and `branch` (exclusive=one / parallel=all rendering) → `CR-BPMN-ANIMATE-003`. CR-002
> carries them as **timeline fields** in the format + a basic token traversal of `flow` steps.

### B.3 Non-functional requirements (`NFR-CR2`)

| ID | Requirement | Realises |
|----|-------------|----------|
| **`NFR-CR2-01`** | **Additive / golden-safe.** `kymo.anim` is a new front-end; existing `.bpmn`/`.kymo`/`.kymo.json` renders stay **byte-identical**; `test_bpmn_corpus.py` baseline unchanged. | `NFR-1` |
| **`NFR-CR2-02`** | **No-JS / dependency-free.** The animated SVG uses only CSS/SVG (no `<script>`); validator is a built-in checker (no JSON-Schema lib); `packages/js` stays dependency-free. The `.schema.json` is shipped for editors. | `NFR-2` |
| **`NFR-CR2-03`** | **Deterministic.** For a given `kymo.anim`, validation verdict, built `Diagram`, and emitted CSS/markup are byte-stable and equivalent across Python/JS. | `NFR-3` |
| **`NFR-CR2-04`** | **Reduced-motion / first frame.** The SVG SHOULD honour `prefers-reduced-motion` (degrade to static); first frame is the valid static diagram. | `NFR-4` |

### B.4 Scope

**In scope:** the `kymo.anim` parser; JSON Schema + structural + semantic validator;
`gen_anim`/`--anim-init`; build-from-scene + no-JS SVG token player; CLI + library + Python/JS parity;
additivity. **Out of scope (non-goals — `FEAT-BPMN-ANIMATE-001 §4` stands):** full `activate`/`branch`
visual semantics (`-003`); interactive viewer (`-004`); WebP (`-005`); execution semantics;
referencing/embedding an external diagram; DSL-authored animation; changes to existing render paths.

### B.5 Acceptance criteria

1. A well-formed `kymo.anim` parses; the validator **accepts** valid files and **rejects** malformed
   ones and dangling/inconsistent internal refs, naming the id/step (`FR-CR2-01/-02`).
2. `--anim-init` converts a `.bpmn`/`.kymo` into a file that **re-validates**; its timeline traverses
   sequence flows in process order (`FR-CR2-03`).
3. `kymo order-flow.kymo.anim.json` renders a no-JS SVG where a token travels each `flow` per the
   timeline (`offset-path`; CSS only), built without a layout pass (`FR-CR2-04`).
4. Existing `.bpmn`/`.kymo`/`.kymo.json` renders **byte-identical** to goldens; corpus baseline
   unchanged; CLI/library work in Python and JS; no new runtime dep (`FR-CR2-05`, `NFR-CR2-01/-02`).
5. Output deterministic + cross-language equivalent; `prefers-reduced-motion` degrades to static
   (`NFR-CR2-03/-04`).

**Traceability** (CR-local → parent; tests in `TEST-BPMN-ANIMATE-002 §5`):

| `FR-CR2` | Realises (parent `FEAT-BPMN-ANIMATE-001`) | Covered by |
|----------|-------------------------------------------|------------|
| `FR-CR2-01` | `FR-1`, `FR-2` | `TC-CR2-01`, `TC-CR2-03` |
| `FR-CR2-02` | `FR-3` | `TC-CR2-02`, `TC-CR2-04` |
| `FR-CR2-03` | `FR-4` | `TC-CR2-05` |
| `FR-CR2-04` | `FR-5` (SVG), `FR-2` | `TC-CR2-06` |
| `FR-CR2-05` | `FR-6`, `FR-7` | `TC-CR2-07`, `TC-CR2-08` |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Raised; token-flow animated SVG. |
| 0.2     | 2026-05-31 | Vũ Anh | Re-scoped to an explicit descriptor: parse, schema + semantic validation, default-gen, descriptor-driven SVG, sidecar + CLI/library + parity. |
| 0.3     | 2026-05-31 | Vũ Anh | **Re-architected to the self-contained format.** `FR-CR2-01` parse `kymo.anim` (nodes/flows/timeline, internal refs), `FR-CR2-02` schema + internal semantic validation, `FR-CR2-03` diagram→anim generator, `FR-CR2-04` build-from-scene (no layout) + CSS-Motion-Path token, `FR-CR2-05` self-contained input + parity + additive; traceability to revised parent `FR-1..FR-7`. |
| 0.3     | 2026-06-06 | Vũ Anh | Consolidated `01-INTRO.md` (FEAT-BPMN-ANIMATE-002) into Part A and `02-REQUIREMENT.md` (FEAT-BPMN-ANIMATE-002) into Part B; deleted source files; renamed `03-DESIGN`→`02-DESIGN`, `04-TEST`→`03-TEST`, `05-PLAN`→`04-PLAN`. |

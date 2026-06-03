---
title: BPMN Animation — Requirements
document_id: FEAT-BPMN-ANIMATE-001
version: "0.3"
issue_date: 2026-05-31
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the BPMN animation feature
review_cycle: On phase/CR completion, or on format-schema change
supersedes: null
related_documents:
  - PROD-BPMN-ANIMATE-001    # Product description (stakeholder needs)
  - INTRO-BPMN-ANIMATE-001   # Introduction
  - DESIGN-BPMN-ANIMATE-001  # Design
  - TEST-BPMN-ANIMATE-001    # Test documentation
  - PLAN-BPMN-ANIMATE-001    # Plan
  - KYMOANIM-MAP-001         # the self-contained kymo.anim format (normative)
  - KYMOJSON-MAP-001         # kymo.json model (shared id/geometry conventions)
  - BPMN-MAP-001             # BPMN element mapping (node type ↔ bpmn-* shapes; flow kinds)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - animation
  - requirements
  - self-contained-format
  - kymo.anim
  - validation
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Animation — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-ANIMATE-001                              |
| Version      | 0.3                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-05-31                                         |
| Owner        | `diagrams/` project                                |
| Related      | PROD-BPMN-ANIMATE-001 (stakeholder needs), INTRO-BPMN-ANIMATE-001, DESIGN-BPMN-ANIMATE-001, TEST-BPMN-ANIMATE-001, PLAN-BPMN-ANIMATE-001, KYMOANIM-MAP-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting conventions. Each
requirement carries a stable ID for traceability from TEST-BPMN-ANIMATE-001. Concept:
INTRO-BPMN-ANIMATE-001; realisation: DESIGN-BPMN-ANIMATE-001; the format: KYMOANIM-MAP-001.

## 1. Scope and stakeholder needs

Stakeholder needs (`SN-BPMN-ANIMATE-01..05`, ISO 29148 §6.4.2 ConOps) are owned by
**`PROD-BPMN-ANIMATE-001`**; each requirement traces back via the **Source need** annotation.

**Scope (this SRS):** specify the **self-contained `kymo.anim` format** (one JSON holding the diagram
*and* its animation), how it is **validated**, and how **players** render it — a no-JavaScript SVG,
an interactive viewer, and a WebP export. **Baseline SRS**; per-increment deltas live in the
change-requests (§5).

## 2. Functional requirements

**The format** *(Source need: `SN-BPMN-ANIMATE-01`, `SN-BPMN-ANIMATE-02`)*
- **FR-1** The feature SHALL define a **self-contained `kymo.anim` JSON format** (`KYMOANIM-MAP-001`):
  an envelope (`format`/`version`/optional `canvas`/`controls`) plus **`nodes`** (each `id`, BPMN
  `type`, explicit position `at`, optional `size`/`label`/`marker`), **`flows`** (each `id`,
  `from`/`to`, optional `kind`/`label`/explicit `path`), and a **`timeline`** of ordered steps each
  acting on one `node`/`flow` by id with `duration`/`token`/`activate`/`branch`.
- **FR-2** References SHALL be **internal to the file**: every `flow.from`/`flow.to` and every
  timeline `node`/`flow`/`branch` SHALL name an element defined in the same file. Node positions
  (`at`) and flow `path`s SHALL be **explicit coordinates**, so a player needs **no layout pass**.
  Node `type` maps to a `bpmn-*` shape per `BPMN-MAP-001`. Branch selection is **illustrative** — not
  evaluated from `<conditionExpression>` or data.

**Validation** *(Source need: `SN-BPMN-ANIMATE-03`)*
- **FR-3** A `kymo.anim` file SHALL be **validatable** in two layers: **structural** against a
  published **JSON Schema** (`kymo.anim.schema.json`), and **semantic** — internal id references
  resolve, `step` ordinals strictly increase, `branch` is an outgoing flow of its gateway, and
  coordinates are finite (and within `canvas` when given). Validation SHALL report the offending
  id/step and run **before** rendering; a player SHALL refuse an invalid file.

**Generation** *(Source need: `SN-BPMN-ANIMATE-02`)*
- **FR-4** The feature SHALL provide **generation** — convert an existing diagram (`.bpmn`/`.kymo`,
  via the importer/layout) into a valid starting `kymo.anim` (nodes/types/positions from the resolved
  geometry, flows, and a default timeline) for the author to edit. The generated file SHALL validate.

**Players** *(Source need: `SN-BPMN-ANIMATE-04`)*
- **FR-5** A `kymo.anim` file SHALL render as a **no-JavaScript animated SVG** (pure CSS `@keyframes`;
  a token travels each `flow` per its `duration`/order, drawn from the explicit positions), and SHALL
  additionally drive an **interactive in-browser viewer** (play/pause/step over the timeline via
  `controls`) and a **WebP / playback export** (frames sampled from the timeline via `to_webp.py`).

**Interface, additivity & parity** *(Source need: `SN-BPMN-ANIMATE-04`, `SN-BPMN-ANIMATE-05`)*
- **FR-6** `kymo.anim` SHALL be a **self-contained input format** reachable from the **CLI** — `kymo
  <file>.kymo.anim.json` (render) and `kymo <diagram> --anim-init` (generate) — and the **library**
  (`parse`, `validate_anim`, `gen_anim`, and the players); with **equivalent functionality** in
  `packages/python` and `packages/js`, and **no new runtime dependency** (the `.schema.json` is
  shipped for editors; the in-process validator is dependency-free).
- **FR-7** The feature SHALL be **additive**: existing `.bpmn`/`.kymo`/`.kymo.json` render paths
  SHALL be **untouched** and produce **byte-identical** output.

## 3. Non-functional requirements

- **NFR-1** **Golden-safe / additive.** Adding `kymo.anim` SHALL NOT change any existing render path;
  the golden-SVG and BPMN-corpus baselines SHALL be unchanged.
- **NFR-2** **No-JS / dependency-free.** The animated **SVG** player SHALL use only CSS/SVG (no
  JavaScript) and add no runtime dependency; the validator is a built-in checker (no JSON-Schema
  library); `packages/js` stays dependency-free. (The interactive viewer is JS by nature and exempt.)
- **NFR-3** **Determinism.** For a given `kymo.anim` file, output SHALL be deterministic and
  equivalent across Python and JS; a parsed file re-serialises byte-stably.
- **NFR-4** **Accessibility / motion.** The animated SVG SHOULD respect `prefers-reduced-motion`
  (degrade to a static frame) and SHALL be legible as a still image (first frame = the static
  diagram).

## 4. Constraints, assumptions, out-of-scope

- **Presentation, not execution.** No BPMN engine: no token-game, no `<conditionExpression>`
  evaluation, no data binding. `branch` and timings are illustrative.
- **Self-contained, not referencing/embedding.** The format carries its own scene; it does **not**
  reference an external diagram nor embed in a `.bpmn`, and is **not** authored in the DSL.
  `--anim-init` is the one-way bridge *from* a diagram.
- The existing static render and input formats are **unchanged** (NFR-1); this feature only *adds* a
  new format + players.

## 5. Change-request roadmap (delivery increments)

Each increment is a self-contained mini-spec under `CR/` with CR-local IDs (`FR-CRn-`/`NFR-CRn-`).

| CR | Increment | Realises (baseline FR) | Status |
|----|-----------|------------------------|--------|
| `CR-BPMN-ANIMATE-002` (`CR-002/`) | **`kymo.anim` format + JSON Schema + validator + diagram→anim generator + no-JS SVG player** | FR-1..FR-4, FR-5 (SVG), FR-6, FR-7; NFR-1..NFR-4 | **Open** |
| `CR-BPMN-ANIMATE-003` (`CR-003/`) | **Activation & gateway semantics** — render `activate`/`branch` timeline fields | FR-1, FR-5 (SVG) | Proposed |
| `CR-BPMN-ANIMATE-004` (`CR-004/`) | **Interactive viewer** — `controls` (play/pause/step) over the timeline | FR-5 (interactive) | Proposed |
| `CR-BPMN-ANIMATE-005` (`CR-005/`) | **WebP / playback player** — frames sampled from the timeline via `to_webp.py` | FR-5 (WebP) | Proposed |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-05-31 | Vũ Anh | Initial umbrella SRS (`FR-1..FR-7`, `NFR-1..4`); CR roadmap. |
| 0.2     | 2026-05-31 | Vũ Anh | Re-centered on an explicit `kymo.anim` descriptor (sidecar + `target` + id refs + validation + default-gen). |
| 0.3     | 2026-05-31 | Vũ Anh | **Re-architected to a self-contained format.** `FR-1` define the self-contained format (`nodes`+`flows`+`timeline`, explicit positions); `FR-2` internal references + explicit coordinates (no layout pass); `FR-3` schema + semantic validation; `FR-4` diagram→anim generation; `FR-5` players (SVG/viewer/WebP); `FR-6` self-contained input format + CLI/library + parity; `FR-7` additive (existing paths byte-identical). `NFR-1` recast as additive. CR roadmap updated. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn-animate/02-FEATURE.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant FR/NFR (preserving IDs); update
TEST-BPMN-ANIMATE-001's traceability matrix and KYMOANIM-MAP-001 if the schema changes; increment
`version`; append a row to Annex A. A delivery increment is raised as a change-request under `CR/`.

### B.4 Backwards Compatibility
Requirement IDs are stable across revisions; a removed requirement SHALL be marked withdrawn (not
re-used) so traceability links remain valid.

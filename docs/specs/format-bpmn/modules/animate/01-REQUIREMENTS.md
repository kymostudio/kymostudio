---
title: BPMN Animate — Requirements
document_id: FEAT-BPMN-ANIMATE-001
version: "0.4"
issue_date: 2026-06-06
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the BPMN animation feature
review_cycle: On phase/CR completion, or on format-schema change
supersedes:
  - FEAT-BPMN-ANIMATE-001
  - FEAT-BPMN-ANIMATE-001
related_documents:
  - DESIGN-BPMN-ANIMATE-001  # Design
  - TEST-BPMN-ANIMATE-001    # Test documentation
  - PLAN-BPMN-ANIMATE-001    # Plan
  - FEAT-BPMN-001            # bpmn umbrella feature
  - KYMOANIM-MAP-001         # the self-contained kymo.anim format (normative)
  - KYMOJSON-MAP-001         # kymo.json model (shared id/geometry conventions)
  - PLAN-BPMN-EXPORT-001     # records the animation deferral this feature picks up
  - FEAT-BPMN-EXPORT-001     # §4 deferral note
  - BPMN-MAP-001             # BPMN element mapping (node type ↔ bpmn-* shapes; flow kinds)
  - DESIGN-BPMN-DSL-001      # BPMN-in-DSL design
  - REF-BPMNIO-CMP-001       # bpmn.io comparison ("no animation" gap)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - animation
  - requirements
  - product-description
  - conops
  - stakeholder-requirements
  - self-contained-format
  - kymo.anim
  - lottie
  - validation
  - traceability
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Animate — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-ANIMATE-001                              |
| Version      | 0.4                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-06-06                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-BPMN-ANIMATE-001, TEST-BPMN-ANIMATE-001, PLAN-BPMN-ANIMATE-001, KYMOANIM-MAP-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting conventions. Each
requirement carries a stable ID for traceability from TEST-BPMN-ANIMATE-001. Realisation:
DESIGN-BPMN-ANIMATE-001; the format: KYMOANIM-MAP-001.

## 1. Introduction and scope

This document is the **requirements** entry point for the **BPMN animation** feature (ANIMATE = BPMN
token-flow animation over the rendered SVG). It states the problem and concept, the stakeholder needs
(`SN-BPMN-ANIMATE-NN`), and the functional/non-functional requirements (`FR`/`NFR`) derived from them.
It consolidates the former product description (FEAT-BPMN-ANIMATE-001) and introduction
(FEAT-BPMN-ANIMATE-001). The set conforms to ISO/IEC/IEEE 12207:2017 and ISO/IEC/IEEE 15289:2019.

**Background.** kymo already ships a **generic, no-JavaScript edge animation**:
`to_svg.render(animate=…)` appends pure-CSS `@keyframes` presets (`flow`/`slow`/`pulse`/`ants`,
`to_svg.py:105`) that flow marching dashes along **every** `.edge-path` identically. That animation is
**process-blind** *and* **uncontrollable**: no way to specify a branch, an order, a timing, or to
validate before rendering. BPMN-specific animation was explicitly **deferred** — FEAT-BPMN-EXPORT-001
§4 records *"No animation (BPMN is static). Deferred"*. This spec **owns that deferred work** — through
an *explicit, self-contained* artifact rather than inference. Peer BPMN tools are static (bpmn.io
*"renders standardised BPMN … but no animation"*, REF-BPMNIO-CMP-001).

**Feature concept.** Make a BPMN diagram animate *the way the process runs* by defining it in a
**self-contained `kymo.anim` JSON** (KYMOANIM-MAP-001) — one file holding **both the diagram and its
animation**:

- **`nodes`** — each flow node with `id`, a BPMN **`type`** (`start`/`task`/`gateway-xor`/…), an
  **explicit position** `at:[x,y]`, and a label.
- **`flows`** — connections (`id`, `from`/`to`, `kind`, optional explicit `path` waypoints).
- **`timeline`** — ordered steps referencing a `node`/`flow` **by id**, with `duration`/`token`/
  `activate`/`branch`; plus playback `controls`.

Because positions are explicit, a player renders the file **directly — no separate diagram, no layout
engine**. The file is **validated** first (a JSON Schema for structure + a semantic pass: internal id
references resolve, timeline consistent, positions finite). A starting file is **generated** from an
existing diagram (`kymo … --anim-init`, filling positions from resolved geometry) and then edited.
This follows the **Lottie** model — one portable, schema-validated JSON of *scene + animation*,
rendered by multiple players — but high-level and BPMN-semantic. It is **presentation** animation, not
an execution engine.

**Scope (this SRS):** specify the **self-contained `kymo.anim` format** (one JSON holding the diagram
*and* its animation), how it is **validated**, and how **players** render it — a no-JavaScript SVG, an
interactive viewer, and a WebP export. **Baseline SRS**; per-increment deltas live in the
change-requests (§6). The feature is **additive**: existing `.bpmn`/`.kymo`/`.kymo.json` render paths
are untouched (golden-safe).

**Document map.** This feature's docs use a four-document module layout in this folder, plus the
external **format reference** KYMOANIM-MAP-001 (`docs/formats/kymo.anim.md`):

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` (this) | FEAT-BPMN-ANIMATE-001 | *whose needs (`SN`), and what must it do? (`FR`/`NFR`, CR roadmap)* |
| 02 | `02-DESIGN.md` | DESIGN-BPMN-ANIMATE-001 | *how is it built?* |
| 03 | `03-TEST.md` | TEST-BPMN-ANIMATE-001 | *how do we know it's right?* |
| 04 | `04-PLAN.md` | PLAN-BPMN-ANIMATE-001 | *why, in what order, at what risk, what's done? (+ `CR/`)* |
| — | `docs/formats/kymo.anim.md` | KYMOANIM-MAP-001 | *the normative self-contained format + JSON Schema* |

Reading order: **`01-REQUIREMENTS`** (this) → **`02-DESIGN`** → **`03-TEST`** → **`04-PLAN`** + `CR/`,
with **KYMOANIM-MAP-001** for the format; delivery status in PLAN-BPMN-ANIMATE-001 + `CR/`.
Cross-references use **`document_id`** (never file paths).

- **Change management:** the baseline reserves the `-001` suffix; each increment is a change-request
  under `CR/` (folders `CR-002`+), re-baselining the parent (bump version + Annex A row) on close.

**Terms and abbreviations.**

- **`kymo.anim`** — the self-contained JSON animation format (KYMOANIM-MAP-001): one file holding the
  diagram (nodes/flows) **and** its animation (timeline).
- **Node** — a flow element in `nodes`: `id`, BPMN `type`, explicit position `at`, label.
- **Flow** — a connection in `flows`: `id`, `from`/`to`, `kind`, optional explicit `path`.
- **Timeline / step** — the ordered animation; a step acts on one `node`/`flow` by id.
- **Controls** — playback defaults (`autoplay`/`loop`/`speed`/`fr`).
- **Token** — a *visual* marker travelling a flow; it does **not** evaluate conditions.
- **Activation** — the "this node is active" cue (task glow/pulse, event emphasis), set by a step.
- **Player** — a renderer of a `kymo.anim` file (no-JS SVG, interactive viewer, WebP).
- **Generation (`--anim-init`)** — converting an existing diagram into a starting `kymo.anim`.
- **Validation** — structural (JSON Schema) + semantic (internal id-resolution / consistency).

## 2. Stakeholder needs (`SN-BPMN-ANIMATE`)

Stakeholder needs (`SN-BPMN-ANIMATE-01..05`, ISO 29148 §6.4.2 ConOps); each requirement traces back
via the **Source need** annotation.

| ID | Need | Rationale |
|----|------|-----------|
| `SN-BPMN-ANIMATE-01` | A BPMN diagram must be able to **animate the way the process runs** — a token traversing flows, with activation and branching — instead of flowing every edge uniformly. | Animation should *explain the process*; the generic preset is process-blind. Picks up the `FEAT-BPMN-EXPORT-001` §4 deferral. |
| `SN-BPMN-ANIMATE-02` | The animation must be **explicit, self-contained, and controllable**: a single **`kymo.anim` JSON** that defines **each node (id, `type`, explicit position)**, the **flows**, and a **timeline** (order, timings, branch choices, token) — not inferred, and not split across files. | Control (pin a branch, a position, a timing) is impossible with inference; one self-describing artifact is authorable, portable, and diffable. |
| `SN-BPMN-ANIMATE-03` | The file must be **validatable** — against a **JSON Schema** (structure) and a semantic pass (internal id references resolve, timeline consistent, positions finite) — *before* rendering. | "Easy to validate" is a primary requirement; catch errors at author time, not in rendered output. |
| `SN-BPMN-ANIMATE-04` | The file must be rendered by **multiple players** — a **no-JavaScript SVG** (baseline), an **interactive** in-browser viewer, and a **WebP/playback** export — all from the one file. | One portable source, many destinations (the Lottie model): live SVG, interactive playground, static-host-friendly video. |
| `SN-BPMN-ANIMATE-05` | The format must be **self-contained** (no external diagram, positions explicit ⇒ no layout engine) and **additive / golden-safe**: existing `.bpmn`/`.kymo`/`.kymo.json` render paths stay **byte-identical**, and no new runtime dependency is added. | Self-describing portability is the point; the golden-SVG / BPMN-corpus gates must not churn; `packages/js` stays dependency-free. |

## 3. Functional requirements

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

## 4. Non-functional requirements

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

## 5. Constraints, assumptions, out-of-scope

- **Presentation, not execution.** No BPMN engine: no token-game, no `<conditionExpression>`
  evaluation, no data binding. `branch` and timings are illustrative.
- **Self-contained, not referencing/embedding.** The format carries its own scene; it does **not**
  reference an external diagram nor embed in a `.bpmn`, and is **not** authored in the DSL.
  `--anim-init` is the one-way bridge *from* a diagram.
- The existing static render and input formats are **unchanged** (NFR-1); this feature only *adds* a
  new format + players.

## 6. Change-request roadmap (delivery increments)

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
| 0.1     | 2026-05-31 | Vũ Anh | Initial umbrella SRS (`FR-1..FR-7`, `NFR-1..4`); CR roadmap. Initial product description (`SN-BPMN-ANIMATE-01..04`; four-CR delivery) and introduction (concept, glossary, document map). |
| 0.2     | 2026-05-31 | Vũ Anh | Re-centered on an explicit `kymo.anim` descriptor (sidecar + `target` + id refs + validation + default-gen); added `SN-05`. |
| 0.3     | 2026-05-31 | Vũ Anh | **Re-architected to a self-contained format** ("Lottie for process diagrams"). `kymo.anim` now carries the whole diagram (nodes with `type`+explicit position, flows) **and** the animation in one file — no external diagram, no layout engine. `FR-1..FR-7` revised; `NFR-1` recast as additive; `SN-02`/`SN-04`/`SN-05` reworded; glossary and document map updated; non-goals now exclude referencing/embedding an external diagram. |
| 0.4     | 2026-06-06 | Vũ Anh | Consolidated FEAT-BPMN-ANIMATE-001 (stakeholder needs) and FEAT-BPMN-ANIMATE-001 (introduction/map) into this requirements doc under the new 4-document module layout (01-REQUIREMENTS/02-DESIGN/03-TEST/04-PLAN). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/format-bpmn/modules/animate/01-REQUIREMENTS.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant FR/NFR (preserving IDs); update
TEST-BPMN-ANIMATE-001's traceability matrix and KYMOANIM-MAP-001 if the schema changes; increment
`version`; append a row to Annex A. A delivery increment is raised as a change-request under `CR/`.

### B.4 Backwards Compatibility
Requirement and stakeholder-need IDs are stable across revisions; a removed requirement SHALL be marked
withdrawn (not re-used) so traceability links remain valid.

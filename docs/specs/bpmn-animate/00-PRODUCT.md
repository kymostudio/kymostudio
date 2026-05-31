---
title: BPMN Animation — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-BPMN-ANIMATE-001
version: "0.3"
issue_date: 2026-05-31
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for BPMN animation; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-BPMN-ANIMATE-001
  - FEAT-BPMN-ANIMATE-001
  - KYMOANIM-MAP-001         # the self-contained kymo.anim format this product delivers
  - KYMOJSON-MAP-001         # kymo.json model (resolved-model sibling; shared id/geometry conventions)
  - PLAN-BPMN-EXPORT-001     # records the animation deferral this feature picks up
  - FEAT-BPMN-EXPORT-001     # §4 deferral note
  - BPMN-MAP-001             # BPMN element mapping (node type ↔ bpmn-* shapes; flow kinds)
  - KYMO-DSL-001             # kymo DSL (bpmn { } authoring block)
  - REF-BPMNIO-CMP-001       # bpmn.io comparison ("no animation" gap)
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - bpmn
  - animation
  - self-contained-format
  - kymo.anim
---

# BPMN Animation — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-BPMN-ANIMATE-001` |
| Version           | 0.3 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-BPMN-ANIMATE-001`, `FEAT-BPMN-ANIMATE-001` (the SRS derived from the needs below), `KYMOANIM-MAP-001` (the format) |

> This doc owns the `SN-BPMN-ANIMATE-NN`
> stakeholder needs; the SRS (`FEAT-BPMN-ANIMATE-001`) derives `FR`/`NFR` from them.

## 1. Problem & motivation

kymo can **import** BPMN 2.0 XML (`from_bpmn`, `BPMN-MAP-001`), **author** it textually (`bpmn { }`,
`KYMO-DSL-001` §6.9), and **export** it back (`FEAT-BPMN-EXPORT-001`). It also ships a **generic edge
animation** (`--animate`, `to_svg.py:105`) — pure-CSS marching dashes that flow **every** edge
uniformly. Animation is a kymo differentiator: peer BPMN tools are static (bpmn.io *"renders
standardised BPMN … but no animation"*, `REF-BPMNIO-CMP-001`).

But that animation is **not process-aware**, and there is **no way to control or validate it**: you
cannot say "the token takes *this* branch", retime a step, or check the animation before rendering.
BPMN-specific animation was also deliberately **deferred** — `FEAT-BPMN-EXPORT-001` §4 records *"No
animation (BPMN is static). Deferred"*, pointing at `PLAN-BPMN-EXPORT-001`.

The feature delivers a **self-contained animation format** — `kymo.anim` (`KYMOANIM-MAP-001`): a
single JSON file that defines **the whole diagram *and* its animation** — every node (id, **type**,
**explicit position**), every flow, and a **timeline** of steps — with **no separate diagram file and
no layout engine** required. It is **"Lottie for process diagrams"**: one portable, schema-validated
JSON that any player renders, including a **no-JavaScript SVG**. Because the scene is explicit and
self-describing, the animation is easy to **author, generate, diff, and validate**, and cannot drift
out of sync with an external diagram. It is **presentation** animation, not an execution engine.

## 2. Users & context of operations (ConOps)

- **Who:** process authors and reviewers who want to *control* how a model animates (which branch,
  what order, what timing, where each node sits) and *validate* it before sharing; consumers
  embedding BPMN animations in slides, docs, and web pages; and engineers/maintainers of the kymo
  renderers and importer.
- **Substrate it builds on (unchanged):** the kymo model + element-id/geometry conventions
  (`KYMOJSON-MAP-001`); the BPMN node/flow vocabulary (`BPMN-MAP-001`, mapping `type`→`bpmn-*`
  shapes); and the existing animation machinery (`ANIM_PRESETS`/`--animate` in `to_svg.py`, the
  `to_webp.py` frame synthesiser) the players reuse.
- **Scenario:** `kymo <diagram> --anim-init` converts an existing `.bpmn`/`.kymo` into a starting
  `*.kymo.anim.json` (nodes/types/positions/flows filled from the resolved geometry) → the author
  **edits** it (positions, branch, order, timing) → `validate` → `kymo order-flow.kymo.anim.json`
  renders a token traversing the process exactly as specified, as SVG / viewer / WebP — from the
  one self-contained file.

## 3. Goals & non-goals

- **Goals:** a **self-contained, schema-validated JSON format** (`kymo.anim`) that an author controls
  and validates, carrying the diagram (nodes with `type` + explicit position, flows) **and** its
  animation (timeline, controls, illustrative branching); rendered by portable players — a
  no-JavaScript SVG, an interactive viewer, and a WebP export; a starting file **generated** from an
  existing diagram (`--anim-init`) then edited; mirrored where applicable in Python and JS; no new
  runtime dependency. Delivered as four change-requests.
- **Non-goals:** an **executable BPMN engine** (no token-game, no `<conditionExpression>` evaluation,
  no data binding — `branch` is illustrative); **referencing or embedding an external diagram** (the
  format is self-contained — `--anim-init` is the one-way bridge *from* a diagram); authoring
  animation **in the DSL**; changing the existing static render or input formats.

## 4. Stakeholder needs (`SN-BPMN-ANIMATE`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-BPMN-ANIMATE-01` | A BPMN diagram must be able to **animate the way the process runs** — a token traversing flows, with activation and branching — instead of flowing every edge uniformly. | Animation should *explain the process*; the generic preset is process-blind. Picks up the `FEAT-BPMN-EXPORT-001` §4 deferral. |
| `SN-BPMN-ANIMATE-02` | The animation must be **explicit, self-contained, and controllable**: a single **`kymo.anim` JSON** that defines **each node (id, `type`, explicit position)**, the **flows**, and a **timeline** (order, timings, branch choices, token) — not inferred, and not split across files. | Control (pin a branch, a position, a timing) is impossible with inference; one self-describing artifact is authorable, portable, and diffable. |
| `SN-BPMN-ANIMATE-03` | The file must be **validatable** — against a **JSON Schema** (structure) and a semantic pass (internal id references resolve, timeline consistent, positions finite) — *before* rendering. | "Easy to validate" is a primary requirement; catch errors at author time, not in rendered output. |
| `SN-BPMN-ANIMATE-04` | The file must be rendered by **multiple players** — a **no-JavaScript SVG** (baseline), an **interactive** in-browser viewer, and a **WebP/playback** export — all from the one file. | One portable source, many destinations (the Lottie model): live SVG, interactive playground, static-host-friendly video. |
| `SN-BPMN-ANIMATE-05` | The format must be **self-contained** (no external diagram, positions explicit ⇒ no layout engine) and **additive / golden-safe**: existing `.bpmn`/`.kymo`/`.kymo.json` render paths stay **byte-identical**, and no new runtime dependency is added. | Self-describing portability is the point; the golden-SVG / BPMN-corpus gates must not churn; `packages/js` stays dependency-free. |

## 5. Scope

**In scope (product level):** the **self-contained `kymo.anim` format + JSON Schema**
(`KYMOANIM-MAP-001`) — `canvas`/`controls` + `nodes` (type + explicit position) + `flows` +
`timeline`; validation (structural + semantic); a **generator** that converts a diagram → `kymo.anim`
(`--anim-init`); and players for a no-JavaScript SVG, an interactive viewer, and a WebP export —
delivered as the four change-requests `CR-BPMN-ANIMATE-002..005`. **Out of scope:** an executable
engine, condition/data evaluation, referencing/embedding an external diagram, DSL-authored animation,
and changes to the existing static render or input formats. See `FEAT-BPMN-ANIMATE-001` §4.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Initial product description. Owner of the `FEAT-BPMN-EXPORT-001` §4 deferral; `SN-BPMN-ANIMATE-01..04`; four-CR delivery. |
| 0.2     | 2026-05-31 | Vũ Anh | Re-centered on an explicit `kymo.anim` JSON descriptor (sidecar referencing a target diagram by id); added `SN-05`. |
| 0.3     | 2026-05-31 | Vũ Anh | **Re-architected to a self-contained format** (user direction; "Lottie for process diagrams"). `kymo.anim` now carries the whole diagram (nodes with `type` + explicit position, flows) **and** the animation in one file — no external diagram, no layout engine. Reworded §1/§2/§3/§5; `SN-02` (self-contained scene+animation), `SN-04` (portable players), `SN-05` (self-contained + additive); non-goals now exclude referencing/embedding an external diagram. |

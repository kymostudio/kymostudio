---
title: BPMN Animation — Introduction
document_id: INTRO-BPMN-ANIMATE-001
version: "0.3"
issue_date: 2026-05-31
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers and reviewers of the kymo renderers, BPMN importer, and the web playground
review_cycle: On phase/CR completion, or on format-schema change
supersedes: null
related_documents:
  - PROD-BPMN-ANIMATE-001    # Product description (ConOps & stakeholder needs)
  - FEAT-BPMN-ANIMATE-001    # Requirements
  - DESIGN-BPMN-ANIMATE-001  # Design
  - TEST-BPMN-ANIMATE-001    # Test documentation
  - PLAN-BPMN-ANIMATE-001    # Plan
  - KYMOANIM-MAP-001         # the self-contained kymo.anim format
  - KYMOJSON-MAP-001         # kymo.json model (shared id/geometry conventions)
  - PLAN-BPMN-EXPORT-001     # bpmn-export plan (records the animation deferral this picks up)
  - FEAT-BPMN-EXPORT-001     # bpmn-export SRS (§4 deferral note)
  - BPMN-MAP-001             # BPMN element mapping (node type ↔ bpmn-* shapes; flow kinds)
  - DESIGN-BPMN-DSL-001      # BPMN-in-DSL design
  - REF-BPMNIO-CMP-001       # bpmn.io comparison ("no animation" gap)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - animation
  - self-contained-format
  - kymo.anim
  - lottie
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Animation — Introduction

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | INTRO-BPMN-ANIMATE-001                                      |
| Version      | 0.3                                                         |
| Status       | Draft                                                       |
| Issue Date   | 2026-05-31                                                  |
| Owner        | `diagrams/` project                                         |
| Related      | PROD-BPMN-ANIMATE-001, FEAT-BPMN-ANIMATE-001, DESIGN-BPMN-ANIMATE-001, TEST-BPMN-ANIMATE-001, PLAN-BPMN-ANIMATE-001, KYMOANIM-MAP-001 |

## 1. Purpose and scope

This document introduces the **BPMN animation** feature and is the entry point to its document set.
It states the problem, the concept, and the terminology, and maps the reader to the product
description (PROD-BPMN-ANIMATE-001), the requirements (FEAT-BPMN-ANIMATE-001), the design
(DESIGN-BPMN-ANIMATE-001), the test documentation (TEST-BPMN-ANIMATE-001), the plan
(PLAN-BPMN-ANIMATE-001), and the **format** (KYMOANIM-MAP-001). The set conforms to ISO/IEC/IEEE
12207:2017 and ISO/IEC/IEEE 15289:2019.

The feature is delivered as a **sequence of change-requests** (`CR/`), each a self-contained
increment — see §6 and PLAN-BPMN-ANIMATE-001 §7.

## 2. Background

kymo already ships a **generic, no-JavaScript edge animation**: `to_svg.render(animate=…)` appends
pure-CSS `@keyframes` presets (`flow`/`slow`/`pulse`/`ants`, `to_svg.py:105`) that flow marching
dashes along **every** `.edge-path` identically. That animation is **process-blind** *and*
**uncontrollable**: no way to specify a branch, an order, a timing, or to validate before rendering.
BPMN-specific animation was explicitly **deferred** — FEAT-BPMN-EXPORT-001 §4 records *"No animation
(BPMN is static). Deferred"*. This spec **owns that deferred work** — through an *explicit,
self-contained* artifact rather than inference.

## 3. Feature concept

Make a BPMN diagram animate *the way the process runs* by defining it in a **self-contained
`kymo.anim` JSON** (`KYMOANIM-MAP-001`) — one file holding **both the diagram and its animation**:

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
rendered by multiple players — but high-level and BPMN-semantic. Players are built up over four
change-requests (CRs):

- **Format + no-JS SVG player** (`CR-BPMN-ANIMATE-002`) — the format, schema, validator, the
  diagram→`kymo.anim` generator, and a pure-CSS animated SVG (token traversing flows).
- **Activation & gateway semantics** (`CR-BPMN-ANIMATE-003`) — render the `activate`/`branch`
  timeline fields (tasks pulse, gateways branch one/all).
- **Interactive viewer** (`CR-BPMN-ANIMATE-004`) — `controls` (play/pause/step) over the timeline.
- **WebP / playback** (`CR-BPMN-ANIMATE-005`) — frame-synthesised token run from the timeline.

The feature is **additive**: existing `.bpmn`/`.kymo`/`.kymo.json` render paths are untouched
(golden-safe). Behaviour: FEAT-BPMN-ANIMATE-001; architecture: DESIGN-BPMN-ANIMATE-001; format:
KYMOANIM-MAP-001. This is **presentation** animation, not an execution engine (§5, PROD §3).

## 4. Audience

Engineers implementing or reviewing the kymo renderers (`to_svg`, `to_webp`), the BPMN importer
(`from_bpmn`, BPMN-MAP-001), the kymo.json model (`KYMOJSON-MAP-001`), and the web playground
(`website/app/`), plus authors writing `kymo.anim` files and maintainers verifying golden-safety.

## 5. Terms and abbreviations

- **`kymo.anim`** — the self-contained JSON animation format (`KYMOANIM-MAP-001`): one file holding
  the diagram (nodes/flows) **and** its animation (timeline).
- **Node** — a flow element in `nodes`: `id`, BPMN `type`, explicit position `at`, label.
- **Flow** — a connection in `flows`: `id`, `from`/`to`, `kind`, optional explicit `path`.
- **Timeline / step** — the ordered animation; a step acts on one `node`/`flow` by id.
- **Controls** — playback defaults (`autoplay`/`loop`/`speed`/`fr`).
- **Token** — a *visual* marker travelling a flow; it does **not** evaluate conditions.
- **Activation** — the "this node is active" cue (task glow/pulse, event emphasis), set by a step.
- **Player** — a renderer of a `kymo.anim` file (no-JS SVG, interactive viewer, WebP).
- **Generation (`--anim-init`)** — converting an existing diagram into a starting `kymo.anim`.
- **Validation** — structural (JSON Schema) + semantic (internal id-resolution / consistency).

## 6. Document map

This feature's docs use a two-layer model in this folder — a **baselined spec** (`00-PRODUCT`–
`04-TEST`) and a **living plan** (`PLAN.md` + `CR/`) — plus the external **format reference**
`KYMOANIM-MAP-001` (`docs/formats/kymo.anim.md`). The delivery is carved into change-requests.

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 00 | `00-PRODUCT.md` | PROD-BPMN-ANIMATE-001 | *what product problem & whose needs (`SN-BPMN-ANIMATE`)?* |
| 01 | `01-INTRO.md` (this) | INTRO-BPMN-ANIMATE-001 | *where do I start?* |
| 02 | `02-FEATURE.md` | FEAT-BPMN-ANIMATE-001 | *what must it do? (requirements, `FR`/`NFR`, CR roadmap)* |
| 03 | `03-DESIGN.md` | DESIGN-BPMN-ANIMATE-001 | *how is it built?* |
| 04 | `04-TEST.md` | TEST-BPMN-ANIMATE-001 | *how do we know it's right?* |
| — | `PLAN.md` | PLAN-BPMN-ANIMATE-001 | *why, in what order, at what risk, what's done? (+ `CR/`)* |
| — | `docs/formats/kymo.anim.md` | KYMOANIM-MAP-001 | *the normative self-contained format + JSON Schema* |

**Change-requests** (the increments), logged in `CR/README.md`:

| CR | Increment | Status |
|----|-----------|--------|
| `CR-BPMN-ANIMATE-002` (`CR-002/`) | `kymo.anim` format + schema + generator + no-JS SVG player | **Open** |
| `CR-BPMN-ANIMATE-003` (`CR-003/`) | Activation & gateway semantics (timeline `activate`/`branch`) | Proposed |
| `CR-BPMN-ANIMATE-004` (`CR-004/`) | Interactive viewer (descriptor `controls`) | Proposed |
| `CR-BPMN-ANIMATE-005` (`CR-005/`) | WebP / playback player | Proposed |

Reading order: **`01-INTRO`** (this) → **`00-PRODUCT`** → **`02-FEATURE`** → **`03-DESIGN`** →
**`04-TEST`**, with **`KYMOANIM-MAP-001`** for the format; delivery status in PLAN-BPMN-ANIMATE-001 +
`CR/`. Cross-references use **`document_id`** (never file paths).

- **Change management:** the baseline reserves the `-001` suffix; each increment is a change-request
  under `CR/` (folders `CR-002`+), re-baselining the parent (bump version + Annex A row) on close.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-05-31 | Vũ Anh | Initial issue. Introduced BPMN-semantic animation; four-CR delivery; cited the deferral. |
| 0.2     | 2026-05-31 | Vũ Anh | Re-centered on an explicit `kymo.anim` JSON descriptor (sidecar referencing a target diagram by id). |
| 0.3     | 2026-05-31 | Vũ Anh | **Re-architected to a self-contained format** ("Lottie for process diagrams"). §3 concept now: one `kymo.anim` file holds the diagram (`nodes` with `type`+explicit position, `flows`) **and** the `timeline`; no external diagram / no layout engine; rendered by portable players. Updated glossary (drop target/sidecar; add node/flow/player/self-contained) and §6. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn-animate/01-INTRO.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in alongside the feature it introduces; available to anyone with repository read
access.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set (PRODUCT/FEATURE/DESIGN/TEST/PLAN +
KYMOANIM-MAP-001) consistent; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This is an informative overview; on any feature change, reconcile it with FEAT-BPMN-ANIMATE-001 and
KYMOANIM-MAP-001 before release.

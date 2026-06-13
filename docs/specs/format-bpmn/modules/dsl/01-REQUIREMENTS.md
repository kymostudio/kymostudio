---
title: BPMN in the kymo DSL — Requirements
document_id: FEAT-BPMN-DSL-001
version: "1.3"
issue_date: 2026-06-06
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the BPMN-in-kymo feature
review_cycle: On phase completion, or on grammar change
supersedes:
  - FEAT-BPMN-DSL-001
  - FEAT-BPMN-DSL-001
related_documents:
  - FEAT-BPMN-001             # Umbrella feature
  - DESIGN-BPMN-DSL-001       # Design
  - TEST-BPMN-DSL-001         # Test documentation
  - PLAN-BPMN-DSL-001         # Plan
  - BPMN-MAP-001              # BPMN importer element mapping
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - dsl
  - requirements
  - traceability
  - product-description
  - conops
  - stakeholder-requirements
  - auto-layout
  - sugiyama
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN in the kymo DSL — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-DSL-001                              |
| Version      | 1.3                                                |
| Status       | Released                                           |
| Issue Date   | 2026-06-06                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-BPMN-DSL-001, TEST-BPMN-DSL-001, PLAN-BPMN-DSL-001, BPMN-MAP-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting
conventions. Each requirement carries a stable ID for traceability from
TEST-BPMN-DSL-001. This document consolidates the product description
(stakeholder needs) and the introduction with the software requirements;
realisation is in DESIGN-BPMN-DSL-001. The set conforms to
ISO/IEC/IEEE 12207:2017 (life-cycle processes) and ISO/IEC/IEEE 15289:2019
(information-item content).

## 1. Introduction and scope

This document introduces the **BPMN-in-kymo** feature, states whose needs it
serves, and specifies what it must do. It is the entry point to the feature's
document set and the normative requirements baseline.

### 1.1 Problem & motivation

Authoring BPMN in `.kymo` today requires placing every `bpmn-*` leaf at an
explicit `@ (x,y)` and hand-tracing every edge's `via` waypoints (see
`samples/order-fulfillment.kymo`). This is laborious and error-prone. Tools such
as Mermaid let an author describe a process textually and lay it out
automatically (cf. RES-MERMAID-D2-001). kymo can already *import* BPMN 2.0 XML
(BPMN-MAP-001) but cannot *author* it concisely.

### 1.2 Feature concept

A new file-scope `bpmn { … }` block in the kymo DSL lets an author
describe a process as typed nodes and flows — *declare-then-connect* — and have
the engine lay it out:

- **Declarative**: `start`/`task`/`xor`/`and`/`end` … node kinds, then `->`
  connections.
- **Auto-layout**: a left-to-right layered (Sugiyama/DAG) layout positions nodes
  and routes orthogonal flows.
- **Hybrid coordinates**: a node may add `@ (x,y)` to pin/override its position;
  un-pinned nodes are auto-placed.
- **Renderer reuse**: the block emits a fully-resolved sub-diagram (absolute
  positions + edge waypoints) exactly like the BPMN importer, so the existing
  `bpmn-*` glyphs and flow renderer draw it unchanged.

The normative grammar is in KYMO-DSL-001; the architecture and algorithm in
DESIGN-BPMN-DSL-001.

### 1.3 Scope

**Scope (this SRS):** provide a concise, auto-laid-out way to author BPMN diagrams directly in
`.kymo`, so a process can be expressed as nodes + flows without manual coordinates or waypoints, while
preserving the ability to pin positions when needed. Mirrored in `packages/python` and
`packages/js`, golden-stable, with **no** renderer/importer change.

**Out of scope (v1):** LR direction only (TB/RL later); no pools/lanes inside the block; no
constrained-pin reflow; no fenced `bpmn` code-block alias (deferred — see PLAN-BPMN-DSL-001
§future work, and §5 below).

### 1.4 Audience

Engineers implementing or reviewing the kymo DSL parser, the layout engine, and
the Python/JS renderers; and maintainers verifying conformance.

### 1.5 Terms and abbreviations

- **BPMN** — Business Process Model and Notation 2.0.
- **DSL** — the kymo domain-specific language (`.kymo`); see KYMO-DSL-001.
- **Block** — the brace-delimited `bpmn { … }` construct.
- **Leaf / node** — a single rendered element (a `bpmn-*` `Component`).
- **Flow** — a directed edge (sequence / message / association).
- **DAG** — directed acyclic graph.
- **Sugiyama** — layered graph-drawing method (rank → order → coordinates).
- **Pin** — a node carrying an explicit `@ (x,y)` override.

### 1.6 Document map

This feature's docs use a four-document layout in this folder — `01-REQUIREMENTS`
(this), `02-DESIGN`, `03-TEST`, `04-PLAN` — plus a `CR/` change-request log.

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` (this) | FEAT-BPMN-DSL-001 | *whose needs (`SN-BPMN-DSL`) and what must it do? (`FR`/`NFR`)* |
| 02 | `02-DESIGN.md` | DESIGN-BPMN-DSL-001 | *how is it built?* |
| 03 | `03-TEST.md` | TEST-BPMN-DSL-001 | *how do we know it's right?* |
| 04 | `04-PLAN.md` | PLAN-BPMN-DSL-001 | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Reading order: **`01-REQUIREMENTS`** (this) → **`02-DESIGN`** → **`03-TEST`**;
for delivery status read **`04-PLAN`** (PLAN-BPMN-DSL-001). Cross-document
references use **`document_id`** (never file paths); the numeric `NN-` prefixes
are a reading-order aid only.

- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/format-bpmn/modules/dsl/CR/` and re-baselined (bump version + record in Annex A).

## 2. Stakeholder needs (`SN-BPMN-DSL`)

Stakeholder needs (`SN-BPMN-DSL-01..04`, ISO 29148 §6.4.2 ConOps) frame whose
problem this feature solves; each requirement in §3–§5 traces back to them via
the **Source need** annotation on its requirement group.

**Users & context of operations (ConOps).**

- **Who:** authors of `.kymo` diagrams who want to express a BPMN process concisely, plus engineers
  and maintainers of the kymo DSL parser, layout engine, and Python/JS renderers.
- **Substrate it builds on (unchanged):** the kymo DSL; the BPMN importer's element
  mapping (BPMN-MAP-001) — the block reuses the same `(shape, marker)` / flow classification; and
  the existing `bpmn-*` glyphs + flow renderer, which draw the emitted sub-diagram without change.
- **Scenario:** an author writes a `bpmn { … }` block of typed nodes + flows, optionally pinning a
  few nodes with `@ (x,y)`; the engine lays out the rest and emits a fully-resolved sub-diagram the
  renderer draws directly — no manual coordinates or waypoints required.

| ID | Need | Rationale |
|----|------|-----------|
| `SN-BPMN-DSL-01` | Authors must be able to express a BPMN process **concisely** as typed nodes + flows (*declare-then-connect*) in `.kymo`, **without** manual `@ (x,y)` coordinates or hand-traced `via` waypoints. | Today's `bpmn-*` authoring is laborious and error-prone; textual tools (Mermaid) auto-lay-out instead. |
| `SN-BPMN-DSL-02` | The engine must **auto-lay-out** the block (left-to-right layered/Sugiyama) and route flows, while letting an author **pin** any node's position with `@ (x,y)` when the auto result needs overriding. | Combines hands-off authoring with escape-hatch control over placement. |
| `SN-BPMN-DSL-03` | The feature must **reuse the existing renderer** — emit a fully-resolved sub-diagram (absolute positions + edge waypoints) like the BPMN importer — so the `bpmn-*` glyphs and flow renderer draw it unchanged, with no golden/baseline churn. | Keeps the renderer dumb and protects byte-stable goldens and the corpus baseline. |
| `SN-BPMN-DSL-04` | The capability must exist with **equivalent functionality in both** `packages/python` and `packages/js`, the JS implementation staying dependency-free. | The two implementations are kept at parity. |

## 3. Functional requirements

**Block & grammar** *(Source need: `SN-BPMN-DSL-01`)*
- **FR-1** The DSL SHALL accept a file-scope `bpmn { … }` block; its body uses a
  *declare-then-connect* sub-grammar. Normative EBNF lives in KYMO-DSL-001.
- **FR-2** A node declaration SHALL be `<kind> <id> "Label" [type=<subtype>] [@ (x,y)]`.

Example (informative):

```
bpmn {
  start S  "Order received"
  task  V  "Validate order"
  xor   GW "In stock?"
  task  N  "Notify customer" @ (560,90)   # pinned
  end!  C  "Order cancelled"               # end! = terminate
  task  P  "Process payment"
  and   SP "Split"
  and   Sy "Sync"
  task  Sh "Ship order"
  end   D  "Order delivered"

  S -> V -> GW
  GW -> P : "Yes"
  GW -> N : "No"
  N -> C
  P -> SP
  SP -> Pk ; SP -> Iv          # fork
  Pk -> Sy ; Iv -> Sy          # join
  Sy -> Sh -> D
}
```

**Nodes** *(Source need: `SN-BPMN-DSL-01`, `SN-BPMN-DSL-03`)*
- **FR-3** Node kinds SHALL map to `(shape, marker)`: `start`→bpmn-start,
  `end`→bpmn-end, `end!`→bpmn-end+terminate, `task`→bpmn-task,
  `xor`→gateway/exclusive, `and`→gateway/parallel, `or`→gateway/inclusive,
  `event`→bpmn-intermediate, `subprocess`→bpmn-subprocess, `note`→bpmn-annotation,
  `data`→data-object, `store`→data-store.
- **FR-4** An optional `type=<subtype>` modifier SHALL select finer markers
  (e.g. `task type=user`, `start type=message`, `event type=timer`), mapping to
  the `bpmn_shapes` marker keys (BPMN-MAP-001).
- **FR-5** Node box sizes SHALL come from `model.SHAPE_HALF` (event 36 / task
  100×80 / gateway 50), set on `Component.size`.

**Connections** *(Source need: `SN-BPMN-DSL-01`)*
- **FR-6** Connections SHALL support flow kinds: `->` sequence, `~>` message
  (dashed), `..>` association (dotted, no head).
- **FR-7** A chain `A -> B -> C` SHALL expand to segments; `;` SHALL separate
  statements on one line; a `: "label"` SHALL be permitted on single segments.

**Layout & coordinates** *(Source need: `SN-BPMN-DSL-02`, `SN-BPMN-DSL-03`)*
- **FR-8** Nodes without `@` SHALL be auto-laid-out by a left-to-right layered
  (Sugiyama/DAG) layout: rank assignment, crossing-minimised ordering,
  coordinate assignment, orthogonal routing.
- **FR-9** A node with `@ (x,y)` SHALL be pinned: its centre overrides the
  engine's result and its incident edges re-route to the pinned centre. Pins
  SHALL NOT re-rank/re-order un-pinned nodes (v1).
- **FR-10** The block SHALL emit a fully-resolved sub-diagram — `Component`s with
  absolute `pos`/`size` and `Edge`s carrying `points` + `bpmn_flow` — so the
  existing renderer draws it unchanged (no `to_svg`/`render` change).

**Parity** *(Source need: `SN-BPMN-DSL-04`)*
- **FR-11** The feature SHALL exist with equivalent functionality in both
  `packages/python` and `packages/js`.

## 4. Non-functional requirements

- **NFR-1** Layout SHALL be deterministic (stable tie-breaks, fixed iteration
  counts, integer coordinates) so golden SVGs are byte-stable.
- **NFR-2** The change SHALL NOT alter any existing golden or
  `test_bpmn_corpus` baseline (no renderer/importer change).
- **NFR-3** The JS implementation SHALL remain dependency-free (ESM + `.d.ts`).
- **NFR-4** Cross-language output need NOT be byte-identical; parity is
  functional equivalence.

## 5. Constraints, assumptions, out-of-scope (v1)

- LR direction only (TB/RL later); no pools/lanes inside the block; no
  constrained-pin reflow; no fenced `bpmn` code-block alias. These are deferred
  (see PLAN-BPMN-DSL-001 §future work).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial issue. |
| 0.2     | 2026-05-23 | Vũ Anh | Doc-set version sync after P0 (spike) complete; requirements unchanged. |
| 1.0     | 2026-05-23 | Vũ Anh | Released — feature shipped (P0–P3 merged; normative grammar in KYMO-DSL-001 §6.9). |
| 1.1 | 2026-05-24 | Vũ Anh | Corrected the importer-mapping cross-reference to BPMN-MAP-001 (the importer doc gained an ID; moved to docs/formats/bpmn.md). |
| 1.2 | 2026-05-25 | Vũ Anh | **Doc reorganization.** Moved §1 stakeholder needs to `FEAT-BPMN-DSL-001`; minted `SN-BPMN-DSL-01..04` and annotated each FR group with its Source need; §1 now points to the product description and keeps only scope. No requirement content changed. |
| 1.3 | 2026-06-06 | Vũ Anh | Consolidated FEAT-BPMN-DSL-001 (stakeholder needs) and FEAT-BPMN-DSL-001 (introduction/map) into this requirements doc under the new 4-document module layout (01-REQUIREMENTS/02-DESIGN/03-TEST/04-PLAN). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/format-bpmn/modules/dsl/01-REQUIREMENTS.md`; authoritative
source is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant FR/NFR (preserving
IDs); update TEST-BPMN-DSL-001's traceability matrix; increment `version`;
append a row to Annex A; reflect any grammar change in KYMO-DSL-001.

### B.4 Backwards Compatibility
Requirement IDs are stable across revisions; a removed requirement SHALL be
marked withdrawn (not re-used) so traceability links remain valid.

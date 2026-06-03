---
title: BPMN in the kymo DSL — Requirements
document_id: FEAT-BPMN-DSL-001
version: "1.2"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the BPMN-in-kymo feature
review_cycle: On phase completion, or on grammar change
supersedes: null
related_documents:
  - PROD-BPMN-DSL-001         # Product description (stakeholder needs)
  - INTRO-BPMN-DSL-001        # Introduction
  - DESIGN-BPMN-DSL-001    # Design
  - TEST-BPMN-DSL-001    # Test documentation
  - PLAN-BPMN-DSL-001   # Plan
  - BPMN-MAP-001              # BPMN importer element mapping
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - dsl
  - requirements
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN in the kymo DSL — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-DSL-001                              |
| Version      | 1.2                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-25                                         |
| Owner        | `diagrams/` project                                |
| Related      | PROD-BPMN-DSL-001 (stakeholder needs), INTRO-BPMN-DSL-001, DESIGN-BPMN-DSL-001, TEST-BPMN-DSL-001, PLAN-BPMN-DSL-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting
conventions. Each requirement carries a stable ID for traceability from
TEST-BPMN-DSL-001. Concept and rationale: INTRO-BPMN-DSL-001; realisation:
DESIGN-BPMN-DSL-001.

## 1. Scope and stakeholder needs

Stakeholder needs (`SN-BPMN-DSL-01..04`, ISO 29148 §6.4.2 ConOps) are owned by the product
description **`PROD-BPMN-DSL-001`** (`00-PRODUCT.md`); each requirement below traces back to them via
the **Source need** annotation on its requirement group.

**Scope (this SRS):** provide a concise, auto-laid-out way to author BPMN diagrams directly in
`.kymo`, so a process can be expressed as nodes + flows without manual coordinates or waypoints, while
preserving the ability to pin positions when needed.

## 2. Functional requirements

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

## 3. Non-functional requirements

- **NFR-1** Layout SHALL be deterministic (stable tie-breaks, fixed iteration
  counts, integer coordinates) so golden SVGs are byte-stable.
- **NFR-2** The change SHALL NOT alter any existing golden or
  `test_bpmn_corpus` baseline (no renderer/importer change).
- **NFR-3** The JS implementation SHALL remain dependency-free (ESM + `.d.ts`).
- **NFR-4** Cross-language output need NOT be byte-identical; parity is
  functional equivalence.

## 4. Constraints, assumptions, out-of-scope (v1)

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
| 1.2 | 2026-05-25 | Vũ Anh | **Doc reorganization.** Moved §1 stakeholder needs to `PROD-BPMN-DSL-001`; minted `SN-BPMN-DSL-01..04` and annotated each FR group with its Source need; §1 now points to the product description and keeps only scope. No requirement content changed. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn-dsl/02-FEATURE.md`; authoritative
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

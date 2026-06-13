---
title: BPMN 2.0 Export — Requirements
document_id: FEAT-BPMN-EXPORT-001
version: "1.2"
issue_date: 2026-06-06
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the BPMN export feature
review_cycle: On phase completion, or on BPMN-mapping change
supersedes:
  - FEAT-BPMN-EXPORT-001
  - FEAT-BPMN-EXPORT-001
related_documents:
  - FEAT-BPMN-001                # Umbrella feature
  - DESIGN-BPMN-EXPORT-001       # Design
  - TEST-BPMN-EXPORT-001         # Test documentation
  - PLAN-BPMN-EXPORT-001         # Plan
  - BPMN-MAP-001                 # BPMN importer element mapping (inverted here)
  - DESIGN-BPMN-DSL-001          # BPMN-in-DSL design
  - REF-BPMNIO-CMP-001           # bpmn.io comparison (lossless round-trip benchmark)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - export
  - requirements
  - traceability
  - round-trip
  - interchange
  - introduction
  - conops
  - stakeholder-requirements
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN 2.0 Export — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-EXPORT-001                               |
| Version      | 1.2                                                |
| Status       | Released                                           |
| Issue Date   | 2026-06-06                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-BPMN-EXPORT-001, TEST-BPMN-EXPORT-001, PLAN-BPMN-EXPORT-001, BPMN-MAP-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting
conventions. Each requirement carries a stable ID for traceability from
TEST-BPMN-EXPORT-001. Realisation: DESIGN-BPMN-EXPORT-001. The mapping inverts
BPMN-MAP-001.

## 1. Introduction and scope

This document is the entry point to the **BPMN 2.0 export** feature: it states the
problem, the concept, the terminology, the stakeholder needs, and the normative
requirements (`FR`/`NFR`). The set conforms to ISO/IEC/IEEE 12207:2017 (life-cycle
processes) and ISO/IEC/IEEE 15289:2019 (information-item content).

### 1.1 Background

kymo can already **import** BPMN 2.0 XML (`from_bpmn`, BPMN-MAP-001) and, since
KYMO-DSL-001 §6.9, **author** BPMN textually with the `bpmn { }` block. But all of
kymo's *output* paths are **one-way**: SVG, animated WebP, Figma, and Excalidraw —
none is a standard, machine-readable interchange format. The tool comparisons under
`docs/tools/` make this the recurring gap: bpmn.io (REF-BPMNIO-CMP-001), Camunda
(REF-CAMUNDA-CMP-001), Signavio (REF-SIGNAVIO-CMP-001), and Flowable
(REF-FLOWABLE-CMP-001) all *"round-trip standard BPMN 2.0 XML losslessly"* while
*"kymo's exporters are one-way with no standard interchange format."*

### 1.2 Feature concept

Add a **BPMN 2.0 XML emitter** — `to_bpmn` — that is the **inverse of `from_bpmn`**:
it turns a kymo `Diagram` (whose components are `bpmn-*` glyphs, whether imported
from `.bpmn` or authored with the `bpmn { }` block) back into a complete, well-formed
BPMN 2.0 document — both the **semantic** model (`<process>` / `<collaboration>`
with events, tasks, gateways, flows) and the **Diagram-Interchange** geometry
(`<bpmndi:BPMNDiagram>` with shape bounds + edge waypoints).

- **Round-trip**: `.bpmn` → import → kymo `Diagram` → **export** → `.bpmn` preserves
  the structure and layout — closing the interchange gap above.
- **Inverse mapping**: every `(shape, marker)` and `bpmn_flow` maps back to the BPMN
  element it came from (the exact reverse of BPMN-MAP-001's table).
- **Reuse**: emits a `.bpmn` from any `Diagram`; the CLI gains a `--bpmn` target and
  the Python/JS libraries gain `export` / `toBpmn`.

### 1.3 Scope

Provide a way to turn a kymo `Diagram` of BPMN glyphs (imported via `from_bpmn`
or authored with the `bpmn { }` block) into a standard **BPMN 2.0 XML** file, so kymo
participates in BPMN tool interchange and supports `.bpmn` → kymo → `.bpmn` round-trip
— the gap identified in §1.1.

### 1.4 Audience

Engineers implementing or reviewing the kymo emitters and BPMN importer, and
maintainers verifying round-trip fidelity against real-world `.bpmn` corpora.

### 1.5 Terms and abbreviations

- **BPMN** — Business Process Model and Notation 2.0 (OMG).
- **DI** — BPMN Diagram Interchange: the `<bpmndi:*>` geometry (shape bounds, edge waypoints).
- **Semantic model** — the `<process>` / `<collaboration>` element tree (the *meaning*, distinct from the *diagram*).
- **Round-trip** — import then export (or vice-versa) preserving structure + layout.
- **Importer** — `from_bpmn` (BPMN-MAP-001); this feature is its inverse.
- **Emitter** — an output back-end (`to_svg`, `to_figma`, …); `to_bpmn` is the new one.

### 1.6 Document map

This feature's docs use the standard 4-document module layout in this folder — a
**baselined spec** (`01-REQUIREMENTS`–`03-TEST`) and a **living plan**
(`04-PLAN.md` + `CR/`). The documents for bpmn-export:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` (this) | FEAT-BPMN-EXPORT-001 | *what product problem & whose needs (`SN-BPMN-EXPORT`), and what must it do (`FR`/`NFR`)?* |
| 02 | `02-DESIGN.md` | DESIGN-BPMN-EXPORT-001 | *how is it built?* |
| 03 | `03-TEST.md` | TEST-BPMN-EXPORT-001 | *how do we know it's right?* |
| 04 | `04-PLAN.md` | PLAN-BPMN-EXPORT-001 | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Reading order: **`01-REQUIREMENTS`** (this — product context + `SN-BPMN-EXPORT` needs
+ requirements) → **`02-DESIGN`** → **`03-TEST`**; for delivery status read
**`04-PLAN`** (`PLAN-BPMN-EXPORT-001`). Cross-document references use **`document_id`**
(never file paths); the numeric `NN-` prefixes are a reading-order aid only.

- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/format-bpmn/modules/export/CR/` and re-baselined (bump version + record in Annex A).

## 2. Stakeholder needs (`SN-BPMN-EXPORT`)

> This section owns the `SN-BPMN-EXPORT-NN` stakeholder needs; the requirements below
> derive `FR`/`NFR` from them.

**Problem & motivation.** kymo can already **import** BPMN 2.0 XML (`from_bpmn`,
`BPMN-MAP-001`) and, since `KYMO-DSL-001` §6.9, **author** BPMN textually with the
`bpmn { }` block. But all of kymo's *output* paths are **one-way**: SVG, animated WebP,
Figma, and Excalidraw — none is a standard, machine-readable interchange format. The
feature adds a **BPMN 2.0 XML emitter** — `to_bpmn` — that is the **inverse of
`from_bpmn`**: it turns a kymo `Diagram` (whose components are `bpmn-*` glyphs, whether
imported from `.bpmn` or authored with the `bpmn { }` block) back into a complete,
well-formed BPMN 2.0 document — both the **semantic** model (`<process>` /
`<collaboration>` with events, tasks, gateways, flows) and the **Diagram-Interchange**
geometry (`<bpmndi:BPMNDiagram>` with shape bounds + edge waypoints).

**Users & context of operations (ConOps).**

- **Who:** users moving process models between kymo and the BPMN tool ecosystem (Camunda, bpmn.io,
  Signavio, Flowable), plus engineers and maintainers of the kymo emitters and BPMN importer
  verifying round-trip fidelity against real-world `.bpmn` corpora.
- **Substrate it builds on (unchanged):** the BPMN importer's element mapping (`BPMN-MAP-001`), which
  this feature **inverts**; the `bpmn { }` authoring block (`DESIGN-BPMN-DSL-001`); and the existing
  emitter pattern (`to_svg` / `to_figma` / …) that `to_bpmn` joins.
- **Scenario:** `.bpmn` → import → kymo `Diagram` → **export** → `.bpmn` preserves the structure and
  layout, closing the interchange gap; the CLI gains a `--bpmn` target and the Python/JS libraries
  gain `export` / `toBpmn`.

**Goals & non-goals.**

- **Goals:** turn any `Diagram` of `bpmn-*` glyphs into a standard, well-formed BPMN 2.0 XML file —
  semantic model + DI geometry — so kymo participates in BPMN tool interchange and supports
  `.bpmn` → kymo → `.bpmn` round-trip; mirrored in Python and JS, deterministic, with no new runtime
  deps.
- **Non-goals (v1):** exporting an arbitrary (non-BPMN) diagram; **byte** round-trip (the export
  reproduces the model + DI equivalently, not the original file's exact bytes/formatting/comments);
  executable semantics (`<conditionExpression>` bodies, listeners, forms, IO); and animation (BPMN is
  static). Deferred — see `PLAN-BPMN-EXPORT-001`.

**Stakeholder needs.**

| ID | Need | Rationale |
|----|------|-----------|
| `SN-BPMN-EXPORT-01` | kymo must be able to **emit standard, well-formed BPMN 2.0 XML** from a `Diagram` of `bpmn-*` glyphs — both the semantic model and the DI geometry — so it participates in BPMN tool interchange. | Every output path today is one-way; peer tools round-trip standard BPMN losslessly. |
| `SN-BPMN-EXPORT-02` | A `.bpmn` imported into kymo must **round-trip** back out — `.bpmn` → kymo → `.bpmn` — preserving structure and layout (semantic + DI equivalence, within integer rounding). | Round-trip fidelity is the headline acceptance; it is what closes the interchange gap. |
| `SN-BPMN-EXPORT-03` | The mapping must be the **exact inverse of the importer** (`BPMN-MAP-001`): every `(shape, marker)` and `bpmn_flow` maps back to the BPMN element it came from, deterministically. | A single classification source avoids drift between import and export. |
| `SN-BPMN-EXPORT-04` | Export must be reachable from the **CLI** (a `--bpmn` target) and the **Python/JS libraries** (`export` / `toBpmn`), with **equivalent functionality in both** and no new runtime dependencies. | Consistent surface across the two implementations, kept dependency-free. |

## 3. Functional requirements

**Entry & document** *(Source need: `SN-BPMN-EXPORT-01`)*
- **FR-1** A `to_bpmn` emitter SHALL turn a `Diagram` into a well-formed BPMN 2.0
  XML string: a `<definitions>` root with the `bpmn` / `bpmndi` / `dc` / `di`
  namespaces, a semantic body (`<process>`, or `<collaboration>` + per-pool
  `<process>` when pools are present), and a `<bpmndi:BPMNDiagram>` DI section.

**Semantic mapping (inverse of BPMN-MAP-001)** *(Source need: `SN-BPMN-EXPORT-01`, `SN-BPMN-EXPORT-03`)*
- **FR-2** Each `bpmn-*` `Component` SHALL map back to its BPMN element by the
  inverse of `from_bpmn`'s classification: events (`bpmn-start`/`bpmn-end`/
  `bpmn-intermediate`/`bpmn-boundary`) with the matching `*EventDefinition` child
  from the marker (`message`/`timer`/`terminate`/…); tasks (`bpmn-task` + marker →
  `task`/`userTask`/`serviceTask`/…); gateways (`bpmn-gateway` + marker →
  `exclusiveGateway` (with `isMarkerVisible`)/`parallelGateway`/…); `bpmn-data-object`
  → `dataObjectReference`, `bpmn-data-store` → `dataStoreReference`, `bpmn-annotation`
  → `textAnnotation`, `bpmn-subprocess` → collapsed `subProcess`. `name` SHALL come
  from `Component.name`; the element `id` from `Component.id`.
- **FR-3** Each `Edge` SHALL map by `bpmn_flow`: `sequence`→`<sequenceFlow>`,
  `message`→`<messageFlow>`, `association`→`<association>`; `default`→a `<sequenceFlow>`
  **and** `default="<id>"` on the source node; `conditional`→a `<sequenceFlow>` with a
  `<conditionExpression>` child. `sourceRef`/`targetRef` SHALL be `Edge.src`/`Edge.dst`;
  `name` from `Edge.label`.

**Diagram-Interchange geometry** *(Source need: `SN-BPMN-EXPORT-02`)*
- **FR-4** The DI section SHALL be derived from kymo geometry: a `<bpmndi:BPMNShape>`
  with `<dc:Bounds>` per component (top-left = `pos − size/2`, width/height = `size`);
  a `<bpmndi:BPMNEdge>` with `<di:waypoint>`s from `Edge.points`; a `<bpmndi:BPMNLabel>`
  `<dc:Bounds>` from `Edge.label_pos`, plus a per-node `<bpmndi:BPMNLabel>` `<dc:Bounds>`
  from `Component.label_box` (top-left = `label_box.centre − size/2`) so positioned node
  labels round-trip. Coordinates SHALL **de-normalise** the importer's
  `MARGIN` shift so exported geometry sits in a tidy positive plane.

**Containers** *(Source need: `SN-BPMN-EXPORT-02`, `SN-BPMN-EXPORT-03`)*
- **FR-5** Pools / lanes / groups (`Region` style `pool`/`lane`/`outer`) SHALL emit a
  `<collaboration>` with `<participant>` (and per-pool `<process>`), `<laneSet>` /
  `<lane>` with `<flowNodeRef>` membership, and `<group>` respectively; an expanded
  sub-process (`Region`) SHALL emit `<subProcess isExpanded="true">` containing its
  member elements.

**Interface & parity** *(Source need: `SN-BPMN-EXPORT-03`, `SN-BPMN-EXPORT-04`)*
- **FR-6** Element `id`s SHALL be preserved, and output SHALL be deterministic
  (stable element ordering) so re-export of the same `Diagram` is byte-identical.
- **FR-7** The CLI SHALL gain a `--bpmn` target writing a `.bpmn` file (mirroring
  `--figma` / `--excalidraw`); the Python library SHALL expose `to_bpmn.export(d)`.
- **FR-8** The feature SHALL exist with equivalent functionality in both
  `packages/python` and `packages/js` (`toBpmn(d)`).

## 4. Non-functional requirements

- **NFR-1** **Round-trip fidelity** — for a DI-bearing `.bpmn`, `import → export →
  re-import` SHALL preserve component / edge / region counts and per-id shape, marker,
  flow kind, and geometry (within integer rounding).
- **NFR-2** Output SHALL be **well-formed and valid BPMN 2.0** — it parses as XML and
  re-imports via `from_bpmn` (and opens in bpmn.io).
- **NFR-3** No new runtime dependencies — Python uses the standard-library XML writer;
  the JS implementation stays dependency-free.
- **NFR-4** Output SHALL be deterministic (byte-stable for a given `Diagram`).

## 5. Constraints, assumptions, out-of-scope (v1)

- Only diagrams whose components are `bpmn-*` glyphs export meaningfully; exporting an
  arbitrary (non-BPMN) diagram is out of scope.
- **Semantic, not byte, round-trip** — the export reproduces the model + DI
  equivalently, not the original file's exact bytes/formatting/comments.
- No executable semantics — `<conditionExpression>` bodies are a placeholder or taken
  from the edge label, not evaluated; no listeners/forms/IO.
- No animation (BPMN is static). Deferred (see PLAN-BPMN-EXPORT-001).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial issue. |
| 1.0 | 2026-05-24 | Vũ Anh | Released — P4 complete: BPMN-MAP-001 Export section added; doc set marked Released; importer-mapping citations repointed. |
| 1.1 | 2026-05-25 | Vũ Anh | **Doc reorganization.** Moved §1 stakeholder needs to the product description; minted `SN-BPMN-EXPORT-01..04` and annotated each FR group with its Source need; §1 pointed to the product description and kept only scope. No requirement content changed. |
| 1.2 | 2026-06-06 | Vũ Anh | Consolidated FEAT-BPMN-EXPORT-001 (stakeholder needs) and FEAT-BPMN-EXPORT-001 (introduction/map) into this requirements doc under the new 4-document module layout (01-REQUIREMENTS/02-DESIGN/03-TEST/04-PLAN). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/format-bpmn/modules/export/01-REQUIREMENTS.md`; authoritative source
is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant FR/NFR (preserving IDs);
update TEST-BPMN-EXPORT-001's traceability matrix; increment `version`; append a
row to Annex A.

### B.4 Backwards Compatibility
Requirement IDs are stable across revisions; a removed requirement SHALL be marked
withdrawn (not re-used) so traceability links remain valid.

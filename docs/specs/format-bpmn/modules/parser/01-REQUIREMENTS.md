---
title: BPMN 2.0 Import — Requirements
document_id: FEAT-BPMN-PARSER-001
version: "1.2"
issue_date: 2026-06-06
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the BPMN importer; stakeholders, reviewers
review_cycle: On phase completion, or on BPMN-mapping change
supersedes:
  - FEAT-BPMN-PARSER-001
  - FEAT-BPMN-PARSER-001
related_documents:
  - DESIGN-BPMN-PARSER-001       # Design
  - TEST-BPMN-PARSER-001         # Test documentation
  - PLAN-BPMN-PARSER-001         # Plan
  - FEAT-BPMN-001                # Umbrella requirements (bpmn feature)
  - BPMN-MAP-001                 # BPMN element mapping (the normative import table)
  - BPMN-NREF-001                # BPMN normative references
  - DESIGN-BPMN-EXPORT-001       # BPMN export design (the inverse)
  - REF-BPMNIO-CMP-001           # bpmn.io comparison (round-trip benchmark)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - import
  - requirements
  - traceability
  - product-description
  - conops
  - stakeholder-requirements
  - parser
  - diagram-interchange
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN 2.0 Import — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-PARSER-001                               |
| Version      | 1.2                                                |
| Status       | Released                                           |
| Issue Date   | 2026-06-06                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-BPMN-PARSER-001, TEST-BPMN-PARSER-001, PLAN-BPMN-PARSER-001, BPMN-MAP-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting
conventions. Each requirement carries a stable ID for traceability from
TEST-BPMN-PARSER-001. Realisation: DESIGN-BPMN-PARSER-001. The element mapping is
BPMN-MAP-001 (this feature is its import direction; DESIGN-BPMN-EXPORT-001 is the
inverse).

## 1. Introduction and scope

This document is the requirements baseline for the **BPMN 2.0 import** feature — the
parser that turns a standard `.bpmn` file into a kymo `Diagram` — and is the entry point
to its document set. It states the problem and concept, captures the stakeholder needs,
and specifies the functional/non-functional requirements. The element-level mapping is
normative in BPMN-MAP-001 and is referenced, not duplicated, here. The set conforms to
ISO/IEC/IEEE 12207:2017 (life-cycle processes) and ISO/IEC/IEEE 15289:2019
(information-item content).

**Background.** kymo authors diagrams from its own `.kymo` DSL, but the world's process
models already exist as **BPMN 2.0 XML** exported by Camunda Modeler, bpmn.io, SAP
Signavio, Bizagi, Visual Paradigm and ~20 other tools (REF-BPMN-001 surveys the
standard). To render, convert, or re-export those models, kymo must first **ingest** them.
Unlike a `.kymo` source, a `.bpmn` file already carries its own geometry in a
**Diagram-Interchange** (DI) section — shape bounds and edge waypoints — so importing is a
matter of *reading* layout, not *computing* it.

**Feature concept.** A **BPMN 2.0 XML importer** — `from_bpmn` (Python) / `parseBpmn`
(JS) — turns a `.bpmn` document into a **fully-resolved** kymo `Diagram` the existing SVG
renderer can draw directly:

- **Geometry from DI**: each `<bpmndi:BPMNShape>` `<dc:Bounds>` gives a node's box; each
  `<bpmndi:BPMNEdge>` `<di:waypoint>` list gives a flow's polyline. Because the
  coordinates are authored in the file, **no layout or alignment pass runs** — `cli`
  skips `layout()` / `resolve_alignments()` for `.bpmn` sources.
- **Semantic → glyph mapping**: every flow-node element maps to a `bpmn-*` glyph
  `(shape, marker)`, and pools / lanes / groups / expanded sub-processes map to
  `Region`s — the exact reverse of BPMN-MAP-001's table.
- **Namespace-agnostic**: the parser matches on *local* tag names, so it accepts the
  `bpmn:` / `bpmn2:` / default-namespace prefix any tool emits.

Two properties make this feature non-trivial and worth specifying on its own: it is the
**inverse** of BPMN export (DESIGN-BPMN-EXPORT-001) — the two together give a `.bpmn` →
kymo → `.bpmn` round-trip and share one classification table; and it exists as **two
independent implementations** — Python (`from_bpmn`) and dependency-free TypeScript
(`parseBpmn`) — kept at parity, now locked by a cross-language conformance suite
(TEST-BPMN-PARSER-001).

**Scope (this SRS):** turn a standard **BPMN 2.0 XML** file — as emitted by Camunda,
bpmn.io, Signavio and peers — into a fully-resolved kymo `Diagram`, so kymo can render,
convert, and re-export real-world process models and participate in BPMN tool
interchange. Geometry is authored in the file's Diagram-Interchange section, so import
*reads* layout rather than computing it.

### 1.1 Terms and abbreviations

- **BPMN** — Business Process Model and Notation 2.0 (OMG; ISO/IEC 19510). See REF-BPMN-001.
- **DI** — BPMN Diagram Interchange: the `<bpmndi:*>` geometry (shape bounds, edge waypoints).
- **`BPMNShape` / `dc:Bounds`** — a node's authored box (`x`, `y`, `width`, `height`).
- **`BPMNEdge` / `di:waypoint`** — a flow's authored polyline points.
- **Semantic model** — the `<process>` / `<collaboration>` element tree (the *meaning*, distinct from the *diagram*).
- **Glyph / marker** — a kymo `bpmn-*` shape and its sub-type marker (event-definition / task-type / gateway-type), carried in `Component.icon`.
- **Pool / lane** — BPMN swimlanes; imported as `Region`s (`pool` / `lane`).
- **Emitter** — the inverse output back-end `to_bpmn` (DESIGN-BPMN-EXPORT-001).

### 1.2 Document map

This feature's docs use the **4-document module layout** in this folder — the baselined
spec (`01-REQUIREMENTS` / `02-DESIGN` / `03-TEST`) and a living plan (`04-PLAN` + `CR/`):

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` (this) | FEAT-BPMN-PARSER-001 | *what product problem & whose needs (`SN`), and what must it do (`FR`/`NFR`)?* |
| 02 | `02-DESIGN.md` | DESIGN-BPMN-PARSER-001 | *how is it built?* |
| 03 | `03-TEST.md` | TEST-BPMN-PARSER-001 | *how do we know it's right?* |
| 04 | `04-PLAN.md` | PLAN-BPMN-PARSER-001 | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Reading order: **`01-REQUIREMENTS`** (this — product context + `SN` needs + `FR`/`NFR`) →
**`02-DESIGN`** → **`03-TEST`**; for delivery status read `PLAN-BPMN-PARSER-001`.
Cross-document references use **`document_id`** (never file paths); the numeric `NN-`
prefixes are a reading-order aid only. The element mapping shared with export is
`BPMN-MAP-001`; the standard itself is `REF-BPMN-001`.

- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/format-bpmn/modules/parser/CR/` and re-baselined (bump version + record in Annex A).

## 2. Stakeholder needs (`SN-BPMN-PARSER`)

Stakeholder needs (`SN-BPMN-PARSER-01..04`, ISO 29148 §6.4.2 ConOps) drive the
requirements below; each requirement traces back to them via the **Source need**
annotation on its requirement group.

| ID | Need | Rationale |
|----|------|-----------|
| `SN-BPMN-PARSER-01` | kymo must **ingest** standard BPMN 2.0 XML — as emitted by Camunda, bpmn.io, Signavio and ~20 peer tools — into a fully-resolved `Diagram`, so it can render, convert, and re-export real-world process models. | The world's process models already exist as `.bpmn`; kymo must read them to participate in the ecosystem. |
| `SN-BPMN-PARSER-02` | Import must **read** the file's authored Diagram-Interchange geometry rather than computing layout — node boxes from `<dc:Bounds>`, flow polylines from `<di:waypoint>`s — so no auto-layout/alignment pass perturbs it. | DI carries the layout; recomputing it would discard the author's intent. |
| `SN-BPMN-PARSER-03` | The parser must be **namespace-agnostic** and **robust**: accept the `bpmn:` / `bpmn2:` / default-namespace prefix any tool emits, and parse the full vendored MIWG corpus (~120 files) without raising or producing a partial/corrupt `Diagram`. | Real-world files vary in namespacing and encoding; robustness is a product property. |
| `SN-BPMN-PARSER-04` | The capability must exist as **two independent implementations** (`from_bpmn` in Python, `parseBpmn` in JS) that import the **same** `.bpmn` to the **same** canonical model, the JS one dependency-free. | Cross-language model parity is the headline guarantee, locked by the conformance suite. |

## 3. Functional requirements

**Entry & resolution** *(Source need: `SN-BPMN-PARSER-01`, `SN-BPMN-PARSER-02`, `SN-BPMN-PARSER-03`)*
- **FR-1** A `from_bpmn` parser SHALL turn a BPMN 2.0 XML string into a **fully-resolved**
  `Diagram` (components, regions, edges with absolute geometry). Because the file carries
  its own coordinates, the parser SHALL NOT run a layout or alignment pass — `cli` SHALL
  route `.bpmn` sources straight to the importer and skip `layout()` /
  `resolve_alignments()`.
- **FR-2** The parser SHALL be **namespace-agnostic**: it SHALL match elements on their
  *local* tag name so the `bpmn:`, `bpmn2:`, or default-namespace prefix emitted by any
  tool is accepted.

**Semantic mapping (the import direction of BPMN-MAP-001)** *(Source need: `SN-BPMN-PARSER-01`)*
- **FR-3** Each flow-node element SHALL map to a `bpmn-*` `(shape, marker)` per
  `from_bpmn`'s classification tables — events (`startEvent`/`endEvent`/
  `intermediate*Event`/`boundaryEvent` → `bpmn-start`/`bpmn-end`/`bpmn-intermediate`/
  `bpmn-boundary`, with the marker taken from the `*EventDefinition` child); tasks
  (`task`/`userTask`/`serviceTask`/… → `bpmn-task` + marker); gateways
  (`exclusiveGateway`/`parallelGateway`/… → `bpmn-gateway` + marker, the exclusive `X`
  only when DI sets `isMarkerVisible="true"`); `dataObjectReference` → `bpmn-data-object`,
  `dataStoreReference` → `bpmn-data-store`, `textAnnotation` → `bpmn-annotation`,
  collapsed `subProcess` → `bpmn-subprocess`. `Component.id` SHALL be the element `id`;
  `name` from the element `name` (annotation text from its `<text>`).
- **FR-4** Each flow element SHALL map to an `Edge` with `bpmn_flow`: `sequenceFlow` →
  `sequence` (→ `default` when the source node's `default` attribute names it; →
  `conditional` when it carries a `<conditionExpression>` and its source is not a
  gateway), `messageFlow` → `message`, `association`/data-associations → `association`.
  `Edge.src`/`dst` SHALL be `sourceRef`/`targetRef`; `label` from `name`.

**Diagram-Interchange geometry** *(Source need: `SN-BPMN-PARSER-02`)*
- **FR-5** Geometry SHALL be read from DI: `<bpmndi:BPMNShape>` `<dc:Bounds>` → a
  component **centre** `pos` (top-left + size/2) and explicit `size`; `<bpmndi:BPMNEdge>`
  `<di:waypoint>`s → `Edge.points`; a flow's `<bpmndi:BPMNLabel>` bounds → `Edge.label_pos`,
  and a node's `<bpmndi:BPMNLabel>` bounds → `Component.label_box` (its external-label box,
  centre + size) so the label keeps its authored position and width.
- **FR-6** Coordinates SHALL be **normalised** into a tidy positive plane by shifting all
  geometry so the top-left extent sits at `(MARGIN, MARGIN)`; the canvas `width`/`height`
  SHALL be derived from the shifted content extents.

**Containers** *(Source need: `SN-BPMN-PARSER-01`)*
- **FR-7** `<participant>` (pool), `<lane>`, `<group>`, and **expanded** sub-processes
  SHALL map to `Region`s (`pool` / `lane` / `outer` / `inner`); a `<subProcess>` SHALL be
  treated as expanded (→ `Region`) when DI says `isExpanded="true"` (or, absent the hint,
  when its box is large), and otherwise as a collapsed `bpmn-subprocess` component.

**Interface & parity** *(Source need: `SN-BPMN-PARSER-04`)*
- **FR-8** The feature SHALL exist with equivalent functionality in both
  `packages/python` (`from_bpmn.parse(xml) -> Diagram`, dispatched by the `kymo` CLI for
  `.bpmn` inputs) and `packages/js` (`parseBpmn(xml): Diagram`, exported from `index.ts`
  and used by `parseDiagram`).

## 4. Non-functional requirements

- **NFR-1** **Cross-language model parity** — the **same** `.bpmn` SHALL import to the
  **same** canonical model in Python and JS (field-for-field, including geometry). To
  guarantee this, both implementations SHALL round half-to-even (Python `round()` / the
  shared `pyRound` in JS) wherever a coordinate is rounded; `Math.round` (round-half-up)
  SHALL NOT be used on model coordinates.
- **NFR-2** **Robustness** — the parser SHALL parse the full vendored MIWG corpus
  (~120 real-world `.bpmn` files) without raising; a file it cannot parse SHALL be
  surfaced uniformly (no partial/corrupt `Diagram`). Non-UTF-8 files SHALL be decoded as
  UTF-8 with invalid bytes replaced.
- **NFR-3** **No new runtime dependencies** — Python uses the standard-library XML
  parser (`xml.etree.ElementTree`); the JS implementation stays dependency-free (its own
  small XML parser).
- **NFR-4** **No layout** — for `.bpmn` the authored DI geometry is authoritative; the
  importer SHALL NOT perturb it with the auto-layout / alignment passes used for `.kymo`.

## 5. Constraints, assumptions, out-of-scope (v1)

- **DI-bearing only** — files without a Diagram-Interchange section have no geometry to
  read; auto-laying them out is out of scope for the importer.
- **Lossy on advanced containers** — vertical pools are normalised to horizontal; pools
  beyond the first and nested `<childLaneSet>` hierarchies are flattened (consistent with
  BPMN-MAP-001 and the export round-trip fixpoint).
- **No executable semantics** — `<conditionExpression>` bodies, listeners, forms, and
  IO mappings are not interpreted; only the notation/diagram is imported.
- The element catalogue is exactly BPMN-MAP-001's; element types outside it are skipped
  rather than approximated.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — requirements for the shipped BPMN importer, traced in TEST-BPMN-PARSER-001. (Companion docs: FEAT-BPMN-PARSER-001 v1.0 introduction; FEAT-BPMN-PARSER-001 product description.) |
| 1.1     | 2026-05-25 | Vũ Anh | **Doc reorganization.** Moved §1 stakeholder needs to `FEAT-BPMN-PARSER-001`; minted `SN-BPMN-PARSER-01..04` and annotated each FR group with its Source need; §1 now points to the product description and keeps only scope. No requirement content changed. (FEAT-BPMN-PARSER-001 → v1.1: §6 trimmed to a document map adding `00-PRODUCT`; FEAT-BPMN-PARSER-001 v0.1 issued.) |
| 1.2     | 2026-06-06 | Vũ Anh | Consolidated FEAT-BPMN-PARSER-001 (stakeholder needs) and FEAT-BPMN-PARSER-001 (introduction/map) into this requirements doc under the new 4-document module layout (01-REQUIREMENTS/02-DESIGN/03-TEST/04-PLAN). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/format-bpmn/modules/parser/01-REQUIREMENTS.md`; the
authoritative source is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant SN/FR/NFR (preserving IDs);
update TEST-BPMN-PARSER-001's traceability matrix; reflect any mapping change against
BPMN-MAP-001; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
Requirement IDs are stable across revisions; a removed requirement SHALL be marked
withdrawn (not re-used) so traceability links remain valid. This doc supersedes and
absorbs FEAT-BPMN-PARSER-001 and FEAT-BPMN-PARSER-001.

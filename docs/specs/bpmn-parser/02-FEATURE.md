---
title: BPMN 2.0 Import — Requirements
document_id: FEAT-BPMN-PARSER-001
version: "1.1"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the BPMN importer
review_cycle: On phase completion, or on BPMN-mapping change
supersedes: null
related_documents:
  - PROD-BPMN-PARSER-001         # Product description (stakeholder needs)
  - INTRO-BPMN-PARSER-001        # Introduction
  - DESIGN-BPMN-PARSER-001       # Design
  - TEST-BPMN-PARSER-001         # Test documentation
  - PLAN-BPMN-PARSER-001         # Plan
  - BPMN-MAP-001                 # BPMN element mapping (the normative import table)
  - DESIGN-BPMN-EXPORT-001       # BPMN export design (the inverse)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - import
  - requirements
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN 2.0 Import — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-PARSER-001                               |
| Version      | 1.1                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-25                                         |
| Owner        | `diagrams/` project                                |
| Related      | PROD-BPMN-PARSER-001 (stakeholder needs), INTRO-BPMN-PARSER-001, DESIGN-BPMN-PARSER-001, TEST-BPMN-PARSER-001, PLAN-BPMN-PARSER-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting
conventions. Each requirement carries a stable ID for traceability from
TEST-BPMN-PARSER-001. Concept: INTRO-BPMN-PARSER-001; realisation:
DESIGN-BPMN-PARSER-001. The element mapping is BPMN-MAP-001 (this feature is its
import direction; DESIGN-BPMN-EXPORT-001 is the inverse).

## 1. Scope and stakeholder needs

Stakeholder needs (`SN-BPMN-PARSER-01..04`, ISO 29148 §6.4.2 ConOps) are owned by the product
description **`PROD-BPMN-PARSER-001`** (`00-PRODUCT.md`); each requirement below traces back to them
via the **Source need** annotation on its requirement group.

**Scope (this SRS):** turn a standard **BPMN 2.0 XML** file — as emitted by Camunda, bpmn.io, Signavio
and peers — into a fully-resolved kymo `Diagram`, so kymo can render, convert, and re-export
real-world process models and participate in BPMN tool interchange. Geometry is authored in the file's
Diagram-Interchange section, so import *reads* layout rather than computing it.

## 2. Functional requirements

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

## 3. Non-functional requirements

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

## 4. Constraints, assumptions, out-of-scope (v1)

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
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — requirements for the shipped BPMN importer, traced in TEST-BPMN-PARSER-001. |
| 1.1 | 2026-05-25 | Vũ Anh | **Doc reorganization.** Moved §1 stakeholder needs to `PROD-BPMN-PARSER-001`; minted `SN-BPMN-PARSER-01..04` and annotated each FR group with its Source need; §1 now points to the product description and keeps only scope. No requirement content changed. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn-parser/02-FEATURE.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant FR/NFR (preserving IDs);
update TEST-BPMN-PARSER-001's traceability matrix; reflect any mapping change against
BPMN-MAP-001; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
Requirement IDs are stable across revisions; a removed requirement SHALL be marked
withdrawn (not re-used) so traceability links remain valid.

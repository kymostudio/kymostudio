---
title: BPMN 2.0 Export — Requirements
document_id: FEAT-BPMN-EXPORT-REQ-001
version: "1.0"
issue_date: 2026-05-23
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the BPMN export feature
review_cycle: On phase completion, or on BPMN-mapping change
supersedes: null
related_documents:
  - FEAT-BPMN-EXPORT-001        # Introduction
  - FEAT-BPMN-EXPORT-DSN-001    # Design
  - FEAT-BPMN-EXPORT-TST-001    # Test documentation
  - FEAT-BPMN-EXPORT-PLAN-001   # Plan
  - BPMN-MAP-001                 # BPMN importer element mapping (inverted here)
  - DSL-LANG-001                # kymo DSL language specification
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - export
  - requirements
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN 2.0 Export — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-EXPORT-REQ-001                           |
| Version      | 1.0                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-23                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-BPMN-EXPORT-001, FEAT-BPMN-EXPORT-DSN-001, FEAT-BPMN-EXPORT-TST-001, FEAT-BPMN-EXPORT-PLAN-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting
conventions. Each requirement carries a stable ID for traceability from
FEAT-BPMN-EXPORT-TST-001. Concept: FEAT-BPMN-EXPORT-001; realisation:
FEAT-BPMN-EXPORT-DSN-001. The mapping inverts BPMN-MAP-001.

## 1. Scope and stakeholder needs

Provide a way to turn a kymo `Diagram` of BPMN glyphs (imported via `from_bpmn` or
authored with the `bpmn { }` block) into a standard **BPMN 2.0 XML** file, so kymo
participates in BPMN tool interchange and supports `.bpmn` → kymo → `.bpmn`
round-trip — the gap identified in FEAT-BPMN-EXPORT-001 §2.

## 2. Functional requirements

**Entry & document**
- **FR-1** A `to_bpmn` emitter SHALL turn a `Diagram` into a well-formed BPMN 2.0
  XML string: a `<definitions>` root with the `bpmn` / `bpmndi` / `dc` / `di`
  namespaces, a semantic body (`<process>`, or `<collaboration>` + per-pool
  `<process>` when pools are present), and a `<bpmndi:BPMNDiagram>` DI section.

**Semantic mapping (inverse of BPMN-MAP-001)**
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

**Diagram-Interchange geometry**
- **FR-4** The DI section SHALL be derived from kymo geometry: a `<bpmndi:BPMNShape>`
  with `<dc:Bounds>` per component (top-left = `pos − size/2`, width/height = `size`);
  a `<bpmndi:BPMNEdge>` with `<di:waypoint>`s from `Edge.points`; a `<bpmndi:BPMNLabel>`
  `<dc:Bounds>` from `Edge.label_pos`. Coordinates SHALL **de-normalise** the importer's
  `MARGIN` shift so exported geometry sits in a tidy positive plane.

**Containers**
- **FR-5** Pools / lanes / groups (`Region` style `pool`/`lane`/`outer`) SHALL emit a
  `<collaboration>` with `<participant>` (and per-pool `<process>`), `<laneSet>` /
  `<lane>` with `<flowNodeRef>` membership, and `<group>` respectively; an expanded
  sub-process (`Region`) SHALL emit `<subProcess isExpanded="true">` containing its
  member elements.

**Interface & parity**
- **FR-6** Element `id`s SHALL be preserved, and output SHALL be deterministic
  (stable element ordering) so re-export of the same `Diagram` is byte-identical.
- **FR-7** The CLI SHALL gain a `--bpmn` target writing a `.bpmn` file (mirroring
  `--figma` / `--excalidraw`); the Python library SHALL expose `to_bpmn.export(d)`.
- **FR-8** The feature SHALL exist with equivalent functionality in both
  `packages/python` and `packages/js` (`toBpmn(d)`).

## 3. Non-functional requirements

- **NFR-1** **Round-trip fidelity** — for a DI-bearing `.bpmn`, `import → export →
  re-import` SHALL preserve component / edge / region counts and per-id shape, marker,
  flow kind, and geometry (within integer rounding).
- **NFR-2** Output SHALL be **well-formed and valid BPMN 2.0** — it parses as XML and
  re-imports via `from_bpmn` (and opens in bpmn.io).
- **NFR-3** No new runtime dependencies — Python uses the standard-library XML writer;
  the JS implementation stays dependency-free.
- **NFR-4** Output SHALL be deterministic (byte-stable for a given `Diagram`).

## 4. Constraints, assumptions, out-of-scope (v1)

- Only diagrams whose components are `bpmn-*` glyphs export meaningfully; exporting an
  arbitrary (non-BPMN) diagram is out of scope.
- **Semantic, not byte, round-trip** — the export reproduces the model + DI
  equivalently, not the original file's exact bytes/formatting/comments.
- No executable semantics — `<conditionExpression>` bodies are a placeholder or taken
  from the edge label, not evaluated; no listeners/forms/IO.
- No animation (BPMN is static). Deferred (see FEAT-BPMN-EXPORT-PLAN-001).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial issue. |
| 1.0 | 2026-05-24 | Vũ Anh | Released — P4 complete: BPMN-MAP-001 Export section added; doc set marked Released; importer-mapping citations repointed. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/features/bpmn-export/02-FEATURE.md`; authoritative source
is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant FR/NFR (preserving IDs);
update FEAT-BPMN-EXPORT-TST-001's traceability matrix; increment `version`; append a
row to Annex A.

### B.4 Backwards Compatibility
Requirement IDs are stable across revisions; a removed requirement SHALL be marked
withdrawn (not re-used) so traceability links remain valid.

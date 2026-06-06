---
title: BPMN 2.0 Export — Design
document_id: DESIGN-BPMN-EXPORT-001
version: "1.0"
issue_date: 2026-05-23
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo BPMN emitter and its JS port
review_cycle: On phase completion, or on BPMN-mapping change
supersedes: null
related_documents:
  - FEAT-BPMN-EXPORT-001    # Requirements (traced below)
  - TEST-BPMN-EXPORT-001    # Test documentation
  - PLAN-BPMN-EXPORT-001   # Plan
  - BPMN-MAP-001                 # BPMN importer element mapping (inverted here)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - export
  - design
  - architecture
  - diagram-interchange
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN 2.0 Export — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-BPMN-EXPORT-001                           |
| Version      | 1.0                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-23                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-BPMN-EXPORT-001, TEST-BPMN-EXPORT-001, PLAN-BPMN-EXPORT-001 |

Realises FEAT-BPMN-EXPORT-001 (FR/NFR cited per clause). The emitter is the
exact inverse of the importer mapping in BPMN-MAP-001. Covers ISO/IEC/IEEE 12207
Architecture & Design Definition.

## 1. Scope

The architecture of `to_bpmn`: how a resolved `Diagram` becomes a BPMN 2.0 document
(semantic tree + DI plane). The normative element mapping is BPMN-MAP-001 (read in
reverse); behaviour requirements are in FEAT-BPMN-EXPORT-001.

## 2. Pipeline (FR-1)

`to_bpmn.py:export(diagram) -> str` builds the document in two passes, mirroring the
`to_figma` / `to_excalidraw` emitter shape (`export(d) -> str`):

1. **Semantic pass** — walk `diagram.components` → flow-node elements, `diagram.edges`
   → flow elements, `diagram.regions` → containers; assemble a `<process>` (or, when
   pools exist, a `<collaboration>` + one `<process>` per pool).
2. **DI pass** — walk the same nodes/edges → `<bpmndi:BPMNShape>` / `<bpmndi:BPMNEdge>`
   inside `<bpmndi:BPMNDiagram><bpmndi:BPMNPlane>`.

XML is built with the standard-library writer (Python `xml.etree.ElementTree`; JS a
small dependency-free string builder with proper escaping) so output is well-formed
(NFR-2/NFR-3). Namespaces: `bpmn=…/MODEL`, `bpmndi=…/DI`, `dc=…/DD/DC`, `di=…/DD/DI`.

## 3. Element mapping (FR-2, FR-3) — inverse of BPMN-MAP-001

The importer's classification tables (`_EVENT_SHAPE`/`_EVENT_DEF`, `_TASK_MARKER`,
`_GATEWAY_MARKER`) are the single source of truth; the emitter inverts them. To avoid
drift, the maps SHOULD be exposed from `from_bpmn` and reversed at build time rather
than duplicated.

- **Events** — `(shape, marker)` → `<startEvent>`/`<endEvent>`/`<intermediate*Event>`/
  `<boundaryEvent>` with the `*EventDefinition` child for a non-empty marker
  (`message`→`<messageEventDefinition/>`, `terminate`→`<terminateEventDefinition/>`, …).
- **Tasks** — `bpmn-task` + marker → `task`/`userTask`/`serviceTask`/`scriptTask`/
  `sendTask`/`receiveTask`/`manualTask`/`businessRuleTask`.
- **Gateways** — `bpmn-gateway` + marker → `exclusiveGateway` (emit `isMarkerVisible`
  per the icon) / `parallelGateway` / `inclusiveGateway` / `eventBasedGateway` /
  `complexGateway`.
- **Data / annotation / subprocess** — `bpmn-data-object`→`dataObjectReference`,
  `bpmn-data-store`→`dataStoreReference`, `bpmn-annotation`→`textAnnotation` (with
  `<text>` from `name`), `bpmn-subprocess`→`<subProcess isExpanded="false">`.
- **Flows** — `bpmn_flow`: `sequence`→`sequenceFlow`, `message`→`messageFlow`,
  `association`→`association`; `default`→`sequenceFlow` + `default="<id>"` on source;
  `conditional`→`sequenceFlow` + `<conditionExpression>`.

## 4. Coordinate inverse (FR-4)

kymo stores a component's **centre** in `pos` and its box in `size`; BPMN DI uses a
**top-left** `<dc:Bounds>`. Inverse: `x = pos.x − size.w/2`, `y = pos.y − size.h/2`,
`width=size.w`, `height=size.h`. Edge `points` → ordered `<di:waypoint>`s. `label_pos`
(centre) → a flow `<BPMNLabel><dc:Bounds>`; `Component.label_box` (centre + size) → a
per-node `<BPMNLabel><dc:Bounds>` (top-left = `centre − size/2`), so node labels round-trip. The importer shifts
all geometry by `MARGIN` so the top-left glyph sits at `(MARGIN, MARGIN)`; export keeps
the laid-out plane as-is (already positive) — no re-normalisation is required beyond
the centre→top-left conversion, matching `from_bpmn`'s output extents.

## 5. Containers and collaboration (FR-5)

- No pool/lane regions → a single `<process isExecutable="false">` holding all nodes/flows.
- Pool/lane regions present → a `<collaboration>` with one `<participant>` per pool
  (`processRef`), each pool's `<process>` carrying a `<laneSet>` of `<lane>`s; lane
  membership (`<flowNodeRef>`) is reconstructed from which components fall within each
  lane's bounds (or a stored membership). `group` regions → `<group>`. An expanded
  sub-process region → `<subProcess isExpanded="true">` nesting its members.

## 6. Integration (FR-7, FR-8)

- **CLI** — `cli.py` gains a `--bpmn` flag (parsed beside `--figma`/`--excalidraw`);
  on match it writes `src.with_suffix(".bpmn")` via `to_bpmn.export(diagram)`.
- **Python API** — `to_bpmn.export(diagram) -> str` (importable like `render`).
- **JS** — a new `to-bpmn.ts` mirrors the algorithm; `index.ts` exports
  `toBpmn(diagram): string`.

## 7. Determinism (NFR-4)

Elements are emitted in a stable order (declaration / id-sorted), attributes in a
fixed order, ids preserved verbatim, coordinates integerised — so a given `Diagram`
yields byte-identical XML across runs and across the Python/JS implementations
(functional, not necessarily byte, parity across languages).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial issue. |
| 1.0 | 2026-05-24 | Vũ Anh | Released — P4 complete: BPMN-MAP-001 Export section added; doc set marked Released; importer-mapping citations repointed. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn/modules/export/02-DESIGN.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep the requirement IDs it traces
(FR-1…FR-8, NFR-1…NFR-4) consistent with FEAT-BPMN-EXPORT-001; increment `version`;
append a row to Annex A; reflect any mapping change against BPMN-MAP-001.

### B.4 Backwards Compatibility
This describes the intended implementation; the normative surface is
FEAT-BPMN-EXPORT-001 and BPMN-MAP-001. Reconcile any deviation there before release.

---
title: "BPMN 2.0.2 — Annex B: Diagram Interchange"
document_id: BPMN-NREF-ANNEXB-001
version: "1.2"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers reading, writing, or implementing BPMN 2.0 (`.bpmn`) interchange
review_cycle: On OMG BPMN release
supersedes: null
related_documents:
  - BPMN-NREF-001          # Normative-reference set (index)
  - BPMN-NREF-NOTATION-001 # Clause 12 — BPMN DI
  - BPMN-NREF-EXCHANGE-001 # Clause 15 — Exchange Formats
  - REF-BPMN-001           # BPMN 2.0 research reference (interchange §16)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - diagram-interchange
  - bpmn-di
  - dc
  - di
  - layout
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
upstream:
  project: OMG Business Process Model and Notation (BPMN)
  specification: https://www.omg.org/spec/BPMN/2.0.2/PDF
  iso_equivalent: ISO/IEC 19510:2013
  version_reviewed: "2.0.2 (OMG, December 2013) / ISO/IEC 19510:2013"
  access_date: 2026-05-24
---

# BPMN 2.0.2 — Annex B: Diagram Interchange

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-ANNEXB-001                                       |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **Annex B — Diagram Interchange** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-NOTATION-001`, `BPMN-NREF-EXCHANGE-001`, `REF-BPMN-001` |

Mirrors **Annex B (Diagram Interchange)** of the OMG BPMN 2.0.2 specification. Part of the
normative-reference set `BPMN-NREF-001`. Where this note and the OMG specification disagree,
the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 Annex B;
> it does not reproduce the specification. For the normative wording, read Annex B in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## Annex B — Diagram Interchange

Annex B is the spec's consolidated **Diagram Interchange** reference, complementing the §12
metamodel: it grounds BPMN DI in the shared OMG **Diagram Definition (DD)** framework —
**DC** (Diagram Common: `Bounds`, `Point`, `Font`) and **DI** (Diagram Interchange: the
diagram/plane/shape/edge abstractions) — that BPMN DI specialises.

The BPMN DI elements a `.bpmn` file carries (detailed in §12.2–§12.3,
`BPMN-NREF-NOTATION-001`):

| Element | Carries |
|---|---|
| `bpmndi:BPMNDiagram` / `bpmndi:BPMNPlane` | the diagram and its drawing surface |
| `bpmndi:BPMNShape` → `dc:Bounds` | a node's `x y width height` (top-left + size) |
| `bpmndi:BPMNEdge` → `di:waypoint` | a flow's polyline points |
| `bpmndi:BPMNLabel` → `dc:Bounds` | a label's position |

with the orientation/state flags `isHorizontal`, `isExpanded`, `isMarkerVisible`. The
schemas are `BPMNDI.xsd`, `DI.xsd`, `DC.xsd` (§15.2). The model/diagram split is discussed in
`REF-BPMN-001 §16`.

## Annex A — Revision History

| Version | Date       | Author | Changes                       |
|---------|------------|--------|-------------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — BPMN Annex B. |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/annex-b-diagram-interchange.md`; authoritative
source is the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 Annex B (and §12) on any edition change. Increment
`version`; append a row to the Revision History above.

### B.4 References
OMG BPMN 2.0.2 Annex B, §12, §15.2; `REF-BPMN-001 §16`.

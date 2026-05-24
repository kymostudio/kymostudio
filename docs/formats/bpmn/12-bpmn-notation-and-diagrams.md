---
title: "BPMN 2.0.2 — Clause 12: BPMN Notation and Diagrams (BPMN DI)"
document_id: BPMN-NREF-NOTATION-001
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
  - BPMN-NREF-EXCHANGE-001 # Clause 15 — Exchange Formats
  - BPMN-NREF-ANNEXB-001   # Annex B — Diagram Interchange
  - REF-BPMN-001           # BPMN 2.0 research reference (interchange §16)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - bpmn-di
  - diagram-interchange
  - bpmnshape
  - bpmnedge
  - bpmnplane
  - notation
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

# BPMN 2.0.2 — Clause 12: BPMN Notation and Diagrams (BPMN DI)

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-NOTATION-001                                    |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§12 BPMN Notation and Diagrams** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-EXCHANGE-001`, `BPMN-NREF-ANNEXB-001`, `REF-BPMN-001` |

Mirrors **Clause 12 (BPMN Notation and Diagrams)** of the OMG BPMN 2.0.2 specification
(§12.1–§12.4) — the **BPMN Diagram Interchange (BPMN DI)** model. Part of the
normative-reference set `BPMN-NREF-001`. Where this note and the OMG specification disagree,
the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §12;
> it does not reproduce the specification. For the normative wording, read §12 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §12.1 BPMN Diagram Interchange (BPMN DI)

BPMN DI records the **graphical layout** of a model so a diagram looks the same after a
round-trip between tools, separately from the semantic model. §12.1.1 Scope, §12.1.2 Diagram
Definition and Interchange (BPMN DI binds the shared OMG **DD/DI/DC** packages), §12.1.3 How
to Read this Clause.

## §12.2 BPMN DI Meta-model

§12.2.1 Overview, §12.2.2 Abstract Syntax, §12.2.3 Classifier Descriptions, §12.2.4 Complete
BPMN DI XML Schema. The principal classifiers:

| Element | Carries | Used for |
|---|---|---|
| `bpmndi:BPMNDiagram` | one diagram | the diagram container |
| `bpmndi:BPMNPlane` | `bpmnElement` → process/collaboration | the drawing surface |
| `bpmndi:BPMNShape` | `bpmnElement` + `dc:Bounds` (`x y width height`) | a node's box |
| `bpmndi:BPMNEdge` | `bpmnElement` + `di:waypoint` (`x y`, ×n) | a flow's polyline |
| `bpmndi:BPMNLabel` | `dc:Bounds` | a label's position |

Notable DI attributes: **`isHorizontal`** (pool/lane orientation), **`isExpanded`**
(sub-process state), **`isMarkerVisible`** (exclusive-gateway `X`).

## §12.3 Notational Depiction Library and Abstract Element Resolutions

§12.3 pins how each `BPMNShape`/`BPMNEdge` **resolves to a concrete depiction** — §12.3.1
Labels, §12.3.2 BPMNShape, §12.3.3 BPMNEdge — i.e. the normative rules for visual appearance
(§2.2.3). §12.4 gives worked examples: §12.4.1 sub-process content, §12.4.2 multiple/nested
lanes, §12.4.3 vertical collaboration, §12.4.4 conversation, §12.4.5 choreography. The
model/diagram split is discussed in `REF-BPMN-001 §16`; the XSDs are in §15
(`BPMN-NREF-EXCHANGE-001`) and Annex B (`BPMN-NREF-ANNEXB-001`).

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §12.     |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/12-bpmn-notation-and-diagrams.md`; authoritative
source is the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §12 and Annex B on any edition change. Increment `version`;
append a row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §12, Annex B; `REF-BPMN-001 §16`.

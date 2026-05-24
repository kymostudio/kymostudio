---
title: "BPMN 2.0.2 — Clause 11: Choreography"
document_id: BPMN-NREF-CHOREO-001
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
  - BPMN-NREF-COLLAB-001   # Clause 9 — Collaboration
  - REF-BPMN-001           # BPMN 2.0 research reference (diagram types §14)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - choreography
  - choreography-task
  - message-exchange
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

# BPMN 2.0.2 — Clause 11: Choreography

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-CHOREO-001                                       |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§11 Choreography** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-COLLAB-001`, `REF-BPMN-001`       |

Mirrors **Clause 11 (Choreography)** of the OMG BPMN 2.0.2 specification (§11.1–§11.9). Part
of the normative-reference set `BPMN-NREF-001`. Where this note and the OMG specification
disagree, the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §11;
> it does not reproduce the specification. For the normative wording, read §11 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §11.1–§11.4 Concepts

A **Choreography** formalises the **expected ordering of Message exchanges** between
Participants, with **no** central controller (contrast §10 orchestration / §9 collaboration).
§11.2 Basic Choreography Concepts; §11.3 Data; §11.4 Use of BPMN Common Elements (Sequence
Flow §11.4.1, Artifacts §11.4.2).

## §11.5 Choreography Activities

The nodes of a choreography. A **Choreography Task** (`choreographyTask`, §11.5.1) is a band
naming the **two participants** and the **message** exchanged between them. Variants:
Sub-Choreography (§11.5.2), Call Choreography (§11.5.3), Global Choreography Task (§11.5.4),
Looping Activities (§11.5.5), and The Sequencing of Activities (§11.5.6).

## §11.6–§11.9

§11.6 Events and §11.7 Gateways (Exclusive, Event-Based, Inclusive, Parallel, Complex,
Chaining) reuse the §10 control constructs in the choreography context. §11.8 Choreography
within Collaboration (Participants §11.8.1, Swimlanes §11.8.2); §11.9 XML Schema for
Choreography. Diagram-type theory is in `REF-BPMN-001 §14`.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §11.     |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/11-choreography.md`; authoritative source is the
main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §11 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §11; `REF-BPMN-001 §14`.

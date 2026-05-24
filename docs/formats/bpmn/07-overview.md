---
title: "BPMN 2.0.2 — Clause 7: Overview"
document_id: BPMN-NREF-OVERVIEW-001
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
  - BPMN-NREF-CORE-001     # Clause 8 — BPMN Core Structure
  - REF-BPMN-001           # BPMN 2.0 research reference (taxonomy §7)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - overview
  - element-taxonomy
  - diagram-types
  - connection-rules
  - extensibility
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

# BPMN 2.0.2 — Clause 7: Overview

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-OVERVIEW-001                                     |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§7 Overview** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-CORE-001`, `REF-BPMN-001`         |

Mirrors **Clause 7 (Overview)** of the OMG BPMN 2.0.2 specification (§7.1–§7.8). Part of the
normative-reference set `BPMN-NREF-001`. Where this note and the OMG specification disagree,
the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §7;
> it does not reproduce the specification. For the normative wording, read §7 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §7.1 General · §7.2 BPMN Scope

§7.1–§7.2 restate BPMN's purpose (a notation understandable by all business users, precise
enough to execute) and its **uses** (§7.2.1): modelling internal (private) and public
processes, collaborations, and choreographies.

## §7.3 BPMN Elements

The graphical vocabulary is organised into **basic** (§7.3.1) and **extended** (§7.3.2)
modelling elements, grouped into four categories:

| Category | Members | Role |
|---|---|---|
| **Flow Objects** | Events, Activities, Gateways | The behavioural nodes (§10.5, §10.3, §10.6). |
| **Connecting Objects** | Sequence Flow, Message Flow, Association, Data Association | The links (§8.4.13, §9.4, §8.4.1). |
| **Swimlanes** | Pool, Lane | Partitioning — who performs the work (§9.3). |
| **Artifacts** | Group, Text Annotation | Documentation, no flow effect (§8.4.1). |

(Data elements — Data Object, Data Store, Data Input/Output — are a cross-cutting fifth
group, defined with §10.4.) The full taxonomy overview is in `REF-BPMN-001 §7`.

## §7.4 BPMN Diagram Types

The four diagram types: **Process** (orchestration), **Collaboration**, **Choreography**,
**Conversation** (§9, §10, §11).

## §7.5 Use of Text, Color, Size, and Lines

§7.5 permits text/colour/size variation and extra line styles for emphasis, provided the
normative shapes/markers remain recognisable.

## §7.6 Flow Object Connection Rules

Normative connectivity:

- **§7.6.1 Sequence Flow Connection Rules** — which Flow Objects a `sequenceFlow` may join
  (within one Process/Pool).
- **§7.6.2 Message Flow Connection Rules** — `messageFlow` connects **separate
  Participants**.

> Foundational rule: **Sequence Flows never cross Pool boundaries; Message Flows always do.**

## §7.7 BPMN Extensibility · §7.8 Example

§7.7 lets a model carry vendor extensions (`extensionElements`) without breaking interchange;
consumers ignore extensions they do not understand. §7.8 gives a worked example.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §7.      |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/07-overview.md`; authoritative source is the
main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §7 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §7; `REF-BPMN-001 §7`.

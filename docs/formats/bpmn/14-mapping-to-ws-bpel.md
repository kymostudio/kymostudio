---
title: "BPMN 2.0.2 — Clause 14: Mapping BPMN Models to WS-BPEL"
document_id: BPMN-NREF-BPEL-001
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
  - BPMN-NREF-EXEC-001     # Clause 13 — Execution Semantics
  - REF-BPMN-001           # BPMN 2.0 research reference (ecosystem §17)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - ws-bpel
  - bpel
  - execution
  - mapping
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

# BPMN 2.0.2 — Clause 14: Mapping BPMN Models to WS-BPEL

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-BPEL-001                                         |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§14 Mapping BPMN Models to WS-BPEL** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-EXEC-001`, `REF-BPMN-001`         |

Mirrors **Clause 14 (Mapping BPMN Models to WS-BPEL)** of the OMG BPMN 2.0.2 specification
(§14.1–§14.3). Part of the normative-reference set `BPMN-NREF-001`. Where this note and the
OMG specification disagree, the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §14;
> it does not reproduce the specification. For the normative wording, read §14 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §14.1 General

Clause 14 defines how a BPMN model maps to **WS-BPEL 2.0** (OASIS) for execution on a
BPEL stack — the basis of the **BPEL Process Execution** conformance type (§2.4).

## §14.2 Basic BPMN-BPEL Mapping

§14.2.1 Process, §14.2.2 Activities, §14.2.3 Events, §14.2.4 Gateways and Sequence Flows,
§14.2.5 Handling Data — the element-by-element translation of a structured BPMN process to
the corresponding BPEL constructs.

## §14.3 Extended BPMN-BPEL Mapping

§14.3.1 End Events, §14.3.2 Loop/Switch Combinations From a Gateway, §14.3.3 Interleaved
Loops, §14.3.4 Infinite Loops, §14.3.5 BPMN Elements that Span Multiple WS-BPEL
Sub-Elements — handling of the less-structured patterns that do not map one-to-one. The
surrounding ecosystem (DMN, BPEL engines) is summarised in `REF-BPMN-001 §17`.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §14.     |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/14-mapping-to-ws-bpel.md`; authoritative source is
the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §14 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §14; `REF-BPMN-001 §17`.

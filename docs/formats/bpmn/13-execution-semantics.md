---
title: "BPMN 2.0.2 — Clause 13: BPMN Execution Semantics"
document_id: BPMN-NREF-EXEC-001
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
  - BPMN-NREF-PROCESS-001  # Clause 10 — Process
  - REF-BPMN-001           # BPMN 2.0 research reference (token flow §15)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - execution-semantics
  - token
  - instantiation
  - process-engine
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

# BPMN 2.0.2 — Clause 13: BPMN Execution Semantics

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-EXEC-001                                         |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§13 BPMN Execution Semantics** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-PROCESS-001`, `REF-BPMN-001`      |

Mirrors **Clause 13 (BPMN Execution Semantics)** of the OMG BPMN 2.0.2 specification
(§13.1–§13.5). Part of the normative-reference set `BPMN-NREF-001`. Where this note and the
OMG specification disagree, the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §13;
> it does not reproduce the specification. For the normative wording, read §13 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §13.1–§13.2 Token flow & instantiation

BPMN defines behaviour with the metaphor of a **token** — a theoretical, never-drawn marker
created at a Start Event that traverses Sequence Flows; a node consumes arriving tokens and
produces new ones. §13.2 covers **Process Instantiation and Termination** (when a process
instance starts and ends). This token model is what lifts BPMN above a drawing convention,
enabling the Process Execution conformance class (§2.3).

## §13.3 Activities

§13.3.1 Sequence Flow Considerations, §13.3.2 Activity, §13.3.3 Task, §13.3.4
Sub-Process/Call Activity, §13.3.5 Ad-Hoc Sub-Process, §13.3.6 Loop Activity, §13.3.7
Multiple Instances Activity — the lifecycle and token rules for each activity kind.

## §13.4 Gateways

§13.4.1 Parallel (Fork and Join), §13.4.2 Exclusive (data-based decision and merge), §13.4.3
Inclusive (decision and merge), §13.4.4 Event-Based, §13.4.5 Complex — the split/merge token
semantics: AND forks/synchronises, XOR routes one path, OR waits for active paths.

## §13.5 Events

§13.5.1 Start, §13.5.2 Intermediate, §13.5.3 Intermediate Boundary, §13.5.4 Event
Sub-Processes, §13.5.5 Compensation, §13.5.6 End Events — including the Terminate end event,
which consumes all tokens and ends the instance immediately. The descriptive token-flow
summary is in `REF-BPMN-001 §15`.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §13.     |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/13-execution-semantics.md`; authoritative source is
the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §13 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §13; `REF-BPMN-001 §15`.

---
title: "BPMN 2.0.2 — Clause 1: Scope"
document_id: BPMN-NREF-SCOPE-001
version: "1.4"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers reading, writing, or implementing BPMN 2.0 (`.bpmn`) interchange
review_cycle: On OMG BPMN release
supersedes: null
related_documents:
  - BPMN-NREF-001         # Normative-reference set (index)
  - BPMN-NREF-CONF-001    # Clause 2 — Conformance
  - REF-BPMN-001          # BPMN 2.0 research reference (notation/semantics)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - scope
  - business-process
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

# BPMN 2.0.2 — Clause 1: Scope

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-SCOPE-001                                          |
| Version           | 1.4                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Source            | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§1 Scope** (p.1) / ISO/IEC 19510:2013 |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-CONF-001`, `REF-BPMN-001`         |

## 1.1 General (p.1)

The **Object Management Group** (OMG) has developed a standard **Business Process Model and
Notation** (**BPMN**). The primary goal of **BPMN** is to provide a notation that is readily
understandable by all business users, from the business analysts that create the initial drafts
of the processes, to the technical developers responsible for implementing the technology that
will perform those processes, and finally, to the business people who will manage and monitor
those processes. Thus, **BPMN** creates a standardized bridge for the gap between the business
process design and process implementation.

Another goal, but no less important, is to ensure that XML languages designed for the execution
of business processes, such as **WSBPEL** (Web Services Business Process Execution Language), can
be visualized with a business-oriented notation.

This International Standard represents the amalgamation of best practices within the business
modeling community to define the notation and semantics of **Collaboration** diagrams,
**Process** diagrams, and **Choreography** diagrams. The intent of **BPMN** is to standardize a
business process model and notation in the face of many different modeling notations and
viewpoints. In doing so, **BPMN** will provide a simple means of communicating process
information to other business users, process implementers, customers, and suppliers.

The membership of the OMG has brought forth expertise and experience with many existing notations
and has sought to consolidate the best ideas from these divergent notations into a single
standard notation. Examples of other notations or methodologies that were reviewed are UML
Activity Diagram, UML EDOC Business Processes, IDEF, ebXML BPSS, Activity-Decision Flow (ADF)
Diagram, RosettaNet, LOVeM, and Event-Process Chains (EPCs).

## Annex A — Revision History

| Version | Date       | Author | Changes                                   |
|---------|------------|--------|-------------------------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §1.                       |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: corrected the diagram-type list to the three named in §1.1, dropped the out-of-scope list (not present in 2.0.2 §1.1), added the consolidated-notation heritage and the p.1 citation. |
| 1.4     | 2026-05-24 | Vũ Anh | Removed the "Mirrors §1" intro paragraph and the lead disclaimer; replaced the summary with a **full extraction of §1 (§1.1 General, p.1)** from the OMG PDF. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/01-scope.md`; authoritative source is the
main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §1 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §1 (p.1); `REF-BPMN-001 §1`.

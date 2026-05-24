---
title: "BPMN 2.0.2 — Clause 1: Scope"
document_id: BPMN-NREF-SCOPE-001
version: "1.2"
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
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§1 Scope** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-CONF-001`, `REF-BPMN-001`         |

Mirrors **Clause 1 (Scope)** of the OMG BPMN 2.0.2 specification (§1.1 General). Part of
the normative-reference set `BPMN-NREF-001`. Where this note and the OMG specification
disagree, the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §1;
> it does not reproduce the specification. For the normative wording, read §1 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §1.1 General

The primary goal of BPMN is to provide a **notation readily understandable by all business
users** — the business analysts who draft a process, the technical developers who implement
it, and the people who manage and monitor it — while remaining precise enough to drive
execution. BPMN therefore bridges the gap between business process **design** and process
**implementation**.

Within scope, BPMN 2.0 standardises:

- a **graphical notation** for the four BPMN diagram types — **Process** (private/public
  orchestration), **Collaboration**, **Choreography**, and **Conversation** (see §7.4);
- the **semantics** of those elements and their **execution** behaviour (§13);
- an **interchange format** (XML + Diagram Interchange) so models are portable (§12, §15);
- a **mapping** from BPMN to the executable language WS-BPEL (§14).

Explicitly **out of scope**: definition of organisational models and resources, functional
breakdowns, data and information models, strategy, and business-rule models — BPMN may
*reference* these but does not define their notation.

## Annex A — Revision History

| Version | Date       | Author | Changes                                   |
|---------|------------|--------|-------------------------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §1.                       |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

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
OMG BPMN 2.0.2 §1; `REF-BPMN-001 §1`.

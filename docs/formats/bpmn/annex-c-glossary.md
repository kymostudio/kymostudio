---
title: "BPMN 2.0.2 — Annex C: Glossary"
document_id: BPMN-NREF-ANNEXC-001
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
  - BPMN-NREF-TERMS-001    # Clause 4 — Terms and Definitions
  - REF-BPMN-001           # BPMN 2.0 research reference (glossary §3)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - glossary
  - terms
  - definitions
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

# BPMN 2.0.2 — Annex C: Glossary

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-ANNEXC-001                                       |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **Annex C — Glossary** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-TERMS-001`, `REF-BPMN-001`        |

Mirrors **Annex C (Glossary)** of the OMG BPMN 2.0.2 specification. Part of the
normative-reference set `BPMN-NREF-001`. Where this note and the OMG specification disagree,
the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 Annex C;
> it does not reproduce the specification. For the normative wording, read Annex C in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## Annex C — Glossary

Annex C is the specification's consolidated **glossary** — the alphabetical list of BPMN
terms with their definitions (the running definitions of Clause 4, gathered for reference).
Representative entries:

| Term | Gloss |
|---|---|
| **Activity** | Work performed within a process; Task (atomic) or Sub-Process (compound). |
| **Choreography** | The expected ordering of Message exchanges between Participants. |
| **Collaboration** | Two or more Participants and the Message Flows between them. |
| **Conversation** | A logical grouping of related Message exchanges. |
| **Event** | Something that happens during a process, affecting flow. |
| **Flow Object** | An Event, Activity, or Gateway. |
| **Gateway** | A construct that diverges/converges Sequence Flows. |
| **Lane** | A sub-partition within a Pool. |
| **Message Flow** | A Message exchange between two Participants. |
| **Orchestration** | The flow of a single Process from one controlling entity. |
| **Participant / Pool** | A business entity in a Collaboration / its container. |
| **Process** | A flow of activities to achieve an outcome. |
| **Sequence Flow** | The order of Flow Objects within one Process. |
| **Token** | A theoretical marker defining execution semantics. |

The full term set is in Clause 4 (`BPMN-NREF-TERMS-001`); the project's running glossary is
`REF-BPMN-001 §3`.

## Annex A — Revision History

| Version | Date       | Author | Changes                       |
|---------|------------|--------|-------------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — BPMN Annex C. |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/annex-c-glossary.md`; authoritative source is the
main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 Annex C on any edition change. Increment `version`; append a
row to the Revision History above.

### B.4 References
OMG BPMN 2.0.2 Annex C, §4; `REF-BPMN-001 §3`.

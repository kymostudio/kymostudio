---
title: "BPMN 2.0.2 — Clause 4: Terms and Definitions"
document_id: BPMN-NREF-TERMS-001
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
  - BPMN-NREF-ANNEXC-001  # Annex C — Glossary
  - REF-BPMN-001          # BPMN 2.0 research reference (glossary §3)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - terms
  - definitions
  - vocabulary
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

# BPMN 2.0.2 — Clause 4: Terms and Definitions

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-TERMS-001                                         |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§4 Terms and Definitions** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-ANNEXC-001`, `REF-BPMN-001`       |

Mirrors **Clause 4 (Terms and Definitions)** of the OMG BPMN 2.0.2 specification. Part of
the normative-reference set `BPMN-NREF-001`. Where this note and the OMG specification
disagree, the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §4;
> it does not reproduce the specification. For the normative wording, read §4 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §4 Terms and Definitions

Clause 4 fixes the core vocabulary used throughout the standard. The essential terms:

| Term | Meaning (after §4) |
|---|---|
| **Process** | A sequence/flow of activities performed to achieve an outcome. |
| **Activity** | A unit of work; atomic (**Task**) or compound (**Sub-Process**). |
| **Event** | Something that "happens" and affects flow (a cause or an impact). |
| **Gateway** | A control-flow construct that diverges/converges Sequence Flows. |
| **Token** | A theoretical marker traversing Sequence Flows; defines execution (§13). |
| **Sequence Flow** | The order of Flow Objects within one Process. |
| **Message Flow** | A Message exchange between two Participants. |
| **Participant / Pool** | A business entity in a Collaboration / its graphical container. |
| **Lane** | A sub-partition within a Pool. |
| **Orchestration / Collaboration / Choreography / Conversation** | The four diagram viewpoints (§7.4). |
| **Artifact** | A non-flow element that documents a diagram. |

The fuller running glossary (definitions 3.1–3.15 in repo terms) is maintained in
`REF-BPMN-001 §3`; the specification's own consolidated glossary is **Annex C** (see
`BPMN-NREF-ANNEXC-001`).

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §4.      |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/04-terms-and-definitions.md`; authoritative source
is the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §4 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §4, Annex C; `REF-BPMN-001 §3`.

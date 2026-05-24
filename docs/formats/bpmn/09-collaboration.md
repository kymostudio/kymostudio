---
title: "BPMN 2.0.2 — Clause 9: Collaboration"
document_id: BPMN-NREF-COLLAB-001
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
  - BPMN-NREF-PROCESS-001  # Clause 10 — Process (Lanes §10.8)
  - BPMN-NREF-CHOREO-001   # Clause 11 — Choreography
  - REF-BPMN-001           # BPMN 2.0 research reference (swimlanes §12)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - collaboration
  - pool
  - participant
  - lane
  - message-flow
  - conversation
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

# BPMN 2.0.2 — Clause 9: Collaboration

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-COLLAB-001                                       |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§9 Collaboration** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-PROCESS-001`, `BPMN-NREF-CHOREO-001`, `REF-BPMN-001` |

Mirrors **Clause 9 (Collaboration)** of the OMG BPMN 2.0.2 specification (§9.1–§9.8). Part
of the normative-reference set `BPMN-NREF-001`. Where this note and the OMG specification
disagree, the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §9;
> it does not reproduce the specification. For the normative wording, read §9 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §9.1 General · §9.2 Basic Collaboration Concepts

A **Collaboration** (`collaboration`) depicts two or more **Participants** and the **Message
Flows** between them. §9.2 covers the use of BPMN common elements within a collaboration.

## §9.3 Pool and Participant

- **§9.3.1 Participants** — a **Participant** (`participant`) is a business entity
  (organisation, role, or system), drawn as a **Pool**:
  - **White-box / expanded** — `processRef` points to the internal `<process>` (orchestration shown).
  - **Black-box / collapsed** — no `processRef`; an empty named rectangle, interacting only
    via Message Flows.
- **§9.3.2 Lanes** — a **Lane** (`lane`, in a `<laneSet>`) is a sub-partition **inside** a
  Pool, categorising activities by role/department/system. Lanes are an organisational
  overlay — no execution effect — and may nest via `childLaneSet` (see also §10.8,
  `BPMN-NREF-PROCESS-001`).

## §9.4 Message Flow

A **Message Flow** (`messageFlow`) shows a Message exchanged between two Participants; drawn
as a **dashed line, open arrowhead, open-circle tail**, and placed in the `<collaboration>`.
**§9.4.1 Interaction Node** defines what a message flow may connect; **§9.4.2** covers
message-flow associations. The §7.6 rule holds: message flows always cross Pool boundaries.

## §9.5 Conversations

§9.5 defines the **Conversation** view: Participants joined by **Conversation Nodes**
(hexagons, §9.5.1) — Conversation (§9.5.2), Sub-Conversation (§9.5.3), Call Conversation
(§9.5.4), Global Conversation (§9.5.5) — connected by **Conversation Links** (§9.5.6), with
Conversation Associations (§9.5.7) and Correlations (§9.5.8). It is a compact view over a
collaboration.

## §9.6–§9.8

§9.6 Process within Collaboration and §9.7 Choreography within Collaboration relate the
collaboration to the other diagram types; §9.8 gives the Collaboration package XML schemas.
Swimlane notation is summarised in `REF-BPMN-001 §12`.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §9.      |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/09-collaboration.md`; authoritative source is the
main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §9 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §9; `REF-BPMN-001 §12`.

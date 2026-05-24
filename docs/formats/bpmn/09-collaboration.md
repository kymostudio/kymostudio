---
title: "BPMN 2.0.2 — Clause 9: Collaboration"
document_id: BPMN-NREF-COLLAB-001
version: "1.3"
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
  - BPMN-NREF-CORE-001     # Clause 8 — Core (Correlation, Message)
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
| Version           | 1.3                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§9 Collaboration** (pp.107–142) |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-PROCESS-001`, `BPMN-NREF-CHOREO-001`, `BPMN-NREF-CORE-001`, `REF-BPMN-001` |

Mirrors **Clause 9 (Collaboration)** of the OMG BPMN 2.0.2 specification (§9.1–§9.8,
pp.107–142). Part of the normative-reference set `BPMN-NREF-001`. Where this note and the OMG
specification disagree, the OMG specification is authoritative.

> **Normative wording.** This file states the **normative wording** for §9 of the `.bpmn`
> interchange format adopted by this project, following OMG BPMN 2.0.2 §9; it does **not**
> reproduce the copyrighted OMG text. The upstream source of record is the official OMG PDF:
> <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §9.1 General (p.107)
REQUIRED for Choreography Modeling, Process Modeling, and Complete conformance; **not**
required for Process / BPEL Execution conformance. A **Collaboration** is a collection of
**Participants** shown as **Pools**, their interactions shown by **Message Flows**, and MAY
include Processes within the Pools and/or Choreographies between them (Fig 9.1, p.108). A
Choreography is an *extended type* of Collaboration. **Table 9.1** (pp.108–109) Collaboration
attributes: `name`, `choreographyRef [0..*]`, `correlationKeys [0..*]`,
`conversationAssociations [0..*]`, `conversations [0..*]`, `conversationLinks [0..*]`,
`artifacts [0..*]`, `participants [0..*]`, `participantAssociations [0..*]`,
`messageFlow [0..*]`, `messageFlowAssociations [0..*]`, `isClosed: boolean = false`.

## §9.3 Pool and Participant (pp.111–119)
A **Pool** is the graphical representation of a Participant; a square-cornered rectangle drawn
with a solid single line (Fig 9.2, p.111). One Pool in a diagram MAY be drawn **without a
boundary** (the others MUST have one). A Pool is the **container for Sequence Flows** — they
may cross **Lane** boundaries but **never the Pool boundary**. A multi-instance Participant
Pool shows **three vertical bars** centred at the bottom (Fig 9.6, p.113).

- **§9.3.1 Participants** (p.113) — a **Participant** is a `PartnerEntity` (e.g. a company)
  and/or a more general `PartnerRole` (buyer/seller). **Table 9.2** (p.115): `name [0..1]`,
  `processRef [0..1]` (white-box; the Process shown in the Pool — absent = black box),
  `partnerRoleRef [0..*]`, `partnerEntityRef [0..*]`, `interfaceRef [0..*]`,
  `participantMultiplicity [0..1]`, `endPointRefs [0..*]`. `ParticipantMultiplicity`
  (Table 9.5, p.116): `minimum: integer = 0`, `maximum: integer [0..1] = 1`.
  `ParticipantAssociation` (Fig 9.10, p.118; Table 9.7) maps inner↔outer Participants
  (`innerParticipantRef`/`outerParticipantRef`).
- **§9.3.2 Lanes** (p.119) — a Lane is a sub-partition within a Process (often inside a Pool),
  extending its full length vertically or horizontally; detailed in §10.8 (p.304,
  `BPMN-NREF-PROCESS-001`).

## §9.4 Message Flow (pp.119–123)
A **Message Flow** shows a Message between two Participants. It **MUST connect two separate
Pools** (the boundary or Flow Objects inside) and **MUST NOT connect two objects in the same
Pool**. Drawn as a **dashed single line with an open-circle source and an open arrowhead**
(Fig 9.11, p.119). **Table 9.8** (p.122): `name`, `sourceRef`/`targetRef: InteractionNode`,
`messageRef: Message [0..1]`.

- **§9.4.1 Interaction Node** (p.122) — the abstract source/target for Message Flows (and
  Conversation Links); only **Pool/Participant, Activity, Event** connect to Message Flows.
  No own attributes.
- **§9.4.2 Message Flow Associations** (p.122) — `MessageFlowAssociation` maps a Message Flow
  in an inner diagram to one in the outer (Table 9.9: `innerMessageFlowRef`/`outerMessageFlowRef`).

## §9.5 Conversations (pp.123–135)
The **Conversation** view is an informal, simplified Collaboration that keeps all the
features of a Collaboration. A **Conversation** is a logical grouping of Message exchanges
(Message Flows) that share a **Correlation** / `CorrelationKey` (e.g. an *Order Id*). Two
extra graphical elements appear here:

| §9.5.x | Node | Notation | Key attributes |
|---|---|---|---|
| 9.5.1 | **Conversation Node** (abstract; Fig 9.22, p.128) | — | `name [0..1]`, `participantRefs [2..*]`, `messageFlowRefs [0..*]`, `correlationKeys [0..*]` (Table 9.10) |
| 9.5.2 | **Conversation** | hexagon, single thin line (Fig 9.23, p.129) | (no extra attributes) |
| 9.5.3 | **Sub-Conversation** | hexagon + small square **+** marker at bottom centre (Fig 9.24, p.130) | `conversationNodes [0..*]` (Table 9.11) |
| 9.5.4 | **Call Conversation** | hexagon with a **thick line** (calls a GlobalConversation, Fig 9.25) or Sub-Conversation shape with thick line (calls a Collaboration, Fig 9.26) | `calledCollaborationRef: Collaboration [0..1]`, `participantAssociations [0..*]` (Table 9.12); `messageFlowRef` does **not** apply |
| 9.5.5 | **Global Conversation** | — | a reusable, "empty" Collaboration; MUST NOT contain ConversationNodes |
| 9.5.6 | **Conversation Link** | **double thin lines** (Fig 9.27, p.131) | `name [0..1]`, `sourceRef`/`targetRef: InteractionNode` (Table 9.13) |
| 9.5.7 | **Conversation Association** | — | maps inner↔outer ConversationNodes (Table 9.14) |
| 9.5.8 | **Correlations** | — | assign Messages to the proper Process instance; `isClosed=true` ⇒ Participants MAY NOT send unmodelled Messages |

Nesting is indicated by the **+** marker; Fig 9.18 (p.125) shows a 13-Conversation logistics
domain.

## §9.6 Process within Collaboration (p.136)
A Pool/Participant MAY (not REQUIRED) contain a Process (Fig 9.4). Where a **Lane** represents
a Conversation, the Flow Elements in it that send/receive Messages MUST do so as part of that
Conversation.

## §9.7 Choreography within Collaboration (p.136)
A Collaboration matches up the Participants and Message Flows of an embedded Choreography via
`ParticipantAssociation` (inner = Participant in the Choreography, outer = in the
Collaboration) and `MessageFlowAssociation` (Fig 9.32, p.137; class diagram Fig 9.33, p.138).

## §9.8 Collaboration Package XML Schemas (pp.138–142)
Tables 9.15–9.30 (Call Conversation, Collaboration, Conversation, Conversation
Association/Link, ConversationNode, Global Conversation, Message Flow + Association,
Participant + Association + Multiplicity, PartnerEntity/Role, Sub-Conversation).

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §9.      |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: added Collaboration/Participant/MessageFlow attribute tables, the full Conversation-node taxonomy with markers (Sub-Conversation **+**, Call-Conversation thick line, Conversation Link double line), the §9.6/§9.7 mapping detail, and figure/table/page citations. |

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
OMG BPMN 2.0.2 §9 (pp.107–142), Tables 9.1–9.30, Figures 9.1–9.33; `REF-BPMN-001 §12`.

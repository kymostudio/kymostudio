---
title: "BPMN 2.0.2 — Clause 11: Choreography"
document_id: BPMN-NREF-CHOREO-001
version: "1.3"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers reading, writing, or implementing BPMN 2.0 (`.bpmn`) interchange
review_cycle: On OMG BPMN release
supersedes: null
related_documents:
  - BPMN-NREF-COLLAB-001   # Clause 9 — Collaboration
  - BPMN-NREF-PROCESS-001  # Clause 10 — Process (Events/Gateways reused)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - choreography
  - choreography-task
  - sub-choreography
  - participant-band
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
| Version           | 1.3                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§11 Choreography** (pp.315–366) |
| Related Documents | `BPMN-NREF-COLLAB-001`, `BPMN-NREF-PROCESS-001` |

Mirrors **Clause 11 (Choreography)** of the OMG BPMN 2.0.2 specification (§11.1–§11.9,
pp.315–366). Part of the normative-reference set `BPMN-NREF-001`. Where this note and the OMG
specification disagree, the OMG specification is authoritative.

> **Normative wording.** This file states the **normative wording** for §11 of the `.bpmn`
> interchange format adopted by this project, following OMG BPMN 2.0.2 §11; it does **not**
> reproduce the copyrighted OMG text. The upstream source of record is the official OMG PDF:
> <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §11.1–§11.4 Concepts (pp.315–321)
REQUIRED for Choreography Modeling and Complete conformance; not for the Process/BPEL types.
A **Choreography** is a *type of process* that formalises the **expected ordering of Message
exchanges** *between* Participants (a "procedural business contract"), with **no central
controller** — contrast the §10 orchestration Process and the §9 Collaboration. It is defined
**outside any particular Pool** (Fig 11.1, metamodel, p.316; Fig 11.2, p.317). A Choreography
inherits `Collaboration` + `FlowElementsContainer`; the `choreographyRef` attribute does not
apply.

- **§11.3 Data** (p.319) — there is **no central control**, so **no Data Objects or Data
  Stores** appear in Choreographies; data may be used in Exclusive-Gateway conditions only if
  it was carried by a Message in the Choreography.
- **§11.4 Use of BPMN Common Elements** (p.319) — Messages, Message Flows, Participants,
  Sequence Flows, Correlations, Expressions, Services. **§11.4.1 Sequence Flow** (p.320)
  connects Events, Gateways, and Choreography Activities (Fig 11.5); conditional + default
  flows apply; `isClosed`/`isImmediate` govern unmodelled messaging. **§11.4.2 Artifacts**
  (p.321) — Text Annotations and Groups, unrestricted.

## §11.5 Choreography Activities (pp.321–339)
A **Choreography Activity** is a point where an *interaction* occurs between two or more
Participants; abstract, sub-classing `FlowElement`/`FlowNode`. **Table 11.1** (p.322):
`participantRefs: Participant [2..*]`, `initiatingParticipantRef`, `loopType:
ChoreographyLoopType = None {None|Standard|MultiInstanceSequential|MultiInstanceParallel}`,
`correlationKeys [0..*]`.

- **§11.5.1 Choreography Task** (p.323) — atomic; one or two Message exchanges between **two**
  Participants. A rounded rectangle of **Participant Bands** (≥2) plus **one Task Name Band**
  (Fig 11.8). The Participant Band of the **non-initiating** Participant **MUST** be shaded
  with a **light fill**. Tethered Messages: the **initiating** Message icon is **unfilled**,
  the **return** Message icon has a **light fill** (Fig 11.10). Markers (Fig 11.12, p.326):
  *Standard loop* = curl ↺; *MultiInstanceParallel* = three vertical bars; *MultiInstanceSequential*
  = three horizontal bars. A multi-instance Participant adds a three-vertical-bar marker to
  its **Participant Band** (Fig 11.15). **Table 11.2** (p.328): `messageFlowRef [1..*]`.
- **§11.5.2 Sub-Choreography** (p.328) — compound; ≥2 Participant Bands + one Sub-Process Name
  Band. Collapsed form carries a **+** marker at the bottom centre of the Sub-Process Name
  Band (Fig 11.17); expandable to a Choreography Process (Fig 11.19). **Table 11.3** (p.332).
- **§11.5.3 Call Choreography** (p.333) — calls a Choreography or GlobalChoreographyTask;
  drawn with a **thick** boundary (Figs 11.24–11.27). **Table 11.4** (p.335).
- **§11.5.4 Global Choreography Task** (p.335) — a reusable Choreography Task definition
  (**Table 11.5**).
- **§11.5.5 Looping Activities** (p.335) and **§11.5.6 The Sequencing of Activities** (p.335)
  — how `loopType` and Sequence Flows order interactions (valid vs invalid sequences,
  Figs 11.28–11.33).

## §11.6 Events (pp.339–343)
Choreography reuses the §10 Events: **Start** (§11.6.1, Table 11.6, p.340), **Intermediate**
(§11.6.2, Table 11.7), and **End** (§11.6.3, Table 11.8, p.343), with the restricted type
sets those tables specify.

## §11.7 Gateways (pp.344–361)
Choreography reuses the §10 Gateways with choreography-specific routing: **Exclusive**
(§11.7.1, p.344), **Event-Based** (§11.7.2, p.349), **Inclusive** (§11.7.3, p.351),
**Parallel** (§11.7.4, p.358), **Complex** (§11.7.5, p.360), and **Chaining Gateways**
(§11.7.6, p.361). Figures 11.34–11.49 show how each gateway maps to the underlying
Collaboration of Participants.

## §11.8 Choreography within Collaboration (pp.361–363)
**§11.8.1 Participants** (p.361) and **§11.8.2 Swimlanes** (p.362) — how a Choreography sits
between the Pools of a Collaboration (see also §9.7, `BPMN-NREF-COLLAB-001`).

## §11.9 XML Schema for Choreography (p.363)
Tables 11.9–11.14 (Choreography, GlobalChoreographyTask, ChoreographyActivity,
ChoreographyTask, CallChoreography, SubChoreography schemas).

Diagram-type theory is discussed further in `REF-BPMN-001 §14`.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §11.     |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: added the Choreography Activity attributes (`participantRefs`, `initiatingParticipantRef`, `loopType`), the Participant-Band notation (non-initiator light fill, initiating vs return Message fills), the loop/multi-instance markers, the Call/Global/Sub-Choreography detail, the §11.3 no-data rule, §11.6/§11.7 type breakdowns, and figure/table/page citations. |

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
OMG BPMN 2.0.2 §11 (pp.315–366), Tables 11.1–11.14, Figures 11.1–11.51; `REF-BPMN-001 §14`.

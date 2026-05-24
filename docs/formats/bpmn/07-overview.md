---
title: "BPMN 2.0.2 — Clause 7: Overview"
document_id: BPMN-NREF-OVERVIEW-001
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
  - BPMN-NREF-CORE-001     # Clause 8 — BPMN Core Structure
  - BPMN-NREF-PROCESS-001  # Clause 10 — Process (Flow Objects, Data)
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
  - token
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
| Version           | 1.3                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§7 Overview** (pp.19–46) |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-CORE-001`, `BPMN-NREF-PROCESS-001`, `REF-BPMN-001` |

Mirrors **Clause 7 (Overview)** of the OMG BPMN 2.0.2 specification (§7.1–§7.8, pp.19–46).
Part of the normative-reference set `BPMN-NREF-001`. Where this note and the OMG
specification disagree, the OMG specification is authoritative.

> **Normative wording.** This file states the **normative wording** for §7 of the `.bpmn`
> interchange format adopted by this project, following OMG BPMN 2.0.2 §7; it does **not**
> reproduce the copyrighted OMG text. The upstream source of record is the official OMG PDF:
> <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §7.1 General (p.19)
BPMN bridges the gap between the flow-chart readability business analysts want and the
graph+block execution formats (WSBPEL, underpinned by pi-calculus) that engines need.
The execution semantics are **fully formalised** in this version.

## §7.2 BPMN Scope (p.20)
2.0.2 extends BPMN 1.2 by: **formalising execution semantics** for all elements; defining an
**extensibility** mechanism (model + graphical); refining **Event** composition and
**correlation**; extending **human interactions**; and defining a **Choreography** model. It
also resolves 1.2 inconsistencies. **Out of scope** (this list lives in §7.2, *not* §1):
organisational models/resources, functional breakdowns, data/information models, strategy,
and business-rule models. BPMN shows data flow (Messages) but is **not a data-flow
language**; simulation, monitoring, and deployment are also out of scope. Data types,
`expressions`, and service operations use **XML Schema, XPath, and WSDL** respectively.

### §7.2.1 Uses of BPMN (pp.21–24)
Three basic sub-model types within an end-to-end model:

1. **Processes (Orchestration)** — *private non-executable*, *private executable*, and
   *public* Processes. A private Process lives inside a single **Pool** and its Sequence Flow
   cannot cross the Pool boundary (Fig 7.1, p.21; public — Fig 7.2, p.22; the public type was
   called "abstract" in BPMN 1.2).
2. **Choreographies** — a self-contained procedural contract between interacting
   Participants; a network of Activities/Events/Gateways with **no central controller**
   (Fig 7.4, p.23).
3. **Collaborations** — two or more **Pools** linked by **Message Flow**; may embed Processes
   and/or a Choreography; a Pool may be an empty "black box" (Fig 7.3, p.23). A
   **Conversation** diagram is an informal Collaboration view showing Conversations as
   **hexagons** between Pools (Fig 7.5, p.24).

**Token (pp.24–25).** A *token* is a **theoretical** aid for defining behaviour: a **Start
Event** generates a token that **MUST** be consumed at an **End Event**. Tools are **not
required** to implement tokens, and a token **does not traverse a Message Flow**.

## §7.3 BPMN Elements (pp.25–38)
The vocabulary is organised into **five basic categories** (not four):

| # | Category | Members |
|---|---|---|
| 1 | **Flow Objects** | Events, Activities, Gateways |
| 2 | **Data** | Data Objects, Data Inputs, Data Outputs, Data Stores |
| 3 | **Connecting Objects** | Sequence Flows, Message Flows, Associations, Data Associations |
| 4 | **Swimlanes** | Pools, Lanes |
| 5 | **Artifacts** | Group, Text Annotation (the two standardised Artifacts) |

- **§7.3.1 Basic BPMN Modeling Elements** — **Table 7.1** (pp.26–28): Event (circle),
  Activity (rounded rectangle), Gateway (diamond), Sequence Flow (solid filled arrow),
  Message Flow (dashed line, open-circle source → open arrowhead), Association (dotted line),
  Pool/Lane (labelled rectangle), Data Object (page icon), Message (envelope), Group (dashed
  rounded rectangle), Text Annotation (open bracket).
- **§7.3.2 Extended BPMN Modeling Elements** — **Table 7.2** (pp.29–38): the full marker
  set. Events carry a **Flow dimension** (Start / Intermediate / End) and a **Type
  dimension** (None, Message, Timer, Error, Cancel, Compensation, Conditional, Link, Signal,
  Multiple, Terminate, Parallel-Multiple) across **Catching / Throwing / Non-Interrupting**
  columns (catching markers are unfilled; throwing markers are filled; non-interrupting
  boundaries are dashed). Gateway control types: **Exclusive** (X), **Event-Based**
  (pentagon), **Parallel Event-Based**, **Inclusive** (O), **Complex** (✳), **Parallel**
  (+). Activity markers: **Loop** (↺), **Multi-Instance** sequential (three *horizontal*
  bars) / parallel (three *vertical* bars), **Transaction** (double-line border),
  **Compensation**. Sub-Process collapsed carries a **+** marker.

## §7.4 BPMN Diagram Types (p.39)
Restates the three basic Process sub-models and lists the kinds of Business Processes that can
be drawn (as-is/to-be, executable/non-executable, public, choreography, etc.). How sub-models
are combined is **left to tool vendors**; a compliant tool may RECOMMEND a focused purpose,
but the standard makes no assumptions.

## §7.5 Use of Text, Color, Size, and Lines (p.39)
Labels may sit inside/above/below a shape in any direction. Fills may be white/clear and may
use other colours — **but** "throwing" Event markers **MUST** have a **dark fill** (see End
Event p.245, Intermediate Event p.248), and Choreography/Sub-Choreography Participant Bands
that are **not** the initiator **MUST** have a **light fill** (p.323, p.328). Shapes/markers
may be any size; lines may be other colours/styles **provided** the styles of **Sequence
Flows, Message Flows, and Text Associations are not modified or duplicated**.

## §7.6 Flow Object Connection Rules (pp.39–41)
An incoming/outgoing Sequence Flow (and a Message Flow) may attach to **any** side of a Flow
Object; best practice is to pick one flow direction and route Message Flows at 90°.

- **§7.6.1 Sequence Flow Connection Rules** — **Table 7.3** (pp.40–41): which Flow Objects may
  be joined by a `sequenceFlow` *within one Process/Choreography*. Objects inside an expanded
  Sub-Process cannot connect outside it, and **Sequence Flows cannot cross a Pool boundary**.
  Pool, Lane, Data Object, Group, and Text Annotation are **not** in the table (they take no
  Sequence Flow).
- **§7.6.2 Message Flow Connection Rules** — **Table 7.4** (pp.41–42): which objects a
  `messageFlow` may join *within a Collaboration*. **Message Flows cannot connect objects
  within the same Pool.** Lane, Gateway, Data Object, Group, and Text Annotation are not in
  the table.

> Foundational rule: **Sequence Flows never cross Pool boundaries; Message Flows always do.**

## §7.7 BPMN Extensibility (p.42)
Standard elements may be extended with additional attributes, and non-standard
elements/Artifacts added, **provided** the extension does not contradict any BPMN element's
semantics and does not alter the footprint of the basic flow elements (Events, Activities,
Gateways). Extensions are **mandatory** (a compliant tool MUST understand) or **optional**
(MAY be ignored); the declaration syntax is in §8.3.3 (`extensionElements`).

## §7.8 BPMN Example (pp.43–45)
A manufacturing process shown from three perspectives: a Collaboration with black-box Pools
(Fig 7.6, p.43), a stand-alone Choreography (Fig 7.7, p.44), and a stand-alone Process /
Orchestration (Fig 7.8, p.45).

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §7.      |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: **corrected the element categories to the five** the spec lists (added **Data** as a top-level category), added the §7.2 out-of-scope list + token concept, Tables 7.1–7.4 and the marker set, the three §7.8 example figures, and page/figure citations throughout. |

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
OMG BPMN 2.0.2 §7 (pp.19–46), Tables 7.1–7.4, Figures 7.1–7.8; `REF-BPMN-001 §7`.

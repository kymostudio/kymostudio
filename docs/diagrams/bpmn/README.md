---
title: BPMN 2.0 — Research Reference
document_id: REF-BPMN-001
version: "1.0"
issue_date: 2026-05-20
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers researching process-notation standards and prior art
review_cycle: On OMG BPMN major release, or annually (whichever first)
supersedes: null
related_documents:
  - ../../KYMO_DSL.md
  - ../../BEST_PRACTICE_DIAGRAMS.md
  - ../../softwares/d2.md
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - business-process-model-and-notation
  - iso-19510
  - omg
  - workflow
  - process-diagram
  - choreography
  - prior-art
upstream:
  project: OMG Business Process Model and Notation (BPMN)
  homepage: https://www.omg.org/spec/BPMN/
  specification: https://www.omg.org/spec/BPMN/2.0.2/PDF
  iso_equivalent: ISO/IEC 19510:2013
  license: OMG specification (royalty-free); ISO/IEC 19510:2013 (purchasable)
  version_reviewed: "2.0.2 (OMG, 2014) / ISO/IEC 19510:2013"
  access_date: 2026-05-20
---

# BPMN 2.0 — Research Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-BPMN-001                                                   |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-20                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers researching process-notation standards and prior art |
| Upstream          | [OMG BPMN](https://www.omg.org/spec/BPMN/)                     |
| ISO Equivalent    | ISO/IEC 19510:2013                                            |
| Version Reviewed  | 2.0.2 (OMG, 2014) / ISO/IEC 19510:2013                        |
| Access Date       | 2026-05-20                                                     |
| Related Documents | [`KYMO_DSL.md`](../../KYMO_DSL.md), [`BEST_PRACTICE_DIAGRAMS.md`](../../BEST_PRACTICE_DIAGRAMS.md), [`d2.md`](../../softwares/d2.md) |

This is a **research reference on BPMN 2.0**, the process-modelling notation standardised by the Object Management Group (OMG) and published by ISO as ISO/IEC 19510:2013. It is **descriptive, not normative** — where this note and the OMG specification disagree, the OMG specification is authoritative. No code or behaviour in this repository depends on BPMN; this document exists so the team can consult the standard's vocabulary and structure when discussing process and flow diagrams.

Structured per ISO/IEC/IEEE 15289:2019 (information item content). Dates per ISO 8601:2019.

---

## Table of Contents

1. [Scope](#1-scope)
2. [Normative References](#2-normative-references)
3. [Terms and Definitions](#3-terms-and-definitions)
4. [Abbreviations](#4-abbreviations)
5. [History and Standardisation](#5-history-and-standardisation)
6. [Conformance Classes](#6-conformance-classes)
7. [Element Taxonomy — Overview](#7-element-taxonomy--overview)
8. [Flow Objects — Events](#8-flow-objects--events)
9. [Flow Objects — Activities](#9-flow-objects--activities)
10. [Flow Objects — Gateways](#10-flow-objects--gateways)
11. [Connecting Objects](#11-connecting-objects)
12. [Swimlanes — Pools and Lanes](#12-swimlanes--pools-and-lanes)
13. [Artifacts and Data](#13-artifacts-and-data)
14. [Diagram Types](#14-diagram-types)
15. [Execution Semantics — Token Flow](#15-execution-semantics--token-flow)
16. [Interchange — BPMN XML and Diagram Interchange](#16-interchange--bpmn-xml-and-diagram-interchange)
17. [Tooling and Ecosystem](#17-tooling-and-ecosystem)
18. [References](#18-references)
- [Annex A — Revision History](#annex-a--revision-history)
- [Annex B — Document Control](#annex-b--document-control)

---

## 1. Scope

### 1.1 Purpose

This document records the structure and vocabulary of **Business Process Model and Notation (BPMN) version 2.0** as a research reference. It is intended for engineers who need to (a) read existing BPMN diagrams, (b) reason about how process notation differs from architecture-diagram notation, and (c) hold accurate terminology when discussing workflow, orchestration, and collaboration models.

### 1.2 What this document is — and is not

- **Is** — a descriptive summary of BPMN 2.0's element taxonomy, diagram types, execution semantics, and interchange format, with citations to the authoritative sources.
- **Is not** — the BPMN specification itself (see [§2](#2-normative-references)); a tutorial on *drawing* BPMN diagrams; a claim that this repository's DSL renders BPMN. The DSL (see [`KYMO_DSL.md`](../../KYMO_DSL.md)) targets architecture diagrams and has no native gateway (diamond), task (rounded-rectangle), or swimlane primitive; it can only approximate BPMN shapes. Mapping BPMN onto the DSL is explicitly out of scope here.

### 1.3 Sources and method

Facts in this note are drawn from the OMG BPMN 2.0.2 specification and ISO/IEC 19510:2013, cross-checked against widely used vendor references (Camunda, Visual Paradigm, Lucidchart). Where a claim is contested or version-dependent, the OMG/ISO source is treated as authoritative and the others as informative. See [§18](#18-references).

---

## 2. Normative References

The following documents are indispensable for understanding the subject of this note:

| Reference                    | Subject                                                       |
|------------------------------|---------------------------------------------------------------|
| OMG BPMN 2.0.2 (2014)        | Business Process Model and Notation — the authoritative spec  |
| ISO/IEC 19510:2013           | International Standard form of BPMN (based on OMG BPMN 2.0.1)  |
| ISO/IEC/IEEE 15289:2019      | Information item content (structure of this document)         |
| ISO 8601:2019                | Date and time format (YYYY-MM-DD)                            |

ISO/IEC 19510:2013 is **technically identical** to OMG BPMN 2.0.1; OMG subsequently published the maintenance release 2.0.2 (2014). The two are interchangeable for modelling purposes; minor editorial corrections distinguish them.

---

## 3. Terms and Definitions

For the purposes of this note, the following terms apply (after the OMG specification):

- **3.1 Process** — a sequence or flow of activities performed to achieve a defined outcome; the central subject of a BPMN diagram.
- **3.2 Activity** — a unit of work performed within a process. Atomic activities are **Tasks**; compound activities are **Sub-Processes**. Drawn as a rounded rectangle.
- **3.3 Event** — something that "happens" during a process and affects its flow; has a cause (trigger) or an impact (result). Drawn as a circle.
- **3.4 Gateway** — a control-flow construct that diverges or converges Sequence Flows (branching, merging, forking, joining). Drawn as a diamond.
- **3.5 Token** — a theoretical, non-visual marker that traverses Sequence Flows and passes through elements; used to define execution semantics (see [§15](#15-execution-semantics--token-flow)).
- **3.6 Sequence Flow** — a connector showing the order in which activities are performed within a single Process; a solid line with a filled arrowhead.
- **3.7 Message Flow** — a connector showing the exchange of Messages between two separate Participants (Pools); a dashed line with an open arrowhead and an open-circle origin.
- **3.8 Participant** — a business entity (organisation, role, or system) that takes part in a Collaboration; represented by a **Pool**.
- **3.9 Pool** — the graphical container for a single Participant; partitions a Collaboration. May be expanded (white-box) or collapsed (black-box).
- **3.10 Lane** — a sub-partition within a Pool, used to organise and categorise activities (typically by role or system).
- **3.11 Orchestration** — the flow of a single Process from the point of view of one controlling entity (a Process diagram).
- **3.12 Collaboration** — two or more Participants (Pools) and the Message Flows between them.
- **3.13 Choreography** — a definition of the expected ordering of Message exchanges between Participants, with no central controller.
- **3.14 Conversation** — an informal grouping of related Message exchanges (a logical relation between Participants); a simplified view over a Collaboration.
- **3.15 Artifact** — a non-flow element that documents a diagram (Data Object, Group, Text Annotation) without affecting Sequence Flow.

---

## 4. Abbreviations

| Abbreviation | Expansion                                               |
|--------------|---------------------------------------------------------|
| BPMN         | Business Process Model and Notation                     |
| OMG          | Object Management Group                                  |
| BPMI         | Business Process Management Initiative (merged into OMG) |
| BPEL         | (WS-)Business Process Execution Language                 |
| XPDL         | XML Process Definition Language (WfMC)                   |
| BPMN DI      | BPMN Diagram Interchange                                 |
| MOF          | Meta-Object Facility (OMG metamodelling)                |
| XMI          | XML Metadata Interchange                                 |
| XOR / AND / OR | Exclusive / Parallel / Inclusive (gateway semantics)  |

---

## 5. History and Standardisation

- **2004** — BPMN 1.0 released by the Business Process Management Initiative (BPMI), authored chiefly by Stephen A. White (IBM). The early focus is a **notation** (diagram symbols), not an interchange format.
- **2005** — BPMI merges into the **OMG**, which assumes stewardship of BPMN.
- **2006–2010** — Maintenance releases BPMN 1.1 and 1.2 refine the notation.
- **January 2011** — **BPMN 2.0** is published. This is a major revision: it adds a formal **metamodel**, precise **execution semantics**, a serialisable **XML interchange format**, **Diagram Interchange (DI)** for layout, and three new diagram types beyond the original Process diagram (Collaboration, Choreography, Conversation). The acronym is also re-expanded from "Business Process *Modeling* Notation" (1.x) to "Business Process *Model and* Notation" (2.0).
- **July 2013** — BPMN is adopted as an International Standard, **ISO/IEC 19510:2013**, based on OMG BPMN **2.0.1**.
- **2014** — OMG publishes the maintenance release **BPMN 2.0.2**, the version current as of this note's access date.

BPMN 2.0 is widely regarded as the de-facto standard for business-process diagrams: approachable enough for business stakeholders, yet precise enough that conforming models can be executed by a process engine.

---

## 6. Conformance Classes

BPMN 2.0 defines several **conformance types**; a tool need not implement all of them. A tool declaring conformance to a type must support that type's elements, attributes, and semantics.

| Conformance type                | What it requires                                                                                  |
|---------------------------------|---------------------------------------------------------------------------------------------------|
| **Process Modeling**            | The Process diagram elements and their visual appearance. Sub-divided into three sub-classes (below). |
| **Process Execution**           | Import and interpretation of the operational semantics (the activity lifecycle and the metamodel). |
| **BPEL Process Execution**      | A complete mapping from BPMN models to WS-BPEL for execution.                                      |
| **Choreography Modeling**       | The Choreography diagram elements, appearance, semantics, and interchange.                         |

**Process Modeling** is further layered into three sub-classes, ordered by expressive power. They are the practical "levels" most modelling tools advertise:

| Sub-class            | Audience / intent                                                                 |
|----------------------|-----------------------------------------------------------------------------------|
| **Descriptive**      | Visible, high-level documentation: the most common elements (basic events, tasks, sub-processes, sequence/message flow, pools/lanes, data objects). |
| **Analytical**       | Adds the full set of events and gateways for precise behavioural modelling, without requiring executability. |
| **Common Executable**| The subset needed to make a model executable: data, expressions, and the attributes a process engine needs. |

---

## 7. Element Taxonomy — Overview

BPMN organises its graphical vocabulary into **four basic categories**. Almost every symbol in a diagram belongs to one of these.

| Category              | Members                                              | Role                                                   |
|-----------------------|------------------------------------------------------|--------------------------------------------------------|
| **Flow Objects**      | Events, Activities, Gateways                         | The behavioural nodes — what happens and how flow branches. |
| **Connecting Objects**| Sequence Flow, Message Flow, Association, Data Association | The links between nodes — order, messaging, documentation. |
| **Swimlanes**         | Pool, Lane                                           | Partitioning — who/what performs the work.             |
| **Artifacts**         | Data Object, Group, Text Annotation                  | Documentation that does not affect flow.               |

Data elements (Data Object, Data Store, Data Input/Output) are sometimes treated as a fifth, cross-cutting category; this note covers them in [§13](#13-artifacts-and-data). The three Flow-Object kinds are detailed in [§8](#8-flow-objects--events)–[§10](#10-flow-objects--gateways).

---

## 8. Flow Objects — Events

An **Event** is drawn as a **circle** and represents something that happens. Events are classified along three independent axes: **position** in the flow, **direction** (catch vs throw), and **trigger/result type**.

### 8.1 By position

| Position         | Border           | Meaning                                                                 |
|------------------|------------------|-------------------------------------------------------------------------|
| **Start**        | thin single line | Begins a Process; a token is created here.                              |
| **Intermediate** | double thin line | Occurs between start and end; may sit on the flow or on an activity boundary. |
| **End**          | thick single line| Ends a path; the token is consumed.                                     |

A **Boundary Event** is an Intermediate Event attached to the edge of an activity. It is **interrupting** (solid double border — cancels the activity when triggered) or **non-interrupting** (dashed double border — spawns a parallel path while the activity continues).

### 8.2 By direction

- **Catching** event — waits for / reacts to a trigger (e.g., a Message arrives, a Timer fires). The trigger marker is unfilled (outline).
- **Throwing** event — emits a result (e.g., sends a Message, raises a Signal). The marker is filled (solid).

Start events are always catching; End events are always throwing; Intermediate events may be either.

### 8.3 By trigger / result type

The inner marker of the circle indicates the type. The principal types:

| Marker type        | Typical use                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| **None** (blank)   | Generic / unspecified start or end; also used for plain intermediate stages. |
| **Message**        | Sending or receiving a Message across Participants.                          |
| **Timer**          | A date, duration, or cycle triggers the event (catching only).               |
| **Error**          | Catches or throws a (named) error; boundary error events are interrupting.   |
| **Escalation**     | Signals a business escalation (may be non-interrupting on a boundary).       |
| **Cancel**         | Used only in Transaction sub-processes (boundary / end).                     |
| **Compensation**   | Triggers or handles compensation (undo) of completed activities.             |
| **Conditional**    | Fires when a business condition becomes true.                                |
| **Signal**         | Broadcast/receive of a Signal — one-to-many, not addressed (unlike a Message).|
| **Link**           | Connects two sections of a Process (an "off-page connector" / goto pair).    |
| **Multiple**       | Any one of several triggers fires the event (pentagon marker).               |
| **Parallel Multiple** | All of several triggers must occur (plus marker).                         |
| **Terminate**      | Immediately ends the entire Process instance (end event only).               |

Not every type is valid in every position/direction; the OMG specification gives the full validity matrix.

---

## 9. Flow Objects — Activities

An **Activity** is a unit of work, drawn as a **rounded rectangle**. Activities are atomic (**Task**) or compound (**Sub-Process**).

### 9.1 Task types

A Task is the smallest unit of work in the Process. A small marker in the top-left corner denotes the task type:

| Task type          | Meaning                                                                       |
|--------------------|-------------------------------------------------------------------------------|
| **Abstract / None**| Unspecified task type (BPMN 1.x default).                                      |
| **User**           | A human performs the work with software support (person marker).              |
| **Manual**         | A human performs the work *without* software (hand marker).                   |
| **Service**        | An automated call to a service or application (gears marker).                 |
| **Send**           | Sends a Message to another Participant (filled envelope).                      |
| **Receive**        | Waits for a Message from another Participant (open envelope); can instantiate a process. |
| **Script**         | The engine executes a script (script marker).                                 |
| **Business Rule**  | Invokes a business-rules / decision engine (table marker).                    |

### 9.2 Sub-Processes and Call Activities

- **Sub-Process** — a compound activity containing its own flow. Drawn collapsed (a `[+]` marker) or expanded (the inner flow shown inline). Variants:
  - **Embedded** — defined within its parent; shares the parent's data context.
  - **Event Sub-Process** — drawn with a dotted border; triggered by an event, not by an incoming Sequence Flow.
  - **Transaction** — a double-bordered sub-process with all-or-nothing semantics and compensation/cancel handling.
  - **Ad-Hoc** — activities with no required order (tilde `~` marker); performed as needed.
- **Call Activity** — a reusable, globally defined activity (Process or Task) invoked by reference; drawn with a thick border.

### 9.3 Activity markers

Markers along the bottom-centre of an activity modify its execution:

| Marker            | Symbol            | Meaning                                                          |
|-------------------|-------------------|------------------------------------------------------------------|
| **Loop**          | circular arrow    | Repeats while a condition holds.                                 |
| **Multi-Instance, parallel** | `‖` (three vertical bars) | Multiple instances run concurrently.                |
| **Multi-Instance, sequential** | `≡` (three horizontal bars) | Multiple instances run one after another.        |
| **Compensation**  | rewind symbol     | The activity is a compensation handler.                          |
| **Ad-Hoc**        | `~` (tilde)       | Sub-process activities have no fixed order.                      |

---

## 10. Flow Objects — Gateways

A **Gateway** controls how Sequence Flows diverge and converge. It is drawn as a **diamond** with an inner marker. A gateway is purely a routing construct — it performs no work. The same shape is used to **diverge** (split) or **converge** (merge), depending on whether it has multiple outgoing or multiple incoming flows.

| Gateway              | Marker         | Diverging behaviour                                                   | Converging behaviour                              |
|----------------------|----------------|-----------------------------------------------------------------------|---------------------------------------------------|
| **Exclusive (XOR)**  | blank or `X`   | Exactly **one** outgoing path is taken (first condition that is true).| Passes each incoming token through (no wait).     |
| **Parallel (AND)**   | `+`            | **All** outgoing paths are taken (fork).                              | Waits for **all** incoming paths (join/synchronise). |
| **Inclusive (OR)**   | `O` (circle)   | **One or more** outgoing paths whose conditions are true.             | Waits for all incoming paths that are active.     |
| **Event-Based**      | pentagon in circle | The path is chosen by **which event occurs next** (a race), not by data. | (Used mainly to diverge.)                      |
| **Complex**          | `*` (asterisk) | Routing governed by an arbitrary expression over incoming/outgoing flows. | Custom synchronisation expression.            |

Notes:

- An Exclusive gateway may designate a **default flow** (a slash on the connector), taken when no condition is true.
- A diverging Inclusive gateway must be matched carefully on convergence, since the number of active paths is not known statically.
- An **Event-Based** gateway is typically followed by catching Intermediate Events (e.g., "receive Message A" vs "Timer expires"); whichever fires first selects the path.

---

## 11. Connecting Objects

| Connector             | Appearance                              | Connects                                                       |
|-----------------------|-----------------------------------------|----------------------------------------------------------------|
| **Sequence Flow**     | solid line, filled arrowhead            | Flow Objects **within one Process/Pool** — defines order.      |
| **Message Flow**      | dashed line, open arrowhead, open-circle tail | Two **separate Participants** (Pools) — a Message exchange.  |
| **Association**       | dotted line (optionally directed)       | Artifacts/text to Flow Objects — documentation, no execution effect. |
| **Data Association**  | dotted line with arrowhead              | Data Objects to activities/events — reads and writes of data.  |

Sequence Flow refinements:

- **Conditional Sequence Flow** — a flow leaving an activity (not a gateway) that carries a condition; drawn with a small diamond at its source.
- **Default Sequence Flow** — the fallback path from a gateway or activity; drawn with a slash near its source.

A foundational rule: **Sequence Flows never cross Pool boundaries; Message Flows always do.** Within a Pool the flow is orchestration (ordered work); between Pools it is messaging (collaboration).

---

## 12. Swimlanes — Pools and Lanes

Swimlanes organise a diagram by **who or what** performs the work, borrowing the cross-functional flowchart convention.

- **Pool** — represents one **Participant** in a Collaboration (an organisation, role, or system). A Pool is the boundary of a single Process.
  - **White-box (expanded)** Pool — shows the internal Process (the orchestration).
  - **Black-box (collapsed)** Pool — an empty rectangle showing only the Participant's name; its internals are hidden, and it interacts purely through Message Flows. Common for external parties (e.g., "Customer", "Payment Provider").
- **Lane** — a sub-partition **inside** a Pool, stretching its full length, used to categorise activities by role, department, or system. Lanes do not change execution semantics; they are an organisational overlay.

A diagram with two or more Pools connected by Message Flows is a **Collaboration** (see [§14](#14-diagram-types)).

---

## 13. Artifacts and Data

**Artifacts** add documentation without affecting Sequence Flow:

- **Data Object** — information that an activity reads or produces (document marker). Variants: a **Collection** Data Object (parallel-bars marker), and **Data Input** / **Data Output** (open/filled arrow markers) at process boundaries.
- **Data Store** — persistent data that outlives the process instance (e.g., a database); a cylinder-like marker.
- **Group** — a dashed rounded rectangle that visually clusters elements for documentation; it may span Pools and has **no** effect on flow.
- **Text Annotation** — free-text commentary attached to an element by an Association.

Data Objects and Data Stores connect to activities through **Data Associations** (see [§11](#11-connecting-objects)); they are not part of the Sequence Flow and carry no token.

---

## 14. Diagram Types

BPMN 2.0 defines **four** diagram types built from the vocabulary above:

| Diagram            | Shows                                                                                  | Use when…                                                            |
|--------------------|----------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| **Process** (Orchestration) | The ordered flow of activities within a single Participant.                   | Documenting *one* organisation's internal procedure.                |
| **Collaboration**  | Two or more Pools (Participants) and the Message Flows between them.                    | Showing how parties interact, with each one's internal process visible or hidden. |
| **Choreography**   | The expected sequence of Message exchanges between Participants, with **no** central controller. The nodes are **Choreography Tasks** (bands naming the two participants and the message). | Specifying the agreed messaging protocol between independent parties. |
| **Conversation**   | A compact, informal view of a Collaboration: Participants linked through **Conversation** nodes (hexagons) joined by double-line **Conversation Links**. | Giving a high-level map of *which* parties talk about *what*, without the message detail. |

The Process diagram is by far the most common; Collaboration is used whenever more than one Participant is in play. Choreography and Conversation are specialised, interaction-centric views introduced in 2.0.

---

## 15. Execution Semantics — Token Flow

BPMN defines behaviour using the metaphor of a **token**: a theoretical marker (never drawn) that is created at a Start Event and traverses Sequence Flows.

- A token leaving a node travels along an outgoing Sequence Flow to the next node, which "consumes" the arriving token and may "produce" one or more new tokens.
- A **Parallel (AND) split** produces one token per outgoing flow; the matching **AND join** waits until a token has arrived on every incoming flow before producing a single token onward (synchronisation).
- An **Exclusive (XOR) split** routes the single token down exactly one path; the matching merge passes any arriving token straight through.
- An **Inclusive (OR) split** may produce tokens on several paths; its merge waits for all the tokens that were actually produced upstream.
- A **Terminate End Event** consumes all tokens and ends the entire Process instance immediately, regardless of other in-flight paths.

This token model is what lifts BPMN 2.0 above a mere drawing convention: it gives unambiguous run-time meaning, enabling the **Process Execution** conformance class (see [§6](#6-conformance-classes)) and allowing process engines to run a model directly. The three Process-Modeling sub-classes (Descriptive → Analytical → Common Executable) correspond to increasing fidelity of this semantics.

---

## 16. Interchange — BPMN XML and Diagram Interchange

A key advance of BPMN 2.0 over 1.x is that a model is a **serialisable artefact**, not just a picture. The standard separates the *semantic model* from its *visual layout*:

- **Metamodel** — BPMN is defined as a MOF-based metamodel; models serialise to **XML** (commonly the `.bpmn` extension), with an XSD schema. This makes models portable between conforming tools.
- **BPMN Diagram Interchange (DI)** — a companion model that records the **graphical** layout so a diagram looks the same after a round-trip between tools. Its principal elements:
  - `BPMNDiagram` — a single diagram.
  - `BPMNPlane` — the drawing surface for that diagram.
  - `BPMNShape` — the bounds (x, y, width, height) of a node (event, activity, gateway, pool, lane).
  - `BPMNEdge` — the waypoints of a connector (sequence/message flow).
- **Relationship to XPDL** — before BPMN 2.0 had its own interchange format, the WfMC's **XPDL** was the de-facto serialisation for BPMN diagrams (including layout). BPMN 2.0's native XML + DI largely supersedes that role.

The model/diagram split mirrors a broader principle: the *meaning* of a process (its elements and flows) is independent of *where the boxes sit*. Tools can regenerate layout, or preserve a hand-tuned one via DI, without changing semantics.

---

## 17. Tooling and Ecosystem

BPMN 2.0's standard XML format supports a broad ecosystem of interoperable tools. Each tool below has a per-tool reference note under [`docs/softwares/`](../../softwares/). Representative categories:

- **Modelers and web renderers** — [bpmn.io / `bpmn-js`](../../softwares/bpmn-io.md) (the embeddable JavaScript renderer/editor behind many products), [SAP Signavio](../../softwares/signavio.md), [Bizagi Modeler](../../softwares/bizagi.md), [Sparx Enterprise Architect](../../softwares/sparx-enterprise-architect.md), [Visual Paradigm](../../softwares/visual-paradigm.md), [Lucidchart](../../softwares/lucidchart.md), [draw.io](../../softwares/drawio.md).
- **Process / execution engines** — [Camunda](../../softwares/camunda.md), [Flowable](../../softwares/flowable.md), [Activiti](../../softwares/activiti.md), [jBPM](../../softwares/jbpm.md): they import BPMN XML and execute it, relying on the Common Executable conformance subset.
- **Standards bridges** — BPMN-to-WS-BPEL mapping (the **BPEL Process Execution** conformance type) for engines built on the BPEL stack; **DMN** (Decision Model and Notation, also OMG) is frequently paired with BPMN Business Rule tasks.

Because the interchange format is standardised, a model authored in one modeler can, in principle, be opened, edited, and executed in another — the practical payoff of the metamodel + DI design in [§16](#16-interchange--bpmn-xml-and-diagram-interchange).

---

## 18. References

**Normative**

1. Object Management Group. *Business Process Model and Notation (BPMN), Version 2.0.2.* OMG, 2014. <https://www.omg.org/spec/BPMN/> · PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF>
2. ISO/IEC 19510:2013 — *Information technology — Object Management Group Business Process Model and Notation.* (Based on OMG BPMN 2.0.1.) <https://www.iso.org/standard/62652.html>
3. ISO/IEC/IEEE 15289:2019 — *Content of life-cycle information items (documentation).*
4. ISO 8601:2019 — *Date and time — Representations for information interchange.*

**Informative**

5. Camunda. *BPMN 2.0 Symbols — A complete guide with examples.* <https://camunda.com/bpmn/reference/>
6. Visual Paradigm. *BPMN guides — gateway types; orchestration vs choreography vs collaboration.* <https://www.visual-paradigm.com/guide/bpmn/>
7. Lucidchart. *BPMN Symbols & Notation explained.* <https://www.lucidchart.com/pages/tutorial/bpmn-symbols-explained>
8. bpmn.io — open-source BPMN tooling (`bpmn-js`). <https://bpmn.io/>

---

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes                       |
|---------|------------|--------|-------------------------------|
| 1.0     | 2026-05-20 | Vũ Anh | Initial BPMN 2.0 reference.    |

---

## Annex B — Document Control

### B.1 Storage and Retrieval

This document is version-controlled within the project repository at `docs/diagrams/bpmn/README.md`. The authoritative source is the working tree of the main branch; archived versions are accessible via repository history (`git log`).

### B.2 Distribution

Distribution is implicit — the document is checked in alongside the repository's other reference notes. Any engineer with read access to the repository has access to the current revision.

### B.3 Change Control

Changes to this reference require:

1. Update of the relevant clauses in [§5](#5-history-and-standardisation)–[§17](#17-tooling-and-ecosystem) to reflect the cited sources.
2. Re-verification of any altered fact against the OMG/ISO source of record (see [§2](#2-normative-references)).
3. Increment of `version` in the frontmatter (semantic: MAJOR for a new BPMN edition, MINOR for added sections, PATCH for corrections).
4. Update of `access_date` in the frontmatter when sources are re-checked.
5. Append a row to **Annex A — Revision History**.

### B.4 Review

This document is reviewed on each OMG BPMN major release, or annually — whichever comes first. As a descriptive reference, it tracks the upstream standard; it introduces no requirements of its own.

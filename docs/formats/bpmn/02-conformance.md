---
title: "BPMN 2.0.2 — Clause 2: Conformance"
document_id: BPMN-NREF-CONF-001
version: "1.4"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers reading, writing, or implementing BPMN 2.0 (`.bpmn`) interchange
review_cycle: On OMG BPMN release
supersedes: null
related_documents:
  - BPMN-NREF-001          # Normative-reference set (index)
  - BPMN-NREF-NOTATION-001 # Clause 12 — Notation & Diagrams (visual interchange)
  - BPMN-NREF-EXEC-001     # Clause 13 — Execution Semantics
  - REF-BPMN-001           # BPMN 2.0 research reference (notation/semantics)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - conformance
  - process-modeling
  - visual-interchange
  - descriptive
  - analytic
  - common-executable
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

# BPMN 2.0.2 — Clause 2: Conformance

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-CONF-001                                          |
| Version           | 1.4                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Source            | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§2 Conformance** (pp.1–12) / ISO/IEC 19510:2013 |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-NOTATION-001`, `BPMN-NREF-EXEC-001`, `REF-BPMN-001` |

## 2.1 General (p.1)

Software can claim compliance or conformance with **BPMN 2.0** if and only if the software fully
matches the applicable compliance points as stated in the International Standard. Software
developed only partially matching the applicable compliance points can claim only that the
software was based on this International Standard, but cannot claim compliance or conformance with
this International Standard. The document defines four types of conformance namely **Process
Modeling Conformance**, **Process Execution Conformance**, **BPEL Process Execution Conformance**,
and **Choreography Modeling Conformance**.

The implementation claiming conformance to **Process Modeling Conformance** type is NOT REQUIRED
to support **Choreography Modeling Conformance** type and vice-versa. Similarly, the
implementation claiming **Process Execution Conformance** type is NOT REQUIRED to be conformant to
the **Process Modeling** and **Choreography Conformance** types.

The implementation claiming conformance to the **Process Modeling Conformance type** SHALL comply
with all of the requirements set forth in sub clause 2.1. The implementation claiming conformance
to the **Process Execution Conformance type** SHALL comply with all of the requirements set forth
in sub clause 2.2. The implementation claiming conformance to the **BPEL Process Execution
Semantics Conformance type** SHALL comply with all of the requirements set forth in sub clause
2.3. The implementation claiming conformance to the **Choreography Conformance type** SHALL comply
with all of the requirements set forth in sub clause 2.4. The implementation is said to have
**BPMN Complete Conformance** if it complies with all of the requirements stated in sub clauses
2.1, 2.2, 2.3, and 2.4.

## 2.2 Process Modeling Conformance (pp.2–10)

The next eight sub clauses describe **Process Modeling Conformance**.

### 2.2.1 BPMN Process Types (p.2)

The implementations claiming **Process Modeling Conformance** MUST support the following **BPMN**
packages:

- The **BPMN** core elements, which include those defined in the *Infrastructure*, *Foundation*,
  *Common*, and *Service* packages (see Clause 8).
- **Process** diagrams, which include the elements defined in the **Process**, **Activities**,
  *Data*, and *Human Interaction* packages (see Clause 10).
- **Collaboration** diagrams, which include **Pools** and **Message Flow** (see Clause 9).
- **Conversation** diagrams, which include **Pools**, **Conversations**, and **Conversation
  Links** (see Clause 9).

As an alternative to full **Process Modeling Conformance**, there are three conformance sub-classes
defined:

- **Descriptive**
- **Analytic**
- **Common Executable**

**Descriptive** is concerned with visible elements and attributes used in high-level modeling. It
should be comfortable for analysts who have used BPA flowcharting tools.

**Analytic** contains all of **Descriptive** and in total about half of the constructs in the full
**Process Modeling Conformance** Class. It is based on experience gathered in BPMN training and an
analysis of user-patterns in the Department of Defense Architecture Framework and planned
standardization for that framework.

Both **Descriptive** and **Analytic** focus on visible elements and a minimal subset of supporting
attributes/elements.

**Common Executable** focuses on what is needed for executable process models.

Elements and attributes not in these sub-classes are contained in the full **Process Modeling
Conformance** class. The elements for each sub-class are defined in the next sub clause.

### 2.2.2 BPMN Process Elements (pp.2–7)

The **Process Modeling Conformance** type set consists of **Collaboration** and **Process** diagram
elements, including all **Task** types, *embedded* **Sub-Processes**, **CallActivity**, all
**Gateway** types, all **Event** types (**Start**, **Intermediate**, and **End**), **Lane**,
*Participants*, **Data Object** (including **DataInput** and **DataOutput**), **Message**,
**Group**, **Text Annotation**, **Sequence Flow** (including *conditional* and *default* flows),
**Message Flow**, **Conversations** (limited to grouping **Message Flow**, and associating
*correlations*), *Correlation*, and **Association** (including **Compensation Association**). The
set also includes markers (**Loop**, **Multi-Instance**, **Transaction**, **Compensation**) for
**Tasks** and *embedded* **Sub-Processes**.

> **NOTE:** Implementations are not expected to support **Choreography** modeling elements such as
> **Choreography Task** and **Sub-Choreography**.

For a tool to claim support for a sub-class the following criteria MUST be satisfied:

- All the elements in the sub-class MUST be supported.
- For each element, all the listed attributes MUST be supported.
- In general, if the sub-class doesn't mention an attribute and it is NOT REQUIRED by the schema,
  then it is not in the subclass. Exceptions to this rule are noted.

#### Descriptive Conformance Sub-Class

The **Descriptive** conformance sub-class elements are shown in Table 2.1.

**Table 2.1 — Descriptive Conformance Sub-Class Elements and Attributes**

| Element | Attributes |
|---|---|
| participant (pool) | id, name, processRef |
| laneSet | id, lane with name, childLaneSet, flowElementRef |
| sequenceFlow (unconditional) | id, name, sourceRef, targetRef |
| messageFlow | id, name, sourceRef, targetRef |
| exclusiveGateway | id, name |
| parallelGateway | id, name |
| task (None) | id, name |
| userTask | id, name |
| serviceTask | id, name |
| subProcess (expanded) | id, name, flowElement |
| subProcess (collapsed) | id, name, flowElement |
| CallActivity | id, name, calledElement |
| DataObject | id, name |
| TextAnnotation | id, text |
| association/dataAssociation ᵃ | id, name, sourceRef, targetRef, associationDirection ᵇ |
| dataStoreReference | id, name, dataStoreRef |
| startEvent (None) | id, name |
| endEvent (None) | id, name |
| messageStartEvent | id, name, messageEventDefinition |
| messageEndEvent | id, name, messageEventDefinition |
| timerStartEvent | id, name, timerEventDefinition |
| terminateEndEvent | id, name, terminateEventDefinition |
| documentation ᶜ | text |
| Group | id, categoryRef |

> ᵃ **Data Association** is ABSTRACT: **Data Input Association** and **Data Output Association**
> will appear in the XML serialization. These both have REQUIRED attributes [`sourceRef` and
> `targetRef`] which refer to `itemAwareElements`. To be consistent with the metamodel, this will
> require the following additional elements: `ioSpecification`, `inputSet`, `outputSet`, **Data
> Input**, **Data Output**. When a **BPMN** editor draws a **Data Association** to an **Activity**
> or **Event** it should generate this supporting invisible substructure. Otherwise, the metamodel
> would have to be changed to make `sourceRef` and `targetRef` optional or allow reference to
> non-`itemAwareElements`, e.g., **Activity** and **Event**.
> ᵇ `associationDirection` not specified for **Data Association**.
> ᶜ `Documentation` is not a visible element. It is an attribute of most elements.

#### Analytic Conformance Sub-Class

The **Analytic** conformance sub-class contains all the elements of the **Descriptive** conformance
sub-class plus the elements shown in Table 2.2.

**Table 2.2 — Analytic Conformance Sub-Class Elements and Attributes**

| Element | Attributes |
|---|---|
| sequenceFlow (conditional) | id, name, sourceRef, targetRef, conditionExpression ᵃ |
| sequenceFlow (default) | id, name, sourceRef, targetRef, default ᵇ |
| sendTask | id, name |
| receiveTask | id, name |
| Looping Activity | standardLoopCharacteristics |
| MultiInstance Activity | multiInstanceLoopCharacteristics |
| exclusiveGateway | Add default attribute |
| inclusiveGateway | id, name, eventGatewayType |
| eventBasedGateway | id, name, eventGatewayType |
| Link catch/throw Intermediate Event | Id, name, linkEventDefinition |
| signalStartEvent | id, name, signalEventDefinition |
| signalEndEvent | id, name, signalEventDefinition |
| Catching message Intermediate Event | id, name, messageEventDefinition |
| Throwing message Intermediate Event | id, name, messageEventDefinition |
| Boundary message Intermediate Event | id, name, attachedToRef, messageEventDefinition |
| Non-interrupting Boundary message Intermediate Event | id, name, attachedToRef, cancelActivity=false, messageEventDefinition |
| Catching timer Intermediate Event | id, name, timerEventDefinition |
| Boundary timer Intermediate Event | id, name, attachedToRef, timerEventDefinition |
| Non-interrupting Boundary timer Intermediate Event | id, name, attachedToRef, cancelActivity=false, timerEventDefinition |
| Boundary error Intermediate Event | id, name, attachedToRef, errorEventDefinition |
| errorEndEvent | id, name, errorEventDefinition |
| Non-interrupting Boundary escalation Intermediate Event | id, name, attachedToRef, cancelActivity=false, escalationEventDefinition |
| Throwing escalation Intermediate Event | id, name, escalationEventDefinition |
| escalationEndEvent | id, name, escalationEventDefinition |
| Catching signal Intermediate Event | id, name, signalEventDefinition |
| Throwing signal Intermediate Event | id, name, signalEventDefinition |
| Boundary signal Intermediate Event | id, name, attachedToRef, signalEventDefinition |
| Non-interrupting Boundary signal Intermediate Event | id, name, attachedToRef, cancelActivity=false, signalEventDefinition |
| conditionalStartEvent | id, name, conditionalEventDefinition |
| Catching conditional Intermediate Event | id, name, conditionalEventDefinition |
| Boundary conditional Intermediate Event | id, name, conditionalEventDefinition |
| Non-interrupting Boundary conditional Intermediate Event | id, name, cancelActivity=false, conditionalEventDefinition |
| message ᶜ | id, name, add messageRef attribute to messageFlow |

> ᵃ `ConditionExpression`, allowed only for **Sequence Flow** out of **Gateways**, MAY be null.
> ᵇ `Default` is an attribute of a `sourceRef` (exclusive or inclusive) **Gateway**.
> ᶜ Note that `messageRef`, an attribute of various message **Events**, is optional and not in the
> sub-class.

#### Common Executable Conformance Sub-Class

This conformance sub-class is intended for modeling tools that can emit executable models.

- Data type definition language MUST be XML Schema.
- Service Interface definition language MUST be WSDL.
- Data access language MUST be XPath.

The **Common Executable** conformance sub-class elements are shown in Table 2.3 and its supporting
classes in Table 2.4.

**Table 2.3 — Common Executable Conformance Sub-Class Elements and Attributes**

| Element | Attributes |
|---|---|
| sequenceFlow (unconditional) | id, (name), sourceRef ᵃ, targetRef ᵇ |
| sequenceFlow (conditional) | id, name, sourceRef, targetRef, conditionExpression ᶜ |
| sequenceFlow (default) | id, name, sourceRef, targetRef, default ᵈ |
| subProcess (expanded) | id, name, flowElement, loopCharacteristics, boundaryEventRefs |
| exclusiveGateway | id, name, gatewayDirection (only converging and diverging), default |
| parallelGateway | id, name, gatewayDirection (only converging and diverging) |
| startEvent (None) | id, name |
| endEvent (None) | id, name |
| eventBasedGateway | id, name, gatewayDirection, eventGatewayType |
| userTask | id, name, renderings, implementation, resources, ioSpecification, dataInputAssociations, dataOutputAssociations, loopCharacteristics, boundaryEventRefs |
| serviceTask | id, name, implementation, operationRef, ioSpecification, dataInputAssociations, dataOutputAssociations, loopCharacteristics, boundaryEventRefs |
| callActivity | id, name, calledElement, ioSpecification, dataInputAssociations, dataOutputAssociations, loopCharacteristics, boundaryEventRefs |
| dataObject | id, name, isCollection, itemSubjectRef |
| textAnnotation | id, text |
| dataAssociation | id, name, sourceRef, targetRef, assignment |
| messageStartEvent | id, name, messageEventDefinition (either ref or contained), dataOutput, dataOutputAssociations |
| messageEndEvent | id, name, messageEventDefinition (either ref or contained), dataInput, dataInputAssociations |
| terminateEndEvent | (Terminating trigger in combination with one of the other end events) |
| Catching message Intermediate Event | id, name, messageEventDefinition (either ref or contained), dataOutput, dataOutputAssociations |
| Throwing message Intermediate Event | id, name, messageEventDefinition (either ref or contained), dataInput, dataInputAssociations |
| Catching timer Intermediate Event | id, name, timerEventDefinition (contained) |
| Boundary error Intermediate Event | id, name, attachedToRef, errorEventDefinition (contained or referenced), dataOutput, dataOutputAssociations |

> ᵃ Multiple outgoing connections are only allowed for converging **Gateways**.
> ᵇ Multiple outgoing connections are only allowed for diverging **Gateways**.
> ᶜ `ConditionExpression`, allowed only for **Sequence Flow** out of **Gateways**, MAY be null.
> ᵈ `Default` is an attribute of a `sourceRef` (exclusive or inclusive) **Gateway**.

**Table 2.4 — Common Executable Conformance Sub-Class Supporting Classes**

| Element | Attributes |
|---|---|
| StandardLoopCharacteristics | id, loopCondition |
| MultiInstanceLoopCharacteristics | id, isSequential, loopDataInput, inputDataItem |
| Rendering | |
| Resource | id, name |
| ResourceRole | id, resourceRef, resourceAssignmentExpression |
| InputOutputSpecification | id, dataInputs, dataOutputs |
| DataInput | id, name, isCollection, itemSubjectRef |
| DataOutput | id, name, isCollection, itemSubjectRef |
| ItemDefinition | id, structure or import ᵃ |
| Operation | id, name, inMessageRef, outMessageRef, errorRefs |
| Message | id, name, structureRef |
| Error | id, structureRef |
| Assignment | id, from, to ᵇ |
| MessageEventDefinition | id, messageRef, operationRef |
| TerminateEventDefinition | id |
| TimerEventDefinition | id, timeDate |

> ᵃ Structure MUST be defined by an XSD Complex Type.
> ᵇ Structure MUST be defined by an XSD Complex Type.

### 2.2.3 Visual Appearance (p.8)

A key element of **BPMN** is the choice of shapes and icons used for the graphical elements
identified in this International Standard. The intent is to create a standard visual language that
all process modelers will recognize and understand. An implementation that creates and displays
**BPMN Process** Diagrams SHALL use the graphical elements, shapes, and markers illustrated in this
International Standard.

> **NOTE:** There is flexibility in the size, color, line style, and text positions of the defined
> graphical elements, except where otherwise specified (see §7.5).

The following extensions to a **BPMN** Diagram are permitted:

- New markers or indicators MAY be added to the specified graphical elements. These markers or
  indicators could be used to highlight a specific attribute of a **BPMN** element or to represent
  a new subtype of the corresponding concept.
- A new shape representing a kind of **Artifact** MAY be added to a Diagram, but the new
  **Artifact** shape SHALL NOT conflict with the shape specified for any other **BPMN** element or
  marker.
- Graphical elements MAY be colored, and the coloring MAY have specified semantics that extend the
  information conveyed by the element as specified in this International Standard.
- The line style of a graphical element MAY be changed, but that change SHALL NOT conflict with any
  other line style REQUIRED by this International Standard.
- An extension SHALL NOT change the specified shape of a defined graphical element or marker (e.g.,
  changing a square into a triangle, or changing rounded corners into squared corners, etc.).

### 2.2.4 Structural Conformance (p.8)

An implementation that creates and displays **BPMN** diagrams SHALL conform to the specifications
and restrictions with respect to the connections and other diagrammatic relationships between
graphical elements. Where permitted or requested connections are specified as conditional and based
on attributes of the corresponding concepts, the implementation SHALL ensure the correspondence
between the connections and the values of those attributes.

> **NOTE:** In general, these connections and relationships have specified semantic interpretations,
> which specify interactions among the process concepts represented by the graphical elements.
> Conditional relationships based on attributes represent specific variations in behavior.
> Structural conformance therefore guarantees the correct interpretation of the diagram as a
> specification of process, in terms of flows of control and information. Throughout the document,
> structural specifications will appear in paragraphs using a special shaped bullet: Example: ♦ A
> **TASK** MAY be a target for **Sequence Flow**; it can have multiple *incoming* Flows. An
> *incoming* Flow MAY be from an alternative path and/or parallel paths.

### 2.2.5 Process Semantics (p.9)

This International Standard defines many semantic concepts used in defining **Processes**, and
associates them with graphical elements, markers, and connections. To the extent that an
implementation provides an interpretation of the **BPMN** diagram as a semantic specification of
**Process**, the interpretation SHALL be consistent with the semantic interpretation herein
specified. In other words, the implementation claiming **BPMN Process Modeling Conformance** has to
support the semantics surrounding the diagram elements expressed in Clause 10.

> **NOTE:** The implementations claiming **Process Modeling Conformance** are not expected to
> support the **BPMN** execution semantics described in Clause 13.

### 2.2.6 Attributes and Model Associations (p.9)

This International Standard defines a number of attributes and properties of the semantic elements
represented by the graphical elements, markers, and connections. Some of these attributes are
purely representational and are so marked, and some have mandated representations. Some attributes
are specified as mandatory, but have no representation or only optional representation. And some
attributes are specified as optional. For every attribute or property that is specified as
mandatory, a conforming implementation SHALL provide some mechanism by which values of that
attribute or property can be created and displayed. This mechanism SHALL permit the user to create
or view these values for each **BPMN** element specified to have that attribute or property. Where
a graphical representation for that attribute or property is specified as REQUIRED, that graphical
representation SHALL be used. Where a graphical representation for that attribute or property is
specified as optional, the implementation MAY use either a graphical representation or some other
mechanism. If a graphical representation is used, it SHALL be the representation specified. Where no
graphical representation for that attribute or property is specified, the implementation MAY use
either a graphical representation or some other mechanism. If a graphical representation is used, it
SHALL NOT conflict with the specified graphical representation of any other **BPMN** element.

### 2.2.7 Extended and Optional Elements (p.9)

A conforming implementation is NOT REQUIRED to support any element or attribute that is specified
herein to be non-normative or informative. In each instance in which this specification defines a
feature to be "optional," it specifies whether the option is in:

- how the feature will be displayed,
- whether the feature will be displayed,
- whether the feature will be supported.

A conforming implementation is NOT REQUIRED to support any feature whose support is specified to be
optional. If an implementation supports an optional feature, it SHALL support it as specified. A
conforming implementation SHALL support any "optional" feature for which the option is only in
whether or how it SHALL be displayed.

### 2.2.8 Visual Interchange (p.9)

One of the main goals of this International Standard is to provide an interchange format that can be
used to exchange **BPMN** definitions (both domain model and diagram layout) between different
tools. The implementation should support the metamodel for **Process** types specified in sub clause
13.1 to enable portability of process diagrams so that users can take business process definitions
created in one vendor's environment and use them is another vendor's environment.

## 2.3 Process Execution Conformance (p.10)

The next two sub clauses describe **Process Execution Conformance**.

### 2.3.1 Execution Semantics (p.10)

The **BPMN** execution semantics have been fully formalized in this version of the International
Standard. The tool claiming **BPMN Execution Conformance** type MUST fully support and interpret the
operational semantics and **Activity** life-cycle specified in sub clause 14.2.2. Non-operational
elements listed in Clause 14 MAY be ignored by implementations claiming **BPMN Execution
Conformance** type. Conformant implementations MUST fully support and interpret the underlying
metamodel.

> **NOTE:** The tool claiming **Process Execution Conformance type** is not expected to support and
> interpret **Choreography** models. The tool claiming **Process Execution Conformance type** is not
> expected to support **Process Modeling Conformance**. More precisely, the tool is not required to
> support graphical syntax and semantics defined in this International Standard. It MAY use different
> graphical elements, shapes and markers, than those defined in this International Standard.

### 2.3.2 Import of Process Diagrams (p.10)

The tool claiming **Process Execution Conformance type** MUST support import of **BPMN Process**
diagram types including its definitional **Collaboration** (see Table 10.1).

## 2.4 BPEL Process Execution Conformance (p.10)

Special type of Process Execution Conformance that supports the **BPMN** mapping to WS-BPEL as
specified in sub clause 15.1 can claim **BPEL Process Execution Conformance**.

> **NOTE:** The tool claiming **BPEL Process Execution Conformance** MUST fully support **Process
> Execution Conformance**. The tool claiming **BPEL Process Execution Conformance** is not expected
> to support and interpret **Choreography** models. The tool claiming **BPEL Process Execution
> Conformance** is not expected to support **Process Modeling Conformance**.

## 2.5 Choreography Modeling Conformance (pp.10–11)

The next five sub clauses describe **Choreography Conformance**.

### 2.5.1 BPMN Choreography Types (p.10)

The implementations claiming **Choreography Conformance** type MUST support the following **BPMN**
packages:

- The **BPMN** core elements, which include those defined in the Infrastructure, Foundation, Common,
  and Service packages (see Clause 8).
- **Choreography** diagrams, which includes the elements defined in the **Choreography**, and
  **Choreography** packages (see Clause 11).
- **Collaboration** diagrams, which include **Pools** and **Message Flow** (see Clause 9).

### 2.5.2 BPMN Choreography Elements (p.11)

The **Choreography Conformance** set includes **Message, Choreography Task**, **Global Choreography
Task**, **Sub-Choreography** (expanded and collapsed), certain types of **Start Events** (e.g.,
**None, Timer, Conditional, Signal**, and **Multiple**), certain types of **Intermediate Events**
(**None**, **Message** attached to **Activity** boundary, **Timer** – normal as well as attached to
**Activity** boundary, **Timer** used in **Event Gateways**, **Cancel** attached to an **Activity**
boundary, **Conditional**, **Signal**, **Multiple**, **Link**, etc.) and certain types of **End
Events** (**None** and **Terminate**), and **Gateways**. In addition, to enable **Choreography**
within **Collaboration** it should support **Pools** and **Message Flow**.

### 2.5.3 Visual Appearance (p.11)

An implementation that creates and displays **BPMN Choreography** Diagrams SHALL use the graphical
elements, shapes, and markers as specified in the **BPMN** International Standard. The use of text,
color, size and lines for **Choreography** diagram types are listed in sub clause 7.4.

### 2.5.4 Choreography Semantics (p.11)

The tool claiming **Choreography Conformance** should fully support and interpret the graphical and
execution semantics surrounding **Choreography** diagram elements and **Choreography** diagram
types.

### 2.5.5 Visual Interchange (p.11)

The implementation should support import/export of **Choreography** diagram types and
**Collaboration** diagram types that depict **Choreography** within *collaboration* as specified in
sub clause 9.4 to enable portability of **Choreography** definitions, so that users can take
**BPMN** definitions created in one vendor's environment and use them is another vendor's
environment.

## 2.6 Summary of BPMN Conformance Types (p.12)

Table 2.5 summarizes the requirements for **BPMN** Conformance.

**Table 2.5 — Types of BPMN Conformance**

| Category | Process Modeling Conformance | Process Execution Conformance | BPEL Process Execution Conformance | Choreography Conformance |
|---|---|---|---|---|
| Visual representation of BPMN Diagram Types | Process diagram types and Collaboration diagram types depicting collaborations among Process diagram types. | N/A | N/A | Choreography diagram types and Collaboration diagram types depicting collaboration among Choreography diagram types. |
| BPMN Diagram Elements that need to be supported. | All Task types, embedded Sub-Process, all Call Activity, all Event types, all Gateway types, Pool, Lane, Data Object (including DataInput and DataOutput), Message, Group, Artifacts, markers for Tasks and Sub-Processes, Sequence Flow, Associations, and Message Flow. | N/A | N/A | Message, Choreography Task, Global Choreography Task, Sub-Choreography (expanded and collapsed), certain types of Start, Intermediate, and End Events, Gateways, Pools and Message Flow. |
| Import/Export of diagram types | Yes for Process and Collaboration diagrams that depict Process within Collaboration. | Yes for Process diagrams | Yes for Process diagrams | Yes for Choreography and Collaboration diagrams depicting choreography within Collaboration. |
| Support for Graphical syntax and semantics | Process and Collaboration diagrams that depict Process within Collaboration. | N/A | N/A | Choreography and Collaboration diagrams depicting Choreography within Collaboration. |
| Support for Execution Semantics | N/A | Yes for Process diagrams | Yes for Process diagrams | Choreography execution semantics |

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §2.      |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: corrected the sub-class name **Analytic**, expanded all eight §2.2 sub-clauses and the four conformance types, added Tables 2.1–2.5 and page citations. |
| 1.4     | 2026-05-24 | Vũ Anh | Removed the "Mirrors §2" intro paragraph and the lead disclaimer; replaced the summary with a **full extraction of §2 (§2.1–§2.6, pp.1–12)** from the OMG PDF — the complete conformance-type prose (verbatim, incl. the spec's own sub-clause cross-references) and Tables 2.1–2.5 reproduced in full. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/02-conformance.md`; authoritative source is the
main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §2 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §2 (pp.1–12), Tables 2.1–2.5; `REF-BPMN-001 §6`.

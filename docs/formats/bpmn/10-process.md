---
title: "BPMN 2.0.2 — Clause 10: Process"
document_id: BPMN-NREF-PROCESS-001
version: "1.3"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers reading, writing, or implementing BPMN 2.0 (`.bpmn`) interchange
review_cycle: On OMG BPMN release
supersedes: null
related_documents:
  - BPMN-NREF-CORE-001     # Clause 8 — Common Elements
  - BPMN-NREF-EXEC-001     # Clause 13 — Execution Semantics
  - BPMN-NREF-OVERVIEW-001 # Clause 7 — Overview (marker catalogue, Table 7.2)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - process
  - activities
  - tasks
  - events
  - gateways
  - data
  - lanes
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

# BPMN 2.0.2 — Clause 10: Process

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-PROCESS-001                                      |
| Version           | 1.3                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§10 Process** (pp.143–314) |
| Related Documents | `BPMN-NREF-CORE-001`, `BPMN-NREF-EXEC-001`, `BPMN-NREF-OVERVIEW-001` |

Mirrors **Clause 10 (Process)** of the OMG BPMN 2.0.2 specification (§10.1–§10.12,
pp.143–314) — the largest clause, defining Activities, Items & Data, Events, Gateways,
Compensation, and Lanes. Part of the normative-reference set `BPMN-NREF-001`. Where this note
and the OMG specification disagree, the OMG specification is authoritative.

> **Normative wording.** This file states the **normative wording** for §10 of the `.bpmn`
> interchange format adopted by this project, following OMG BPMN 2.0.2 §10; it does **not**
> reproduce the copyrighted OMG text. The upstream source of record is the official OMG PDF:
> <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §10.1–§10.2 Process concepts (pp.143–148)
A **Process** describes the ordered flow of activities of a single participant. **Table 10.1**
(p.145) Process attributes: `processType {None|Public|Private}`, `isExecutable: boolean`,
`isClosed: boolean`, plus `definitionalCollaborationRef`, `laneSets`, `flowElements`,
`artifacts`, `resources`, `properties`, `monitoring`, `auditing`. **§10.2.1 Types**
(p.147): *private executable*, *private non-executable*, *public*. **§10.2.2** — use of the
common elements (§8.4).

## §10.3 Activities (pp.149–202)
An **Activity** is a unit of work, drawn as a **rounded rectangle**; atomic (**Task**) or
compound (**Sub-Process**). `Activity` attributes (Table 10.3, p.150): `isForCompensation:
boolean`, `startQuantity: integer`, `completionQuantity: integer`, plus `ioSpecification`,
`dataInputAssociations`, `dataOutputAssociations`, `resources`, `default`,
`loopCharacteristics`, `boundaryEventRefs`.

**§10.3.3 Tasks** (p.154) — eight types, distinguished by an upper-left **type marker**
(Fig 10.10–10.20):

| Task type (XML element) | Marker / key attributes |
|---|---|
| **Abstract / None** (`task`) | plain rounded rectangle (the "None Task" of BPMN 1.2) |
| **Service** (`serviceTask`) | gear marker; `implementation` (default `##WebService`), `operationRef [0..1]` (Table 10.8, p.157) |
| **Send** (`sendTask`) | **filled** envelope; `messageRef`, `operationRef`, `implementation` (Table 10.9) |
| **Receive** (`receiveTask`) | **unfilled** envelope; `instantiate: boolean = false` (can start a Process; then no incoming Sequence Flow), `messageRef` (Table 10.10) |
| **User** (`userTask`) | human-figure marker; `implementation`, `renderings [0..*]` (Table 10.13, p.164) |
| **Manual** (`manualTask`) | hand marker; not engine-managed (Table 10.15) |
| **Business Rule** (`businessRuleTask`) | table marker; `implementation` (default `##unspecified`) (Table 10.11) |
| **Script** (`scriptTask`) | script marker; `scriptFormat`, `script` (Table 10.12) |

**§10.3.1 Resource Assignment**, **§10.3.2 Performer**, **§10.3.4 Human Interactions**
(pp.149–171) add `Performer` → `humanPerformer` → `potentialOwner` (Fig 10.23).

**§10.3.5 Sub-Processes** (p.171) — `subProcess`; collapsed (a **+** marker, bottom-centre,
Fig 10.25) or expanded (Fig 10.26; may serve as a "parallel box" — the motivation for
optional Start/End Events). `triggeredByEvent: boolean`. Variants by boundary line:
- **Embedded** — single thin line;
- **Event Sub-Process** — **dotted** line (`triggeredByEvent="true"`, §10.5.6, p.274);
- **Transaction** — **double** line; `protocol`, `method` (Table 10.21, p.178);
- **Ad-Hoc** (`adHocSubProcess`) — **~** (tilde) marker; `ordering {Parallel|Sequential}`,
  `cancelRemainingInstances: boolean`, `completionCondition` (Table 10.22, p.180).

> **2.0.2 lineage:** the 2.0 *Sub-Process* = the *Embedded Sub-Process* of 1.2; the 1.2
> *Reusable Sub-Process* = the **Call Activity**.

**§10.3.6 Call Activity** (`callActivity`, p.182) — **thick** line; `calledElement` (a Global
Task or a Process / Table 10.23). **§10.3.7 Global Task** (p.186) — a reusable task
definition (GlobalTask, GlobalBusinessRuleTask, GlobalScriptTask, GlobalUserTask, GlobalManualTask).

**§10.3.8 Loop Characteristics** (p.188) — `standardLoopCharacteristics` (the **loop**
marker ↺ — a curling arrow; Fig 10.46) and `multiInstanceLoopCharacteristics`
(**three vertical bars** ‖‖‖ parallel / **three horizontal bars** ≡ sequential; Figs
10.48–10.49). The **Compensation** marker is a pair of left-facing triangles ◄◄ ("rewind").
Markers are grouped and centred at the bottom of the shape; *loop* and *multi-instance*
cannot be shown together.

## §10.4 Items and Data (pp.202–232)
**§10.4.1 Data Modeling** — `dataObject` / `dataObjectReference` (page icon; `isCollection`,
collection shows a ‖ marker, Fig 10.53), `dataStoreReference` (cylinder, Fig 10.54),
`dataInput` / `dataOutput` (page icon with an arrow), `Property`, `InputOutputSpecification`
(`inputSet`/`outputSet`), `DataAssociation` — all typed via `itemDefinition` (§8.4.10).
**§10.4.2 Execution Semantics for Data** (p.224), **§10.4.3 Usage of Data in XPath
Expressions** (p.225, Tables 10.65–10.68), **§10.4.4 XML schema** (p.228). Data carries no
token and connects via Data Associations (§8.4.1).

## §10.5 Events (pp.232–286)
A **circle**, classified by **position** — Start (§10.5.2, p.237, thin line) / Intermediate
(§10.5.4, p.248, double line) / End (§10.5.3, p.245, thick line) / **Boundary** (on an
Activity edge) — by **direction** (catching = unfilled marker, throwing = filled), and by
**type** via a child **`*EventDefinition`** (§10.5.5, p.259). **Table 10.93** (p.260) maps
events to markers. The type set (Table 7.2, `BPMN-NREF-OVERVIEW-001`):

| Type | XML child | Type | XML child |
|---|---|---|---|
| Message | `messageEventDefinition` | Signal | `signalEventDefinition` |
| Timer | `timerEventDefinition` | Link | `linkEventDefinition` |
| Error | `errorEventDefinition` | Terminate | `terminateEventDefinition` |
| Escalation | `escalationEventDefinition` | Compensation | `compensateEventDefinition` |
| Conditional | `conditionalEventDefinition` | Cancel | `cancelEventDefinition` |
| Multiple / Parallel-Multiple | (≥2 definitions; `parallelMultiple: boolean`) | (None) | — |

Which types are allowed where is fixed by Tables 10.84–10.90: **top-level Process start**
(p.239), **Sub-Process start** (p.241), **Event Sub-Process start** (p.241), **End Event
types** (p.246), **Intermediate in normal flow** (p.250), **Intermediate attached to an
Activity boundary** (p.253). A **Boundary** Event (Table 10.91, p.257) is *interrupting*
(`cancelActivity="true"`, default) or *non-interrupting* (`false`, dashed circle;
Table 10.92, p.257). **§10.5.6 Handling Events** (p.274), **§10.5.7 Scopes** (p.280),
**§10.5.8 XML schema** (p.281, Tables 10.102–10.122).

## §10.6 Gateways (pp.286–301)
A **diamond** routing construct; `gatewayDirection` constrains in/out arity (§8.4.9). The
internal marker (Fig 10.103, p.287):

| Gateway (XML element) | Marker | Behaviour |
|---|---|---|
| **Exclusive (XOR)** (`exclusiveGateway`) | blank or **X** | one path — the first true condition; a `default` flow if none (§10.6.2, p.289) |
| **Inclusive (OR)** (`inclusiveGateway`) | **O** | every true path; a `default` if none (§10.6.3, p.291) |
| **Parallel (AND)** (`parallelGateway`) | **+** | all paths (fork) / wait-for-all (join) (§10.6.4, p.292) |
| **Complex** (`complexGateway`) | **✳** | governed by an `activationCondition` Expression (§10.6.5, p.294) |
| **Event-Based** (`eventBasedGateway`) | pentagon (in a circle) | the path whose Event/Receive Task fires first; `eventGatewayType {Exclusive|Parallel}`, `instantiate` to start a Process (§10.6.6, p.296) |

**§10.6.1 Sequence Flow Considerations** (p.288); **§10.6.7 XML schema** (p.300, Tables
10.128–10.133). The Exclusive **X** shows only when DI `isMarkerVisible="true"` (§12.3).
Token semantics are in §13.4 (`BPMN-NREF-EXEC-001`).

## §10.7 Compensation · §10.8 Lanes · §10.9–§10.12 (pp.301–314)
- **§10.7 Compensation** (p.301) — Compensation Handler (§10.7.1, p.302), Compensation
  Triggering (§10.7.2, p.303), and its relationship to Error Handling (§10.7.3, p.304).
- **§10.8 Lanes** (p.304) — `LaneSet` / `Lane` (Tables 10.134–10.135); a Lane may nest via
  `childLaneSet`; vertical (Fig 10.123) or horizontal (Fig 10.124) Pools. Also referenced
  from §9.3.2 (`BPMN-NREF-COLLAB-001`).
- **§10.9 Process Instances, Unmodeled Activities, and Public Processes** (p.308);
  **§10.10 Auditing** (p.310); **§10.11 Monitoring** (p.310); **§10.12 Process Package XML
  Schemas** (p.311, Tables 10.136–10.142). Token-level behaviour is in §13
  (`BPMN-NREF-EXEC-001`) and `REF-BPMN-001 §8–§10, §15`.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §10.     |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: itemised the **eight** Task types with markers + key attributes, added Process/Activity/Sub-Process/Ad-Hoc/Transaction attributes, the start/boundary event-type tables, gateway behaviours + `activationCondition`/`eventGatewayType`, the §10.7–§10.12 detail, and figure/table/page citations. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/10-process.md`; authoritative source is the
main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §10 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §10 (pp.143–314), Tables 10.1–10.142, Figures 10.1–10.129; `REF-BPMN-001 §8–§10`.

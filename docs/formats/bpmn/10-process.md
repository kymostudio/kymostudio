---
title: "BPMN 2.0.2 — Clause 10: Process"
document_id: BPMN-NREF-PROCESS-001
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
  - BPMN-NREF-CORE-001     # Clause 8 — Common Elements
  - BPMN-NREF-EXEC-001     # Clause 13 — Execution Semantics
  - REF-BPMN-001           # BPMN 2.0 research reference (events/activities/gateways §8–§10)
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
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§10 Process** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-CORE-001`, `BPMN-NREF-EXEC-001`, `REF-BPMN-001` |

Mirrors **Clause 10 (Process)** of the OMG BPMN 2.0.2 specification (§10.1–§10.12) — the
largest clause, defining Activities, Items & Data, Events, Gateways, Compensation, and
Lanes. Part of the normative-reference set `BPMN-NREF-001`. Where this note and the OMG
specification disagree, the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §10;
> it does not reproduce the specification. For the normative wording, read §10 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §10.1–§10.2 Process concepts

A **Process** (`process`) describes the ordered flow of activities of a single participant.
**§10.2.1 Types of BPMN Processes**: *private executable*, *private non-executable*, and
*public* processes; **§10.2.2** covers use of the BPMN common elements (§8.4).

## §10.3 Activities

An **Activity** is a unit of work, drawn as a **rounded rectangle**; atomic (**Task**) or
compound (**Sub-Process**).

**§10.3.3 Tasks** — typed by a top-left marker:

| Task type | XML element |
|---|---|
| Abstract / None | `task` |
| User / Manual | `userTask` / `manualTask` |
| Service / Send / Receive | `serviceTask` / `sendTask` / `receiveTask` |
| Script / Business Rule | `scriptTask` / `businessRuleTask` |

**§10.3.1 Resource Assignment**, **§10.3.2 Performer**, **§10.3.4 Human Interactions** add
`humanPerformer` / `potentialOwner`.

**§10.3.5 Sub-Processes** — `subProcess`, collapsed (`isExpanded="false"`, `[+]`) or expanded;
variants Embedded, Event (`triggeredByEvent="true"`, dotted), Transaction (double border),
Ad-Hoc (`adHocSubProcess`, `~`). **§10.3.6 Call Activity** — `callActivity` (`calledElement`,
thick border). **§10.3.7 Global Task** — reusable task definition.

**§10.3.8 Loop Characteristics** — `standardLoopCharacteristics` (loop) and
`multiInstanceLoopCharacteristics` (parallel `‖` / sequential `≡`); `isForCompensation`.

## §10.4 Items and Data

§10.4.1 Data Modeling — `dataObject` / `dataObjectReference` (page; `isCollection`),
`dataStoreReference` (cylinder), `dataInput` / `dataOutput`, typed via `itemDefinition`
(§8.4.10). §10.4.2 Execution Semantics for Data, §10.4.3 XPath, §10.4.4 XML schema. Data
carries no token and connects via Data Associations (§8.4.1).

## §10.5 Events

A **circle**; classified by **position** (Start §10.5.2 thin / Intermediate §10.5.4 double /
End §10.5.3 thick / Boundary on an activity edge), **direction** (catching = unfilled,
throwing = filled), and **type** via a child **`*EventDefinition`** (§10.5.5):

| Type | XML child | Type | XML child |
|---|---|---|---|
| Message | `messageEventDefinition` | Signal | `signalEventDefinition` |
| Timer | `timerEventDefinition` | Link | `linkEventDefinition` |
| Error | `errorEventDefinition` | Terminate | `terminateEventDefinition` |
| Escalation | `escalationEventDefinition` | Compensation | `compensateEventDefinition` |
| Conditional | `conditionalEventDefinition` | Cancel | `cancelEventDefinition` |

Boundary events are interrupting (`cancelActivity="true"`) or non-interrupting. §10.5.6
Handling Events, §10.5.7 Scopes, §10.5.8 XML schema.

## §10.6 Gateways

A **diamond** routing construct (`gatewayDirection`):

| Gateway | XML element | Marker | Diverge |
|---|---|---|---|
| Exclusive (XOR) | `exclusiveGateway` | blank/`X` | one path (first true; `default=`) |
| Parallel (AND) | `parallelGateway` | `+` | all paths (fork) |
| Inclusive (OR) | `inclusiveGateway` | `O` | one or more true paths |
| Event-Based | `eventBasedGateway` | pentagon | by which event fires first |
| Complex | `complexGateway` | `*` | expression-governed |

§10.6.1 Sequence Flow Considerations; §10.6.2–§10.6.6 per gateway; §10.6.7 XML schema. The
`X` shows only when DI `isMarkerVisible="true"` (§12.3).

## §10.7 Compensation · §10.8 Lanes · §10.9–§10.11

§10.7 Compensation (handler §10.7.1, triggering §10.7.2). §10.8 Lanes (the partitions, also
referenced from §9.3.2). §10.9 Process Instances / Unmodeled Activities / Public Processes,
§10.10 Auditing, §10.11 Monitoring, §10.12 XML schemas. Token-level behaviour of all the
above is in §13 (`BPMN-NREF-EXEC-001`) and `REF-BPMN-001 §8–§10, §15`.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §10.     |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

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
OMG BPMN 2.0.2 §10; `REF-BPMN-001 §8–§10`.

---
title: "BPMN 2.0.2 — Clause 14: Mapping BPMN Models to WS-BPEL"
document_id: BPMN-NREF-BPEL-001
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
  - BPMN-NREF-EXEC-001     # Clause 13 — Execution Semantics (the behaviour preserved)
  - BPMN-NREF-PROCESS-001  # Clause 10 — Process (the source constructs)
  - REF-BPMN-001           # BPMN 2.0 research reference (ecosystem §17)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - ws-bpel
  - bpel
  - execution
  - mapping
  - block-structured
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

# BPMN 2.0.2 — Clause 14: Mapping BPMN Models to WS-BPEL

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-BPEL-001                                         |
| Version           | 1.3                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§14 Mapping BPMN Models to WS-BPEL** (pp.445–474) |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-EXEC-001`, `BPMN-NREF-PROCESS-001`, `REF-BPMN-001` |

Mirrors **Clause 14 (Mapping BPMN Models to WS-BPEL)** of the OMG BPMN 2.0.2 specification
(§14.1–§14.3, pp.445–474). Part of the normative-reference set `BPMN-NREF-001`. Where this
note and the OMG specification disagree, the OMG specification is authoritative.

> **Normative wording.** This file states the **normative wording** for §14 of the `.bpmn`
> interchange format adopted by this project, following OMG BPMN 2.0.2 §14; it does **not**
> reproduce the copyrighted OMG text. The upstream source of record is the official OMG PDF:
> <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §14.1 General (pp.445–446)
REQUIRED for **BPEL Process Execution** and **Complete** conformance; **not** required for
Process Modeling, Choreography Modeling, or (token-based) Process Execution. Each *orchestration*
**Process** — i.e. each **Pool** of a Business Process Diagram — maps to **one** WS-BPEL 2.0
process (namespace `http://docs.oasis-open.org/wsbpel/2.0/process/executable`); there is no
mapping of the diagram as a whole.

Not every Process maps straightforwardly: WS-BPEL requires control flow that is either
**block-structured** or acyclic, whereas BPMN permits almost arbitrary graphs (e.g. an
unstructured *loop* cannot be expressed directly). To be mappable a Process MUST be **sound**:
no **deadlock** (a token stuck on a flow that can never clear) and no **lack of
synchronization** (more than one token on a flow). The Gateways + Sequence Flows form a
directed graph whose **blocks** (single-entry/single-exit connected sub-graphs) nest into a
**block hierarchy** (Fig 14.1, p.446); each block's pattern drives the mapping. §14.2 gives a
**syntactical** mapping (over block patterns); §14.3 a **semantic** mapping (behaviour only,
no prescribed BPEL syntax) for the wider class of models.

## §14.2 Basic BPMN-BPEL Mapping (pp.446–468)
Notation: `[BPMN construct]` denotes the WS-BPEL produced by mapping that construct (e.g.
`[ServiceTask] = Invoke Activity`). Mapping a block maps all its associated attributes.

- **§14.2.1 Process** (p.447) — a Process (via its defining **Collaboration**) maps to a
  `<process>` with `suppressJoinFailure="yes"`. `<partnerLinks>` derive from the Participants'
  interfaces (the Process's own Participant ⇒ `myRole`; each other Participant ⇒ `partnerRole`);
  `<variables>` from all `dataObjects` ∪ `properties` (incl. nested Sub-Processes);
  `<correlationSets>` from the `CorrelationKeys` of the Conversations.
- **§14.2.2 Activities** (pp.448–454) — **Table 14.1** maps the BPMN activity `name` to a
  WS-BPEL `name` (stripping non-NCName characters, `[name]`). *Task mappings*: **Service Task**
  ⇒ `<invoke>`, **Receive Task** ⇒ `<receive>` (`createInstance` from `instantiate`), **Send
  Task** ⇒ `<invoke>`, **Abstract Task** ⇒ `<empty>`. *Service package*: a **Message** ⇒
  `<wsdl:message>`; an **Interface**/**Operation** ⇒ `<wsdl:portType>`/`<operation>` (WSDL
  1.1). *Conversations & Correlation*: a key-based `CorrelationKey` ⇒ a BPEL property/
  property-alias + `<correlationSets>`; an activity's `<correlations>`/`<correlation
  initiate="…">` follow from whether its Message Flow initiates or joins a Conversation.
  *Sub-Process* (`Adhoc=False`) ⇒ `<scope>`. *Event Sub-Process mappings*: non-interrupting
  **Message** ⇒ `<eventHandlers>/<onEvent>`, **Timer** ⇒ `<onAlarm>`, **Error** ⇒
  `<faultHandlers>/<catch>`, **Compensation** ⇒ `<compensationHandler>`. *Activity loops*:
  standard *loops* ⇒ `<while>` (`testTime="Before"`) / `<repeatUntil>` (`testTime="After"`),
  with extra counter `<assign>`s when `LoopMaximum` is set; **Multi-Instance** ⇒ `<forEach>`
  (`parallel` from `isSequential`).
- **§14.2.3 Events** (pp.455–461) — *Start*: **Message Start** ⇒ `<receive createInstance="yes">`
  (Error/Compensation Start Events occur only in Event Sub-Processes). *Intermediate
  (non-boundary)*: **Message** ⇒ `<receive>`, **Timer** ⇒ `<wait for="…"/>` or
  `<wait until="…"/>` (from `TimeCycle`/`TimeDate`), **Compensation** ⇒ `<compensate/>` or
  `<compensateScope target="…"/>`. *End*: **None** ⇒ `<empty>`, **Message** ⇒ `<invoke>`,
  **Error** ⇒ `<throw faultName="…">`, **Compensation** ⇒ `<compensate/>`/`<compensateScope>`,
  **Terminate** ⇒ `<exit/>`. *Boundary*: **Message** boundary ⇒ `<scope>` + `<eventHandlers>/
  <onEvent>` (Timer ⇒ `<onAlarm>`); **Error** boundary ⇒ a `<flow>`/`<links>` + `<faultHandlers>`
  pattern (with the model-equivalence rewrite when the error path does not re-join);
  **Compensation** boundary ⇒ `<scope>` + `<compensationHandler>`. Multiple boundary Events
  super-impose on the single wrapping `<scope>`; a looped/MI Activity nests its loop inside that
  scope.
- **§14.2.4 Gateways and Sequence Flows** (pp.461–465) — block patterns: **Exclusive
  (data-based)** ⇒ `<if>/<elseif>/<else>`; **Event-Based** ⇒ `<pick>` (`<onMessage>`/`<onAlarm>`,
  `createInstance` from `instantiate`); **Inclusive** ⇒ `<flow>`/`<links>` with
  `<transitionCondition>` per link (link names canonicalised to NCNames, `[linkName]`);
  **Parallel** fork-join ⇒ `<flow>`; an unconditional **Sequence** of Activities ⇒ `<sequence>`;
  a structured **loop** ⇒ `<while>` / `<repeatUntil>`. *Handling Loops in Sequence Flows*
  (p.465): upstream-looping flow ⇒ `<while>` (while-loop) or `<repeatUntil>` (repeat-loop).
- **§14.2.5 Handling Data** (pp.465–468) — **Data Objects** ⇒ `<variable>`s (XSD type from the
  `itemDefinition`); **Properties** ⇒ scoped `<variable>`s (named `{container}.name`);
  **Input/Output Sets** ⇒ `<wsdl:message>`s; **Data Associations** ⇒ `<toParts>`/`<fromParts>`
  on `<invoke>`/`<receive>`; **Expressions** ⇒ BPEL XPath, per **Table 14.2** (`getDataobject`,
  `getProcessProperty`, `getActivityProperty`, `getEventProperty`); a Service Task with
  **Assignments** ⇒ `assign` + `invoke` + `assign`.

## §14.3 Extended BPMN-BPEL Mapping (pp.469–474)
A **semantic** mapping for sound Process models whose blocks are not covered by §14.2 (where
several BPEL patterns may be valid). It does not prescribe BPEL syntax — only that the target's
observable behaviour **MUST match** the BPMN operational semantics; the §14.2 mappings SHOULD be
used where applicable.

- **§14.3.1 End Events** (p.469) — End Events combine with other objects to merge/join the paths
  of a WS-BPEL structured element (distributed *token* recombination, Fig 14.2).
- **§14.3.2 Loop/Switch Combinations From a Gateway** (pp.469–470) — a Gateway with ≥3 outgoing
  flows where one loops *upstream* maps to a `<while>` **and** a `<switch>` in a `<sequence>`
  (Fig 14.3): the looping flow's condition ⇒ the `while` condition; the other flows ⇒ `switch`
  cases.
- **§14.3.3 Interleaved Loops** (pp.470–472) — non-nested overlapping *loops* cannot use a
  structured `<while>` (and a `<flow>` is acyclic). The looping section is separated into
  **derived processes** that spawn one another via one-way `<invoke>` + `<receive>`
  (`Spawn_[…]_Derived_Process` / `[…]_Derived_Process_Completed`), Figs 14.4–14.6.
- **§14.3.4 Infinite Loops** (p.473) — a Sequence Flow looping back with no intervening Gateway
  ⇒ a `<while>` whose condition never becomes true (e.g. `condition "1 = 0"`), Fig 14.7.
- **§14.3.5 BPMN Elements that Span Multiple WS-BPEL Sub-Elements** (pp.473–474) — when an
  Activity falls in two self-contained sub-elements (e.g. two `switch` cases), either
  **duplicate** the Activities into each, or factor them into a **derived process** invoked from
  each location (`[(target)object.Name]_Derived_Process`), Fig 14.8. (A `<flow>` avoids
  duplication but is not always available, e.g. when a `<pick>` is needed.)

The surrounding ecosystem (DMN, BPEL engines) is summarised in `REF-BPMN-001 §17`; the BPMN
behaviour this clause preserves is specified in `BPMN-NREF-EXEC-001`.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §14.     |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: added the §14.1 soundness/block-hierarchy requirements (Fig 14.1), the per-construct WS-BPEL mappings for §14.2 (Process → `<process>`, Tasks → invoke/receive/empty, Events → receive/invoke/throw/exit/wait/compensate, Gateways → if/pick/flow-links/sequence/while, data → variables/wsdl:message/toParts/fromParts incl. Tables 14.1–14.2), the §14.3 extended patterns (loop/switch, interleaved/derived processes, infinite loops, spanning), and page/table/figure citations. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/14-mapping-to-ws-bpel.md`; authoritative source is
the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §14 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §14 (pp.445–474), Tables 14.1–14.2, Figures 14.1–14.8; `REF-BPMN-001 §17`.
